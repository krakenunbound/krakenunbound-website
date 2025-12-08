// Ad Astra - PvP Combat System
// Handles player-vs-player combat encounters

import { Utils } from './utils.js';

class PvPSystem {
    constructor(combatSystem) {
        this.combat = combatSystem;
        this.activeBattles = new Map(); // battleId -> battle data
    }

    // Initiate PvP combat
    initiateCombat(attacker, defender) {
        const battleId = `${attacker.username}_vs_${defender.username}_${Date.now()}`;

        const battle = {
            id: battleId,
            attacker: {
                username: attacker.username,
                pilotName: attacker.pilotName,
                ship: { ...attacker.ship },
                originalSector: attacker.currentSector
            },
            defender: {
                username: defender.username,
                pilotName: defender.pilotName,
                ship: { ...defender.ship },
                originalSector: defender.currentSector
            },
            turn: 'attacker', // whose turn it is
            started: Date.now(),
            log: []
        };

        this.activeBattles.set(battleId, battle);

        this.addLog(battle, `${attacker.pilotName} attacks ${defender.pilotName}!`);

        return {
            success: true,
            battleId,
            battle
        };
    }

    // Player attacks in PvP
    playerAttack(battleId, attackerUsername) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) {
            return { success: false, error: 'Battle not found' };
        }

        const isAttacker = battle.attacker.username === attackerUsername;
        const attacker = isAttacker ? battle.attacker : battle.defender;
        const defender = isAttacker ? battle.defender : battle.attacker;

        // Check if it's player's turn
        if ((battle.turn === 'attacker' && !isAttacker) ||
            (battle.turn === 'defender' && isAttacker)) {
            return { success: false, error: 'Not your turn' };
        }

        // Calculate damage based on ship class
        const baseDamage = this.getShipDamage(attacker.ship.class);
        const accuracy = this.getShipAccuracy(attacker.ship.class);
        const hit = Math.random() < accuracy;

        let damage = 0;
        if (hit) {
            damage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4));
            defender.ship.hull -= damage;
            this.addLog(battle, `${attacker.pilotName} hits for ${damage} damage!`);
        } else {
            this.addLog(battle, `${attacker.pilotName} misses!`);
        }

        // Switch turns
        battle.turn = battle.turn === 'attacker' ? 'defender' : 'attacker';

        // Check if battle is over
        if (defender.ship.hull <= 0) {
            defender.ship.hull = 0;
            this.addLog(battle, `${defender.pilotName} has been destroyed!`);
            return {
                success: true,
                hit,
                damage,
                battleOver: true,
                winner: attacker.username,
                loser: defender.username,
                battle
            };
        }

        return {
            success: true,
            hit,
            damage,
            battleOver: false,
            battle
        };
    }

    // Player flees from PvP
    playerFlee(battleId, playerUsername) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) {
            return { success: false, error: 'Battle not found' };
        }

        const isAttacker = battle.attacker.username === playerUsername;
        const fleeing = isAttacker ? battle.attacker : battle.defender;
        const remaining = isAttacker ? battle.defender : battle.attacker;

        // Check if it's player's turn
        if ((battle.turn === 'attacker' && !isAttacker) ||
            (battle.turn === 'defender' && isAttacker)) {
            return { success: false, error: 'Not your turn' };
        }

        // Flee success based on ship class (faster ships flee easier)
        const fleeChance = this.getShipFleeChance(fleeing.ship.class);
        const success = Math.random() < fleeChance;

        if (success) {
            this.addLog(battle, `${fleeing.pilotName} successfully escaped!`);
            this.endBattle(battleId);
            return {
                success: true,
                fled: true,
                battle
            };
        } else {
            this.addLog(battle, `${fleeing.pilotName} failed to escape!`);

            // Opponent gets a free attack
            const damage = Math.floor(this.getShipDamage(remaining.ship.class) * 0.5);
            fleeing.ship.hull -= damage;
            this.addLog(battle, `${remaining.pilotName} lands a pursuit shot for ${damage} damage!`);

            // Switch turns back
            battle.turn = battle.turn === 'attacker' ? 'defender' : 'attacker';

            // Check if ship destroyed
            if (fleeing.ship.hull <= 0) {
                fleeing.ship.hull = 0;
                this.addLog(battle, `${fleeing.pilotName} was destroyed while fleeing!`);
                return {
                    success: true,
                    fled: false,
                    battleOver: true,
                    winner: remaining.username,
                    loser: fleeing.username,
                    battle
                };
            }

            return {
                success: true,
                fled: false,
                damage,
                battle
            };
        }
    }

    // Get ship damage based on class
    getShipDamage(shipClass) {
        const damages = {
            'Scout': 15,
            'Trader': 20,
            'Freighter': 25,
            'Corvette': 35,
            'Destroyer': 45,
            'Battleship': 60
        };
        return damages[shipClass] || 20;
    }

    // Get ship accuracy based on class
    getShipAccuracy(shipClass) {
        const accuracies = {
            'Scout': 0.75,
            'Trader': 0.65,
            'Freighter': 0.55,
            'Corvette': 0.80,
            'Destroyer': 0.85,
            'Battleship': 0.70
        };
        return accuracies[shipClass] || 0.7;
    }

    // Get flee chance based on ship class
    getShipFleeChance(shipClass) {
        const chances = {
            'Scout': 0.85,
            'Trader': 0.70,
            'Freighter': 0.50,
            'Corvette': 0.75,
            'Destroyer': 0.60,
            'Battleship': 0.40
        };
        return chances[shipClass] || 0.6;
    }

    // Add log entry to battle
    addLog(battle, message) {
        battle.log.push({
            timestamp: Date.now(),
            message
        });
    }

    // Get battle
    getBattle(battleId) {
        return this.activeBattles.get(battleId);
    }

    // End battle
    endBattle(battleId) {
        this.activeBattles.delete(battleId);
    }

    // Check if player is in battle
    getPlayerBattle(username) {
        for (const [battleId, battle] of this.activeBattles) {
            if (battle.attacker.username === username || battle.defender.username === username) {
                return { battleId, battle };
            }
        }
        return null;
    }

    // Get rewards for winning PvP
    getVictoryRewards(winner, loser) {
        // Winner gets credits based on loser's ship value
        const shipValues = {
            'Scout': 1000,
            'Trader': 2500,
            'Freighter': 5000,
            'Corvette': 7500,
            'Destroyer': 12000,
            'Battleship': 20000
        };

        const baseReward = shipValues[loser.ship.class] || 2000;
        const bounty = Math.floor(baseReward * 0.3);

        return {
            credits: bounty,
            experience: 100,
            message: `Destroyed ${loser.pilotName}'s ${loser.ship.class} and collected ${Utils.format.credits(bounty)} bounty!`
        };
    }
}

export default PvPSystem;
