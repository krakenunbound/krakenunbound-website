# Ad Astra

A modern web-based space trading and exploration game.

## Overview
**Journey to the Stars** - A fully-featured space trading and exploration game with:
- 🚀 **Interactive Galaxy Map** with zoom, pan, and auto-centering
- 📱 **Responsive Design** - works on desktop, tablet, and mobile
- 🎮 **Account System** - create characters and save progress
- 🛸 **Multiple Ship Classes** - Scout, Trader, Fighter, Explorer, Hauler
- 💰 **Dynamic Economy** - trade legal goods and risky contraband
- 🌟 **Daily Price Changes** - deterministic daily market dynamics
- 🏢 **Port Classifications** - 6 specialized port types (Mining, Agricultural, Industrial, Commercial, Black Market, Military)
- 💬 **Message Boards** - leave messages at ports and planets (7 message types)
- 🖥️ **NEW: Computer Systems** - navigation computer, intel, bookmarks, fighter command, colony management
- ⚔️ **Turn-Based Combat** - fight pirates, aliens, and other players
- 🎲 **Random Events** - encounters during space travel
- ⛽ **Fuel Management** - plan routes and refuel at stations
- 🛣️ **Warp Lane Navigation** - strategic travel through connected sectors
- ⏰ **Daily Turn Resets** - fixed turn limits at UTC midnight
- 🌌 **Seeded Galaxies** - reproducible universes for multiplayer
- 🎵 **Dynamic Audio** - context-aware music and sound effects
- 👥 **NEW: Player Tracking** - see other players in sectors, multiplayer presence
- 🧪 **NEW: Alpha Testing** - in-game testing framework with 87 test cases
- 🎨 **NEW: Asset System** - hot-swappable art assets with automatic placeholders
- 👨‍💼 **Admin Controls** - galaxy management tools

### v0.8.0 - Now 95% Multiplayer Ready!
The game now features complete multiplayer infrastructure with player tracking, PvP combat backend, alpha testing framework, and asset management - plus strategic systems including navigation computer, fighter deployments, colonization, and port-based message boards. Ready for server integration!

## Screenshots

### Galaxy Map - 100 Sectors with Warp Lanes
![Galaxy Map](screenshots/03_galaxy_map.png)
*Interactive galaxy map with zoom, pan, and warp lane visualization. Different star types and strategic navigation.*

### Trading System - Dynamic Economy
![Trading Interface](screenshots/09_trade_view_sector_1.png)
*Buy and sell commodities at planets and stations. Daily price changes and supply management.*

### Navigation Computer - Route Planning
![Navigation Computer](screenshots/15_route_to_50_results.png)
*BFS pathfinding, route optimization, and nearest location finder. Plan your journey across the galaxy.*

### Ship Management - Stats & Cargo
![Ship View](screenshots/02_ship_view.png)
*Track your ship's hull, shields, weapons, fuel, and cargo. Multiple ship classes with unique stats.*

## Project Structure
```
/ad-astra/
├── index.html              # Main game entry point
├── css/
│   ├── main.css           # Core styles
│   └── ui.css             # UI component styles
├── js/
│   ├── main.js            # Application initialization
│   ├── auth.js            # Authentication & account management
│   ├── game-state.js      # Core game state management
│   ├── galaxy.js          # Galaxy generation & management
│   ├── ship.js            # Ship classes & stats
│   ├── combat.js          # Combat system
│   ├── trading.js         # Trading mechanics
│   ├── events.js          # Random events system
│   ├── messages.js        # Message board system
│   ├── navigation.js      # Navigation computer & pathfinding
│   ├── computer.js        # Intel, bookmarks, sector analysis
│   ├── fighters.js        # Fighter & mine deployment
│   ├── colonization.js    # Colony creation & management
│   ├── multiplayer.js     # NEW: Player tracking & presence
│   ├── pvp.js             # NEW: Player vs player combat
│   ├── assets.js          # NEW: Asset management system
│   ├── alpha-tester.js    # NEW: Testing framework
│   ├── audio.js           # NEW: Audio system with playlist support
│   ├── music-loader.js    # NEW: Dynamic music discovery
│   ├── ui.js              # UI rendering & updates
│   ├── admin.js           # Admin/sysop controls
│   └── utils.js           # Helper functions
├── docs/
│   ├── CHANGELOG.md                    # Version history & changes
│   ├── STATUS.md                       # Current project status
│   ├── MANUAL.md                       # User manual
│   ├── TODO.md                         # Next steps & roadmap
│   ├── SYSTEM_ANALYSIS.md              # Technical system breakdown
│   ├── IMPLEMENTATION_GUIDE.md         # Code examples & testing
│   ├── DYNAMIC_MUSIC_SYSTEM.md         # NEW: Music system guide
│   └── MUSIC_ENHANCEMENTS.md           # NEW: Playlist features
└── assets/
    ├── audio/
    │   ├── music/        # Background music tracks (dynamic discovery)
    │   └── sfx/          # Sound effects
    ├── images/           # NEW: Ship, planet, station images (WebP)
    ├── animations/       # NEW: Game animations (WebM)
    └── fonts/            # Custom fonts (Unispace)
```

## Local Testing
**⚠️ Important:** The game requires an HTTP server due to ES6 module CORS restrictions.

### Quick Start:
```bash
# Navigate to game directory
cd "path/to/ad-astra"

# Start Python HTTP server
python -m http.server 8000

# Open browser to:
http://localhost:8000/index.html
```

### Features:
- No build process needed - pure HTML/CSS/JS
- Uses localStorage for data persistence
- Works on desktop and mobile browsers
- Fully playable offline once loaded

## Future Deployment
- Backend: Node.js/Express or Python Flask
- Database: PostgreSQL or MongoDB
- Authentication: JWT tokens
- Real-time: WebSockets for multiplayer

## Tech Stack
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- localStorage for local persistence
- Modular ES6 modules
