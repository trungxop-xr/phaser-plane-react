import Phaser from 'phaser';
import { EnemyConfig } from '../configs/enemy.config';

export class DroneHangar extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.body.immovable = true;
        this.setDepth(1);

        this.hp = EnemyConfig.hangar.hp;
        this.maxHp = this.hp;
        this.spawnInterval = EnemyConfig.hangar.spawnInterval;

        // Timer for spawning drones
        this.spawnTimer = scene.time.addEvent({
            delay: this.spawnInterval,
            callback: this.spawnDrone,
            callbackScope: this,
            loop: true

        });
        this.firstDamageTime = null;

        // HUD Elements
        this.hpBar = scene.add.graphics();
        this.hpText = scene.add.text(x, y - 55, `${this.hp}/${this.maxHp}`, {
            fontSize: '10px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(2);

        this.updateHpBar();
    }

    updateHpBar() {
        if (!this.hpBar || !this.active) return;
        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(this.x - 30, this.y - 60, 60, 10);

        const healthPercent = Math.max(0, this.hp / this.maxHp);
        const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.2 ? 0xffff00 : 0xff0000);

        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(this.x - 30, this.y - 60, 60 * healthPercent, 10);

        if (this.hpText) {
            this.hpText.setText(`${Math.ceil(this.hp)}/${this.maxHp}`);
            this.hpText.setPosition(this.x, this.y - 55);
        }
    }

    damage(amount, time) {
        if (!this.firstDamageTime) this.firstDamageTime = time;
        this.hp -= amount;
        this.setTint(0xffaaaa);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });

        this.updateHpBar();

        if (this.hp <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }

    spawnDrone() {
        if (!this.active || this.scene.isGameOver || this.scene.isPaused) return;

        // Signal event to scene to spawn a drone at this position
        this.scene.spawnDroneFromHangar(this.x, this.y - EnemyConfig.hangar.droneSpawnYOffset);
    }

    destroy(fromScene) {
        if (this.spawnTimer) this.spawnTimer.remove();
        if (this.hpBar) this.hpBar.destroy();
        if (this.hpText) this.hpText.destroy();
        super.destroy(fromScene);
    }
}
