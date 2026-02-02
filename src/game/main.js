import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { UpgradeShop } from './scenes/UpgradeShop';
import { HistoryScene } from './scenes/HistoryScene';

export const startGame = (containerId) => {
    // Create reusable AudioContext to prevent errors on restart
    if (!window.gameAudioCtx) {
        window.gameAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const config = {
        type: Phaser.AUTO,
        parent: containerId,
        backgroundColor: '#2d2d2d',
        audio: {
            context: window.gameAudioCtx
        },
        scale: {
            mode: Phaser.Scale.FIT,
            width: 800,
            height: 600,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 300 },
                debug: false
            }
        },
        scene: [MainScene, UpgradeShop, HistoryScene]
    };

    return new Phaser.Game(config);
};
