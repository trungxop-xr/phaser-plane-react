import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Tank } from '../entities/Tank';
import { Tower } from '../entities/Tower';
import { Missile } from '../entities/Missile';
import { Sawblade } from '../entities/Sawblade';
import { Drone } from '../entities/Drone';
import { DroneHangar } from '../entities/DroneHangar';
import { PlayerConfig } from '../configs/player.config';
import { WeaponConfig } from '../configs/weapon.config';
import { LevelConfig, ScoreConfig } from '../configs/level.config';
import { EnemyConfig } from '../configs/enemy.config';
import { MultiMissile } from '../entities/MultiMissile';
import { Infantry } from '../entities/Infantry';
import { FlakCannon } from '../entities/FlakCannon';
import { FlakBullet } from '../entities/FlakBullet';
import { T95Tank } from '../entities/T95Tank';
import { Flame } from '../entities/Flame';
import { EventBus } from '../../EventBus';
import { leaderboardService } from '../../services/LeaderboardService';
import { progressService } from '../../services/ProgressService';
import { HUD } from '../entities/HUD';
import { EnemyIndicatorSystem } from '../systems/EnemyIndicatorSystem';

// Audio context managed globally

export class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.worldWidth = 3200; // x2 current width
        this.worldHeight = 1800; // x3 current height
        this.textureSuffix = '';
    }

    init(data) {
        this.currentLevel = data.level || 1;
        this.score = data.score || 0;
        this.totalCoins = data.coins || 0;

        // Player ID Management
        this.playerId = localStorage.getItem('playerId');
        if (!this.playerId) {
            this.playerId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            localStorage.setItem('playerId', this.playerId);
        }

        // Player Name Management
        this.playerName = localStorage.getItem('playerName') || 'Pilot ' + Math.floor(Math.random() * 1000);
        if (!localStorage.getItem('playerName')) {
            localStorage.setItem('playerName', this.playerName);
        }

        // Track stats at level start for 'Play Again'
        this.initialScore = this.score;
        this.initialCoins = this.totalCoins;
        this.isGameOver = false;
        this.isPaused = false;
        this.tanksDestroyed = 0;
        this.towersDestroyed = 0;
        this.hangarsDestroyed = 0;
        this.infantryDestroyed = 0;
        this.flaksDestroyed = 0;
        this.dronesDestroyed = 0;
        this.t95Destroyed = 0;
        this.comboTracker = {};
        this.isPoweredUp = false;
        this.lastFired = 0;
        this.lastClusterFired = 0;
        this.lastSawbladeFired = 0;
        this.lastMultiMissileFired = 0;

        // Bomb Control
        this.isBombing = false; // Toggled by '1'
        this.lastBombDropped = 0;

        // Ammo Management
        this.ammo = {
            bomb: WeaponConfig.bomb.ammo,
            machineGun: WeaponConfig.machineGun.ammo,
            sawblade: WeaponConfig.sawblade.ammo,
            clusterMissile: WeaponConfig.clusterMissile.ammo,
            multiMissile: WeaponConfig.multiMissile.ammo
        };
        this.weaponHUDReadyStates = {}; // For flash effect

        // Locking Mechanics
        this.isLocking = false;
        this.lockedTargets = [];
        this.lastLockBeep = 0;

        // Systems
        this.enemyIndicatorSystem = new EnemyIndicatorSystem(this);

        this.groundFires = null; // Initialized in create
        this.burnedEnemies = new Map(); // [enemy: {endTime, visualEffect}]
    }

    preload() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Player: Simplified Pixel Art Jet
        this.generateTexture(graphics, 'playerTexture', 0x000000, [], 40, 20, (g) => {
            const cBody = 0x607D8B; // Blue Grey
            const cDark = 0x455A64; // Darker Grey
            const cGlass = 0x81D4FA; // Light Blue

            // Fuselage (Main Body)
            g.fillStyle(cBody, 1);
            g.fillRect(4, 8, 28, 6); // Main tube
            g.fillRect(32, 10, 2, 2); // Nose tip

            // Tail
            g.fillStyle(cDark, 1);
            g.fillRect(2, 4, 6, 6); // Vertical stabilizer
            g.fillRect(0, 8, 4, 4); // Rear exhaust block

            // Cockpit
            g.fillStyle(cGlass, 1);
            g.fillRect(20, 6, 6, 2); // Glass canopy

            // Wings (Boxy)
            g.fillStyle(cDark, 1);
            g.fillRect(14, 10, 12, 2); // Wing root
            g.fillRect(16, 12, 8, 3); // Wing extended

            // Propeller (Simple Block)
            g.fillStyle(0xCFD8DC, 1);
            g.fillRect(34, 6, 2, 10); // Blade vertical
        });

        // Bomb: Red circle
        this.generateTexture(graphics, 'bombTexture', 0xff0000, [], 10, 10, (g) => {
            g.fillCircle(5, 5, 5);
        });

        // Tank Body
        this.generateTexture(graphics, 'tankBodyTexture', 0x000000, [], 60, 30, (g) => {
            const cDarkGreen = 0x2E7D32;
            const cLightGreen = 0x4CAF50;
            const cTreads = 0x424242;

            // Treads (Tracks)
            g.fillStyle(cTreads, 1);
            g.fillRect(2, 20, 56, 10); // Main track block
            g.fillStyle(0x757575, 1); // Wheels
            for (let i = 5; i < 55; i += 10) {
                g.fillCircle(i + 4, 25, 3);
            }

            // Hull (Main Body)
            g.fillStyle(cDarkGreen, 1);
            g.fillRect(5, 12, 50, 10); // Lower hull
            g.fillStyle(cLightGreen, 1);
            g.fillRect(5, 12, 50, 3); // Highlight top of hull
        });

        // Tank Turret
        this.generateTexture(graphics, 'tankTurretTexture', 0x000000, [], 44, 14, (g) => {
            const cDarkGreen = 0x2E7D32;
            const cLightGreen = 0x4CAF50;
            const cBlack = 0x000000;

            // Turret Box
            g.fillStyle(cDarkGreen, 1);
            g.fillRect(0, 2, 25, 10);
            g.fillStyle(cLightGreen, 1);
            g.fillRect(2, 4, 21, 6);

            // Gun Barrel
            g.fillStyle(0x1B5E20, 1);
            g.fillRect(25, 4, 16, 4); // Barrel
            g.fillStyle(cBlack, 1);
            g.fillRect(41, 4, 2, 4); // Muzzle tip
        });

        // T95 Tank Body (Red variant)
        this.generateTexture(graphics, 't95TankBodyTexture', 0x000000, [], 60, 30, (g) => {
            const cDarkRed = 0xB71C1C;
            const cLightRed = 0xF44336;
            const cTreads = 0x424242;

            // Treads
            g.fillStyle(cTreads, 1);
            g.fillRect(2, 20, 56, 10);
            g.fillStyle(0x757575, 1);
            for (let i = 5; i < 55; i += 10) {
                g.fillCircle(i + 4, 25, 3);
            }

            // Hull
            g.fillStyle(cDarkRed, 1);
            g.fillRect(5, 12, 50, 10);
            g.fillStyle(cLightRed, 1);
            g.fillRect(5, 12, 50, 3);
        });

        // T95 Tank Turret (Red variant)
        this.generateTexture(graphics, 't95TankTurretTexture', 0x000000, [], 44, 14, (g) => {
            const cDarkRed = 0xB71C1C;
            const cLightRed = 0xF44336;
            const cBlack = 0x000000;

            // Turret Box
            g.fillStyle(cDarkRed, 1);
            g.fillRect(0, 2, 25, 10);
            g.fillStyle(cLightRed, 1);
            g.fillRect(2, 4, 21, 6);

            // Gun Barrel
            g.fillStyle(0x8E0000, 1);
            g.fillRect(25, 4, 16, 4);
            g.fillStyle(cBlack, 1);
            g.fillRect(41, 4, 2, 4);
        });

        // Tower: Pixel Art (Concrete & Steel)
        this.generateTexture(graphics, 'towerTexture', 0x000000, [], 30, 50, (g) => {
            const cConcrete = 0x9E9E9E; // Light Grey
            const cDarkConcrete = 0x616161; // Dark Grey
            const cMetal = 0x455A64; // Blue Grey Metal
            const cRedLight = 0xF44336;

            // Base (Foundation)
            g.fillStyle(cDarkConcrete, 1);
            g.fillRect(0, 40, 30, 10);
            g.fillStyle(cConcrete, 1);
            g.fillRect(2, 42, 26, 6);

            // Main Shaft (Pylon)
            g.fillStyle(cConcrete, 1);
            g.fillRect(8, 15, 14, 25);
            g.fillStyle(cDarkConcrete, 1);
            g.fillRect(10, 15, 10, 25); // Texture stripe

            // Turret Head (Top)
            g.fillStyle(cMetal, 1);
            g.fillRect(2, 5, 26, 10); // Main head body
            g.fillStyle(cDarkConcrete, 1);
            g.fillRect(4, 7, 22, 6); // Window/Vision slit area

            // Warning Light (Red top)
            g.fillStyle(cRedLight, 1);
            g.fillRect(13, 0, 4, 5); // Antenna/Light base
            g.fillCircle(15, 0, 2); // Blinking light bulb

            // Gun Ports (Sides)
            g.fillStyle(0x000000, 1);
            g.fillRect(0, 8, 4, 4); // Left gun
            g.fillRect(26, 8, 4, 4); // Right gun
        });

        // Indicator Arrow
        this.generateTexture(graphics, 'arrowIndicatorTexture', 0xF44336, [], 30, 30, (g) => {
            g.fillStyle(0xF44336, 1);
            g.fillTriangle(0, 5, 30, 15, 0, 25);
            g.fillStyle(0xFFCDD2, 1);
            g.fillTriangle(4, 9, 20, 15, 4, 21);
        });

        // Bullet (Smaller)
        this.generateTexture(graphics, 'bulletTexture', 0x000000, [], 10, 6, (g) => {
            const cBrass = 0xD4AF37;
            const cDark = 0x212121;
            const cHighlight = 0xFFECB3;
            g.fillStyle(cBrass, 1);
            g.fillRect(1, 1.5, 5, 3);
            g.fillStyle(cHighlight, 1);
            g.fillRect(1, 2, 5, 1);
            g.fillStyle(cDark, 1);
            g.fillRect(6, 1.5, 2, 3);
            g.fillRect(8, 2, 1, 2);
            g.fillRect(9, 2.5, 1, 1);
            g.fillStyle(0xFF5722, 1);
            g.fillRect(0, 1.5, 1, 3);
        });

        // Missile
        this.generateTexture(graphics, 'missileTexture', 0x000000, [], 20, 12, (g) => {
            const cBody = 0xE0E0E0;
            const cFiins = 0x424242;
            const cWarhead = 0xF44336;
            g.fillStyle(cBody, 1);
            g.fillRect(4, 4, 11, 4);
            g.fillStyle(cWarhead, 1);
            g.fillRect(15, 4, 3, 4);
            g.fillRect(18, 5, 2, 2);
            g.fillStyle(cFiins, 1);
            g.fillRect(2, 2, 4, 2);
            g.fillRect(2, 8, 4, 2);
            g.fillRect(1, 4, 3, 4);
            g.fillStyle(0xFF9800, 1);
            g.fillRect(0, 5, 2, 2);
        });

        // MG Bullet
        this.generateTexture(graphics, 'mgBulletTexture', 0xffff00, [[0, 0], [4, 0], [4, 10], [0, 10]], 4, 10);

        // Particle
        this.generateTexture(graphics, 'particleTexture', 0xffa500, [], 4, 4, (g) => {
            g.fillCircle(2, 2, 2);
        });

        // Flame Particle: White circle for better tinting
        this.generateTexture(graphics, 'flameParticleTexture', 0xffffff, [], 8, 8, (g) => {
            g.fillStyle(0xffffff, 1);
            g.fillCircle(4, 4, 4);
        });

        // Flame Blob Texture: Base sprite for the Flame entity
        this.generateTexture(graphics, 'flameBlobTexture', 0xffffff, [], 10, 10, (g) => {
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
        });

        // Cluster Missile
        this.generateTexture(graphics, 'clusterMissileTexture', 0xffa500, [[0, 0], [15, 0], [15, 6], [0, 6]], 15, 6);

        // Powerup
        this.generateTexture(graphics, 'starTexture', 0x00ff00, [], 20, 20, (g) => {
            g.fillCircle(10, 10, 10);
        });

        // Sawblade
        this.generateTexture(graphics, 'sawbladeTexture', 0xcccccc, [], 24, 24, (g) => {
            g.lineStyle(2, 0x555555);
            g.fillCircle(12, 12, 12);
            g.strokeCircle(12, 12, 12);
            g.fillStyle(0x888888, 1);
            for (let i = 0; i < 8; i++) {
                const angle = Phaser.Math.DegToRad(i * 45);
                const x1 = 12 + Math.cos(angle) * 12;
                const y1 = 12 + Math.sin(angle) * 12;
                const x2 = 12 + Math.cos(angle + 0.3) * 16;
                const y2 = 12 + Math.sin(angle + 0.3) * 16;
                const x3 = 12 + Math.cos(angle - 0.3) * 16;
                const y3 = 12 + Math.sin(angle - 0.3) * 16;
                g.fillTriangle(x1, y1, x2, y2, x3, y3);
            }
        });

        // Drone
        this.generateTexture(graphics, 'droneTexture', 0xdddddd, [], 25, 25, (g) => {
            g.fillCircle(12.5, 12.5, 12.5);
            g.fillStyle(0xff0000, 1);
            g.fillCircle(20.5, 12.5, 3.5);
        });

        // Drone Hangar
        this.generateTexture(graphics, 'hangarTexture', 0x444444, [[0, 0], [50, 0], [50, 40], [0, 40]], 50, 40, (g) => {
            g.fillStyle(0x000000, 1);
            g.fillRect(15, 20, 20, 20);
            g.lineStyle(2, 0x999999);
            g.strokeRect(0, 0, 50, 40);
        });

        // Drone Bullet
        this.generateTexture(graphics, 'droneBulletTexture', 0xffffff, [[0, 0], [10, 0], [10, 3], [0, 3]], 10, 3);

        // Infantry Textures
        this.generateTexture(graphics, 'infantryTorso', 0x228B22, [], 12, 18, (g) => {
            g.fillCircle(6, 4, 4);
            g.fillRect(3, 8, 6, 10);
        });
        this.generateTexture(graphics, 'infantryLeg', 0x228B22, [], 4, 10, (g) => {
            g.fillRect(0, 0, 4, 10);
        });
        this.generateTexture(graphics, 'infantryGun', 0x333333, [], 16, 4, (g) => {
            g.fillRect(0, 0, 16, 3);
            g.fillRect(0, 2, 4, 2);
        });
        this.generateTexture(graphics, 'infantryBulletTexture', 0xffff00, [], 6, 6, (g) => {
            g.fillCircle(3, 3, 3);
        });

        // Score & Coin
        this.generateTexture(graphics, 'scoreTexture', 0xFFD700, [], 20, 20, (g) => {
            g.fillStyle(0xFFD700, 1);
            g.fillRect(5, 2, 10, 8);
            g.fillRect(4, 14, 12, 2);
            g.fillRect(7, 10, 6, 4);
            g.fillRect(2, 4, 3, 4);
            g.fillRect(15, 4, 3, 4);
        });
        this.generateTexture(graphics, 'coinTexture', 0xffd700, [], 16, 16, (g) => {
            g.fillCircle(8, 8, 8);
            g.lineStyle(2, 0xffa500);
            g.strokeCircle(8, 8, 7);
            g.fillStyle(0xffa500, 1);
            g.fillRect(7, 4, 2, 8);
        });

        // Multi-Missile
        this.generateTexture(graphics, 'multiMissileTexture', 0xffffff, [[0, 0], [15, 5], [0, 10]], 15, 10, (g) => {
            g.fillStyle(0x3498db, 1);
            g.fillRect(0, 3, 4, 4);
        });

        // Cloud
        this.generateTexture(graphics, 'cloudTexture', 0xFFFFFF, [], 64, 32, (g) => {
            g.fillStyle(0xFFFFFF, 1);
            g.fillCircle(16, 20, 12);
            g.fillCircle(32, 16, 16);
            g.fillCircle(48, 20, 12);
            g.fillRect(10, 20, 44, 12);
        });

        // Crosshair
        this.generateTexture(graphics, 'crosshairTexture', 0xFF0000, [], 24, 24, (g) => {
            g.lineStyle(2, 0xFF0000);
            g.strokeRect(0, 0, 24, 24);
            g.fillStyle(0xFFFF00, 1);
            g.fillRect(10, 10, 4, 4);
        });

        // Flak Cannon Base (Rectangular, Cool Grey - thicker than tank)
        this.generateTexture(graphics, 'flakBodyTexture', 0x607D8B, [], 60, 30, (g) => {
            const cDark = 0x455A64;
            g.fillStyle(0x607D8B, 1);
            g.fillRect(0, 0, 60, 30);
            g.lineStyle(2, cDark);
            g.strokeRect(0, 0, 60, 30);
        });

        // Flak Turret Base (Circular foundation - smaller)
        this.generateTexture(graphics, 'flakTurretTexture', 0x90A4AE, [], 24, 24, (g) => {
            g.fillCircle(12, 12, 12);
            g.lineStyle(2, 0x546E7A);
            g.strokeCircle(12, 12, 12);
        });

        // Flak Barrels (Black - Slimmer)
        this.generateTexture(graphics, 'flakBarrelsTexture', 0x212121, [], 6, 30, (g) => {
            g.fillRect(0, 0, 6, 30);
        });

        // Flak Bullet (Small black circle - 9px diameter, 1px smaller than bomb)
        this.generateTexture(graphics, 'flakBulletTexture', 0x000000, [], 10, 10, (g) => {
            g.fillStyle(0x000000, 1);
            g.fillCircle(5, 5, 4.5);
        });
    }

    generateTexture(graphics, key, color, points, width, height, customDraw) {
        graphics.clear();
        graphics.fillStyle(color, 1);
        if (points && points.length > 0) {
            graphics.fillPoints(points.map(p => new Phaser.Geom.Point(p[0], p[1])), true);
        }
        if (customDraw) {
            customDraw(graphics);
        }
        graphics.generateTexture(key + this.textureSuffix, width, height);
    }

    getTerrainHeight(x) {
        return (this.worldHeight - 160) + 40 * Math.sin(x / 150);
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.fadeIn(1000);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Sky Background
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x008080, 0x008080, 0xE0F2F1, 0xE0F2F1, 1);
        sky.fillRect(0, 0, this.worldWidth, this.worldHeight);
        sky.setDepth(-100);

        // Clouds
        this.clouds = this.physics.add.group();
        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(0, this.worldWidth);
            const y = Phaser.Math.Between(50, this.worldHeight / 2);
            const cloud = this.clouds.create(x, y, 'cloudTexture' + this.textureSuffix);
            cloud.setDepth(-50);
            cloud.setScrollFactor(0.6);
            cloud.setAlpha(0.9);
            const scale = Phaser.Math.FloatBetween(1.5, 3.0);
            cloud.setScale(scale);
            cloud.body.allowGravity = false;
            cloud.body.setVelocityX(Phaser.Math.Between(-30, -10));
        }

        // Terrain
        this.terrain = this.add.graphics();
        this.drawTerrain();

        // Groups
        this.tanks = this.physics.add.group();
        this.watchtowers = this.physics.add.group();
        this.bombs = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.mgBullets = this.physics.add.group();
        this.missiles = this.physics.add.group();
        this.clusterMissiles = this.physics.add.group();
        this.sawblades = this.physics.add.group();
        this.powerups = this.physics.add.group();
        this.hangars = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });
        this.drones = this.physics.add.group();
        this.droneBullets = this.physics.add.group();
        this.multiMissiles = this.physics.add.group({ classType: MultiMissile });
        this.infantry = this.physics.add.group({ classType: Infantry });
        this.t95Tanks = this.physics.add.group({ classType: T95Tank });
        this.infantryBullets = this.physics.add.group();
        this.flakCannons = this.physics.add.group({ classType: FlakCannon });
        this.flakBullets = this.physics.add.group({
            classType: FlakBullet,
            allowGravity: false
        });
        this.flames = this.physics.add.group({ classType: Flame });
        this.groundFires = this.physics.add.group({
            allowGravity: false,
            immovable: true
        });

        // Player
        this.player = new Player(this, this.scale.width / 2, this.worldHeight - 300, 'playerTexture' + this.textureSuffix);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // HUD Info
        const levelData = LevelConfig[this.currentLevel];
        this.enemyStats = EnemyConfig;
        this.levelStats = levelData;

        // Initialize HUD
        this.hud = new HUD(this);

        // Delay initial HUD updates to prevent "drawImage of null" crash on startup
        this.time.delayedCall(100, () => {
            if (this.hud && this.hud.active) {
                this.hud.updateLevel(this.currentLevel);
                this.hud.updateScore(this.score);
                this.hud.updateCoins(this.totalCoins);
                this.hud.updateHP({ hp: this.player.hp, maxHp: PlayerConfig.hp });
                this.broadcastObjectives();
            }
        });

        // Initialize Systems
        this.enemyIndicatorSystem.create();

        // Collisions
        this.setupCollisions();
        this.setupTimers();

        // Initial Spawning
        // Initial Spawning (Order: Static -> Mobile to ensure placement)
        if (levelData.targetHangars > 0) this.spawnInitialHangars(levelData.targetHangars + 1);
        if (levelData.targetFlaks > 0) this.spawnInitialFlaks(levelData.targetFlaks + 2);
        if (levelData.targetTowers > 0) this.spawnInitialTowers(levelData.targetTowers + 1);
        if (levelData.targetTanks > 0) this.spawnInitialTanks(levelData.targetTanks + 2);
        if (levelData.targetT95 > 0) this.spawnInitialT95Tanks(levelData.targetT95);
        if (levelData.targetInfantry > 0) this.spawnInitialInfantry(levelData.targetInfantry);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
        this.key4 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
        this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.key0 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO);
        this.key5 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);

        // Radar & Crosshairs
        this.radarGraphics = this.add.graphics().setDepth(100);
        this.crosshairGroup = [];
        for (let i = 0; i < 2; i++) {
            const ch = this.add.sprite(0, 0, 'crosshairTexture' + this.textureSuffix).setDepth(101).setVisible(false);
            this.crosshairGroup.push(ch);
        }
        this.input.keyboard.on('keydown-L', () => {
            if (this.isPaused && !this.isGameOver) {
                EventBus.emit('show-leaderboard', { score: this.score });
            }
        });

        // Trail Emitter
        // Trail Emitter (Normal - Blue)
        this.trailEmitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            lifespan: 400,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0x88ccff,
            blendMode: 'ADD',
            frequency: -1
        });

        // Trail Emitter (Autopilot - Neon Green)
        this.trailEmitterAutopilot = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            lifespan: 400,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: 0x39FF14,
            blendMode: 'ADD',
            frequency: -1
        });

        // Flame Emitter (Disabled in favor of Flame Projectile System)
        /*
        this.flameEmitter = this.add.particles(0, 0, 'flameParticleTexture' + this.textureSuffix, {
            ...
        }).setDepth(15);
        */

        // Start text
        this.isPaused = true;
        this.physics.pause();
        this.pauseText = this.add.text(width / 2, height / 2, 'READY?\n\n[ESC] START / RESUME\n[L] LEADERBOARD\n[H] HISTORY', {
            fontSize: '32px', fill: '#00FF00', backgroundColor: '#000000', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setPadding(20).setDepth(100).setScrollFactor(0);

        // Weapon Tutorial (if any)
        this.tutorialGroup = this.add.container(0, 0).setDepth(101).setScrollFactor(0);
        const tutorial = levelData.newWeaponTutorial;
        if (tutorial) {
            const title = this.add.text(width / 2, height / 2 + 150, `NEW WEAPON: ${tutorial.name}`, {
                fontSize: '24px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5);
            const desc = this.add.text(width / 2, height / 2 + 190, tutorial.instruction, {
                fontSize: '18px', fill: '#ffffff', align: 'center', backgroundColor: '#00000088'
            }).setOrigin(0.5).setPadding(10);
            this.tutorialGroup.add([title, desc]);
        }
        this.tutorialGroup.setVisible(this.isPaused);

        // Resume AudioContext
        this.input.on('pointerdown', () => {
            if (window.gameAudioCtx && window.gameAudioCtx.state === 'suspended') {
                window.gameAudioCtx.resume();
            }
        });

        // Toggle Pause
        this.input.keyboard.on('keydown-ESC', this.togglePause, this);

        // Restart Game (ENTER)
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.isGameOver) {
                this.restartGame();
            }
        });

        // History Menu
        this.input.keyboard.on('keydown-H', () => {
            if (this.isPaused && !this.isGameOver) {
                this.scene.pause(); // Pause MainScene systems
                this.scene.launch('HistoryScene', { userId: this.playerId, returnScene: 'MainScene' });
            }
        });

        this.victoryText = this.add.text(400, 250, '', {
            fontSize: '64px', fill: '#00ff00', stroke: '#fff', strokeThickness: 6
        }).setOrigin(0.5).setVisible(false).setDepth(10).setScrollFactor(0);

        this.restartText = this.add.text(400, 350, '', {
            fontSize: '32px', fill: '#fff', backgroundColor: '#000'
        }).setOrigin(0.5).setVisible(false).setDepth(10).setScrollFactor(0);

        // Autopilot Event Listeners (Updated for Dual Emitters)
        // No longer needed to listen for 'update-autopilot' to change tint,
        // because we handle it in update() loop.
    }




    drawTerrain() {
        this.terrain.clear();
        this.terrain.fillStyle(0x795548, 1);
        this.terrain.beginPath();
        this.terrain.moveTo(0, this.worldHeight);
        for (let i = 0; i <= this.worldWidth; i += 10) {
            this.terrain.lineTo(i, this.getTerrainHeight(i));
        }
        this.terrain.lineTo(this.worldWidth, this.worldHeight);
        this.terrain.closePath();
        this.terrain.fillPath();
        this.terrain.lineStyle(4, 0x8D6E63, 1);
        this.terrain.beginPath();
        this.terrain.moveTo(0, this.getTerrainHeight(0));
        for (let i = 0; i <= this.worldWidth; i += 10) {
            this.terrain.lineTo(i, this.getTerrainHeight(i));
        }
        this.terrain.strokePath();
    }

    getEnemiesForAutopilot() {
        const obstacles = [];
        const groups = [this.tanks, this.watchtowers, this.hangars, this.flakCannons];
        if (groups) {
            groups.forEach(group => {
                if (group) {
                    group.children.each(child => {
                        if (child.active) obstacles.push(child);
                    });
                }
            });
        }
        return obstacles;
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;

        // Pass key0 and key6 to player update
        const extendedCursors = { ...this.cursors, key0: this.key0, key5: this.key5 };
        this.player.update(extendedCursors, delta, this.getEnemiesForAutopilot());

        this.updateFlamethrower(time, delta);



        const terrainHeight = this.getTerrainHeight(this.player.x);
        if (this.player.y > terrainHeight - 15) {
            this.player.y = terrainHeight - 15;
            const damage = (PlayerConfig.hp * 0.2) * (delta / 1000);
            if (this.player.damage(damage)) this.doGameOver();
            this.events.emit('update-hp', { hp: this.player.hp, maxHp: PlayerConfig.hp });
        }

        this.hud.update(time, this.ammo, WeaponConfig, this.isBombing);
        this.enemyIndicatorSystem.update();

        this.drones.children.each(drone => { if (drone.active) drone.update(time, delta); });

        this.clouds.children.each(cloud => {
            if (cloud.x < -200) {
                cloud.x = this.worldWidth + 200;
                cloud.y = Phaser.Math.Between(50, this.worldHeight / 2);
            }
        });

        this.clusterMissiles.children.each(cm => {
            if (cm.active) {
                if (cm.body.velocity.length() > 10) cm.rotation = cm.body.velocity.angle();
                if (cm.y >= this.getTerrainHeight(cm.x)) this.explodeCluster(cm);
            }
        });

        const vec = new Phaser.Math.Vector2(-20, 0).rotate(this.player.rotation);
        const dischargeX = this.player.x + vec.x;
        const dischargeY = this.player.y + vec.y;
        if (this.player.currentSpeed > 10) {
            const count = Math.ceil(this.player.currentSpeed / 50);
            const activeEmitter = this.player.isAutopilot ? this.trailEmitterAutopilot : this.trailEmitter;
            if (activeEmitter) activeEmitter.emitParticleAt(dischargeX, dischargeY, count);

            if (this.player.currentSpeed > 350) {
                this.player.x += Phaser.Math.Between(-1, 1);
                this.player.y += Phaser.Math.Between(-1, 1);
            }
        }

        const unlocked = this.levelStats?.unlockedWeapons || [];

        if (this.cursors.space.isDown) {
            if (!unlocked.includes('machineGun')) {
                if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) this.showWeaponMessage('LOCKED');
            } else {
                if (time > this.lastFired + WeaponConfig.machineGun.fireRate) {
                    if (this.ammo.machineGun !== 0) {
                        this.fireMachineGun();
                        this.lastFired = time;
                        if (this.ammo.machineGun > 0) this.ammo.machineGun--;
                    }
                }
                if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && (this.ammo.machineGun === 0)) {
                    this.showWeaponMessage('OUT OF AMMO');
                }
            }
        }

        if (this.key2.isDown) {
            if (!unlocked.includes('sawblade')) {
                if (Phaser.Input.Keyboard.JustDown(this.key2)) this.showWeaponMessage('LOCKED');
            } else {
                if (time > this.lastSawbladeFired + WeaponConfig.sawblade.fireRate) {
                    if (this.ammo.sawblade !== 0) {
                        this.fireSawblade(time);
                        this.lastSawbladeFired = time;
                        if (this.ammo.sawblade > 0) this.ammo.sawblade--;
                    }
                }
                if (Phaser.Input.Keyboard.JustDown(this.key2)) {
                    if (this.ammo.sawblade === 0) this.showWeaponMessage('OUT OF AMMO');
                    else if (time < this.lastSawbladeFired + WeaponConfig.sawblade.fireRate) this.showWeaponMessage('RECHARGING');
                }
            }
        }

        if (this.key3.isDown) {
            if (!unlocked.includes('clusterMissile')) {
                if (Phaser.Input.Keyboard.JustDown(this.key3)) this.showWeaponMessage('LOCKED');
            } else {
                if (time > this.lastClusterFired + WeaponConfig.clusterMissile.fireRate) {
                    if (this.ammo.clusterMissile !== 0) {
                        this.fireClusterMissile(time);
                        this.lastClusterFired = time;
                        if (this.ammo.clusterMissile > 0) this.ammo.clusterMissile--;
                    }
                }
                if (Phaser.Input.Keyboard.JustDown(this.key3)) {
                    if (this.ammo.clusterMissile === 0) this.showWeaponMessage('OUT OF AMMO');
                    else if (time < this.lastClusterFired + WeaponConfig.clusterMissile.fireRate) this.showWeaponMessage('RECHARGING');
                }
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.key1)) {
            if (!unlocked.includes('bomb')) {
                this.showWeaponMessage('LOCKED');
            } else if (this.ammo.bomb !== 0) {
                this.isBombing = !this.isBombing;
                console.log('Bomb Bay:', this.isBombing ? 'ARMED' : 'SAFE');
            } else {
                this.showWeaponMessage('OUT OF AMMO');
            }
        }

        if (this.isBombing && time > this.lastBombDropped + WeaponConfig.bomb.fireRate) {
            if (this.ammo.bomb !== 0) {
                this.dropBomb();
                this.lastBombDropped = time;
                if (this.ammo.bomb > 0) this.ammo.bomb--;
                if (this.ammo.bomb === 0) this.isBombing = false;
            }
        }

        if (this.key4.isDown) {
            if (!unlocked.includes('multiMissile')) {
                if (Phaser.Input.Keyboard.JustDown(this.key4)) this.showWeaponMessage('LOCKED');
            } else {
                if (time > this.lastMultiMissileFired + WeaponConfig.multiMissile.cooldown) {
                    if (this.ammo.multiMissile !== 0) {
                        this.isLocking = true;
                    }
                }
                if (Phaser.Input.Keyboard.JustDown(this.key4)) {
                    if (this.ammo.multiMissile === 0) this.showWeaponMessage('OUT OF AMMO');
                    else if (time < this.lastMultiMissileFired + WeaponConfig.multiMissile.cooldown) this.showWeaponMessage('RECHARGING');
                }
            }

            if (this.isLocking) {
                this.radarGraphics.clear();
                this.radarGraphics.lineStyle(2, 0x00FF00, 0.5);
                this.radarGraphics.strokeCircle(this.player.x, this.player.y, 200);
                this.radarGraphics.fillStyle(0x00FF00, 0.1);
                this.radarGraphics.fillCircle(this.player.x, this.player.y, 200);

                const range = 200;
                const potentialTargets = [];
                const enemyGroups = [this.tanks, this.t95Tanks, this.watchtowers, this.drones, this.hangars];
                enemyGroups.forEach(group => {
                    group.children.each(e => {
                        if (e.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) <= range) {
                            potentialTargets.push(e);
                        }
                    });
                });

                potentialTargets.sort((a, b) => {
                    const dA = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y);
                    const dB = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
                    return dA - dB;
                });
                this.lockedTargets = potentialTargets.slice(0, 2);

                this.crosshairGroup.forEach((ch, index) => {
                    if (index < this.lockedTargets.length) {
                        const t = this.lockedTargets[index];
                        ch.setVisible(true);
                        ch.setPosition(t.x, t.y);
                        ch.rotation += 0.1;
                    } else {
                        ch.setVisible(false);
                    }
                });

                if (this.lockedTargets.length > 0 && time > this.lastLockBeep + 150) {
                    this.playBeepSound();
                    this.lastLockBeep = time;
                }
            }

        } else if (Phaser.Input.Keyboard.JustUp(this.key4)) {
            if (this.isLocking) {
                this.fireMultiMissile(time, this.lockedTargets);
                this.lastMultiMissileFired = time;
                if (this.ammo.multiMissile > 0) this.ammo.multiMissile--;
                this.isLocking = false;
                this.radarGraphics.clear();
                this.crosshairGroup.forEach(ch => ch.setVisible(false));
                this.lockedTargets = [];
            }
        } else if (!this.isLocking) {
            this.radarGraphics.clear();
            this.crosshairGroup.forEach(ch => ch.setVisible(false));
        }

        this.bullets.children.each(b => {
            if (b.y > this.worldHeight + 100 || b.y < -100) b.destroy();
            else if (b.y >= this.getTerrainHeight(b.x)) {
                this.explodeTankBullet(b.x, b.y);
                b.destroy();
            }
        });
        this.mgBullets.children.each(b => { if (b.x > this.worldWidth + 100 || b.x < -100 || b.y > this.worldHeight + 100 || b.y < -100) b.destroy(); });
        this.droneBullets.children.each(b => { if (b.x > this.worldWidth + 100 || b.x < -100 || b.y < -100 || b.y > this.worldHeight + 100) b.destroy(); });
        this.bombs.children.each(b => { if (b.y >= this.getTerrainHeight(b.x)) this.explodeBomb(b); });
        this.multiMissiles.children.each(m => {
            if (m.y >= this.getTerrainHeight(m.x)) {
                this.createBigExplosion(m.x, m.y, 60);
                this.playExplosionSound();
                m.destroy();
            }
        });
        this.missiles.children.each(m => {
            if (m.y >= this.getTerrainHeight(m.x)) {
                this.explodeMissile(m.x, m.y);
                m.destroy();
            }
        });
        this.infantryBullets.children.each(b => {
            if (b.x > this.worldWidth + 100 || b.x < -100 || b.y > this.worldHeight + 100 || b.y < -100 || b.y >= this.getTerrainHeight(b.x)) {
                b.destroy();
            }
        });
    }

    handleDamage(target, damage, sourceId, damageType) {
        if (!target.active) return;

        // Apply damage
        const killed = target.damage(damage, this.time.now);

        // Visual effect (Flash)
        if (target.setTint) {
            target.setTint(0xff0000);
            this.time.delayedCall(50, () => {
                if (target.active) target.clearTint();
            });
        }

        // Update HUD if player
        if (target === this.player) {
            this.events.emit('update-hp', { hp: target.hp, maxHp: PlayerConfig.hp });
            if (killed) this.doGameOver();
        } else if (killed) {
            this.handleDestruction(target, sourceId, damageType);
        }
    }

    handleDestruction(entity, sourceId, damageType) {
        const type = this.getEntityType(entity);
        let scoreBase = 0;
        let coinBase = 0;

        // Determine score/coin base
        if (type === 'tank') { scoreBase = ScoreConfig.base.tank; coinBase = EnemyConfig.tank.coinPerKill; }
        else if (type === 'tower') { scoreBase = ScoreConfig.base.tower; coinBase = EnemyConfig.tower.coinPerKill; }
        else if (type === 'hangar') { scoreBase = EnemyConfig.hangar.score; coinBase = EnemyConfig.hangar.coinPerKill; }
        else if (type === 'drone') { scoreBase = EnemyConfig.drone.score; coinBase = EnemyConfig.drone.coinPerKill; }
        else if (type === 'infantry') { scoreBase = this.enemyStats.infantry.score; coinBase = this.enemyStats.infantry.coinPerKill; }
        else if (type === 'flak') { scoreBase = this.enemyStats.flakCannon.score; coinBase = this.enemyStats.flakCannon.coinPerKill; }
        else if (type === 't95') { scoreBase = ScoreConfig.base.t95; coinBase = EnemyConfig.t95.coinPerKill; }

        let earned = scoreBase;
        if (entity.firstDamageTime && (this.time.now - entity.firstDamageTime) <= ScoreConfig.quickKill.window) {
            const bonus = scoreBase * ScoreConfig.quickKill.multiplier;
            earned += bonus;
            this.showFloatingText(entity.x, entity.y - 50, '+' + Math.floor(bonus) + ' QUICK KILL!', '#ffff00');
        }

        this.registerKill(sourceId, earned, coinBase, entity.x, entity.y);

        // Explosion effect
        const explosionScale = type === 'infantry' ? 0.6 : 1;
        const emitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            x: entity.x, y: entity.y, speed: 100, lifespan: 500, quantity: type === 'infantry' ? 10 : 20, scale: { start: explosionScale, end: 0 }
        });
        emitter.explode(type === 'infantry' ? 10 : 20);
        this.playExplosionSound();
        this.time.delayedCall(1000, () => emitter.destroy());

        // Special destruction logic
        if (type === 'drone' && damageType === 'KAMIKAZE') {
            this.createBigExplosion(entity.x, entity.y, 40);
        }

        entity.destroy();

        // Update Level Stats
        if (type === 'tank') this.tanksDestroyed++;
        else if (type === 'tower') this.towersDestroyed++;
        else if (type === 'hangar') this.hangarsDestroyed++;
        else if (type === 'infantry') this.infantryDestroyed++;
        else if (type === 'flak') {
            if (!this.flaksDestroyed) this.flaksDestroyed = 0;
            this.flaksDestroyed++;
        }
        else if (type === 'drone') {
            if (!this.dronesDestroyed) this.dronesDestroyed = 0;
            this.dronesDestroyed++;
        }
        else if (type === 't95') this.t95Destroyed++;

        this.broadcastObjectives();
        this.checkLevelWin();
    }

    setupCollisions() {
        // Player collisions
        this.physics.add.overlap(this.player, this.bullets, (player, bullet) => {
            const damage = bullet.speed ? WeaponConfig.homingMissile.damage : WeaponConfig.tankBullet.damage;
            this.handleDamage(player, damage, null, 'ENEMY_BULLET');
            this.explodeTankBullet(bullet.x, bullet.y); // Visual explosion on impact
            if (bullet.particles) bullet.particles.destroy();
            bullet.destroy();
        }, null, this);

        this.physics.add.overlap(this.player, this.missiles, (player, missile) => {
            const damage = WeaponConfig.homingMissile.damage; // Assuming enemy missiles are similar
            this.handleDamage(player, damage, null, 'ENEMY_MISSILE');
            missile.destroy();
        }, null, this);

        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);

        this.physics.add.overlap(this.droneBullets, this.player, (player, bullet) => {
            const damage = bullet.damageValue || EnemyConfig.drone.bulletDamage;
            this.handleDamage(player, damage, null, 'DRONE_BULLET');
            bullet.destroy();
        }, null, this);

        this.physics.add.overlap(this.infantryBullets, this.player, (player, bullet) => {
            const damage = this.enemyStats.infantry.bulletDamage;
            this.handleDamage(player, damage, null, 'INFANTRY_BULLET');
            bullet.destroy();
        }, null, this);

        this.physics.add.overlap(this.flakBullets, this.player, (player, bullet) => {
            // Flak bullets explode near player without direct hit usually, but if overlapping:
            bullet.explode(true);
            // Logic handled in FlakBullet usually involves area damage, 
            // but if direct hit, we can apply damage too.
            // FlakBullet.explode calls creates explosion which might damage player if we had area check.
            // For now, let's assume direct hit damage or rely on existing logic.
            // Existing logic was: (p, b) => b.explode(true)
        }, null, this);

        this.physics.add.overlap(this.drones, this.player, (player, drone) => {
            const isKamikaze = drone.state === 'KAMIKAZE';
            const damage = isKamikaze ? EnemyConfig.drone.kamikazeDamage : EnemyConfig.drone.collisionDamage;
            this.handleDamage(player, damage, null, isKamikaze ? 'KAMIKAZE' : 'COLLISION');
            drone.explode(); // This kills the drone via internal logic or we should call handleDamage on drone?
            // drone.explode() calls handleDestruction? No, drone.explode sets state to dead and plays anim.
            // Let's ensure drone dies.
            this.handleDamage(drone, 9999, null, 'SELF_DESTRUCT');
        }, null, this);

        // Player weapons vs Enemies
        const weapons = [this.bombs, this.mgBullets, this.clusterMissiles, this.sawblades, this.multiMissiles, this.flames];
        const terrainEnemies = [this.tanks, this.t95Tanks, this.watchtowers, this.infantry, this.flakCannons];
        const flyerEnemies = [this.drones, this.hangars];
        const allEnemies = [...terrainEnemies, ...flyerEnemies];

        weapons.forEach(weaponGroup => {
            allEnemies.forEach(enemyGroup => {
                this.physics.add.overlap(weaponGroup, enemyGroup, (weapon, enemy) => {
                    // Determine damage and properties based on weapon type
                    let damage = 0;
                    let damageType = 'GENERIC';
                    let sourceId = weapon.sourceId || null;

                    if (weaponGroup === this.multiMissiles) {
                        damage = WeaponConfig.multiMissile.damage;
                        damageType = 'MULTI_MISSILE';
                        // Visuals handled in handleDestruction/handleDamage or here?
                        // MultiMissile previously had specific logic: createBigExplosion
                    } else if (weaponGroup === this.bombs) {
                        damage = WeaponConfig.bomb.damage;
                        damageType = 'BOMB';
                    } else if (weaponGroup === this.mgBullets) {
                        damage = WeaponConfig.machineGun.damage;
                        damageType = 'MG';
                    } else if (weaponGroup === this.clusterMissiles) {
                        damage = WeaponConfig.clusterMissile.damage;
                        damageType = 'CLUSTER';
                    } else if (weaponGroup === this.sawblades) {
                        damage = WeaponConfig.sawblade.damagePerSecond * (this.game.loop.delta / 1000);
                        damageType = 'SAWBLADE';
                    } else if (weaponGroup === this.flames) {
                        damage = WeaponConfig.flamethrower.damagePerSecond * (this.game.loop.delta / 1000);
                        damageType = 'FLAME';
                    }

                    // Apply Damage
                    this.handleDamage(enemy, damage, sourceId, damageType);

                    // Weapon specific cleanup/behavior
                    if (damageType === 'MULTI_MISSILE') {
                        this.createBigExplosion(weapon.x, weapon.y, 60);
                        this.playExplosionSound();
                        weapon.destroy();
                    } else if (damageType === 'BOMB') {
                        this.explodeBomb(weapon, enemy); // Logic to prevent double explosion? explodeBomb destroys weapon
                    } else if (damageType === 'CLUSTER') {
                        this.explodeCluster(weapon, enemy);
                    } else if (damageType === 'MG') {
                        weapon.destroy();
                    } else if (damageType === 'SAWBLADE') {
                        // Sawblade logic (bounce, spark)
                        if (enemy.constructor.name === 'Tank' || enemy.constructor.name === 'Tower' || enemy.constructor.name === 'FlakCannon' || enemy.constructor.name === 'DroneHangar') {
                            const dx = enemy.x - weapon.x;
                            if ((dx > 0 && weapon.body.velocity.x > 0) || (dx < 0 && weapon.body.velocity.x < 0)) {
                                weapon.bounce();
                            }
                        }
                        if (Math.random() < 0.2) {
                            const spark = this.add.circle(enemy.x, enemy.y, 3, 0xffaa00);
                            this.tweens.add({ targets: spark, x: enemy.x + Phaser.Math.Between(-10, 10), y: enemy.y - 10, alpha: 0, duration: 300, onComplete: () => spark.destroy() });
                        }
                    } else if (damageType === 'FLAME') {
                        // Apply burn effect (Scene-level tracking)
                        this.applyBurnStatus(enemy, WeaponConfig.flamethrower.burnDuration);
                    }

                });
            });
        });
    }


    setupTimers() {
        const levelData = LevelConfig[this.currentLevel];
        this.shootTimer = this.time.addEvent({ delay: WeaponConfig.tankBullet.fireRate, callback: this.tankShoot, callbackScope: this, loop: true });
        this.powerupTimer = this.time.addEvent({ delay: 5000, callback: this.spawnPowerup, callbackScope: this, loop: true });

        // periodic reinforcement check (every 5 seconds)
        this.reinforcementTimer = this.time.addEvent({
            delay: 5000,
            callback: this.checkReinforcements,
            callbackScope: this,
            loop: true
        });

        if (levelData.targetHangars > 0) {
            this.hangarSpawnTimer = this.time.addEvent({
                delay: 12000 * levelData.spawnIntervalMultiplier,
                callback: this.spawnHangar,
                callbackScope: this,
                loop: true
            });
        }

        if (levelData.targetInfantry > 0) {
            this.infantrySpawnTimer = this.time.addEvent({
                delay: 5000 * levelData.spawnIntervalMultiplier, // Spawn quite often if needed
                callback: this.spawnInfantry,
                callbackScope: this,
                loop: true
            });
        }
    }

    checkReinforcements() {
        if (this.isPaused || this.isGameOver) return;
        const levelData = LevelConfig[this.currentLevel];

        // Check Tanks
        if (levelData.targetTanks > 0) {
            const current = (this.tanks ? this.tanks.countActive(true) : 0) + this.tanksDestroyed;
            if (current < levelData.targetTanks) this.spawnSingleTank();
        }

        // Check T95
        if (levelData.targetT95 > 0) {
            const current = (this.t95Tanks ? this.t95Tanks.countActive(true) : 0) + this.t95Destroyed;
            if (current < levelData.targetT95) this.spawnSingleT95Tank();
        }

        // Check Towers
        if (levelData.targetTowers > 0) {
            const current = (this.watchtowers ? this.watchtowers.countActive(true) : 0) + this.towersDestroyed;
            if (current < levelData.targetTowers) this.spawnSingleTower();
        }

        // Check Flaks
        if (levelData.targetFlaks > 0) {
            const current = (this.flakCannons ? this.flakCannons.countActive(true) : 0) + (this.flaksDestroyed || 0);
            if (current < levelData.targetFlaks) this.spawnSingleFlak();
        }

        // Check Hangars
        if (levelData.targetHangars > 0) {
            const current = (this.hangars ? this.hangars.countActive(true) : 0) + this.hangarsDestroyed;
            if (current < levelData.targetHangars) this.spawnSingleHangar();
        }
    }

    spawnSingleTank() {
        if (this.isPaused || this.isGameOver) return;
        const x = Phaser.Math.Between(100, this.worldWidth - 100);
        if (this.isSpaceEmpty(x, 80)) {
            const levelMult = LevelConfig[this.currentLevel].enemySpeedMultiplier;
            const y = this.getTerrainHeight(x) - 15;
            const tank = new Tank(this, x, y, 'tankTexture' + this.textureSuffix, 100, 150 * levelMult, this.getTerrainHeight.bind(this));
            this.tanks.add(tank);
        }
    }

    spawnSingleT95Tank() {
        if (this.isPaused || this.isGameOver) return;
        const x = Phaser.Math.Between(100, this.worldWidth - 100);
        if (this.isSpaceEmpty(x, 100)) {
            const config = this.enemyStats.t95;
            const levelMult = LevelConfig[this.currentLevel].enemySpeedMultiplier;
            const y = this.getTerrainHeight(x) - config.groundOffset;
            const tank = new T95Tank(this, x, y, 't95TankTexture' + this.textureSuffix, config.hp, config.speed * levelMult, this.getTerrainHeight.bind(this));
            this.t95Tanks.add(tank);
        }
    }

    spawnSingleTower() {
        if (this.isPaused || this.isGameOver) return;
        const x = Phaser.Math.Between(150, this.worldWidth - 150);
        if (this.isSpaceEmpty(x, 100)) {
            const groundOffset = EnemyConfig.tower.groundOffset;
            const y = this.getTerrainHeight(x) - groundOffset;
            const hp = EnemyConfig.tower.hp;
            const tower = new Tower(this, x, y, 'towerTexture' + this.textureSuffix, hp);
            this.watchtowers.add(tower);
        }
    }

    spawnSingleFlak() {
        if (this.isPaused || this.isGameOver) return;
        const x = Phaser.Math.Between(200, this.worldWidth - 200);
        if (this.isSpaceEmpty(x, 120)) {
            const groundOffset = this.enemyStats.flakCannon.groundOffset;
            const y = this.getTerrainHeight(x) - groundOffset;
            const hp = this.enemyStats.flakCannon.hp;
            const flak = new FlakCannon(this, x, y, hp);
            this.flakCannons.add(flak);
        }
    }

    spawnSingleHangar() {
        if (this.isPaused || this.isGameOver) return;
        const x = Phaser.Math.Between(200, this.worldWidth - 200);
        if (this.isSpaceEmpty(x, 150)) {
            const groundOffset = this.enemyStats.hangar.groundOffset;
            const y = this.getTerrainHeight(x) - groundOffset;
            const hangar = new DroneHangar(this, x, y, 'hangarTexture' + this.textureSuffix);
            this.hangars.add(hangar);
        }
    }

    spawnInfantrySquad(centerX) {
        const count = Phaser.Math.Between(3, 5);
        for (let i = 0; i < count; i++) {
            const x = centerX + Phaser.Math.Between(-60, 60);
            if (x < 100 || x > this.worldWidth - 100) continue;
            const groundOffset = this.enemyStats.infantry.groundOffset;
            const y = this.getTerrainHeight(x) - groundOffset;
            const hp = this.enemyStats.infantry.hp;
            const speed = this.enemyStats.infantry.speed * this.levelStats.enemySpeedMultiplier;
            const inf = new Infantry(this, x, y, 'infantryTorso', hp, speed, this.getTerrainHeight.bind(this));
            this.infantry.add(inf);
        }
    }

    spawnInfantry() {
        if (this.isPaused || this.isGameOver) return;
        const levelData = LevelConfig[this.currentLevel];
        // Only spawn if we haven't met the quota OR if the quota is high and we need to keep supplying enemies
        // Actually, we should just check if we have enough active. 
        // If we killed enough, maybe stop? 
        // "Ensure enough infantry spawn" -> if destroyed < target, spawn more.
        if (this.infantryDestroyed < levelData.targetInfantry) {
            // Limit active infantry to avoid lag
            if (this.infantry.countActive() < 15) {
                const x = Phaser.Math.Between(100, this.worldWidth - 100);
                if (this.isSpaceEmpty(x, 40)) {
                    this.spawnInfantrySquad(x);
                }
            }
        }
    }

    spawnInitialInfantry(count) {
        let spawned = 0;
        let attempts = 0;
        while (spawned < count && attempts < 100) {
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            if (this.isSpaceEmpty(x, 40)) {
                this.spawnInfantrySquad(x);
                spawned += 4;
            }
            attempts++;
        }
    }

    spawnInitialTowers(count) {
        let spawned = 0;
        let attempts = 0;
        while (spawned < count && attempts < 100) {
            const x = Phaser.Math.Between(150, this.worldWidth - 150);
            if (this.isSpaceEmpty(x, 100)) {
                const groundOffset = EnemyConfig.tower.groundOffset;
                const y = this.getTerrainHeight(x) - groundOffset;
                const hp = EnemyConfig.tower.hp;
                const tower = new Tower(this, x, y, 'towerTexture' + this.textureSuffix, hp);
                this.watchtowers.add(tower);
                spawned++;
            }
            attempts++;
        }
    }

    spawnInitialHangars(count) {
        let spawned = 0;
        let attempts = 0;
        while (spawned < count && attempts < 100) {
            const x = Phaser.Math.Between(200, this.worldWidth - 200);
            if (this.isSpaceEmpty(x, 150)) {
                const groundOffset = this.enemyStats.hangar.groundOffset;
                const y = this.getTerrainHeight(x) - groundOffset;
                const hangar = new DroneHangar(this, x, y, 'hangarTexture' + this.textureSuffix);
                this.hangars.add(hangar);
                spawned++;
                this.spawnInfantrySquad(x + Phaser.Math.Between(-150, 150));
            }
            attempts++;
        }
    }

    spawnInitialFlaks(count) {
        let spawned = 0;
        let attempts = 0;
        while (spawned < count && attempts < 100) {
            const x = Phaser.Math.Between(200, this.worldWidth - 200);
            if (this.isSpaceEmpty(x, 120)) {
                const groundOffset = this.enemyStats.flakCannon.groundOffset;
                const y = this.getTerrainHeight(x) - groundOffset;
                const hp = this.enemyStats.flakCannon.hp;
                const flak = new FlakCannon(this, x, y, hp);
                this.flakCannons.add(flak);
                spawned++;
            }
            attempts++;
        }
    }

    spawnInitialTanks(count) {
        let spawned = 0;
        let attempts = 0;
        const levelMult = LevelConfig[this.currentLevel].enemySpeedMultiplier;
        while (spawned < count && attempts < 50) {
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            if (this.isSpaceEmpty(x, 80)) {
                const y = this.getTerrainHeight(x) - 15;
                const tank = new Tank(this, x, y, 'tankTexture' + this.textureSuffix, 100, 150 * levelMult, this.getTerrainHeight.bind(this));
                this.tanks.add(tank);
                spawned++;
            }
            attempts++;
        }
    }

    spawnInitialT95Tanks(count) {
        let spawned = 0;
        let attempts = 0;
        const config = this.enemyStats.t95;
        const levelMult = LevelConfig[this.currentLevel].enemySpeedMultiplier;
        while (spawned < count && attempts < 50) {
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            if (this.isSpaceEmpty(x, 100)) {
                const y = this.getTerrainHeight(x) - config.groundOffset;
                const tank = new T95Tank(this, x, y, 't95TankTexture' + this.textureSuffix, config.hp, config.speed * levelMult, this.getTerrainHeight.bind(this));
                this.t95Tanks.add(tank);
                spawned++;
            }
            attempts++;
        }
    }

    isSpaceEmpty(x, minDistance) {
        const groups = [this.tanks, this.watchtowers, this.hangars, this.flakCannons];
        for (const group of groups) {
            if (!group) continue;
            const conflict = group.getChildren().some(entity => Math.abs(entity.x - x) < minDistance);
            if (conflict) return false;
        }
        return true;
    }

    getEnemiesForAutopilot() {
        // Collect all potential obstacles for Autopilot raycasting
        const obstacles = [];
        [this.tanks, this.t95Tanks, this.watchtowers, this.hangars, this.flakCannons].forEach(group => {
            group.children.each(child => {
                if (child.active) obstacles.push(child);
            });
        });
        return obstacles;
    }

    dropBomb() {
        if (this.isPaused || this.isGameOver || !this.player.active) return;
        const bomb = this.bombs.create(this.player.x, this.player.y + 10, 'bombTexture' + this.textureSuffix);
        bomb.sourceId = 'bomb_' + this.time.now;
        bomb.body.velocity.y = 200;
        bomb.body.velocity.x = this.player.body.velocity.x;
    }

    fireMachineGun() {
        if (this.isPaused || this.isGameOver || !this.player.active) return;
        const vec = new Phaser.Math.Vector2(20, 0).rotate(this.player.rotation);
        const dischargeX = this.player.x + vec.x;
        const dischargeY = this.player.y + vec.y;
        const bullet = this.mgBullets.create(dischargeX, dischargeY, 'mgBulletTexture' + this.textureSuffix);
        bullet.body.allowGravity = false;
        this.physics.velocityFromRotation(this.player.rotation, WeaponConfig.machineGun.speed, bullet.body.velocity);
        bullet.rotation = this.player.rotation + Math.PI / 2;
        const flash = this.add.circle(dischargeX, dischargeY, 8, 0xffffdd);
        this.time.delayedCall(50, () => flash.destroy());
    }

    spawnDroneBullet(x, y, rotation) {
        const config = this.enemyStats.drone;
        const bullet = this.droneBullets.create(x, y, 'droneBulletTexture' + this.textureSuffix);
        bullet.body.allowGravity = false;
        this.physics.velocityFromRotation(rotation, config.bulletSpeed, bullet.body.velocity);
        bullet.rotation = rotation;
    }

    flakFire(cannon, rotation, spawnX, spawnY) {
        const config = WeaponConfig.flakCannon;
        // Specify texture key so Phaser correctly assigns it to the pooled sprite
        let bullet = this.flakBullets.get(spawnX, spawnY, 'flakBulletTexture' + this.textureSuffix);

        if (bullet) {
            // Use the muzzle tip position passed from the cannon
            const flashX = spawnX || cannon.x;
            const flashY = spawnY || cannon.y;

            bullet.fire(flashX, flashY, rotation, config.bulletSpeed, config);

            // Muzzle Flash Effect at the specific barrel's tip
            const flash = this.add.circle(flashX, flashY, 15, 0xFFFF00).setDepth(2);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 2,
                duration: 150,
                onComplete: () => flash.destroy()
            });

            this.playShootSound();
        }
    }

    explodeFlak(x, y, isDirectHit) {
        const config = WeaponConfig.flakCannon;

        // Visual smoke cloud
        const smoke = this.add.circle(x, y, config.explosionRadius, 0x424242, 0.7);
        this.tweens.add({
            targets: smoke,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            onComplete: () => smoke.destroy()
        });

        // Particle burst
        const emitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            x: x, y: y, speed: { min: 20, max: 60 }, scale: { start: 0.8, end: 0 }, lifespan: 400, quantity: 10, tint: 0x666666
        });
        emitter.explode(10);
        this.time.delayedCall(500, () => emitter.destroy());
        this.playExplosionSound();

        // Damage logic
        if (isDirectHit) {
            this.handleDamage(this.player, config.directDamage, null, 'FLAK_DIRECT');
        } else {
            // Splash Damage: Check distance to player
            const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
            if (dist <= config.explosionRadius + 20) { // Addition for player body size
                this.handleDamage(this.player, config.splashDamage, null, 'FLAK_SPLASH');
            }
        }
    }



    fireMultiMissile(time, lockedTargets = []) {
        if (this.isPaused || this.isGameOver || !this.player.active) return;
        const t1 = lockedTargets.length > 0 ? lockedTargets[0] : null;
        const t2 = lockedTargets.length > 1 ? lockedTargets[1] : (t1 || null);
        const offsets = [-15, 15];
        offsets.forEach((offset, index) => {
            const wingPos = new Phaser.Math.Vector2(0, offset).rotate(this.player.rotation);
            const missileX = this.player.x + wingPos.x;
            const missileY = this.player.y + wingPos.y;
            const target = (index === 0) ? t1 : t2;
            const missile = new MultiMissile(this, missileX, missileY, 'multiMissileTexture' + this.textureSuffix, WeaponConfig.multiMissile.speed, target, WeaponConfig.multiMissile.damage);
            missile.rotation = this.player.rotation;
            this.multiMissiles.add(missile);
        });
        this.playShootSound();
    }

    getEntityType(entity) {
        if (entity instanceof Tank) {
            if (entity instanceof T95Tank) return 't95';
            return 'tank';
        }
        if (entity instanceof Tower) return 'tower';
        if (entity instanceof Drone) return 'drone';
        if (entity instanceof DroneHangar) return 'hangar';
        if (entity instanceof Infantry) return 'infantry';
        if (entity instanceof FlakCannon) return 'flak';
        return 'unknown';
    }


    registerKill(sourceId, amount, coinAmount, x, y) {
        if (!sourceId) {
            this.addScore(amount);
            this.addCoins(coinAmount, x, y);
            this.showFloatingText(x, y, '+' + Math.floor(amount), '#ffffff');
            return;
        }
        if (!this.comboTracker[sourceId]) this.comboTracker[sourceId] = { count: 0, score: 0, coins: 0, x: 0, y: 0 };
        const combo = this.comboTracker[sourceId];
        combo.count++;
        combo.score += amount;
        combo.coins += coinAmount;
        combo.x = x;
        combo.y = y;

        if (combo.timer) combo.timer.remove();
        combo.timer = this.time.delayedCall(150, () => {
            let final = combo.score;
            let message = '+' + Math.floor(combo.score);
            let color = '#ffffff';

            if (combo.count >= ScoreConfig.multiKill.threshold) {
                const bonus = combo.score * ScoreConfig.multiKill.multiplier;
                final += bonus;
                message += ' (+' + Math.floor(bonus) + ' MK)';
                color = '#ff00ff';
                this.showFloatingText(combo.x, combo.y - 30, 'MULTI-KILL! ' + message, color);
            } else {
                this.showFloatingText(combo.x, combo.y - 30, message, color);
            }

            this.addScore(final);
            this.addCoins(combo.coins, combo.x, combo.y);
            delete this.comboTracker[sourceId];
        });
    }

    addCoins(amount, x, y) {
        if (amount <= 0) return;
        this.totalCoins += amount;
        this.events.emit('update-coins', this.totalCoins);
        const coin = this.add.image(x, y, 'coinTexture' + this.textureSuffix).setDepth(100);
        this.tweens.add({ targets: coin, y: y - 80, alpha: 0, scale: 1.5, duration: 1000, onComplete: () => coin.destroy() });
        this.showFloatingText(x + 20, y - 20, `+${amount}$`, '#ffd700');
    }

    showFloatingText(x, y, message, color) {
        const text = this.add.text(x, y, message, { fontSize: '20px', fill: color, stroke: '#000', strokeThickness: 3, fontStyle: 'bold' }).setOrigin(0.5).setDepth(100);
        this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 1500, onComplete: () => text.destroy() });
    }

    addScore(amount) {
        this.score += Math.floor(amount);
        this.events.emit('update-score', this.score);
        EventBus.emit('update-score', this.score);
    }

    broadcastObjectives() {
        const levelData = LevelConfig[this.currentLevel];
        if (!levelData) return;

        const objectives = [];

        // Map config keys to scene properties
        const mapping = {
            targetTanks: { label: 'Tanks', current: this.tanksDestroyed },
            targetT95: { label: 'T95', current: this.t95Destroyed },
            targetTowers: { label: 'Towers', current: this.towersDestroyed },
            targetInfantry: { label: 'Infantry', current: this.infantryDestroyed },
            targetHangars: { label: 'Hangars', current: this.hangarsDestroyed },
            targetFlaks: { label: 'Flak', current: this.flaksDestroyed || 0 },
            targetDrones: { label: 'Drones', current: this.dronesDestroyed || 0 }
        };

        // Filter for targets > 0
        Object.keys(levelData).forEach(key => {
            if (key.startsWith('target') && levelData[key] > 0 && mapping[key]) {
                objectives.push({
                    label: mapping[key].label,
                    current: mapping[key].current,
                    target: levelData[key]
                });
            }
        });

        this.events.emit('update-objectives', objectives);
    }

    checkLevelWin() {
        const levelData = LevelConfig[this.currentLevel];
        const tanksOk = this.tanksDestroyed >= (levelData.targetTanks || 0);
        const t95Ok = this.t95Destroyed >= (levelData.targetT95 || 0);
        const towersOk = this.towersDestroyed >= (levelData.targetTowers || 0);
        const hangarsOk = this.hangarsDestroyed >= (levelData.targetHangars || 0);
        const flaksOk = (this.flaksDestroyed || 0) >= (levelData.targetFlaks || 0);
        const infantryOk = (this.infantryDestroyed || 0) >= (levelData.targetInfantry || 0);
        const dronesOk = (this.dronesDestroyed || 0) >= (levelData.targetDrones || 0);

        if (tanksOk && t95Ok && towersOk && hangarsOk && flaksOk && infantryOk && dronesOk) {
            if (this.currentLevel < 20) this.doLevelComplete();
            else this.doFinalVictory();
        }
    }

    showWeaponMessage(text) {
        if (this.lastWeaponMessageTime && this.time.now < this.lastWeaponMessageTime + 500) return;
        this.lastWeaponMessageTime = this.time.now;
        const msg = this.add.text(this.player.x, this.player.y - 40, text, { fontSize: '16px', fill: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        this.tweens.add({ targets: msg, y: msg.y - 50, alpha: 0, duration: 1000, onComplete: () => msg.destroy() });
    }


    async doLevelComplete() {
        this.isGameOver = true;
        this.victoryText.setText('LEVEL ' + this.currentLevel + ' COMPLETE!').setVisible(true);

        // Save progress
        // Save progress
        if (this.playerId) {
            progressService.saveLevelProgress(this.playerId, {
                levelNumber: this.currentLevel,
                highScore: this.score,
                totalCoins: this.totalCoins
            });

            // Submit to Leaderboard
            leaderboardService.submitScore(this.playerId, this.playerName, this.score);
        }

        this.time.delayedCall(1500, () => {
            this.scene.start('UpgradeShop', {
                level: this.currentLevel + 1,
                coins: this.totalCoins,
                score: this.score,
                initialCoins: this.initialCoins,
                initialScore: this.initialScore
            });
        });
    }

    async doFinalVictory() {
        this.isGameOver = true;
        this.physics.pause();
        this.victoryText.setText('VICTORY! ALL LEVELS CLEAR').setVisible(true);

        // Submit final score
        if (this.playerId) {
            leaderboardService.submitScore(this.playerId, this.playerName, this.score);
        }
        this.restartText.setText('FINAL SCORE: ' + this.score + '\nPress ENTER to Restart').setVisible(true);
    }

    async doGameOver() {
        console.trace('Game Over Triggered by:');
        this.isGameOver = true;
        this.physics.pause();
        this.player.setVisible(false);
        this.victoryText.setText('GAME OVER').setFill('#ff0000').setVisible(true);
        this.restartText.setText('Press ENTER to Restart').setVisible(true);

        // Submit score on Game Over
        if (this.playerId) {
            leaderboardService.submitScore(this.playerId, this.playerName, this.score);
        }

        EventBus.emit('game-over', { score: this.score, level: this.currentLevel, coins: this.totalCoins });
    }

    restartGame() {
        this.physics.world.timeScale = 1;
        this.scene.restart({
            level: this.currentLevel,
            coins: this.initialCoins,
            score: this.initialScore,
            isNextLevel: false
        });
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.pauseText.setText('PAUSED\n\n[ESC] RESUME\n[L] LEADERBOARD\n[H] HISTORY').setVisible(true);
            if (this.tutorialGroup) this.tutorialGroup.setVisible(true);
        } else {
            this.physics.resume();
            this.pauseText.setVisible(false);
            if (this.tutorialGroup) this.tutorialGroup.setVisible(false);
        }
    }

    explodeBomb(bomb, exclude) {
        this.createBigExplosion(bomb.x, bomb.y, WeaponConfig.bomb.explosionRadius);
        this.applySplashDamage(bomb.x, bomb.y, WeaponConfig.bomb.explosionRadius, WeaponConfig.bomb.secondaryDamage, bomb.sourceId, exclude);
        this.playExplosionSound();
        bomb.destroy();
    }

    explodeCluster(missile, exclude) {
        this.createBigExplosion(missile.x, missile.y, WeaponConfig.clusterMissile.explosionRadius);
        this.applySplashDamage(missile.x, missile.y, WeaponConfig.clusterMissile.explosionRadius, WeaponConfig.clusterMissile.secondaryDamage, missile.sourceId, exclude);
        this.playExplosionSound();
        if (missile.particles) missile.particles.destroy();
        missile.destroy();
    }

    createBigExplosion(x, y, radius) {
        const circle = this.add.circle(x, y, radius, 0xffa500, 0.5);
        this.tweens.add({ targets: circle, alpha: 0, scale: 1.5, duration: 500, onComplete: () => circle.destroy() });
        const emitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            x: x, y: y, speed: { min: 50, max: 200 }, scale: { start: 1, end: 0 }, lifespan: 500, quantity: 20
        });
        emitter.explode(20);
        this.time.delayedCall(1000, () => emitter.destroy());
    }

    explodeTankBullet(x, y) {
        const emitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            x: x, y: y, speed: { min: 20, max: 60 }, scale: { start: 0.5, end: 0 }, lifespan: 300, quantity: 10, tint: 0xffaa00
        });
        emitter.explode(10);
        this.playExplosionSound(); // Or a smaller sound if available
        this.time.delayedCall(500, () => emitter.destroy());
    }

    applySplashDamage(x, y, radius, damage, sourceId, exclude) {
        const enemyGroups = [this.tanks, this.t95Tanks, this.watchtowers, this.infantry, this.drones, this.hangars, this.flakCannons];
        enemyGroups.forEach(group => {
            if (!group) return;
            group.children.each(entity => {
                if (entity.active && entity !== exclude && Phaser.Math.Distance.Between(x, y, entity.x, entity.y) <= radius) {
                    this.handleDamage(entity, damage, sourceId, 'EXPLOSION_SPLASH');
                }
            });
        });
    }

    explodeMissile(x, y) {
        const emitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
            x: x, y: y, speed: { min: 20, max: 60 }, scale: { start: 0.8, end: 0 }, lifespan: 400, quantity: 15, tint: 0xff4400
        });
        emitter.explode(10);
        this.playExplosionSound();
        this.time.delayedCall(500, () => emitter.destroy());
    }

    createFireworks(x, y) {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 200, () => {
                const emitter = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
                    x: x + Phaser.Math.Between(-100, 100), y: y + Phaser.Math.Between(-100, 100),
                    speed: 200, lifespan: 1000, quantity: 40, tint: colors[i % colors.length]
                });
                emitter.explode(40);
                this.playExplosionSound();
                this.time.delayedCall(1500, () => emitter.destroy());
            });
        }
    }

    playExplosionSound() {
        try {
            const ctx = window.gameAudioCtx;
            if (!ctx || ctx.state === 'closed') return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => { });
            if (ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(); osc.stop(ctx.currentTime + 0.5);
        } catch (e) { }
    }

    fireSawblade(time) {
        const minSpeed = PlayerConfig.speed;
        const sign = this.player.body.velocity.x >= 0 ? 1 : -1;
        const vx = Math.max(minSpeed, Math.abs(this.player.body.velocity.x)) * sign;
        const sb = new Sawblade(this, this.player.x, this.player.y + 10, 'sawbladeTexture' + this.textureSuffix, 'sb_' + time, this.getTerrainHeight.bind(this), 12);
        this.sawblades.add(sb);
        sb.setVelocity(vx, this.player.body.velocity.y + 50);
    }

    fireClusterMissile(time) {
        const batchId = 'cluster_' + time;
        [-50, 0, 50].forEach(push => {
            const cm = this.clusterMissiles.create(this.player.x, this.player.y + 10, 'clusterMissileTexture' + this.textureSuffix);
            cm.sourceId = batchId;
            cm.body.allowGravity = true;
            cm.body.gravity.y = 100;
            cm.setVelocity(this.player.body.velocity.x + push, this.player.body.velocity.y + 50);
            cm.rotation = this.player.rotation;
            const particles = this.add.particles(0, 0, 'particleTexture' + this.textureSuffix, {
                follow: cm, scale: { start: 0.6, end: 0 }, lifespan: 300, blendMode: 'ADD', tint: 0xffaa00
            });
            cm.particles = particles;
        });
        this.playShootSound();
    }

    spawnPowerup() {
        if (this.isPaused || this.isGameOver) return;
        const x = Phaser.Math.Between(50, this.worldWidth - 50);
        const y = Phaser.Math.Between(50, (this.scale.height * 2) / 3);
        const star = this.powerups.create(x, y, 'starTexture' + this.textureSuffix);
        star.body.allowGravity = false;
        this.tweens.add({ targets: star, angle: 360, duration: 3000, repeat: -1, ease: 'Linear' });
        this.tweens.add({ targets: star, scaleX: 1.3, scaleY: 1.3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.time.delayedCall(7000, () => { if (star.active) this.tweens.add({ targets: star, alpha: 0, duration: 100, yoyo: true, repeat: -1 }); });
        this.time.delayedCall(10000, () => { if (star.active) star.destroy(); });
    }

    collectPowerup(player, star) {
        star.destroy();
        this.isPoweredUp = true;
        this.player.setTint(0xffff00);
        this.bombDelay = 333;
        this.time.delayedCall(10000, () => {
            this.isPoweredUp = false;
            this.player.clearTint();
            this.bombDelay = WeaponConfig.bomb.fireRate;
        });
    }

    towerFire(tower, time) {
        const levelMult = LevelConfig[this.currentLevel].enemySpeedMultiplier;
        const config = this.enemyStats.tower;
        const m = new Missile(this, tower.x, tower.y - config.shotYOffset, 'missileTexture' + this.textureSuffix, config.missileSpeed * levelMult, this.player);
        this.missiles.add(m);
        tower.nextShot = time + (WeaponConfig.homingMissile.fireRate / levelMult);
    }

    spawnHangar() {
        if (this.isPaused || this.isGameOver) return;
        const config = this.enemyStats.hangar;
        const spawnX = Phaser.Math.Between(200, this.worldWidth - 200);
        const spawnY = this.getTerrainHeight(spawnX) - config.groundOffset;
        const hangar = new DroneHangar(this, spawnX, spawnY, 'hangarTexture' + this.textureSuffix);
        this.hangars.add(hangar);
    }

    spawnDroneFromHangar(x, y) {
        const drone = new Drone(this, x, y, 'droneTexture' + this.textureSuffix, this.player);
        this.drones.add(drone);
        const alert = this.add.text(x, y - 40, 'DRONE DETECTED!', { fontSize: '14px', fill: '#ff0000', fontStyle: 'bold', backgroundColor: '#000' }).setOrigin(0.5);
        this.tweens.add({ targets: alert, alpha: 0, y: y - 80, duration: 2000, onComplete: () => alert.destroy() });
        this.playBeepSound();
    }

    playBeepSound() {
        try {
            const ctx = window.gameAudioCtx;
            if (!ctx || ctx.state === 'closed') return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => { });
            if (ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    }

    playShootSound() {
        try {
            const ctx = window.gameAudioCtx;
            if (!ctx || ctx.state === 'closed') return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => { });
            if (ctx.state !== 'running') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    }

    updateFlamethrower(time, delta) {
        if (!this.player || !this.player.active) return;

        // 1. Particle Emission (Legacy) - Still used for some background effect or replaced by Flame objects?
        // Let's replace the main emission with Flame objects for "cluster bomb" feel.
        if (this.player.isFiringFlamethrower) {
            // Firing frequency: throttle spawn to avoid too many objects
            if (!this.lastFlameSpawned || time > this.lastFlameSpawned + 40) { // ~25 flames per second
                this.fireFlame();
                this.lastFlameSpawned = time;
            }

            // 2. Collision & Ground Fire (Legacy Raycast Removed)
            // Ground fires are now created by Flame projectiles in Flame.js
        }

        // 3. Process Ground Fires (Overlap check: Direct Damage + Status)
        this.groundFires.children.each(fire => {
            if (!fire.active) return;
            const enemyGroups = [this.tanks, this.t95Tanks, this.infantry];
            enemyGroups.forEach(group => {
                group.children.each(e => {
                    if (e.active && Phaser.Math.Distance.Between(fire.x, fire.y, e.x, e.y) < 35) {
                        // Apply immediate DOT damage from ground fire
                        this.handleDamage(e, WeaponConfig.flamethrower.damagePerSecond * 0.5 * (delta / 1000), this.player.playerId, 'FLAME_GROUND');
                        // Refresh/Apply burn status
                        this.applyBurnStatus(e, WeaponConfig.flamethrower.burnDuration);
                    }
                });
            });
        });

        // 4. Process Burned Enemies (DOT)
        this.burnedEnemies.forEach((data, enemy) => {
            if (!enemy.active || time > data.endTime) {
                if (data.effect) data.effect.stop();
                this.burnedEnemies.delete(enemy);
            } else {
                // Apply DOT
                this.handleDamage(enemy, WeaponConfig.flamethrower.damagePerSecond * (delta / 1000), this.player.playerId, 'BURN');
                // visual effect follows
                if (data.effect) {
                    data.effect.setPosition(enemy.x, enemy.y);
                }
            }
        });
    }

    fireFlame() {
        const config = WeaponConfig.flamethrower;

        // Spawn from belly (slightly behind the center and downwards)
        const angle = this.player.rotation;
        const forwardOffset = 10; // Behind the nose
        const sideOffset = 10;    // "Downwards" relative to plane

        const x = this.player.x + Math.cos(angle) * forwardOffset - Math.sin(angle) * sideOffset;
        const y = this.player.y + Math.sin(angle) * forwardOffset + Math.cos(angle) * sideOffset;

        // Slight randomness in angle for "spray" look
        const sprayAngle = this.player.rotation + Phaser.Math.FloatBetween(-0.15, 0.15);
        const speed = 500 + this.player.currentSpeed;

        const flame = new Flame(
            this,
            x, y,
            'flameBlobTexture' + this.textureSuffix,
            sprayAngle,
            speed,
            config.range,
            config.damagePerSecond
        );
        this.flames.add(flame);
    }

    createGroundFire(x, y) {
        const fire = this.groundFires.create(x, y, 'particleTexture');
        fire.setAlpha(0); // Invisible physics body
        fire.setScale(2.5); // Slightly larger hitbox

        const config = WeaponConfig.flamethrower;

        // Visuals: Dense sticky fire using the new flame particle texture
        const emitter = this.add.particles(x, y, 'flameParticleTexture' + this.textureSuffix, {
            lifespan: { min: 400, max: 800 },
            scale: { start: 1, end: 0 },
            speed: { min: 10, max: 40 },
            angle: { min: 240, max: 300 },
            gravityY: -50,
            tint: [0xffff00, 0xffa500, 0xff0000],
            blendMode: 'ADD',
            frequency: 40, // Constant flow
            maxParticles: 100
        });
        emitter.setDepth(14);

        // Timer for the 3s duration (config.groundFireDuration = 3000)
        this.time.delayedCall(config.groundFireDuration, () => {
            if (emitter) emitter.stop();
            this.time.delayedCall(500, () => {
                if (emitter) emitter.destroy();
                if (fire && fire.active) fire.destroy();
            });
        });
    }

    applyBurnStatus(enemy, duration) {
        let data = this.burnedEnemies.get(enemy);
        if (!data) {
            const emitter = this.add.particles(enemy.x, enemy.y, 'particleTexture', {
                lifespan: 300,
                scale: { start: 0.8, end: 0 },
                speed: 40,
                tint: 0xffd700,
                blendMode: 'ADD',
                frequency: 50
            });
            data = { effect: emitter };
            this.burnedEnemies.set(enemy, data);
        }
        data.endTime = this.time.now + duration;
    }

    tankShoot() {
        if (this.isPaused || this.isGameOver) return;
        const towers = this.watchtowers.getChildren();
        towers.forEach(tower => {
            if (tower.active && this.time.now > tower.nextShot) this.towerFire(tower, this.time.now);
        });
        const tanks = [...this.tanks.getChildren(), ...this.t95Tanks.getChildren()];
        tanks.forEach(tank => {
            if (tank.active) {
                const isT95 = tank instanceof T95Tank;
                const config = this.enemyStats[isT95 ? 't95' : 'tank'];
                const weaponConfig = WeaponConfig[isT95 ? 't95Bullet' : 'tankBullet'];
                const dist = Phaser.Math.Distance.Between(tank.x, tank.y, this.player.x, this.player.y);
                if (dist <= config.range) {
                    tank.shoot(weaponConfig.speed);
                }
            }
        });
        const infantry = this.infantry.getChildren();
        infantry.forEach(inf => {
            if (inf.active) inf.update(this.time.now, this.game.loop.delta);
        });
    }
}

