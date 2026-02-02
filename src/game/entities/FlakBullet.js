import Phaser from 'phaser';

export class FlakBullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
    }

    fire(x, y, rotation, speed, damageConfig) {
        this.setPosition(x, y);
        this.setRotation(rotation);
        this.setScale(1); // Ensure it's not scaled by the enemy's scale
        this.setActive(true);
        this.setVisible(true);
        this.setDepth(10);

        if (!this.body) {
            this.scene.physics.add.existing(this);
        }
        this.body.enable = true;
        this.body.allowGravity = false;
        this.scene.physics.velocityFromRotation(rotation, speed, this.body.velocity);

        this.startX = x;
        this.startY = y;
        this.damageConfig = damageConfig;
        this.exploded = false;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active || this.exploded) return;

        // 1. Check Max Range
        const distTraveled = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);
        if (distTraveled >= this.damageConfig.maxRange) {
            this.explode(false);
            return;
        }

        // 2. Check Proximity Fuse
        const player = this.scene.player;
        if (player && player.active) {
            const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (distToPlayer <= this.damageConfig.proximityRadius) {
                this.explode(false);
                return;
            }
        }

        // Cleanup if out of world
        if (this.x < -100 || this.x > this.scene.worldWidth + 100 || this.y < -100 || this.y > this.scene.worldHeight + 100) {
            this.deactivate();
        }
    }

    explode(isDirectHit) {
        if (this.exploded) return;
        this.exploded = true;

        // Signal scene to handle visual and damage
        this.scene.explodeFlak(this.x, this.y, isDirectHit);
        this.deactivate();
    }

    deactivate() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) {
            this.body.enable = false;
            this.body.stop();
        }
    }
}
