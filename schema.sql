CREATE TABLE daily_words (
        date TEXT PRIMARY KEY, 
        word TEXT NOT NULL,
        theme TEXT DEFAULT 'General'
    );

CREATE TABLE wordle_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, player_name TEXT, guesses INTEGER, UNIQUE(date, player_name));

CREATE TABLE game_state (date TEXT, player_name TEXT, guesses TEXT, PRIMARY KEY (date, player_name));

CREATE TABLE user_challenges (id INTEGER PRIMARY KEY AUTOINCREMENT, creator TEXT, word TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE challenge_state (challenge_id INTEGER, player_name TEXT, guesses TEXT, finished BOOLEAN DEFAULT 0, PRIMARY KEY (challenge_id, player_name));

CREATE TABLE daily_connections (
                    date TEXT PRIMARY KEY,
                    theme TEXT,
                    puzzle_data TEXT, -- JSON: {categories: [{name: "FRUIT", words: ["APPLE",...]}, ...]}
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

CREATE TABLE daily_contexto (
                    date TEXT PRIMARY KEY,
                    secret_word TEXT,
                    theme TEXT,
                    nearby_words TEXT, -- JSON: Pre-calculated hints if needed
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

CREATE TABLE connections_scores (
                    date TEXT,
                    player_name TEXT,
                    mistakes INTEGER,
                    solved BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (date, player_name)
                );

CREATE TABLE contexto_scores (
                    date TEXT,
                    player_name TEXT,
                    guesses INTEGER,
                    solved BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (date, player_name)
                );

CREATE TABLE daily_crosswords (
        date TEXT PRIMARY KEY,
        theme TEXT NOT NULL,
        grid_data TEXT NOT NULL,
        clues_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE crossword_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        player_name TEXT NOT NULL,
        time_seconds INTEGER NOT NULL,
        used_check_mode BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, player_name)
    );

CREATE TABLE crossword_state (
        date TEXT NOT NULL,
        player_name TEXT NOT NULL,
        grid_state TEXT,
        time_elapsed INTEGER DEFAULT 0,
        finished BOOLEAN DEFAULT 0,
        PRIMARY KEY (date, player_name)
    );

CREATE TABLE arcade_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game TEXT NOT NULL,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        level INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE adastra_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0,
        is_banned INTEGER NOT NULL DEFAULT 0
    );

CREATE TABLE adastra_players (
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
        ship_variant INTEGER DEFAULT 1,
        FOREIGN KEY (account_id) REFERENCES adastra_accounts(id)
    );

CREATE TABLE adastra_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

CREATE TABLE adastra_multiplayer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

CREATE TABLE adastra_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES adastra_accounts(id)
    );

CREATE TABLE daily_spellingbee (
        date TEXT PRIMARY KEY,
        center_letter TEXT NOT NULL,
        outer_letters TEXT NOT NULL,
        valid_words TEXT NOT NULL,
        pangrams TEXT NOT NULL,
        max_points INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE spellingbee_scores (
        date TEXT,
        player_name TEXT,
        points INTEGER,
        words_found INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date, player_name)
    );

CREATE TABLE daily_between (
        date TEXT PRIMARY KEY,
        target_word TEXT NOT NULL,
        lower_bound TEXT NOT NULL,
        upper_bound TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE between_scores (
        date TEXT,
        player_name TEXT,
        guesses INTEGER,
        score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date, player_name)
    );

CREATE TABLE daily_phrases (
        date TEXT PRIMARY KEY,
        phrase TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE phrase_scores (
        date TEXT,
        player_name TEXT,
        attempts INTEGER,
        won BOOLEAN,
        score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date, player_name)
    );

