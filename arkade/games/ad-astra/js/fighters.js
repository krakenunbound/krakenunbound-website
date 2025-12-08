// Ad Astra - Fighter Deployment System
// fighters.js - Fighter management, deployment, mines, and sector defense

import { Utils } from './utils.js';

export class FighterSystem {
    constructor() {
        this.FIGHTER_COST = 50; // Credits per fighter
        this.MINE_COST = 100; // Credits per mine
        this.MAX_FIGHTERS_PER_SECTOR = 50;
        this.MAX_MINES_PER_SECTOR = 20;
        this.FIGHTER_ATTACK_POWER = 5;
        this.MINE_DAMAGE = 25;
    }

    // Load fighter deployments from storage
    load() {
        return Utils.storage.get('fighter_deployments') || {};
    }

    // Save fighter deployments to storage
    save(deployments) {
        Utils.storage.set('fighter_deployments', deployments);
    }

    // Deploy fighters to a sector
    deployFighters(sectorId, owner, quantity, credits) {
        const cost = quantity * this.FIGHTER_COST;

        if (credits < cost) {
            return {
                success: false,
                error: `Not enough credits! Need ${Utils.format.credits(cost)}`
            };
        }

        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (!deployments[sectorKey]) {
            deployments[sectorKey] = {
                fighters: {},
                mines: {}
            };
        }

        // Check sector fighter limit
        const currentTotal = Object.values(deployments[sectorKey].fighters)
            .reduce((sum, f) => sum + f.quantity, 0);

        if (currentTotal + quantity > this.MAX_FIGHTERS_PER_SECTOR) {
            return {
                success: false,
                error: `Sector can only hold ${this.MAX_FIGHTERS_PER_SECTOR} fighters (current: ${currentTotal})`
            };
        }

        // Add fighters to deployment
        if (!deployments[sectorKey].fighters[owner]) {
            deployments[sectorKey].fighters[owner] = {
                quantity: 0,
                deployed: Date.now()
            };
        }

        deployments[sectorKey].fighters[owner].quantity += quantity;
        deployments[sectorKey].fighters[owner].lastUpdate = Date.now();

        this.save(deployments);

        return {
            success: true,
            deployed: quantity,
            cost: cost,
            total: deployments[sectorKey].fighters[owner].quantity
        };
    }

    // Deploy mines to a sector
    deployMines(sectorId, owner, quantity, credits) {
        const cost = quantity * this.MINE_COST;

        if (credits < cost) {
            return {
                success: false,
                error: `Not enough credits! Need ${Utils.format.credits(cost)}`
            };
        }

        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (!deployments[sectorKey]) {
            deployments[sectorKey] = {
                fighters: {},
                mines: {}
            };
        }

        // Check sector mine limit
        const currentTotal = Object.values(deployments[sectorKey].mines)
            .reduce((sum, m) => sum + m.quantity, 0);

        if (currentTotal + quantity > this.MAX_MINES_PER_SECTOR) {
            return {
                success: false,
                error: `Sector can only hold ${this.MAX_MINES_PER_SECTOR} mines (current: ${currentTotal})`
            };
        }

        // Add mines to deployment
        if (!deployments[sectorKey].mines[owner]) {
            deployments[sectorKey].mines[owner] = {
                quantity: 0,
                deployed: Date.now()
            };
        }

        deployments[sectorKey].mines[owner].quantity += quantity;
        deployments[sectorKey].mines[owner].lastUpdate = Date.now();

        this.save(deployments);

        return {
            success: true,
            deployed: quantity,
            cost: cost,
            total: deployments[sectorKey].mines[owner].quantity
        };
    }

    // Retrieve fighters from a sector
    retrieveFighters(sectorId, owner, quantity) {
        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (!deployments[sectorKey] || !deployments[sectorKey].fighters[owner]) {
            return {
                success: false,
                error: 'No fighters deployed in this sector'
            };
        }

        const available = deployments[sectorKey].fighters[owner].quantity;

        if (quantity > available) {
            return {
                success: false,
                error: `Only ${available} fighters available to retrieve`
            };
        }

        deployments[sectorKey].fighters[owner].quantity -= quantity;

        // Clean up if no fighters left
        if (deployments[sectorKey].fighters[owner].quantity === 0) {
            delete deployments[sectorKey].fighters[owner];
        }

        this.save(deployments);

        return {
            success: true,
            retrieved: quantity
        };
    }

    // Get sector defenses
    getSectorDefenses(sectorId) {
        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (!deployments[sectorKey]) {
            return {
                fighters: {},
                mines: {},
                totalFighters: 0,
                totalMines: 0,
                isDefended: false
            };
        }

        const totalFighters = Object.values(deployments[sectorKey].fighters)
            .reduce((sum, f) => sum + f.quantity, 0);

        const totalMines = Object.values(deployments[sectorKey].mines)
            .reduce((sum, m) => sum + m.quantity, 0);

        return {
            fighters: deployments[sectorKey].fighters,
            mines: deployments[sectorKey].mines,
            totalFighters: totalFighters,
            totalMines: totalMines,
            isDefended: totalFighters > 0 || totalMines > 0
        };
    }

    // Attack with fighters (player attacking sector defenses)
    attackWithFighters(sectorId, attacker, fighterCount) {
        const defenses = this.getSectorDefenses(sectorId);
        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (!defenses.isDefended) {
            return {
                success: true,
                message: 'No defenses to attack',
                losses: 0
            };
        }

        let attackerLosses = 0;
        const combatLog = [];

        // Attack enemy fighters first
        for (const [owner, data] of Object.entries(defenses.fighters)) {
            if (owner === attacker) continue; // Don't attack own fighters

            const enemyFighters = data.quantity;
            const rounds = Math.min(fighterCount - attackerLosses, enemyFighters);

            // Each round, both sides lose fighters
            const attackerRoundLosses = Math.floor(rounds * 0.3);
            const defenderLosses = Math.floor(rounds * 0.7); // Attackers have advantage

            attackerLosses += attackerRoundLosses;
            deployments[sectorKey].fighters[owner].quantity -= defenderLosses;

            combatLog.push({
                type: 'fighter',
                owner: owner,
                destroyed: defenderLosses,
                attackerLosses: attackerRoundLosses
            });

            // Clean up if no fighters left
            if (deployments[sectorKey].fighters[owner].quantity <= 0) {
                delete deployments[sectorKey].fighters[owner];
            }
        }

        this.save(deployments);

        return {
            success: true,
            attackerLosses: attackerLosses,
            survived: fighterCount - attackerLosses,
            combatLog: combatLog
        };
    }

    // Trigger mines when ship enters sector
    triggerMines(sectorId, playerName, ship) {
        const defenses = this.getSectorDefenses(sectorId);
        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (defenses.totalMines === 0) {
            return {
                triggered: false,
                damage: 0
            };
        }

        let totalDamage = 0;
        let minesTriggered = 0;
        const mineResults = [];

        // Each enemy mine has a 30% chance to hit
        for (const [owner, data] of Object.entries(defenses.mines)) {
            if (owner === playerName) continue; // Don't trigger own mines

            for (let i = 0; i < data.quantity; i++) {
                if (Utils.random.chance(0.3)) {
                    totalDamage += this.MINE_DAMAGE;
                    minesTriggered++;

                    // Mine is destroyed after triggering
                    deployments[sectorKey].mines[owner].quantity--;

                    mineResults.push({
                        owner: owner,
                        damage: this.MINE_DAMAGE
                    });
                }
            }

            // Clean up if no mines left
            if (deployments[sectorKey].mines[owner].quantity <= 0) {
                delete deployments[sectorKey].mines[owner];
            }
        }

        if (minesTriggered > 0) {
            this.save(deployments);
        }

        return {
            triggered: minesTriggered > 0,
            minesTriggered: minesTriggered,
            damage: totalDamage,
            results: mineResults
        };
    }

    // Attack with sector fighters (auto-defense)
    fighterAutoDefense(sectorId, targetShip, playerName) {
        const defenses = this.getSectorDefenses(sectorId);

        if (defenses.totalFighters === 0) {
            return {
                attacked: false,
                damage: 0
            };
        }

        let totalDamage = 0;
        const attacks = [];

        // Enemy fighters attack with 50% accuracy
        for (const [owner, data] of Object.entries(defenses.fighters)) {
            if (owner === playerName) continue; // Don't attack owner

            const fighterDamage = Math.floor(data.quantity * this.FIGHTER_ATTACK_POWER * 0.5);
            totalDamage += fighterDamage;

            attacks.push({
                owner: owner,
                fighters: data.quantity,
                damage: fighterDamage
            });
        }

        return {
            attacked: totalDamage > 0,
            damage: totalDamage,
            attacks: attacks
        };
    }

    // Get player's total deployed fighters across all sectors
    getPlayerFighterSummary(playerName) {
        const deployments = this.load();
        let totalFighters = 0;
        let totalMines = 0;
        const locations = [];

        for (const [sectorKey, data] of Object.entries(deployments)) {
            const sectorId = parseInt(sectorKey.replace('sector_', ''));

            if (data.fighters[playerName]) {
                const qty = data.fighters[playerName].quantity;
                totalFighters += qty;
                locations.push({
                    sectorId: sectorId,
                    fighters: qty,
                    mines: data.mines[playerName]?.quantity || 0
                });
            } else if (data.mines[playerName]) {
                const qty = data.mines[playerName].quantity;
                totalMines += qty;
                locations.push({
                    sectorId: sectorId,
                    fighters: 0,
                    mines: qty
                });
            }
        }

        return {
            totalFighters: totalFighters,
            totalMines: totalMines,
            totalValue: (totalFighters * this.FIGHTER_COST) + (totalMines * this.MINE_COST),
            locations: locations.sort((a, b) => b.fighters - a.fighters)
        };
    }

    // Clear all defenses from a sector (for testing/admin)
    clearSector(sectorId) {
        const deployments = this.load();
        const sectorKey = `sector_${sectorId}`;

        if (deployments[sectorKey]) {
            delete deployments[sectorKey];
            this.save(deployments);
            return true;
        }

        return false;
    }
}

export default FighterSystem;
