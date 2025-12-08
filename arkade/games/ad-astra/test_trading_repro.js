
import TradingSystem from './js/trading.js';

// Mock Data
const planet1 = {
    name: 'Planet 1',
    economy: {
        'Ore': {
            buyPrice: 120, // Player Buys at 120
            sellPrice: 80, // Player Sells at 80
            supply: 100
        }
    }
};

const planet2 = {
    name: 'Planet 2',
    economy: {
        'Ore': {
            buyPrice: 130, // Player Buys at 130
            sellPrice: 90, // Player Sells at 90
            supply: 100
        }
    }
};

const galaxy = {
    sectors: {
        1: { id: 1, contents: [{ type: 'planet', ...planet1 }], warps: [2] },
        2: { id: 2, contents: [{ type: 'planet', ...planet2 }], warps: [1] }
    }
};

// Test findTradeRoutes
// Expected: Buy at P1 (120), Sell at P2 (90). Profit = 90 - 120 = -30. (Loss)
// Or: Buy at P2 (130), Sell at P1 (80). Profit = 80 - 130 = -50. (Loss)
// Current Buggy Logic likely calculates:
// P1->P2: Buy at P1.sellPrice (80), Sell at P2.buyPrice (130). Profit = 50. (Huge Profit!)

console.log("Testing Trade Routes...");
const routes = TradingSystem.findTradeRoutes(galaxy, 1, 5);
console.log("Routes found:", JSON.stringify(routes, null, 2));

if (routes.length > 0 && routes[0].profitPerUnit > 0) {
    console.log("FAIL: Found profitable route where none should exist (due to price swap bug).");
} else {
    console.log("PASS: No profitable routes found (correct).");
}
