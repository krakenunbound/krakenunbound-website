// Ad Astra - Trading System
// trading.js - Buy/sell commodities at planets

import { CONSTANTS } from './utils.js';
import { Galaxy } from './galaxy.js';

export class TradingSystem {
    // Execute buy transaction
    static buy(gameState, commodity, quantity, planet) {
        // Check turns first
        if (gameState.gameData.turns < 1) {
            return { success: false, error: 'Not enough turns!' };
        }

        if (!planet || !planet.economy || !planet.economy[commodity]) {
            return { success: false, error: 'Invalid trading location' };
        }

        // Get daily price (changes each day but consistent across all players)
        const dailyPrices = Galaxy.generateDailyPrice(planet, commodity);
        const price = dailyPrices.buyPrice;
        const cost = price * quantity;

        // Check if player has enough credits
        if (gameState.gameData.credits < cost) {
            return { success: false, error: 'Not enough credits!' };
        }

        // Check if enough supply
        if (planet.economy[commodity].supply < quantity) {
            return {
                success: false,
                error: `Only ${planet.economy[commodity].supply} units available!`
            };
        }

        // Check cargo space
        if (!gameState.addCargo(commodity, quantity)) {
            return { success: false, error: 'Not enough cargo space!' };
        }

        // Execute transaction
        gameState.modifyCredits(-cost);
        planet.economy[commodity].supply -= quantity;
        gameState.updateStat('tradesCompleted', 1);

        // Spend turn
        gameState.spendTurns(1);

        return {
            success: true,
            commodity: commodity,
            quantity: quantity,
            price: price,
            cost: cost
        };
    }

    // Execute sell transaction
    static sell(gameState, commodity, quantity, planet) {
        // Check turns first
        if (gameState.gameData.turns < 1) {
            return { success: false, error: 'Not enough turns!' };
        }

        if (!planet || !planet.economy || !planet.economy[commodity]) {
            return { success: false, error: 'Invalid trading location' };
        }

        // Check if player has cargo
        if (gameState.getCargoAmount(commodity) < quantity) {
            return { success: false, error: 'Not enough cargo to sell!' };
        }

        // Get daily price (changes each day but consistent across all players)
        const dailyPrices = Galaxy.generateDailyPrice(planet, commodity);
        const price = dailyPrices.sellPrice;
        const revenue = price * quantity;

        // Execute transaction
        if (!gameState.removeCargo(commodity, quantity)) {
            return { success: false, error: 'Failed to remove cargo!' };
        }

        gameState.modifyCredits(revenue);
        planet.economy[commodity].supply += quantity;
        gameState.updateStat('tradesCompleted', 1);

        // Spend turn
        gameState.spendTurns(1);

        return {
            success: true,
            commodity: commodity,
            quantity: quantity,
            price: price,
            revenue: revenue
        };
    }

    // Get trading info for planet
    static getTradingInfo(planet, playerCargo) {
        if (!planet || !planet.economy) {
            return null;
        }

        const info = [];

        for (const commodity of CONSTANTS.COMMODITIES) {
            // Skip if planet doesn't trade this commodity
            if (!planet.economy[commodity]) continue;

            const eco = planet.economy[commodity];
            const playerHas = playerCargo[commodity] || 0;

            // Get daily prices
            const dailyPrices = Galaxy.generateDailyPrice(planet, commodity);

            info.push({
                commodity: commodity,
                buyPrice: dailyPrices.buyPrice,
                sellPrice: dailyPrices.sellPrice,
                supply: eco.supply, // Supply persists
                playerHas: playerHas,
                spread: dailyPrices.buyPrice - dailyPrices.sellPrice,
                profitMargin: Math.round(((dailyPrices.buyPrice - dailyPrices.sellPrice) / dailyPrices.sellPrice) * 100)
            });
        }

        return info;
    }

    // Find best trade routes
    static findTradeRoutes(galaxy, startSector, maxDistance = 5) {
        if (!galaxy || !galaxy.sectors) return [];

        const routes = [];
        const start = galaxy.sectors[startSector];
        if (!start) return routes;

        // Find all planets within range
        const planetsInRange = [];
        for (const sector of Object.values(galaxy.sectors)) {
            const planet = sector.contents.find(c => c.type === 'planet');
            if (planet) {
                const dist = this.calculatePathDistance(galaxy, startSector, sector.id);
                if (dist !== null && dist <= maxDistance) {
                    planetsInRange.push({
                        sector: sector,
                        planet: planet,
                        distance: dist
                    });
                }
            }
        }

        // Compare prices between planets
        for (let i = 0; i < planetsInRange.length; i++) {
            for (let j = i + 1; j < planetsInRange.length; j++) {
                const p1 = planetsInRange[i];
                const p2 = planetsInRange[j];

                for (const commodity of CONSTANTS.COMMODITIES) {
                    // Player BUYS at source planet's buyPrice (higher)
                    const price1Buy = p1.planet.economy[commodity].buyPrice;
                    // Player SELLS at destination planet's sellPrice (lower)
                    const price2Sell = p2.planet.economy[commodity].sellPrice;
                    const profit1to2 = price2Sell - price1Buy;

                    if (profit1to2 > 0) {
                        routes.push({
                            commodity: commodity,
                            fromSector: p1.sector.id,
                            fromPlanet: p1.planet.name,
                            toSector: p2.sector.id,
                            toPlanet: p2.planet.name,
                            buyPrice: price1Buy,
                            sellPrice: price2Sell,
                            profitPerUnit: profit1to2,
                            distance: p1.distance + p2.distance
                        });
                    }

                    // Reverse route: buy at p2, sell at p1
                    const price2Buy = p2.planet.economy[commodity].buyPrice;
                    const price1Sell = p1.planet.economy[commodity].sellPrice;
                    const profit2to1 = price1Sell - price2Buy;

                    if (profit2to1 > 0) {
                        routes.push({
                            commodity: commodity,
                            fromSector: p2.sector.id,
                            fromPlanet: p2.planet.name,
                            toSector: p1.sector.id,
                            toPlanet: p1.planet.name,
                            buyPrice: price2Buy,
                            sellPrice: price1Sell,
                            profitPerUnit: profit2to1,
                            distance: p1.distance + p2.distance
                        });
                    }
                }
            }
        }

        // Sort by profit per unit
        routes.sort((a, b) => b.profitPerUnit - a.profitPerUnit);

        return routes.slice(0, 10); // Return top 10
    }

    // Calculate path distance between sectors
    static calculatePathDistance(galaxy, from, to) {
        const queue = [[from, 0]];
        const visited = new Set([from]);

        while (queue.length > 0) {
            const [current, dist] = queue.shift();

            if (current === to) {
                return dist;
            }

            const sector = galaxy.sectors[current];
            if (!sector) continue;

            for (const warp of sector.warps) {
                if (!visited.has(warp)) {
                    visited.add(warp);
                    queue.push([warp, dist + 1]);
                }
            }
        }

        return null;
    }

    // Calculate potential profit for cargo hold
    static calculatePotentialProfit(fromPlanet, toPlanet, cargoSpace) {
        if (!fromPlanet || !toPlanet) return null;

        let bestProfit = 0;
        let bestCommodity = null;
        let bestQuantity = 0;

        for (const commodity of CONSTANTS.COMMODITIES) {
            const buyPrice = fromPlanet.economy[commodity].sellPrice;
            const sellPrice = toPlanet.economy[commodity].buyPrice;
            const profitPerUnit = sellPrice - buyPrice;

            if (profitPerUnit > 0) {
                const maxAffordable = Math.floor(cargoSpace);
                const totalProfit = profitPerUnit * maxAffordable;

                if (totalProfit > bestProfit) {
                    bestProfit = totalProfit;
                    bestCommodity = commodity;
                    bestQuantity = maxAffordable;
                }
            }
        }

        return {
            commodity: bestCommodity,
            quantity: bestQuantity,
            profit: bestProfit
        };
    }
}

export default TradingSystem;
