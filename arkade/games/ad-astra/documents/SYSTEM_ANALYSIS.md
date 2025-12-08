# Ad Astra Codebase Analysis

## System Overview

A detailed analysis of the Ad Astra game's core systems and their readiness for multiplayer features, seed-based randomization, and daily mechanics.

---

## 1. GALAXY GENERATION SYSTEM

### File: `/home/user/Ad-Astra/js/galaxy.js`

#### Current Implementation

**Galaxy Structure:**
- **Size Range:** 10-1000 sectors (CONSTANTS.GALAXY.DEFAULT_SIZE = 100)
- **Sector Positioning:** Random float coordinates (0-100) for x,y
  - Line 42: `x: Utils.random.float(0, 100), y: Utils.random.float(0, 100)`
- **Sector IDs:** Sequential integers (1 to size)

**Content Generation (Probability-based):**
- **Planet Generation:** 30% chance per sector (Line 49, PLANET_CHANCE = 0.3)
  - Line 71-124: `generatePlanet()` creates:
    - Random planet type (Desert, Forest, Industrial, Ocean, Rocky, Urban)
    - Random specialty (Ore, Organics, Equipment)
    - 6 planet names pool with random numbering
    - Population: 1,000-1,000,000 (Line 94)
    - Tech Level: 1-10 (Line 95)
    
- **Station Generation:** 10% chance per sector (Line 54, STATION_CHANCE = 0.1)
  - Line 127-140: `generateStation()` creates fixed services
  - Repair cost: 5 credits/hull point
  - Refuel cost: 2 credits/fuel unit
  
- **Debris Fields:** 20% chance if sector empty (Line 59)

**Planet Economy (Static Prices):**
- Line 98-121: Economy generated at creation time
- Base prices from CONSTANTS.ECONOMY (Line 206-209):
  - Ore: 10 credits
  - Organics: 15 credits
  - Equipment: 25 credits
  - Contraband: 100 credits
- **Price Calculation:**
  - Specialty items: 70% of base price (Line 111: `price *= 0.7`)
  - Non-specialty: 80-150% variance (Line 113: `Utils.random.float(0.8, 1.5)`)
  - Buy Price: 110-130% markup (Line 117)
  - Sell Price: 70-90% of calculated price (Line 118)
- **Supply:** 50-500 units per commodity (Line 119)

**Sector Connection (Warp Networks):**
- Line 143-193: `connectSectors()` uses hybrid approach:
  1. **Spanning Tree (Lines 147-173):** 
     - Ensures all sectors are reachable
     - Creates minimum connections via closest neighbor
  2. **Additional Random Connections (Lines 176-192):**
     - 50% of sector count additional connections
     - Only if distance < 30 units
     - Creates alternate routes for trading/exploration

**Storage:**
- Line 32: Saved to localStorage as `'galaxy'`
- Contains: `{size, sectors, created}`

#### What Works Well

✓ **Deterministic connections:** Spanning tree guarantees connectivity
✓ **Reasonable planet distribution:** 30% occupancy creates mix of empty/populated sectors
✓ **Economic differentiation:** Planet specialties create price gradients for trading
✓ **Compact representation:** Coordinates stored as percentages (0-100)

#### What Needs to Change

**For Seed-Based Randomization:**
1. Replace `Math.random()` with seeded PRNG (e.g., mulberry32, alea)
   - Lines 42, 49, 54, 59, 81, 90, 94, 95 use Math.random()
2. Pass seed to `generate(size, seed = null)` method
3. Initialize seeded RNG before generation:
   ```javascript
   const rng = seed ? seedRandom(seed) : Math.random;
   ```
4. Store seed in galaxy.data for validation/reproduction

**For Multiplayer:**
- No need to change - seed-based generation solves multiplayer consistency
- All players can generate same galaxy from seed
- Economy changes will be handled separately

**For Dynamic Pricing:**
- Current economy is generated once and fluctuates ±5% per call
- Line 291-319: `updateEconomy()` modifies prices, but is never called
- Need: Separate daily economy updates from generation
- Problem: Supply variable updated in trading.js lines 41, 81 - impacts pricing

---

## 2. TURN SYSTEM

### Files: `/home/user/Ad-Astra/js/game-state.js`, `/home/user/Ad-Astra/js/main.js`, `/home/user/Ad-Astra/js/utils.js`

#### Current Implementation

**Turn Constants:**
- DEFAULT_TURNS_PER_DAY: 50 (utils.js:180)
- MAX_TURNS: 200 (utils.js:181)

**Turn Regeneration (game-state.js:91-107):**
```javascript
regenerateTurns() {
    const { turnsToAdd } = Utils.getTurnsRegenTime(
        this.gameData.lastTurnRegen,
        this.settings.turnsPerDay
    );
    if (turnsToAdd > 0) {
        this.gameData.turns = Math.min(
            this.gameData.turns + turnsToAdd,
            this.gameData.maxTurns
        );
        this.gameData.lastTurnRegen = Date.now();
        this.save();
    }
}
```

**Turn Calculation Logic (utils.js:168-174):**
```javascript
getTurnsRegenTime(lastRegenTime, turnsPerDay) {
    const msPerTurn = (24 * 60 * 60 * 1000) / turnsPerDay;
    const timeSinceLast = Date.now() - lastRegenTime;
    const turnsToAdd = Math.floor(timeSinceLast / msPerTurn);
    const timeUntilNext = msPerTurn - (timeSinceLast % msPerTurn);
    return { turnsToAdd, timeUntilNext };
}
```

**Turn Costs:**
- Warp: 1 turn (game-state.js:145, main.js:256-330)
- Buy: 1 turn (trading.js:45)
- Sell: 1 turn (trading.js:85)
- Trade actions check: `gameState.gameData.turns < 1` (trading.js:10, 59)

**Turn Spending (game-state.js:109-119):**
```javascript
spendTurns(amount) {
    if (!this.gameData) return false;
    if (this.gameData.turns >= amount) {
        this.gameData.turns -= amount;
        this.save();
        return true;
    }
    return false;
}
```

**Initial Turn Assignment:**
- New character starts with: `CONSTANTS.DEFAULT_TURNS_PER_DAY` (game-state.js:54)
- Last regen timestamp: `Date.now()` at creation (game-state.js:68, 104)

**Turn Regeneration Call Sites:**
- main.js:179: Called on `startGame()`
- game-state.js:91: Method exists but not called continuously

#### What Works Well

✓ **Decoupled from clock:** Uses elapsed time, not absolute dates
✓ **No hard reset needed:** Continuous regeneration handles wraparound
✓ **Fractional rounding:** Prevents time-zone issues
✓ **Capped at max:** Prevents infinite turn accumulation

#### What Needs to Change

**For Turn Limits (Multiplayer):**
1. Current system: Continuous regeneration, no max daily limit
2. Needed: Hard daily reset with fixed daily limit
3. Changes required:
   - Detect calendar day boundaries (UTC midnight)
   - Reset `turns = turnsPerDay` once per day
   - Track `lastDailyReset: Date` (as date, not timestamp)
   - Compare `new Date().toDateString()` against `lastDailyReset`

**For Daily Turn Resets:**
1. Add flag: `lastDailyReset: '2025-11-20'` (date string, not timestamp)
2. On login/action, check:
   ```javascript
   const today = new Date().toDateString();
   if (gameData.lastDailyReset !== today) {
       gameData.turns = gameData.maxTurns;
       gameData.lastDailyReset = today;
   }
   ```
3. Call this check in:
   - main.js:179 `startGame()`
   - game-state.js:16 `load()`
   - Before every turn-spending action

**For Multiplayer:**
- No server validation = turn cheating possible
- Need server-side turn ledger
- Each turn-spending action needs timestamp validation
- Audit log: `{playerId, action, timestamp, turnsSpent}`

---

## 3. TRADING SYSTEM

### File: `/home/user/Ad-Astra/js/trading.js`

#### Current Implementation

**Buy Transaction (Lines 7-54):**
- Input validation: Turns, commodity exists, credits available, supply available, cargo space
- Price source: `planet.economy[commodity].buyPrice` (Line 18)
- Cost calculation: `price * quantity` (Line 19)
- Effects:
  - Player cargo: +quantity (Line 35)
  - Player credits: -cost (Line 40)
  - Planet supply: -quantity (Line 41)
  - Player stat: tradesCompleted +1 (Line 42)
  - **Turns consumed: -1** (Line 45)

**Sell Transaction (Lines 56-94):**
- Similar validation but reverse (Lines 63-69)
- Price source: `planet.economy[commodity].sellPrice` (Line 72)
- Revenue: `price * quantity` (Line 73)
- Effects:
  - Player cargo: -quantity (Line 76)
  - Player credits: +revenue (Line 80)
  - Planet supply: +quantity (Line 81)
  - Player stat: tradesCompleted +1 (Line 82)
  - **Turns consumed: -1** (Line 85)

**Price Information (Lines 96-120):**
- `getTradingInfo(planet)` returns array with:
  - buyPrice, sellPrice, supply per commodity
  - playerHas (cargo quantity)
  - spread = buyPrice - sellPrice
  - profitMargin = ((buyPrice - sellPrice) / sellPrice) * 100

**Trade Route Finder (Lines 122-199):**
- Searches within `maxDistance = 5` sectors (BFS pathfinding)
- Compares buy/sell prices across planets
- Returns top 10 routes by profit/unit
- Routes include: fromSector, toPlanet, buyPrice, sellPrice, profitPerUnit, distance

**Profit Calculation (Lines 227-257):**
- `calculatePotentialProfit()` for cargo planning
- Finds best commodity to trade between two planets
- Returns: commodity, quantity, profit

**Economy Model:**
- **Prices are STATIC** once generated in galaxy.js
- **No dynamic pricing** - only supply changes from trading
- **Problem:** Supply affects everything, but prices frozen
- Supply buffer: 50-500 units per planet (galaxy.js:119)

#### What Works Well

✓ **Turn cost enforcement:** Both buy/sell verified before execution
✓ **Transaction atomicity:** Multiple checks before state changes
✓ **Profit calculations:** Support for multi-leg trading routes
✓ **Supply modeling:** Affects availability but not price

#### What Needs to Change

**For Daily Price Changes:**
1. Current state: Prices generated once, never updated
2. Needed: Separate daily pricing from generation
3. Changes required:
   - Move price calculation to separate method
   - Add `galaxy.lastPriceUpdate: Date`
   - Check calendar day on each price lookup
   - Regenerate prices for new day (same commodity, new variance)

4. Implementation approach:
   ```javascript
   getPriceForCommodity(planet, commodity, date = new Date()) {
       const dateKey = date.toDateString();
       if (!planet.priceUpdates) planet.priceUpdates = {};
       if (planet.priceUpdates[dateKey]?.[commodity]) {
           return planet.priceUpdates[dateKey][commodity];
       }
       // Generate new price for today using seed(dateKey, commodity)
       // Store in priceUpdates[dateKey][commodity]
       // Return price
   }
   ```

5. Supply handling:
   - Supply should reset daily OR persist
   - Decision: Reset daily? Then trading creates no pressure
   - Alternative: Persist but with slow decay toward baseline
   - Or: Global supply refresh triggers at UTC midnight

**For Multiplayer:**
- No validation of planet state during trade
- Two players could both buy last unit of commodity
- Need server authority on:
  - Planet current economy state (prices + supply)
  - Turn spending confirmation
  - Transaction atomicity

**For Seed-Based Economy:**
- Daily prices need deterministic seed
- Seed formula: `hash(galaxySeed, dateString, commodity)`
- Ensures: Same galaxy → same prices every day
- But: Price changes every day (deterministically)

---

## 4. FUEL SYSTEM

### Files: `/home/user/Ad-Astra/js/ship.js`, `/home/user/Ad-Astra/js/main.js`

#### Current Implementation

**Ship Fuel Properties (ship.js:98-124):**
- `fuelMax`: Ship-dependent (Scout=100, Trader=100, Fighter=90, Explorer=150)
- `fuel`: Current fuel amount (initialized to fuelMax)
- Upgrades available: fuel tank (lines 83-89)
  - Base cost: 3000 credits
  - Increment: +20 fuel per level
  - Max level: 5 (100 max additional fuel)

**Fuel Cost Calculation (ship.js:229-232):**
```javascript
static calculateFuelCost(distance) {
    // Base cost is 1 fuel per 10 distance units, minimum 1
    return Math.max(1, Math.floor(distance / 5));
}
```
- Formula: `floor(distance / 5)` with minimum of 1
- Examples:
  - Distance 5 → cost 1
  - Distance 10 → cost 2
  - Distance 25 → cost 5
  - Distance 50 → cost 10

**Travel Time Calculation (ship.js:235-240):**
```javascript
static calculateTravelTime(distance, speed) {
    // Base time: 1000ms per 10 distance units / speed
    return Math.round((distance * 100) / speed);
}
```
- Formula: `(distance * 100) / speed` milliseconds
- Examples (speed 1.0):
  - Distance 10 → 1000ms (1s)
  - Distance 50 → 5000ms (5s)
- Faster ships (speed > 1.0) travel quicker

**Fuel Consumption (ship.js:223-226):**
```javascript
static useFuel(ship, amount) {
    ship.fuel = Math.max(0, ship.fuel - amount);
    return ship.fuel > 0;
}
```
- Direct subtraction, no refund mechanism

**Warp Sequence (main.js:256-330):**
1. Line 257: Check turns available (NOT fuel yet)
2. Line 273: Calculate distance from sector coordinates
3. Line 274: Calculate fuel cost
4. Line 278-282: **Verify fuel available**, error if not
5. Line 285: Show travel overlay (animated countdown)
6. Line 301: **Consume fuel** (after travel animation)
7. Line 304-321: Check for random events
8. Line 323: Call `gameState.moveToSector()` → spends 1 turn

**Refueling at Stations (main.js:463-479):**
- Calculate needed fuel: `fuelMax - fuel`
- Cost: 2 credits per fuel unit
- Refill to max instantly
- No partial refueling option

**Galaxy Map Display (ui.js:138-162):**
- Line 147: `fuelCost = ShipManager.calculateFuelCost(dist)`
- Line 150: Shows tooltip: `⛽ Fuel Cost: ${fuelCost}`
- Line 153-159: Marks sector unreachable if `fuelCost > ship.fuel`
- Visual feedback: `.unreachable` CSS class, `.reachable` class

#### What Works Well

✓ **Range-based fuel cost:** Prevents infinite exploration
✓ **Visible cost before warp:** Tooltip shows fuel needed
✓ **Speed affects travel time:** Creates ship differentiation
✓ **Minimum 1 fuel per warp:** Prevents free travel

#### What Needs to Change

**For Click-to-Warp with Range Limits:**
1. Current behavior: Can warp to ANY sector if fuel permits
2. Needed: Restrict to adjacent/nearby sectors OR warp lanes only
3. Two design options:

   **Option A: Warp Lane Restricted**
   - Only warp to sectors in `currentSector.warps` array
   - Modify ui.js:166-179 to check:
     ```javascript
     if (!currentSector.warps.includes(sector.id)) {
         node.classList.add('unreachable');
         tooltip += '\n⚠️ No warp lane!';
     }
     ```
   - Already has warp network, just needs enforcement

   **Option B: Distance Limited**
   - Add MAX_WARP_DISTANCE constant (e.g., 30 units)
   - Check in main.js:warpToSector():
     ```javascript
     if (dist > MAX_WARP_DISTANCE) {
         this.ui.showError('Too far to warp!');
         return;
     }
     ```
   - Update ui.js tooltip accordingly

4. **Recommendation:** Option A (warp lane restricted)
   - Already built into galaxy
   - Matches sci-fi convention
   - Creates navigation puzzles (find route to destination)
   - More compatible with trading (route planning)

**For Fuel Economy Balancing:**
1. Current formula: 1 fuel per 5 distance units seems high
   - Scout ship: 100 fuel → can travel 500 distance units max
   - Galaxy is 100x100 (max distance ~141 units)
   - Result: Can cross galaxy 3-4 times with full fuel
2. Suggested rebalance:
   - Increase denominator: `distance / 10` (1 fuel per 10 units)
   - Or add base cost: `2 + floor(distance / 5)`
   - Test with expected game loop: How often should players refuel?

**For Multiplayer:**
- Fuel state must match server truth
- Each warp triggers server verification
- Prevent: Client sends false fuel value
- Solution: Server stores `{playerId, sectorId, fuel, lastUpdate}`

---

## 5. GALAXY MAP

### File: `/home/user/Ad-Astra/js/ui.js` (lines 55-378)

#### Current Implementation

**Map Rendering (Lines 55-203):**
- Container: `#galaxy-map` div
- Inner transform container: `#galaxy-map-inner` for zoom/pan
- Coordinate system: Sector x,y as percentages (0-100)
- Two layer approach:
  1. Warp connections (lines 87-99): CSS `.warp-line` divs
  2. Sector nodes (lines 105-182): `.sector-node` divs

**Sector Node Rendering (Lines 105-182):**
- Deterministic star types based on sector ID (mod 5):
  - `star-red-giant`, `star-red-dwarf`, `star-yellow`, `star-white-dwarf`, `star-blue-giant`
- Position: `left: calc(x% - offset)`, `top: calc(y% - offset)`
- Visual states:
  - `.current`: Player's current sector (z-index: 30)
  - `.has-planet`: Planet symbol
  - `.has-station`: Station symbol
  - `.reachable`: Green highlight if fuel sufficient
  - `.unreachable`: Red highlight if insufficient fuel

**Tooltip Information (Lines 133-161):**
- Sector number, planet/station indicators
- Fuel cost calculation
- Travel time calculation
- Current location indicator
- Reachability warning if fuel insufficient

**Click to Warp (Lines 166-179):**
```javascript
node.onclick = () => {
    if (window.game) {
        if (sector.id == currentSectorId) return;
        if (!isReachable) {
            window.game.ui.showError('Not enough fuel to reach this sector!');
            return;
        }
        if (confirm(`Warp to Sector ${sector.id}?\n...`)) {
            window.game.warpToSector(sector.id);
        }
    }
};
```

**Warp Line Rendering (Lines 357-378):**
```javascript
drawConnection(container, s1, s2) {
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    line.style.width = `${distance}%`;
    line.style.left = `${s1.x}%`;
    line.style.top = `${s1.y}%`;
    line.style.transform = `rotate(${angle}deg)`;
}
```

**Zoom & Pan (Lines 206-345):**
- State tracking: `galaxyMapState = {zoom, offsetX, offsetY, isDragging, lastX, lastY}`
- Mouse wheel: Zoom ±0.1 (Lines 271-274)
- Touch pinch: Zoom with 2-finger gesture (Lines 278-306)
- Mouse drag: Pan by pixel-to-percentage conversion (Lines 309-335)
- Zoom range: 0.5 to 5.0x (Line 303, 340)

**Map Controls (Lines 212-266):**
- Zoom in button: +0.2 scale
- Zoom out button: -0.2 scale
- Reset button: Re-render and auto-center

**Auto-Centering (Lines 185-193):**
```javascript
const centerX = 50 - currentSector.x;
const centerY = 50 - currentSector.y;
this.galaxyMapState.offsetX = centerX;
this.galaxyMapState.offsetY = centerY;
```

#### What Works Well

✓ **Full interactive map:** Zoom, pan, click to warp
✓ **Visual differentiation:** Stars, planets, stations distinct
✓ **Connectivity visible:** Warp lines show navigation routes
✓ **Range feedback:** Tooltips show fuel costs in real-time
✓ **Responsive positioning:** Percentages work across screen sizes
✓ **Touch support:** Pinch zoom for mobile

#### What Needs to Change

**For Click-to-Warp with Warp Lane Restriction:**
1. Current behavior: Any sector clickable (if fuel permits)
2. Needed: Only adjacent sectors (in warps array) clickable
3. Changes required in ui.js:

   Line 166-179 Add warp lane check:
   ```javascript
   const currentSector = galaxyData.sectors[currentSectorId];
   const isWarpLaneAvailable = currentSector.warps.includes(sector.id);
   
   node.onclick = () => {
       if (window.game) {
           if (sector.id == currentSectorId) return;
           
           if (!isWarpLaneAvailable) {
               window.game.ui.showError('No warp lane to this sector!');
               return;
           }
           
           if (!isReachable) {
               window.game.ui.showError('Not enough fuel...');
               return;
           }
           
           if (confirm(`Warp to Sector ${sector.id}?\n...`)) {
               window.game.warpToSector(sector.id);
           }
       }
   };
   ```

4. Visual feedback:
   - Add `.no-warp-lane` CSS class styling
   - Update tooltip: `⚠️ No warp lane to this sector`
   - Tooltip lines 133-161

**For Better Route Visualization:**
1. Highlight path to destination:
   - Add pathfinding on sector click (pre-warp)
   - Use galaxy.findPath(start, end)
   - Highlight sectors in route
   - Show total fuel needed for route

2. Show available warps from current sector:
   - Highlight destination sectors
   - Less opacity on unreachable sectors
   - Alternative: Only render connections from current location

**For Multiplayer Map Sync:**
- Map is deterministic (same seed → same galaxy)
- No server needed for galaxy data
- Player position sync needed:
  - Other players shown on map
  - Real-time location updates
  - Last known position if offline

**For Performance (Large Galaxies):**
- Current rendering: All sectors + all connections
- For 1000 sectors: 1000 nodes + ~1500 lines
- Issues:
  - DOM bloat
  - Slow pan/zoom
- Optimization strategies:
  - Cull off-screen sectors
  - Render at zoom level 1:N
  - Use Canvas instead of DOM
  - Lazy-load sector details

---

## SUMMARY TABLE: Required Changes by Feature

| Feature | Galaxy Gen | Turn System | Trading | Fuel | Map |
|---------|-----------|------------|---------|------|-----|
| **Seed-based Randomization** | Major: Add seeded RNG (lines 42,49,54,59,81,90,94,95) | Minor: Store seed in settings | Minor: Use seed for daily prices | No change | No change |
| **Multiplayer with Turn Limits** | No change | Major: Daily reset logic (game-state.js:91-107) | Major: Server validation needed | Major: Server authority | No change |
| **Daily Turn Resets** | No change | Major: Add daily boundary check (game-state.js:91-107) | No change | No change | No change |
| **Daily Price Changes** | No change | No change | Major: Price generation on-demand (trading.js:7,56) | No change | No change |
| **Click-to-Warp with Range Limits** | No change | No change | No change | Minor: Enforce warp lanes (main.js:256-330) | Major: Add lane check (ui.js:166-179) |

---

## CRITICAL ISSUES FOUND

1. **Economy Prices Never Updated:**
   - galaxy.js:291 `updateEconomy()` exists but is never called
   - Prices are frozen at generation (STATIC)
   - For daily changes: Need scheduled update call

2. **No Server Validation:**
   - Client-side only: Turns, fuel, trades, position
   - Cheating possible: Edit localStorage
   - For multiplayer: Need backend authority

3. **No Seed-Based Generation:**
   - All randomization uses `Math.random()`
   - Makes multiplayer consistency impossible
   - Galaxy not reproducible

4. **No Hard Daily Reset:**
   - Continuous regeneration model
   - No calendar boundary detection
   - Daily turn limits not enforced

5. **Warp Lanes Not Enforced:**
   - Can warp anywhere if fuel permits
   - Warp network exists but unused for validation
   - Makes long-range trading trivial

---

## IMPLEMENTATION PRIORITIES

### Phase 1: Foundation (Required for all features)
- [ ] Implement seeded RNG in galaxy.js
- [ ] Add galaxy seed to game settings
- [ ] Test galaxy reproducibility

### Phase 2: Daily Mechanics
- [ ] Add daily reset logic to game-state.js
- [ ] Implement daily price generation in trading.js
- [ ] Test turn reset at UTC midnight

### Phase 3: Multiplayer Foundation
- [ ] Design backend API for turn verification
- [ ] Add server authority for planet economy
- [ ] Implement transaction logging

### Phase 4: Game Balance
- [ ] Enforce warp lanes in ui.js + main.js
- [ ] Rebalance fuel costs
- [ ] Test trading routes and economy

### Phase 5: Polish
- [ ] Add route visualization on map
- [ ] Optimize galaxy map rendering
- [ ] Add player position sync

