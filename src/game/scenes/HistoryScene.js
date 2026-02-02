
import Phaser from 'phaser';
import { progressService } from '../../services/ProgressService';

export class HistoryScene extends Phaser.Scene {
    constructor() {
        super('HistoryScene');
    }

    init(data) {
        this.userId = data.userId;
        this.returnScene = data.returnScene || 'MainScene';
        this.loadedHistory = [];
        this.isLoading = true;
    }

    create() {
        // Overlay background
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.85).setOrigin(0);

        // Header
        const header = this.add.text(this.scale.width / 2, 80, 'MISSION HISTORY', {
            fontSize: '48px',
            fill: '#00ff00',
            fontStyle: 'bold',
            stroke: '#004400',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Sub-header (Instructions)
        this.add.text(this.scale.width / 2, 130, 'PRESS [ESC] TO RETURN', {
            fontSize: '20px',
            fill: '#aaaaaa',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Loading Text
        this.loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'LOADING HISTORY...', {
            fontSize: '32px',
            fill: '#00ffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Fetch Data
        this.loadHistory();

        // Input
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.returnScene === 'MainScene') {
                this.scene.resume('MainScene');
                this.scene.stop();
            } else {
                this.scene.start('MainScene');
            }
        });
    }

    async loadHistory() {
        if (!this.userId) {
            this.showHistory([]);
            return;
        }

        const history = await progressService.fetchLevelHistory(this.userId);
        // Process history: Get max score per level
        const levelMap = {};
        history.forEach(entry => {
            if (!levelMap[entry.levelNumber] || entry.highScore > levelMap[entry.levelNumber].highScore) {
                levelMap[entry.levelNumber] = entry;
            }
        });

        this.showHistory(levelMap);
    }

    showHistory(levelMap) {
        if (this.loadingText) this.loadingText.destroy();
        this.isLoading = false;

        const startY = 200;
        const lineHeight = 50;
        const totalLevels = 10;
        let totalCoins = 0;

        for (let i = 1; i <= totalLevels; i++) {
            const levelData = levelMap[i];
            const score = levelData ? levelData.highScore : 0;
            const coins = levelData ? levelData.totalCoins : 0;
            if (levelData) totalCoins += coins;

            const y = startY + (i - 1) * lineHeight;

            // Row Container
            const rowBg = this.add.graphics();
            rowBg.fillStyle(i % 2 === 0 ? 0x111111 : 0x222222, 0.8);
            rowBg.fillRoundedRect(this.scale.width / 2 - 300, y - 20, 600, 40, 5);

            // Level Text
            this.add.text(this.scale.width / 2 - 280, y, `LEVEL ${i}`, {
                fontSize: '24px',
                fill: levelData ? '#ffffff' : '#666666',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            // Score Text
            this.add.text(this.scale.width / 2 + 280, y, `${score.toLocaleString()}`, {
                fontSize: '24px',
                fill: levelData ? '#ffd700' : '#666666',
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);

            // Dots
            const dots = '................................';
            this.add.text(this.scale.width / 2, y, dots, {
                fontSize: '24px',
                fill: '#333333'
            }).setOrigin(0.5);
        }

        // Footer Stats
        // this.add.text(this.scale.width / 2, this.scale.height - 100, `TOTAL COINS EARNED: ${totalCoins}`, {
        //     fontSize: '28px',
        //     fill: '#ffd700',
        //     stroke: '#000',
        //     strokeThickness: 4
        // }).setOrigin(0.5);
    }
}
