export const LevelConfig = {
    1: { targetTanks: 1, targetTowers: 0, targetInfantry: 5, targetHangars: 0, targetFlaks: 0, enemySpeedMultiplier: 1.0, spawnIntervalMultiplier: 1.0 },
    2: { targetTanks: 5, targetTowers: 2, targetInfantry: 15, targetHangars: 0, targetFlaks: 0, enemySpeedMultiplier: 1.1, spawnIntervalMultiplier: 0.9 },
    3: { targetTanks: 7, targetTowers: 2, targetInfantry: 20, targetHangars: 0, targetFlaks: 1, enemySpeedMultiplier: 1.2, spawnIntervalMultiplier: 0.8 },
    4: { targetTanks: 9, targetTowers: 3, targetInfantry: 25, targetHangars: 0, targetFlaks: 2, targetDrones: 3, enemySpeedMultiplier: 1.3, spawnIntervalMultiplier: 0.8 },
    5: { targetTanks: 12, targetTowers: 3, targetInfantry: 30, targetHangars: 1, targetFlaks: 2, targetDrones: 5, enemySpeedMultiplier: 1.4, spawnIntervalMultiplier: 0.7 },
    6: { targetTanks: 15, targetTowers: 4, targetInfantry: 35, targetHangars: 1, targetFlaks: 3, targetDrones: 7, enemySpeedMultiplier: 1.5, spawnIntervalMultiplier: 0.7 },
    7: { targetTanks: 18, targetTowers: 4, targetInfantry: 40, targetHangars: 2, targetFlaks: 3, targetDrones: 9, enemySpeedMultiplier: 1.6, spawnIntervalMultiplier: 0.6 },
    8: { targetTanks: 20, targetTowers: 5, targetInfantry: 50, targetHangars: 2, targetFlaks: 4, targetDrones: 12, enemySpeedMultiplier: 1.7, spawnIntervalMultiplier: 0.6 },
    9: { targetTanks: 25, targetTowers: 5, targetInfantry: 60, targetHangars: 3, targetFlaks: 5, targetDrones: 15, enemySpeedMultiplier: 1.8, spawnIntervalMultiplier: 0.5 },
    10: { targetTanks: 30, targetTowers: 6, targetInfantry: 80, targetHangars: 4, targetFlaks: 6, targetDrones: 20, enemySpeedMultiplier: 2.0, spawnIntervalMultiplier: 0.4 },
    11: { targetTanks: 35, targetTowers: 6, targetInfantry: 90, targetHangars: 4, targetFlaks: 7, targetDrones: 25, enemySpeedMultiplier: 2.1, spawnIntervalMultiplier: 0.4 },
    12: { targetTanks: 40, targetTowers: 7, targetInfantry: 100, targetHangars: 5, targetFlaks: 8, targetDrones: 30, enemySpeedMultiplier: 2.2, spawnIntervalMultiplier: 0.35 },
    13: { targetTanks: 45, targetTowers: 7, targetInfantry: 110, targetHangars: 5, targetFlaks: 9, targetDrones: 35, enemySpeedMultiplier: 2.3, spawnIntervalMultiplier: 0.35 },
    14: { targetTanks: 50, targetTowers: 8, targetInfantry: 120, targetHangars: 6, targetFlaks: 10, targetDrones: 40, enemySpeedMultiplier: 2.4, spawnIntervalMultiplier: 0.3 },
    15: { targetTanks: 55, targetTowers: 8, targetInfantry: 130, targetHangars: 6, targetFlaks: 11, targetDrones: 45, enemySpeedMultiplier: 2.5, spawnIntervalMultiplier: 0.3 },
    16: { targetTanks: 60, targetTowers: 9, targetInfantry: 140, targetHangars: 7, targetFlaks: 12, targetDrones: 50, enemySpeedMultiplier: 2.6, spawnIntervalMultiplier: 0.25 },
    17: { targetTanks: 65, targetTowers: 9, targetInfantry: 150, targetHangars: 7, targetFlaks: 13, targetDrones: 60, enemySpeedMultiplier: 2.7, spawnIntervalMultiplier: 0.25 },
    18: { targetTanks: 70, targetTowers: 10, targetInfantry: 160, targetHangars: 8, targetFlaks: 14, targetDrones: 70, enemySpeedMultiplier: 2.8, spawnIntervalMultiplier: 0.2 },
    19: { targetTanks: 75, targetTowers: 10, targetInfantry: 180, targetHangars: 8, targetFlaks: 15, targetDrones: 80, enemySpeedMultiplier: 2.9, spawnIntervalMultiplier: 0.2 },
    20: { targetTanks: 80, targetTowers: 12, targetInfantry: 200, targetHangars: 10, targetFlaks: 16, targetDrones: 100, enemySpeedMultiplier: 3.0, spawnIntervalMultiplier: 0.15 }
};

export const ScoreConfig = {
    base: {
        tank: 100,
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
