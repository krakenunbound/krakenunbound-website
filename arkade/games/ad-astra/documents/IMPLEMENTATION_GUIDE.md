# Ad Astra - Code Examples & Implementation Guide

## Quick Reference: Function Call Chain for Each Feature

### WARP FLOW (Turns + Fuel consumed)
```
UI: node.onclick() [ui.js:166]
  → main.js: warpToSector(sectorId) [main.js:256]
    → Verify turns available [line 257] (but not spent yet!)
    → Calculate distance [line 273]
    → Calculate fuel cost [line 274]
    → Verify fuel available [line 278]
    → Show travel animation [line 285]
    → Consume fuel [line 301]
    → Check for random events [line 304]
    → game-state.moveToSector(sectorId) [line 323]
      → Verify sector in warps [game-state.js:141]
      → Spend 1 turn [line 145]
      → Save player data [line 151]
```

### BUY TRANSACTION FLOW
```
UI: window.game.buyCommodity(commodity) [main.js:380]
  → TradingSystem.buy(gameState, commodity, qty, planet) [trading.js:8]
    1. Verify 1 turn available [line 10]
    2. Verify commodity exists [line 14]
    3. Verify credits sufficient [line 22]
    4. Verify supply available [line 27]
    5. Verify cargo space [line 35]
    6. gameState.addCargo() [line 35]
    7. gameState.modifyCredits(-cost) [line 40]
    8. planet.economy[commodity].supply -= qty [line 41]
    9. gameState.updateStat('tradesCompleted', 1) [line 42]
    10. gameState.spendTurns(1) [line 45]
    11. Return success [line 47]
```

### GALAXY GENERATION FLOW
```
main.js: init() [main.js:36]
  → galaxy.load() [line 43]
    → Reads localStorage['galaxy']
    → If null:
      → galaxy.generate(size) [main.js:45]
        → CreateSector for each id 1..size [galaxy.js:19]
          → Random position (0-100, 0-100)
          → 30% chance: generatePlanet()
          → 10% chance: generateStation()
          → 20% chance (if empty): generateDebris()
        → connectSectors() [line 23]
          → Build spanning tree [line 147-173]
          → Add random connections [line 176-192]
        → Save to localStorage['galaxy'] [line 32]
```

---

## DETAILED CODE SNIPPETS

### 1. TURN SYSTEM - Current vs. Needed

**CURRENT (Continuous Regeneration):**
```javascript
// utils.js:168-174
getTurnsRegenTime(lastRegenTime, turnsPerDay) {
    const msPerTurn = (24 * 60 * 60 * 1000) / turnsPerDay; // 1,728,000ms per turn (50/day)
    const timeSinceLast = Date.now() - lastRegenTime;
    const turnsToAdd = Math.floor(timeSinceLast / msPerTurn);
    const timeUntilNext = msPerTurn - (timeSinceLast % msPerTurn);
    return { turnsToAdd, timeUntilNext };
}

// game-state.js:91-107
regenerateTurns() {
    if (!this.gameData) return;
    
    const { turnsToAdd } = Utils.getTurnsRegenTime(
        this.gameData.lastTurnRegen,
        this.settings.turnsPerDay
    );
    
    if (turnsToAdd > 0) {
        this.gameData.turns = Math.min(
            this.gameData.turns + turnsToAdd,
            this.gameData.maxTurns  // 200 max
        );
        this.gameData.lastTurnRegen = Date.now();
        this.save();
    }
}
```

**NEEDED (Daily Reset):**
```javascript
// NEW METHOD in game-state.js
checkDailyReset() {
    if (!this.gameData) return;
    
    const today = new Date().toDateString(); // "Wed Nov 20 2025"
    
    if (this.gameData.lastDailyReset !== today) {
        // New day detected
        this.gameData.turns = this.gameData.maxTurns;
        this.gameData.lastDailyReset = today;
        this.save();
        console.log(`Turns reset to ${this.gameData.maxTurns}`);
    }
}

// CALLED IN:
load() {
    this.currentUser = Utils.storage.get('currentUser');
    this.settings = Utils.storage.get('gameSettings', this.getDefaultSettings());
    
    if (this.currentUser) {
        this.gameData = Utils.storage.get(`player_${this.currentUser}`);
        this.galaxy = Utils.storage.get('galaxy');
        
        // ADD THIS:
        if (this.gameData) {
            this.checkDailyReset(); // Check on load
        }
    }
}

// AND IN main.js:179
startGame() {
    // REPLACE:
    // this.gameState.regenerateTurns();
    // WITH:
    this.gameState.checkDailyReset();
    
    this.ui.showScreen('game');
    this.ui.showView('sector');
    // ...
}
```

---

### 2. TRADING SYSTEM - Dynamic Pricing

**CURRENT (Static Prices):**
```javascript
// galaxy.js:98-121
for (const commodity of CONSTANTS.COMMODITIES) {
    const economyData = CONSTANTS.ECONOMY[commodity];
    let price = economyData.basePrice;
    
    if (commodity === type.specialty) {
        price *= 0.7; // Specialty 30% cheaper
    } else {
        price *= Utils.random.float(0.8, 1.5); // 80-150% variance
    }
    
    planet.economy[commodity] = {
        buyPrice: Math.round(price * Utils.random.float(1.1, 1.3)),
        sellPrice: Math.round(price * Utils.random.float(0.7, 0.9)),
        supply: Utils.random.int(50, 500)
    };
}
// This runs ONCE at generation
// Prices never change after that
```

**NEEDED (Daily Pricing):**
```javascript
// NEW in galaxy.js or trading.js
static generateDailyPrice(basePriceData, specialty, date, planetName, commodity) {
    // Use deterministic seed based on date
    const seed = `${date.toDateString()}-${planetName}-${commodity}`;
    const dayHash = Utils.simpleHash(seed); // Already exists in utils.js:157
    
    // Seed a basic PRNG for consistent daily values
    const rng = Math.abs(dayHash) % 100; // 0-99
    
    let price = basePriceData.basePrice;
    
    if (commodity === specialty) {
        price *= 0.7;
    } else {
        // Use day hash for variance
        const variance = 0.8 + (rng / 100) * 0.7; // 0.8-1.5
        price *= variance;
    }
    
    // 10-30% buy premium
    const buyPremium = 1.1 + ((rng + 37) % 100) / 1000; // Vary slightly by day
    const buyPrice = Math.round(price * buyPremium);
    
    // 70-90% sell price
    const sellMultiplier = 0.7 + ((rng + 73) % 100) / 1000;
    const sellPrice = Math.round(price * sellMultiplier);
    
    return { buyPrice, sellPrice };
}

// MODIFIED trading.js:8-54 (buy function)
static buy(gameState, commodity, quantity, planet) {
    if (gameState.gameData.turns < 1) {
        return { success: false, error: 'Not enough turns!' };
    }
    
    if (!planet || !planet.economy || !planet.economy[commodity]) {
        return { success: false, error: 'Invalid trading location' };
    }
    
    // GET PRICE FOR TODAY (NEW)
    const today = new Date();
    const todaysPrices = Galaxy.generateDailyPrice(
        CONSTANTS.ECONOMY[commodity],
        planet.specialty,
        today,
        planet.name,
        commodity
    );
    const price = todaysPrices.buyPrice;
    
    // Rest of function continues as before...
    const cost = price * quantity;
    // ... etc
}
```

---

### 3. GALAXY GENERATION - Seeded RNG

**CURRENT (No Seed):**
```javascript
// galaxy.js:12-35
generate(size = CONSTANTS.GALAXY.DEFAULT_SIZE) {
    console.log(`Generating galaxy with ${size} sectors...`);
    
    const sectors = {};
    
    for (let i = 1; i <= size; i++) {
        sectors[i] = this.createSector(i, size);
    }
    
    // Uses Math.random() throughout ^^^
    
    this.connectSectors(sectors, size);
    
    this.data = {
        size: size,
        sectors: sectors,
        created: Date.now()
        // No seed stored!
    };
    
    Utils.storage.set('galaxy', this.data);
    return this.data;
}

// galaxy.js:42
x: Utils.random.float(0, 100), // Uses Math.random()
y: Utils.random.float(0, 100)
```

**NEEDED (Seeded):**
```javascript
// First, add seeded RNG to utils.js
// Using built-in or small library like seedrandom
// For now, simple example using existing simpleHash

class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.counter = 0;
    }
    
    next() {
        this.counter++;
        const str = `${this.seed}-${this.counter}`;
        const hash = Utils.simpleHash(str);
        return Math.abs(hash) / 10000000; // 0-1
    }
    
    int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    float(min, max) {
        return this.next() * (max - min) + min;
    }
    
    choice(array) {
        return array[Math.floor(this.next() * array.length)];
    }
}

// galaxy.js:12-35 MODIFIED
generate(size = CONSTANTS.GALAXY.DEFAULT_SIZE, seed = null) {
    console.log(`Generating galaxy with ${size} sectors, seed: ${seed}...`);
    
    // Use provided seed or generate one
    const actualSeed = seed || Utils.generateId();
    const rng = new SeededRandom(actualSeed);
    
    const sectors = {};
    
    for (let i = 1; i <= size; i++) {
        sectors[i] = this.createSector(i, size, rng); // Pass RNG!
    }
    
    this.connectSectors(sectors, size, rng);
    
    this.data = {
        size: size,
        sectors: sectors,
        created: Date.now(),
        seed: actualSeed  // STORE SEED!
    };
    
    Utils.storage.set('galaxy', this.data);
    return this.data;
}

// galaxy.js:39-68 MODIFIED
createSector(id, galaxySize, rng) {
    const sector = {
        id: id,
        x: rng.float(0, 100),    // Now uses seeded RNG
        y: rng.float(0, 100),
        warps: [],
        contents: []
    };
    
    if (rng.next() < CONSTANTS.GALAXY.PLANET_CHANCE) {
        sector.contents.push(this.generatePlanet(rng));
    }
    
    if (rng.next() < CONSTANTS.GALAXY.STATION_CHANCE) {
        sector.contents.push(this.generateStation(rng));
    }
    
    if (rng.next() < 0.2 && sector.contents.length === 0) {
        sector.contents.push({
            type: 'debris',
            name: 'Asteroid Field',
            description: 'Scattered asteroids'
        });
    }
    
    return sector;
}

// galaxy.js:71-124 MODIFIED
generatePlanet(rng) {
    const planetTypes = [
        { name: 'Desert', specialty: 'Ore' },
        // ...
    ];
    
    const type = rng.choice(planetTypes);  // Uses seeded RNG
    const planetNames = [/* ... */];
    
    const planet = {
        type: 'planet',
        name: `${rng.choice(planetNames)} ${rng.int(1, 999)}`,
        planetType: type.name,
        specialty: type.specialty,
        economy: {},
        population: rng.int(1000, 1000000),
        techLevel: rng.int(1, 10)
    };
    
    // Generate economy with seeded RNG
    for (const commodity of CONSTANTS.COMMODITIES) {
        if (commodity === 'Contraband' && rng.next() > 0.2) continue;
        
        const economyData = CONSTANTS.ECONOMY[commodity];
        let price = economyData.basePrice;
        
        if (commodity === type.specialty) {
            price *= 0.7;
        } else {
            price *= rng.float(0.8, 1.5);
        }
        
        planet.economy[commodity] = {
            buyPrice: Math.round(price * rng.float(1.1, 1.3)),
            sellPrice: Math.round(price * rng.float(0.7, 0.9)),
            supply: rng.int(50, 500)
        };
    }
    
    return planet;
}

// Similar changes needed for:
// - generateStation(rng)
// - connectSectors(sectors, size, rng)
```

---

### 4. GALAXY MAP - Warp Lane Enforcement

**CURRENT (Any sector reachable):**
```javascript
// ui.js:166-179
node.onclick = () => {
    if (window.game) {
        if (sector.id == currentSectorId) return; // Can't warp to self
        
        if (!isReachable) {
            window.game.ui.showError('Not enough fuel to reach this sector!');
            return;
        }
        
        // ANY sector can be warped to if fuel permits!
        if (confirm(`Warp to Sector ${sector.id}?\nCost: ${fuelCost} Fuel...`)) {
            window.game.warpToSector(sector.id);
        }
    }
};
```

**NEEDED (Warp Lane Only):**
```javascript
// ui.js:166-185 MODIFIED
node.onclick = () => {
    if (window.game) {
        if (sector.id == currentSectorId) return;
        
        // ADD WARP LANE CHECK
        const currentSector = galaxyData.sectors[currentSectorId];
        const hasWarpLane = currentSector.warps.includes(sector.id);
        
        if (!hasWarpLane) {
            window.game.ui.showError('No warp lane to this sector!');
            node.classList.add('no-warp-lane');
            return;
        }
        
        if (!isReachable) {
            window.game.ui.showError('Not enough fuel to reach this sector!');
            return;
        }
        
        if (confirm(`Warp to Sector ${sector.id}?\nCost: ${fuelCost} Fuel...`)) {
            window.game.warpToSector(sector.id);
        }
    }
};

// Also update visual feedback at ui.js:133-161 (tooltip)
// Add after line 159:
if (!hasWarpLane) {
    isReachable = false;
    node.classList.add('unreachable');
    node.classList.add('no-warp-lane');
    tooltip += '\n⚠️ No warp lane!';
}
```

Also add server-side validation in `main.js:warpToSector()`:
```javascript
// main.js:256-275 ADD AFTER FUEL CHECK
warpToSector(sectorId) {
    if (this.gameState.gameData.turns < 1) {
        this.ui.showError('Not enough turns!');
        return;
    }
    
    const currentSectorId = this.gameState.gameData.currentSector;
    const currentSector = this.galaxy.getSector(currentSectorId);
    const targetSector = this.galaxy.getSector(sectorId);
    
    if (!currentSector || !targetSector) {
        this.ui.showError('Invalid sector data!');
        return;
    }
    
    // ADD VALIDATION
    if (!currentSector.warps.includes(sectorId)) {
        this.ui.showError('No warp lane to that sector!');
        return;
    }
    
    const dist = Utils.distance(currentSector.x, currentSector.y, targetSector.x, targetSector.y);
    const fuelCost = ShipManager.calculateFuelCost(dist);
    // ... rest continues
}
```

---

## Data Structure Examples

### Player Data After Daily Reset
```javascript
{
    username: "player1",
    pilotName: "Captain Hawk",
    credits: 50000,
    turns: 50,              // Reset to maxTurns
    maxTurns: 200,
    currentSector: 42,
    ship: { /* ship data */ },
    cargo: { "Ore": 20, "Equipment": 5 },
    stats: { /* stats */ },
    lastLogin: 1732084800000,
    lastTurnRegen: 1732084800000,
    lastDailyReset: "Wed Nov 20 2025",  // NEW: Date string
    created: 1730000000000
}
```

### Galaxy Data With Seed
```javascript
{
    size: 100,
    seed: "abc123def456",  // NEW: Store for reproducibility
    created: 1732084800000,
    lastPriceUpdate: "Wed Nov 20 2025",  // NEW: For economy
    sectors: {
        1: {
            id: 1,
            x: 42.5,
            y: 73.2,
            warps: [2, 5, 8],
            contents: [
                {
                    type: "planet",
                    name: "Alpha Prime 234",
                    specialty: "Ore",
                    economy: {
                        "Ore": { buyPrice: 7, sellPrice: 5, supply: 200 },
                        // ... other commodities
                    }
                }
            ]
        },
        // ... more sectors
    }
}
```

### Trading Transaction Log (For Multiplayer)
```javascript
// Server should store:
{
    playerId: "player1",
    timestamp: 1732084800000,
    action: "buy",
    sectorId: 42,
    commodity: "Ore",
    quantity: 50,
    price: 7,
    totalCost: 350,
    playerCreditsBefore: 50000,
    playerCreditsAfter: 49650,
    planetSupplyAfter: 150,
    turns: 1
}
```

---

## Testing Checklist

### Galaxy Generation
- [ ] Same seed → identical sector positions
- [ ] Same seed → identical planet placements
- [ ] Same seed → identical economy prices
- [ ] Different seed → different galaxy
- [ ] Seed stored in localStorage['galaxy']
- [ ] Galaxy loads and uses stored seed

### Turn System
- [ ] New character starts with turnsPerDay (50)
- [ ] Same day: no turn reset
- [ ] Next day (UTC): turns reset to max
- [ ] Each warp costs 1 turn
- [ ] Each trade costs 1 turn
- [ ] Can't act without turns

### Trading System
- [ ] Same day: prices consistent
- [ ] Next day: prices change deterministically
- [ ] Same planet, same commodity, same day → same price
- [ ] Can't buy without credits
- [ ] Can't buy without turns
- [ ] Can't buy more than supply

### Fuel System
- [ ] Adjacent sector costs 1-2 fuel
- [ ] Distant sector costs more fuel
- [ ] Can't warp without enough fuel
- [ ] Refuel costs 2 credits/unit
- [ ] Fuel consumption logged

### Galaxy Map
- [ ] All sectors visible on map
- [ ] Click adjacent sector → warp
- [ ] Click non-adjacent sector → error "No warp lane"
- [ ] Fuel cost shown in tooltip
- [ ] Unreachable sectors highlighted

