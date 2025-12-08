# 🎵 Dynamic Music System - Ad Astra

## Overview

The music system now **automatically discovers** music files in the `assets/audio/music/` folder! No more hard-coding tracks - just drop numbered music files into the folder and they'll automatically appear as options.

---

## 📁 File Naming Convention

### Default Files (Always Work):
- `theme_menu.mp3` - Menu theme
- `theme_exploration.mp3` - Exploration theme
- `theme_combat.mp3` - Combat theme
- `theme_docked.mp3` - Docked theme

### Numbered Variants (Automatically Discovered):
- `theme_menu1.mp3`, `theme_menu2.mp3`, `theme_menu3.mp3`, etc.
- `theme_exploration1.mp3`, `theme_exploration2.mp3`, etc.
- `theme_combat1.mp3`, `theme_combat2.mp3`, etc.
- `theme_docked1.mp3`, `theme_docked2.mp3`, etc.

### How It Works:
1. System checks for default file (`theme_category.mp3`)
2. Then checks for numbered variants (`theme_category1.mp3`, `theme_category2.mp3`, etc.)
3. Stops checking when it finds a gap (if `theme_docked3.mp3` doesn't exist, it won't check for `theme_docked4.mp3`)
4. All discovered tracks are added to the available music list

---

## 🎮 Example Setup

### Scenario: You have multiple docked themes

**Files in `assets/audio/music/`:**
```
theme_menu.mp3
theme_exploration.mp3
theme_combat.mp3
theme_docked.mp3
theme_docked1.mp3
theme_docked2.mp3
theme_docked3.mp3
```

**Result:**
The system will discover:
- Menu Theme (default)
- Exploration Theme (default)
- Combat Theme (default)
- Docked Theme (default)
- Docked Theme 1 (variant)
- Docked Theme 2 (variant)
- Docked Theme 3 (variant)

**Total: 7 tracks available!**

Players can then:
- Add all docked variants to their playlist
- Shuffle them for variety
- Or pick specific favorites

---

## 🚀 How to Add New Music

### Step 1: Name Your File
Follow the naming convention:
- `theme_[category][number].mp3`
- Category: `menu`, `exploration`, `combat`, or `docked`
- Number: Optional, starts at 1

### Step 2: Drop in Folder
Place the file in: `assets/audio/music/`

### Step 3: Reload Game
The system will automatically discover it on next load!

### Example:
```bash
# Add a new exploration track
cp my_awesome_space_music.mp3 "assets/audio/music/theme_exploration5.mp3"

# Reload the game
# The track "Exploration Theme 5" will now be available!
```

---

## 💻 Technical Details

### Music Discovery Process

1. **On First Click**: System triggers `discoverMusic()`
2. **Scan Categories**: Checks each category (menu, exploration, combat, docked)
3. **Check Default**: Attempts to load `theme_category.mp3`
4. **Check Variants**: Attempts to load `theme_category1.mp3`, `theme_category2.mp3`, etc.
5. **Build List**: Creates `availableTracks` object with all found files
6. **Update Playlist**: Adds all new tracks to default playlist

### Files Involved:
- `js/music-loader.js` - Handles music discovery
- `js/audio.js` - Audio system with dynamic loading
- `js/main.js` - Triggers discovery on first click

### Key Methods:

```javascript
// Discover all music files
await window.game.audio.discoverMusic()

// Get all discovered tracks
window.game.audio.availableTracks

// Get tracks for specific category
window.game.audio.musicLoader.getTracksForCategory('docked')

// Get random track from category
window.game.audio.musicLoader.getRandomTrackFromCategory('exploration')

// Get total track count
window.game.audio.musicLoader.getTrackCount()
```

---

## 🎵 Console Output Example

When the game loads, you'll see:

```
🎵 Starting music discovery...
✅ Found: theme_menu.mp3
✅ Found: theme_exploration.mp3
✅ Found: theme_exploration1.mp3
✅ Found: theme_exploration2.mp3
✅ Found: theme_combat.mp3
✅ Found: theme_docked.mp3
✅ Found: theme_docked1.mp3
✅ Found: theme_docked2.mp3
✅ Found: theme_docked3.mp3

🎵 Music Discovery Summary:
═══════════════════════════
📁 Menu Theme: 1 track
   • Menu Theme
📁 Exploration Theme: 3 tracks
   • Exploration Theme
   • Exploration Theme 1
   • Exploration Theme 2
📁 Combat Theme: 1 track
   • Combat Theme
📁 Docked Theme: 4 tracks
   • Docked Theme
   • Docked Theme 1
   • Docked Theme 2
   • Docked Theme 3
═══════════════════════════
✨ Total tracks discovered: 9

🎵 Music system ready!
```

---

## 🎯 Use Cases

### 1. **Variety Pack**
Add multiple variants of each theme for variety:
```
theme_exploration1.mp3 - Calm space music
theme_exploration2.mp3 - Upbeat adventure
theme_exploration3.mp3 - Mysterious deep space
```

### 2. **Themed Collections**
Create themed music sets:
```
theme_docked1.mp3 - Jazz station
theme_docked2.mp3 - Classical station
theme_docked3.mp3 - Ambient station
```

### 3. **Seasonal Updates**
Easily swap music for events:
```
theme_menu1.mp3 - Holiday theme
theme_combat1.mp3 - Special event music
```

---

## ⚙️ Advanced Features

### Random Track Selection
```javascript
// Play random exploration track
const randomTrack = window.game.audio.musicLoader.getRandomTrackFromCategory('exploration');
if (randomTrack) {
    window.game.audio.playMusic(randomTrack.key);
}
```

### Category-Based Playlists
```javascript
// Create playlist with all docked variants
const dockedTracks = window.game.audio.musicLoader.getTracksForCategory('docked');
const dockedKeys = dockedTracks.map(t => t.key);
window.game.audio.setPlaylist(dockedKeys);
window.game.audio.setPlaylistMode(true);
window.game.audio.playFromPlaylist();
```

### Track Metadata
Each track includes:
```javascript
{
    key: 'docked2',              // Unique identifier
    name: 'Docked Theme 2',      // Display name
    path: 'assets/audio/music/theme_docked2.mp3',  // File path
    description: 'Peaceful station ambience (Variant 2)',  // Description
    category: 'docked',          // Category
    variant: 2                   // Variant number (0 = default)
}
```

---

## 🔧 Troubleshooting

### Music Not Discovered?
1. Check file naming: `theme_[category][number].mp3`
2. Ensure files are in `assets/audio/music/`
3. Check browser console for discovery log
4. Verify file permissions

### Gaps in Numbering?
The system stops at the first gap:
- ✅ `theme_docked1.mp3`, `theme_docked2.mp3` → Both found
- ❌ `theme_docked1.mp3`, `theme_docked3.mp3` → Only 1 found (gap at 2)

**Solution**: Number sequentially without gaps

### Force Rediscovery
```javascript
// Clear discovery flag and re-scan
window.game.audio.musicDiscovered = false;
await window.game.audio.discoverMusic();
```

---

## 📊 Limits

- **Max Variants**: 20 per category (configurable in `music-loader.js`)
- **Categories**: 4 (menu, exploration, combat, docked)
- **File Format**: MP3 (can be extended to support OGG, WAV)

---

## ✨ Benefits

1. **No Code Changes** - Just drop files in folder
2. **Automatic Discovery** - System finds all tracks
3. **Flexible Naming** - Support for unlimited variants
4. **Backward Compatible** - Default files still work
5. **Player Choice** - Can select specific tracks for playlist
6. **Easy Updates** - Add/remove files anytime

---

## 🎉 Summary

The dynamic music system makes it incredibly easy to expand your game's soundtrack:

1. **Name your file**: `theme_category#.mp3`
2. **Drop in folder**: `assets/audio/music/`
3. **Reload game**: Automatically discovered!
4. **Enjoy**: Players can add to playlists

No code changes required! 🚀
