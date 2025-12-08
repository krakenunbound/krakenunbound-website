// Ad Astra - Mining System
// mining.js - Handles asteroid mining mechanics

class MiningSystem {
    constructor(game) {
        this.game = game;
        
        // Mining equipment available for purchase
        this.EQUIPMENT = {
            'mining_laser_1': {
                name: 'Basic Mining Laser',
                level: 1,
                price: 5000,
                description: 'Entry-level mining equipment. Extracts 5-15 ore per operation.'
            },
            'mining_laser_2': {
                name: 'Advanced Mining Laser',
                level: 2,
                price: 15000,
                description: 'Improved mining efficiency. 50% more ore yield.'
            },
            'mining_laser_3': {
                name: 'Industrial Mining Array',
                level: 3,
                price: 40000,
                description: 'Top-tier mining equipment. Double ore yield.'
            }
        };
    }

    // Check if player can mine
    canMine() {
        const ship = this.game.gameState.gameData.ship;
        
        // Check if ship has mining equipment
        if (!ship.equipment || !ship.equipment.miningLaser) {
            return { canMine: false, reason: 'No mining equipment installed' };
        }

        // Check cargo space
        const cargoUsed = this.game.gameState.getCargoAmount();
        const cargoAvailable = ship.cargoMax - cargoUsed;
        
        if (cargoAvailable <= 0) {
            return { canMine: false, reason: 'Cargo hold is full' };
        }

        return { canMine: true, cargoAvailable };
    }

    // Mine asteroids in current sector
    async mineAsteroids() {
        const check = this.canMine();
        
        if (!check.canMine) {
            this.game.ui.showError(check.reason);
            return false;
        }

        // Show mining animation/message
        this.game.ui.showMessage('⛏️ Mining asteroid field...');
        
        // Calculate ore yield
        const ship = this.game.gameState.gameData.ship;
        const miningLevel = ship.equipment.miningLaser.level || 1;
        
        // Base yield: 5-15 ore per mining operation
        const baseYield = Math.floor(Math.random() * 11) + 5;
        const multiplier = 1 + ((miningLevel - 1) * 0.5); // Level 1: 1x, Level 2: 1.5x, Level 3: 2x
        let oreYield = Math.floor(baseYield * multiplier);
        
        // Cap by available cargo space
        oreYield = Math.min(oreYield, check.cargoAvailable);
        
        // Add ore to cargo
        const cargo = this.game.gameState.gameData.cargo;
        cargo.Ore = (cargo.Ore || 0) + oreYield;
        
        // Consume turns (mining takes time)
        const turnCost = 2;
        this.game.gameState.gameData.turns = Math.max(0, this.game.gameState.gameData.turns - turnCost);
        
        // Small chance of equipment degradation (future feature)
        // if (Math.random() < 0.05) { ... }
        
        // Save progress
        this.game.gameState.save();
        
        // Update UI
        this.game.ui.updateAll(this.game.gameState.gameData);
        this.game.ui.showSuccess(`⛏️ Mined ${oreYield} units of Ore! (${turnCost} turns used)`);
        
        // Play sound effect
        this.game.audio.playSfx('trade'); // Reuse trade sound for now
        
        return true;
    }

    // Get mining equipment options for purchase
    static getMiningEquipment() {
        return [
            {
                id: 'mining_laser_1',
                name: 'Basic Mining Laser',
                type: 'miningLaser',
                level: 1,
                cost: 5000,
                description: 'Entry-level mining equipment. Extracts 5-15 ore per operation.'
            },
            {
                id: 'mining_laser_2',
                name: 'Advanced Mining Laser',
                type: 'miningLaser',
                level: 2,
                cost: 15000,
                description: 'Improved mining efficiency. 50% more ore yield.'
            },
            {
                id: 'mining_laser_3',
                name: 'Industrial Mining Array',
                type: 'miningLaser',
                level: 3,
                cost: 40000,
                description: 'Top-tier mining equipment. Double ore yield.'
            }
        ];
    }

    // Purchase and install mining equipment
    purchaseMiningEquipment(equipmentKey) {
        const equipment = this.EQUIPMENT[equipmentKey];
        
        if (!equipment) {
            return { success: false, error: 'Equipment not found' };
        }

        const gameData = this.game.gameState.gameData;
        
        // Check credits
        if (gameData.credits < equipment.price) {
            return { success: false, error: `Not enough credits! Need ${equipment.price}, have ${gameData.credits}` };
        }

        // Initialize equipment object if it doesn't exist
        if (!gameData.ship.equipment) {
            gameData.ship.equipment = {};
        }

        // Install equipment
        gameData.ship.equipment.miningLaser = {
            name: equipment.name,
            level: equipment.level
        };

        // Deduct credits
        gameData.credits -= equipment.price;

        // Save
        this.game.gameState.save();

        return { success: true, equipment: equipment.name };
    }
}

export default MiningSystem;