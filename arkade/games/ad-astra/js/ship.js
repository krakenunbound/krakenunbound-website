// Ad Astra - Ship Management
// ship.js - Ship types, upgrades, and operations

import { CONSTANTS } from './utils.js';

export class ShipManager {
    static SHIP_TYPES = {
        scout: {
            name: 'Void Runner',
            description: 'Fast and fuel-efficient, but limited cargo and weapons',
            cost: 0,
            hullMax: 100,
            cargoMax: 50,
            fuelMax: 120,
            shieldsMax: 50,
            weaponsMax: 20,
            speed: 1.2
        },
        trader: {
            name: 'Star Hauler',
            description: 'Large cargo capacity, decent defenses',
            cost: 50000,
            hullMax: 150,
            cargoMax: 200,
            fuelMax: 100,
            shieldsMax: 75,
            weaponsMax: 30,
            speed: 0.8
        },
        fighter: {
            name: 'Nebula Hunter',
            description: 'Combat-focused with strong weapons and shields',
            cost: 75000,
            hullMax: 200,
            cargoMax: 40,
            fuelMax: 90,
            shieldsMax: 150,
            weaponsMax: 100,
            speed: 1.1
        },
        explorer: {
            name: 'Deep Space Vanguard',
            description: 'Balanced ship for long journeys',
            cost: 60000,
            hullMax: 130,
            cargoMax: 100,
            fuelMax: 150,
            shieldsMax: 80,
            weaponsMax: 50,
            speed: 1.0
        }
    };

    static UPGRADES = {
        hull: {
            name: 'Hull Reinforcement',
            description: 'Increase maximum hull points',
            baseCost: 5000,
            increment: 10,
            maxLevel: 10
        },
        cargo: {
            name: 'Cargo Expansion',
            description: 'Increase cargo capacity',
            baseCost: 8000,
            increment: 20,
            maxLevel: 10
        },
        shields: {
            name: 'Shield Generator',
            description: 'Increase maximum shields',
            baseCost: 7000,
            increment: 15,
            maxLevel: 10
        },
        weapons: {
            name: 'Weapon System',
            description: 'Increase weapon power',
            baseCost: 10000,
            increment: 10,
            maxLevel: 10
        },
        fuel: {
            name: 'Fuel Tank',
            description: 'Increase fuel capacity',
            baseCost: 3000,
            increment: 20,
            maxLevel: 5
        }
    };

    // Get ship type info
    static getShipType(typeName) {
        return this.SHIP_TYPES[typeName] || null;
    }

    // Create new ship instance
    static createShip(typeName) {
        const type = this.getShipType(typeName);
        if (!type) return null;

        return {
            name: type.name,
            type: typeName,
            hullMax: type.hullMax,
            hull: type.hullMax,
            cargoMax: type.cargoMax,
            cargo: 0,
            fuelMax: type.fuelMax,
            fuel: type.fuelMax,
            shields: type.shieldsMax,
            shieldsMax: type.shieldsMax,
            weapons: type.weaponsMax,
            weaponsMax: type.weaponsMax,
            speed: type.speed,
            upgrades: {
                hull: 0,
                cargo: 0,
                shields: 0,
                weapons: 0,
                fuel: 0
            },
            // Equipment sockets - null means empty
            equipment: {
                miningLaser: null,    // Mining equipment for asteroid harvesting
                scanner: null,        // Future: scanning equipment
                tractor: null         // Future: tractor beam
            }
        };
    }

    // Calculate upgrade cost
    static getUpgradeCost(upgradeType, currentLevel) {
        const upgrade = this.UPGRADES[upgradeType];
        if (!upgrade) return null;

        if (currentLevel >= upgrade.maxLevel) return null;

        // Cost increases with each level
        return Math.round(upgrade.baseCost * Math.pow(1.5, currentLevel));
    }

    // Apply upgrade to ship
    static applyUpgrade(ship, upgradeType) {
        const upgrade = this.UPGRADES[upgradeType];
        if (!upgrade) return false;

        const currentLevel = ship.upgrades[upgradeType] || 0;
        if (currentLevel >= upgrade.maxLevel) return false;

        ship.upgrades[upgradeType] = currentLevel + 1;

        // Apply upgrade effects
        switch (upgradeType) {
            case 'hull':
                ship.hullMax += upgrade.increment;
                ship.hull = ship.hullMax; // Full repair
                break;
            case 'cargo':
                ship.cargoMax += upgrade.increment;
                break;
            case 'shields':
                ship.shieldsMax += upgrade.increment;
                ship.shields = ship.shieldsMax; // Full recharge
                break;
            case 'weapons':
                ship.weaponsMax += upgrade.increment;
                ship.weapons = ship.weaponsMax;
                break;
            case 'fuel':
                ship.fuelMax += upgrade.increment;
                ship.fuel = ship.fuelMax; // Full refuel
                break;
        }

        return true;
    }

    // Get ship condition description
    static getCondition(ship) {
        const hullPercent = (ship.hull / ship.hullMax) * 100;

        if (hullPercent >= 90) return { status: 'Excellent', color: 'green' };
        if (hullPercent >= 70) return { status: 'Good', color: 'green' };
        if (hullPercent >= 50) return { status: 'Fair', color: 'yellow' };
        if (hullPercent >= 30) return { status: 'Poor', color: 'yellow' };
        if (hullPercent >= 10) return { status: 'Critical', color: 'red' };
        return { status: 'Dying', color: 'red' };
    }

    // Calculate repair cost
    static getRepairCost(ship, repairAmount) {
        const costPerPoint = 5;
        const maxRepair = ship.hullMax - ship.hull;
        const actualRepair = Math.min(repairAmount, maxRepair);
        return actualRepair * costPerPoint;
    }

    // Calculate refuel cost
    static getRefuelCost(ship, refuelAmount) {
        const costPerPoint = 2;
        const maxRefuel = ship.fuelMax - ship.fuel;
        const actualRefuel = Math.min(refuelAmount, maxRefuel);
        return actualRefuel * costPerPoint;
    }

    // Get ship stats summary
    static getStats(ship) {
        return {
            hull: `${ship.hull}/${ship.hullMax}`,
            hullPercent: Math.round((ship.hull / ship.hullMax) * 100),
            shields: `${ship.shields}/${ship.shieldsMax}`,
            shieldsPercent: Math.round((ship.shields / ship.shieldsMax) * 100),
            weapons: `${ship.weapons}/${ship.weaponsMax}`,
            cargo: `${ship.cargo}/${ship.cargoMax}`,
            cargoPercent: Math.round((ship.cargo / ship.cargoMax) * 100),
            fuel: `${ship.fuel}/${ship.fuelMax}`,
            fuelPercent: Math.round((ship.fuel / ship.fuelMax) * 100),
            condition: this.getCondition(ship)
        };
    }

    // Check if ship can warp
    static canWarp(ship, fuelCost = 1) {
        return ship.fuel >= fuelCost;
    }

    // Consume fuel
    static useFuel(ship, amount) {
        ship.fuel = Math.max(0, ship.fuel - amount);
        return ship.fuel > 0;
    }

    // Calculate fuel cost based on distance
    static calculateFuelCost(distance) {
        // Base cost is 1 fuel per 10 distance units, minimum 1
        return Math.max(1, Math.floor(distance / 5));
    }

    // Calculate travel time in milliseconds
    static calculateTravelTime(distance, speed) {
        // Old-school BBS door game pacing: deliberate, meaningful travel
        // Minimum 10 seconds per jump to create immersion and anticipation
        // Scales up for longer distances so multi-jump routes feel significant
        // Example: Distance 5, Speed 1.0 -> 10,000ms (10 sec minimum)
        // Example: Distance 50, Speed 1.0 -> 15,000ms (scaled for long journey)
        // Example: Distance 100, Speed 1.2 -> 18,333ms (scaled + speed bonus)

        const baseTime = Math.round((distance * 150) / speed); // Slower base calculation
        return Math.max(10000, baseTime); // 10 second minimum
    }

    // Get all available ship types
    static getAllShipTypes() {
        return Object.entries(this.SHIP_TYPES).map(([key, type]) => ({
            id: key,
            ...type
        }));
    }

    // Get available upgrades for ship
    static getAvailableUpgrades(ship) {
        return Object.entries(this.UPGRADES).map(([key, upgrade]) => {
            const currentLevel = ship.upgrades[key] || 0;
            const cost = this.getUpgradeCost(key, currentLevel);

            return {
                id: key,
                ...upgrade,
                currentLevel: currentLevel,
                cost: cost,
                available: cost !== null
            };
        });
    }
}

export default ShipManager;
