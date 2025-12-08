# Ad Astra - Bug Report
**Generated:** 2025-11-19

## Critical Bugs Found

### 1. **Trading System Price Logic Bug** 🔴 CRITICAL
**Location:** `js/trading.js` lines 155-189
**Severity:** Critical - Game Breaking

**Issue:** The `findTradeRoutes()` function has inverted buy/sell price logic. It uses:
- `sellPrice` from source planet (what player SELLS for)
- `buyPrice` from destination planet (what player BUYS for)

This creates impossible profitable routes where the player would actually lose money.

**Expected Behavior:**
- Buy commodity at source planet's `buyPrice` (higher price, player pays)
- Sell commodity at destination planet's `sellPrice` (lower price, player receives)
- Profit = sellPrice - buyPrice (should usually be negative or small positive)

**Actual Behavior:**
- Uses source planet's `sellPrice` (low) as purchase price
- Uses destination planet's `buyPrice` (high) as sell price
- Creates artificially high profits that don't exist

**Fix Required:**
```javascript
// Line 155: Change from
const price1Sell = p1.planet.economy[commodity].sellPrice;
const price2Buy = p2.planet.economy[commodity].buyPrice;
// To:
const price1Buy = p1.planet.economy[commodity].buyPrice;  // Player buys here
const price2Sell = p2.planet.economy[commodity].sellPrice; // Player sells here
```

---

### 2. **Title Inconsistency** 🟡 MINOR
**Location:** `index.html` line 17
**Severity:** Minor - Cosmetic

**Issue:** The auth screen still shows "TradeWars Reimagined" instead of "Ad Astra"

**Fix Required:**
```html
<!-- Line 17: Change from -->
<h1>TradeWars Reimagined</h1>
<!-- To: -->
<h1>Ad Astra</h1>
```

---

### 3. **Potential Turn Deduction Bug in Trading** 🟠 MODERATE
**Location:** `js/trading.js` lines 40-46, 81-87
**Severity:** Moderate - Logic Issue

**Issue:** Both `buy()` and `sell()` functions spend a turn AFTER executing the transaction. If `spendTurns()` fails, the function attempts to refund the transaction. However, this creates an inconsistent state where:
1. Transaction is executed
2. Turn spending fails
3. Refund is attempted

**Problem:** The refund logic may not perfectly reverse all state changes, and the turn check should happen BEFORE the transaction.

**Fix Required:** Move turn check to the beginning of both functions:
```javascript
// At start of buy() and sell() functions:
if (gameState.gameData.turns < 1) {
    return { success: false, error: 'Not enough turns!' };
}
```

---

### 4. **Missing Fuel Display in Ship View** 🟡 MINOR
**Location:** `js/ui.js` lines 292-327
**Severity:** Minor - Missing Feature

**Issue:** The ship stats display shows Hull, Shields, Weapons, and Cargo, but does NOT show Fuel level, which is critical for gameplay.

**Fix Required:** Add fuel stat display in `displayShip()` function around line 324:
```javascript
// Add after Weapons stat:
html += '<div class="stat-item">';
html += '<div class="stat-label">Fuel</div>';
html += `<div class="stat-value">${ship.fuel}/${ship.fuelMax}</div>`;
html += `<div class="stat-bar"><div class="stat-bar-fill ${ship.fuel < ship.fuelMax * 0.2 ? 'low' : ''}" style="width: ${(ship.fuel / ship.fuelMax) * 100}%"></div></div>`;
html += '</div>';
```

---

### 5. **Event Handling During Warp Consumes Fuel Without Arrival** 🟠 MODERATE
**Location:** `js/main.js` lines 296-320
**Severity:** Moderate - Gameplay Issue

**Issue:** When warping, if a random event occurs:
1. Fuel is consumed (line 301)
2. Event is triggered (line 304-311)
3. Function returns early (line 320)
4. Player never arrives at destination sector

**Result:** Player loses fuel but doesn't move. This may be intentional (event intercepts travel), but it's not clearly communicated to the player.

**Recommendation:** Either:
- Refund fuel if event prevents arrival, OR
- Add clear message: "Event intercepted your warp! Fuel consumed but destination not reached."

---

### 6. **Police Inspection Event Has Overlapping Outcome Weights** 🟡 MINOR
**Location:** `js/events.js` lines 199-205
**Severity:** Minor - Logic Issue

**Issue:** The "Attempt to flee" choice has outcomes with weights that may overlap:
```javascript
{ weight: 30, result: 'nothing', message: 'You managed to slip away!' },
{ weight: 70, result: 'damage', amount: [20, 50], message: 'They opened fire! {amount} hull damage!' },
{ weight: 50, result: 'wanted', message: 'You are now a wanted criminal!' }
```

Total weight = 150, which is unusual. The weighted random selector will normalize this, but it's unclear if multiple outcomes can trigger.

**Fix Required:** Clarify intended behavior or adjust weights to total 100.

---

### 7. **Combat Flee Success Doesn't End Combat Properly** ⚠️ NEEDS VERIFICATION
**Location:** `js/main.js` lines 529-543
**Severity:** Needs Testing

**Issue:** When fleeing combat successfully, the code:
1. Calls `this.ui.showView('sector')` (line 533)
2. But combat may still be active in CombatSystem

**Potential Issue:** If combat state isn't properly cleared, returning to combat view might show stale data.

**Recommendation:** Verify that `combat.attemptFlee()` properly calls `endCombat()` on success (it does at line 127 of combat.js, so this is likely OK).

---

## Testing Recommendations

### High Priority Tests:
1. ✅ Test trading system with actual price calculations
2. ✅ Verify fuel consumption and display
3. ✅ Test event interruption during warp
4. ✅ Test police inspection with contraband
5. ✅ Test combat flee mechanics

### Medium Priority Tests:
1. Test turn regeneration over time
2. Test cargo space limits
3. Test ship destruction and game over
4. Test admin panel galaxy generation
5. Test all random events

### Low Priority Tests:
1. Test localStorage persistence
2. Test multiple user accounts
3. Test galaxy map rendering with large galaxies
4. Test audio system initialization

---

## Code Quality Issues

### Potential Improvements:
1. **Error Handling:** Many functions don't handle edge cases (null checks, undefined)
2. **Type Safety:** No TypeScript or JSDoc type annotations
3. **Magic Numbers:** Many hardcoded values (e.g., fuel costs, prices) should be constants
4. **Code Duplication:** Buy/sell functions have similar structure
5. **Testing:** No unit tests or integration tests

---

## Performance Concerns

1. **Galaxy Map Rendering:** Drawing connections for large galaxies (1000 sectors) may be slow
2. **LocalStorage Limits:** Large galaxies may exceed browser storage limits
3. **No Lazy Loading:** All game data loaded at once

---

## Security Issues

1. **Admin Password:** Default admin password "admin123" is hardcoded and weak
2. **Client-Side Only:** All game logic is client-side, easy to cheat via console
3. **No Input Validation:** User inputs not sanitized (potential XSS if data is shared)

---

## Recommendations

### Immediate Fixes (Before Release):
1. Fix trading price logic bug
2. Update title to "Ad Astra"
3. Add fuel display to ship view
4. Fix turn deduction in trading

### Short-Term Improvements:
1. Add comprehensive error handling
2. Implement unit tests for core systems
3. Add input validation
4. Improve event messaging clarity

### Long-Term Enhancements:
1. Move to server-based architecture
2. Add TypeScript for type safety
3. Implement proper authentication
4. Add multiplayer features
