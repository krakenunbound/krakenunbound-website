# Character Customization System - Setup Guide

## ✅ What Was Built

### New Module: `character-customization-handlers.js`
Complete 3-step character creation flow:
1. **Choose Pilot Name**
2. **Select Your Ship** (visual selection with previews)
3. **Name Your Ship** (custom ship name)

### Key Features:
- ✅ **Dynamic ship variants** - Reads from `assets.js` configuration
- ✅ **Persistent ship selection** - Ship variant saved to player data
- ✅ **No more random ships** - Your ship stays the same
- ✅ **Admin controls** - Sysop can edit player ships
- ✅ **Custom ship names** - Name your ship anything you want

---

## 📁 Files Updated

### NEW Files:
1. **character-customization-handlers.js** → `js/` folder
2. **character-customization.css** → `css/` folder

### Modified Files:
3. **main.js** - Added character customization handler
4. **game-state.js** - Updated createPlayer() with ship parameters
5. **assets.js** - Added getPlayerShipImage() method
6. **ui.js** - Uses saved ship variant instead of random
7. **index.html** - Enhanced character creation UI + admin ship fields

---

## 🎨 How to Add More Ship Variants

### Current Setup (as of now):
```javascript
// In assets.js line 17:
'ship_scout': [1, 2],  // You have scout_ship_1.webp and scout_ship_2.webp
```

### To Add More Ships:

1. **Create your new ship images:**
   - Name them: `ship_scout_3.webp`, `ship_scout_4.webp`, etc.
   - Place in: `assets/images/` folder

2. **Update assets.js** (line 17):
```javascript
'ship_scout': [1, 2, 3, 4, 5],  // Add as many as you create!
```

3. **That's it!** The character creation will automatically show all variants as selectable options.

### File Naming Rules:
- Format: `ship_[type]_[variant].webp`
- Examples:
  - `ship_scout_1.webp`
  - `ship_scout_2.webp`
  - `ship_scout_3.webp`
  - ...etc

---

## 🎮 How Players Use It

### Character Creation Flow:
1. Register account
2. **Step 1**: Enter pilot name (e.g., "Captain Solo")
3. **Step 2**: Click on a ship image to select it
4. **Step 3**: Name your ship (e.g., "Millennium Falcon")
5. Begin journey with YOUR customized ship!

### What Gets Saved:
```javascript
{
  pilotName: "Captain Solo",
  ship: {
    name: "Millennium Falcon",  // Custom name
    type: "scout"
  },
  shipVariant: 2  // Which visual variant (1, 2, 3, etc.)
}
```

---

## 🔧 Admin/Sysop Controls

### Edit Player Ship:
1. Go to **Admin Panel** → **Players** tab
2. Click "Edit" on any player
3. New fields available:
   - **Ship Name** - Change the ship's custom name
   - **Ship Type** - Change ship class (scout, trader, etc.)
   - **Ship Variant** - Change which visual variant (1-10)

---

## 🚀 Future Expansion

Want to add more ship types later?

### Example: Adding "Fighter" class ships:
1. Create: `ship_fighter_1.webp`, `ship_fighter_2.webp`, etc.
2. Add to `assets.js`:
```javascript
'ship_fighter': [1, 2, 3, 4],  // Line 18 in assets.js
```
3. Add "Fighter" to character creation ship selection (would need code update)

Currently, character creation only shows **Scout** variants (starter ships).
To offer multiple ship TYPES at creation, you'd need to expand the selection UI.

---

## 🐛 Technical Notes

### How It Works:
- **Random for NPCs**: Enemy ships still randomize using `getShipImage()`
- **Fixed for Player**: Your ship uses `getPlayerShipImage(shipType, variant)`
- **Saved Forever**: Ship variant stored in `gameState.gameData.shipVariant`

### Backward Compatibility:
- Old save files without `shipVariant` → defaults to variant 1
- Old save files will auto-upgrade on next save

---

## ✨ Ready to Test!

Replace all 7 files in your game directory, then:
1. **Create a new account** to test character creation
2. **Select different ships** - see them highlighted
3. **Name your ship** - make it personal!
4. **View Ship tab** - should show your exact chosen ship every time
5. **Test admin panel** - edit player ships
