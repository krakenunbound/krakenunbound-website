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
            { weight: 15, type: 'pirates', generator: () => this.generatePirateEncounter() }, // Reduced from 20
            { weight: 15, type: 'debris', generator: () => this.generateDebrisEncounter() },
            { weight: 15, type: 'hive', generator: () => this.generateHiveEncounter() },
            { weight: 15, type: 'kraken', generator: () => this.generateStarKrakenEncounter() },
            { weight: 10, type: 'derelict', generator: () => this.generateDerelictEncounter() },
            { weight: 10, type: 'patrol', generator: () => this.generatePatrolEncounter() },
            { weight: 5, type: 'trader', generator: () => this.generateTraderEncounter() },
            { weight: 5, type: 'anomaly', generator: () => this.generateAnomalyEncounter() },
            { weight: 5, type: 'distress', generator: () => this.generateDistressEncounter() },
            // NEW SCI-FI ENCOUNTERS
            { weight: 5, type: 'cylon', generator: () => this.generateCylonEncounter() },
            { weight: 3, type: 'borg', generator: () => this.generateBorgEncounter() },
            { weight: 3, type: 'ancient', generator: () => this.generateAncientEncounter() }
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
            minigameTriggered: null // Stores type of minigame if any
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

            case 'pirateMinigame':
            case 'asteroidMinigame':
            case 'hiveMinigame':
            case 'starKrakenMinigame':
                result.minigameTriggered = outcome.result;
                result.difficulty = outcome.strength || outcome.difficulty || 1;
                result.enemy = outcome.enemy;
                break;

            case 'trade':
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

        // Check for minigame triggers
        if (result.minigameTriggered) {
            const diff = result.difficulty || 1;
            const callback = (res) => this.handleMinigameResult(res, result);

            if (result.minigameTriggered === 'pirateMinigame') {
                this.game.startPirateCombat(diff, callback);
            } else if (result.minigameTriggered === 'asteroidMinigame') {
                this.game.startAsteroidCombat(diff, callback);
            } else if (result.minigameTriggered === 'hiveMinigame') {
                this.game.startHiveCombat(diff, callback);
            } else if (result.minigameTriggered === 'starKrakenMinigame') {
                this.game.startStarKrakenCombat(diff, callback);
            }
            return;
        }

        if (result.shipDestroyed) {
            this.game.ui.addMessage('💀 Your ship has been destroyed!', 'error');
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

        this.game.ui.addMessage(result.message, result.success ? 'success' : 'warning');
    }

    /**
     * Handle Minigame Completion
     */
    handleMinigameResult(minigameResult, encounterResult) {
        const gameData = this.game.gameState.gameData;
        let summary = '';

        const success = minigameResult.success || minigameResult.survived;

        if (success) {
            // Victory
            this.game.audio.playSfx('success');
            summary = 'Mission Successful! ';

            // Apply loot
            const loot = minigameResult.loot;
            if (loot) {
                // Asteroid Loot
                if (loot.ore) {
                    summary += `Mined ${loot.ore} Ore. `;
                    gameData.cargo['Ore'] = (gameData.cargo['Ore'] || 0) + loot.ore;
                }
                if (loot.rare) {
                    summary += `Found ${loot.rare} Rare Minerals. `;
                    gameData.credits += loot.rare * 200;
                }

                if (loot.materials) {
                    summary += `Salvaged ${loot.materials} materials. `;
                    // Simplified: materials -> Credits conversion or cargo
                    gameData.credits += loot.materials * 50;
                }
                if (loot.cargo) {
                    summary += `Captured ${loot.cargo} units of cargo. `;
                    gameData.cargo['Equipment'] = (gameData.cargo['Equipment'] || 0) + loot.cargo;
                }
                if (loot.biomass) {
                    summary += `Collected ${loot.biomass} biomass. `;
                    gameData.cargo['Organics'] = (gameData.cargo['Organics'] || 0) + loot.biomass;
                }
                if (loot.tech) {
                    summary += `Recovered ${loot.tech} alien tech. `;
                    gameData.cargo['Equipment'] = (gameData.cargo['Equipment'] || 0) + loot.tech;
                }
            }
            // Bounty for kills in Star Kraken
            if (minigameResult.kills) {
                const bounty = minigameResult.kills * 100;
                gameData.credits += bounty;
                summary += `Earned ${bounty} credits in bounties. `;
            }

        } else {
            // Defeat/Retreat
            summary = 'Mission Failed/Aborted. ';
        }

        // Apply Hull Damage
        if (minigameResult.hullDamage > 0) {
            const dmg = Math.floor(minigameResult.hullDamage * 0.5); // Scale down damage typically
            gameData.ship.hull = Math.max(0, gameData.ship.hull - dmg);
            summary += `Ship took ${dmg} hull damage.`;
        }

        this.game.gameState.save();

        // Show summary modal
        this.showOutcomeModal({
            success: success,
            message: summary,
            shipDestroyed: gameData.ship.hull <= 0
        });
    }

    closeOutcome() {
        this.hideEncounterModal();
        this.resolveEncounter();
    }

    resolveEncounter() {
        this.activeEncounter = null;
        this.game.audio.playMusic('exploration');
        this.game.updateUI();
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
        return {
            type: 'pirates',
            icon: '🏴‍☠️',
            title: 'Pirate Ambush!',
            titleColor: 'var(--accent-red)',
            borderColor: 'var(--accent-red)',
            description: 'Sensors detect hostile signals! Pirates are closing in for an assault.',
            stats: '<span style="color:red">Threat Level: Moderate</span>',
            choices: [
                {
                    text: '⚔️ Defend Ship',
                    hint: 'Enter Combat',
                    outcomes: [{ weight: 100, result: 'pirateMinigame', strength: 2 }]
                },
                {
                    text: '🏃 Flee',
                    hint: 'Risk Damage',
                    outcomes: [
                        { weight: 40, result: 'escape', message: 'You managed to escape!' },
                        { weight: 60, result: 'damage', amount: 20, message: 'Hit by stray fire while fleeing!' }
                    ]
                }
            ]
        };
    }

    generateDebrisEncounter() {
        return {
            type: 'debris',
            icon: '🪨',
            title: 'Asteroid Field',
            titleColor: 'var(--accent-yellow)',
            borderColor: 'var(--accent-yellow)',
            description: 'A dense asteroid field blocks your path. You must navigate through it.',
            choices: [
                {
                    text: '🕹️ Pilot Manually',
                    hint: 'Asteroid Minigame',
                    outcomes: [{ weight: 100, result: 'asteroidMinigame', difficulty: 1 }]
                },
                {
                    text: '↩️ Go Around',
                    hint: '-10 Fuel',
                    outcomes: [{ weight: 100, result: 'fuel', amount: -10, message: 'Took a detour.' }]
                }
            ]
        };
    }

    generateHiveEncounter() {
        return {
            type: 'hive',
            icon: '👽',
            title: 'Alien Hive Swarm',
            titleColor: '#d946ef', // Fuchsia
            borderColor: '#d946ef',
            description: 'You have disturbed a Hive nesting ground! The swarm is awakening.',
            stats: '<span style="color:#d946ef">Threat Level: HIGH</span>',
            choices: [
                {
                    text: '🔫 Exterminate',
                    hint: 'Hive Assault Minigame',
                    outcomes: [{ weight: 100, result: 'hiveMinigame', difficulty: 2 }]
                },
                {
                    text: '🚀 Emergency Warp',
                    hint: '-20 Fuel',
                    outcomes: [{ weight: 100, result: 'fuel', amount: -20, message: 'Narrow escape!' }]
                }
            ]
        };
    }

    generateStarKrakenEncounter() {
        return {
            type: 'kraken',
            icon: '🐙',
            title: 'Star Kraken Forces',
            titleColor: '#0ea5e9', // Sky blue
            borderColor: '#0ea5e9',
            description: 'A Star Kraken battle group has intercepted you. Prepare for ship-to-ship combat!',
            stats: '<span style="color:#0ea5e9">Threat Level: EXTREME</span>',
            choices: [
                {
                    text: '🚀 Engage Enemy',
                    hint: 'Star Kraken Minigame',
                    outcomes: [{ weight: 100, result: 'starKrakenMinigame', difficulty: 3 }]
                }
            ]
        };
    }

    generateDerelictEncounter() {
        const ships = ['Jupiter 2', 'Nostromo', 'Event Horizon', 'Red Dwarf', 'Discovery One', 'Kobayashi Maru'];
        const shipName = Utils.random.choice(ships);

        return {
            type: 'derelict',
            icon: '🚀',
            title: `Derelict: ${shipName}`,
            titleColor: 'var(--accent-blue)',
            description: `You found the drifting wreck of the ${shipName}. It appears abandoned.`,
            choices: [
                {
                    text: '🔧 Salvage',
                    hint: 'Gain Credits',
                    outcomes: [{ weight: 100, result: 'credits', amount: [200, 500], message: 'Found some credits.' }]
                },
                {
                    text: '🚫 Ignore',
                    outcomes: [{ weight: 100, result: 'nothing', message: 'Left it alone.' }]
                }
            ]
        };
    }

    generatePatrolEncounter() {
        return {
            type: 'patrol',
            icon: '🛡️',
            title: 'Security Patrol',
            titleColor: 'var(--accent-blue)',
            description: 'You are hailed by local security forces.',
            choices: [
                {
                    text: '✅ Comply',
                    outcomes: [{ weight: 100, result: 'nothing', message: 'They let you pass.' }]
                }
            ]
        };
    }

    generateTraderEncounter() {
        return {
            type: 'trader',
            icon: '💰',
            title: 'Venture Trader',
            titleColor: '#22c55e',
            description: 'A trader offers to share navigation data.',
            choices: [
                {
                    text: '🤝 Accept',
                    outcomes: [{ weight: 100, result: 'credits', amount: 50, message: 'Small trade completed.' }]
                }
            ]
        };
    }

    generateAnomalyEncounter() {
        return {
            type: 'anomaly',
            icon: '🌀',
            title: 'Spatial Anomaly',
            titleColor: '#8b5cf6',
            description: 'Strange readings ahead.',
            choices: [
                {
                    text: '🔬 Scan',
                    outcomes: [
                        { weight: 50, result: 'credits', amount: 200, message: 'Valuable data collected.' },
                        { weight: 50, result: 'damage', amount: 10, message: 'Radiation surge damaged hull.' }
                    ]
                }
            ]
        };
    }

    generateDistressEncounter() {
        return {
            type: 'distress',
            icon: '🆘',
            title: 'Distress Beacon',
            titleColor: '#f59e0b',
            description: 'Someone is calling for help.',
            choices: [
                {
                    text: '🚑 Assist',
                    outcomes: [{ weight: 100, result: 'credits', amount: 100, message: 'They thanked you with credits.' }]
                }
            ]
        };
    }

    generateCylonEncounter() {
        return {
            type: 'cylon',
            icon: '🤖',
            title: 'Cylon Raider',
            titleColor: '#ef4444',
            borderColor: '#ef4444',
            description: 'A sleek, chrome fighter appears on your scanners. Its single red eye scans your hull. "By your command."',
            choices: [
                {
                    text: '⚔️ Combat',
                    hint: 'Starfighter Combat',
                    outcomes: [{ weight: 100, result: 'pirateMinigame', strength: 3, enemy: 'Cylon Raider' }]
                },
                {
                    text: '🤫 FTL Jump',
                    hint: '-30 Fuel',
                    outcomes: [{ weight: 100, result: 'fuel', amount: -30, message: 'You narrowly escaped the toaster.' }]
                }
            ]
        };
    }

    generateBorgEncounter() {
        return {
            type: 'borg',
            icon: '⬛',
            title: 'Borg Cube',
            titleColor: '#10b981',
            borderColor: '#10b981',
            description: 'A massive cube fills the viewscreen. "WE ARE THE BORG. LOWER YOUR SHIELDS AND SURRENDER YOUR SHIPS. RESISTANCE IS FUTILE."',
            stats: '<span style="color:#10b981">Threat: EXTREME</span>',
            choices: [
                {
                    text: '🛡️ Modulate Shields',
                    hint: 'Attempt Escape',
                    outcomes: [
                        { weight: 30, result: 'escape', message: 'Shield frequency matched! You escaped to warp.' },
                        { weight: 70, result: 'damage', amount: 50, message: 'Adaptation failed! Massive damage taken.' }
                    ]
                },
                {
                    text: '⚔️ Engage',
                    hint: 'Suicide Mission',
                    outcomes: [{ weight: 100, result: 'starKrakenMinigame', difficulty: 5, enemy: 'Borg Cube' }]
                }
            ]
        };
    }

    generateAncientEncounter() {
        return {
            type: 'ancient',
            icon: '🏛️',
            title: 'Ancient Sphere',
            titleColor: '#eab308',
            description: 'You encounter a device left by the Ancients. It pulses with zero-point energy.',
            choices: [
                {
                    text: '🧬 Interface',
                    hint: 'Requires Gene',
                    outcomes: [
                        { weight: 50, result: 'credits', amount: 1000, message: 'The device recognizes you! It grants a supply cache.' },
                        { weight: 50, result: 'nothing', message: 'The device ignores you.' }
                    ]
                }
            ]
        };
    }
}

export default EncounterSystem;