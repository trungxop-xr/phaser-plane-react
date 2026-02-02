import Phaser from 'phaser';
import { EnemyConfig } from '../configs/enemy.config';

export class Drone extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, player) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.setDepth(1);
        const config = scene.enemyStats.drone;
        this.body.setCircle(config.collisionRadius);

        this.player = player;
        this.hp = EnemyConfig.drone.hp;
        this.initialSpeed = EnemyConfig.drone.speed;
        this.speed = this.initialSpeed;

        // STATE MANAGEMENT
        this.state = 'APPROACH'; // APPROACH, SKIRMISH, KAMIKAZE
        this.ammo = EnemyConfig.drone.ammo;
        this.lastFired = 0;
        this.fireRate = EnemyConfig.drone.fireRate; // Should be around 200ms maybe?

        // MOVEMENT
        this.skirmishTimer = 0; // For sine wave motion

        // VISUALS
        this.smokeEmitter = null;

        // HUD Elements
        this.hpBar = scene.add.graphics();
        this.updateHpBar();
    }

    update(time, delta) {
        if (!this.active || !this.player.active) return;

        // Update HP Bar Position
        this.updateHpBar();

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);

        switch (this.state) {
            case 'APPROACH':
                this.handleApproach(dist, delta);
                break;
            case 'SKIRMISH':
                this.handleSkirmish(time, delta, dist);
                break;
            case 'KAMIKAZE':
                this.handleKamikaze(delta);
                break;
        }
    }

    // ... (rest of methods: handleApproach, handleSkirmish, fire, enterKamikaze, handleKamikaze) ...

    handleApproach(dist, delta) {
        const config = this.scene.enemyStats.drone;
        // Fly towards player until range
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle, 0.05 * (delta / 16));
        this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);

        if (dist <= config.approachRange) {
            this.state = 'SKIRMISH';
            this.body.velocity.scale(0.5); // Slow down a bit to start maneuvering
        }
    }

    handleSkirmish(time, delta, dist) {
        const config = this.scene.enemyStats.drone;
        // 1. Movement: Erratic/Weaving
        this.skirmishTimer += delta * 0.003;

        // Hover around, maintaining approx distance but moving side to side
        const idealDist = config.skirmishIdealDist;
        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);

        // Calculate a target drift position
        // Weave perpendicular to the player direction
        const weaveAngle = Math.sin(this.skirmishTimer) * 1.5; // Oscillate angle
        const targetRotation = angleToPlayer + weaveAngle;

        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.05 * (delta / 16));

        // Adjust speed to maintain distance
        let currentSpeed = this.speed * 0.8;
        if (dist < 150) currentSpeed = -100; // Back off
        else if (dist > 400) currentSpeed = this.speed * 1.2; // Catch up

        this.scene.physics.velocityFromRotation(this.rotation, currentSpeed, this.body.velocity);

        // 2. Shooting
        // Fire if roughly facing player
        if (Math.abs(Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(this.rotation), Phaser.Math.RadToDeg(angleToPlayer))) < 45) {
            if (time > this.lastFired) {
                this.fire(time);
            }
        }
    }

    fire(time) {
        if (this.ammo <= 0) return;

        this.lastFired = time + this.fireRate;
        this.ammo--;

        this.scene.spawnDroneBullet(this.x, this.y, this.rotation);

        // Recoil effect
        this.x -= Math.cos(this.rotation) * 2;
        this.y -= Math.sin(this.rotation) * 2;

        if (this.ammo <= 0) {
            this.enterKamikaze();
        }
    }

    enterKamikaze() {
        const config = this.scene.enemyStats.drone;
        this.state = 'KAMIKAZE';
        this.speed = this.initialSpeed * config.kamikazeSpeedMultiplier;
        this.setTint(0xff0000); // Red tint warning

        // Intense smoke trail
        if (!this.smokeEmitter) {
            this.smokeEmitter = this.scene.add.particles(0, 0, 'particleTexture' + this.scene.textureSuffix, {
                speed: 100,
                lifespan: 600,
                alpha: { start: 0.8, end: 0 },
                scale: { start: 0.5, end: 1.5 },
                quantity: 2,
                tint: 0x555555,
                blendMode: 'ADD'
            });
            this.smokeEmitter.startFollow(this);
        }
    }

    handleKamikaze(delta) {
        // Locked on target, high turn rate
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle, 0.1 * (delta / 16));
        this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);
    }

    updateHpBar() {
        if (!this.hpBar || !this.active) return;
        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(this.x - 15, this.y - 30, 30, 4); // Smaller bar for drone

        const healthPercent = Math.max(0, this.hp / (EnemyConfig.drone.hp || 50)); // Fallback maxHP if not stored
        const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.2 ? 0xffff00 : 0xff0000);

        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(this.x - 15, this.y - 30, 30 * healthPercent, 4);
        this.hpBar.setDepth(10); // Ensure on top
    }

    damage(amount, time) {
        // Standard damage logic
        this.hp -= amount;

        // Visual feedback
        this.setTint(0xffaaaa);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.state === 'KAMIKAZE' ? this.setTint(0xff0000) : this.clearTint();
        });

        this.updateHpBar();

        if (this.hp <= 0) {
            this.explode();
            return true;
        }
        return false;
    }

    explode() {
        if (this.smokeEmitter) {
            this.smokeEmitter.stop();
            this.scene.time.delayedCall(1000, () => this.smokeEmitter.destroy());
        }

        const emitter = this.scene.add.particles(0, 0, 'particleTexture' + this.scene.textureSuffix, {
            x: this.x, y: this.y, speed: 150, lifespan: 400, quantity: 15, scale: { start: 1, end: 0 }
        });
        emitter.explode(15);
        this.scene.playExplosionSound();
        this.scene.time.delayedCall(500, () => emitter.destroy());
        this.destroy();
    }

    destroy(fromScene) {
        if (this.hpBar) this.hpBar.destroy();
        super.destroy(fromScene);
    }
}
