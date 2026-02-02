import Phaser from 'phaser';
import { WeaponConfig } from '../configs/weapon.config';

export class UpgradeShop extends Phaser.Scene {
    constructor() {
        super('UpgradeShop');
        this.STATE = {
            EQUIPMENT: 'EQUIPMENT',
            SERVICE: 'SERVICE',
            CONFIRM: 'CONFIRM'
        };
    }

    init(data) {
        this.totalCoins = data.coins || 0;
        this.currentScore = data.score || 0;
        this.currentLevel = data.level || 1;
        this.initialCoins = data.initialCoins || 0;
        this.initialScore = data.initialScore || 0;
        this.currentState = this.STATE.EQUIPMENT;
        this.selectedWeaponKey = null;
        this.selectedService = null;

        this.weapons = [
            { key: 'machineGun', name: 'MACHINE GUN', keyLabel: 'SPACE', keyCode: Phaser.Input.Keyboard.KeyCodes.SPACE, texture: 'mgBulletTexture' },
            { key: 'bomb', name: 'BOMB', keyLabel: '1', keyCode: Phaser.Input.Keyboard.KeyCodes.ONE, texture: 'bombTexture' },
            { key: 'sawblade', name: 'SAWBLADE', keyLabel: '2', keyCode: Phaser.Input.Keyboard.KeyCodes.TWO, texture: 'sawbladeTexture' },
            { key: 'clusterMissile', name: 'CLUSTER BOMB', keyLabel: '3', keyCode: Phaser.Input.Keyboard.KeyCodes.THREE, texture: 'clusterMissileTexture' },
            { key: 'multiMissile', name: 'MISSILE', keyLabel: '4', keyCode: Phaser.Input.Keyboard.KeyCodes.FOUR, texture: 'multiMissileTexture' }
        ];

        this.keyMap = {};
        this.weapons.forEach(w => {
            this.keyMap[w.key] = this.input.keyboard.addKey(w.keyCode);
        });

        this.textureSuffix = (this.scale.width > 2000) ? '@2x' : '';
    }

    create() {
        const { width, height } = this.scale;

        // "Pixel Bright" Style Background - Updated to Green
        const bg = this.add.graphics();
        bg.fillStyle(0x004040, 0.4); // Darker Green/Cyan semi-transparent
        bg.fillRect(0, 0, width, height);
        bg.lineStyle(4, 0x00FF00, 1); // Bright Green border
        bg.strokeRect(10, 10, width - 20, height - 20);

        // UI Containers
        this.mainContainer = this.add.container(0, 0);
        this.serviceContainer = this.add.container(0, 0).setVisible(false);
        this.confirmContainer = this.add.container(0, 0).setVisible(false);

        this.createEquipmentMenu();
        this.createFooter();

        // Keyboard listeners
        this.input.keyboard.on('keydown', this.handleKeyDown, this);
    }

    createEquipmentMenu() {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, 80, 'UPGRADE SHOP', {
            fontSize: '48px', fill: '#00FF00', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.coinText = this.add.text(width / 2, 140, `COINS: ${this.totalCoins}`, {
            fontSize: '28px', fill: '#FFF44F', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        // Cards - Resized to fit screen with 20px+ margin and equal padding
        const cardW = 140;
        const cardH = 180;
        const spacing = 15;
        const N = this.weapons.length;
        // Perfect centering logic: startX is the center of the first card
        const startX = (width - ((N - 1) * (cardW + spacing))) / 2;
        const startY = height / 2;

        this.weaponCards = [];
        this.weapons.forEach((weapon, i) => {
            const x = startX + i * (cardW + spacing);
            const card = this.add.container(x, startY);

            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x000000, 0.6);
            cardBg.lineStyle(2, 0x00FF00, 0.8);
            cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
            cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);

            const icon = this.add.image(0, -30, weapon.texture + this.textureSuffix).setScale(1.5);
            const title = this.add.text(0, 20, weapon.name, { fontSize: '18px', fill: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
            const keyTag = this.add.text(0, 50, `[${weapon.keyLabel}]`, { fontSize: '22px', fill: '#FFF44F', fontStyle: 'bold' }).setOrigin(0.5);

            card.add([cardBg, icon, title, keyTag]);
            card.weaponKey = weapon.key;
            card.bgGraphics = cardBg;
            card.cardDims = { w: cardW, h: cardH }; // Store dimensions for highlight

            this.weaponCards.push(card);
            this.mainContainer.add(card);
        });
    }

    createFooter() {
        const { width, height } = this.scale;
        this.footerText = this.add.text(width / 2, height - 60, '[ENTER] NEXT LEVEL | [P] PLAY AGAIN | [BACKSPACE] BACK', {
            fontSize: '20px', fill: '#00FF00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
    }

    update() {
        // Highlight logic when holding keys
        if (this.currentState === this.STATE.EQUIPMENT) {
            this.weapons.forEach((w, i) => {
                const key = this.keyMap[w.key];
                const card = this.weaponCards[i];
                if (!card.cardDims) return;
                const { w: cardW, h: cardH } = card.cardDims;
                if (key.isDown) {
                    card.setScale(1.1);
                    card.bgGraphics.lineStyle(4, 0xFFF44F, 1);
                    card.bgGraphics.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
                } else {
                    card.setScale(1.0);
                    card.bgGraphics.lineStyle(2, 0x00FF00, 0.8);
                    card.bgGraphics.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
                }
            });
        }
    }

    handleKeyDown(event) {
        const key = event.keyCode;

        // Navigation
        if (key === Phaser.Input.Keyboard.KeyCodes.BACKSPACE) {
            this.playClickSound();
            this.goBack();
            return;
        }

        if (this.currentState === this.STATE.EQUIPMENT) {
            if (key === Phaser.Input.Keyboard.KeyCodes.ENTER) {
                this.scene.start('MainScene', {
                    level: this.currentLevel,
                    coins: this.totalCoins,
                    score: this.currentScore, // Pass the accumulated score to next level
                    isNextLevel: true
                });
                return;
            }

            const selected = this.weapons.find(w => w.keyCode === key);
            if (selected) {
                this.playClickSound();
                this.enterServiceMenu(selected.key);
            }

            if (key === Phaser.Input.Keyboard.KeyCodes.P) {
                this.playClickSound();
                // Replay the level we just finished with its original starting stats
                this.scene.start('MainScene', {
                    level: Math.max(1, this.currentLevel - 1),
                    coins: this.initialCoins,
                    score: this.initialScore,
                    isNextLevel: false
                });
            }
        } else if (this.currentState === this.STATE.SERVICE) {
            if (key === Phaser.Input.Keyboard.KeyCodes.A) this.selectService('dmg');
            else if (key === Phaser.Input.Keyboard.KeyCodes.B) this.selectService('cd');
            else if (key === Phaser.Input.Keyboard.KeyCodes.C) this.selectService('ammo');
            else if (key === Phaser.Input.Keyboard.KeyCodes.ESC) this.goBack();
        } else if (this.currentState === this.STATE.CONFIRM) {
            if (key === Phaser.Input.Keyboard.KeyCodes.ENTER) this.confirmPurchase();
            else if (key === Phaser.Input.Keyboard.KeyCodes.ESC) this.goBack();
        }
    }

    enterServiceMenu(weaponKey) {
        this.selectedWeaponKey = weaponKey;
        this.currentState = this.STATE.SERVICE;
        this.mainContainer.setVisible(false);
        this.serviceContainer.removeAll(true);
        this.serviceContainer.setVisible(true);

        const { width, height } = this.scale;
        const weapon = this.weapons.find(w => w.key === weaponKey);

        // Sub-title
        this.serviceContainer.add(this.add.text(width / 2, 180, `UPGRADE: ${weapon.name}`, {
            fontSize: '36px', fill: '#00FF00', fontStyle: 'bold'
        }).setOrigin(0.5));

        const services = [
            { key: 'A', type: 'dmg', name: 'Increase Damage', cost: 300, desc: '+20% Power' },
            { key: 'B', type: 'cd', name: 'Reduce Cooldown', cost: 300, desc: '-15% CD' },
            { key: 'C', type: 'ammo', name: 'Increase Ammo Capacity', cost: 500, desc: '+20% Ammo' }
        ];

        // Filter services for MG (no ammo)
        const activeServices = weaponKey === 'machineGun' ? services.slice(0, 2) : services;

        activeServices.forEach((s, i) => {
            const isAffordable = this.totalCoins >= s.cost;
            const color = isAffordable ? '#FFFFFF' : '#884444';
            const costColor = isAffordable ? '#00FF00' : '#FF4444';

            const txt = this.add.text(width / 2, 260 + i * 60, `[${s.key}] ${s.name} - ${s.desc}`, {
                fontSize: '24px', fill: color, fontStyle: 'bold'
            }).setOrigin(0.5);

            const costTxt = this.add.text(width / 2, 290 + i * 60, `Cost: ${s.cost}`, {
                fontSize: '18px', fill: costColor
            }).setOrigin(0.5);

            this.serviceContainer.add([txt, costTxt]);
        });

        this.footerText.setText('BACKSPACE: BACK | CHOOSE [A, B, C]');
    }

    selectService(type) {
        let cost = (type === 'ammo') ? 500 : 300;

        if (this.totalCoins < cost) {
            this.cameras.main.shake(100, 0.005);
            return;
        }

        this.selectedService = { type, cost };
        this.currentState = this.STATE.CONFIRM;
        this.serviceContainer.setVisible(false);
        this.confirmContainer.removeAll(true);
        this.confirmContainer.setVisible(true);

        const { width, height } = this.scale;
        const confirmBox = this.add.graphics();
        confirmBox.fillStyle(0x000000, 0.9);
        confirmBox.fillRoundedRect(width / 2 - 250, height / 2 - 100, 500, 200, 20);
        confirmBox.lineStyle(4, 0xFFFF00, 1);
        confirmBox.strokeRoundedRect(width / 2 - 250, height / 2 - 100, 500, 200, 20);

        const confirmTxt = this.add.text(width / 2, height / 2 - 40, 'CONFIRM UPGRADE?', {
            fontSize: '32px', fill: '#FFFF00', fontStyle: 'bold'
        }).setOrigin(0.5);

        const promptTxt = this.add.text(width / 2, height / 2 + 30, '[ENTER] OK  |  [ESC] CANCEL', {
            fontSize: '24px', fill: '#FFFFFF'
        }).setOrigin(0.5);

        this.confirmContainer.add([confirmBox, confirmTxt, promptTxt]);
        this.playClickSound();
    }

    confirmPurchase() {
        const cfg = WeaponConfig[this.selectedWeaponKey];
        const { type, cost } = this.selectedService;

        if (this.totalCoins >= cost) {
            this.totalCoins -= cost;
            this.coinText.setText(`COINS: ${this.totalCoins}`);

            // Apply Stats
            if (type === 'dmg') {
                if (cfg.damage) cfg.damage = Math.floor(cfg.damage * 1.2);
                if (cfg.damagePerSecond) cfg.damagePerSecond = Math.floor(cfg.damagePerSecond * 1.2);
                if (cfg.secondaryDamage) cfg.secondaryDamage = Math.floor(cfg.secondaryDamage * 1.2);
                cfg.dmgLevel = (cfg.dmgLevel || 0) + 1;
            } else if (type === 'cd') {
                const key = cfg.fireRate ? 'fireRate' : (cfg.cooldown ? 'cooldown' : null);
                if (key) cfg[key] = Math.max(50, Math.floor(cfg[key] * 0.85));
                cfg.cdLevel = (cfg.cdLevel || 0) + 1;
            } else if (type === 'ammo') {
                if (cfg.ammo !== -1) cfg.ammo = Math.floor(cfg.ammo * 1.2);
                cfg.ammoLevel = (cfg.ammoLevel || 0) + 1;
            }

            this.playSuccessSound();
            this.goBack(true); // Go back to equipment menu
        }
    }

    goBack(resetToMain = false) {
        if (this.currentState === this.STATE.CONFIRM) {
            this.currentState = this.STATE.SERVICE;
            this.confirmContainer.setVisible(false);
            this.serviceContainer.setVisible(true);
        } else if (this.currentState === this.STATE.SERVICE || resetToMain) {
            this.currentState = this.STATE.EQUIPMENT;
            this.serviceContainer.setVisible(false);
            this.mainContainer.setVisible(true);
            this.footerText.setText('PRESS [ENTER] TO START NEXT LEVEL | [BACKSPACE] BACK');
        }
    }

    playClickSound() {
        try {
            const ctx = window.gameAudioCtx;
            if (!ctx || ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    }

    playSuccessSound() {
        try {
            const ctx = window.gameAudioCtx;
            if (!ctx || ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        } catch (e) { }
    }
}
