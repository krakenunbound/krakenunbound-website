# Ad Astra - Assets Directory

This directory contains all visual and audio assets for the game.

## Directory Structure

```
assets/
├── images/          # Ship, planet, station, enemy, commodity, and UI images
├── animations/      # WebM video animations for game effects
├── audio/           # Sound effects and music (already populated)
└── fonts/           # Game fonts (already populated)
```

## Adding Visual Assets

### Images (`/assets/images/`)

All images should be in **WebP format** for optimal compression and quality. The game will automatically use these images when present, falling back to SVG placeholders if missing.

**Required Images:**
- **Ships**: 6 ship classes @ 200x200px
  - `ship-scout.webp`, `ship-trader.webp`, `ship-freighter.webp`
  - `ship-corvette.webp`, `ship-destroyer.webp`, `ship-battleship.webp`

- **Planets**: 6 planet types @ 200x200px
  - `planet-desert.webp`, `planet-forest.webp`, `planet-industrial.webp`
  - `planet-ocean.webp`, `planet-rocky.webp`, `planet-urban.webp`

- **Stations**: 6 station types @ 200x200px
  - `station-mining.webp`, `station-agricultural.webp`, `station-industrial.webp`
  - `station-commercial.webp`, `station-blackmarket.webp`, `station-military.webp`

- **Enemies**: 3 enemy types @ 200x200px
  - `enemy-pirate.webp`, `enemy-alien.webp`, `enemy-mercenary.webp`

- **Commodities**: 4 commodity icons @ 64x64px
  - `commodity-organics.webp`, `commodity-equipment.webp`
  - `commodity-ore.webp`, `commodity-contraband.webp`

### Animations (`/assets/animations/`)

All animations should be in **WebM format** (VP9 codec) with alpha channel support.

**Required Animations:**
- `warp-jump.webm` - Ship entering warp (2 seconds)
- `explosion.webm` - Ship destruction (3 seconds)
- `laser-fire.webm` - Weapon fire (1 second, loopable)
- `shield-hit.webm` - Shield impact effect (1 second)
- `docking.webm` - Ship docking sequence (2 seconds)
- `hyperdrive.webm` - Warp effect (2 seconds, loopable)

## How It Works

The `AssetManager` (`js/assets.js`) automatically detects and loads assets:

1. **Automatic Fallback**: If an asset file doesn't exist, the game generates a colorful SVG placeholder
2. **Hot-Swappable**: Just drop properly named files into the folders - no code changes needed!
3. **Progressive Enhancement**: The game works perfectly with placeholders, add art incrementally

## Asset Specifications

For complete specifications including design notes, color palettes, technical details, and priority order, see:

**📋 [ASSET_MANIFEST.md](../ASSET_MANIFEST.md)**

This manifest contains:
- Detailed descriptions of each asset
- Recommended art style and aesthetic
- Technical specifications (dimensions, formats, codecs)
- Design notes and color guidance
- Priority order for implementation

## Testing Assets

After adding assets:
1. Refresh the game in your browser
2. The AssetManager will automatically load new assets
3. Check browser console for any loading errors
4. SVG placeholders will remain for any missing assets

## Asset Creation Tools

Recommended tools:
- **Image Editing**: GIMP, Photoshop, Affinity Photo
- **WebP Conversion**: `cwebp` command-line tool, online converters
- **Animation**: Blender, After Effects, Krita
- **WebM Conversion**: FFmpeg with VP9 encoder

### Quick WebP Conversion

```bash
# Convert PNG to WebP
cwebp -q 85 input.png -o output.webp

# Batch convert all PNG files
for file in *.png; do cwebp -q 85 "$file" -o "${file%.png}.webp"; done
```

### Quick WebM Conversion

```bash
# Convert video to WebM with alpha channel
ffmpeg -i input.mov -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1M output.webm
```

---

**Game Version**: v0.8.0 "Multiplayer Foundation"
**Last Updated**: 2025-11-20
