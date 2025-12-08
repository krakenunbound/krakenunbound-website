"""
Ad Astra - Game Server with Database
Flask API for account management and game state persistence
"""

from flask import Flask, request, jsonify, send_from_directory
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
GAME_FILES_PATH = '.'  # Current directory where index.html is

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
        last_login TEXT
    )''')
    
    # Players table (game data)
    c.execute('''CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        pilot_name TEXT NOT NULL,
        ship_name TEXT,
        credits INTEGER DEFAULT 10000,
        turns INTEGER DEFAULT 1000,
        current_sector INTEGER DEFAULT 1,
        ship_type TEXT DEFAULT 'Scout',
        cargo TEXT DEFAULT '{}',
        equipment TEXT DEFAULT '{}',
        game_state TEXT DEFAULT '{}',
        FOREIGN KEY (account_id) REFERENCES accounts(id)
    )''')
    
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
    print("✓ Database initialized")

# Hash password
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Generate session token
def generate_token():
    return secrets.token_hex(32)

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/')
@app.route('/<path:path>')
def serve_game(path='index.html'):
    """Serve game files"""
    if path == '':
        path = 'index.html'
    return send_from_directory(GAME_FILES_PATH, path)

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
        
        c.execute('INSERT INTO accounts (username, password_hash, created_at) VALUES (?, ?, ?)',
                  (username, password_hash, created_at))
        account_id = c.lastrowid
        
        # Create player
        c.execute('''INSERT INTO players 
                     (account_id, pilot_name, ship_name) 
                     VALUES (?, ?, ?)''',
                  (account_id, pilot_name, ship_name))
        
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
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    password_hash = hash_password(password)
    c.execute('SELECT id FROM accounts WHERE username = ? AND password_hash = ?',
              (username, password_hash))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'error': 'Invalid username or password'}), 401
    
    account_id = result[0]
    
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
    
    return jsonify({
        'success': True,
        'token': token,
        'username': username
    })

@app.route('/api/player', methods=['GET'])
def get_player():
    """Get player data"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get account from token
    c.execute('SELECT account_id FROM sessions WHERE token = ?', (token,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'error': 'Invalid token'}), 401
    
    account_id = result[0]
    
    # Get player data
    c.execute('''SELECT p.*, a.username 
                 FROM players p 
                 JOIN accounts a ON p.account_id = a.id 
                 WHERE p.account_id = ?''', (account_id,))
    
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Player not found'}), 404
    
    return jsonify({
        'username': row[11],
        'pilotName': row[2],
        'shipName': row[3],
        'credits': row[4],
        'turns': row[5],
        'currentSector': row[6],
        'shipType': row[7],
        'cargo': json.loads(row[8]),
        'equipment': json.loads(row[9]),
        'gameState': json.loads(row[10])
    })

@app.route('/api/player', methods=['PUT'])
def update_player():
    """Update player data"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get account from token
    c.execute('SELECT account_id FROM sessions WHERE token = ?', (token,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'error': 'Invalid token'}), 401
    
    account_id = result[0]
    data = request.json
    
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
                 game_state = ?
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
               account_id))
    
    conn.commit()
    conn.close()
    
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

if __name__ == '__main__':
    print("========================================")
    print("  Ad Astra Game Server")
    print("========================================")
    print()
    
    # Initialize database
    init_db()
    
    print()
    print("Starting server on http://localhost:8000")
    print("Press Ctrl+C to stop")
    print()
    
    app.run(host='0.0.0.0', port=8000, debug=True)
