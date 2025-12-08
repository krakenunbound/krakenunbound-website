# 🎨 Art Asset Summary

## Complete Asset Specifications

I've created comprehensive art guides for Ad Astra! Here's everything you need to know:

---

## 📚 Documentation Created

1. **ART_ASSET_GUIDE.md** - Complete technical specifications
2. **QUICK_ART_REFERENCE.md** - Quick cheat sheet for file names and colors

---

## 📊 Asset Overview

### Total Assets Needed: **35 files**

| Category | Count | Dimensions | Format |
|----------|-------|------------|--------|
| Ships | 6 | 200x200 | WebP |
| Planets | 6 | 200x200 | WebP |
| Stations | 6 | 200x200 | WebP |
| Enemies | 3 | 200x200 | WebP |
| Commodities | 4 | 64x64 | WebP |
| Animations | 6 | Various | WebM |
| UI Elements | 4 | Various | WebP |

---

## 🎯 File Formats

### Images: **WebP**
- Modern format, great compression
- Supports transparency
- Smaller file sizes than PNG
- Widely supported

### Animations: **WebM**
- Video format for web
- Supports transparency (alpha channel)
- VP9 codec recommended
- Smooth playback

---

## 📐 Standard Dimensions

### Main Assets (200x200 pixels)
- All ships
- All planets
- All stations
- All enemies

### Icons (64x64 pixels)
- All commodity icons

### Animations (Various)
- Effects: 512x512 or 256x256
- Backgrounds: 1920x1080

---

## 🎨 Color Schemes

### Ships (by class)
```
Scout:      #4a9eff (Blue)      - Fast & agile
Trader:     #44ff44 (Green)     - Balanced
Freighter:  #ffaa44 (Orange)    - Cargo hauler
Corvette:   #ff44ff (Magenta)   - Fast combat
Destroyer:  #ff4444 (Red)       - Heavy combat
Battleship: #ffff44 (Yellow)    - Ultimate power
```

### Planets (by type)
```
Desert:      #d4a574 (Sandy brown)
Forest:      #44aa44 (Green)
Industrial:  #888888 (Gray)
Ocean:       #4488ff (Blue)
Rocky:       #999999 (Gray)
Urban:       #cccccc (Light gray)
```

---

## 📝 File Naming Convention

### Pattern: `[category]_[name].webp`

**Examples:**
- `ship_scout.webp`
- `planet_ocean.webp`
- `station_mining.webp`
- `enemy_pirate.webp`
- `commodity_ore.webp`

**Animations:**
- `warp_jump.webm`
- `explosion.webm`
- `laser_fire.webm`

---

## 📁 File Locations

```
assets/
├── images/          ← All .webp images go here
└── animations/      ← All .webm videos go here
```

---

## 🔄 Hot-Swapping Feature

The game supports **automatic asset loading**:

1. Create your art file
2. Name it correctly (e.g., `ship_scout.webp`)
3. Drop it in the appropriate folder
4. Reload the game
5. **Your art appears automatically!**

If a file doesn't exist, the game shows an SVG placeholder instead.

---

## 🎯 Priority Order

### Start with these (most visible):
1. **Ships** (6 files) - Players see constantly
2. **Planets** (6 files) - Main locations
3. **Stations** (6 files) - Docking points

### Then add:
4. **Enemies** (3 files) - Combat
5. **Commodities** (4 files) - Trading icons

### Polish with:
6. **Animations** (6 files) - Visual effects
7. **UI Elements** (4 files) - Backgrounds

---

## 🛠️ Recommended Tools

### For Images:
- **GIMP** (Free)
- **Krita** (Free)
- **Photoshop**
- **Aseprite** (for pixel art)

### For Animations:
- **Blender** (Free)
- **After Effects**
- **DaVinci Resolve** (Free)

### Conversion:
```bash
# PNG to WebP
cwebp -q 80 input.png -o output.webp

# Video to WebM
ffmpeg -i input.mp4 -c:v libvpx-vp9 output.webm
```

---

## 📋 Complete File List

### Ships (6)
- ship_scout.webp
- ship_trader.webp
- ship_freighter.webp
- ship_corvette.webp
- ship_destroyer.webp
- ship_battleship.webp

### Planets (6)
- planet_desert.webp
- planet_forest.webp
- planet_industrial.webp
- planet_ocean.webp
- planet_rocky.webp
- planet_urban.webp

### Stations (6)
- station_mining.webp
- station_agricultural.webp
- station_industrial.webp
- station_commercial_hub.webp
- station_black_market.webp
- station_military.webp

### Enemies (3)
- enemy_pirate.webp
- enemy_alien.webp
- enemy_mercenary.webp

### Commodities (4)
- commodity_organics.webp
- commodity_equipment.webp
- commodity_ore.webp
- commodity_contraband.webp

### Animations (6)
- warp_jump.webm (512x512, 2s)
- explosion.webm (512x512, 1.5s)
- laser_fire.webm (256x256, 0.5s)
- shield_hit.webm (256x256, 0.5s)
- docking.webm (512x512, 2s)
- hyperdrive.webm (1920x1080, loop)

### UI Elements (4)
- bg_nebula.webp (1920x1080)
- bg_stars.webp (512x512, tileable)
- ui_button_hover.webp (200x50)
- ui_panel_border.webp (64x64)

---

## ✨ Key Points

1. **Format**: WebP for images, WebM for animations
2. **Dimensions**: Mostly 200x200, commodities are 64x64
3. **Naming**: Exact names required (lowercase, underscores)
4. **Location**: `assets/images/` or `assets/animations/`
5. **Fallback**: SVG placeholders show if files missing
6. **Hot-swap**: Just drop files in and reload!

---

## 🎨 Design Tips

- Keep designs clear and recognizable
- Use the suggested color schemes
- Add subtle details (lights, panels, etc.)
- Test at actual size (200x200 or 64x64)
- Transparent backgrounds work great
- Consistent art style across all assets

---

**Ready to create amazing art for Ad Astra!** 🚀

See **ART_ASSET_GUIDE.md** for complete technical details.
See **QUICK_ART_REFERENCE.md** for quick file name lookup.
