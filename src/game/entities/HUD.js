import Phaser from 'phaser';

export class HUD extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.setScrollFactor(0);
        this.setDepth(100);

        this.setupBackgrounds();
        this.setupStats();
        this.setupObjectives();
        this.setupHPBar();
        this.setupWeaponSlots();

        this.weaponHUDReadyStates = {};

        // Register event listeners
        this.scene.events.on('update-hp', this.updateHP, this);
        this.scene.events.on('update-score', this.updateScore, this);
        this.scene.events.on('update-coins', this.updateCoins, this);
        this.scene.events.on('update-level-info', this.updateLevel, this);
        this.scene.events.on('update-objectives', this.updateObjectives, this);

        // Cleanup on destroy
        this.scene.events.once('shutdown', () => {
            if (this.scene) {
                this.scene.events.off('update-hp', this.updateHP, this);
                this.scene.events.off('update-score', this.updateScore, this);
                this.scene.events.off('update-coins', this.updateCoins, this);
                this.scene.events.off('update-level-info', this.updateLevel, this);
                this.scene.events.off('update-objectives', this.updateObjectives, this);
            }
        });
    }

    setupBackgrounds() {
        this.hudGraphics = this.scene.add.graphics();
        this.rightHudBg = this.scene.add.graphics();
        this.objectivesBg = this.scene.add.graphics();
        this.add([this.hudGraphics, this.rightHudBg, this.objectivesBg]);
    }

    setupStats() {
        const { width } = this.scene.scale;

        this.levelTextLabel = this.scene.add.text(width - 20, 15, 'LEVEL 1/10', {
            fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(1, 0);

        this.scoreTextLabel = this.scene.add.text(width - 20, 45, 'SCORE: 0', {
            fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(1, 0);

        this.coinTextLabel = this.scene.add.text(width - 20, 70, 'COINS: 0', {
            fontSize: '20px', fill: '#ffd700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(1, 0);

        this.add([this.levelTextLabel, this.scoreTextLabel, this.coinTextLabel]);
    }

    setupObjectives() {
        const { width } = this.scene.scale;
        this.objectiveLine1 = this.scene.add.text(width / 2, 15, ' ', {
            fontSize: '16px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 0);

        this.objectiveLine2 = this.scene.add.text(width / 2, 35, ' ', {
            fontSize: '16px', fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 0);

        this.add([this.objectiveLine1, this.objectiveLine2]);
    }

    setupHPBar() {
        this.hpTextUI = this.scene.add.text(115, 25, ' ', {
            fontSize: '12px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.add(this.hpTextUI);
    }

    setupWeaponSlots() {
        this.weaponSlotsUI = [];
        this.weaponHUDConfig = [
            { key: '1', type: 'bomb', name: 'BOMB', texture: 'bombTexture', label: '1', infinite: true, hasToggle: true, weaponKey: 'bomb' },
            { key: '2', type: 'sawblade', name: 'SAW', texture: 'sawbladeTexture', label: '2', cooldownVar: 'lastSawbladeFired', weaponKey: 'sawblade' },
            { key: '3', type: 'clusterMissile', name: 'CLUSTER', texture: 'clusterMissileTexture', label: '3', cooldownVar: 'lastClusterFired', weaponKey: 'clusterMissile' },
            { key: '4', type: 'multiMissile', name: 'MISSILE', texture: 'multiMissileTexture', label: '4', cooldownVar: 'lastMultiMissileFired', weaponKey: 'multiMissile' },
            { key: 'SPACE', type: 'machineGun', name: 'GUN', texture: 'mgBulletTexture', label: 'SPC', infinite: true, cooldownVar: 'lastFired', weaponKey: 'machineGun' }
        ];

        const startX = 15;
        const startY = 40;
        const slotW = 98;
        const slotH = 20;
        const hpBarWidth = 200;

        const textureSuffix = this.scene.textureSuffix || '';

        this.weaponHUDConfig.forEach((cfg, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + col * (hpBarWidth - slotW);
            const y = startY + row * (slotH + 4);

            const box = this.scene.add.graphics();
            box.lineStyle(1, 0x666666);
            box.strokeRect(x, y, slotW, slotH);
            box.fillStyle(0x000000, 0.6);
            box.fillRect(x, y, slotW, slotH);

            const icon = this.scene.add.sprite(x + 12, y + 10, cfg.texture + textureSuffix).setScale(0.8);
            if (cfg.type === 'machineGun') icon.setRotation(Math.PI / 2);

            const nameText = this.scene.add.text(x + 22, y + 4, cfg.name, { fontSize: '10px', fill: '#ffffff', fontStyle: 'bold' });
            this.scene.add.text(x + 2, y + 2, cfg.label, { fontSize: '8px', fill: '#ffff00', alpha: 0.7 });
            const ammoText = this.scene.add.text(x + slotW - 5, y + 5, ' ', { fontSize: '9px', fill: '#ffffff' }).setOrigin(1, 0);
            const overlay = this.scene.add.graphics();

            this.add([box, icon, nameText, ammoText, overlay]);
            this.weaponSlotsUI.push({ box, icon, nameText, ammoText, overlay, cfg, slotDim: { x, y, w: slotW, h: slotH } });
        });
    }

    updateHP(data) {
        const { hp, maxHp } = data;
        if (!this.hpTextUI || !this.hpTextUI.active) return;

        const hpX = 15;
        const hpY = 15;
        const maxBarWidth = 200;
        const hpHeight = 20;

        this.hudGraphics.clear();
        this.hudGraphics.fillStyle(0x333333, 1);
        this.hudGraphics.fillRect(hpX, hpY, maxBarWidth, hpHeight);
        this.hudGraphics.lineStyle(2, 0xffffff);
        this.hudGraphics.strokeRect(hpX, hpY, maxBarWidth, hpHeight);

        const hpPercent = Math.max(0, hp / maxHp);
        const color = hpPercent > 0.5 ? 0x00ff00 : (hpPercent > 0.2 ? 0xffff00 : 0xff0000);
        this.hudGraphics.fillStyle(color, 1);
        this.hudGraphics.fillRect(hpX, hpY, maxBarWidth * hpPercent, hpHeight);

        this.hpTextUI.setText(`${Math.ceil(hp)} / ${maxHp}`);
        this.hpTextUI.setPosition(hpX + maxBarWidth / 2, hpY + hpHeight / 2);
    }

    updateScore(score) {
        if (this.scoreTextLabel && this.scoreTextLabel.active) {
            this.scoreTextLabel.setText(`SCORE: ${score}`);
            this.refreshRightBg();
        }
    }

    updateCoins(coins) {
        if (this.coinTextLabel && this.coinTextLabel.active) {
            this.coinTextLabel.setText(`COIN: ${coins}`);
            this.refreshRightBg();
        }
    }

    updateLevel(level) {
        if (this.levelTextLabel && this.levelTextLabel.active) {
            this.levelTextLabel.setText(`LEVEL: ${level}/10`);
            this.refreshRightBg();
        }
    }

    refreshRightBg() {
        const mw = Math.max(this.levelTextLabel.width, this.scoreTextLabel.width, this.coinTextLabel.width) + 20;
        const mh = 90;
        this.rightHudBg.clear();
        this.rightHudBg.fillStyle(0x000000, 0.4);
        this.rightHudBg.fillRoundedRect(this.scene.scale.width - mw - 10, 10, mw, mh, 10);
    }

    updateObjectives(data) {
        const { line1, line2 } = data;
        if (this.objectiveLine1 && this.objectiveLine1.active) {
            this.objectiveLine1.setText(line1 || ' ');
        }
        if (this.objectiveLine2 && this.objectiveLine2.active) {
            this.objectiveLine2.setText(line2 || ' ');
        }

        if (this.objectivesBg && this.objectiveLine1 && this.objectiveLine1.active) {
            this.objectivesBg.clear();
            const maxW = Math.max(this.objectiveLine1.width, this.objectiveLine2.width) + 40;
            const objX = (this.scene.scale.width - maxW) / 2;

            this.objectivesBg.fillStyle(0x000000, 0.4);
            this.objectivesBg.fillRoundedRect(objX, 10, maxW, 50, 10);
        }
    }

    update(time, ammo, weaponConfig, isBombing) {
        this.weaponSlotsUI.forEach(slot => {
            const { icon, ammoText, overlay, cfg } = slot;
            const ammoCount = ammo[cfg.type];

            let displayAmmo = cfg.infinite ? (cfg.hasToggle ? (isBombing ? 'ON (∞)' : 'OFF (∞)') : '∞') : ammoCount;
            ammoText.setText(displayAmmo);

            overlay.clear();
            let isReady = true;
            const currentCooldownRate = cfg.weaponKey ? (weaponConfig[cfg.weaponKey].fireRate || weaponConfig[cfg.weaponKey].cooldown) : null;

            if (cfg.cooldownVar && currentCooldownRate) {
                const lastFire = this.scene[cfg.cooldownVar];
                const elapsed = time - lastFire;

                const shouldShowBar = (cfg.type !== 'machineGun' || currentCooldownRate > 150);

                if (shouldShowBar && elapsed < currentCooldownRate) {
                    isReady = false;
                    const progress = Phaser.Math.Clamp(elapsed / currentCooldownRate, 0, 1);
                    overlay.fillStyle(0x000000, 0.6);
                    const w = slot.slotDim.w * (1 - progress);
                    overlay.fillRect(slot.slotDim.x, slot.slotDim.y, w, slot.slotDim.h);
                } else if (elapsed < currentCooldownRate) {
                    isReady = false;
                }
            }

            if (ammoCount === 0 && !cfg.infinite) {
                icon.setTint(0x444444);
                ammoText.setFill('#ff0000');
                slot.nameText.setFill('#666666');
            } else if (!isReady) {
                icon.setTint(0x888888);
                ammoText.setFill('#aaaaaa');
                slot.nameText.setFill('#aaaaaa');
            } else {
                icon.clearTint();
                ammoText.setFill('#ffffff');
                slot.nameText.setFill('#ffffff');

                if (!this.weaponHUDReadyStates[cfg.type]) {
                    this.weaponHUDReadyStates[cfg.type] = true;
                    if (cfg.type !== 'machineGun' || currentCooldownRate > 150) {
                        this.scene.tweens.add({
                            targets: icon,
                            scale: 0.8 * 1.25,
                            duration: 100,
                            yoyo: true,
                            onComplete: () => { if (icon.active) icon.setScale(0.8); }
                        });
                    }
                }
            }
            if (!isReady) this.weaponHUDReadyStates[cfg.type] = false;
        });
    }
}
