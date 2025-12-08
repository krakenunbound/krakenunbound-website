// Ad Astra - Random Events System
// events.js - Random encounters and events during gameplay

import { Utils, CONSTANTS } from './utils.js';

export class EventSystem {
    static EVENTS = {
        // Positive events
        derelict: {
            type: 'positive',
            weight: 15,
            title: 'Derelict Ship Found!',
            description: 'Your sensors detect a derelict vessel floating in space.',
            choices: [
                {
                    text: 'Salvage the wreckage',
                    action: 'salvage',
                    outcomes: [
                        { weight: 60, result: 'credits', amount: [500, 2000], message: 'You salvaged ₡{amount} worth of materials!' },
                        { weight: 30, result: 'cargo', commodity: 'Equipment', amount: [5, 15], message: 'You found {amount} units of {commodity}!' },
                        { weight: 10, result: 'nothing', message: 'The wreck was already stripped clean.' }
                    ]
                },
                {
                    text: 'Leave it alone',
                    action: 'ignore',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You continue on your way.' }
                    ]
                }
            ]
        },

        distressSignal: {
            type: 'neutral',
            weight: 12,
            title: 'Distress Signal Detected',
            description: 'A weak distress signal is coming from a nearby vessel.',
            choices: [
                {
                    text: 'Investigate and help',
                    action: 'help',
                    outcomes: [
                        { weight: 70, result: 'credits', amount: [1000, 3000], message: 'The grateful captain rewards you with ₡{amount}!' },
                        { weight: 20, result: 'trap', damage: [10, 30], message: "It's a trap! Pirates ambush you for {amount} damage!" },
                        { weight: 10, result: 'cargo', commodity: 'Organics', amount: [10, 20], message: 'They give you {amount} {commodity} as thanks!' }
                    ]
                },
                {
                    text: 'Ignore the signal',
                    action: 'ignore',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You decide not to risk it.' }
                    ]
                }
            ]
        },

        asteroidField: {
            type: 'neutral',
            weight: 20,
            title: 'Asteroid Field',
            description: 'A dense asteroid field blocks your path.',
            choices: [
                {
                    text: 'Navigate through carefully',
                    action: 'navigate',
                    outcomes: [
                        { weight: 70, result: 'nothing', message: 'You skillfully navigate through the field.' },
                        { weight: 30, result: 'damage', amount: [5, 20], message: 'You collide with an asteroid! {amount} hull damage!' }
                    ]
                },
                {
                    text: 'Mine the asteroids',
                    action: 'mine',
                    outcomes: [
                        { weight: 60, result: 'cargo', commodity: 'Ore', amount: [10, 30], message: 'You successfully mine {amount} units of {commodity}!' },
                        { weight: 30, result: 'damage', amount: [5, 15], message: 'Mining equipment malfunction! {amount} hull damage!' },
                        { weight: 10, result: 'nothing', message: 'The asteroids contain nothing valuable.' }
                    ]
                }
            ]
        },

        spaceAnomaly: {
            type: 'neutral',
            weight: 8,
            title: 'Space Anomaly',
            description: 'Your sensors detect a strange spatial anomaly nearby.',
            choices: [
                {
                    text: 'Investigate the anomaly',
                    action: 'investigate',
                    outcomes: [
                        { weight: 40, result: 'warp', message: 'The anomaly warps you to a random sector!' },
                        { weight: 30, result: 'damage', amount: [10, 40], message: 'Energy discharge! {amount} damage to your ship!' },
                        { weight: 20, result: 'credits', amount: [2000, 5000], message: 'You find ancient technology worth ₡{amount}!' },
                        { weight: 10, result: 'fuel', amount: [20, 50], message: 'Strange energy refuels your ship by {amount} units!' }
                    ]
                },
                {
                    text: 'Avoid the anomaly',
                    action: 'avoid',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You carefully steer clear of the anomaly.' }
                    ]
                }
            ]
        },

        mechanicalFailure: {
            type: 'negative',
            weight: 15,
            title: 'System Malfunction!',
            description: 'Warning! Critical system malfunction detected!',
            choices: [
                {
                    text: 'Emergency repairs',
                    action: 'repair',
                    outcomes: [
                        { weight: 60, result: 'credits', amount: [-500, -200], message: 'Repairs cost you ₡{amount}' },
                        { weight: 30, result: 'fuel', amount: [-20, -10], message: 'Life support drain! Lost {amount} fuel!' },
                        { weight: 10, result: 'damage', amount: [5, 15], message: 'Cascade failure! {amount} hull damage!' }
                    ]
                }
            ]
        },

        merchantShip: {
            type: 'positive',
            weight: 18,
            title: 'Merchant Vessel',
            description: 'A friendly merchant ship hails you with a trade offer.',
            choices: [
                {
                    text: 'Trade with merchant',
                    action: 'trade',
                    outcomes: [
                        { weight: 80, result: 'trade', message: 'You make a profitable trade!' },
                        { weight: 20, result: 'nothing', message: 'The merchant has nothing you need.' }
                    ]
                },
                {
                    text: 'Decline and continue',
                    action: 'decline',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You politely decline and move on.' }
                    ]
                }
            ]
        },

        pirateEncounter: {
            type: 'negative',
            weight: 12,
            title: 'Pirates!',
            description: 'A pirate vessel decloaks and demands your cargo!',
            choices: [
                {
                    text: 'Fight!',
                    action: 'combat',
                    outcomes: [
                        { weight: 100, result: 'combat', message: 'Entering combat!' }
                    ]
                },
                {
                    text: 'Try to flee',
                    action: 'flee',
                    outcomes: [
                        { weight: 60, result: 'nothing', message: 'You successfully escape!' },
                        { weight: 40, result: 'damage', amount: [15, 35], message: 'They fire as you flee! {amount} damage!' }
                    ]
                },
                {
                    text: 'Pay them off',
                    action: 'bribe',
                    outcomes: [
                        { weight: 80, result: 'credits', amount: [-1000, -500], message: 'You pay ₡{amount} and they let you go.' },
                        { weight: 20, result: 'cargo_loss', amount: [10, 30], message: 'They take {amount}% of your cargo anyway!' }
                    ]
                }
            ]
        },

        policeInspection: {
            type: 'neutral',
            weight: 15,
            title: 'Police Inspection',
            description: 'Sector Authority vessels request you halt for a routine cargo scan.',
            choices: [
                {
                    text: 'Submit to scan',
                    action: 'scan',
                    outcomes: [
                        { weight: 100, result: 'scan_cargo', message: 'Scanning cargo...' }
                    ]
                },
                {
                    text: 'Attempt to flee',
                    action: 'flee',
                    outcomes: [
                        { weight: 30, result: 'nothing', message: 'You managed to slip away!' },
                        { weight: 70, result: 'damage', amount: [20, 50], message: 'They opened fire! {amount} hull damage!' },
                        { weight: 50, result: 'wanted', message: 'You are now a wanted criminal!' } // Future feature?
                    ]
                },
                {
                    text: 'Bribe Officer (₡500)',
                    action: 'bribe',
                    outcomes: [
                        { weight: 60, result: 'credits', amount: [-500, -500], message: 'The officer accepts the "donation" and waves you through.' },
                        { weight: 40, result: 'scan_cargo', message: 'Bribe rejected! They are scanning your cargo immediately!' }
                    ]
                }
            ]
        }
    };

    // Trigger random event check
    static checkForEvent() {
        if (Math.random() > CONSTANTS.EVENT_CHANCE) {
            return null; // No event
        }

        // Get weighted random event
        const eventChoices = Object.entries(this.EVENTS).map(([key, event]) => ({
            item: key,
            weight: event.weight
        }));

        const eventKey = Utils.random.weighted(eventChoices);
        return this.getEvent(eventKey);
    }

    // Get event by key
    static getEvent(key) {
        const event = this.EVENTS[key];
        if (!event) return null;

        return {
            key: key,
            ...Utils.clone(event)
        };
    }

    // Process event choice
    static processChoice(event, choiceIndex) {
        const choice = event.choices[choiceIndex];
        if (!choice) return null;

        // Get weighted random outcome
        const outcomeChoices = choice.outcomes.map(outcome => ({
            item: outcome,
            weight: outcome.weight
        }));

        const outcome = Utils.random.weighted(outcomeChoices);

        // Process outcome amount if exists
        if (outcome.amount && Array.isArray(outcome.amount)) {
            outcome.actualAmount = Utils.random.int(outcome.amount[0], outcome.amount[1]);
        } else if (outcome.amount) {
            outcome.actualAmount = outcome.amount;
        }

        // Format message with actual values
        if (outcome.message) {
            outcome.message = outcome.message
                .replace('{amount}', Math.abs(outcome.actualAmount || 0))
                .replace('{commodity}', outcome.commodity || '');
        }

        return {
            action: choice.action,
            outcome: outcome
        };
    }

    // Apply event outcome to game state
    static applyOutcome(gameState, outcome) {
        const result = {
            success: false,
            message: outcome.message || '',
            changes: {}
        };

        switch (outcome.result) {
            case 'scan_cargo':
                const contrabandQty = gameState.getCargoAmount('Contraband');
                if (contrabandQty > 0) {
                    // Found contraband!
                    const fine = contrabandQty * 200; // Fine is double the base price
                    gameState.removeCargo('Contraband', contrabandQty);

                    // Force pay fine (max what player has)
                    const actualFine = Math.min(fine, gameState.gameData.credits);
                    gameState.modifyCredits(-actualFine);

                    result.success = true;
                    result.message = `Contraband detected! Confiscated ${contrabandQty} units and fined ₡${actualFine}.`;
                    result.changes.credits = -actualFine;
                    result.changes.cargoLoss = { Contraband: contrabandQty };
                } else {
                    // Clean
                    result.success = true;
                    result.message = 'Scan complete. No illegal goods found. You are free to go.';
                }
                break;

            case 'credits':
                const amount = outcome.actualAmount || 0;
                if (gameState.modifyCredits(amount)) {
                    result.success = true;
                    result.changes.credits = amount;
                }
                break;

            case 'cargo':
                const qty = outcome.actualAmount || 0;
                if (gameState.addCargo(outcome.commodity, qty)) {
                    result.success = true;
                    result.changes.cargo = { [outcome.commodity]: qty };
                } else {
                    result.message = 'Not enough cargo space!';
                }
                break;

            case 'damage':
                const dmg = outcome.actualAmount || 0;
                gameState.damageShip(dmg);
                result.success = true;
                result.changes.damage = dmg;
                break;

            case 'fuel':
                const fuelChange = outcome.actualAmount || 0;
                gameState.gameData.ship.fuel = Math.max(
                    0,
                    Math.min(
                        gameState.gameData.ship.fuel + fuelChange,
                        gameState.gameData.ship.fuelMax
                    )
                );
                result.success = true;
                result.changes.fuel = fuelChange;
                gameState.save();
                break;

            case 'cargo_loss':
                const lossPercent = (outcome.actualAmount || 0) / 100;
                const lostCargo = {};
                for (const [commodity, qty] of Object.entries(gameState.gameData.cargo)) {
                    const loss = Math.floor(qty * lossPercent);
                    gameState.removeCargo(commodity, loss);
                    lostCargo[commodity] = loss;
                }
                result.success = true;
                result.changes.cargoLoss = lostCargo;
                break;

            case 'warp':
                // Random warp - handled by caller
                result.success = true;
                result.changes.randomWarp = true;
                break;

            case 'combat':
                // Combat - handled by caller
                result.success = true;
                result.changes.combat = true;
                break;

            case 'trade':
                // Special trade opportunity - handled by caller
                result.success = true;
                result.changes.trade = true;
                break;

            case 'nothing':
                result.success = true;
                break;
        }

        // Update stats
        if (result.success) {
            gameState.updateStat('eventsEncountered', 1);
        }

        return result;
    }

    // Generate random enemy for combat
    static generateEnemy() {
        const enemyTypes = [
            { name: 'Pirate Scout', type: 'generic', hull: 60, shields: 30, weapons: 25, credits: [200, 500] },
            { name: 'Pirate Raider', type: 'generic', hull: 80, shields: 50, weapons: 40, credits: [500, 1000] },
            { name: 'Space Thug', type: 'generic', hull: 50, shields: 20, weapons: 30, credits: [100, 300] },
            { name: 'Mercenary', type: 'generic', hull: 100, shields: 60, weapons: 50, credits: [1000, 2000] },
            { name: 'Alien Drone', type: 'kraken', hull: 70, shields: 80, weapons: 35, credits: [300, 700] }
        ];

        const type = Utils.random.choice(enemyTypes);

        return {
            name: type.name,
            type: type.type,
            hull: type.hull,
            hullMax: type.hull,
            shields: type.shields,
            shieldsMax: type.shields,
            weapons: type.weapons,
            credits: Utils.random.int(type.credits[0], type.credits[1])
        };
    }
}

export default EventSystem;
