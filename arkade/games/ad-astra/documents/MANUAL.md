# Ad Astra - User Manual

## Getting Started

### Creating an Account
1. Open the game in your web browser
2. Click "Create Account"
3. Choose a username and password
4. Create your character

### Character Creation
- Choose your pilot name
- Starting ship is provided (basic scout vessel)
- Starting credits: 10,000
- Starting location: Random sector in the galaxy

## Game Basics

## Interface Guide

### 1. The Dashboard
The top bar displays your vital stats:
- **Credits**: Your current money.
- **Turns**: Actions remaining for the day.
- **Ship**: Your current vessel.

### 2. Navigation Tabs
- **Ship**: View your ship's status, cargo, and perform maintenance (Repair/Refuel).
- **Sector**: The main view showing your current location, other ships, and warp gates.
- **Galaxy Map**: Interactive visual map of the entire galaxy with zoom and pan controls.
  - **Auto-Centers** on your current location
  - **Mouse Wheel**: Scroll to zoom in/out (0.5x to 5x)
  - **Click & Drag**: Pan around the map
  - **Touch/Pinch**: Zoom on mobile devices
  - **Zoom Controls**: Use [+] [-] [⌂] buttons in top-right corner
  - **Current Location**: Bright green pulsing marker - impossible to miss!
  - **Click Sectors**: Warp to any reachable sector instantly
  - **Unreachable Sectors**: Dimmed if you don't have enough fuel
- **Trade**: Access the planetary exchange to buy/sell goods (only available when docked).
- **Stats**: View your pilot's career statistics and achievements.

### 3. Message Log
The bottom panel records all important events. You can clear it if it gets too cluttered.

### Your Ship
Ships have five main attributes:
- **Hull Points (HP)**: Ship's health/durability
- **Cargo Holds**: Storage capacity for goods
- **Weapons**: Combat capability
- **Shields**: Defensive capability
- **Fuel Tank**: Capacity for warp fuel

### Ship Classes
You can now command different types of vessels:
- **Scout**: Fast, fuel-efficient, but weak.
- **Trader**: Massive cargo hold, poor combat stats.
- **Fighter**: Strong weapons and shields, small cargo.
- **Explorer**: Huge fuel tank and efficiency, weak hull.
- **Hauler**: The ultimate cargo ship, very slow and fuel hungry.

### The Galaxy
- The galaxy consists of interconnected sectors
- Each sector may contain:
  - Planets (for trading)
  - Space stations (for repairs/upgrades)
  - Other players
  - Debris/asteroids
  - Random encounters

### Navigation
- Move between sectors using warp drives
- **Fuel Cost**: Each warp consumes fuel based on distance and ship efficiency
- **Travel Time**: Warps take time to complete (seconds)
- **Jump Gates**: Instant travel between distant sectors (costs credits)
- Each warp uses 1 turn
- Turns regenerate over time

### Trading
- Buy low, sell high
- Different planets have different economies
- Commodities: Ore, Organics, Equipment
- **Black Market**: Illegal goods (Contraband, Arms, Narcotics) offer high profit but carry risk.
- **Police Inspections**: Police may scan your cargo. If caught with illegal goods, you face fines and confiscation.
- Prices fluctuate based on supply/demand

### Combat
- Turn-based combat system
- Attack, Defend, or Flee options
- Weapons effectiveness vs. shields
- Destroyed ships drop cargo/credits

### Random Events
Events can happen during travel:
- Warp drive malfunctions
- Pirate encounters
- Asteroid fields
- Distress signals
- Equipment failures
- Lucky finds

### Turns
- Most actions consume turns
- Moving: 1 turn
- Trading: 1 turn per transaction
- Combat: 1 turn per action
- Turns regenerate: 50 per day (adjustable by admin)

## Admin/Sysop Features
(Requires admin account)
- Generate new galaxy
- Set galaxy size
- Adjust turn regeneration rates
- View player statistics
- Manage economy settings
- Create random events

## Tips & Strategy
1. Start by trading between nearby sectors
2. Upgrade your cargo holds before weapons
3. Avoid unnecessary combat early on
4. Map out profitable trade routes
5. Watch for random events - they can be opportunities or disasters
6. Join or create a corporation for protection

## Troubleshooting

### Game won't load
- **CORS Error**: The game requires an HTTP server to run
  - Start a local server: `python -m http.server 8000`
  - Open: `http://localhost:8000/index.html`
  - Cannot open directly as `file:///` due to ES6 module restrictions
- Check browser console for errors
- Clear localStorage and try again
- Ensure JavaScript is enabled

### Lost progress
- Data is stored locally in your browser
- Clearing browser data will reset progress
- Once deployed, server will handle persistence

## Version History
See CHANGELOG.md for detailed version history
