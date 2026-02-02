import Phaser from 'phaser';

export class Sawblade extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, sourceId, terrainFn, radius, maxDistance) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = true;
        this.body.gravity.y = 200;
        this.state = 'FALLING';
        this.sourceId = sourceId;
        this.terrainFn = terrainFn;
        this.radius = radius;
        this.maxDistance = maxDistance || 1000;
        this.startX = x;
        this.setDepth(1);
        this.spinAngle = 0;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        const terrainY = this.terrainFn(this.x);
        const onGroundY = terrainY - this.radius;

        // Force minimum horizontal speed if moving (safeguard)
        const minRollSpeed = 150;
        if (Math.abs(this.body.velocity.x) < minRollSpeed && (this.state === 'BOUNCING' || this.state === 'ROLLING')) {
            const sign = this.body.velocity.x >= 0 ? 1 : -1;
            this.body.velocity.x = minRollSpeed * sign;
        }

        // 1. Calculate Spin (Visual only)
        // Spin depends on horizontal velocity or a base speed
        const spinSpeed = Math.abs(this.body.velocity.x) > 10 ? (this.body.velocity.x * delta / 1000) / this.radius : 0.2;
        this.spinAngle += spinSpeed;

        if (this.state === 'FALLING' || this.state === 'BOUNCING') {
            // Apply spin to rotation directly in air
            this.rotation = this.spinAngle;

            if (this.y >= onGroundY) {
                if (this.state === 'FALLING') {
                    this.state = 'BOUNCING';
                    this.y = onGroundY;
                    this.setVelocityY(-180); // Stronger bounce
                    this.emitSparks(12);
                } else {
                    this.state = 'ROLLING';
                    this.y = onGroundY;
                    this.setVelocityY(0);
                    this.body.allowGravity = false;
                    this.emitSparks(8);
                }
            }
        } else if (this.state === 'ROLLING') {
            // 1. Absolute Terrain Bonding
            this.y = onGroundY;
            this.body.y = this.y - this.body.halfHeight;
            this.body.velocity.y = 0;

            // 2. Terrain Slope Alignment
            const sampleDist = 10;
            const y1 = this.terrainFn(this.x - sampleDist);
            const y2 = this.terrainFn(this.x + sampleDist);
            const slopeAngle = Math.atan((y2 - y1) / (sampleDist * 2));

            // COMBINE: Slope Angle + Spin Angle
            this.rotation = slopeAngle + this.spinAngle;

            // 3. Fling Logic (Jump on steep dốc)
            const isMovingRight = this.body.velocity.x > 0;
            const slopeAhead = isMovingRight ? (this.terrainFn(this.x + 15) - terrainY) : (this.terrainFn(this.x - 15) - terrainY);

            if (slopeAhead < -8 && Math.abs(this.body.velocity.x) > 180) {
                this.state = 'FALLING';
                this.body.allowGravity = true;
                this.setVelocityY(slopeAhead * 12);
                this.emitSparks(5);
            }

            // 4. Friction Sparks
            if (Math.random() < 0.4) {
                const spark = this.scene.add.circle(this.x, this.y + this.radius, 2, 0xffff00);
                this.scene.tweens.add({
                    targets: spark,
                    x: this.x - (this.body.velocity.x * 0.1) + Phaser.Math.Between(-8, 8),
                    y: this.y + this.radius - Phaser.Math.Between(5, 10),
                    alpha: 0, scale: 0, duration: 300,
                    onComplete: () => spark.destroy()
                });
            }

            // 5. Max Distance Check
            if (this.startX !== undefined && Math.abs(this.x - this.startX) > this.maxDistance) {
                this.destroy();
                return;
            }

            // 6. World Bounds Bounce
            if ((this.x < 50 && this.body.velocity.x < 0) || (this.x > this.scene.worldWidth - 50 && this.body.velocity.x > 0)) {
                this.bounce();
            }
        }
    }

    bounce() {
        this.body.velocity.x *= -1;
        this.emitSparks(10);
        // Slightly bump up to prevent sticking if stuck in terrain
        this.y -= 2;
    }

    emitSparks(count) {
        const emitter = this.scene.add.particles(0, 0, 'particleTexture' + this.scene.textureSuffix, {
            x: this.x, y: this.y + 10,
            speed: { min: 50, max: 100 },
            scale: { start: 0.5, end: 0 },
            lifespan: 200,
            quantity: count,
            tint: 0xffff00
        });
        emitter.explode(count);
        this.scene.time.delayedCall(200, () => emitter.destroy());
    }
}
