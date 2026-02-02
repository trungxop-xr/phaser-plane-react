import Phaser from 'phaser';

export class Tank extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hp, speed, terrainFn, configKey = 'tank', bodyTexture = 'tankBodyTexture', turretTexture = 'tankTurretTexture') {
        // Use custom bodyTexture for the base
        super(scene, x, y, bodyTexture + scene.textureSuffix);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.configKey = configKey;
        const config = scene.enemyStats[configKey];
        this.body.allowGravity = false;
        this.body.immovable = true;
        this.body.setSize(60, 30);
        this.setDepth(1);
        this.setScale(config.scale);
        this.hp = hp;
        this.maxHp = hp;
        this.terrainFn = terrainFn;
        this.firstDamageTime = null;

        this.body.setVelocityX(Phaser.Math.Between(-speed, speed));
        this.baseSpeed = speed;

        // Turret Sprite (Attached to Tank)
        this.turret = scene.add.sprite(x, y - 10, turretTexture + scene.textureSuffix);
        this.turret.setDepth(1.1); // Slightly above tank body
        this.turret.setScale(config.scale);
        this.turret.setOrigin(0.3, 0.5); // Pivot near the back of the turret

        // HUD Elements
        this.hpBar = scene.add.graphics();
        this.hpText = scene.add.text(x, y - 45, `${hp}/${hp}`, {
            fontSize: '10px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(2);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        // Follow terrain strictly
        const tx = this.x;
        const groundHeight = this.terrainFn(tx);
        this.y = groundHeight - 15; // Offset for tank height

        // Sync Physics
        this.body.velocity.y = 0;
        this.body.updateFromGameObject();

        // Calculate slope for rotation
        const sampleDist = 5;
        const h1 = this.terrainFn(tx - sampleDist);
        const h2 = this.terrainFn(tx + sampleDist);
        const angle = Math.atan2(h2 - h1, sampleDist * 2);
        this.rotation = angle;

        // Update Turret Position & Rotation
        // Turret sits on top of the tank, adjusted for slope
        const turretOffset = new Phaser.Math.Vector2(0, -10).rotate(angle);
        this.turret.setPosition(this.x + turretOffset.x, this.y + turretOffset.y);

        // Aim Turret at Player
        if (this.scene.player && this.scene.player.active) {
            const angleToPlayer = Phaser.Math.Angle.Between(this.turret.x, this.turret.y, this.scene.player.x, this.scene.player.y);
            // Smoothly rotate turret
            this.turret.rotation = Phaser.Math.Angle.RotateTo(this.turret.rotation, angleToPlayer, 0.1);

            // Limit turret to not point into the ground too much if needed, but 360 is fine for now
            // Flip turret if aiming left? (Optional, but rotation handles it)
        }

        this.updateHpBar();

        // Occasional movement
        if (Math.random() < 0.01) {
            this.body.setVelocityX(Phaser.Math.Between(-this.baseSpeed, this.baseSpeed));
        }

        // Boundary Check (X-axis)
        if (this.x < 50) {
            this.x = 50;
            this.body.setVelocityX(Math.abs(this.body.velocity.x)); // Move Right
        } else if (this.x > this.scene.worldWidth - 50) {
            this.x = this.scene.worldWidth - 50;
            this.body.setVelocityX(-Math.abs(this.body.velocity.x)); // Move Left
        }

        // Cleanup if OOB (Y-axis)
        if (this.y > this.scene.worldHeight + 100) {
            this.destroy();
        }
    }

    shoot(bulletSpeed) {
        if (!this.active || !this.turret.active) return;

        // Calculate muzzle position (tip of the barrel)
        const config = this.scene.enemyStats[this.configKey];
        const muzzleDist = config.muzzleDist;
        const muzzlePos = new Phaser.Math.Vector2(muzzleDist, 0).rotate(this.turret.rotation);
        const spawnX = this.turret.x + muzzlePos.x;
        const spawnY = this.turret.y + muzzlePos.y;

        // Spawn Bullet
        const bullet = this.scene.bullets.create(spawnX, spawnY, 'bulletTexture' + this.scene.textureSuffix);
        bullet.body.allowGravity = false;
        bullet.setScale(1.5); // Scale bullet too?
        this.scene.physics.velocityFromRotation(this.turret.rotation, bulletSpeed, bullet.body.velocity);
        bullet.rotation = this.turret.rotation;

        // Muzzle Flash
        const flash = this.scene.add.circle(spawnX, spawnY, config.flashRadius, 0xFFFF00);
        flash.setDepth(2);
        this.scene.tweens.add({
            targets: flash,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            duration: 100,
            onComplete: () => flash.destroy()
        });

        this.scene.playShootSound(); // Optional: Different sound for tank?
    }

    updateHpBar() {
        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(this.x - 30, this.y - 50, 60, 14);

        const healthPercent = Math.max(0, this.hp / this.maxHp);
        const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.2 ? 0xffff00 : 0xff0000);

        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(this.x - 30, this.y - 50, 60 * healthPercent, 14);

        this.hpText.setText(`${Math.ceil(this.hp)}/${this.maxHp}`);
        this.hpText.setPosition(this.x, this.y - 43);
    }

    damage(amount, time) {
        if (!this.firstDamageTime) this.firstDamageTime = time;
        this.hp -= amount;
        this.setTint(0xff0000); // Tint body
        this.turret.setTint(0xff0000); // Tint turret
        this.scene.time.delayedCall(200, () => {
            if (this.active) {
                this.clearTint();
                this.turret.clearTint();
            }
        });
        return this.hp <= 0;
    }

    destroy(fromScene) {
        if (this.hpBar) this.hpBar.destroy();
        if (this.hpText) this.hpText.destroy();
        if (this.turret) this.turret.destroy();
        super.destroy(fromScene);
    }
}
