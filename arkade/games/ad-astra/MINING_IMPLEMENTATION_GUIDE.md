# Mining System Implementation Guide

## ✅ COMPLETED:

### 1. **Mining Mechanics** (`mining.js`)
- ✅ MiningSystem class created
- ✅ canMine() - Checks equipment and cargo space
- ✅ mineAsteroids() - Mines ore with level-based yields
- ✅ Mining equipment definitions (3 tiers)
- ✅ purchaseMiningEquipment() function

### 2. **Particle System** (`particles.js`)
- ✅ Dual-mode support (starfield/asteroids)
- ✅ Asteroid particle generation (80 rocks)
- ✅ Asteroid rendering with rotation
- ✅ Auto-switching based on sector type
- ✅ window.particleSystem.setMode() API

### 3. **Game Integration** (`main.js`)
- ✅ Mining system imported and initialized
- ✅ Particle effect switching in updateUI()
- ✅ Detects asteroid fields automatically

---

## 🔧 TO DO:

### 4. **UI Updates Needed:**

#### A. Add Mining Button to Sector View
In `index.html`, find the `#sector-info` div and add mining button container:

```html
<div id="mining-controls" class="action-buttons" style="display: none; margin-top: 15px;">
    <button id="mine-asteroids-btn" class="btn btn-primary">
        ⛏️ Mine Asteroid Field
    </button>
    <div id="mining-equipment-status" style="margin-top: 10px; font-size: 0.9em;">
        <!-- Equipment status will be shown here -->
    </div>
</div>
```

#### B. Update `ui.js` displaySector() Function
Add logic to show/hide mining button:

```javascript
// Around line 500-600 in displaySector() function
// After displaying sector contents, add:

// Check for asteroid field
const hasAsteroids = sector.contents.some(c => c.type === 'debris' && c.name === 'Asteroid Field');
const miningControls = document.getElementById('mining-controls');
const miningStatus = document.getElementById('mining-equipment-status');

if (hasAsteroids && miningControls) {
    miningControls.style.display = 'block';
    
    // Show equipment status
    const ship = gameState.gameData.ship;
    if (ship.equipment && ship.equipment.miningLaser) {
        miningStatus.innerHTML = `
            <span style="color: var(--accent-green);">✓ Mining Equipment:</span> 
            ${ship.equipment.miningLaser.name}
        `;
    } else {
        miningStatus.innerHTML = `
            <span style="color: var(--accent-red);">✗ No mining equipment installed</span><br>
            <small>Purchase at stations</small>
        `;
    }
} else if (miningControls) {
    miningControls.style.display = 'none';
}
```

#### C. Add Event Listener in `main.js` setupEventListeners()
Around line 180-200, add:

```javascript
// Mining
document.getElementById('mine-asteroids-btn')?.addEventListener('click', () => {
    this.mining.mineAsteroids();
});
```

#### D. Add Mining Equipment to Stations
In `ui.js`, find the `displayStation()` function and add mining equipment shop:

```javascript
// In displayStation(), after existing shop items:

// Mining Equipment Section
html += `<div class="shop-section">
    <h3>⛏️ Mining Equipment</h3>
    <div class="shop-items">`;

const miningEquip = window.MiningSystem.getMiningEquipment();
const currentEquip = gameState.gameData.ship.equipment?.miningLaser;

for (const item of miningEquip) {
    const owned = currentEquip && currentEquip.level >= item.level;
    html += `
        <div class="shop-item ${owned ? 'owned' : ''}">
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.description}</div>
            <div class="shop-item-price">${Utils.format.number(item.cost)} credits</div>
            <button onclick="window.game.mining.purchaseMiningEquipment('${item.id}')" 
                    ${owned ? 'disabled' : ''}>
                ${owned ? 'Owned' : 'Purchase'}
            </button>
        </div>
    `;
}

html += `</div></div>`;
```

---

## 📁 FILES TO UPDATE:

### **Copy These Files:**
1. `/mnt/user-data/outputs/particles.js` → `js/particles.js` ✅
2. `/mnt/user-data/outputs/mining.js` → `js/mining.js` ✅
3. `/mnt/user-data/outputs/main.js` → `js/main.js` ⚠️ (In progress)

### **Manually Edit:**
4. `index.html` - Add mining button HTML
5. `js/ui.js` - Update displaySector() and displayStation()

---

## 🎮 TESTING:

1. **Load Game**
2. **Warp to asteroid sector** (look for "Asteroid Field" in contents)
3. **Observe**: Background should change to drifting asteroids
4. **Click**: "Mine Asteroid Field" button
5. **Result**: Should get ore (if equipped) or error message
6. **At Station**: Purchase mining equipment
7. **Return**: Mine asteroids again
8. **Check**: Cargo should increase, turns should decrease

---

## 🪨 MINING EQUIPMENT TIERS:

| Tier | Name | Cost | Yield Multiplier |
|------|------|------|------------------|
| 1 | Basic Mining Laser | 5,000 | 1x (5-15 ore) |
| 2 | Advanced Mining Laser | 15,000 | 1.5x (7-22 ore) |
| 3 | Industrial Mining Array | 40,000 | 2x (10-30 ore) |

---

## 💡 FUTURE ENHANCEMENTS:

- Mining mini-game (timing/skill based)
- Equipment degradation
- Rare mineral types
- Mining colonies/outposts
- Refining stations for ore processing
- Mining drones (passive income)
