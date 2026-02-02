import Phaser from 'phaser';

export class Infantry extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hp, speed, terrainFn) {
        // Use Torso as the main body
        super(scene, x, y, 'infantryTorso' + scene.textureSuffix);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.body.immovable = true;
        this.setDepth(2);
        this.hp = hp;
        this.maxHp = hp;
        this.terrainFn = terrainFn;
        this.baseSpeed = speed;

        // Visual Parts
        this.leftLeg = scene.add.image(x, y, 'infantryLeg' + scene.textureSuffix).setOrigin(0.5, 0).setDepth(1);
        this.rightLeg = scene.add.image(x, y, 'infantryLeg' + scene.textureSuffix).setOrigin(0.5, 0).setDepth(1);
        this.gun = scene.add.image(x, y, 'infantryGun' + scene.textureSuffix).setOrigin(0.1, 0.5).setDepth(3);

        // States
        this.state = 'IDLE';
        this.lastStateChange = 0;
        this.lastBurstTime = 0;
        this.burstLeft = 0;
        this.lastBurstTime = 0;
        this.burstLeft = 0;
        this.nextBurstBulletTime = 0;
        this.firstDamageTime = null;

        this.hpBar = scene.add.graphics();
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        // Follow terrain
        const tx = this.x;
        const config = this.scene.enemyStats.infantry;
        const groundHeight = this.terrainFn(tx);
        this.y = groundHeight - config.groundOffset; // Pivot point at center of torso

        // Animation Sync
        const isRunning = Math.abs(this.body.velocity.x) > 0;
        const faceDir = this.body.velocity.x >= 0 ? 1 : -1;

        // Sync Torso
        this.setFlipX(faceDir < 0);
        this.rotation = 0; // Torso doesn't rotate with terrain anymore

        // Sync Legs
        const legXOffset = 2 * faceDir;
        const legYOffset = 8;
        this.leftLeg.setPosition(this.x - legXOffset, this.y + legYOffset);
        this.rightLeg.setPosition(this.x + legXOffset, this.y + legYOffset);
        this.leftLeg.setFlipX(faceDir < 0);
        this.rightLeg.setFlipX(faceDir < 0);

        if (isRunning) {
            const legAnim = Math.sin(time * 0.015) * 30;
            this.leftLeg.setAngle(legAnim);
            this.rightLeg.setAngle(-legAnim);
        } else {
            this.leftLeg.setAngle(0);
            this.rightLeg.setAngle(0);
        }

        // Sync Gun & Aiming
        const player = this.scene.player;
        if (this.state === 'COMBAT' && player && player.active) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            this.gun.setRotation(angle);
            // Flip gun if pointing left
            const gunDeg = Phaser.Math.RadToDeg(angle);
            this.gun.setFlipY(Math.abs(gunDeg) > 90);
            // Move player to face target if not moving
            if (!isRunning) this.setFlipX(Math.abs(gunDeg) > 90);
        } else {
            this.gun.setRotation(faceDir > 0 ? 0 : Math.PI);
            this.gun.setFlipY(faceDir < 0);
        }
        this.gun.setPosition(this.x, this.y + 4);

        this.updateAI(time, delta);
        this.updateHpBar();

        // Sync Physics - matches Tank.js logic for ground units to avoid sinking/floating
        this.body.velocity.y = 0;
        this.body.updateFromGameObject();

        if (this.y > this.scene.worldHeight + 100) {
            this.destroy();
        }
    }

    updateAI(time, delta) {
        const player = this.scene.player;
        if (!player || !player.active) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const config = this.scene.enemyStats.infantry;

        if (this.state === 'IDLE') {
            this.body.setVelocityX(0);
            if (dist < config.detectionRange) {
                this.state = 'COMBAT';
                this.burstLeft = config.burstCount;
                this.lastBurstTime = time;
                this.nextBurstBulletTime = time;
            } else if (time > this.lastStateChange + 3000) {
                this.state = 'ROAM';
                this.lastStateChange = time;
                this.body.setVelocityX(Phaser.Math.Between(-1, 1) > 0 ? this.baseSpeed : -this.baseSpeed);
            }
        } else if (this.state === 'ROAM') {
            if (dist < config.detectionRange) {
                this.state = 'COMBAT';
                this.burstLeft = config.burstCount;
                this.lastBurstTime = time;
                this.nextBurstBulletTime = time;
            } else if (time > this.lastStateChange + config.roamDuration) {
                this.state = 'IDLE';
                this.lastStateChange = time;
            }
        } else if (this.state === 'COMBAT') {
            // Check if player too far
            if (dist > config.detectionRange * 1.5) {
                this.state = 'IDLE';
                this.lastStateChange = time;
                return;
            }

            // Handle Burst Fire Cycle
            if (this.burstLeft > 0) {
                this.body.setVelocityX(0); // Stop to aim and fire
                if (time > this.nextBurstBulletTime) {
                    this.fireBullet();
                    this.burstLeft--;
                    this.nextBurstBulletTime = time + config.burstDelay;

                    if (this.burstLeft === 0) {
                        this.lastBurstTime = time;
                        // Pick a random direction to move for 2s
                        const dir = Phaser.Math.Between(-1, 1) >= 0 ? 1 : -1;
                        this.body.setVelocityX(this.baseSpeed * dir);
                    }
                }
            } else {
                // Moving / Cooldown phase (2s based on config.fireRate)
                if (time > this.lastBurstTime + config.fireRate) {
                    this.burstLeft = config.burstCount;
                    this.nextBurstBulletTime = time;
                } else if (this.body.velocity.x === 0) {
                    // Ensure they keep moving during cooldown if they hit something or stopped
                    const dir = Phaser.Math.Between(-1, 1) >= 0 ? 1 : -1;
                    this.body.setVelocityX(this.baseSpeed * dir);
                }
            }
        }
    }

    fireBullet() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        // Fire from gun tip
        const config = this.scene.enemyStats.infantry;
        const muzzleX = this.x + Math.cos(this.gun.rotation) * config.muzzleXOffset;
        const muzzleY = this.y + config.muzzleYOffset + Math.sin(this.gun.rotation) * config.muzzleXOffset;

        const bullet = this.scene.infantryBullets.create(muzzleX, muzzleY, 'infantryBulletTexture' + this.scene.textureSuffix);
        bullet.setScale(1.0); // Kept this as it was not part of the instruction to change
        bullet.body.allowGravity = true;
        bullet.body.setGravityY(config.bulletGravity); // For parabolic trajectory
        this.scene.physics.velocityFromRotation(this.gun.rotation, config.bulletSpeed, bullet.body.velocity);
        bullet.damageValue = config.bulletDamage;

        // Muzzle Flash
        const flash = this.scene.add.circle(muzzleX, muzzleY, config.flashRadius, 0xFFFF00);
        flash.setDepth(4);
        this.scene.tweens.add({
            targets: flash,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            duration: 50,
            onComplete: () => flash.destroy()
        });
    }

    updateHpBar() {
        this.hpBar.clear();
        if (this.hp === this.maxHp) return; // Hide if full

        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(this.x - 15, this.y - 25, 30, 4);

        const healthPercent = Math.max(0, this.hp / this.maxHp);
        const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.2 ? 0xffff00 : 0xff0000);

        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(this.x - 15, this.y - 25, 30 * healthPercent, 4);
    }

    damage(amount, time) {
        if (!this.firstDamageTime) this.firstDamageTime = time;
        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });
        return this.hp <= 0;
    }

    destroy(fromScene) {
        if (this.hpBar) this.hpBar.destroy();
        if (this.leftLeg) this.leftLeg.destroy();
        if (this.rightLeg) this.rightLeg.destroy();
        if (this.gun) this.gun.destroy();
        super.destroy(fromScene);
    }
}
