import Phaser from 'phaser';
import { PlayerConfig } from '../configs/player.config';
import { EventBus } from '../../EventBus';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.allowGravity = false;
        this.setDepth(1);
        this.setScale(2.0);

        this.hp = PlayerConfig.hp;
        this.currentSpeed = PlayerConfig.speed;

        // Autopilot Properties
        this.isAutopilot = false;
        this.autopilotHoldTime = 0;
        this.isTurning = false;
        this.turnPhase = 0;
        this.turnTimer = 0;

        // Flamethrower state
        this.isFiringFlamethrower = false;
        this.flamethrowerFuel = 100; // Default fuel 100

        // Notify initial HP
        this.emitHpUpdate();

        // Auto-Targeting Properties
        this.gunRotation = 0; // Relative angle to plane
        this.lockedTarget = null;
    }

    update(cursors, delta, obstacles) {
        if (!this.active) return;

        // Auto-Targeting Update
        this.updateGunTracking(delta);

        // 1. Activation Logic (Hold '0' for 2s)
        if (cursors.key0 && cursors.key0.isDown) {
            this.autopilotHoldTime += delta;

            // Countdown Logic
            const timeLeft = 2000 - this.autopilotHoldTime;
            if (timeLeft > 0) {
                // Show countdown only if not locked
                if (!this.autopilotToggleLock) {
                    this.scene.hud.showAutopilotCountdown(timeLeft);
                }
            }

            if (this.autopilotHoldTime >= 2000 && !this.autopilotToggleLock) {
                this.toggleAutopilot();
                this.autopilotToggleLock = true; // Prevent rapid toggling
            }
        } else {
            this.autopilotHoldTime = 0;
            this.autopilotToggleLock = false;
        }

        // Flamethrower firing check (Key 5)
        this.isFiringFlamethrower = false;
        if (cursors.key5 && cursors.key5.isDown) {
            const unlocked = this.scene.levelStats?.unlockedWeapons || [];
            if (!unlocked.includes('flamethrower')) {
                if (Phaser.Input.Keyboard.JustDown(cursors.key5)) {
                    this.scene.showWeaponMessage('LOCKED');
                }
            } else if (this.flamethrowerFuel > 0) {
                this.isFiringFlamethrower = true;
                // Consume fuel: 1 unit per second (delta is in ms)
                this.flamethrowerFuel = Math.max(0, this.flamethrowerFuel - (1 * delta / 1000));
                // Trigger HUD update if needed via scene
                this.scene.events.emit('update-ammo', { type: 'flamethrower', count: this.flamethrowerFuel });
            }
        }

        if (this.isAutopilot) {
            this.updateAutopilot(cursors, delta, obstacles);
        } else {
            this.updateManual(cursors, delta);
        }

        this.scene.physics.velocityFromRotation(this.rotation, this.currentSpeed, this.body.velocity);
    }

    toggleAutopilot() {
        this.isAutopilot = !this.isAutopilot;
        this.isTurning = false;

        // Notify HUD
        this.scene.hud.setAutopilotStatus(this.isAutopilot);
        EventBus.emit('update-autopilot', this.isAutopilot);

        // Visual FX on Plane
        if (this.isAutopilot) {
            // Shake Plane
            this.scene.tweens.add({
                targets: this,
                x: '+=5',
                duration: 50,
                yoyo: true,
                repeat: 5
            });
            // Flash
            this.setTint(0x00ff00);
            this.scene.time.delayedCall(300, () => this.clearTint());
        }
    }

    updateManual(cursors, delta) {
        // Rotation
        // Rotation - Follow Mouse (Screen Space)
        const activePointer = this.scene.input.activePointer;
        const cam = this.scene.cameras.main;

        // Player position in Screen Space
        const playerScreenX = (this.x - cam.scrollX) * cam.zoom;
        const playerScreenY = (this.y - cam.scrollY) * cam.zoom;

        // Mouse is already in Screen Space (x, y)
        // Note: activePointer.x/y are screen coordinates. worldX/worldY are world.

        const dist = Phaser.Math.Distance.Between(playerScreenX, playerScreenY, activePointer.x, activePointer.y);

        if (dist > 20) {
            const targetAngle = Phaser.Math.Angle.Between(playerScreenX, playerScreenY, activePointer.x, activePointer.y);
            // Smoothly rotate towards target
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetAngle, 0.05);
        }

        this.setAngularVelocity(0);

        // Speed Control
        if (cursors.up.isDown) {
            this.currentSpeed = Math.min(PlayerConfig.maxSpeed, this.currentSpeed + PlayerConfig.accelRate * delta);
        } else if (cursors.down.isDown) {
            this.currentSpeed = Math.max(PlayerConfig.minSpeed, this.currentSpeed - PlayerConfig.accelRate * delta);
        } else {
            // Gradually return to base speed
            if (this.currentSpeed > PlayerConfig.speed) {
                this.currentSpeed = Math.max(PlayerConfig.speed, this.currentSpeed - PlayerConfig.accelRate * delta);
            } else if (this.currentSpeed < PlayerConfig.speed) {
                this.currentSpeed = Math.min(PlayerConfig.speed, this.currentSpeed + PlayerConfig.accelRate * delta);
            }
        }
    }

    updateAutopilot(cursors, delta, obstacles) {
        // 4. Priority: No Speed Control
        // Maintain base speed
        if (this.currentSpeed > PlayerConfig.speed) {
            this.currentSpeed -= PlayerConfig.accelRate * delta;
        } else if (this.currentSpeed < PlayerConfig.speed) {
            this.currentSpeed += PlayerConfig.accelRate * delta;
        }

        // 3. Auto-Turn Logic
        if (this.isTurning) {
            this.performUTurn(delta);
            return;
        }

        // Check for manual turn input or world bounds
        const isFlyingRight = Math.abs(this.rotation) < Math.PI / 2;
        const outOfBoundsLeft = this.x < 250 && !isFlyingRight;
        const outOfBoundsRight = this.x > this.scene.worldWidth - 250 && isFlyingRight;

        // Manual input overrides (Reverse direction)
        const manualTurn = (cursors.left.isDown && isFlyingRight) || (cursors.right.isDown && !isFlyingRight);

        if (outOfBoundsLeft || outOfBoundsRight || manualTurn) {
            this.startUTurn();
            return;
        }

        // 2. Terrain Following & Obstacle Avoidance
        const terrainY = this.scene.getTerrainHeight(this.x);
        let targetY = terrainY - 40; // Default 20px clearance (origin is center, verify offsets)

        // Obstacle Avoidance
        const detectionRange = 150;
        let obstacleFound = false;

        if (obstacles) {
            obstacles.forEach(obs => {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, obs.x, obs.y);
                if (dist < detectionRange) {
                    // Check if obstacle is in front
                    const angleToObs = Phaser.Math.Angle.Between(this.x, this.y, obs.x, obs.y);
                    const diff = Phaser.Math.Angle.Wrap(angleToObs - this.rotation);
                    if (Math.abs(diff) < 1.0) { // In front arc
                        obstacleFound = true;
                    }
                }
            });
        }

        if (obstacleFound) {
            targetY -= 150; // Fly higher
        }

        // Smooth Altitude Adjustment
        const currentY = this.y;
        // Determine aspect based on direction
        const isFacingRight = Math.abs(this.rotation) < Math.PI / 2;

        if (currentY > targetY) {
            // Climb
            // If Right: -0.5 rad (Up-Right)
            // If Left: -PI + 0.5 = -2.64 rad (Up-Left) ... wait, -PI is West. -PI + 0.5 is West-Down? 
            // Angle grows clockwise. 0=Right, PI/2=Down, PI=Left, -PI/2=Up.
            // Left is PI or -PI.
            // To pitch UP from Left: target is -PI + 0.5? No.
            // -PI is Left. -PI + 0.5 (approx -2.6) is South-West? No. 0 is East. PI is West.
            // -PI/2 is North.
            // From Right (0): -0.5 is North-East. Correct.
            // From Left (PI): We want North-West. That is -PI + 0.5? No.
            // West is +/- 3.14. North is -1.57.
            // We want angle between -3.14 and -1.57.
            // -3.14 + 0.5 = -2.64. Yes this is North-West.
            // Correct logic:
            const targetPitch = isFacingRight ? -0.5 : (-Math.PI + 0.5);
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetPitch, 0.05);

        } else if (currentY < targetY - 10) {
            // Descend
            // Right: 0.2 (Down-Right)
            // Left: PI - 0.2? (Down-Left)
            // PI is West. PI - 0.2 = ~2.9. This is South-West. Correct.
            const targetPitch = isFacingRight ? 0.2 : (Math.PI - 0.2);
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetPitch, 0.05);
        } else {
            // Level out
            let targetRot = isFacingRight ? 0 : Math.PI;
            // Ensure we rotate to the 'closest' PI for Left to avoid flipping over
            if (!isFacingRight) {
                // If current is negative (e.g. -3.1), target should be -PI
                if (this.rotation < 0) targetRot = -Math.PI;
            }
            this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRot, 0.05);
        }
    }

    startUTurn() {
        if (this.isTurning) return;
        this.isTurning = true;
        this.turnPhase = 0;

        const isFacingRight = Math.abs(this.rotation) < Math.PI / 2;
        this.targetTurnRotation = isFacingRight ? -Math.PI : 0;

        // Cancel existing tweens
        this.scene.tweens.killTweensOf(this);

        // Define Tween Chain (Phaser 3.60+ compatible)
        this.scene.tweens.chain({
            targets: this,
            tweens: [
                {
                    // 1. Pitch Up to Vertical (-90)
                    rotation: {
                        getEnd: () => -Math.PI / 2
                    },
                    duration: 600,
                    ease: 'Power2'
                },
                {
                    // 2. Turn to Target
                    rotation: {
                        getEnd: () => this.targetTurnRotation
                    },
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => {
                        this.isTurning = false;
                        this.rotation = this.targetTurnRotation;
                        // Update velocity immediately
                        this.scene.physics.velocityFromRotation(this.rotation, this.currentSpeed, this.body.velocity);
                    }
                }
            ]
        });
    }

    performUTurn(delta) {
        // Handled by Tweens now, we just enforce velocity update
        this.scene.physics.velocityFromRotation(this.rotation, this.currentSpeed, this.body.velocity);
    }

    damage(amount) {
        this.hp -= amount;
        this.setTint(0xff0000);
        this.scene.time.delayedCall(200, () => {
            if (this.active) this.clearTint();
        });

        this.emitHpUpdate();

        if (this.hp <= 0) {
            this.emitHpUpdate(); // Final 0
            return true; // Is dead
        }
        return false;
    }

    heal() {
        this.hp = PlayerConfig.hp;
        this.emitHpUpdate();
    }

    emitHpUpdate() {
        EventBus.emit('update-hp', {
            hp: Math.max(0, this.hp),
            maxHp: PlayerConfig.hp
        });
    }

    updateGunTracking(delta) {
        const bestTarget = this.findBestTarget();
        let targetAngle = 0; // Default: 0 relative to plane (fire straight)

        if (bestTarget) {
            // Calculate absolute angle to target
            const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, bestTarget.x, bestTarget.y);

            // Calculate relative angle (diff between target angle and plane rotation)
            let diff = Phaser.Math.Angle.Wrap(angleToTarget - this.rotation);

            // Clamp to +/- 20 degrees (approx 0.35 radians)
            const maxAngle = Phaser.Math.DegToRad(20);
            if (Math.abs(diff) <= maxAngle) {
                targetAngle = diff;
                this.lockedTarget = bestTarget;
            } else {
                // Determine if we should clamp or just lose target? 
                // Spec says: "Priority: Target within allow angle".
                // If the BEST target found (filtered by angle) is returned, it IS within angle.
                // findBestTarget filters by angle, so we just trust diff is valid-ish,
                // but double check or just clamp to be safe visual-wise.
                // Actually findBestTarget handles the cone check.
                targetAngle = Phaser.Math.Clamp(diff, -maxAngle, maxAngle);
            }
        } else {
            this.lockedTarget = null;
        }

        // Smoothly rotate gun towards targetAngle
        // Lerp factor
        const lerpSpeed = 0.1; // Adjust for smoothness
        this.gunRotation = Phaser.Math.Linear(this.gunRotation, targetAngle, lerpSpeed);
    }

    findBestTarget() {
        const range = 500;
        const maxAngle = Phaser.Math.DegToRad(20); // 20 degrees
        const enemies = [];

        // Collect potential enemies from scene groups
        // We assume MainScene has these groups exposed
        const groups = [
            this.scene.tanks,
            this.scene.t95Tanks,
            this.scene.watchtowers,
            this.scene.drones,
            this.scene.hangars,
            this.scene.flakCannons,
            this.scene.infantry
        ];

        groups.forEach(group => {
            if (group) {
                group.children.each(e => {
                    if (e.active) enemies.push(e);
                });
            }
        });

        // Filter and Score
        let bestCandidate = null;
        let bestScore = -Infinity; // Higher is better

        // Score = -Distance (closer is better) 
        // Tie-breaker: -HP (lower HP is better) -> we can use a weighted score
        // Let's optimize:
        // Priority 1: Angle (Must be within cone)
        // Priority 2: Distance (Closest)
        // Priority 3: HP (Lowest)

        // Since we want Closest first, we can just find all valid candidates then sort.
        const validCandidates = enemies.filter(e => {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (dist > range) return false;

            const angleToEnemy = Phaser.Math.Angle.Between(this.x, this.y, e.x, e.y);
            const diff = Phaser.Math.Angle.Wrap(angleToEnemy - this.rotation);

            return Math.abs(diff) <= maxAngle;
        });

        if (validCandidates.length === 0) return null;

        // Sort: primary Distance, secondary HP
        validCandidates.sort((a, b) => {
            const distA = Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y);
            const distB = Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y);

            if (Math.abs(distA - distB) < 10) { // If distance roughly equal (within 10px)
                // HP check - Assuming 'hp' property exists
                const hpA = a.hp || 0;
                const hpB = b.hp || 0;
                return hpA - hpB; // Lower HP first
            }
            return distA - distB; // Closer distance first
        });

        return validCandidates[0];
    }
}
