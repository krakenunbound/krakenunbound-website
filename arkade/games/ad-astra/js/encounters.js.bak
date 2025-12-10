// Ad Astra - Encounter System
// encounters.js - Random encounters with modal UI and resolution

import { Utils } from './utils.js';

class EncounterSystem {
    constructor(game) {
        this.game = game;
        
        // Current encounter state
        this.activeEncounter = null;
        this.onResolveCallback = null;
        
        // Encounter types with weights and definitions
        this.encounterTable = [
            { weight: 25, type: 'pirates', generator: () => this.generatePirateEncounter() },
            { weight: 20, type: 'debris', generator: () => this.generateDebrisEncounter() },
            { weight: 15, type: 'derelict', generator: () => this.generateDerelictEncounter() },
            { weight: 15, type: 'patrol', generator: () => this.generatePatrolEncounter() },
            { weight: 10, type: 'trader', generator: () => this.generateTraderEncounter() },
            { weight: 10, type: 'anomaly', generator: () => this.generateAnomalyEncounter() },
            { weight: 5, type: 'distress', generator: () => this.generateDistressEncounter() }
        ];
        
        // Calculate total weight
        this.totalWeight = this.encounterTable.reduce((sum, e) => sum + e.weight, 0);
    }

    /**
     * Roll for a random encounter
     * @returns {object} Encounter definition
     */
    rollEncounter() {
        let roll = Math.random() * this.totalWeight;
        
        for (const entry of this.encounterTable) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.generator();
            }
        }
        
        // Fallback
        return this.generatePirateEncounter();
    }

    /**
     * Trigger an encounter with modal UI
     * @param {object} encounter - Encounter definition
     * @param {function} onResolve - Callback when encounter resolved
     */
    triggerEncounter(encounter, onResolve) {
        this.activeEncounter = encounter;
        this.onResolveCallback = onResolve;
        
        // Use 1 turn for the encounter
        const gameData = this.game.gameState.gameData;
        gameData.turns -= 1;
        this.game.gameState.save();
        
        // Play alert sound
        this.game.audio.playSfx('alert');
        if (encounter.type === 'pirates') {
            this.game.audio.playMusic('combat');
        }
        
        // Log to ship's log
        this.game.ui.addMessage(`⚠️ ${encounter.title}`, 'warning');
        
        // Show encounter modal
        this.showEncounterModal(encounter);
    }

    /**
     * Show the encounter modal UI
     * @param {object} encounter - Encounter definition
     */
    showEncounterModal(encounter) {
        // Remove any existing modal
        this.hideEncounterModal();
        
        let choicesHtml = '';
        encounter.choices.forEach((choice, index) => {
            choicesHtml += `
                <button class="encounter-choice" onclick="window.game.encounters.selectChoice(${index})" style="
                    display: block;
                    width: 100%;
                    padding: 12px 20px;
                    margin: 8px 0;
                    background: rgba(59, 130, 246, 0.2);
                    border: 1px solid var(--accent-blue);
                    border-radius: 4px;
                    color: var(--text-primary);
                    cursor: pointer;
                    text-align: left;
                    font-size: 1em;
                    transition: all 0.2s;
                ">
                    ${choice.text}
                    ${choice.hint ? `<span style="color: var(--text-secondary); font-size: 0.85em; display: block;">${choice.hint}</span>` : ''}
                </button>
            `;
        });

        const modalHtml = `
            <div id="encounter-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
                    border: 2px solid ${encounter.borderColor || 'var(--accent-yellow)'};
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 0 30px rgba(0,0,0,0.5);
                ">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 3em; margin-bottom: 10px;">${encounter.icon || '⚠️'}</div>
                        <h2 style="color: ${encounter.titleColor || 'var(--accent-yellow)'}; margin: 0 0 10px 0;">
                            ${encounter.title}
                        </h2>
                    </div>
                    
                    <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; text-align: center;">
                        ${encounter.description}
                    </p>
                    
                    ${encounter.stats ? `
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; margin-bottom: 20px;">
                            ${encounter.stats}
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <div style="color: var(--text-secondary); margin-bottom: 10px; font-weight: bold;">
                            What do you do?
                        </div>
                        ${choicesHtml}
                    </div>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    }

    /**
     * Hide the encounter modal
     */
    hideEncounterModal() {
        const modal = document.getElementById('encounter-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Player selects a choice
     * @param {number} choiceIndex - Index of selected choice
     */
    selectChoice(choiceIndex) {
        if (!this.activeEncounter) return;

        const choice = this.activeEncounter.choices[choiceIndex];
        if (!choice) return;

        // Roll for outcome
        const outcome = this.rollOutcome(choice.outcomes);
        
        // Apply outcome
        const result = this.applyOutcome(outcome);
        
        // Show result
        this.showOutcomeModal(result);
    }

    /**
     * Roll for outcome based on weights
     * @param {array} outcomes - Possible outcomes
     * @returns {object} Selected outcome
     */
    rollOutcome(outcomes) {
        const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
        let roll = Math.random() * totalWeight;
        
        for (const outcome of outcomes) {
            roll -= outcome.weight;
            if (roll <= 0) {
                return outcome;
            }
        }
        
        return outcomes[0];
    }

    /**
     * Apply outcome to game state
     * @param {object} outcome - Outcome to apply
     * @returns {object} Result description
     */
    applyOutcome(outcome) {
        const gameData = this.game.gameState.gameData;
        const result = {
            message: outcome.message,
            type: outcome.result,
            success: true,
            combatTriggered: false
        };

        switch (outcome.result) {
            case 'credits':
                const creditAmount = Array.isArray(outcome.amount) 
                    ? Utils.random.int(outcome.amount[0], outcome.amount[1])
                    : outcome.amount;
                gameData.credits += creditAmount;
                result.message = outcome.message.replace('{amount}', Math.abs(creditAmount));
                result.success = creditAmount > 0;
                break;

            case 'damage':
                const damageAmount = Array.isArray(outcome.amount)
                    ? Utils.random.int(outcome.amount[0], outcome.amount[1])
                    : outcome.amount;
                gameData.ship.hull = Math.max(0, gameData.ship.hull - damageAmount);
                result.message = outcome.message.replace('{amount}', damageAmount);
                result.success = false;
                
                // Check if ship destroyed
                if (gameData.ship.hull <= 0) {
                    result.shipDestroyed = true;
                }
                break;

            case 'cargo':
                const cargoAmount = Array.isArray(outcome.amount)
                    ? Utils.random.int(outcome.amount[0], outcome.amount[1])
                    : outcome.amount;
                const commodity = outcome.commodity || 'Ore';
                
                if (!gameData.cargo) gameData.cargo = {};
                gameData.cargo[commodity] = (gameData.cargo[commodity] || 0) + cargoAmount;
                
                result.message = outcome.message
                    .replace('{amount}', cargoAmount)
                    .replace('{commodity}', commodity);
                break;

            case 'cargo_loss':
                const lossPercent = Array.isArray(outcome.amount)
                    ? Utils.random.int(outcome.amount[0], outcome.amount[1])
                    : outcome.amount;
                
                if (gameData.cargo) {
                    for (const [item, qty] of Object.entries(gameData.cargo)) {
                        const lost = Math.floor(qty * lossPercent / 100);
                        gameData.cargo[item] = qty - lost;
                        if (gameData.cargo[item] <= 0) {
                            delete gameData.cargo[item];
                        }
                    }
                }
                result.message = outcome.message.replace('{amount}', lossPercent);
                result.success = false;
                break;

            case 'fuel':
                const fuelAmount = Array.isArray(outcome.amount)
                    ? Utils.random.int(outcome.amount[0], outcome.amount[1])
                    : outcome.amount;
                gameData.ship.fuel = Math.min(gameData.ship.fuelMax, gameData.ship.fuel + fuelAmount);
                result.message = outcome.message.replace('{amount}', fuelAmount);
                break;

            case 'combat':
                result.combatTriggered = true;
                result.enemy = outcome.enemy || this.generateEnemy();
                break;

            case 'pirateMinigame':
                result.pirateMinigameTriggered = true;
                result.enemy = outcome.enemy || this.generateEnemy();
                break;

            case 'trade':
                // Wandering trader purchase
                if (gameData.credits >= outcome.price) {
                    gameData.credits -= outcome.price;
                    if (!gameData.cargo) gameData.cargo = {};
                    gameData.cargo[outcome.commodity] = (gameData.cargo[outcome.commodity] || 0) + outcome.amount;
                    result.message = outcome.message;
                } else {
                    result.message = "You don't have enough credits!";
                    result.success = false;
                }
                break;

            case 'escape':
            case 'nothing':
            default:
                // No change to game state
                break;
        }

        this.game.gameState.save();
        return result;
    }

    /**
     * Show outcome result modal
     * @param {object} result - Outcome result
     */
    showOutcomeModal(result) {
        this.hideEncounterModal();

        if (result.combatTriggered) {
            // Start combat
            this.game.startCombat(result.enemy);
            this.resolveEncounter();
            return;
        }

        if (result.pirateMinigameTriggered) {
            // Start pirate combat minigame - pass resolveEncounter as callback
            // so route planner waits for minigame to complete before continuing
            const strength = result.enemy?.strength || 1;
            this.game.startPirateCombat(strength, () => {
                this.resolveEncounter();
            });
            return;
        }

        if (result.shipDestroyed) {
            // Handle ship destruction
            this.game.ui.addMessage('💀 Your ship has been destroyed!', 'error');
            // TODO: Game over handling
            this.resolveEncounter();
            return;
        }

        const modalHtml = `
            <div id="encounter-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
                    border: 2px solid ${result.success ? 'var(--accent-green)' : 'var(--accent-red)'};
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                ">
                    <div style="font-size: 3em; margin-bottom: 15px;">
                        ${result.success ? '✅' : '⚠️'}
                    </div>
                    <p style="color: var(--text-primary); line-height: 1.6; margin-bottom: 20px;">
                        ${result.message}
                    </p>
                    <button onclick="window.game.encounters.closeOutcome()" style="
                        padding: 10px 30px;
                        background: var(--accent-blue);
                        border: none;
                        border-radius: 4px;
                        color: white;
                        cursor: pointer;
                    ">
                        Continue
                    </button>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);

        // Log to ship's log
        this.game.ui.addMessage(result.message, result.success ? 'success' : 'warning');
    }

    /**
     * Close outcome modal and resolve encounter
     */
    closeOutcome() {
        this.hideEncounterModal();
        this.resolveEncounter();
    }

    /**
     * Resolve the current encounter
     */
    resolveEncounter() {
        this.activeEncounter = null;
        
        // Return to exploration music
        this.game.audio.playMusic('exploration');
        
        // Update UI
        this.game.updateUI();
        
        // Call callback to resume route if any
        if (this.onResolveCallback) {
            const callback = this.onResolveCallback;
            this.onResolveCallback = null;
            callback();
        }
    }

    // ==========================================
    // ENCOUNTER GENERATORS
    // ==========================================

    generatePirateEncounter() {
        const pirateTypes = [
            { name: 'Pirate Scout', hull: 40, weapons: 20, credits: [100, 300], strength: 1 },
            { name: 'Pirate Raider', hull: 60, weapons: 35, credits: [200, 500], strength: 2 },
            { name: 'Pirate Marauder', hull: 80, weapons: 50, credits: [400, 800], strength: 3 }
        ];
        const pirate = pirateTypes[Math.floor(Math.random() * pirateTypes.length)];

        return {
            type: 'pirates',
            icon: '🏴‍☠️',
            title: 'Pirates!',
            titleColor: 'var(--accent-red)',
            borderColor: 'var(--accent-red)',
            description: `A ${pirate.name} decloaks off your starboard bow! They're demanding you surrender your cargo.`,
            stats: `<span style="color: var(--accent-red);">Enemy: ${pirate.name}</span> | Hull: ${pirate.hull} | Weapons: ${pirate.weapons}`,
            pirate: pirate, // Store for minigame
            choices: [
                {
                    text: '⚔️ Fight!',
                    hint: 'Engage in combat minigame',
                    outcomes: [
                        { weight: 100, result: 'pirateMinigame', enemy: { ...pirate, type: 'pirate' }, message: 'Engaging hostile vessel!' }
                    ]
                },
                {
                    text: '🏃 Try to flee!',
                    hint: '60% success, risk damage on failure',
                    outcomes: [
                        { weight: 60, result: 'escape', message: 'Your engines roar to life and you escape!' },
                        { weight: 40, result: 'damage', amount: [15, 35], message: 'They fire as you flee! {amount} hull damage!' }
                    ]
                },
                {
                    text: '💰 Pay them off',
                    hint: 'Costs 500-1500 credits',
                    outcomes: [
                        { weight: 70, result: 'credits', amount: [-1500, -500], message: 'You pay ₡{amount} and they let you pass.' },
                        { weight: 30, result: 'cargo_loss', amount: [20, 40], message: 'They take the money AND {amount}% of your cargo!' }
                    ]
                }
            ]
        };
    }

    generateDebrisEncounter() {
        return {
            type: 'debris',
            icon: '🪨',
            title: 'Debris Field',
            titleColor: 'var(--accent-yellow)',
            borderColor: 'var(--accent-yellow)',
            description: 'Your sensors detect a dense field of debris and wreckage blocking your path. Navigation will be tricky.',
            choices: [
                {
                    text: '🎯 Navigate carefully',
                    hint: '70% safe, 30% minor damage',
                    outcomes: [
                        { weight: 70, result: 'nothing', message: 'You skillfully navigate through the debris field.' },
                        { weight: 30, result: 'damage', amount: [5, 15], message: 'A chunk of debris scrapes your hull! {amount} damage.' }
                    ]
                },
                {
                    text: '🔍 Search for salvage',
                    hint: 'Takes time, possible rewards',
                    outcomes: [
                        { weight: 40, result: 'credits', amount: [200, 800], message: 'You find salvageable materials worth ₡{amount}!' },
                        { weight: 30, result: 'cargo', commodity: 'Equipment', amount: [3, 10], message: 'You recover {amount} units of {commodity}!' },
                        { weight: 20, result: 'nothing', message: 'The debris contains nothing of value.' },
                        { weight: 10, result: 'damage', amount: [10, 25], message: 'Something explodes! {amount} hull damage!' }
                    ]
                },
                {
                    text: '↩️ Go around',
                    hint: 'Uses extra fuel',
                    outcomes: [
                        { weight: 100, result: 'fuel', amount: -10, message: 'You take a detour, using 10 extra fuel.' }
                    ]
                }
            ]
        };
    }

    generateDerelictEncounter() {
        return {
            type: 'derelict',
            icon: '🚀',
            title: 'Derelict Vessel',
            titleColor: 'var(--accent-blue)',
            borderColor: 'var(--accent-blue)',
            description: 'A seemingly abandoned ship drifts silently in the void. Life signs are negative, but the hull appears intact.',
            choices: [
                {
                    text: '🔧 Board and salvage',
                    hint: 'High risk, high reward',
                    outcomes: [
                        { weight: 50, result: 'credits', amount: [500, 2000], message: 'You strip the ship of valuables worth ₡{amount}!' },
                        { weight: 25, result: 'cargo', commodity: 'Equipment', amount: [10, 25], message: 'You recover {amount} units of {commodity}!' },
                        { weight: 15, result: 'nothing', message: 'The ship was already picked clean.' },
                        { weight: 10, result: 'damage', amount: [15, 30], message: 'A trap! The reactor overloads! {amount} damage!' }
                    ]
                },
                {
                    text: '📡 Scan remotely',
                    hint: 'Safe but less reward',
                    outcomes: [
                        { weight: 60, result: 'credits', amount: [100, 400], message: 'Scans reveal some data worth ₡{amount} on the market.' },
                        { weight: 40, result: 'nothing', message: 'Scans show nothing of value.' }
                    ]
                },
                {
                    text: '🚫 Leave it alone',
                    hint: 'Better safe than sorry',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You continue on your way, leaving the mystery unsolved.' }
                    ]
                }
            ]
        };
    }

    generatePatrolEncounter() {
        const hasContraband = this.game.gameState.gameData.cargo?.Contraband > 0;
        
        return {
            type: 'patrol',
            icon: '🛡️',
            title: 'Sector Patrol',
            titleColor: 'var(--accent-blue)',
            borderColor: 'var(--accent-blue)',
            description: 'A Sector Authority patrol vessel hails you and requests a routine cargo inspection.',
            choices: [
                {
                    text: '✅ Submit to inspection',
                    hint: hasContraband ? '⚠️ You have contraband!' : 'Standard procedure',
                    outcomes: hasContraband ? [
                        { weight: 100, result: 'cargo_loss', amount: [100, 100], message: 'They confiscate your contraband and fine you!' }
                    ] : [
                        { weight: 90, result: 'nothing', message: 'Inspection complete. They wave you through.' },
                        { weight: 10, result: 'credits', amount: [50, 150], message: 'They appreciate your cooperation and share some intel worth ₡{amount}.' }
                    ]
                },
                {
                    text: '🏃 Attempt to flee',
                    hint: 'Risky - they have fast ships',
                    outcomes: [
                        { weight: 30, result: 'escape', message: 'You outrun the patrol!' },
                        { weight: 50, result: 'damage', amount: [20, 40], message: 'They open fire! {amount} hull damage!' },
                        { weight: 20, result: 'combat', message: 'They pursue! Entering combat!' }
                    ]
                }
            ]
        };
    }

    generateTraderEncounter() {
        const commodities = ['Ore', 'Organics', 'Equipment'];
        const commodity = commodities[Math.floor(Math.random() * commodities.length)];
        const amount = Utils.random.int(10, 30);
        const price = Utils.random.int(5, 15) * amount;

        return {
            type: 'trader',
            icon: '🛒',
            title: 'Wandering Trader',
            titleColor: 'var(--accent-green)',
            borderColor: 'var(--accent-green)',
            description: `A friendly merchant ship hails you. They're offering ${amount} units of ${commodity} for ₡${price}.`,
            stats: `Offer: ${amount} ${commodity} for ₡${price}`,
            choices: [
                {
                    text: '💰 Accept the deal',
                    hint: `Buy ${amount} ${commodity}`,
                    outcomes: [
                        { weight: 100, result: 'trade', commodity, amount, price, message: `Purchased ${amount} ${commodity}!` }
                    ]
                },
                {
                    text: '🤝 Try to negotiate',
                    hint: '50% better price, 50% they leave',
                    outcomes: [
                        { weight: 50, result: 'trade', commodity, amount, price: Math.floor(price * 0.7), message: `Great deal! Bought ${amount} ${commodity} at a discount!` },
                        { weight: 50, result: 'nothing', message: 'They take offense and jump away.' }
                    ]
                },
                {
                    text: '👋 Decline politely',
                    hint: 'No transaction',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You wish them safe travels and continue on.' }
                    ]
                }
            ]
        };
    }

    generateAnomalyEncounter() {
        return {
            type: 'anomaly',
            icon: '🌀',
            title: 'Space Anomaly',
            titleColor: 'var(--accent-purple)',
            borderColor: '#a855f7',
            description: 'Your sensors detect a strange spatial distortion ahead. Energy readings are off the charts.',
            choices: [
                {
                    text: '🔬 Investigate',
                    hint: 'Unknown outcome',
                    outcomes: [
                        { weight: 30, result: 'credits', amount: [500, 1500], message: 'Exotic particles worth ₡{amount}!' },
                        { weight: 25, result: 'fuel', amount: 30, message: 'The anomaly recharges your fuel cells! +{amount} fuel!' },
                        { weight: 25, result: 'damage', amount: [10, 30], message: 'Energy surge! {amount} hull damage!' },
                        { weight: 20, result: 'nothing', message: 'The anomaly dissipates before you can study it.' }
                    ]
                },
                {
                    text: '🚫 Avoid it',
                    hint: 'Safe choice',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You give the anomaly a wide berth.' }
                    ]
                }
            ]
        };
    }

    generateDistressEncounter() {
        return {
            type: 'distress',
            icon: '🆘',
            title: 'Distress Signal',
            titleColor: 'var(--accent-yellow)',
            borderColor: 'var(--accent-yellow)',
            description: 'A weak distress signal is broadcasting on emergency frequencies. Someone needs help.',
            choices: [
                {
                    text: '🚑 Respond and assist',
                    hint: 'Good karma, possible reward',
                    outcomes: [
                        { weight: 50, result: 'credits', amount: [300, 1000], message: 'The grateful crew rewards you with ₡{amount}!' },
                        { weight: 20, result: 'fuel', amount: 20, message: 'They share some fuel as thanks! +{amount} fuel.' },
                        { weight: 20, result: 'nothing', message: 'You help them but they have nothing to offer.' },
                        { weight: 10, result: 'damage', amount: [20, 40], message: "It's a pirate trap! {amount} damage!" }
                    ]
                },
                {
                    text: '📡 Report to authorities',
                    hint: 'Let someone else handle it',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You relay the signal and continue on your way.' }
                    ]
                },
                {
                    text: '🚫 Ignore it',
                    hint: 'Not your problem',
                    outcomes: [
                        { weight: 100, result: 'nothing', message: 'You continue on, hoping someone else responds.' }
                    ]
                }
            ]
        };
    }

    /**
     * Generate a random enemy for combat
     */
    generateEnemy() {
        const enemies = [
            { name: 'Pirate Scout', hull: 40, hullMax: 40, shields: 20, shieldsMax: 20, weapons: 15, credits: [100, 300] },
            { name: 'Pirate Raider', hull: 60, hullMax: 60, shields: 30, shieldsMax: 30, weapons: 25, credits: [200, 500] },
            { name: 'Rogue Trader', hull: 50, hullMax: 50, shields: 25, shieldsMax: 25, weapons: 20, credits: [150, 400] }
        ];
        
        const template = enemies[Math.floor(Math.random() * enemies.length)];
        return {
            ...template,
            credits: Utils.random.int(template.credits[0], template.credits[1])
        };
    }
}

export default EncounterSystem;