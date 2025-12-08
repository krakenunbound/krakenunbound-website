# Ad Astra - Complete Admin System

## 🎯 Overview

You now have **TWO admin interfaces** that work with the **same backend**:

1. **Web Admin Panel** - Access from any browser by logging in as admin
2. **Electron Sysop Station** - Desktop app for local monitoring

Both systems use the **same Flask API endpoints** for real-time player management.

---

## 🏗️ Architecture

```
┌──────────────────────┐
│   Web Browser        │
│   (Admin Login)      │
│   admin/admin123     │
└──────────┬───────────┘
           │
           │  HTTP API
           ├──────────────→  ┌─────────────────┐
           │                 │                 │
┌──────────┴───────────┐     │  Flask Server   │ ←→ SQLite Database
│  Electron Sysop      │     │   (server.py)   │    (adastra.db)
│  Station (Desktop)   │     │                 │
│  No login required   │ ←───┤  Admin APIs     │
└──────────────────────┘     └─────────────────┘
```

---

## 📊 Features

### Both Interfaces Support:
- ✅ **View all players** - Sorted by last activity
- ✅ **Edit player data** - Credits, turns, ship, sector
- ✅ **Kick players** - Force disconnect (invalidate session)
- ✅ **Ban players** - Prevent login
- ✅ **Delete players** - Permanently remove account
- ✅ **Real-time stats** - Active players, connections, uptime
- ✅ **Activity tracking** - Last action timestamp

---

## 🔐 Authentication

### Web Admin Panel:
- **Login required**: `admin` / `admin123`
- Accessible from any computer
- Uses session tokens
- Auto-creates admin account on server start

### Electron Sysop Station:
- **No login required** - Trusted local app
- Direct API access to localhost:8000
- Only runs on your computer
- Can't be accessed remotely

---

## 🚀 Setup

### 1. Server Setup (server.py)

The server now has these NEW features:

**Database Columns:**
- `accounts.is_banned` - Ban status (0 or 1)
- `players.last_activity` - ISO timestamp of last action

**Admin API Endpoints:**
- `GET /api/admin/players` - List all players
- `GET /api/admin/player/<username>` - Get player details
- `PUT /api/admin/player/<username>` - Update player data
- `DELETE /api/admin/player/<username>` - Delete player
- `POST /api/admin/player/<username>/kick` - Kick player
- `POST /api/admin/player/<username>/ban` - Ban/unban player
- `GET /api/admin/stats` - Dashboard statistics

**Files to Update:**
1. Replace `server.py` with the new version
2. Restart server: `python server.py`

The server will automatically:
- Create admin account (admin/admin123)
- Add missing database columns
- Track player activity

---

### 2. Web Admin Panel

**Files Already Updated:**
- `js/main.js` - Admin login with proper is_admin checking
- `js/auth-api.js` - Skips player data load for admins
- `index.html` - Enhanced player edit modal

**How to Access:**
1. Go to game URL
2. Click "Sysop Access" (bottom of login screen)
3. Enter: `admin` / `admin123`
4. You're in!

**Features:**
- Dashboard with player stats
- Players tab (shows all players)
- Edit player modal (credits, turns, ship, etc.)
- Galaxy management
- Settings

---

### 3. Electron Sysop Station

**Files to Update in Sysop Station Folder:**
1. Replace `main.js` with `electron-main.js`
2. Replace `renderer.js` with `electron-renderer.js`

**Configuration (in main.js):**
```javascript
const CONFIG = {
    gamePath: 'G:\\Ad Astra',  // Update to your game folder!
    serverPort: 8000,
    tunnelSubdomain: 'adastra'
};
```

**How to Use:**
1. Launch: `npm start` or double-click `launch-sysop.bat`
2. Click "► START SERVERS"
3. Wait for both servers to show ONLINE
4. View real-time player data!

**Features:**
- Server status monitoring
- Real-time player list (updates every 10 seconds)
- Activity log
- Statistics dashboard
- Kick/Ban/Delete buttons on each player
- Copy tunnel URL
- Open game in browser

---

## 🎮 Player Activity Tracking

Every player action now updates `last_activity`:
- Login
- Moving sectors
- Trading
- Combat
- Any API call that updates player data

**In Sysop Station:**
- Players active in last 10 min show as ONLINE (green highlight)
- Sort order: Most recently active first
- Time ago display: "2m ago", "1h ago", "3d ago"

---

## ⚡ Admin Actions

### Kick Player
- **What it does**: Invalidates all active sessions
- **Effect**: Player must re-login
- **Use when**: Player is causing issues, needs refresh

### Ban Player
- **What it does**: Sets `is_banned = 1` in database
- **Effect**: Cannot login (shows "Account is banned")
- **Use when**: Permanently blocking a player

### Delete Player
- **What it does**: Removes account, player data, sessions
- **Effect**: Completely gone from database
- **Use when**: Removing test accounts or cheaters
- **⚠️ WARNING**: Cannot be undone!

---

## 📈 Statistics

### Dashboard Shows:
- **Total Players**: Count of all registered accounts
- **Active Now**: Players active in last 10 minutes
- **Connections**: Total active sessions
- **Uptime**: Server uptime

### Player List Shows:
- Pilot name
- Current sector
- Credits
- Turns
- Last activity time
- Ban status

---

## 🔄 Update Frequency

**Web Admin Panel:**
- Manual refresh (click refresh or re-open tab)
- Consider adding auto-refresh later

**Electron Sysop Station:**
- Auto-updates every **10 seconds**
- Reasonable for turn-based game
- Won't overload cheap hosting

---

## 🐛 Troubleshooting

### Web Admin - "Access Denied"
1. Check server.py logs for admin account creation
2. Verify `is_admin = 1` in database
3. Try logging out and back in

### Electron Station - No Players Showing
1. Verify server is running (should show ONLINE)
2. Check server.py has new admin endpoints
3. Open DevTools (Ctrl+Shift+I) and check console

### Server - Port Already in Use
1. Stop any existing Python processes
2. Check port 8000 isn't used by another app
3. Change port in CONFIG if needed

---

## 📝 Development Notes

### Adding New Admin Features

**To add a new admin action:**

1. **Server (server.py):**
```python
@app.route('/api/admin/action/<username>', methods=['POST'])
def admin_action(username):
    admin = verify_admin_token(request.headers.get('Authorization', '').replace('Bearer ', ''))
    if not admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    # Your code here
    return jsonify({'success': True})
```

2. **Electron (main.js):**
```javascript
async function yourAction(username) {
    // HTTP request to /api/admin/action/<username>
}

ipcMain.on('your-action', async (event, username) => {
    const success = await yourAction(username);
    event.reply('player-action-result', { action: 'yourAction', username, success });
});
```

3. **Electron (renderer.js):**
```javascript
function yourAction(username) {
    if (confirm(`Confirm action on ${username}?`)) {
        ipcRenderer.send('your-action', username);
    }
}
```

---

## 🎯 Future Enhancements

**Potential Features:**
- [ ] Player detail modal in Sysop Station
- [ ] Broadcast message to all players
- [ ] Player ban list management
- [ ] Export player data to CSV
- [ ] Connection graph/analytics
- [ ] Email notifications for events
- [ ] Auto-backup database
- [ ] Multiple server support

---

## 📋 Files Summary

### Server Files:
- `server.py` - Flask API with admin endpoints

### Web Admin Files:
- `js/main.js` - Admin login handling
- `js/auth-api.js` - Auth with admin support
- `index.html` - Player edit modal

### Electron Sysop Station Files:
- `main.js` - Main process (server management + API)
- `renderer.js` - UI logic + player actions
- `index.html` - BBS-style interface
- `styles.css` - Retro green phosphor styling

---

## ✅ Testing Checklist

### Web Admin:
- [ ] Login as admin/admin123
- [ ] See dashboard with stats
- [ ] Go to Players tab
- [ ] See list of players (including yourself)
- [ ] Click Edit on a player
- [ ] Change credits, save
- [ ] Verify changes took effect

### Electron Sysop:
- [ ] Start servers (both show ONLINE)
- [ ] See player list populate
- [ ] Kick a test player
- [ ] Verify they get disconnected
- [ ] Ban a test player
- [ ] Try logging in as banned player (should fail)
- [ ] Unban them
- [ ] Delete test account

---

## 🎉 You Now Have:

✅ Dual admin interfaces (web + desktop)
✅ Real-time player monitoring
✅ Kick/Ban/Delete functionality  
✅ Activity tracking (last seen)
✅ Retro BBS-style desktop app
✅ Professional web admin panel
✅ Complete player management system

**All working together with the same backend!** 🚀

---

**Need Help?**
Check server logs for errors: `python server.py`
Check Electron DevTools: Ctrl+Shift+I in Sysop Station
