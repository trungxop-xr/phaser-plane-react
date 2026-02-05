import Phaser from 'phaser';
import { WeaponConfig } from '../configs/weapon.config';
import { EventBus } from '../../EventBus';

export class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.items = this.scene.physics.add.group();

        // Setup collision with player
        this.scene.physics.add.overlap(this.scene.player, this.items, (player, item) => {
            this.handleCollection(player, item);
        });

        // Item Configurations
        this.configs = [
            {
                id: 'power-up',
                spawnChance: 1.0, // Currently the only item, so 100% relative chance if we pick strictly
                // In a multi-item system, we might normalize chances or use weights.
                // For now, if we call spawnItem, we can pick based on this.
                texturePrefix: 'starTexture',
                compatibleWeapons: ['machineGun', 'homingMissile', 'drone', 'bombs'], // Example
                effect: (scene, player) => {
                    let message = '';
                    const duration = 10000; // 10 seconds

                    // Helper to manage temporary buffs
                    const applyBuff = (key, configObj, param, multiplier, msg) => {
                        // Check if already boosted
                        if (this.activeBuffs && this.activeBuffs[key]) {
                            // Extend duration
                            this.activeBuffs[key].timer.reset({
                                delay: duration,
                                callback: this.activeBuffs[key].callback
                            });
                            return msg + ' (EXTENDED)';
                        }

                        // Store original
                        const originalValue = configObj[param];

                        // Create Persistent Arrow
                        let indicator = null;
                        if (!this.activeBuffs || !this.activeBuffs[key]) {
                            indicator = scene.add.text(player.x, player.y - 40, '⬆', { fontSize: '32px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5).setDepth(100);
                        } else if (this.activeBuffs[key].indicator) {
                            indicator = this.activeBuffs[key].indicator;
                        }

                        // Apply Buff
                        configObj[param] = Math.max(50, originalValue / multiplier);
                        console.log(`[ItemManager] Buff Applied: ${key}. Old: ${originalValue}, New: ${configObj[param]}`);

                        // Setup Revert
                        const callback = () => {
                            configObj[param] = originalValue;
                            console.log(`[ItemManager] Buff Reverted: ${key}. Restored: ${configObj[param]}`);
                            if (this.activeBuffs[key] && this.activeBuffs[key].indicator) {
                                this.activeBuffs[key].indicator.destroy();
                            }
                            delete this.activeBuffs[key];
                            scene.showFloatingText(player.x, player.y - 50, key + ' ENDED', 0xffffff);
                        };

                        const timer = scene.time.delayedCall(duration, callback);

                        // Track
                        if (!this.activeBuffs) this.activeBuffs = {};
                        this.activeBuffs[key] = { timer, callback, originalValue, indicator };

                        return msg;
                    };


                    // Apply to BOTH Machine Gun and Bombs

                    // 1. Machine Gun
                    applyBuff('MG SPEED', WeaponConfig.machineGun, 'fireRate', 2, '');
                    if (scene.ammo.machineGun > -1) {
                        scene.ammo.machineGun = Math.min(scene.ammo.machineGun + 50, WeaponConfig.machineGun.maxAmmo || 1000);
                    }

                    // 2. Bombs
                    applyBuff('BOMB SPEED', WeaponConfig.bomb, 'fireRate', 2, '');
                    if (scene.ammo.bomb > -1) {
                        scene.ammo.bomb = Math.min(scene.ammo.bomb + 5, WeaponConfig.bomb.maxAmmo || 100);
                    }

                    message = 'WEAPONS BOOSTED!';

                    // Fallback if message empty
                    if (!message) message = 'POWER UP!';

                    // Display Message in Green
                    scene.showFloatingText(player.x, player.y - 80, message, '#00ff00');
                    scene.addScore(200);

                    // Simple "Level Up" style boost for all weapons slightly?
                    // Implementation details can be refined.
                    // For exact parity, let's stick to a generic "Upgrade Random Weapon" approach
                    // passing the Scene facilitates this.
                }
            }
        ];
    }

    update() {
        // cleanup items?
        this.items.children.each(item => {
            if (item.active && (item.x < -100 || item.x > this.scene.worldWidth + 100)) {
                item.destroy();
            }
        });

        // Update Indicators
        if (this.activeBuffs) {
            Object.values(this.activeBuffs).forEach(buff => {
                if (buff.indicator && this.scene.player && this.scene.player.active) {
                    buff.indicator.setPosition(this.scene.player.x, this.scene.player.y - 40);
                } else if (buff.indicator) {
                    buff.indicator.destroy(); // Safety cleanup if player dies
                }
            });
        }
    }

    spawnItem() {
        // 1. Pick Item Type
        // Simple random pick for now
        const config = Phaser.Utils.Array.GetRandom(this.configs);

        // 2. Calculate Position (Terrain Based)
        const x = Phaser.Math.Between(50, this.scene.worldWidth - 50);
        const groundY = this.scene.getTerrainHeight(x);

        // Ensure valid groundY
        if (typeof groundY !== 'number') return;

        const y = groundY - Phaser.Math.Between(100, 400);

        // 3. Create Sprite
        const texture = config.texturePrefix + this.scene.textureSuffix;
        const item = this.items.create(x, y, texture);
        item.body.allowGravity = false;

        // 4. Attach Config
        item.config = config;

        // 5. Visual Effects (Tween)
        this.scene.tweens.add({ targets: item, angle: 360, duration: 3000, repeat: -1, ease: 'Linear' });
        this.scene.tweens.add({ targets: item, scaleX: 1.3, scaleY: 1.3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // 6. Auto-destroy after time
        this.scene.time.delayedCall(7000, () => {
            if (item.active) this.scene.tweens.add({ targets: item, alpha: 0, duration: 100, yoyo: true, repeat: -1 });
        });
        this.scene.time.delayedCall(10000, () => {
            if (item.active) item.destroy();
        });
    }

    handleCollection(player, item) {
        if (!item.active) return;

        // Execute Effect
        if (item.config && item.config.effect) {
            try {
                item.config.effect(this.scene, player);
            } catch (e) {
                console.error('Error executing item effect:', e);
            }
        } else {
            console.warn('Item missing config or effect function');
        }

        // Visuals
        // this.scene.playPowerupSound(); // If exists
        // Or generic sound
        if (this.scene.sound.get('powerup')) {
            this.scene.sound.play('powerup');
        } else {
            // Fallback or use MainScene helper
            // this.scene.playBeepSound(); 
        }

        // Destroy
        item.destroy();
    }

    cleanUp() {
        if (this.activeBuffs) {
            Object.values(this.activeBuffs).forEach(buff => {
                // Cancel timer
                if (buff.timer) buff.timer.remove();
                // Execute revert callback immediately
                if (buff.callback) buff.callback();
                // Destroy Indicator
                if (buff.indicator) buff.indicator.destroy();
            });
            this.activeBuffs = {};
        }
    }
}
