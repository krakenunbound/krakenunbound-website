# Ad Astra - Admin & Settings Guide

## Admin Account Setup

### Creating the Admin Account

The game has a default admin account with these credentials:
- **Username**: `admin`
- **Password**: `admin123`

#### First Time Setup

1. **Access the Browser Console**:
   - Press `F12` in your browser
   - Click the "Console" tab

2. **Create the Admin Account**:
   ```javascript
   // Run this in the browser console:
   const auth = new AuthSystem();
   auth.createDefaultAdmin();
   ```

3. **Login as Admin**:
   - Go to the game's login screen
   - Username: `admin`
   - Password: `admin123`

#### Changing the Admin Password

Once logged in as admin:

1. **Open Console** (F12)
2. **Run this command**:
   ```javascript
   window.auth.changePassword('admin', 'admin123', 'YOUR_NEW_PASSWORD');
   ```

Replace `YOUR_NEW_PASSWORD` with your desired password.

### Accessing the Admin Panel

The admin panel is currently accessible via the browser console. Here's how to use it:

#### View All Users
```javascript
window.auth.getAllUsernames();
```

#### Get User Statistics
```javascript
window.auth.getUserStats('username');
```

#### Make Someone Admin
```javascript
window.auth.setAdmin('username', true);
```

#### Remove Admin Rights
```javascript
window.auth.setAdmin('username', false);
```

#### Delete a User Account
```javascript
window.auth.deleteAccount('username', 'password');
```

#### Reset ALL Game Data (DANGEROUS!)
```javascript
window.auth.resetAllData(); // Will ask for confirmation
```

## Audio/Music Settings

### Adjust Music Volume

Currently, music volume is set to 15% (0.15). To adjust:

1. **Open Browser Console** (F12)
2. **Run**:
   ```javascript
   window.audio.setVolume('music', 0.3); // 30% volume
   ```

Volume range: `0.0` (mute) to `1.0` (100%)

### Adjust Sound Effects Volume

```javascript
window.audio.setVolume('sfx', 0.7); // 70% volume
```

### Mute Music
```javascript
window.audio.toggleMusic(false);
```

### Enable Music
```javascript
window.audio.toggleMusic(true);
```

### Play Specific Track
```javascript
window.audio.playMusic('exploration'); // or 'combat', 'docked', 'menu'
```

### View Available Tracks
```javascript
window.audio.musicLoader.getTracks();
```

## Game Settings (LocalStorage)

### View Current Save Data
```javascript
localStorage.getItem('player_yourUsername');
```

### Backup Your Save
```javascript
const save = localStorage.getItem('player_yourUsername');
console.log(save); // Copy this and save it somewhere safe
```

### Restore a Save
```javascript
localStorage.setItem('player_yourUsername', 'YOUR_SAVED_DATA_HERE');
```

## Coming Soon: Settings UI

A visual settings menu is planned for future updates that will include:
- 🎵 Music volume slider
- 🔊 SFX volume slider  
- 🎼 Music track playlist selector
- 🎨 Theme/visual options
- ⌨️ Keyboard shortcut configuration
- 👤 Account settings
- 🔧 Game difficulty settings

For now, all settings are accessible via the browser console as shown above.

## Troubleshooting

### I forgot the admin password!
```javascript
// Reset it via console (you'll lose the account):
Utils.storage.remove('users');
// Then create a new admin account as shown above
```

### I want to start fresh
```javascript
// WARNING: Deletes everything!
localStorage.clear();
location.reload();
```

### Music isn't playing
```javascript
// Check if it's enabled:
window.audio.musicEnabled

// If false, enable it:
window.audio.toggleMusic(true);

// Force play:
window.audio.playMusic('exploration');
```

## Advanced: Custom Admin Panel

If you want to create your own admin interface, check `js/admin.js` for available functions.

The admin panel can be accessed by users with `isAdmin: true` in their user object.
