# Ad Astra - Testing Guide

## Getting Started with Testing

### ⚠️ IMPORTANT: HTTP Server Required
**The game CANNOT be opened directly as a file (file:///) due to CORS restrictions on ES6 modules.**

You MUST serve the game via an HTTP server:
```bash
# Navigate to game directory
cd "h:\Ad Astra"

# Start Python HTTP server
python -m http.server 8000

# Then open browser to:
http://localhost:8000/index.html
```

### Local Setup
1. Open `index.html` in your web browser (Chrome, Firefox, or Safari recommended)
2. The game uses localStorage, so no server is needed for testing
3. Open browser console (F12) to see debug messages

### First-Time Setup
1. **Create an account**
   - Click "Create Account"
   - Username: any alphanumeric string (3-20 characters)
   - Password: minimum 6 characters
   
2. **Create your character**
   - Choose a pilot name
   - You'll start with 10,000 credits and a basic Scout ship
   - You begin in Sector 1

3. **Admin Access** (optional)
   - Default admin credentials: `admin` / `admin123`
   - **IMPORTANT**: Change this password in production!

## Test Scenarios

### Basic Functionality Tests

#### 1. Navigation & Movement
- [ ] Warp to different sectors using warp buttons
- [ ] Verify turns decrease with each warp
- [ ] Check that invalid warps are blocked
- [ ] Confirm sector information updates correctly

#### 2. Trading System
- [ ] Find a planet (look for content cards in sectors)
- [ ] Click "Trade at [Planet Name]"
- [ ] Buy commodities (check credit decrease)
- [ ] Sell commodities (check credit increase)
- [ ] Verify cargo space limits
- [ ] Test buying with insufficient credits
- [ ] Test selling when you have no cargo

#### 3. Random Events
- [ ] Warp between sectors multiple times
- [ ] Look for event messages (15% chance per warp)
- [ ] Try different event choices
- [ ] Verify outcomes apply correctly:
  - Credits gained/lost
  - Cargo added
  - Damage applied
  - Combat initiated

#### 4. Combat System
- [ ] Trigger combat (via pirate event or specific events)
- [ ] Test Attack action
- [ ] Test Flee action (70% success rate)
- [ ] Verify damage calculation
- [ ] Check shield absorption
- [ ] Confirm rewards on victory
- [ ] Test game over on defeat

#### 5. Space Stations
- [ ] Find a station (less common than planets)
- [ ] Dock at the station
- [ ] Test hull repair
- [ ] Test refueling
- [ ] Verify costs are deducted

#### 6. Ship Management
- [ ] Click "Ship" in navigation
- [ ] View ship stats
- [ ] Check cargo inventory
- [ ] Monitor hull and shield status

### Admin Panel Tests

#### Access Admin Panel
- Click "Admin Access" on login screen
- Login with admin credentials
- Test admin functions:

1. **Galaxy Generation**
   - [ ] Try generating different sized galaxies (10-1000 sectors)
   - [ ] Verify galaxy size matches input
   - [ ] Check that player is reset to Sector 1

2. **Settings Management**
   - [ ] Adjust turns per day (10-500)
   - [ ] Save settings
   - [ ] Verify settings persist after refresh

### Edge Cases to Test

1. **Turn Management**
   - [ ] Exhaust all turns
   - [ ] Verify blocked actions when turns = 0
   - [ ] Wait for turn regeneration (or manually test by adjusting lastTurnRegen in localStorage)

2. **Credits**
   - [ ] Spend all credits
   - [ ] Try buying with 0 credits
   - [ ] Verify negative credits prevented

3. **Cargo**
   - [ ] Fill cargo hold completely
   - [ ] Try buying when cargo full
   - [ ] Try selling empty cargo

4. **Hull Damage**
   - [ ] Take damage until hull is critical
   - [ ] Test ship destruction
   - [ ] Verify game over screen

5. **Browser Refresh**
   - [ ] Make progress, refresh page
   - [ ] Verify all data persists
   - [ ] Check galaxy state maintained

## Common Issues & Solutions

### Issue: Game won't load
**Solution**: 
- Check browser console for errors
- Verify JavaScript is enabled
- Try clearing localStorage: `localStorage.clear()` in console

### Issue: Galaxy is empty
**Solution**: 
- Open admin panel
- Generate a new galaxy
- Default size: 100 sectors

### Issue: Can't warp anywhere
**Solution**: 
- Check if you have turns (top bar)
- Verify current sector has warp connections
- Try regenerating galaxy if stuck

### Issue: Prices seem broken
**Solution**: 
- Admin panel → Refresh Economy
- This will regenerate all planet prices

### Issue: Progress lost after closing browser
**Solution**: 
- This is expected - localStorage is browser-specific
- Don't clear browser data
- In future, server backend will handle persistence

## Performance Testing

### Recommended Test Sizes
- Small galaxy: 50 sectors (fast generation)
- Medium galaxy: 100 sectors (default, good balance)
- Large galaxy: 500 sectors (stress test)
- Max galaxy: 1000 sectors (may be slow)

### Monitor These Metrics
- Galaxy generation time
- UI update responsiveness
- localStorage size (check in dev tools)
- Memory usage in large galaxies

## Browser Compatibility

### Tested Browsers
- Chrome/Edge (Chromium): ✓ Recommended
- Firefox: ✓ Works well
- Safari: ⚠️ Test needed
- Mobile: ⚠️ Limited support (future improvement)

### localStorage Limits
- Most browsers: 5-10MB limit
- Large galaxies may approach limit
- Monitor in dev tools → Application → Storage

## Debug Commands

Open browser console and try these:

```javascript
// View current game state
console.log(window.game.gameState.gameData);

// View galaxy data
console.log(window.game.galaxy.data);

// Add credits (cheating!)
window.game.gameState.modifyCredits(100000);
window.game.updateUI();

// Add turns
window.game.gameState.gameData.turns = 200;
window.game.updateUI();

// Teleport to sector
window.game.gameState.gameData.currentSector = 50;
window.game.updateUI();

// Repair ship
window.game.gameState.repairShip(1000, 1000);
window.game.updateUI();

// Add cargo
window.game.gameState.addCargo('Ore', 100);
window.game.updateUI();

// Clear all data (CAUTION!)
localStorage.clear();
location.reload();
```

## Balance Testing Notes

Please track these metrics during testing:
- Average credits earned per hour of play
- Typical trade route profits
- Combat difficulty (too easy/hard?)
- Event frequency (too rare/common?)
- Turn regeneration speed
- Starting credits sufficiency

Report any balance issues for adjustment!

## Bug Reporting Format

When reporting bugs, please include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Console errors (if any)
6. Screenshot (if applicable)

## Next Testing Phase

After basic testing, we'll focus on:
- Balance tuning
- UI/UX improvements
- Galaxy map visualization
- Sound effects
- Advanced features
- Multiplayer preparation

---

**Happy Testing!** 🚀
Report issues and suggestions to improve the game!
