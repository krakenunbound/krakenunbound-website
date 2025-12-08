// Ad Astra - Colonization System
// colonization.js - Genesis torpedoes, planet creation, and colony management

import { Utils, CONSTANTS } from './utils.js';

export class ColonizationSystem {
    constructor() {
        this.GENESIS_COST = 50000; // Cost of a Genesis torpedo - significant investment
        this.MAX_COLONIES_PER_PLAYER = 5; // Limit colonies per player
        this.INCOME_PER_TICK = 100; // Base income per planet per day
        this.UPGRADE_COST_MULTIPLIER = 2; // Cost increases per level
    }

    // Load colonies from storage
    load() {
        return Utils.storage.get('colonies') || {};
    }

    // Save colonies to storage
    save(colonies) {
        Utils.storage.set('colonies', colonies);
    }

    // Check if sector is suitable for colonization
    canColonize(galaxy, sectorId) {
        const sector = galaxy.getSector(sectorId);
        if (!sector) {
            return { valid: false, reason: 'Invalid sector' };
        }

        // Sector must be empty or only contain debris
        const hasBlockingContent = sector.contents.some(c =>
            c.type === 'planet' || c.type === 'station'
        );

        if (hasBlockingContent) {
            return { valid: false, reason: 'Sector already contains planet or station' };
        }

        return { valid: true };
    }

    // Create a new colony with Genesis torpedo
    createColony(galaxy, sectorId, owner, pilotName, credits) {
        // Check if player can afford it
        if (credits < this.GENESIS_COST) {
            return {
                success: false,
                error: `Not enough credits! Genesis torpedo costs ${Utils.format.credits(this.GENESIS_COST)}`
            };
        }

        // Check if sector is valid
        const canColonize = this.canColonize(galaxy, sectorId);
        if (!canColonize.valid) {
            return {
                success: false,
                error: canColonize.reason
            };
        }

        // Check player colony limit
        const colonies = this.load();
        const playerColonies = Object.values(colonies).filter(c => c.owner === owner);

        if (playerColonies.length >= this.MAX_COLONIES_PER_PLAYER) {
            return {
                success: false,
                error: `Maximum ${this.MAX_COLONIES_PER_PLAYER} colonies per player`
            };
        }

        // Generate colony planet
        const rng = new Utils.SeededRandom(`colony_${sectorId}_${Date.now()}`);

        const planetTypes = [
            { name: 'Desert', specialty: 'Ore', emoji: '🏜️' },
            { name: 'Forest', specialty: 'Organics', emoji: '🌲' },
            { name: 'Industrial', specialty: 'Equipment', emoji: '🏭' },
            { name: 'Ocean', specialty: 'Organics', emoji: '🌊' },
            { name: 'Rocky', specialty: 'Ore', emoji: '🪨' },
            { name: 'Urban', specialty: 'Equipment', emoji: '🏙️' }
        ];

        const type = rng.choice(planetTypes);

        const planet = {
            type: 'planet',
            name: `${pilotName}'s ${type.name} Colony`,
            planetType: type.name,
            emoji: type.emoji,
            specialty: type.specialty,
            economy: {},
            population: 1000, // Start small
            techLevel: 1,
            isColony: true,
            owner: owner,
            messageBoard: true
        };

        // Generate basic economy
        for (const commodity of CONSTANTS.COMMODITIES) {
            if (commodity === 'Contraband') continue; // No contraband on colonies initially

            const economyData = CONSTANTS.ECONOMY[commodity];
            let price = economyData.basePrice;

            if (commodity === type.specialty) {
                price *= 0.7;
            }

            planet.economy[commodity] = {
                buyPrice: Math.round(price * 1.2),
                sellPrice: Math.round(price * 0.8),
                supply: 100 // Limited initial supply
            };
        }

        // Add planet to sector
        const sector = galaxy.getSector(sectorId);
        sector.contents.push(planet);

        // Save galaxy
        Utils.storage.set('galaxy', galaxy.data);

        // Create colony record
        const colony = {
            id: Utils.generateId(),
            sectorId: sectorId,
            owner: owner,
            pilotName: pilotName,
            planetName: planet.name,
            created: Date.now(),
            level: 1,
            population: 1000,
            income: this.INCOME_PER_TICK,
            lastCollection: Date.now(),
            upgrades: {
                population: 0,
                income: 0,
                defense: 0,
                production: 0
            },
            totalEarned: 0
        };

        colonies[colony.id] = colony;
        this.save(colonies);

        return {
            success: true,
            cost: this.GENESIS_COST,
            colony: colony,
            planet: planet
        };
    }

    // Collect income from colony
    collectIncome(colonyId, owner) {
        const colonies = this.load();
        const colony = colonies[colonyId];

        if (!colony) {
            return { success: false, error: 'Colony not found' };
        }

        if (colony.owner !== owner) {
            return { success: false, error: 'Not your colony' };
        }

        // Calculate income since last collection
        const now = Date.now();
        const timeSinceCollection = now - colony.lastCollection;
        const daysElapsed = timeSinceCollection / (24 * 60 * 60 * 1000);

        // Income per day
        const income = Math.floor(colony.income * daysElapsed);

        if (income <= 0) {
            return { success: false, error: 'No income available yet' };
        }

        // Update colony
        colony.lastCollection = now;
        colony.totalEarned += income;

        this.save(colonies);

        return {
            success: true,
            income: income,
            daysElapsed: daysElapsed.toFixed(2),
            totalEarned: colony.totalEarned
        };
    }

    // Upgrade colony
    upgradeColony(colonyId, owner, upgradeType, credits) {
        const colonies = this.load();
        const colony = colonies[colonyId];

        if (!colony) {
            return { success: false, error: 'Colony not found' };
        }

        if (colony.owner !== owner) {
            return { success: false, error: 'Not your colony' };
        }

        const currentLevel = colony.upgrades[upgradeType] || 0;
        const cost = Math.floor(1000 * Math.pow(this.UPGRADE_COST_MULTIPLIER, currentLevel));

        if (credits < cost) {
            return {
                success: false,
                error: `Not enough credits! Upgrade costs ${Utils.format.credits(cost)}`
            };
        }

        // Apply upgrade effects
        colony.upgrades[upgradeType]++;

        switch (upgradeType) {
            case 'population':
                colony.population += 5000;
                break;
            case 'income':
                colony.income += 50;
                break;
            case 'defense':
                // Defensive upgrades (for future fighter integration)
                break;
            case 'production':
                // Production upgrades (increases supply in economy)
                break;
        }

        colony.level = Math.max(...Object.values(colony.upgrades)) + 1;

        this.save(colonies);

        return {
            success: true,
            cost: cost,
            upgradeType: upgradeType,
            newLevel: colony.upgrades[upgradeType],
            colonyLevel: colony.level
        };
    }

    // Abandon colony
    abandonColony(galaxy, colonyId, owner) {
        const colonies = this.load();
        const colony = colonies[colonyId];

        if (!colony) {
            return { success: false, error: 'Colony not found' };
        }

        if (colony.owner !== owner) {
            return { success: false, error: 'Not your colony' };
        }

        // Remove planet from sector
        const sector = galaxy.getSector(colony.sectorId);
        if (sector) {
            sector.contents = sector.contents.filter(c =>
                !(c.isColony && c.owner === owner)
            );
            Utils.storage.set('galaxy', galaxy.data);
        }

        // Remove colony record
        delete colonies[colonyId];
        this.save(colonies);

        return {
            success: true,
            refund: Math.floor(this.GENESIS_COST * 0.5) // 50% refund
        };
    }

    // Get player's colonies
    getPlayerColonies(owner) {
        const colonies = this.load();
        return Object.values(colonies).filter(c => c.owner === owner);
    }

    // Get colony by ID
    getColony(colonyId) {
        const colonies = this.load();
        return colonies[colonyId] || null;
    }

    // Get colony in sector
    getColonyInSector(sectorId, owner) {
        const colonies = this.load();
        return Object.values(colonies).find(c =>
            c.sectorId === sectorId && c.owner === owner
        );
    }

    // Calculate pending income for all player colonies
    getPendingIncome(owner) {
        const colonies = this.getPlayerColonies(owner);
        let totalPending = 0;
        const now = Date.now();

        colonies.forEach(colony => {
            const timeSinceCollection = now - colony.lastCollection;
            const daysElapsed = timeSinceCollection / (24 * 60 * 60 * 1000);
            const income = Math.floor(colony.income * daysElapsed);
            totalPending += income;
        });

        return totalPending;
    }

    // Collect all income from all colonies
    collectAllIncome(owner) {
        const colonies = this.getPlayerColonies(owner);
        let totalIncome = 0;
        const results = [];

        colonies.forEach(colony => {
            const result = this.collectIncome(colony.id, owner);
            if (result.success) {
                totalIncome += result.income;
                results.push({
                    colonyId: colony.id,
                    name: colony.planetName,
                    income: result.income
                });
            }
        });

        return {
            success: totalIncome > 0,
            totalIncome: totalIncome,
            coloniesCollected: results.length,
            details: results
        };
    }

    // Get colony statistics
    getColonyStats(owner) {
        const colonies = this.getPlayerColonies(owner);

        return {
            totalColonies: colonies.length,
            maxColonies: this.MAX_COLONIES_PER_PLAYER,
            totalPopulation: colonies.reduce((sum, c) => sum + c.population, 0),
            totalIncome: colonies.reduce((sum, c) => sum + c.income, 0),
            totalEarned: colonies.reduce((sum, c) => sum + c.totalEarned, 0),
            pendingIncome: this.getPendingIncome(owner),
            averageLevel: colonies.length > 0
                ? (colonies.reduce((sum, c) => sum + c.level, 0) / colonies.length).toFixed(1)
                : 0
        };
    }
}

export default ColonizationSystem;
