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
                this.scene.events.off('update-level-info', this.updateLevel, this);
                this.scene.events.off('update-objectives', this.updateObjectives, this);
                this.scene.events.off('update-autopilot', this.updateAutopilot, this);
            }
        });

        this.scene.events.on('update-autopilot', this.updateAutopilot, this);
    }

    setupBackgrounds() {
        this.hudGraphics = this.scene.add.graphics();
        this.rightHudBg = this.scene.add.graphics();
        this.objectivesBg = this.scene.add.graphics();
        this.add([this.hudGraphics, this.rightHudBg, this.objectivesBg]);
    }

    setupStats() {
        const { width } = this.scene.scale;
        const margin = 20;
        const sideBoxWidth = 200;
        const statsX = width - margin; // Aligned right

        this.levelTextLabel = this.scene.add.text(statsX - 10, 20, 'LEVEL 1/10', {
            fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0);

        this.scoreTextLabel = this.scene.add.text(statsX - 10, 42, 'SCORE: 0', {
            fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0);

        this.coinTextLabel = this.scene.add.text(statsX - 10, 62, 'COINS: 0', {
            fontSize: '16px', fill: '#ffd700', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0);

        this.add([this.levelTextLabel, this.scoreTextLabel, this.coinTextLabel]);

        // Autopilot Countdown / Status Text
        this.autopilotTextLabel = this.scene.add.text(width / 2, this.scene.scale.height / 2 - 100, '', {
            fontSize: '32px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setVisible(false);
        this.add(this.autopilotTextLabel);
    }

    showAutopilotCountdown(remainingTime) {
        if (remainingTime <= 0) return;

        const seconds = (remainingTime / 1000).toFixed(1);
        this.autopilotTextLabel.setText(`AUTOPILOT ACTIVATE IN ${seconds}s...`)
            .setFill('#ffff00') // Yellow
            .setVisible(true);

        // Shake effect when close to activation (< 0.5s)
        if (remainingTime < 500) {
            const offsetX = Math.random() * 4 - 2;
            const offsetY = Math.random() * 4 - 2;
            this.autopilotTextLabel.setPosition(this.scene.scale.width / 2 + offsetX, this.scene.scale.height / 2 - 100 + offsetY);
        } else {
            this.autopilotTextLabel.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2 - 100);
        }
    }

    setAutopilotStatus(isOn) {
        const text = isOn ? 'AUTOPILOT: ON' : 'AUTOPILOT: OFF';
        const color = isOn ? '#00ff00' : '#ff0000'; // Neon Green or Red

        this.autopilotTextLabel.setText(text)
            .setFill(color)
            .setVisible(true)
            .setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2 - 100);

        // Flash effect
        this.scene.tweens.add({
            targets: this.autopilotTextLabel,
            alpha: { from: 0, to: 1 },
            duration: 100,
            yoyo: true,
            repeat: 2
        });

        // Auto-hide OFF message after 2s
        if (!isOn) {
            this.scene.time.delayedCall(2000, () => {
                if (this.autopilotTextLabel.text === 'AUTOPILOT: OFF') {
                    this.autopilotTextLabel.setVisible(false);
                }
            });
        }

        // Update Persistent Status Line
        if (this.autopilotStatusLine) {
            this.autopilotStatusLine.setText(isOn ? 'AUTOPILOT: ON (HOLD 0)' : 'AUTOPILOT: OFF (HOLD 0)');
            this.autopilotStatusLine.setFill(isOn ? '#00ff00' : '#888888');
        }
    }

    hideAutopilotText() {
        this.autopilotTextLabel.setVisible(false);
    }

    setupObjectives() {
        const { width } = this.scene.scale;

        // Dynamic objective lines container
        this.objectiveLines = [];

        this.autopilotStatusLine = this.scene.add.text(width / 2, 60, 'AUTOPILOT: OFF (HOLD 0)', {
            fontSize: '14px', fill: '#888888', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0);

        this.add(this.autopilotStatusLine);
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
            { key: '5', type: 'flamethrower', name: 'FLAME', texture: 'particleTexture', label: '5', weaponKey: 'flamethrower' },
            { key: 'SPACE', type: 'machineGun', name: 'GUN', texture: 'mgBulletTexture', label: 'SPC', infinite: true, cooldownVar: 'lastFired', weaponKey: 'machineGun' }
        ];

        const startX = 15;
        const startY = 45;
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
        if (!this.scene) return;
        const { hp, maxHp } = data;
        if (!this.hpTextUI || !this.hpTextUI.active) return;

        const margin = 15;
        const hpX = margin;
        const hpY = 15;
        const maxBarWidth = 200;
        const hpHeight = 25;

        this.hudGraphics.clear();
        this.hudGraphics.fillStyle(0x333333, 0.8);
        this.hudGraphics.fillRect(hpX, hpY, maxBarWidth, hpHeight);
        this.hudGraphics.lineStyle(2, 0xffffff, 0.5);
        this.hudGraphics.strokeRect(hpX, hpY, maxBarWidth, hpHeight);

        const hpPercent = Math.max(0, hp / maxHp);
        const color = hpPercent > 0.5 ? 0x00ff00 : (hpPercent > 0.2 ? 0xffff00 : 0xff0000);
        this.hudGraphics.fillStyle(color, 0.9);
        this.hudGraphics.fillRect(hpX + 2, hpY + 2, (maxBarWidth - 4) * hpPercent, hpHeight - 4);

        this.hpTextUI.setText(`${Math.ceil(hp)} / ${maxHp}`);
        this.hpTextUI.setPosition(hpX + maxBarWidth / 2, hpY + hpHeight / 2);
    }

    updateScore(score) {
        if (!this.scene) return;
        if (this.scoreTextLabel && this.scoreTextLabel.active) {
            this.scoreTextLabel.setText(`SCORE: ${score}`);
            this.refreshRightBg();
        }
    }

    updateCoins(coins) {
        if (!this.scene) return;
        if (this.coinTextLabel && this.coinTextLabel.active) {
            this.coinTextLabel.setText(`COINS: ${coins}`);
            this.refreshRightBg();
        }
    }

    updateLevel(level) {
        if (!this.scene) return;
        if (this.levelTextLabel && this.levelTextLabel.active) {
            this.levelTextLabel.setText(`LEVEL: ${level}/10`);
            this.refreshRightBg();
        }
    }

    refreshRightBg() {
        if (!this.scene) return;
        const { width } = this.scene.scale;
        const margin = 20;
        const sideBoxWidth = 200;
        const mh = 75;
        this.rightHudBg.clear();
        this.rightHudBg.fillStyle(0x000000, 0.4);
        this.rightHudBg.fillRoundedRect(width - sideBoxWidth - margin, 15, sideBoxWidth, mh, 8);
    }

    updateObjectives(objectives) {
        if (!this.scene || !Array.isArray(objectives)) return;

        const { width } = this.scene.scale;
        const boxWidth = 350;
        const boxHeight = 75;
        const topY = 15;
        const fontSize = 13;
        const lineSpacing = 18;

        // Group objectives into lines (max 3 items per line)
        const itemsPerLine = 3;
        const lines = [];
        for (let i = 0; i < objectives.length; i += itemsPerLine) {
            const chunk = objectives.slice(i, i + itemsPerLine);
            const lineText = chunk.map(obj => `${obj.label}:${obj.current}/${obj.target}`).join(' | ');
            lines.push(lineText);
        }

        // Update or create text objects
        lines.forEach((text, index) => {
            if (!this.objectiveLines[index]) {
                const textObj = this.scene.add.text(width / 2, topY + 10 + index * lineSpacing, '', {
                    fontSize: `${fontSize}px`, fill: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5, 0);
                this.add(textObj);
                this.objectiveLines[index] = textObj;
            }
            this.objectiveLines[index].setText(text).setVisible(true);
        });

        // Hide unused text objects
        for (let i = lines.length; i < this.objectiveLines.length; i++) {
            this.objectiveLines[i].setVisible(false);
        }

        // Update Background (Fixed size)
        if (this.objectivesBg) {
            this.objectivesBg.clear();
            const objX = (width - boxWidth) / 2;
            this.objectivesBg.fillStyle(0x000000, 0.4);
            this.objectivesBg.fillRoundedRect(objX, topY, boxWidth, boxHeight, 8);

            // Keep Autopilot status line below objectives
            if (this.autopilotStatusLine) {
                this.autopilotStatusLine.setY(topY + boxHeight + 5);
            }
        }
    }

    updateAutopilot(isAutopilot) {
        if (!this.scene) return;
        if (this.autopilotTextLabel) {
            this.autopilotTextLabel.setVisible(isAutopilot);
        }
    }

    update(time, ammo, weaponConfig, isBombing) {
        if (!this.scene) return;
        this.weaponSlotsUI.forEach(slot => {
            const { icon, ammoText, overlay, cfg } = slot;
            const ammoCount = ammo[cfg.type];

            const unlocked = this.scene.levelStats?.unlockedWeapons || [];
            const isUnlocked = unlocked.includes(cfg.weaponKey);

            let displayAmmo = '';
            if (!isUnlocked) {
                displayAmmo = 'LOCKED';
            } else if (cfg.infinite) {
                displayAmmo = cfg.hasToggle ? (isBombing ? 'ON (∞)' : 'OFF (∞)') : '∞';
            } else if (cfg.type === 'flamethrower') {
                // flamethrowerfuel is in percentage/units
                const fuel = this.scene.player ? this.scene.player.flamethrowerFuel : 0;
                displayAmmo = `${Math.ceil(fuel)}%`;
            } else {
                displayAmmo = ammoCount;
            }
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

            if (!isUnlocked) {
                icon.setTint(0x222222);
                ammoText.setFill('#ff0000');
                slot.nameText.setFill('#444444');
            } else if (ammoCount === 0 && !cfg.infinite) {
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
