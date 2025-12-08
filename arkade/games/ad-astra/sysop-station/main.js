// Ad Astra Sysop Station - Main Process
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let pythonServer = null;
let tunnelProcess = null;
let serverLogs = [];
let tunnelUrl = null;

// Configuration - UPDATE THESE PATHS!
const CONFIG = {
    gamePath: 'G:\\Ad Astra',  // Path to your game folder
    pythonCommand: 'python',
    serverPort: 8000,
    tunnelSubdomain: 'adastra',  // Your custom subdomain
    maxLogs: 500,
    apiUrl: 'http://localhost:8000'  // Local server API
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        title: 'Ad Astra Sysop Station',
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
}

// Filter function to reduce log spam
function shouldLogMessage(msg) {
    // Hide repetitive HTTP request logs
    if (msg.includes('127.0.0.1') && (msg.includes('GET') || msg.includes('POST'))) {
        // Only log errors (4xx, 5xx status codes)
        if (msg.includes(' 4') || msg.includes(' 5')) {
            return true; // Log errors
        }
        // Hide successful requests to admin endpoints (too spammy)
        if (msg.includes('/api/admin/')) {
            return false;
        }
        // Hide static file requests
        if (msg.includes('.js') || msg.includes('.css') || msg.includes('.png') || msg.includes('.mp3')) {
            return false;
        }
    }
    
    // Log everything else
    return true;
}

// Start Python HTTP server
function startPythonServer() {
    if (pythonServer) {
        addLog('warn', 'Python server already running');
        return;
    }

    addLog('info', `Starting Flask server (server.py)...`);

    pythonServer = spawn(CONFIG.pythonCommand, ['server.py'], {
        cwd: CONFIG.gamePath,
        shell: true
    });

    pythonServer.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        
        // Filter out repetitive HTTP request logs
        if (shouldLogMessage(msg)) {
            addLog('server', msg);
        }
        
        // Detect Flask server started
        if (msg.includes('Running on')) {
            addLog('success', `[OK] Flask server running at http://localhost:${CONFIG.serverPort}`);
            sendToRenderer('server-status', { python: true, tunnel: !!tunnelUrl });
        }
    });

    pythonServer.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        
        // Filter out repetitive HTTP request logs
        if (shouldLogMessage(msg)) {
            addLog('server', msg);
        }
        
        // Flask also outputs startup info to stderr
        if (msg.includes('Running on')) {
            addLog('success', `[OK] Flask server running at http://localhost:${CONFIG.serverPort}`);
            sendToRenderer('server-status', { python: true, tunnel: !!tunnelUrl });
        }
    });

    pythonServer.on('close', (code) => {
        addLog('warn', `Python server stopped (code: ${code})`);
        pythonServer = null;
        sendToRenderer('server-status', { python: false, tunnel: !!tunnelUrl });
    });
}

// Start localtunnel
function startTunnel() {
    if (tunnelProcess) {
        addLog('warn', 'Tunnel already running');
        return;
    }

    addLog('info', 'Starting localtunnel...');

    const args = ['--port', CONFIG.serverPort.toString()];
    if (CONFIG.tunnelSubdomain) {
        args.push('--subdomain', CONFIG.tunnelSubdomain);
    }

    tunnelProcess = spawn('lt', args, { shell: true });

    tunnelProcess.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        
        // Extract URL from output
        const urlMatch = msg.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            tunnelUrl = urlMatch[0];
            addLog('success', `✓ Tunnel active: ${tunnelUrl}`);
            sendToRenderer('tunnel-url', tunnelUrl);
            sendToRenderer('server-status', { python: !!pythonServer, tunnel: true });
        } else {
            addLog('tunnel', msg);
        }
    });

    tunnelProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        addLog('tunnel', msg);
    });

    tunnelProcess.on('close', (code) => {
        addLog('warn', `Tunnel stopped (code: ${code})`);
        tunnelProcess = null;
        tunnelUrl = null;
        sendToRenderer('server-status', { python: !!pythonServer, tunnel: false });
    });
}

// Stop servers
function stopServers() {
    if (pythonServer) {
        addLog('info', 'Stopping Python server...');
        
        // On Windows, need to kill the entire process tree
        if (process.platform === 'win32') {
            exec(`taskkill /F /T /PID ${pythonServer.pid}`, (error) => {
                if (error) {
                    addLog('warn', `Error killing Python server: ${error.message}`);
                } else {
                    addLog('info', 'Python server stopped');
                }
            });
        } else {
            pythonServer.kill('SIGTERM');
        }
        
        pythonServer = null;
    }

    if (tunnelProcess) {
        addLog('info', 'Stopping tunnel...');
        
        if (process.platform === 'win32') {
            exec(`taskkill /F /T /PID ${tunnelProcess.pid}`, (error) => {
                if (error) {
                    addLog('warn', `Error killing tunnel: ${error.message}`);
                } else {
                    addLog('info', 'Tunnel stopped');
                }
            });
        } else {
            tunnelProcess.kill('SIGTERM');
        }
        
        tunnelProcess = null;
        tunnelUrl = null;
    }

    sendToRenderer('server-status', { python: false, tunnel: false });
}

// Add log entry
function addLog(type, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type,
        message: message
    };

    serverLogs.push(logEntry);

    // Keep only last N logs
    if (serverLogs.length > CONFIG.maxLogs) {
        serverLogs.shift();
    }

    sendToRenderer('log-entry', logEntry);
}

// Send data to renderer
function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

// Fetch game data from API (no auth required for local sysop station)
async function fetchGameData() {
    return new Promise((resolve, reject) => {
        const req = http.get(`${CONFIG.apiUrl}/api/admin/players`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } else {
                        // Server not ready or admin endpoint needs auth
                        // Return empty data for now
                        resolve({ players: [] });
                    }
                } catch (e) {
                    resolve({ players: [] });
                }
            });
        });
        
        req.on('error', (error) => {
            // Server not running yet
            resolve({ players: [] });
        });
        
        req.setTimeout(2000, () => {
            req.abort();
            resolve({ players: [] });
        });
    });
}

// Fetch dashboard stats
async function fetchStats() {
    return new Promise((resolve, reject) => {
        const req = http.get(`${CONFIG.apiUrl}/api/admin/stats`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });
        
        req.on('error', () => resolve(null));
        req.setTimeout(2000, () => {
            req.abort();
            resolve(null);
        });
    });
}

// Kick player
async function kickPlayer(username) {
    return new Promise((resolve) => {
        const postData = '';
        const options = {
            hostname: 'localhost',
            port: CONFIG.serverPort,
            path: `/api/admin/player/${username}/kick`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result.success || false);
                } catch (e) {
                    resolve(false);
                }
            });
        });
        
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
            req.abort();
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// Ban player
async function banPlayer(username, banned = true) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({ banned: banned });
        const options = {
            hostname: 'localhost',
            port: CONFIG.serverPort,
            path: `/api/admin/player/${username}/ban`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result.success || false);
                } catch (e) {
                    resolve(false);
                }
            });
        });
        
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
            req.abort();
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// Delete player
async function deletePlayer(username) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: CONFIG.serverPort,
            path: `/api/admin/player/${username}`,
            method: 'DELETE'
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result.success || false);
                } catch (e) {
                    resolve(false);
                }
            });
        });
        
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
            req.abort();
            resolve(false);
        });
        
        req.end();
    });
}

// IPC Handlers
ipcMain.on('start-servers', () => {
    startPythonServer();
    setTimeout(() => startTunnel(), 2000); // Wait 2s for Python to start
});

ipcMain.on('stop-servers', () => {
    stopServers();
});

ipcMain.on('get-logs', (event) => {
    event.reply('logs', serverLogs);
});

ipcMain.on('get-game-data', async (event) => {
    const players = await fetchGameData();
    const stats = await fetchStats();
    
    const data = {
        players: players.players || [],
        totalPlayers: stats?.totalPlayers || 0,
        activePlayers: stats?.recentlyActive || 0,
        connections: stats?.totalConnections || 0
    };
    
    event.reply('game-data', data);
});

ipcMain.on('clear-logs', () => {
    serverLogs = [];
    addLog('info', 'Logs cleared');
});

ipcMain.on('kick-player', async (event, username) => {
    const success = await kickPlayer(username);
    event.reply('player-action-result', { action: 'kick', username, success });
    if (success) {
        addLog('warn', `Kicked player: ${username}`);
    } else {
        addLog('error', `Failed to kick player: ${username}`);
    }
});

ipcMain.on('ban-player', async (event, username) => {
    const success = await banPlayer(username, true);
    event.reply('player-action-result', { action: 'ban', username, success });
    if (success) {
        addLog('warn', `Banned player: ${username}`);
    } else {
        addLog('error', `Failed to ban player: ${username}`);
    }
});

ipcMain.on('delete-player', async (event, username) => {
    const success = await deletePlayer(username);
    event.reply('player-action-result', { action: 'delete', username, success });
    if (success) {
        addLog('warn', `Deleted player: ${username}`);
    } else {
        addLog('error', `Failed to delete player: ${username}`);
    }
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopServers();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopServers();
});