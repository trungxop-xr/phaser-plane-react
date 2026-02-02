import Phaser from 'phaser';
import { EnemyConfig } from '../configs/enemy.config';
import { WeaponConfig } from '../configs/weapon.config';

export class FlakCannon extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, hp) {
        // Main body is a rectangular base (Cool Grey)
        super(scene, x, y, 'flakBodyTexture' + scene.textureSuffix);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.allowGravity = false;
        this.body.immovable = true;
        this.body.moves = false;
        this.setDepth(1.1);

        const config = EnemyConfig.flakCannon;
        this.setScale(config.scale);
        this.hp = hp;
        this.maxHp = hp;
        this.nextShot = 0;
        this.barrelIndex = 0;

        // 1. Turret Base (Circular foundation - moved to TOP edge)
        this.turretBase = scene.add.sprite(x, y - 15 * config.scale, 'flakTurretTexture' + scene.textureSuffix);
        this.turretBase.setDepth(1.2);
        this.turretBase.setScale(config.scale);

        // 2. Parallel Barrels (Placed on the turretBase - higher DEPTH)
        this.barrels = [];
        for (let i = 0; i < 2; i++) {
            const barrel = scene.add.sprite(x, y - 15 * config.scale, 'flakBarrelsTexture' + scene.textureSuffix);
            barrel.setDepth(1.3); // ON TOP of turretBase
            barrel.setScale(config.scale);
            barrel.setOrigin(0.5, 1); // Pivot at the base
            this.barrels.push(barrel);
        }

        this.hpBar = scene.add.graphics();
        this.hpText = scene.add.text(x, y - 45, `${hp}/${hp}`, {
            fontSize: '10px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(2);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active) return;

        this.updateHpBar();

        const player = this.scene.player;
        if (player && player.active) {
            const weaponConfig = WeaponConfig.flakCannon;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

            // Aiming logic
            const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            const degToPlayer = Phaser.Math.RadToDeg(angleToPlayer);

            const canFire = dist <= weaponConfig.range && degToPlayer >= -140 && degToPlayer <= -40;

            // Rotate turret base to follow player
            this.turretBase.rotation = angleToPlayer + Math.PI / 2;

            this.barrels.forEach((barrel, index) => {
                // Point at player
                barrel.rotation = angleToPlayer + Math.PI / 2;

                // Position on outer edge of turret base (radius 12), side-by-side
                const sideOffset = (index === 0 ? -5 : 5) * this.scaleX;
                const forwardOffset = -12 * this.scaleY; // Move to edge

                // Rotate the relative offset vector by the barrel's rotation
                const relPos = new Phaser.Math.Vector2(sideOffset, forwardOffset).rotate(barrel.rotation);

                const turretCenterY = this.y - 15 * this.scaleY;
                barrel.setPosition(this.x + relPos.x, turretCenterY + relPos.y);
            });

            // 2. Fire Logic
            if (canFire && time > this.nextShot) {
                this.fire(time);
            }
        }
    }

    fire(time) {
        const weaponConfig = WeaponConfig.flakCannon;
        this.nextShot = time + weaponConfig.fireRate;

        // Perform recoil on active barrel
        const barrel = this.barrels[this.barrelIndex];

        // Recoil vector (push back along barrel's axis)
        const recoilVec = new Phaser.Math.Vector2(0, 10 * this.scaleY).rotate(barrel.rotation);

        this.scene.tweens.add({
            targets: barrel,
            x: barrel.x + recoilVec.x,
            y: barrel.y + recoilVec.y,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        // Calculate muzzle tip (barrel is 30px high, origin at base)
        const muzzleDist = 30 * this.scaleY;
        const muzzlePos = new Phaser.Math.Vector2(0, -muzzleDist).rotate(barrel.rotation);
        const spawnX = barrel.x + muzzlePos.x;
        const spawnY = barrel.y + muzzlePos.y;

        // Trigger shot from scene with muzzle position
        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
        this.scene.flakFire(this, angleToPlayer, spawnX, spawnY);

        this.barrelIndex = 1 - this.barrelIndex;
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
        this.hp -= amount;
        this.setTint(0xff0000);
        this.turretBase.setTint(0xff0000);
        this.barrels.forEach(b => b.setTint(0xff0000));
        this.scene.time.delayedCall(200, () => {
            if (this.active) {
                this.clearTint();
                this.turretBase.clearTint();
                this.barrels.forEach(b => b.clearTint());
            }
        });
        return this.hp <= 0;
    }

    destroy(fromScene) {
        if (this.hpBar) this.hpBar.destroy();
        if (this.hpText) this.hpText.destroy();
        if (this.turretBase) this.turretBase.destroy();
        if (this.barrels) this.barrels.forEach(b => b.destroy());
        super.destroy(fromScene);
    }
}
