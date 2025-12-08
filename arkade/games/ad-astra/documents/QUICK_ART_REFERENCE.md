# 🎨 Quick Art Reference

## File Naming Cheat Sheet

### Ships (200x200 WebP)
```
ship_scout.webp          → Blue fast ship
ship_trader.webp         → Green balanced ship
ship_freighter.webp      → Orange cargo hauler
ship_corvette.webp       → Magenta combat ship
ship_destroyer.webp      → Red heavy warship
ship_battleship.webp     → Yellow ultimate warship
```

### Planets (200x200 WebP)
```
planet_desert.webp       → Sandy/brown desert world
planet_forest.webp       → Green lush world
planet_industrial.webp   → Gray polluted world
planet_ocean.webp        → Blue water world
planet_rocky.webp        → Gray barren world
planet_urban.webp        → Gray city-covered world
```

### Stations (200x200 WebP)
```
station_mining.webp              → Mining platform ⛏️
station_agricultural.webp        → Farm station 🌾
station_industrial.webp          → Factory station 🏭
station_commercial_hub.webp      → Trading hub 🏢
station_black_market.webp        → Criminal outpost 💀
station_military.webp            → Military base 🛡️
```

### Enemies (200x200 WebP)
```
enemy_pirate.webp        → Red ragged pirate ship
enemy_alien.webp         → Green mysterious alien
enemy_mercenary.webp     → Orange professional hunter
```

### Commodities (64x64 WebP - Small Icons)
```
commodity_organics.webp      → Green food/medicine 🌾
commodity_equipment.webp     → Gray tools/tech ⚙️
commodity_ore.webp           → Brown minerals ⛏️
commodity_contraband.webp    → Red illegal goods 💀
```

### Animations (WebM Video)
```
warp_jump.webm          → 512x512, 2s - Warp effect
explosion.webm          → 512x512, 1.5s - Ship explodes
laser_fire.webm         → 256x256, 0.5s - Weapon fires
shield_hit.webm         → 256x256, 0.5s - Shield impact
docking.webm            → 512x512, 2s - Ship docks
hyperdrive.webm         → 1920x1080, loop - Background
```

### UI Elements (WebP)
```
bg_nebula.webp          → 1920x1080 - Colorful nebula
bg_stars.webp           → 512x512 - Tileable starfield
ui_button_hover.webp    → 200x50 - Button glow
ui_panel_border.webp    → 64x64 - Sci-fi border
```

---

## Color Palette

### Ships
- Scout: `#4a9eff` (Blue)
- Trader: `#44ff44` (Green)
- Freighter: `#ffaa44` (Orange)
- Corvette: `#ff44ff` (Magenta)
- Destroyer: `#ff4444` (Red)
- Battleship: `#ffff44` (Yellow)

### Planets
- Desert: `#d4a574` (Sandy)
- Forest: `#44aa44` (Green)
- Industrial: `#888888` (Gray)
- Ocean: `#4488ff` (Blue)
- Rocky: `#999999` (Gray)
- Urban: `#cccccc` (Light Gray)

### Enemies
- Pirate: `#ff4444` (Red)
- Alien: `#44ff88` (Green)
- Mercenary: `#ffaa44` (Orange)

### Commodities
- Organics: `#44aa44` (Green)
- Equipment: `#888888` (Gray)
- Ore: `#d4a574` (Brown)
- Contraband: `#ff4444` (Red)

### Backgrounds
- Space: `#1a1a2e` (Dark blue-black)
- Deep Space: `#0a0a1a` (Almost black)

---

## Priority Order (Start Here!)

### Phase 1 - Core Gameplay (Most Visible)
1. **Ships** (6 files) - Players see these constantly
2. **Planets** (6 files) - Main trading locations
3. **Stations** (6 files) - Docking and services

### Phase 2 - Combat & Trading
4. **Enemies** (3 files) - Combat encounters
5. **Commodities** (4 files) - Trading icons

### Phase 3 - Polish
6. **Animations** (6 files) - Visual effects
7. **UI Elements** (4 files) - Backgrounds and polish

---

## Quick Start

1. Pick a category (ships, planets, etc.)
2. Create 200x200 or 64x64 image (see dimensions above)
3. Use the color scheme for that type
4. Save as WebP format
5. Name it exactly as shown (e.g., `ship_scout.webp`)
6. Drop in `assets/images/` folder
7. Reload game - your art appears!

---

## File Locations

```
assets/
├── images/
│   ├── ship_*.webp           (6 files)
│   ├── planet_*.webp         (6 files)
│   ├── station_*.webp        (6 files)
│   ├── enemy_*.webp          (3 files)
│   ├── commodity_*.webp      (4 files)
│   ├── bg_*.webp             (2 files)
│   └── ui_*.webp             (2 files)
└── animations/
    ├── warp_jump.webm
    ├── explosion.webm
    ├── laser_fire.webm
    ├── shield_hit.webm
    ├── docking.webm
    └── hyperdrive.webm
```

---

**Total Assets: 35 files**
- 23 images (WebP)
- 6 animations (WebM)
- 4 UI elements (WebP)
- 2 backgrounds (WebP)
