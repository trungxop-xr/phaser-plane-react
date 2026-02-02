import Phaser from 'phaser';

export class MultiMissile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, speed, target, damage) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.body.setSize(20, 20);
        this.setDepth(1);
        this.speed = speed;
        this.target = target;
        this.damageAmount = damage;
        this.sourceId = 'multiMissile_' + scene.time.now + '_' + Math.floor(Math.random() * 1000);

        // White smoke trail
        this.particles = scene.add.particles(0, 0, 'particleTexture' + scene.textureSuffix, {
            follow: this,
            scale: { start: 0.4, end: 0 },
            lifespan: 600,
            frequency: 40,
            tint: 0xffffff,
            alpha: { start: 0.6, end: 0 }
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        if (this.target && this.target.active) {
            // Homing logic
            const destAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, destAngle, 0.1); // Slightly more aggressive homing
            this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);

        } else {
            // If target is destroyed or non-existent, fly straight
            this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);
        }

        // Cleanup
        if (this.x < -100 || this.x > this.scene.worldWidth + 100 ||
            this.y < -100 || this.y > this.scene.worldHeight + 100) {
            this.destroy();
        }
    }

    destroy(fromScene) {
        if (this.particles) this.particles.destroy();
        super.destroy(fromScene);
    }
}
