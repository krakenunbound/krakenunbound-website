// Ad Astra - Navigation Computer
// navigation.js - Pathfinding, route calculation, and navigation assistance

import { Utils } from './utils.js';

export class NavigationComputer {
    constructor(galaxy) {
        this.galaxy = galaxy;
    }

    // Find shortest path between two sectors using BFS
    findPath(startId, endId) {
        if (!this.galaxy || !this.galaxy.data) return null;

        const queue = [[startId]];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current === endId) {
                return path;
            }

            const sector = this.galaxy.getSector(current);
            if (!sector) continue;

            for (const warp of sector.warps) {
                if (!visited.has(warp)) {
                    visited.add(warp);
                    queue.push([...path, warp]);
                }
            }
        }

        return null; // No path found
    }

    // Calculate route with detailed information
    calculateRoute(startId, endId, ship) {
        const path = this.findPath(startId, endId);

        if (!path) {
            return {
                success: false,
                error: 'No route found',
                path: null
            };
        }

        // Calculate total distance, fuel needed, and turn cost
        let totalDistance = 0;
        let fuelNeeded = 0;
        const jumps = path.length - 1;

        for (let i = 0; i < path.length - 1; i++) {
            const from = this.galaxy.getSector(path[i]);
            const to = this.galaxy.getSector(path[i + 1]);

            if (from && to) {
                const dist = Utils.distance(from.x, from.y, to.x, to.y);
                totalDistance += dist;

                // Calculate fuel for this jump (if ship provided)
                if (ship && ship.fuelEfficiency) {
                    fuelNeeded += Math.ceil(10 / ship.fuelEfficiency);
                }
            }
        }

        return {
            success: true,
            path: path,
            jumps: jumps,
            totalDistance: Math.round(totalDistance),
            fuelNeeded: fuelNeeded,
            turns: jumps, // Each jump costs 1 turn
            canAfford: ship ? (ship.fuel >= fuelNeeded) : true
        };
    }

    // Find nearest sector with specific content type
    findNearest(fromSectorId, contentType, options = {}) {
        if (!this.galaxy || !this.galaxy.data) return null;

        const fromSector = this.galaxy.getSector(fromSectorId);
        if (!fromSector) return null;

        let results = [];

        // Search all sectors for matching content
        for (const sector of Object.values(this.galaxy.data.sectors)) {
            const matchingContent = sector.contents.filter(c => {
                if (contentType === 'any') return true;
                if (contentType === c.type) return true;

                // Special filters
                if (options.portClass && c.class === options.portClass) return true;
                if (options.commodity && c.economy && c.economy[options.commodity]) return true;

                return false;
            });

            if (matchingContent.length > 0) {
                const distance = Utils.distance(
                    fromSector.x, fromSector.y,
                    sector.x, sector.y
                );

                // Calculate actual path
                const route = this.findPath(fromSectorId, sector.id);

                results.push({
                    sector: sector,
                    content: matchingContent[0],
                    distance: distance,
                    jumps: route ? route.length - 1 : Infinity,
                    route: route
                });
            }
        }

        // Sort by jumps (actual path length)
        results.sort((a, b) => a.jumps - b.jumps);

        return options.findAll ? results : (results[0] || null);
    }

    // Find all planets within range
    findPlanetsInRange(fromSectorId, maxJumps = 5) {
        const results = this.findNearest(fromSectorId, 'planet', { findAll: true });
        return results.filter(r => r.jumps <= maxJumps);
    }

    // Find all stations within range
    findStationsInRange(fromSectorId, maxJumps = 5) {
        const results = this.findNearest(fromSectorId, 'station', { findAll: true });
        return results.filter(r => r.jumps <= maxJumps);
    }

    // Find best trading opportunity from current location
    findBestTrade(fromSectorId, ship, maxJumps = 10) {
        if (!ship || !ship.cargo) return null;

        const planets = this.findPlanetsInRange(fromSectorId, maxJumps);
        let bestTrade = null;
        let bestProfit = 0;

        // For each commodity in cargo, find best sell location
        for (const [commodity, quantity] of Object.entries(ship.cargo)) {
            if (quantity <= 0) continue;

            for (const result of planets) {
                const planet = result.content;
                if (!planet.economy || !planet.economy[commodity]) continue;

                const prices = this.galaxy.constructor.generateDailyPrice(planet, commodity);
                const potentialProfit = prices.sellPrice * quantity;

                if (potentialProfit > bestProfit) {
                    bestProfit = potentialProfit;
                    bestTrade = {
                        ...result,
                        commodity: commodity,
                        quantity: quantity,
                        sellPrice: prices.sellPrice,
                        totalProfit: potentialProfit
                    };
                }
            }
        }

        return bestTrade;
    }

    // Find profitable trade route
    findTradeRoute(fromSectorId, ship, maxJumps = 15) {
        if (!ship) return null;

        const planets = this.findPlanetsInRange(fromSectorId, maxJumps);
        let bestRoute = null;
        let bestProfitRatio = 0;

        // Check each planet for buying opportunities
        for (const buyLocation of planets) {
            const buyPlanet = buyLocation.content;
            if (!buyPlanet.economy) continue;

            // Check what we can buy here
            for (const [commodity, econ] of Object.entries(buyPlanet.economy)) {
                const buyPrices = this.galaxy.constructor.generateDailyPrice(buyPlanet, commodity);
                const maxCanBuy = Math.min(
                    ship.cargoMax - ship.cargoUsed,
                    econ.supply
                );

                if (maxCanBuy <= 0) continue;

                // Find best sell location for this commodity
                for (const sellLocation of planets) {
                    if (sellLocation.sector.id === buyLocation.sector.id) continue;

                    const sellPlanet = sellLocation.content;
                    if (!sellPlanet.economy || !sellPlanet.economy[commodity]) continue;

                    const sellPrices = this.galaxy.constructor.generateDailyPrice(sellPlanet, commodity);
                    const profit = (sellPrices.sellPrice - buyPrices.buyPrice) * maxCanBuy;
                    const totalJumps = buyLocation.jumps + sellLocation.jumps;
                    const profitRatio = totalJumps > 0 ? profit / totalJumps : 0;

                    if (profitRatio > bestProfitRatio && profit > 0) {
                        bestProfitRatio = profitRatio;
                        bestRoute = {
                            buy: {
                                ...buyLocation,
                                planet: buyPlanet,
                                price: buyPrices.buyPrice,
                                available: econ.supply
                            },
                            sell: {
                                ...sellLocation,
                                planet: sellPlanet,
                                price: sellPrices.sellPrice
                            },
                            commodity: commodity,
                            quantity: maxCanBuy,
                            investment: buyPrices.buyPrice * maxCanBuy,
                            revenue: sellPrices.sellPrice * maxCanBuy,
                            profit: profit,
                            profitMargin: ((sellPrices.sellPrice - buyPrices.buyPrice) / buyPrices.buyPrice * 100).toFixed(1),
                            totalJumps: totalJumps,
                            profitPerJump: Math.round(profit / totalJumps)
                        };
                    }
                }
            }
        }

        return bestRoute;
    }

    // Get all sectors within N jumps
    getSectorsInRange(fromSectorId, maxJumps) {
        if (!this.galaxy || !this.galaxy.data) return [];

        const queue = [{ id: fromSectorId, jumps: 0 }];
        const visited = new Set([fromSectorId]);
        const results = [];

        while (queue.length > 0) {
            const { id, jumps } = queue.shift();

            if (jumps > 0) {
                results.push({
                    sector: this.galaxy.getSector(id),
                    jumps: jumps
                });
            }

            if (jumps < maxJumps) {
                const sector = this.galaxy.getSector(id);
                if (sector) {
                    for (const warp of sector.warps) {
                        if (!visited.has(warp)) {
                            visited.add(warp);
                            queue.push({ id: warp, jumps: jumps + 1 });
                        }
                    }
                }
            }
        }

        return results;
    }

    // Analyze current sector connectivity
    analyzeSector(sectorId) {
        const sector = this.galaxy.getSector(sectorId);
        if (!sector) return null;

        return {
            id: sectorId,
            connections: sector.warps.length,
            contents: sector.contents.map(c => ({
                type: c.type,
                name: c.name,
                class: c.class
            })),
            nearby: {
                planets: this.findPlanetsInRange(sectorId, 3).length,
                stations: this.findStationsInRange(sectorId, 3).length,
                total: this.getSectorsInRange(sectorId, 3).length
            }
        };
    }

    // Get navigation summary for current location
    getNavigationSummary(currentSectorId, ship) {
        const nearestPlanet = this.findNearest(currentSectorId, 'planet');
        const nearestStation = this.findNearest(currentSectorId, 'station');
        const nearestMilitary = this.findNearest(currentSectorId, 'station', { portClass: 'Military' });
        const nearestBlackMarket = this.findNearest(currentSectorId, 'station', { portClass: 'Black Market' });

        return {
            currentSector: currentSectorId,
            nearestPlanet: nearestPlanet ? {
                sector: nearestPlanet.sector.id,
                name: nearestPlanet.content.name,
                jumps: nearestPlanet.jumps,
                distance: Math.round(nearestPlanet.distance)
            } : null,
            nearestStation: nearestStation ? {
                sector: nearestStation.sector.id,
                name: nearestStation.content.name,
                class: nearestStation.content.class,
                jumps: nearestStation.jumps,
                distance: Math.round(nearestStation.distance)
            } : null,
            nearestMilitary: nearestMilitary ? {
                sector: nearestMilitary.sector.id,
                jumps: nearestMilitary.jumps
            } : null,
            nearestBlackMarket: nearestBlackMarket ? {
                sector: nearestBlackMarket.sector.id,
                jumps: nearestBlackMarket.jumps
            } : null,
            reachable: this.getSectorsInRange(currentSectorId, ship?.fuel || 10).length
        };
    }
}

export default NavigationComputer;
