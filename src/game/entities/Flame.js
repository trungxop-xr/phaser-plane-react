import Phaser from 'phaser';

export class Flame extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, rotation, speed, range, damage) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.setDepth(15);
        this.rotation = rotation;
        this.speed = speed;
        this.maxRange = range;
        this.damageAmount = damage;
        this.startX = x;
        this.startY = y;

        // Visual properties
        this.setScale(1);
        this.setAlpha(0.8);
        this.setTint(0xffffff);
        this.setBlendMode('ADD');

        // Particle trail
        this.particles = scene.add.particles(0, 0, 'flameParticleTexture' + scene.textureSuffix, {
            follow: this,
            scale: { start: 1, end: 3 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 400,
            frequency: 20,
            tint: [0xffff00, 0xffa500, 0xff0000], // Yellow -> Orange -> Red
            blendMode: 'ADD'
        }).setDepth(14);

        // Movement
        scene.physics.velocityFromRotation(rotation, speed, this.body.velocity);

        // Expansion over time
        scene.tweens.add({
            targets: this,
            scale: 3,
            duration: 500,
            ease: 'Sine.easeOut'
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        // Check range
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.startX, this.startY);
        if (dist >= this.maxRange) {
            this.destroy();
            return;
        }

        // Check terrain collision
        const terrainY = this.scene.getTerrainHeight ? this.scene.getTerrainHeight(this.x) : 2000;
        if (this.y >= terrainY - 5) {
            if (this.scene.createGroundFire) {
                this.scene.createGroundFire(this.x, terrainY);
            }
            this.destroy();
            return;
        }

        // Slight drift downwards (smoke/heat effect)
        this.body.velocity.y -= 2;

        // Fade out
        this.alpha = Phaser.Math.Clamp(1 - (dist / this.maxRange), 0, 0.8);
    }

    destroy(fromScene) {
        if (this.particles) {
            this.particles.stop();
            // Let existing particles die out if scene is still active
            if (this.scene && this.scene.time) {
                this.scene.time.delayedCall(400, () => {
                    if (this.particles) this.particles.destroy();
                });
            } else {
                this.particles.destroy();
            }
        }
        super.destroy(fromScene);
    }
}
