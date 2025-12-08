// Ad Astra - Admin Controls
// admin.js - Sysop/admin panel functionality

import { Utils, CONSTANTS } from './utils.js';

export class AdminPanel {
    constructor(gameState, galaxy) {
        this.gameState = gameState;
        this.galaxy = galaxy;
    }

    // Generate new galaxy
    async generateGalaxy(size) {
        if (size < CONSTANTS.GALAXY.MIN_SIZE || size > CONSTANTS.GALAXY.MAX_SIZE) {
            return {
                success: false,
                error: `Galaxy size must be between ${CONSTANTS.GALAXY.MIN_SIZE} and ${CONSTANTS.GALAXY.MAX_SIZE}`
            };
        }

        const confirmed = confirm(`Generate new galaxy with ${size} sectors? This will reset ALL player progress!`);
        if (!confirmed) {
            return { success: false, error: 'Cancelled by user' };
        }

        // Reset all players on server first
        try {
            const response = await fetch('/api/adastra/admin/reset-galaxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.gameState.auth.token || ''}`
                }
            });
            const result = await response.json();
            console.log('🔄 Player reset result:', result);
        } catch (error) {
            console.error('Failed to reset players on server:', error);
        }

        // Generate new galaxy
        this.galaxy.generate(size);
        this.gameState.settings.galaxySize = size;
        this.gameState.save();

        return { success: true, size: size, message: 'Galaxy regenerated. All players reset to Sector 1.' };
    }

    // Update game settings
    updateSettings(settings) {
        const errors = [];

        if (settings.turnsPerDay) {
            if (settings.turnsPerDay < 10 || settings.turnsPerDay > 500) {
                errors.push('Turns per day must be between 10 and 500');
            } else {
                this.gameState.settings.turnsPerDay = settings.turnsPerDay;
            }
        }

        if (errors.length > 0) {
            return { success: false, errors: errors };
        }

        this.gameState.save();
        return { success: true };
    }

    // Get game statistics (uses server API now)
    async getGameStats() {
        try {
            const response = await fetch('/api/adastra/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${this.gameState.auth?.token || ''}`
                }
            });
            const serverStats = await response.json();
            const galaxyStats = this.galaxy.getStats();

            return {
                totalPlayers: serverStats.totalPlayers || 0,
                totalUsers: serverStats.totalPlayers || 0,
                activeSessions: serverStats.activeSessions || 0,
                galaxy: galaxyStats,
                topPlayers: [], // Would need separate API call
                settings: this.gameState.settings
            };
        } catch (error) {
            console.error('Failed to get game stats:', error);
            return {
                totalPlayers: 0,
                totalUsers: 0,
                galaxy: this.galaxy.getStats(),
                topPlayers: [],
                settings: this.gameState.settings
            };
        }
    }

    // Give credits to player (admin cheat)
    giveCredits(username, amount) {
        const playerData = Utils.storage.get(`player_${username}`);
        if (!playerData) {
            return { success: false, error: 'Player not found' };
        }

        playerData.credits += amount;
        Utils.storage.set(`player_${username}`, playerData);

        return { success: true, newBalance: playerData.credits };
    }

    // Teleport player to sector
    teleportPlayer(username, sectorId) {
        const playerData = Utils.storage.get(`player_${username}`);
        if (!playerData) {
            return { success: false, error: 'Player not found' };
        }

        if (!this.galaxy.getSector(sectorId)) {
            return { success: false, error: 'Invalid sector' };
        }

        playerData.currentSector = sectorId;
        Utils.storage.set(`player_${username}`, playerData);

        return { success: true };
    }

    // Reset player data
    resetPlayer(username) {
        const confirmed = confirm(`Reset ${username}'s character? This cannot be undone!`);
        if (!confirmed) {
            return { success: false, error: 'Cancelled' };
        }

        Utils.storage.remove(`player_${username}`);
        return { success: true };
    }

    // Refresh economy prices
    refreshEconomy() {
        this.galaxy.updateEconomy();
        return { success: true, message: 'Economy prices updated' };
    }

    // Export game data
    exportData() {
        // Note: Full player export would need server API
        const data = {
            galaxy: this.galaxy.data,
            settings: this.gameState.settings,
            users: {}, // Server-side now, would need API call
            timestamp: Date.now(),
            note: 'Player data is stored server-side. Use /api/admin/players to export.'
        };

        return data;
    }

    // Import game data
    importData(data) {
        try {
            if (data.galaxy) {
                Utils.storage.set('galaxy', data.galaxy);
                this.galaxy.load();
            }

            if (data.settings) {
                Utils.storage.set('gameSettings', data.settings);
            }

            if (data.users) {
                for (const [username, playerData] of Object.entries(data.users)) {
                    Utils.storage.set(`player_${username}`, playerData);
                }
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // Get server maintenance mode status (future feature)
    getMaintenanceMode() {
        return Utils.storage.get('maintenanceMode', false);
    }

    // Set maintenance mode
    setMaintenanceMode(enabled) {
        Utils.storage.set('maintenanceMode', enabled);
        return { success: true, enabled: enabled };
    }
    
    // Get all players with full data (from server)
    async getAllPlayers() {
        try {
            const response = await fetch('/api/adastra/admin/players', {
                headers: {
                    'Authorization': `Bearer ${this.gameState.auth?.token || ''}`
                }
            });
            const data = await response.json();
            if (data.players) {
                return data.players.map(p => ({
                    username: p.username,
                    pilotName: p.pilotName,
                    credits: p.credits,
                    turns: p.turns,
                    sector: p.currentSector,
                    hull: p.hull || 100,
                    fuel: p.fuel || 100,
                    lastActivity: p.lastActivity,
                    isBanned: p.isBanned
                }));
            }
            return [];
        } catch (error) {
            console.error('Failed to fetch players:', error);
            return [];
        }
    }

    // Get single player data
    getPlayer(username) {
        const playerData = Utils.storage.get(`player_${username}`);
        if (!playerData) return null;

        return {
            username: username,
            pilotName: playerData.pilotName,
            credits: playerData.credits,
            turns: playerData.turns,
            sector: playerData.currentSector,
            hull: playerData.ship.hull,
            fuel: playerData.ship.fuel
        };
    }

    // Update player data via server API
    async updatePlayer(username, updates) {
        try {
            // Build the update payload
            const payload = {};
            if (updates.credits !== undefined) payload.credits = updates.credits;
            if (updates.turns !== undefined) payload.turns = updates.turns;
            if (updates.sector !== undefined) payload.currentSector = updates.sector;
            if (updates.hull !== undefined) payload.hull = updates.hull;
            if (updates.fuel !== undefined) payload.fuel = updates.fuel;
            
            const token = this.gameState.auth.getToken();
            const response = await fetch(`/api/admin/player/${username}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { success: false, error: result.error || 'Failed to update player' };
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error updating player:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete player
    deletePlayer(username) {
        // Remove player data
        Utils.storage.remove(`player_${username}`);

        // Remove from auth system (this requires accessing AuthSystem internals or adding a method there)
        // For now, we'll just remove the user from the auth list if possible, or just the data
        // Ideally AuthSystem should have a deleteUser method.
        // Let's check if we can access the auth users list directly or via a method.
        // The AuthSystem is passed in gameState.auth

        if (this.gameState.auth.adminDeleteAccount) {
            this.gameState.auth.adminDeleteAccount(username);
        } else {
            // Fallback if adminDeleteAccount doesn't exist
            const users = Utils.storage.get('users', {});
            delete users[username];
            Utils.storage.set('users', users);
        }

        return { success: true };
    }
}

export default AdminPanel;