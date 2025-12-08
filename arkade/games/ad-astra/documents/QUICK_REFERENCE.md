# Ad Astra - Quick Reference Card
**Version:** 0.4.1  
**Journey to the Stars**

---

## 🚀 Getting Started

### Launch the Game
```bash
cd "path/to/Ad Astra"
python -m http.server 8000
# Open: http://localhost:8000/index.html
```

### First Time Setup
1. Create account
2. Create character
3. Start exploring!

---

## 🎮 Controls

### Navigation
- **Ship** - View ship stats, cargo, fuel
- **Sector** - Current location details
- **Galaxy Map** - Interactive star map
- **Trade** - Buy/sell commodities
- **Stats** - Your achievements

### Galaxy Map
- **Mouse Wheel** - Zoom in/out
- **Click + Drag** - Pan around
- **Touch/Pinch** - Zoom (mobile)
- **[+] [-]** - Zoom buttons
- **[⌂]** - Reset to current location
- **Click Star** - Warp to sector

---

## 🌟 Star Types

| Type | Size | Color | Meaning |
|------|------|-------|---------|
| 🔴 Red Giant | 18px | Red | Massive dying star |
| 🟠 Red Dwarf | 10px | Orange | Small cool star |
| 🟡 Yellow Star | 14px | Yellow | Sun-like star |
| ⚪ White Dwarf | 8px | White | Dense remnant |
| 🔵 Blue Giant | 16px | Blue | Hot massive star |
| 🟢 **YOU** | **50px** | **Green** | **Your location** |

---

## 💰 Trading

### Legal Goods
- Ore
- Organics
- Equipment

### Black Market (Risky!)
- Contraband
- Arms
- Narcotics

⚠️ **Police may scan your cargo!**

---

## ⚔️ Combat

- **Attack** - Fire weapons
- **Defend** - Shields up
- **Flee** - Try to escape

---

## ⛽ Resources

### Turns
- 50 per day
- Used for movement, trading, combat

### Fuel
- Required for warp travel
- Refuel at stations
- Efficiency varies by ship

### Credits
- Buy goods, pay fees
- Earn through trading

---

## 🛸 Ship Classes

| Ship | Cargo | Combat | Fuel | Speed |
|------|-------|--------|------|-------|
| Scout | Low | Low | High | Fast |
| Trader | High | Low | Med | Med |
| Fighter | Low | High | Low | Fast |
| Explorer | Med | Low | Very High | Med |
| Hauler | Very High | Low | Low | Slow |

---

## 🎵 Audio

### Music Tracks
- Menu theme
- Exploration theme
- Combat theme
- Docked theme

### Console Commands
```javascript
window.game.audio.getTrackList()
window.game.audio.setMusicVolume(0.5)
```

---

## 🔑 Tips

1. **Start Small** - Trade between nearby sectors
2. **Watch Fuel** - Don't get stranded!
3. **Avoid Combat** - Early on, flee from pirates
4. **Map Routes** - Find profitable trade loops
5. **Use Stations** - Repair and refuel regularly
6. **Check Map** - Your location is the BIG GREEN DOT

---

## 🐛 Troubleshooting

### Game Won't Load
- Use HTTP server (not file:///)
- Check browser console (F12)
- Hard refresh (Ctrl+F5)

### No Music
- Audio files are placeholders
- Add MP3s to `assets/audio/music/`

### Can't Find Current Location
- Look for HUGE green dot with pin 📍
- Click [⌂] to center map

---

## 📱 Mobile Support

✅ **Fully Responsive**
- Portrait mode
- Landscape mode
- Touch controls
- Pinch to zoom

---

## 🎯 Current Version Features

### v0.4.1 Highlights
- ✅ Interactive zoomable galaxy map
- ✅ 5 different star types with colors
- ✅ Massive current location marker
- ✅ Continuous music looping
- ✅ Responsive design (all devices)
- ✅ Touch gesture support
- ✅ Auto-centering on your location

---

## 📊 Game Stats

- **Sectors:** 100 (default)
- **Ship Classes:** 5
- **Commodities:** 6 (3 legal, 3 illegal)
- **Star Types:** 5
- **Turn Regeneration:** 50/day

---

## 🆘 Help

### In-Game
- Check **Stats** tab for achievements
- Use **Ship** tab to monitor fuel
- **Galaxy Map** shows reachable sectors

### Documentation
- `MANUAL.md` - Full game guide
- `QUICKSTART.md` - Fast start
- `TESTING.md` - Testing guide
- `CHANGELOG.md` - Version history

---

## 🎮 Console Commands

```javascript
// Audio
window.game.audio.getStatus()
window.game.audio.setMusicVolume(0.7)

// Debug (if needed)
localStorage.clear() // Reset game
```

---

## 🌟 Remember

**Your location on the galaxy map:**
- 🟢 **50px green circle**
- 📍 **Pin emoji**
- ⚪ **White border**
- ✨ **Pulsing glow**
- 🎯 **IMPOSSIBLE TO MISS!**

---

**Have Fun Exploring the Stars!** 🚀✨

**Ad Astra** - Journey to the Stars  
Version 0.4.1 | 2025-11-19
