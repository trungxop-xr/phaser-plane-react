import Phaser from 'phaser';
import { EnemyConfig } from '../configs/enemy.config';

export class Tower extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hp) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const config = scene.enemyStats.tower;
        this.body.allowGravity = false;
        this.body.immovable = true;
        this.body.moves = false;
        this.body.setSize(30, 50);
        this.setDepth(1);
        this.setScale(config.scale);
        this.hp = hp;
        this.maxHp = hp;
        this.firstDamageTime = null;
        this.nextShot = 0;

        this.hpBar = scene.add.graphics();
        this.hpText = scene.add.text(x, y - 45, `${hp}/${hp}`, {
            fontSize: '10px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(2);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.updateHpBar();

        if (time > this.nextShot && this.scene.player && this.scene.player.active) {
            const config = this.scene.enemyStats.tower;
            const range = config.range;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);

            if (dist <= range) {
                this.scene.towerFire(this, time);
            }
        }
    }

    updateHpBar() {
        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(this.x - 20, this.y - 50, 40, 12);

        const healthPercent = Math.max(0, this.hp / this.maxHp);
        const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.2 ? 0xffff00 : 0xff0000);

        this.hpBar.fillStyle(color, 1);
        this.hpBar.fillRect(this.x - 20, this.y - 50, 40 * healthPercent, 12);

        this.hpText.setText(Math.ceil(this.hp) + '/' + this.maxHp);
        this.hpText.setPosition(this.x, this.y - 44);
    }

    damage(amount, time) {
        if (!this.firstDamageTime) this.firstDamageTime = time;
        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => {
            if (this.active) this.clearTint();
        });
        return this.hp <= 0;
    }

    destroy(fromScene) {
        if (this.hpBar) this.hpBar.destroy();
        if (this.hpText) this.hpText.destroy();
        super.destroy(fromScene);
    }
}
