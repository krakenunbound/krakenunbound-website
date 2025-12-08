// Ad Astra - Multiplayer System
// Handles player presence, tracking, and interaction

import { Utils } from './utils.js';

class MultiplayerSystem {
    constructor() {
        this.STORAGE_KEY = 'multiplayer_players';
        this.ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        this.players = new Map();
        this.currentPlayer = null;
    }

    // Initialize player in multiplayer system
    registerPlayer(username, pilotName, ship, currentSector) {
        const player = {
            username,
            pilotName,
            ship: {
                name: ship.name,
                hull: ship.hull,
                maxHull: ship.maxHull,
                class: ship.class
            },
            currentSector,
            lastSeen: Date.now(),
            kills: 0,
            deaths: 0,
            credits: 0,
            status: 'active', // active, docked, combat, dead
            joinedAt: Date.now()
        };

        this.players.set(username, player);
        this.currentPlayer = username;
        this.save();
        return player;
    }

    // Update player position
    updatePosition(username, sectorId) {
        const player = this.players.get(username);
        if (player) {
            player.currentSector = sectorId;
            player.lastSeen = Date.now();
            this.save();
        }
    }

    // Update player status
    updateStatus(username, status, data = {}) {
        const player = this.players.get(username);
        if (player) {
            player.status = status;
            player.lastSeen = Date.now();
            Object.assign(player, data);
            this.save();
        }
    }

    // Get players in a specific sector
    getPlayersInSector(sectorId) {
        this.cleanupInactivePlayers();
        const playersInSector = [];

        for (const [username, player] of this.players) {
            if (player.currentSector === sectorId && username !== this.currentPlayer) {
                // Check if player is still active
                if (Date.now() - player.lastSeen < this.ACTIVITY_TIMEOUT) {
                    playersInSector.push(player);
                }
            }
        }

        return playersInSector;
    }

    // Get players at a location (planet/station)
    getPlayersAtLocation(sectorId, locationType = null) {
        const playersInSector = this.getPlayersInSector(sectorId);

        // If location type specified, filter by docked status
        if (locationType) {
            return playersInSector.filter(p => p.status === 'docked');
        }

        return playersInSector;
    }

    // Get all active players
    getActivePlayers() {
        this.cleanupInactivePlayers();
        const active = [];

        for (const [username, player] of this.players) {
            if (Date.now() - player.lastSeen < this.ACTIVITY_TIMEOUT) {
                active.push(player);
            }
        }

        return active.sort((a, b) => b.lastSeen - a.lastSeen);
    }

    // Get player by username
    getPlayer(username) {
        return this.players.get(username);
    }

    // Record player kill
    recordKill(attackerUsername, victimUsername) {
        const attacker = this.players.get(attackerUsername);
        const victim = this.players.get(victimUsername);

        if (attacker) {
            attacker.kills = (attacker.kills || 0) + 1;
            attacker.lastSeen = Date.now();
        }

        if (victim) {
            victim.deaths = (victim.deaths || 0) + 1;
            victim.status = 'dead';
            victim.lastSeen = Date.now();
        }

        this.save();
    }

    // Get leaderboard
    getLeaderboard(sortBy = 'kills') {
        const active = this.getActivePlayers();

        switch (sortBy) {
            case 'kills':
                return active.sort((a, b) => (b.kills || 0) - (a.kills || 0));
            case 'credits':
                return active.sort((a, b) => (b.credits || 0) - (a.credits || 0));
            case 'kd':
                return active.sort((a, b) => {
                    const kdA = (a.kills || 0) / Math.max(a.deaths || 1, 1);
                    const kdB = (b.kills || 0) / Math.max(b.deaths || 1, 1);
                    return kdB - kdA;
                });
            default:
                return active;
        }
    }

    // Get nearby players (within N jumps)
    getNearbyPlayers(currentSector, galaxy, maxJumps = 3) {
        const nearby = [];
        const visited = new Set([currentSector]);
        const queue = [[currentSector, 0]];

        while (queue.length > 0) {
            const [sectorId, distance] = queue.shift();

            if (distance > maxJumps) continue;

            // Check for players in this sector
            const playersHere = this.getPlayersInSector(sectorId);
            playersHere.forEach(player => {
                nearby.push({ ...player, distance });
            });

            // Add connected sectors to queue
            if (distance < maxJumps) {
                const sector = galaxy.getSector(sectorId);
                if (sector) {
                    for (const warp of sector.warps) {
                        if (!visited.has(warp)) {
                            visited.add(warp);
                            queue.push([warp, distance + 1]);
                        }
                    }
                }
            }
        }

        return nearby.sort((a, b) => a.distance - b.distance);
    }

    // Check if player can initiate combat with another player
    canAttack(attackerSector, targetPlayer, galaxy) {
        // Can only attack players in same sector
        if (attackerSector !== targetPlayer.currentSector) {
            return { can: false, reason: 'Target not in your sector' };
        }

        // Can't attack docked players at military ports
        if (targetPlayer.status === 'docked') {
            const sector = galaxy.getSector(attackerSector);
            if (sector) {
                const station = sector.contents.find(c =>
                    c.type === 'station' && c.class === 'Military'
                );
                if (station) {
                    return { can: false, reason: 'Cannot attack at military outpost' };
                }
            }
        }

        // Can't attack if target is already in combat
        if (targetPlayer.status === 'combat') {
            return { can: false, reason: 'Target already in combat' };
        }

        return { can: true };
    }

    // Clean up inactive players
    cleanupInactivePlayers() {
        const now = Date.now();
        for (const [username, player] of this.players) {
            if (now - player.lastSeen > this.ACTIVITY_TIMEOUT * 4) {
                // Remove very old players (2 hours)
                this.players.delete(username);
            }
        }
    }

    // Load player data from storage
    load() {
        try {
            const data = Utils.storage.get(this.STORAGE_KEY);
            if (data) {
                this.players = new Map(Object.entries(data));
                return true;
            }
        } catch (error) {
            console.error('Failed to load multiplayer data:', error);
        }
        return false;
    }

    // Save player data to storage
    save() {
        try {
            const data = Object.fromEntries(this.players);
            Utils.storage.set(this.STORAGE_KEY, data);
            return true;
        } catch (error) {
            console.error('Failed to save multiplayer data:', error);
            return false;
        }
    }

    // Reset multiplayer system (admin only)
    reset() {
        this.players.clear();
        this.save();
    }

    // Get player count statistics
    getStats() {
        const active = this.getActivePlayers();
        const now = Date.now();

        const recentlyActive = active.filter(p => now - p.lastSeen < 5 * 60 * 1000); // 5 min
        const inCombat = active.filter(p => p.status === 'combat');
        const docked = active.filter(p => p.status === 'docked');

        return {
            total: this.players.size,
            active: active.length,
            recentlyActive: recentlyActive.length,
            inCombat: inCombat.length,
            docked: docked.length
        };
    }
}

export default MultiplayerSystem;
