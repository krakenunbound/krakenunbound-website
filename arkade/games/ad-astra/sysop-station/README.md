# Ad Astra Sysop Station

**Retro BBS-style monitoring dashboard for your Ad Astra game server**

## 🎮 Features

- ✅ **Automatic server startup** - Launches Python HTTP server + localtunnel with one click
- 📊 **Real-time monitoring** - Active players, connections, server status
- 🖥️ **Retro BBS aesthetic** - Green phosphor terminal with scanlines and CRT glow
- 📝 **Activity logging** - See all server events in real-time
- 🎛️ **Admin controls** - View player details, kick players, broadcast messages
- 📋 **Quick actions** - Copy tunnel URL, open game, manage servers

## 📦 Installation

### Prerequisites

1. **Node.js** (v16 or higher) - https://nodejs.org/
2. **Python** (already installed for the game)
3. **localtunnel** - Already installed globally

### Setup

1. **Extract the sysop-station folder** to any location (e.g., `G:\sysop-station\`)

2. **Install dependencies:**
   ```bash
   cd path\to\sysop-station
   npm install
   ```

3. **Configure paths** in `main.js` (lines 12-18):
   ```javascript
   const CONFIG = {
       gamePath: 'G:\\Ad Astra',  // ← Update this to your game folder
       pythonCommand: 'python',
       serverPort: 8000,
       tunnelSubdomain: 'adastra',  // ← Your custom subdomain
       maxLogs: 500
   };
   ```

4. **Launch:**
   ```bash
   npm start
   ```

   **OR use the batch file:**
   ```
   Double-click: launch-sysop.bat
   ```

## 🚀 Usage

### Starting Servers

1. Launch the Sysop Station
2. Click **"► START SERVERS"**
3. Wait for both servers to show ONLINE (green)
4. Copy the tunnel URL and share with testers

### Monitoring

- **Server Status** - See if Python + tunnel are running
- **Active Players** - View connected players in real-time
- **Activity Log** - Monitor all server events
- **Statistics** - Track total players, connections, uptime

### Admin Actions

- **View Player** - See detailed player info
- **Kick Player** - Disconnect a player
- **Copy URL** - Copy public tunnel URL to clipboard
- **Open Game** - Launch game in browser
- **Clear Log** - Clean up the activity log

## 🎨 Interface

```
╔══════════════════════════════════════════════════════════════════════════╗
║   █████╗ ██████╗     █████╗ ███████╗████████╗██████╗  █████╗            ║
║  ██╔══██╗██╔══██╗   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔══██╗           ║
║  ███████║██║  ██║   ███████║███████╗   ██║   ██████╔╝███████║           ║
║  ██╔══██║██║  ██║   ██╔══██║╚════██║   ██║   ██╔══██╗██╔══██║           ║
║  ██║  ██║██████╔╝   ██║  ██║███████║   ██║   ██║  ██║██║  ██║           ║
║  ╚═╝  ╚═╝╚═════╝    ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝           ║
║                                                                          ║
║                      SYSOP MONITORING STATION                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

- **Green phosphor terminal** aesthetic
- **CRT scanlines** and glow effects
- **Real-time updates** with pulsing status indicators
- **Split-panel layout** for maximum visibility

## 🔧 Configuration

### Update Game Path

Edit `main.js` line 13:
```javascript
gamePath: 'G:\\Ad Astra',  // Your game folder
```

### Change Tunnel Subdomain

Edit `main.js` line 16:
```javascript
tunnelSubdomain: 'adastra',  // Your custom name
```

### Adjust Port

Edit `main.js` line 15:
```javascript
serverPort: 8000,  // Default HTTP port
```

## 📋 Keyboard Shortcuts

- **Ctrl+R** - Reload Sysop Station
- **Ctrl+Shift+I** - Open DevTools (for debugging)
- **Ctrl+Q** - Quit

## 🐛 Troubleshooting

### Servers won't start

1. Check that Python is in your PATH
2. Verify `gamePath` is correct in `main.js`
3. Make sure port 8000 isn't already in use

### Tunnel fails

1. Check that `lt` (localtunnel) is installed globally
2. Try a different subdomain
3. Check your internet connection

### Players not showing

The Sysop Station currently shows mock data. Full player monitoring will be implemented when the game's multiplayer localStorage is accessible.

## 📁 Project Structure

```
sysop-station/
├── main.js           # Electron main process & server management
├── renderer.js       # UI logic & real-time updates
├── index.html        # Dashboard interface
├── styles.css        # Retro BBS styling
├── package.json      # Dependencies
├── launch-sysop.bat  # Windows launcher
└── README.md         # This file
```

## 🎯 Future Features

- [ ] Real player data from game localStorage
- [ ] Broadcast messages to all players
- [ ] Ban/whitelist management
- [ ] Export server logs
- [ ] Connection graph/analytics
- [ ] Email notifications for events
- [ ] Multiple game server support

## 💾 Tips

- **Keep the Sysop Station running** while players are connected
- **Monitor the activity log** for connection issues
- **Copy the tunnel URL immediately** after starting (it may change)
- **Use a custom subdomain** for consistent URLs

## 📜 License

MIT License - Do whatever you want with it!

---

**Built with love for the BBS era** 🟢📟

Enjoy your retro sysop experience! 🚀
