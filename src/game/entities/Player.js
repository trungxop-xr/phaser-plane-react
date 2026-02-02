import Phaser from 'phaser';
import { PlayerConfig } from '../configs/player.config';
import { EventBus } from '../../EventBus';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.allowGravity = false;
        this.setDepth(1);
        this.setScale(2.0);

        this.hp = PlayerConfig.hp;
        this.currentSpeed = PlayerConfig.speed;

        // Notify initial HP
        this.emitHpUpdate();
    }

    update(cursors, delta) {
        if (!this.active) return;

        // Rotation
        if (cursors.left.isDown) {
            this.setAngularVelocity(-PlayerConfig.rotationSpeed);
        } else if (cursors.right.isDown) {
            this.setAngularVelocity(PlayerConfig.rotationSpeed);
        } else {
            this.setAngularVelocity(0);
        }

        // Speed Control
        if (cursors.up.isDown) {
            this.currentSpeed = Math.min(PlayerConfig.maxSpeed, this.currentSpeed + PlayerConfig.accelRate * delta);
        } else if (cursors.down.isDown) {
            this.currentSpeed = Math.max(PlayerConfig.minSpeed, this.currentSpeed - PlayerConfig.accelRate * delta);
        } else {
            // Gradually return to base speed
            if (this.currentSpeed > PlayerConfig.speed) {
                this.currentSpeed = Math.max(PlayerConfig.speed, this.currentSpeed - PlayerConfig.accelRate * delta);
            } else if (this.currentSpeed < PlayerConfig.speed) {
                this.currentSpeed = Math.min(PlayerConfig.speed, this.currentSpeed + PlayerConfig.accelRate * delta);
            }
        }

        this.scene.physics.velocityFromRotation(this.rotation, this.currentSpeed, this.body.velocity);
    }

    damage(amount) {
        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => {
            if (this.active) this.clearTint();
        });

        this.emitHpUpdate();

        if (this.hp <= 0) {
            this.emitHpUpdate(); // Final 0
            return true; // Is dead
        }
        return false;
    }

    heal() {
        this.hp = PlayerConfig.hp;
        this.emitHpUpdate();
    }

    emitHpUpdate() {
        EventBus.emit('update-hp', {
            hp: Math.max(0, this.hp),
            maxHp: PlayerConfig.hp
        });
    }
}
