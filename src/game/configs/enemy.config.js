export const EnemyConfig = {
    hangar: {
        hp: 200,
        spawnInterval: 12000,
        score: 200,
        coinPerKill: 200,
        groundOffset: 20,
        droneSpawnYOffset: 20
    },
    drone: {
        hp: 100,
        speed: 200, // Matches PlayerConfig.speed
        speedPercent: 1.0, // 100% of player speed
        bulletDamage: 10,
        fireRate: 250, // 4 bullets/sec
        detectionRange: 100,
        collisionDamage: 500,
        score: 100,
        coinPerKill: 100,
        bulletSpeed: 400,
        muzzleOffset: 17,
        flashRadius: 4,
        collisionRadius: 12.5,
        rotationSpeed: 0.1,
        // AI Behavior Params
        ammo: 30,
        approachRange: 300,
        skirmishIdealDist: 250,
        kamikazeSpeedMultiplier: 2.5,
        kamikazeDamage: 150
    },
    tank: {
        hp: 100,
        range: 300,
        speed: 150,
        scale: 1.5,
        groundOffset: 15,
        coinPerKill: 1000,
        muzzleDist: 45,
        flashRadius: 15
    },
    tower: {
        hp: 150,
        range: 300,
        scale: 1.5,
        coinPerKill: 120,
        groundOffset: 25,
        missileSpeed: 240,
        shotYOffset: 30,
        missileTurnRate: 0.025,
        missileDodgeDist: 60,
        missileDodgeThreshold: 100
    },
    infantry: {
        hp: 15,
        speed: 50,
        roamDuration: 2000,
        burstCount: 5,
        burstDelay: 200, // 0.2s between bullets in burst
        fireRate: 2000,  // 2s between bursts
        detectionRange: 200,
        bulletDamage: 5,
        score: 20,
        coinPerKill: 5,
        groundOffset: 15,
        muzzleXOffset: 15,
        muzzleYOffset: 4,
        flashRadius: 8,
        bulletSpeed: 800,
        bulletGravity: 400
    },
    flakCannon: {
        hp: 200,
        score: 150,
        coinPerKill: 150,
        groundOffset: 15,
        scale: 1.5
    }
};
