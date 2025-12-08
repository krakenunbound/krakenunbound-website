# Ad Astra - Quick Start Guide

## ⚡ Get Playing in 2 Minutes

### Step 1: Open the Game
```
Simply open: ad-astra/index.html
```
Double-click the file or drag it into your browser. That's it! No installation, no server needed.

### Step 2: Create Account
1. Click **"Create Account"**
2. Enter a username (e.g., "captain")
3. Enter a password (e.g., "password123")
4. Click **"Launch Career"**

### Step 3: Create Character
1. Enter your pilot name (e.g., "StarHawk")
2. Click **"Begin Your Journey"**

### Step 4: Start Playing!
You're now in the game with:
- 🏦 10,000 credits
- 🚀 A Scout ship
- ⚡ 50 turns
- 📍 Starting in Sector 1

---

## 🎮 Basic Controls

### Navigation Bar
- **Ship**: View your ship stats and cargo
- **Sector**: Current location and actions (default view)
- **Galaxy**: Map of all sectors (coming soon)
- **Trade**: Quick access to trading
- **Logout**: Save and exit

### In-Sector Actions
- **Warp to Sector X**: Move to connected sectors (costs 1 turn + Fuel)
- **Trade at Planet**: Buy/sell commodities
- **Dock at Station**: Repair, Refuel, and Buy Ships

---

## 💰 Making Money (The Basics)

### Trading 101
1. Find a planet in your sector
2. Click **"Trade at [Planet Name]"**
3. Look at prices:
   - **Green (Buy)**: What you pay to buy from planet
   - **Yellow (Sell)**: What planet pays you
4. Buy commodities cheap, warp to another planet, sell high!

### Example Trade Route
```
Sector 5 → Buy Ore at 8 credits/unit
Sector 12 → Sell Ore at 15 credits/unit
Profit: 7 credits per unit!
```

### Commodity Types
- **Ore**: Usually cheap on desert/rocky planets
- **Organics**: Cheap on forest/ocean planets
- **Equipment**: Cheap on industrial/urban planets
- **Contraband**: Illegal! High profit, but police might catch you.

---

## ⚔️ Combat Basics

### When Combat Happens
- Random pirate encounters (15% chance when warping)
- Some event choices lead to combat

### Combat Options
- **Attack**: Deal damage based on your weapons
- **Flee**: 70% chance to escape (speed helps)

### Combat Tips
- Shields absorb damage first, then hull
- Keep hull above 30% (repair at stations)
- Early game: flee from tough enemies
- Victory rewards: credits + possible cargo

---

## 🎲 Random Events

While warping, you might encounter:
- **Derelict Ships**: Salvage for credits/cargo
- **Distress Signals**: Help for rewards (or traps!)
- **Asteroid Fields**: Navigate or mine them
- **Space Anomalies**: Risky but potentially rewarding
- **Pirates**: Fight, flee, or pay them off
- **Merchants**: Special trading opportunities

**Pro Tip**: Events are ~15% chance per warp. They make money!

---

## 🛠️ Managing Your Ship

### Key Stats
- **Hull**: Your ship's health (repair at stations)
- **Shields**: Absorbs damage first (regenerates slowly)
- **Cargo**: How much you can carry (50 units in Scout)
- **Weapons**: Your combat power
- **Fuel**: Used for warping. Don't run out! Refuel at stations.

### Upgrading (Future Feature)
Station upgrades coming soon!

---

## ⏱️ Turns System

### Turn Costs
- Warp to sector: **1 turn**
- Buy/Sell commodity: **1 turn**
- Combat actions: **1 turn**

### Regeneration
- Default: **50 turns per day**
- Max storage: **200 turns**
- Use them wisely!

---

## 🎯 Beginner Strategy

### First 30 Minutes
1. ✅ Explore nearby sectors (use ~10 turns)
2. ✅ Find 2-3 planets with good price differences
3. ✅ Fill cargo with cheap commodity
4. ✅ Sell at high-price planet
5. ✅ Repeat until you have ~20,000 credits

### Your First Goal: 25,000 Credits
This lets you upgrade to a Trader ship (more cargo = more profit!)

### Trading Route Tips
- Stay close at first (fewer turns = more trades)
- Write down good routes
- Prices fluctuate over time
- Specialty planets have best prices for one commodity

---

## 🔧 Troubleshooting

### "Not enough turns!"
Wait for regeneration or plan your moves better. Turns come back automatically!

### "Not enough cargo space!"
Sell some cargo or upgrade to bigger ship later.

### "Ship destroyed!"
Game over! But you can create a new character and try again.

### "Can't find any planets!"
Keep warping! ~30% of sectors have planets.

### Game seems stuck?
Press F12 → Console → Type: `location.reload()`

---

## 🎓 Advanced Tips

1. **Map Your Galaxy**: Keep notes on good trade routes
2. **Watch Your Hull**: Repair before it gets critical
3. **Save Turns**: Don't waste them on bad trades
4. **Events Pay Well**: Don't always ignore them
5. **Death Penalty**: You lose everything! Play safe early on

---

## 👑 Admin Controls

### Access Admin Panel
- Click **"Admin Access"** on login screen
- Default: username `admin`, password `admin123`
- **Change this password immediately!**

### Admin Powers
- **Generate Galaxy**: Create new universe (10-1000 sectors)
- **Adjust Turns**: Change regeneration rate
- **View Stats**: See all players (future)

---

## 🆘 Help Commands

Open browser console (F12) and try:

```javascript
// Add 10,000 credits (for testing)
window.game.gameState.modifyCredits(10000);
window.game.updateUI();

// Add 50 turns
window.game.gameState.gameData.turns += 50;
window.game.updateUI();

// Repair ship fully
window.game.gameState.repairShip(1000, 1000);
window.game.updateUI();

// See all data
console.log(window.game.gameState.gameData);
```

---

## 📋 What's Next?

The game is fully playable now! Future updates will add:
- Visual galaxy map
- Sound effects
- More ship types
- Advanced combat
- Multiplayer features
- And much more!

---

## 🎮 Have Fun!

This is just the beginning! Explore, trade, fight, and build your trading empire!

**Pro Tip**: The best players balance risk and reward. Safe trades build wealth slowly. Events and combat offer big rewards but higher risk!

---

**Questions? Check MANUAL.md for detailed game mechanics!**
**Found a bug? See TESTING.md for how to report it!**
