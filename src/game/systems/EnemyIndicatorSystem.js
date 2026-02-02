import Phaser from 'phaser';

export class EnemyIndicatorSystem {
    constructor(scene) {
        this.scene = scene;
        this.indicators = [];
        this.maxIndicators = 3;
    }

    create() {
        this.indicators = [];
        for (let i = 0; i < this.maxIndicators; i++) {
            // Create arrow usage the texture generated in MainScene
            const arrow = this.scene.add.image(0, 0, 'arrowIndicatorTexture' + this.scene.textureSuffix)
                .setDepth(900) // Below main HUD text (1000+) but above game world
                .setScrollFactor(0)
                .setVisible(false)
                .setOrigin(0.5); // Center origin for correct rotation
            this.indicators.push(arrow);
        }
    }

    update() {
        const { main } = this.scene.cameras;
        const player = this.scene.player;

        // Safety check
        if (!player || !player.active || !this.scene.sys.isActive()) {
            this.hideAll();
            return;
        }

        // Determine active threats based on LevelConfig
        const levelConfig = this.scene.levelStats; // Using scene reference to current level stats

        // Define potential target groups mapping
        // key: property in LevelConfig, group: scene group instance
        const potentialTargets = [
            { key: 'targetTanks', group: this.scene.tanks },
            { key: 'targetTowers', group: this.scene.watchtowers },
            { key: 'targetHangars', group: this.scene.hangars }, // Hangar also spawns drones
            { key: 'targetInfantry', group: this.scene.infantry },
            // Drones are always potential threats if Hangars exist or just generally?
            // User requested system based on file config for targets.
            // Assuming Drones are relevant if Hangars are relevant OR if we want to track them explicitly.
            // For now, let's treat Drones as threats if Hangars are targets, or hardcode them as 'always valid targets' 
            // but let's stick to the 'objects to destroy to pass level' rule.
            // Drones are usually infinite spawns from Hangars so they might not be 'objectives'.
            // However, the suppression logic likely needs to know about immediate threats to player which includes Drones...
            // But user said: "system will base on the level config file to know which target to point to"
            // So we strictly follow LevelConfig targets for INDICATORS.
            // For SUPPRESSION (safety), we probably still want to check immediate danger from anything.
            // But let's align with the user request: "custom setup in enemy config".
            // Since Drones are not in LevelConfig targets usually as "targetDrones", we might omit them from indicators?
            // Let's stick to the explicit targets in LevelConfig for indicators.
        ];

        // Filter groups that are required for this level
        const activeTargetGroups = potentialTargets
            .filter(t => levelConfig[t.key] > 0)
            .map(t => t.group);

        // Also add logic for Drones if they are considered targets? 
        // Current LevelConfig doesn't have targetDrones. 
        // If user wants to "customize", they might add 'targetDrones'. 
        // For now, let's just stick to the main 3. If User adds Drones to config later, we can add here.
        // Actually, let's keep Drones in suppression loop for safety, but maybe NOT in indicators if not a target.

        // Wait, the prompt said: "change mechanism... system based on level config... to know which target to point to"
        // So ONLY point to things in LevelConfig.

        // Check for immediate threats (Suppression)
        // We should probably suppress if *any* relevant target is near.
        let hasNearbyThreat = false;
        const suppressionRadius = 500;

        const checkForThreats = (group) => {
            if (hasNearbyThreat || !group) return;
            group.getChildren().some(child => {
                if (child.active) {
                    const dist = Phaser.Math.Distance.Between(player.x, player.y, child.x, child.y);
                    if (dist < suppressionRadius) {
                        hasNearbyThreat = true;
                        return true;
                    }
                }
                return false;
            });
        };

        // We check suppression against the SAME groups we are targeting. 
        // If a tank is a target, and it's near, we suppress. 
        // If a drone is attacking but not a target... maybe we shouldn't suppress indicators for targets?
        // But user said "only appear if radius 500px has NO targets in list".
        activeTargetGroups.forEach(group => checkForThreats(group));

        // Additionally, always check for nearby drones for suppression, regardless of whether they are 'targets'
        // This is a safety measure to ensure indicators don't distract from immediate threats.
        checkForThreats(this.scene.drones);

        if (hasNearbyThreat) {
            this.hideAll();
            return;
        }

        // Collect all active targets (Tanks, Towers, Hangars, Drones)
        const targets = [];

        const checkGroup = (group) => {
            if (!group) return;
            // Use getChildren() for a safe snapshot of the group's entities
            const children = group.getChildren();
            children.forEach(child => {
                if (child.active) {
                    // Check if off-screen (not contained in camera world view)
                    // We give a small padding to 'off-screen' so arrows don't pop until they are truly out
                    const isVisible = main.worldView.contains(child.x, child.y);

                    if (!isVisible) {
                        const dist = Phaser.Math.Distance.Between(player.x, player.y, child.x, child.y);
                        targets.push({ target: child, dist });
                    }
                }
            });
        };

        activeTargetGroups.forEach(group => checkGroup(group));

        // Sort by distance (nearest first)
        targets.sort((a, b) => a.dist - b.dist);

        // Take top 5
        const topTargets = targets.slice(0, this.maxIndicators);

        // Update indicators
        for (let i = 0; i < this.maxIndicators; i++) {
            const indicator = this.indicators[i];
            if (!indicator) continue;

            if (i < topTargets.length) {
                const { target, dist } = topTargets[i];
                this.updateIndicator(indicator, target, dist, main);
            } else {
                indicator.setVisible(false);
            }
        }
    }

    updateIndicator(indicator, target, dist, camera) {
        indicator.setVisible(true);

        // Center of the screen (in camera relative coords because scrollFactor is 0)
        const cx = camera.width / 2;
        const cy = camera.height / 2;

        // Vector from camera center to target
        // Camera scroll must be accounted for to get world center
        const camWorldCx = camera.scrollX + cx;
        const camWorldCy = camera.scrollY + cy;

        const dx = target.x - camWorldCx;
        const dy = target.y - camWorldCy;

        const angle = Math.atan2(dy, dx);

        // Screen dimensions (with padding for the arrow)
        const padding = 50; // Increased padding to avoid edge clipping
        const w = camera.width - padding * 2;
        const h = camera.height - padding * 2;

        // Calculate intersection with screen bounds
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        let t = 0;

        // Calculate the scaling factor `t` to push the point to the box boundary
        // We want to find smallest t such that point enters box. 
        // Actually we want the point ON the box.
        // x = t * dx, y = t * dy.
        // We want abs(x) = w/2 OR abs(y) = h/2.
        // t = (w/2) / abs(dx) or t = (h/2) / abs(dy).
        // We take the minimum t to hit the first wall.

        if (absDx === 0 && absDy === 0) {
            t = 0; // Should not happen for off-screen
        } else if (absDx === 0) {
            t = (h / 2) / absDy;
        } else if (absDy === 0) {
            t = (w / 2) / absDx;
        } else {
            t = Math.min((w / 2) / absDx, (h / 2) / absDy);
        }

        const tx = dx * t;
        const ty = dy * t;

        // Set position (relative to screen center)
        indicator.x = cx + tx;
        indicator.y = cy + ty;

        // Rotation: point towards target
        indicator.setRotation(angle);

        // Visual Effects
        // Alpha fades as distance increases
        const maxDist = 3000;
        const minDist = 600;
        let alpha = 1 - Phaser.Math.Clamp((dist - minDist) / (maxDist - minDist), 0, 0.5);
        indicator.setAlpha(alpha);

        // Blink if very close (< 800) to signal nearby threat
        if (dist < 800) {
            const time = this.scene.time.now;
            if (Math.floor(time / 150) % 2 === 0) {
                indicator.setTint(0xFFFF00); // Flash yellow
                indicator.setScale(1.2);
            } else {
                indicator.clearTint();
                indicator.setScale(1.0);
            }
        } else {
            indicator.clearTint();
            indicator.setScale(1.0);
        }
    }

    hideAll() {
        if (!this.indicators) return;
        this.indicators.forEach(i => {
            if (i) i.setVisible(false);
        });
    }
}
