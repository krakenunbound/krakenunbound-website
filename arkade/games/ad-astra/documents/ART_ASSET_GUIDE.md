# 🎨 Ad Astra - Art Asset Guide

## Overview

This guide provides complete specifications for creating art assets for Ad Astra. The game uses **WebP** for images and **WebM** for animations, with automatic SVG placeholder fallbacks.

---

## 📁 Directory Structure

```
assets/
├── images/          # All static images (.webp)
├── animations/      # All video animations (.webm)
└── fonts/           # Custom fonts
```

---

## 🚀 Ship Images

### Location: `assets/images/`

### File Naming Convention:
- `ship_scout.webp`
- `ship_trader.webp`
- `ship_freighter.webp`
- `ship_corvette.webp`
- `ship_destroyer.webp`
- `ship_battleship.webp`

### Specifications:
- **Format**: WebP
- **Dimensions**: 200x200 pixels (square)
- **Background**: Transparent or dark space (#1a1a2e)
- **Style**: Top-down or 3/4 view
- **Color Coding**:
  - Scout: Blue (#4a9eff) - Fast, agile
  - Trader: Green (#44ff44) - Balanced
  - Freighter: Orange (#ffaa44) - Large cargo
  - Corvette: Magenta (#ff44ff) - Fast combat
  - Destroyer: Red (#ff4444) - Heavy combat
  - Battleship: Yellow (#ffff44) - Ultimate power

### Design Notes:
- Ships should face upward (north)
- Include engine glow for visual interest
- Add subtle details (windows, panels, weapons)
- Keep designs clear and recognizable at small sizes

---

## 🌍 Planet Images

### Location: `assets/images/`

### File Naming Convention:
- `planet_desert.webp`
- `planet_forest.webp`
- `planet_industrial.webp`
- `planet_ocean.webp`
- `planet_rocky.webp`
- `planet_urban.webp`

### Specifications:
- **Format**: WebP
- **Dimensions**: 200x200 pixels (square)
- **Background**: Dark space (#0a0a1a)
- **Style**: Sphere with lighting/shading
- **Color Schemes**:
  - Desert: Sandy browns/oranges (#d4a574)
  - Forest: Greens with blue oceans (#44aa44)
  - Industrial: Grays with smog (#888888)
  - Ocean: Deep blues (#4488ff)
  - Rocky: Gray/brown barren (#999999)
  - Urban: Gray with city lights (#cccccc)

### Design Notes:
- Include atmospheric glow
- Add cloud layers for depth
- Show surface features (continents, cities, etc.)
- Consider adding rings or moons for variety

---

## 🏗️ Station Images

### Location: `assets/images/`

### File Naming Convention:
- `station_mining.webp`
- `station_agricultural.webp`
- `station_industrial.webp`
- `station_commercial_hub.webp`
- `station_black_market.webp`
- `station_military.webp`

### Specifications:
- **Format**: WebP
- **Dimensions**: 200x200 pixels (square)
- **Background**: Dark space (#1a1a2e)
- **Style**: Modular space station design
- **Themes**:
  - Mining: Extractors, drills, ore processing (⛏️)
  - Agricultural: Hydroponics, greenhouses (🌾)
  - Industrial: Factories, smokestacks (🏭)
  - Commercial Hub: Docking bays, markets (🏢)
  - Black Market: Hidden, shadowy, ominous (💀)
  - Military: Fortified, weapons platforms (🛡️)

### Design Notes:
- Make each station visually distinct
- Include docking ports
- Add lights and windows
- Show functional elements (solar panels, antennas, etc.)

---

## 👾 Enemy Images

### Location: `assets/images/`

### File Naming Convention:
- `enemy_pirate.webp`
- `enemy_alien.webp`
- `enemy_mercenary.webp`

### Specifications:
- **Format**: WebP
- **Dimensions**: 200x200 pixels (square)
- **Background**: Dark space (#1a1a2e)
- **Style**: Aggressive, threatening designs
- **Color Schemes**:
  - Pirate: Red, ragged, makeshift (#ff4444)
  - Alien: Green/teal, organic, mysterious (#44ff88)
  - Mercenary: Orange, professional, sleek (#ffaa44)

### Design Notes:
- Should look menacing
- Include weapon hardpoints
- Distinct from player ships
- Show damage or wear for pirates

---

## 📦 Commodity Icons

### Location: `assets/images/`

### File Naming Convention:
- `commodity_organics.webp`
- `commodity_equipment.webp`
- `commodity_ore.webp`
- `commodity_contraband.webp`

### Specifications:
- **Format**: WebP
- **Dimensions**: 64x64 pixels (small icons)
- **Background**: Dark with rounded corners (#1a1a2e, 8px radius)
- **Style**: Simple, iconic, clear at small size
- **Color Schemes**:
  - Organics: Green (#44aa44) - Food, plants
  - Equipment: Gray (#888888) - Tools, tech
  - Ore: Brown/orange (#d4a574) - Minerals
  - Contraband: Red (#ff4444) - Illegal goods

### Design Notes:
- Keep designs simple and bold
- Must be recognizable at 32x32 pixels
- Use solid shapes and clear silhouettes
- Consider using emoji-style designs

---

## 🎬 Animations

### Location: `assets/animations/`

### File Naming Convention:
- `warp_jump.webm`
- `explosion.webm`
- `laser_fire.webm`
- `shield_hit.webm`
- `docking.webm`
- `hyperdrive.webm`

### Specifications:
- **Format**: WebM (VP9 codec recommended)
- **Dimensions**: Varies by animation
  - Effects: 512x512 pixels (centered)
  - Backgrounds: 1920x1080 pixels (full screen)
- **Duration**:
  - Warp Jump: 2 seconds
  - Explosion: 1.5 seconds
  - Laser Fire: 0.5 seconds
  - Shield Hit: 0.5 seconds
  - Docking: 2 seconds
  - Hyperdrive: Loop (3-5 seconds)
- **Frame Rate**: 30 FPS
- **Transparency**: Alpha channel supported

### Animation Details:

#### Warp Jump (2s)
- Bright flash and streaking stars
- Ship disappears into light
- Dimensions: 512x512px

#### Explosion (1.5s)
- Expanding fireball
- Debris particles
- Fade to black
- Dimensions: 512x512px

#### Laser Fire (0.5s)
- Bright beam from weapon
- Quick flash
- Dimensions: 256x256px

#### Shield Hit (0.5s)
- Hexagonal shield ripple
- Blue/cyan energy
- Dimensions: 256x256px

#### Docking (2s)
- Ship approaching station
- Docking clamps engaging
- Dimensions: 512x512px

#### Hyperdrive (loop)
- Streaking stars background
- Seamless loop
- Dimensions: 1920x1080px

---

## 🎨 UI Elements

### Location: `assets/images/`

### File Naming Convention:
- `bg_nebula.webp`
- `bg_stars.webp`
- `ui_button_hover.webp`
- `ui_panel_border.webp`

### Specifications:

#### Background Nebula
- **Dimensions**: 1920x1080 pixels
- **Format**: WebP
- **Style**: Colorful space nebula
- **Colors**: Purple, blue, pink gradients
- **Usage**: Main menu background

#### Background Stars
- **Dimensions**: 512x512 pixels (tileable)
- **Format**: WebP
- **Style**: Starfield pattern
- **Usage**: Repeating background

#### Button Hover
- **Dimensions**: 200x50 pixels
- **Format**: WebP with transparency
- **Style**: Glow or highlight effect
- **Usage**: Overlay on buttons

#### Panel Border
- **Dimensions**: 64x64 pixels (9-slice compatible)
- **Format**: WebP
- **Style**: Sci-fi border decoration
- **Usage**: Panel edges

---

## 🛠️ Creation Tools

### Recommended Software:

**For Images:**
- **GIMP** (Free) - Full image editing
- **Krita** (Free) - Digital painting
- **Photoshop** - Professional editing
- **Aseprite** - Pixel art (if going retro)

**For Animations:**
- **Blender** (Free) - 3D animation, renders to WebM
- **After Effects** - Professional motion graphics
- **DaVinci Resolve** (Free) - Video editing
- **FFmpeg** - Convert to WebM format

### WebP Conversion:
```bash
# Convert PNG to WebP (lossless)
cwebp -lossless input.png -o output.webp

# Convert PNG to WebP (lossy, smaller file)
cwebp -q 80 input.png -o output.webp
```

### WebM Conversion:
```bash
# Convert video to WebM with transparency
ffmpeg -i input.mov -c:v libvpx-vp9 -pix_fmt yuva420p output.webm

# Convert video to WebM (no transparency)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 1M output.webm
```

---

## 📋 Asset Checklist

### Ships (6 total)
- [ ] ship_scout.webp (200x200)
- [ ] ship_trader.webp (200x200)
- [ ] ship_freighter.webp (200x200)
- [ ] ship_corvette.webp (200x200)
- [ ] ship_destroyer.webp (200x200)
- [ ] ship_battleship.webp (200x200)

### Planets (6 total)
- [ ] planet_desert.webp (200x200)
- [ ] planet_forest.webp (200x200)
- [ ] planet_industrial.webp (200x200)
- [ ] planet_ocean.webp (200x200)
- [ ] planet_rocky.webp (200x200)
- [ ] planet_urban.webp (200x200)

### Stations (6 total)
- [ ] station_mining.webp (200x200)
- [ ] station_agricultural.webp (200x200)
- [ ] station_industrial.webp (200x200)
- [ ] station_commercial_hub.webp (200x200)
- [ ] station_black_market.webp (200x200)
- [ ] station_military.webp (200x200)

### Enemies (3 total)
- [ ] enemy_pirate.webp (200x200)
- [ ] enemy_alien.webp (200x200)
- [ ] enemy_mercenary.webp (200x200)

### Commodities (4 total)
- [ ] commodity_organics.webp (64x64)
- [ ] commodity_equipment.webp (64x64)
- [ ] commodity_ore.webp (64x64)
- [ ] commodity_contraband.webp (64x64)

### Animations (6 total)
- [ ] warp_jump.webm (512x512, 2s)
- [ ] explosion.webm (512x512, 1.5s)
- [ ] laser_fire.webm (256x256, 0.5s)
- [ ] shield_hit.webm (256x256, 0.5s)
- [ ] docking.webm (512x512, 2s)
- [ ] hyperdrive.webm (1920x1080, loop)

### UI Elements (4 total)
- [ ] bg_nebula.webp (1920x1080)
- [ ] bg_stars.webp (512x512, tileable)
- [ ] ui_button_hover.webp (200x50)
- [ ] ui_panel_border.webp (64x64)

---

## 🎯 Quick Reference Table

| Asset Type | Dimensions | Format | Quantity | Location |
|------------|-----------|--------|----------|----------|
| Ships | 200x200 | WebP | 6 | assets/images/ |
| Planets | 200x200 | WebP | 6 | assets/images/ |
| Stations | 200x200 | WebP | 6 | assets/images/ |
| Enemies | 200x200 | WebP | 3 | assets/images/ |
| Commodities | 64x64 | WebP | 4 | assets/images/ |
| Animations | Various | WebM | 6 | assets/animations/ |
| UI Elements | Various | WebP | 4 | assets/images/ |
| **TOTAL** | - | - | **35** | - |

---

## 💡 Tips for Success

1. **Start Simple**: Begin with basic shapes and colors
2. **Test Early**: Drop files in and see how they look in-game
3. **Consistent Style**: Keep a unified art direction
4. **Optimize Files**: WebP and WebM are already compressed, but keep file sizes reasonable
5. **Use Placeholders**: The game has SVG fallbacks, so you can add art gradually
6. **Color Coding**: Use the suggested colors to help players identify things quickly
7. **Transparency**: Use alpha channels where appropriate (especially animations)

---

## 🔄 Hot-Swapping

The asset system supports **hot-swapping**:
1. Create your art file
2. Name it correctly (e.g., `ship_scout.webp`)
3. Drop it in `assets/images/` or `assets/animations/`
4. Reload the game - it will automatically use your art!

If the file doesn't exist, the game shows an SVG placeholder instead.

---

## 📞 Need Help?

- Check `ASSET_MANIFEST.md` for the complete asset list
- Look at `js/assets.js` to see how assets are loaded
- SVG placeholders show you what each asset should represent

---

**Happy Creating!** 🎨✨
