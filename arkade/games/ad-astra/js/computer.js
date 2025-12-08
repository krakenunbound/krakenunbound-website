// Ad Astra - Computer Interface System
// computer.js - Intel gathering, sector scanning, and information management

import { Utils } from './utils.js';
import { NavigationComputer } from './navigation.js';

export class ComputerSystem {
    constructor() {
        this.scanHistory = [];
        this.bookmarks = [];
        this.notes = {};
    }

    // Initialize from storage
    load(username) {
        const data = Utils.storage.get(`computer_${username}`) || {};
        this.scanHistory = data.scanHistory || [];
        this.bookmarks = data.bookmarks || [];
        this.notes = data.notes || {};
    }

    // Save to storage
    save(username) {
        Utils.storage.set(`computer_${username}`, {
            scanHistory: this.scanHistory,
            bookmarks: this.bookmarks,
            notes: this.notes
        });
    }

    // Perform detailed sector scan
    scanSector(galaxy, sectorId) {
        const sector = galaxy.getSector(sectorId);
        if (!sector) return null;

        const scan = {
            id: sectorId,
            timestamp: Date.now(),
            x: sector.x,
            y: sector.y,
            warps: sector.warps.length,
            warpConnections: [...sector.warps],
            contents: sector.contents.map(c => ({
                type: c.type,
                name: c.name,
                class: c.class,
                icon: c.icon,
                description: c.description,
                specialty: c.specialty,
                population: c.population,
                services: c.services
            })),
            isEmpty: sector.contents.length === 0
        };

        // Add to scan history (limit to last 50 scans)
        this.scanHistory.unshift(scan);
        if (this.scanHistory.length > 50) {
            this.scanHistory.pop();
        }

        return scan;
    }

    // Get galaxy statistics and analysis
    analyzeGalaxy(galaxy) {
        if (!galaxy || !galaxy.data) return null;

        const sectors = Object.values(galaxy.data.sectors);

        // Port type distribution
        const portTypes = {};
        const planetTypes = {};
        let totalPlanets = 0;
        let totalStations = 0;
        let totalDebris = 0;
        let emptySectors = 0;

        sectors.forEach(sector => {
            if (sector.contents.length === 0) {
                emptySectors++;
                return;
            }

            sector.contents.forEach(content => {
                if (content.type === 'planet') {
                    totalPlanets++;
                    planetTypes[content.planetType] = (planetTypes[content.planetType] || 0) + 1;
                } else if (content.type === 'station') {
                    totalStations++;
                    portTypes[content.class] = (portTypes[content.class] || 0) + 1;
                } else if (content.type === 'debris') {
                    totalDebris++;
                }
            });
        });

        // Calculate connectivity stats
        const connections = sectors.map(s => s.warps.length);
        const avgConnections = connections.reduce((a, b) => a + b, 0) / sectors.length;
        const minConnections = Math.min(...connections);
        const maxConnections = Math.max(...connections);

        return {
            size: galaxy.data.size,
            seed: galaxy.data.seed,
            created: galaxy.data.created,
            sectors: {
                total: sectors.length,
                withContent: sectors.length - emptySectors,
                empty: emptySectors,
                percentEmpty: ((emptySectors / sectors.length) * 100).toFixed(1)
            },
            contents: {
                planets: totalPlanets,
                stations: totalStations,
                debris: totalDebris
            },
            portTypes: portTypes,
            planetTypes: planetTypes,
            connectivity: {
                average: avgConnections.toFixed(2),
                min: minConnections,
                max: maxConnections
            }
        };
    }

    // Find all sectors of specific type
    findSectorsByType(galaxy, contentType, options = {}) {
        if (!galaxy || !galaxy.data) return [];

        const results = [];

        Object.values(galaxy.data.sectors).forEach(sector => {
            sector.contents.forEach(content => {
                let matches = false;

                if (contentType === 'any') {
                    matches = true;
                } else if (content.type === contentType) {
                    // Additional filtering
                    if (options.portClass && content.class !== options.portClass) {
                        return;
                    }
                    if (options.planetType && content.planetType !== options.planetType) {
                        return;
                    }
                    matches = true;
                }

                if (matches) {
                    results.push({
                        sectorId: sector.id,
                        x: sector.x,
                        y: sector.y,
                        content: content,
                        warps: sector.warps.length
                    });
                }
            });
        });

        return results;
    }

    // Bookmark a sector
    addBookmark(sectorId, name, notes = '') {
        const bookmark = {
            id: Utils.generateId(),
            sectorId: sectorId,
            name: name,
            notes: notes,
            created: Date.now()
        };

        this.bookmarks.push(bookmark);
        return bookmark;
    }

    // Remove bookmark
    removeBookmark(bookmarkId) {
        const index = this.bookmarks.findIndex(b => b.id === bookmarkId);
        if (index !== -1) {
            this.bookmarks.splice(index, 1);
            return true;
        }
        return false;
    }

    // Add note to sector
    addNote(sectorId, note) {
        if (!this.notes[sectorId]) {
            this.notes[sectorId] = [];
        }
        this.notes[sectorId].push({
            id: Utils.generateId(),
            text: note,
            timestamp: Date.now()
        });
    }

    // Get notes for sector
    getNotes(sectorId) {
        return this.notes[sectorId] || [];
    }

    // Delete note
    deleteNote(sectorId, noteId) {
        if (!this.notes[sectorId]) return false;

        const index = this.notes[sectorId].findIndex(n => n.id === noteId);
        if (index !== -1) {
            this.notes[sectorId].splice(index, 1);
            if (this.notes[sectorId].length === 0) {
                delete this.notes[sectorId];
            }
            return true;
        }
        return false;
    }

    // Get scan history
    getScanHistory(limit = 20) {
        return this.scanHistory.slice(0, limit);
    }

    // Clear scan history
    clearScanHistory() {
        this.scanHistory = [];
    }

    // Generate sector report
    generateSectorReport(galaxy, sectorId, navigation) {
        const sector = galaxy.getSector(sectorId);
        if (!sector) return null;

        const scan = this.scanSector(galaxy, sectorId);
        const analysis = navigation ? navigation.analyzeSector(sectorId) : null;
        const notes = this.getNotes(sectorId);
        const bookmark = this.bookmarks.find(b => b.sectorId === sectorId);

        return {
            scan: scan,
            analysis: analysis,
            notes: notes,
            bookmarked: !!bookmark,
            bookmark: bookmark
        };
    }

    // Get nearby threats (for future combat integration)
    scanForThreats(galaxy, sectorId, range = 3) {
        const navigation = new NavigationComputer(galaxy);
        const nearby = navigation.getSectorsInRange(sectorId, range);

        // For now, return empty - will integrate with fighter system later
        return {
            enemies: [],
            fighters: [],
            mines: [],
            players: []
        };
    }

    // Get trade opportunities within range
    scanForTrade(galaxy, sectorId, range = 10) {
        const planets = [];
        const stations = [];

        Object.values(galaxy.data.sectors).forEach(sector => {
            const route = galaxy.findPath(sectorId, sector.id);
            if (!route || route.length - 1 > range) return;

            sector.contents.forEach(content => {
                if (content.type === 'planet') {
                    planets.push({
                        sectorId: sector.id,
                        name: content.name,
                        type: content.planetType,
                        specialty: content.specialty,
                        jumps: route.length - 1,
                        hasContraband: !!content.economy['Contraband']
                    });
                } else if (content.type === 'station') {
                    stations.push({
                        sectorId: sector.id,
                        name: content.name,
                        class: content.class,
                        icon: content.icon,
                        services: content.services,
                        jumps: route.length - 1
                    });
                }
            });
        });

        return {
            planets: planets.sort((a, b) => a.jumps - b.jumps),
            stations: stations.sort((a, b) => a.jumps - b.jumps)
        };
    }

    // Generate comprehensive intel report
    generateIntelReport(galaxy, currentSector, ship, navigation) {
        const galaxyStats = this.analyzeGalaxy(galaxy);
        const sectorReport = this.generateSectorReport(galaxy, currentSector, navigation);
        const tradeOpps = this.scanForTrade(galaxy, currentSector, ship?.fuel || 10);
        const navSummary = navigation ? navigation.getNavigationSummary(currentSector, ship) : null;

        return {
            timestamp: Date.now(),
            galaxy: galaxyStats,
            currentSector: sectorReport,
            navigation: navSummary,
            opportunities: tradeOpps,
            bookmarks: this.bookmarks.length,
            scans: this.scanHistory.length
        };
    }
}

export default ComputerSystem;
