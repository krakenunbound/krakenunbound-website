"""
Ad Astra - Game Server with Database
Flask API for account management and game state persistence
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from browser

# Configuration
DB_PATH = 'adastra.db'

# Initialize database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Accounts table
    c.execute('''CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0
    )''')
    
    # Ensure is_admin column exists on older databases
    try:
        c.execute("ALTER TABLE accounts ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    # Players table (game data)
    c.execute('''CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        pilot_name TEXT NOT NULL,
        ship_name TEXT,
        credits INTEGER DEFAULT 10000,
        turns INTEGER DEFAULT 50,
        current_sector INTEGER DEFAULT 1,
        ship_type TEXT DEFAULT 'Scout',
        cargo TEXT DEFAULT '{}',
        equipment TEXT DEFAULT '{}',
        game_state TEXT DEFAULT '{}',
        last_activity TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
    )''')
    
    # Add last_activity column if it doesn't exist
    try:
        c.execute("ALTER TABLE players ADD COLUMN last_activity TEXT")
    except sqlite3.OperationalError:
        pass
    
    # Add ship_variant column if it doesn't exist
    try:
        c.execute("ALTER TABLE players ADD COLUMN ship_variant INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass
    
    # Add is_banned column to accounts if it doesn't exist
    try:
        c.execute("ALTER TABLE accounts ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    
    # Game settings table (sysop configurable)
    c.execute('''CREATE TABLE IF NOT EXISTS game_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )''')
    
    # Insert default settings if they don't exist
    default_settings = {
        'starting_sector': '1',
        'starting_credits': '10000',
        'starting_turns': '50',
        'starting_fuel': '100',
        'starting_hull': '100',
        'starting_shields': '100'
    }
    for key, value in default_settings.items():
        c.execute('INSERT OR IGNORE INTO game_settings (key, value) VALUES (?, ?)', (key, value))
    
    # Multiplayer state table
    c.execute('''CREATE TABLE IF NOT EXISTS multiplayer_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )''')
    
    # Sessions table (for login tokens)
    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
    )''')
    
    conn.commit()
    conn.close()
    print("[OK] Database initialized")

# Hash password
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Generate session token
def generate_token():
    return secrets.token_hex(32)

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/api/register', methods=['POST'])
def register():
    """Create new account"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    pilot_name = data.get('pilotName', '').strip()
    ship_name = data.get('shipName', '').strip()
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        # Create account
        password_hash = hash_password(password)
        created_at = datetime.now().isoformat()
        
        print(f"[DEBUG] ========== REGISTER ==========")
        print(f"[DEBUG] Creating account: {username}")
        
        c.execute('INSERT INTO accounts (username, password_hash, created_at) VALUES (?, ?, ?)',
                  (username, password_hash, created_at))
        account_id = c.lastrowid
        
        print(f"[DEBUG] Account created: account_id={account_id}")
        
        # Create player
        print(f"[DEBUG] Creating player record: pilot_name={pilot_name}, ship_name={ship_name}")
        c.execute('''INSERT INTO players 
                     (account_id, pilot_name, ship_name) 
                     VALUES (?, ?, ?)''',
                  (account_id, pilot_name, ship_name))
        
        print(f"[DEBUG] Player record created")
        print(f"[DEBUG] ====================================")
        
        conn.commit()
        
        # Generate session token
        token = generate_token()
        expires_at = datetime.now().isoformat()  # TODO: Add expiration
        c.execute('INSERT INTO sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)',
                  (account_id, token, created_at, expires_at))
        conn.commit()
        
        return jsonify({
            'success': True,
            'token': token,
            'username': username
        })
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    """Login to existing account"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    print(f"[DEBUG] ========== LOGIN ATTEMPT ==========")
    print(f"[DEBUG] Username: {username}")
    
    if not username or not password:
        print(f"[ERROR] Missing username or password")
        return jsonify({'error': 'Username and password required'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    password_hash = hash_password(password)
    print(f"[DEBUG] Looking for account with username={username}")
    
    c.execute('SELECT id, is_admin, is_banned FROM accounts WHERE username = ? AND password_hash = ?',
              (username, password_hash))
    result = c.fetchone()
    
    if not result:
        print(f"[ERROR] No account found or wrong password")
        conn.close()
        return jsonify({'error': 'Invalid username or password'}), 401
    
    print(f"[DEBUG] Account found: id={result[0]}, is_admin={result[1]}, is_banned={result[2]}")
    
    account_id, is_admin, is_banned = result
    
    # Check if account is banned
    if is_banned:
        print(f"[ERROR] Account is banned")
        conn.close()
        return jsonify({'error': 'Account is banned. Contact administrator.'}), 403
    
    # Update last login
    c.execute('UPDATE accounts SET last_login = ? WHERE id = ?',
              (datetime.now().isoformat(), account_id))
    
    # Generate session token
    token = generate_token()
    created_at = datetime.now().isoformat()
    expires_at = datetime.now().isoformat()  # TODO: Add expiration
    c.execute('INSERT INTO sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)',
              (account_id, token, created_at, expires_at))
    
    conn.commit()
    conn.close()
    
    print(f"[DEBUG] Login successful: token={token[:16]}...")
    print(f"[DEBUG] ====================================")
    
    return jsonify({
        'success': True,
        'token': token,
        'username': username,
        'is_admin': bool(is_admin)
    })

@app.route('/api/player', methods=['GET'])
def get_player():
    """Get player data"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        print("[ERROR] GET player: No token provided")
        return jsonify({'error': 'No token provided'}), 401
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get account from token
    c.execute('SELECT account_id FROM sessions WHERE token = ?', (token,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        print("[ERROR] GET player: Invalid token")
        return jsonify({'error': 'Invalid token'}), 401
    
    account_id = result[0]
    
    print(f"[DEBUG] ========== GET PLAYER ==========")
    print(f"[DEBUG] account_id: {account_id}")
    
    # Get player data
    c.execute('''SELECT p.*, a.username, a.is_admin
                 FROM players p 
                 JOIN accounts a ON p.account_id = a.id 
                 WHERE p.account_id = ?''', (account_id,))
    
    row = c.fetchone()
    conn.close()
    
    if not row:
        print(f"[ERROR] NO PLAYER RECORD found for account_id={account_id}")
        return jsonify({'error': 'Player not found'}), 404
    
    print(f"[DEBUG] Player record found:")
    print(f"[DEBUG]   pilot_name: {row[2]}")
    print(f"[DEBUG]   ship_name: {row[3]}")
    print(f"[DEBUG]   ship_variant: {row[12]}")
    print(f"[DEBUG]   username: {row[13]}")
    
    result = {
        'username': row[13],
        'pilotName': row[2],
        'shipName': row[3],
        'credits': row[4],
        'turns': row[5],
        'currentSector': row[6],
        'shipType': row[7],
        'cargo': json.loads(row[8]) if row[8] else {},
        'equipment': json.loads(row[9]) if row[9] else {},
        'gameState': json.loads(row[10]) if row[10] else {},
        'lastActivity': row[11],
        'shipVariant': row[12] if len(row) > 12 else 1,
        'is_admin': bool(row[14]) if len(row) > 14 else False
    }
    
    print(f"[DEBUG] Returning: pilotName={result['pilotName']}, shipVariant={result['shipVariant']}")
    print(f"[DEBUG] gameState keys: {list(result['gameState'].keys())}")
    print(f"[DEBUG] ====================================")
    
    return jsonify(result)

@app.route('/api/player', methods=['PUT'])
def update_player():
    """Update player data"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        print("[ERROR] No token provided")
        return jsonify({'error': 'No token provided'}), 401
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get account from token
    c.execute('SELECT account_id FROM sessions WHERE token = ?', (token,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        print("[ERROR] Invalid token")
        return jsonify({'error': 'Invalid token'}), 401
    
    account_id = result[0]
    data = request.json
    
    print(f"[DEBUG] ========== UPDATE PLAYER ==========")
    print(f"[DEBUG] account_id: {account_id}")
    print(f"[DEBUG] pilotName: {data.get('pilotName')}")
    print(f"[DEBUG] shipName: {data.get('shipName')}")
    print(f"[DEBUG] shipVariant: {data.get('shipVariant')}")
    
    # Check if player record exists
    c.execute('SELECT id, pilot_name FROM players WHERE account_id = ?', (account_id,))
    existing = c.fetchone()
    if existing:
        print(f"[DEBUG] Player record EXISTS: id={existing[0]}, current_pilot_name={existing[1]}")
    else:
        print(f"[ERROR] NO PLAYER RECORD FOUND for account_id={account_id}!")
        print(f"[ERROR] Creating player record now...")
        # Create player record if missing
        c.execute('''INSERT INTO players 
                     (account_id, pilot_name, ship_name, credits, turns, current_sector, ship_type, cargo, equipment, game_state, ship_variant) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (account_id, 
                   data.get('pilotName', 'Unknown'),
                   data.get('shipName', 'Scout'),
                   data.get('credits', 10000),
                   data.get('turns', 50),
                   data.get('currentSector', 1),
                   data.get('shipType', 'scout'),
                   json.dumps(data.get('cargo', {})),
                   json.dumps(data.get('equipment', {})),
                   json.dumps(data.get('gameState', {})),
                   data.get('shipVariant', 1)))
        conn.commit()
        print(f"[DEBUG] Player record created!")
        return jsonify({'success': True})
    
    # Update player
    c.execute('''UPDATE players SET
                 pilot_name = ?,
                 ship_name = ?,
                 credits = ?,
                 turns = ?,
                 current_sector = ?,
                 ship_type = ?,
                 cargo = ?,
                 equipment = ?,
                 game_state = ?,
                 last_activity = ?,
                 ship_variant = ?
                 WHERE account_id = ?''',
              (data.get('pilotName'),
               data.get('shipName'),
               data.get('credits'),
               data.get('turns'),
               data.get('currentSector'),
               data.get('shipType'),
               json.dumps(data.get('cargo', {})),
               json.dumps(data.get('equipment', {})),
               json.dumps(data.get('gameState', {})),
               datetime.now().isoformat(),
               data.get('shipVariant', 1),
               account_id))
    
    rows_updated = c.rowcount
    conn.commit()
    conn.close()
    
    print(f"[DEBUG] UPDATE complete: rows_updated={rows_updated}")
    print(f"[DEBUG] ====================================")
    
    return jsonify({'success': True})

@app.route('/api/multiplayer', methods=['GET'])
def get_multiplayer():
    """Get multiplayer state"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('SELECT data FROM multiplayer_state ORDER BY id DESC LIMIT 1')
    result = c.fetchone()
    conn.close()
    
    if result:
        return jsonify(json.loads(result[0]))
    return jsonify({})

@app.route('/api/multiplayer', methods=['PUT'])
def update_multiplayer():
    """Update multiplayer state"""
    data = request.json
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Delete old state and insert new
    c.execute('DELETE FROM multiplayer_state')
    c.execute('INSERT INTO multiplayer_state (data, updated_at) VALUES (?, ?)',
              (json.dumps(data), datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ============================================
# ADMIN ENDPOINTS
# ============================================

def verify_admin_token(token):
    """Helper function to verify admin access"""
    # For Electron Sysop Station: Allow localhost without token
    # This is safe because only local machine can access 127.0.0.1
    if not token:
        # Check if this might be from Electron app (will be implemented in endpoint)
        return None
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''SELECT a.id, a.username, a.is_admin 
                 FROM sessions s 
                 JOIN accounts a ON s.account_id = a.id 
                 WHERE s.token = ?''', (token,))
    result = c.fetchone()
    conn.close()
    
    if not result or not result[2]:  # Check is_admin flag
        return None
    
    return {'id': result[0], 'username': result[1]}

def is_localhost_request():
    """Check if request is from localhost (Electron Sysop Station)"""
    remote_addr = request.remote_addr
    return remote_addr in ['127.0.0.1', 'localhost', '::1']

@app.route('/api/admin/players', methods=['GET'])
def admin_get_players():
    """Get all players (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get all players with account info
    c.execute('''SELECT p.*, a.username, a.is_admin, a.last_login, a.created_at, a.is_banned
                 FROM players p 
                 JOIN accounts a ON p.account_id = a.id 
                 ORDER BY p.last_activity DESC''')
    
    rows = c.fetchall()
    conn.close()
    
    players = []
    for row in rows:
        try:
            game_state = json.loads(row[10]) if row[10] else {}
            cargo = json.loads(row[8]) if row[8] else {}
            equipment = json.loads(row[9]) if row[9] else {}
        except:
            game_state = {}
            cargo = {}
            equipment = {}
        
        players.append({
            'username': row[13],  # Fixed: was row[12]
            'pilotName': row[2],
            'shipName': row[3],
            'credits': row[4],
            'turns': row[5],
            'currentSector': row[6],
            'shipType': row[7],
            'cargo': cargo,
            'equipment': equipment,
            'gameState': game_state,
            'lastActivity': row[11],
            'shipVariant': row[12],  # Added
            'lastLogin': row[15],  # Fixed: was row[14]
            'createdAt': row[16],  # Fixed: was row[15]
            'isAdmin': bool(row[14]),  # Fixed: was row[13]
            'isBanned': bool(row[17])  # Fixed: was row[16]
        })
    
    return jsonify({'players': players})

@app.route('/api/admin/player/<username>', methods=['GET'])
def admin_get_player(username):
    """Get specific player details (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''SELECT p.*, a.username, a.is_admin, a.last_login, a.created_at, a.is_banned
                 FROM players p 
                 JOIN accounts a ON p.account_id = a.id 
                 WHERE a.username = ?''', (username,))
    
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Player not found'}), 404
    
    try:
        game_state = json.loads(row[10]) if row[10] else {}
        cargo = json.loads(row[8]) if row[8] else {}
        equipment = json.loads(row[9]) if row[9] else {}
    except:
        game_state = {}
        cargo = {}
        equipment = {}
    
    player = {
        'username': row[12],
        'pilotName': row[2],
        'shipName': row[3],
        'credits': row[4],
        'turns': row[5],
        'currentSector': row[6],
        'shipType': row[7],
        'cargo': cargo,
        'equipment': equipment,
        'gameState': game_state,
        'lastActivity': row[11],
        'lastLogin': row[14],
        'createdAt': row[15],
        'isAdmin': bool(row[13]),
        'isBanned': bool(row[16])
    }
    
    return jsonify(player)

@app.route('/api/admin/player/<username>', methods=['PUT'])
def admin_update_player(username):
    """Update player data (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    print(f"[ADMIN UPDATE] ========== UPDATING {username} ==========")
    print(f"[ADMIN UPDATE] Request data: {data}")
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get player's account_id and current game_state
    c.execute('SELECT account_id, game_state FROM players WHERE account_id = (SELECT id FROM accounts WHERE username = ?)', (username,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        print(f"[ADMIN UPDATE] ERROR: Player not found")
        return jsonify({'error': 'Player not found'}), 404
    
    account_id = result[0]
    print(f"[ADMIN UPDATE] Found account_id: {account_id}")
    
    # Parse existing game_state
    try:
        game_state = json.loads(result[1]) if result[1] else {}
        print(f"[ADMIN UPDATE] Existing game_state keys: {list(game_state.keys())}")
        if 'ship' in game_state:
            print(f"[ADMIN UPDATE] Existing ship.hull: {game_state['ship'].get('hull')}, ship.fuel: {game_state['ship'].get('fuel')}")
    except:
        game_state = {}
        print(f"[ADMIN UPDATE] No existing game_state, starting fresh")
    
    # Update player fields
    updates = []
    values = []
    
    if 'credits' in data:
        updates.append('credits = ?')
        values.append(data['credits'])
        print(f"[ADMIN UPDATE] Setting credits = {data['credits']}")
    if 'turns' in data:
        updates.append('turns = ?')
        values.append(data['turns'])
        print(f"[ADMIN UPDATE] Setting turns = {data['turns']}")
    if 'currentSector' in data:
        updates.append('current_sector = ?')
        values.append(data['currentSector'])
        print(f"[ADMIN UPDATE] Setting current_sector = {data['currentSector']}")
    if 'shipName' in data:
        updates.append('ship_name = ?')
        values.append(data['shipName'])
    if 'shipType' in data:
        updates.append('ship_type = ?')
        values.append(data['shipType'])
    
    # Handle hull and fuel - these go in game_state.ship
    if 'hull' in data or 'fuel' in data:
        if 'ship' not in game_state:
            game_state['ship'] = {}
        if 'hull' in data:
            game_state['ship']['hull'] = data['hull']
            print(f"[ADMIN UPDATE] Setting game_state.ship.hull = {data['hull']}")
        if 'fuel' in data:
            game_state['ship']['fuel'] = data['fuel']
            print(f"[ADMIN UPDATE] Setting game_state.ship.fuel = {data['fuel']}")
        # Update game_state JSON
        updates.append('game_state = ?')
        values.append(json.dumps(game_state))
    elif 'gameState' in data:
        updates.append('game_state = ?')
        values.append(json.dumps(data['gameState']))
    
    if updates:
        query = f"UPDATE players SET {', '.join(updates)} WHERE account_id = ?"
        values.append(account_id)
        print(f"[ADMIN UPDATE] Query: {query}")
        print(f"[ADMIN UPDATE] Values: {values}")
        c.execute(query, values)
    
    conn.commit()
    conn.close()
    
    print(f"[ADMIN UPDATE] ========== COMPLETE ==========")
    return jsonify({'success': True})

@app.route('/api/admin/player/<username>', methods=['DELETE'])
def admin_delete_player(username):
    """Delete player and account (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get account_id
    c.execute('SELECT id FROM accounts WHERE username = ?', (username,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'error': 'Player not found'}), 404
    
    account_id = result[0]
    
    # Delete player data
    c.execute('DELETE FROM players WHERE account_id = ?', (account_id,))
    
    # Delete sessions
    c.execute('DELETE FROM sessions WHERE account_id = ?', (account_id,))
    
    # Delete account
    c.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': f'Player {username} deleted'})

@app.route('/api/admin/player/<username>/kick', methods=['POST'])
def admin_kick_player(username):
    """Kick player by invalidating their session (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get account_id
    c.execute('SELECT id FROM accounts WHERE username = ?', (username,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'error': 'Player not found'}), 404
    
    account_id = result[0]
    
    # Delete all sessions for this account (forces re-login)
    c.execute('DELETE FROM sessions WHERE account_id = ?', (account_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': f'Player {username} kicked'})

@app.route('/api/admin/player/<username>/ban', methods=['POST'])
def admin_ban_player(username):
    """Ban/unban player (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    is_banned = data.get('banned', True)
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Update ban status
    c.execute('UPDATE accounts SET is_banned = ? WHERE username = ?', (1 if is_banned else 0, username))
    
    # If banning, also kick them
    if is_banned:
        c.execute('DELETE FROM sessions WHERE account_id = (SELECT id FROM accounts WHERE username = ?)', (username,))
    
    conn.commit()
    conn.close()
    
    action = 'banned' if is_banned else 'unbanned'
    return jsonify({'success': True, 'message': f'Player {username} {action}'})

@app.route('/api/admin/reset-galaxy', methods=['POST'])
def admin_reset_galaxy():
    """Reset all players to starting values for galaxy regeneration (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get settings from database
    c.execute('SELECT key, value FROM game_settings')
    settings = {row[0]: row[1] for row in c.fetchall()}
    
    # Use settings or defaults
    starting_sector = int(settings.get('starting_sector', '1'))
    starting_credits = int(settings.get('starting_credits', '10000'))
    starting_turns = int(settings.get('starting_turns', '50'))
    starting_fuel = int(settings.get('starting_fuel', '100'))
    starting_hull = int(settings.get('starting_hull', '100'))
    starting_shields = int(settings.get('starting_shields', '100'))
    
    STARTING_CARGO = json.dumps({})
    STARTING_EQUIPMENT = json.dumps({})
    STARTING_GAME_STATE = json.dumps({})
    
    # Reset all non-admin players
    c.execute('''
        UPDATE players SET
            credits = ?,
            turns = ?,
            current_sector = ?,
            cargo = ?,
            equipment = ?,
            hull = ?,
            shields = ?,
            fuel = ?,
            game_state = ?
        WHERE account_id IN (SELECT id FROM accounts WHERE is_admin = 0)
    ''', (starting_credits, starting_turns, starting_sector, 
          STARTING_CARGO, STARTING_EQUIPMENT, starting_hull, starting_shields,
          starting_fuel, STARTING_GAME_STATE))
    
    rows_affected = c.rowcount
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True, 
        'message': f'Reset {rows_affected} players to starting values',
        'playersReset': rows_affected,
        'settings': {
            'sector': starting_sector,
            'credits': starting_credits,
            'turns': starting_turns
        }
    })

@app.route('/api/admin/settings', methods=['GET'])
def admin_get_settings():
    """Get game settings (admin only)"""
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT key, value FROM game_settings')
    settings = {row[0]: row[1] for row in c.fetchall()}
    conn.close()
    
    return jsonify({
        'success': True,
        'settings': {
            'startingSector': int(settings.get('starting_sector', '1')),
            'startingCredits': int(settings.get('starting_credits', '10000')),
            'startingTurns': int(settings.get('starting_turns', '50')),
            'startingFuel': int(settings.get('starting_fuel', '100')),
            'startingHull': int(settings.get('starting_hull', '100')),
            'startingShields': int(settings.get('starting_shields', '100'))
        }
    })

@app.route('/api/admin/settings', methods=['PUT'])
def admin_update_settings():
    """Update game settings (admin only)"""
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Map of API keys to database keys
    key_map = {
        'startingSector': 'starting_sector',
        'startingCredits': 'starting_credits',
        'startingTurns': 'starting_turns',
        'startingFuel': 'starting_fuel',
        'startingHull': 'starting_hull',
        'startingShields': 'starting_shields'
    }
    
    updated = []
    for api_key, db_key in key_map.items():
        if api_key in data:
            value = str(data[api_key])
            c.execute('INSERT OR REPLACE INTO game_settings (key, value) VALUES (?, ?)', (db_key, value))
            updated.append(api_key)
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': f'Updated settings: {", ".join(updated)}',
        'updated': updated
    })

@app.route('/api/admin/stats', methods=['GET'])
def admin_get_stats():
    """Get dashboard statistics (admin only)"""
    # Allow localhost without token (for Electron Sysop Station)
    if not is_localhost_request():
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        admin = verify_admin_token(token)
        
        if not admin:
            return jsonify({'error': 'Admin access required'}), 403
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Total players
    c.execute('SELECT COUNT(*) FROM accounts WHERE is_admin = 0')
    total_players = c.fetchone()[0]
    
    # Active sessions (players logged in)
    c.execute('SELECT COUNT(DISTINCT account_id) FROM sessions')
    active_sessions = c.fetchone()[0]
    
    # Players active in last 10 minutes
    from datetime import datetime, timedelta
    ten_min_ago = (datetime.now() - timedelta(minutes=10)).isoformat()
    c.execute('SELECT COUNT(*) FROM players WHERE last_activity > ?', (ten_min_ago,))
    recently_active = c.fetchone()[0]
    
    # Total connections (sessions)
    c.execute('SELECT COUNT(*) FROM sessions')
    total_connections = c.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'totalPlayers': total_players,
        'activeSessions': active_sessions,
        'recentlyActive': recently_active,
        'totalConnections': total_connections
    })

# ============================================
# STATIC FILE SERVING (Must be LAST!)
# ============================================
# This catch-all route must be defined AFTER all API routes
# so that API routes are evaluated first

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Serve index.html for root
    if path == '' or path == 'index.html':
        try:
            with open('index.html', 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"Error loading index.html: {e}", 500
    
    # Serve other files
    try:
        file_path = path
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Determine content type
        if path.endswith('.css'):
            return content, 200, {'Content-Type': 'text/css'}
        elif path.endswith('.js'):
            return content, 200, {'Content-Type': 'application/javascript'}
        elif path.endswith('.png'):
            return content, 200, {'Content-Type': 'image/png'}
        elif path.endswith('.jpg') or path.endswith('.jpeg'):
            return content, 200, {'Content-Type': 'image/jpeg'}
        elif path.endswith('.svg'):
            return content, 200, {'Content-Type': 'image/svg+xml'}
        elif path.endswith('.mp3'):
            return content, 200, {'Content-Type': 'audio/mpeg'}
        else:
            return content
    except FileNotFoundError:
        return f"File not found: {path}", 404
    except Exception as e:
        return f"Error loading {path}: {e}", 500


def promote_to_admin(username: str):
    """Ensure the given username has admin privileges (is_admin = 1)."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('UPDATE accounts SET is_admin = 1 WHERE username = ?', (username,))
    conn.commit()
    conn.close()

def create_admin_account(username: str, password: str):
    """Create admin account if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Check if account exists
    c.execute('SELECT id FROM accounts WHERE username = ?', (username,))
    if c.execute('SELECT id FROM accounts WHERE username = ?', (username,)).fetchone():
        print(f"[INFO] Admin account '{username}' already exists")
        conn.close()
        promote_to_admin(username)
        return
    
    # Create admin account
    password_hash = hash_password(password)
    created_at = datetime.now().isoformat()
    c.execute('''INSERT INTO accounts (username, password_hash, created_at, is_admin)
                 VALUES (?, ?, ?, 1)''',
              (username, password_hash, created_at))
    conn.commit()
    conn.close()
    print(f"[OK] Admin account '{username}' created successfully")

if __name__ == '__main__':
    print("========================================")
    print("  Ad Astra Game Server")
    print("========================================")
    print()
    
    # Initialize database
    init_db()
    
    # Create default admin account (username: admin, password: admin123)
    create_admin_account("admin", "admin123")
    print("[INFO] Admin credentials: username='admin' password='admin123'")
    
    print()
    print("Starting server on http://localhost:8000")
    print("Press Ctrl+C to stop")
    print()
    
    app.run(host='0.0.0.0', port=8000, debug=False, use_reloader=False)