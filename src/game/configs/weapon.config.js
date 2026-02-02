export const WeaponConfig = {
    bomb: {
        fireRate: 1000,
        speed: 0,
        damage: 40,
        secondaryDamage: 20,
        explosionRadius: 80,
        trigger: 'AUTO',
        ammo: -1, // Infinite
        dmgLevel: 0,
        cdLevel: 0,
        ammoLevel: 0,
        basePrice: 300,
        multiplier: 1.2
    },
    machineGun: {
        fireRate: 200,
        speed: 600,
        damage: 15,
        trigger: 'SPACE',
        ammo: -1, // Infinite
        dmgLevel: 0,
        cdLevel: 0,
        basePrice: 300,
        multiplier: 1.1
    },
    clusterMissile: {
        fireRate: 1000,
        speed: 400,
        damage: 100,
        secondaryDamage: 20,
        explosionRadius: 80,
        trigger: 'KEY_3',
        ammo: 10,
        dmgLevel: 0,
        cdLevel: 0,
        ammoLevel: 0,
        basePrice: 300,
        multiplier: 1.3
    },
    sawblade: {
        fireRate: 5000,
        speed: 0,
        damagePerSecond: 30,
        radius: 12,
        maxDistance: 1000,
        trigger: 'KEY_2',
        ammo: 3,
        dmgLevel: 0,
        cdLevel: 0,
        ammoLevel: 0,
        basePrice: 300,
        multiplier: 1.2
    },
    tankBullet: {
        fireRate: 2000,
        speed: 300,
        damage: 50,
        range: 600,
        trigger: 'AUTO'
    },
    t95Bullet: {
        fireRate: 1500,
        speed: 450,
        damage: 80,
        range: 800,
        trigger: 'AUTO'
    },
    homingMissile: {
        fireRate: 10000,
        speed: 0,
        speedMultiplier: 1.2,
        damage: 80,
        trigger: 'AUTO'
    },
    multiMissile: {
        cooldown: 1000,
        damage: 100,
        range: 200,
        speed: 400,
        trigger: 'KEY_4',
        ammo: 10,
        dmgLevel: 0,
        cdLevel: 0,
        ammoLevel: 0,
        basePrice: 300,
        multiplier: 1.4
    },
    flakCannon: {
        fireRate: 500,        // Time between shots in ms (2 per second)
        range: 600,           // Maximum detection and firing range in pixels
        angleMin: 40,         // Minimum firing angle in degrees (facing up)
        angleMax: 140,        // Maximum firing angle in degrees (facing up)
        bulletSpeed: 1000,    // Speed of the projectile in pixels per second
        proximityRadius: 10,  // Distance to player to trigger proximity fuse (px)
        maxRange: 650,        // Max travel distance before self-detonation (px)
        directDamage: 120,    // Damage dealt on direct impact
        splashDamage: 50,     // Damage dealt by the explosion cloud
        explosionRadius: 15   // Visual and damage radius of the explosion (px)
    },
    flamethrower: {
        range: 400,
        damagePerSecond: 20,
        fuelConsumption: 1, // 1 unit per second
        initialFuel: 100,
        burnDuration: 2000, // 2 seconds in ms
        groundFireDuration: 3000, // 3 seconds in ms
        trigger: 'KEY_5'
    }
};
