export const LevelConfig = {
    1: { targetT95: 0, targetTowers: 0, targetInfantry: 10, targetHangars: 0, targetFlaks: 0, enemySpeedMultiplier: 1.0, spawnIntervalMultiplier: 1.0, unlockedWeapons: ['machineGun', 'bomb'], newWeaponTutorial: { name: 'Súng tè le', instruction: 'Nhấn chuột trái để bắn' } },
    2: { targetTanks: 2, targetTowers: 0, targetInfantry: 20, targetHangars: 0, targetFlaks: 0, enemySpeedMultiplier: 1.1, spawnIntervalMultiplier: 0.9, unlockedWeapons: ['machineGun', 'bomb'], newWeaponTutorial: { name: 'Bomb ải chỉa', instruction: 'Nhấn phím 1 để liên tục thả bom' } },
    3: { targetTanks: 4, targetTowers: 2, targetInfantry: 30, targetHangars: 0, targetFlaks: 0, enemySpeedMultiplier: 1.2, spawnIntervalMultiplier: 0.8, unlockedWeapons: ['machineGun', 'bomb', 'sawblade'], newWeaponTutorial: { name: 'Cưa tất cả trừ em', instruction: 'nhấn phím 2 để thả một lưỡi cưa\n lưỡi cưa sẽ chạy dọc màn hình\n gây damage cho bất kì thứ gì chạm vào' } },
    4: { targetTanks: 7, targetTowers: 3, targetInfantry: 30, targetHangars: 0, targetFlaks: 1, targetDrones: 0, enemySpeedMultiplier: 1.3, spawnIntervalMultiplier: 0.8, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile'], newWeaponTutorial: { name: 'Ải chỉa cấp độ 2', instruction: 'Press [3] để thả một đống 3 quả bom càng gần mục tiêu càng khắm' } },
    5: { targetT95: 1, targetTanks: 12, targetTowers: 3, targetInfantry: 30, targetHangars: 1, targetFlaks: 2, targetDrones: 0, enemySpeedMultiplier: 1.4, spawnIntervalMultiplier: 0.7, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile'], newWeaponTutorial: { name: 'Theo đuổi em', instruction: 'Giữ 4 để khóa mục tiêu nhả 4 để thả 2 cục trắng vào mục tiêu' } },
    6: { targetT95: 2, targetTanks: 15, targetTowers: 4, targetInfantry: 35, targetHangars: 1, targetFlaks: 3, targetDrones: 0, enemySpeedMultiplier: 1.5, spawnIntervalMultiplier: 0.7, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'], newWeaponTutorial: { name: 'Sau khi ăn mì cấp độ 7', instruction: 'Giữ 5 để phóng uế vào kẻ thù kẻ thù dính gây damage liên tục' } },
    7: { targetT95: 3, targetTanks: 18, targetTowers: 4, targetInfantry: 40, targetHangars: 2, targetFlaks: 3, targetDrones: 0, enemySpeedMultiplier: 1.6, spawnIntervalMultiplier: 0.6, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    8: { targetT95: 5, targetTanks: 20, targetTowers: 5, targetInfantry: 50, targetHangars: 2, targetFlaks: 4, targetDrones: 0, enemySpeedMultiplier: 1.7, spawnIntervalMultiplier: 0.6, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    9: { targetT95: 7, targetTanks: 25, targetTowers: 5, targetInfantry: 60, targetHangars: 3, targetFlaks: 5, targetDrones: 0, enemySpeedMultiplier: 1.8, spawnIntervalMultiplier: 0.5, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    10: { targetT95: 10, targetTanks: 30, targetTowers: 6, targetInfantry: 80, targetHangars: 4, targetFlaks: 6, targetDrones: 0, enemySpeedMultiplier: 2.0, spawnIntervalMultiplier: 0.4, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    11: { targetT95: 12, targetTanks: 35, targetTowers: 6, targetInfantry: 90, targetHangars: 4, targetFlaks: 7, targetDrones: 0, enemySpeedMultiplier: 2.1, spawnIntervalMultiplier: 0.4, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    12: { targetT95: 14, targetTanks: 40, targetTowers: 7, targetInfantry: 100, targetHangars: 5, targetFlaks: 8, targetDrones: 0, enemySpeedMultiplier: 2.2, spawnIntervalMultiplier: 0.35, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    13: { targetT95: 16, targetTanks: 45, targetTowers: 7, targetInfantry: 110, targetHangars: 5, targetFlaks: 9, targetDrones: 0, enemySpeedMultiplier: 2.3, spawnIntervalMultiplier: 0.35, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    14: { targetT95: 18, targetTanks: 50, targetTowers: 8, targetInfantry: 120, targetHangars: 6, targetFlaks: 10, targetDrones: 0, enemySpeedMultiplier: 2.4, spawnIntervalMultiplier: 0.3, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    15: { targetT95: 20, targetTanks: 55, targetTowers: 8, targetInfantry: 130, targetHangars: 6, targetFlaks: 11, targetDrones: 0, enemySpeedMultiplier: 2.5, spawnIntervalMultiplier: 0.3, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    16: { targetT95: 22, targetTanks: 60, targetTowers: 9, targetInfantry: 140, targetHangars: 7, targetFlaks: 12, targetDrones: 0, enemySpeedMultiplier: 2.6, spawnIntervalMultiplier: 0.25, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    17: { targetT95: 24, targetTanks: 65, targetTowers: 9, targetInfantry: 150, targetHangars: 7, targetFlaks: 13, targetDrones: 0, enemySpeedMultiplier: 2.7, spawnIntervalMultiplier: 0.25, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    18: { targetT95: 26, targetTanks: 70, targetTowers: 10, targetInfantry: 160, targetHangars: 8, targetFlaks: 14, targetDrones: 0, enemySpeedMultiplier: 2.8, spawnIntervalMultiplier: 0.2, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    19: { targetT95: 28, targetTanks: 75, targetTowers: 10, targetInfantry: 180, targetHangars: 8, targetFlaks: 15, targetDrones: 0, enemySpeedMultiplier: 2.9, spawnIntervalMultiplier: 0.2, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] },
    20: { targetT95: 25, targetTanks: 80, targetTowers: 12, targetInfantry: 200, targetHangars: 10, targetFlaks: 16, targetDrones: 0, enemySpeedMultiplier: 3.0, spawnIntervalMultiplier: 0.15, unlockedWeapons: ['machineGun', 'bomb', 'sawblade', 'clusterMissile', 'multiMissile', 'flamethrower'] }
};

export const ScoreConfig = {
    base: {
        tank: 100,
        t95: 500,
        tower: 120
    },
    quickKill: {
        window: 10000,
        multiplier: 0.2
    },
    multiKill: {
        threshold: 3,
        multiplier: 0.5
    }
};
