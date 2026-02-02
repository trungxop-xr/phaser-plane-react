import Phaser from 'phaser';
import { EnemyConfig } from '../configs/enemy.config';

export class Missile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, speed, target) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Removed initial red tint to show texture colors
        // this.setTint(0xff0000); 
        this.body.allowGravity = false;
        this.setDepth(1);
        this.speed = speed;
        this.target = target;
        this.tracking = true;

        // Smoke trail
        this.particles = scene.add.particles(0, 0, 'particleTexture' + scene.textureSuffix, {
            follow: this,
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            frequency: 50,
            tint: 0xffffff // White smoke
        });

        // Forgive hitbox: Smaller than visual
        this.body.setSize(14, 8);
        this.body.setOffset(3, 2);

        // Flashing effect
        scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: -1
        });
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        if (this.tracking) {
            if (this.target.active) {
                const destAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
                const config = EnemyConfig.tower;
                // Tracking logic
                this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, destAngle, config.missileTurnRate);
                this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);

                // Dodge Logic: Close range + Sharp turn
                const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
                if (dist < config.missileDodgeDist && Math.abs(this.target.body.angularVelocity) > config.missileDodgeThreshold) {
                    this.tracking = false;
                    this.setTint(0x888888);
                }
            } else {
                // Target lost/dead, fly straight
                this.tracking = false;
                this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);
            }
        } else {
            // Keep flying straight if tracking lost
            this.scene.physics.velocityFromRotation(this.rotation, this.speed, this.body.velocity);
        }

        // Cleanup
        if (this.x < -100 || this.x > this.scene.worldWidth + 100 || this.y < -100 || this.y > this.scene.worldHeight + 100) {
            this.destroy();
        }
    }

    destroy(fromScene) {
        if (this.particles) this.particles.destroy();
        super.destroy(fromScene);
    }
}
