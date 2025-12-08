# Ad Astra - Asset Manifest
## Required Art Assets for v0.8.0+

This document lists all image and animation assets needed for the game. Place files in the appropriate directories:
- **Images**: `/assets/images/`
- **Animations**: `/assets/animations/`

Game will use SVG placeholders if assets are not found, so add art incrementally!

---

## 📦 Directory Structure
```
assets/
├── images/
│   ├── ships/           (or flat with ship_ prefix)
│   ├── planets/         (or flat with planet_ prefix)
│   ├── stations/        (or flat with station_ prefix)
│   ├── enemies/         (or flat with enemy_ prefix)
│   ├── commodities/     (or flat with commodity_ prefix)
│   └── ui/              (or flat with ui_ prefix)
└── animations/
    └── *.webm files
```

---

## 🚀 SHIPS (200x200px recommended)

### File Format: `.webp` (recommended) or `.png`
### Naming: `ship_[name].webp` (e.g., `ship_scout.webp`)

| Ship Class | Filename | Description | Design Notes |
|------------|----------|-------------|--------------|
| **Scout** | `ship_scout.webp` | Fast, agile scout vessel | Small, sleek design. Minimal cargo pods. Blue accent colors. Think interceptor. |
| **Trader** | `ship_trader.webp` | Balanced trading ship | Medium size, visible cargo containers. Green/neutral colors. Boxy but streamlined. |
| **Freighter** | `ship_freighter.webp` | Large cargo hauler | Very large, bulky design. Massive cargo bays. Orange/industrial colors. Slow-looking. |
| **Corvette** | `ship_corvette.webp` | Fast combat ship | Sleek, weapon-focused design. Purple accents. Visible gun mounts. Military aesthetic. |
| **Destroyer** | `ship_destroyer.webp` | Heavy combat vessel | Large warship, menacing. Red accents. Heavy armor plating. Multiple weapons. |
| **Battleship** | `ship_battleship.webp` | Massive warship | Enormous, intimidating. Yellow/gold accents. Capital ship aesthetic. Ultimate firepower. |

**Design Philosophy**: Each ship should be instantly recognizable by silhouette. Show their role (cargo vs combat) through visual design.

---

## 🪐 PLANETS (200x200px recommended)

### File Format: `.webp` (recommended) or `.png`
### Naming: `planet_[type].webp` (e.g., `planet_desert.webp`)

| Planet Type | Filename | Description | Design Notes |
|-------------|----------|-------------|--------------|
| **Desert** | `planet_desert.webp` | Arid desert world | Tan/brown colors. Sand dunes. Maybe dual suns in background. Think Tatooine. |
| **Forest** | `planet_forest.webp` | Lush green world | Green with blue oceans. Visible forests from space. Earth-like but more verdant. |
| **Industrial** | `planet_industrial.webp` | Polluted factory world | Gray/brown smog. Visible city lights. Pollution clouds. Cyberpunk aesthetic. |
| **Ocean** | `planet_ocean.webp` | Water world | Deep blue. Swirling clouds. Minimal land masses. Maybe underwater cities? |
| **Rocky** | `planet_rocky.webp` | Barren rocky world | Gray/brown rock. Craters. No atmosphere/thin atmosphere. Harsh, lifeless. |
| **Urban** | `planet_urban.webp` | City-covered world | Gray/white. Covered in cities. Bright lights visible. Coruscant-style ecumenopolis. |

**Design Philosophy**: Should look good as circles/spheres with atmospheric glow. Show from space perspective.

---

## 🏗️ STATIONS (200x200px recommended)

### File Format: `.webp` (recommended) or `.png`
### Naming: `station_[class].webp` (e.g., `station_mining.webp`)

| Station Class | Filename | Description | Icon | Design Notes |
|---------------|----------|-------------|------|--------------|
| **Mining** | `station_mining.webp` | Mining platform | ⛏️ | Industrial look. Drills, extractors, resource silos. Dark metal. |
| **Agricultural** | `station_agricultural.webp` | Farm station | 🌾 | Green/growth lighting. Visible greenhouses. Hydroponics bays. |
| **Industrial** | `station_industrial.webp` | Manufacturing station | 🏭 | Factories, smokestacks, assembly lines. Heavy machinery visible. |
| **Commercial Hub** | `station_commercial_hub.webp` | Trading hub | 🏢 | Clean, modern. Docking bays. Bright lights. Welcoming appearance. |
| **Black Market** | `station_black_market.webp` | Hidden criminal outpost | 💀 | Dark, shadowy. Damage, wear and tear. Ominous red lights. |
| **Military** | `station_military.webp` | Fortified military base | 🛡️ | Heavily armed. Armor plating. Weapon turrets. Imposing presence. |

**Design Philosophy**: Each station should reflect its purpose. Military looks defensive, agricultural looks life-sustaining, etc.

---

## 👾 ENEMIES (200x200px recommended)

### File Format: `.webp` (recommended) or `.png`
### Naming: `enemy_[type].webp` (e.g., `enemy_pirate.webp`)

| Enemy Type | Filename | Description | Design Notes |
|------------|----------|-------------|--------------|
| **Pirate** | `enemy_pirate.webp` | Ragged pirate ship | Cobbled together, mismatched parts. Skull markings? Red/black colors. Menacing. |
| **Alien** | `enemy_alien.webp` | Mysterious alien vessel | Organic or crystalline design. Unfamiliar technology. Glowing elements. Otherworldly. |
| **Mercenary** | `enemy_mercenary.webp` | Professional bounty hunter | Clean, professional military design. Neutral colors. Well-maintained. Dangerous. |

**Design Philosophy**: Should look threatening but distinct from each other. Pirates = chaotic, Aliens = mysterious, Mercs = professional.

---

## 📦 COMMODITIES (64x64px icons)

### File Format: `.webp` (recommended) or `.png`
### Naming: `commodity_[name].webp` (e.g., `commodity_organics.webp`)

| Commodity | Filename | Description | Icon | Design Notes |
|-----------|----------|-------------|------|--------------|
| **Organics** | `commodity_organics.webp` | Food, medicine, biological goods | 🌾 | Green crate with bio-hazard symbol. Fresh, living materials. |
| **Equipment** | `commodity_equipment.webp` | Tools, machinery, technology | ⚙️ | Gray/metallic crate with gear symbol. Industrial tools. |
| **Ore** | `commodity_ore.webp` | Raw minerals and metals | ⛏️ | Brown/rocky crate with mineral crystals visible. |
| **Contraband** | `commodity_contraband.webp` | Illegal goods and substances | 💀 | Dark crate with danger markings. Shadowy, illicit appearance. |

**Design Philosophy**: Should be recognizable at small size as UI icons. Clear symbols/colors to distinguish quickly.

---

## 🎬 ANIMATIONS (WebM format, VP9 codec recommended)

### File Format: `.webm` with alpha channel (transparency) if possible
### Naming: `[effect].webm` (e.g., `warp_jump.webm`)

| Animation | Filename | Duration | Description | Design Notes |
|-----------|----------|----------|-------------|--------------|
| **Warp Jump** | `warp_jump.webm` | ~2 seconds | Warp effect when jumping sectors | Stretching stars effect, flash of light. Sci-fi warp transition. |
| **Explosion** | `explosion.webm` | ~1.5 sec | Ship explosion when destroyed | Fiery explosion with debris. Satisfying kaboom effect. |
| **Laser Fire** | `laser_fire.webm` | ~0.5 sec | Weapon firing | Bright energy beam/bolt. Could be red, blue, or green. |
| **Shield Hit** | `shield_hit.webm` | ~0.5 sec | Shield impact/ripple | Energy shield ripple effect when hit. Hexagonal pattern? |
| **Docking** | `docking.webm` | ~2 seconds | Ship docking at station | Ship approaching and connecting to docking bay. |
| **Hyperdrive** | `hyperdrive.webm` | Loop | Background effect during travel | Streaming stars, tunnel effect. Seamless loop. |

**Design Philosophy**: Should be lightweight (< 1MB each). Can use alpha channel for transparency. Should feel sci-fi/futuristic.

**Technical Notes**:
- Use VP9 codec for best quality/size ratio
- Include alpha channel if possible for layering
- Target 30fps or 60fps for smooth playback
- Optimize file size aggressively (users on slow connections)

---

## 🎨 UI ELEMENTS (Various sizes)

### File Format: `.webp` (recommended) or `.png`
### Naming: `ui_[element].webp` (e.g., `ui_button_hover.webp`)

| UI Element | Filename | Size | Description | Design Notes |
|------------|----------|------|-------------|--------------|
| **Background Nebula** | `bg_nebula.webp` | 1920x1080+ | Space background with nebula | Colorful space clouds. Should tile or be large enough for all screens. |
| **Background Stars** | `bg_stars.webp` | 512x512 | Starfield background (tileable) | Small white dots on black. Should tile seamlessly. |
| **Button Hover** | `ui_button_hover.webp` | 300x60 | Button hover effect | Glowing edge effect, sci-fi accent. |
| **Panel Border** | `ui_panel_border.webp` | Various | Sci-fi panel border decoration | Geometric/tech decorations for UI panels. |

**Design Philosophy**: Should enhance the sci-fi aesthetic without being distracting. Subtle, futuristic, clean.

---

## 🎯 PRIORITY ORDER (Implement in this order)

### Phase 1 - Core Visuals (Most Impact)
1. Ships (all 6) - Players see these constantly
2. Planets (all 6) - Common in galaxy view
3. Background Nebula - Sets the mood

### Phase 2 - Combat & Interaction
4. Enemies (all 3) - Combat encounters
5. Warp Jump animation - Used every turn
6. Explosion animation - Combat satisfaction

### Phase 3 - Economic & Stations
7. Stations (all 6) - Trading locations
8. Commodity icons (all 4) - Trading UI

### Phase 4 - Polish & Effects
9. Remaining animations (shield, laser, docking, hyperdrive)
10. UI elements (borders, hover effects, starfield)

---

## 📐 TECHNICAL SPECIFICATIONS

### Image Formats
- **Preferred**: WebP (best compression, browser support excellent)
- **Fallback**: PNG (transparency support)
- **Avoid**: JPEG (no transparency, worse for UI)

### Recommended Dimensions
- **Ships**: 200x200px (displayed at 100-200px typically)
- **Planets**: 200x200px (displayed at 150-250px typically)
- **Stations**: 200x200px (displayed at 150-250px typically)
- **Enemies**: 200x200px (displayed at 150-200px typically)
- **Commodity Icons**: 64x64px (small UI icons)
- **Backgrounds**: 1920x1080px or tileable

### Animation Specs
- **Format**: WebM (VP9 codec)
- **FPS**: 30-60fps
- **Alpha**: Include if possible (transparency)
- **Duration**: As specified above
- **Size**: < 1MB per file (optimize!)

### Color Palette (for consistency)
- **Background Dark**: #0a0e27 (deep space blue-black)
- **Accent Blue**: #4a90e2 (tech blue)
- **Accent Green**: #00ff88 (success/alien green)
- **Accent Orange**: #ff8844 (warning/industrial)
- **Accent Red**: #ff4444 (danger/pirate)
- **Accent Purple**: #aa44ff (exotic/mysterious)

---

## 🎨 ART STYLE GUIDANCE

### Overall Aesthetic
- **Sci-Fi Space Opera**: Think Star Wars, Elite Dangerous, EVE Online
- **Clean but Lived-In**: Technology looks advanced but used
- **Colorful**: Not grimdark, has vibrant colors and life
- **Readable**: Clear silhouettes, distinct at small sizes

### Visual Hierarchy
1. **Clarity First**: Players should instantly understand what they're looking at
2. **Distinct Classes**: Each ship/planet/station type should be unique
3. **Role-Based Design**: Visual design should hint at function
4. **Scale Indication**: Bigger ships should LOOK bigger/heavier

### Rendering Style Options (Choose one)
- **3D Rendered**: Pre-rendered 3D models (most professional)
- **Pixel Art**: Retro pixel aesthetic (faster to produce)
- **Vector/Flat**: Clean flat design with gradients
- **Hand-Drawn**: Artistic illustration style

**Recommendation**: 3D rendered with a slight stylized/painterly look. Best balance of professional and distinctive.

---

## 📝 NOTES

- **Placeholders Work**: Game has SVG placeholders if images are missing
- **Incremental Addition**: Add art gradually, test as you go
- **Consistent Style**: All assets should feel like they belong together
- **Optimization**: Always compress/optimize before adding to game
- **Transparency**: Use alpha channel where appropriate (ships, animations)
- **Testing**: View assets at intended display size during creation

---

## 🔧 HOW TO ADD ASSETS

1. Create asset (follow specs above)
2. Optimize/compress file
3. Name according to convention
4. Place in `/assets/images/` or `/assets/animations/`
5. Refresh game - should automatically load!

No code changes needed - asset system handles everything!

---

## 📊 ASSET CHECKLIST

Track your progress:

### Ships
- [ ] Scout (ship_scout.webp)
- [ ] Trader (ship_trader.webp)
- [ ] Freighter (ship_freighter.webp)
- [ ] Corvette (ship_corvette.webp)
- [ ] Destroyer (ship_destroyer.webp)
- [ ] Battleship (ship_battleship.webp)

### Planets
- [ ] Desert (planet_desert.webp)
- [ ] Forest (planet_forest.webp)
- [ ] Industrial (planet_industrial.webp)
- [ ] Ocean (planet_ocean.webp)
- [ ] Rocky (planet_rocky.webp)
- [ ] Urban (planet_urban.webp)

### Stations
- [ ] Mining (station_mining.webp)
- [ ] Agricultural (station_agricultural.webp)
- [ ] Industrial (station_industrial.webp)
- [ ] Commercial Hub (station_commercial_hub.webp)
- [ ] Black Market (station_black_market.webp)
- [ ] Military (station_military.webp)

### Enemies
- [ ] Pirate (enemy_pirate.webp)
- [ ] Alien (enemy_alien.webp)
- [ ] Mercenary (enemy_mercenary.webp)

### Commodities
- [ ] Organics (commodity_organics.webp)
- [ ] Equipment (commodity_equipment.webp)
- [ ] Ore (commodity_ore.webp)
- [ ] Contraband (commodity_contraband.webp)

### Animations
- [ ] Warp Jump (warp_jump.webm)
- [ ] Explosion (explosion.webm)
- [ ] Laser Fire (laser_fire.webm)
- [ ] Shield Hit (shield_hit.webm)
- [ ] Docking (docking.webm)
- [ ] Hyperdrive (hyperdrive.webm)

### UI
- [ ] Background Nebula (bg_nebula.webp)
- [ ] Background Stars (bg_stars.webp)
- [ ] Button Hover (ui_button_hover.webp)
- [ ] Panel Border (ui_panel_border.webp)

**Total Assets**: 35 files (29 images + 6 animations)

---

**Questions?** The game will work perfectly with placeholders. Add art incrementally and see the game transform visually!
