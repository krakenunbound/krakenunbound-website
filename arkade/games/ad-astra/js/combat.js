// Ad Astra - Combat System
// combat.js - Turn-based combat mechanics

import { Utils, CONSTANTS } from './utils.js';

export class CombatSystem {
    constructor() {
        this.combatActive = false;
        this.enemy = null;
        this.turnCount = 0;
        this.combatLog = [];
    }

    // Initialize combat
    startCombat(player, enemy) {
        this.combatActive = true;
        this.enemy = Utils.clone(enemy);
        this.turnCount = 0;
        this.combatLog = [];
        this.addLog(`Combat initiated with ${enemy.name}!`, 'warning');
        return true;
    }

    // End combat
    endCombat() {
        this.combatActive = false;
        const enemy = this.enemy;
        this.enemy = null;
        this.turnCount = 0;
        return enemy;
    }

    // Player attacks enemy
    playerAttack(playerShip) {
        if (!this.combatActive || !this.enemy) {
            return { success: false, error: 'No combat active' };
        }

        const damage = this.calculateDamage(playerShip.weapons);
        const actualDamage = this.applyDamage(this.enemy, damage);

        this.addLog(`You attack for ${actualDamage} damage!`, 'info');
        this.turnCount++;

        // Check if enemy destroyed
        if (this.enemy.hull <= 0) {
            return {
                success: true,
                damage: actualDamage,
                enemyDestroyed: true,
                victory: true
            };
        }

        // Enemy counterattack
        const counterResult = this.enemyAttack(playerShip);

        return {
            success: true,
            damage: actualDamage,
            enemyDestroyed: false,
            counterDamage: counterResult.damage,
            playerDestroyed: counterResult.playerDestroyed
        };
    }

    // Enemy attacks player
    enemyAttack(playerShip) {
        if (!this.enemy) return { success: false };

        const damage = this.calculateDamage(this.enemy.weapons);
        const actualDamage = this.applyDamage(playerShip, damage);

        this.addLog(`${this.enemy.name} attacks for ${actualDamage} damage!`, 'error');

        return {
            success: true,
            damage: actualDamage,
            playerDestroyed: playerShip.hull <= 0
        };
    }

    // Calculate damage with variance
    calculateDamage(weaponPower) {
        const baseDamage = weaponPower * (CONSTANTS.COMBAT.BASE_DAMAGE / 100);
        const variance = CONSTANTS.COMBAT.DAMAGE_VARIANCE;
        return Math.round(Utils.random.float(
            baseDamage - variance,
            baseDamage + variance
        ));
    }

    // Apply damage to target (shields first, then hull)
    applyDamage(target, damage) {
        let actualDamage = 0;

        // Shields absorb first
        if (target.shields > 0) {
            const shieldDamage = Math.min(damage, target.shields);
            target.shields -= shieldDamage;
            damage -= shieldDamage;
            actualDamage += shieldDamage;
        }

        // Remaining goes to hull
        if (damage > 0) {
            const hullDamage = Math.min(damage, target.hull);
            target.hull -= hullDamage;
            actualDamage += hullDamage;
        }

        return actualDamage;
    }

    // Player attempts to flee
    attemptFlee(playerShip) {
        if (!this.combatActive || !this.enemy) {
            return { success: false, error: 'No combat active' };
        }

        const fleeChance = CONSTANTS.COMBAT.FLEE_CHANCE;
        const speedBonus = (playerShip.speed || 1.0) - 1.0; // Speed affects flee chance
        const actualChance = Math.min(0.9, fleeChance + speedBonus * 0.2);

        if (Math.random() < actualChance) {
            this.addLog('You successfully escape!', 'success');
            this.endCombat();
            return {
                success: true,
                escaped: true
            };
        } else {
            this.addLog('Failed to escape!', 'warning');
            this.turnCount++;

            // Enemy gets free attack
            const counterResult = this.enemyAttack(playerShip);

            return {
                success: true,
                escaped: false,
                counterDamage: counterResult.damage,
                playerDestroyed: counterResult.playerDestroyed
            };
        }
    }

    // Player uses special ability (if implemented)
    useAbility(playerShip, abilityType) {
        if (!this.combatActive || !this.enemy) {
            return { success: false, error: 'No combat active' };
        }

        // Future: implement special abilities like repair, shield boost, etc.
        return { success: false, error: 'Abilities not yet implemented' };
    }

    // Calculate rewards for victory
    calculateRewards(enemy, playerShip) {
        const credits = enemy.credits || Utils.random.int(100, 500);

        // Chance to get cargo
        const cargo = {};
        if (Math.random() < 0.4) {
            const commodity = Utils.random.choice(CONSTANTS.COMMODITIES);
            const amount = Utils.random.int(5, 20);
            cargo[commodity] = amount;
        }

        return {
            credits: credits,
            cargo: cargo
        };
    }

    // Get combat status
    getStatus(playerShip) {
        if (!this.combatActive || !this.enemy) return null;

        return {
            active: this.combatActive,
            turnCount: this.turnCount,
            player: {
                type: playerShip.type,
                hull: playerShip.hull,
                hullMax: playerShip.hullMax,
                hullPercent: Math.round((playerShip.hull / playerShip.hullMax) * 100),
                shields: playerShip.shields,
                shieldsMax: playerShip.shieldsMax,
                shieldsPercent: Math.round((playerShip.shields / playerShip.shieldsMax) * 100),
                weapons: playerShip.weapons
            },
            enemy: {
                name: this.enemy.name,
                type: this.enemy.type,
                hull: this.enemy.hull,
                hullMax: this.enemy.hullMax,
                hullPercent: Math.round((this.enemy.hull / this.enemy.hullMax) * 100),
                shields: this.enemy.shields,
                shieldsMax: this.enemy.shieldsMax,
                shieldsPercent: Math.round((this.enemy.shields / this.enemy.shieldsMax) * 100),
                weapons: this.enemy.weapons
            },
            log: this.combatLog
        };
    }

    // Add message to combat log
    addLog(message, type = 'info') {
        this.combatLog.push({
            message: message,
            type: type,
            timestamp: Date.now()
        });

        // Keep only last 20 messages
        if (this.combatLog.length > 20) {
            this.combatLog.shift();
        }
    }

    // Get combat log
    getLog() {
        return this.combatLog;
    }

    // Clear combat log
    clearLog() {
        this.combatLog = [];
    }

    // Enemy AI decision
    enemyDecision() {
        // Simple AI: always attacks for now
        // Future: could implement flee at low health, use abilities, etc.
        return 'attack';
    }
}

export default CombatSystem;
