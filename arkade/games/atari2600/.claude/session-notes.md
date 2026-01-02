# Atari 2600 Emulator - Development Session Notes

## Project Overview
Customizing the Javatari.js emulator (by ppeccin) for Kraken Arkade with game library, controls panel, and trivia features.

## Key Files
- `F:\website\arkade\games\atari2600\index.html` - Main emulator page with all customizations
- `F:\website\arkade\games\atari2600\index.html.bak` - Backup of working version
- `F:\website\arkade\games\atari2600\javatari.js` - Javatari emulator (v5.0, ~670KB)
- `F:\website\arkade\games\atari2600\roms/` - Game ROM files (.bin)
- `F:\website\arkade\games\atari2600\thumbnails/` - Game thumbnail images (need to create)

## What We Built

### 1. Game Library Sidebar (Left)
- Visual list of games with thumbnails
- Click to auto-load ROM into emulator
- Shows game name and year
- Collapsible sidebar

### 2. Controls Panel (Right)
- Shows controls for currently loaded game
- Tips section for game-specific hints
- **Trivia section** with fun facts and history
- Updates when a new game is loaded

### 3. Emulator Help Section
- Shows Javatari keyboard shortcuts
- Alt+P: Power On/Off
- Alt+1: Game Select
- Alt+2: Game Reset
- Alt+Enter: Fullscreen
- Alt+S: Settings

## Technical Details

### Javatari Configuration
```javascript
Javatari = {
    SCREEN_ELEMENT_ID: "javatari-screen",
    CARTRIDGE_URL: "",
    AUTO_START: true,
    SCREEN_DEFAULT_SCALE: -1,
    PAGE_BACK_CSS: "transparent"
};
```

### ROM Loading
- Fetch ROM as ArrayBuffer
- Convert to Uint8Array
- Use `Javatari.CartridgeCreator.createCartridgeFromRom(romData, name)`
- Insert into `Javatari.room.console.cartridgeSocket`

### Controller Support
- Javatari has built-in gamepad support
- Standard Atari joystick: D-Pad + Fire button
- Maps directly to Xbox controller D-Pad and A button
- No custom gamepad code needed (unlike Apple IIe)

## Games Configured

1. **Asteroids** (1981, Atari)
   - ROM: `roms/Asteroids [no copyright].bin`
   - Controls: D-Pad rotate/thrust/hyperspace, Fire button
   - First 2600 game with bankswitching (8KB instead of 4KB)

2. **Pitfall!** (1982, Activision)
   - ROM: `roms/Pitfall! Jungle Adventure.bin`
   - Controls: D-Pad move, Fire button to jump
   - 20-minute time limit to collect 32 treasures

3. **River Raid** (1982, Activision)
   - ROM: `roms/River Raid.bin`
   - Controls: D-Pad move/accelerate, Fire button
   - Created by Carol Shaw - pioneering female game designer
   - Was banned in Germany for violence!

4. **Space Invaders** (1980, Atari)
   - ROM: `roms/Space Invaders.bin`
   - Controls: D-Pad left/right, Fire button
   - First "killer app" for home consoles
   - Quadrupled Atari 2600 sales

## Emulator Source
- Javatari.js by Paulo Augusto Peccin (ppeccin)
- GitHub: https://github.com/ppeccin/javatari.js
- Version: 5.0 (stable/embedded)
- Single-file distribution (~670KB minified)

## Atari 2600 vs Apple IIe Differences

| Feature | Atari 2600 | Apple IIe |
|---------|-----------|-----------|
| Media | Cartridge/ROM | Floppy Disk |
| Loading | Instant | Requires disk read |
| Controller | Joystick only | Keyboard + Joystick |
| Mode switch | N/A | Ctrl+K / Ctrl+J |
| Multi-media | Single ROM | Multi-disk games |

## Thumbnails Needed
Create these image files in `thumbnails/` folder:
- `asteroids.png`
- `pitfall.png`
- `riverraid.png`
- `spaceinvaders.png`

## Future Ideas
- Add more games as ROMs are acquired
- Paddle controller support for games like Breakout
- Save states (Javatari supports this)
- Mobile touch controls

## Important Notes
- Always work in `F:\website\arkade\games\atari2600\` - NOT in the worktree on C: drive
- Javatari handles all emulation - much simpler than Apple IIe setup
- No CORS issues since everything is local files
- Hard refresh (Ctrl+Shift+R) to clear browser cache when testing
