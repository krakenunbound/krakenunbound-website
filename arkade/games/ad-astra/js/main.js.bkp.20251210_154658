// Ad Astra - Main Application
// main.js - Initialize and coordinate all game systems

import { Utils } from './utils.js';
import { AuthSystem } from './auth-api.js';
import GameState from './game-state.js';
import Galaxy from './galaxy.js';
import ShipManager from './ship.js';
import EventSystem from './events.js';
import TradingSystem from './trading.js';
import CombatSystem from './combat.js';
import UI from './ui.js';
import AdminPanel from './admin.js';
import AudioSystem from './audio.js';
import MessageBoard from './messages.js';
import { NavigationComputer } from './navigation.js';
import { ComputerSystem } from './computer.js';
import { FighterSystem } from './fighters.js';
import { ColonizationSystem } from './colonization.js';
import MultiplayerSystem from './multiplayer.js';
import PvPSystem from './pvp.js';
import AssetManager from './assets.js';
import AlphaTesterSystem from './alpha-tester.js';
import AlphaTesterHandlers from './alpha-tester-handlers.js';
import MessageBoardHandlers from './messageboard-handlers.js';
import CharacterCustomizationHandlers from './character-customization-handlers.js';
import MiningSystem from './mining.js';
import VendorDialogue from './vendor-dialogue.js';
import RoutePlanner from './route-planner.js';
import EncounterSystem from './encounters.js';
import AsteroidMinigame from './asteroid-minigame.js';
import PirateMinigame from './pirate-minigame.js';
import HiveMinigame from './hive-minigame.js';
import StarKrakenMinigame from './starkraken-minigame.js';

class Game {
    constructor() {
        // Initialize systems
        this.auth = new AuthSystem();
        this.gameState = new GameState(this.auth); // Pass auth for server saves
        this.galaxy = new Galaxy();
        this.combat = new CombatSystem();
        this.ui = new UI();
        this.audio = new AudioSystem();
        this.messageBoard = new MessageBoard();
        this.admin = null;

        // New v0.7.0 systems
        this.navigation = null; // Initialized when galaxy is loaded
        this.computer = new ComputerSystem();
        this.fighters = new FighterSystem();
        this.colonization = new ColonizationSystem();

        // New v0.8.0 multiplayer systems
        this.multiplayer = new MultiplayerSystem();
        this.pvp = new PvPSystem(this.combat);
        this.assets = new AssetManager();
        this.alphaTester = new AlphaTesterSystem();
        this.alphaHandlers = new AlphaTesterHandlers(this);
        this.messageBoardHandlers = new MessageBoardHandlers(this);
        this.characterCustomization = new CharacterCustomizationHandlers(this);

        // Mining system
        this.mining = new MiningSystem(this);

        // Vendor dialogue system
        this.vendorDialogue = new VendorDialogue();

        // Route planning and encounters
        this.routePlanner = new RoutePlanner(this);
        this.encounters = new EncounterSystem(this);

        // Asteroid minigame
        this.asteroidMinigame = new AsteroidMinigame(this);

        // Pirate combat minigame
        this.pirateMinigame = new PirateMinigame(this);

        // Hive Assault minigame
        this.hiveMinigame = new HiveMinigame(this);

        // Star Kraken minigame
        this.starKrakenMinigame = new StarKrakenMinigame(this);

        // Current state
        this.currentPlanet = null;
        this.currentStation = null;
        this.currentLocation = null; // For message board
        this.pendingEvent = null;
        this.currentComputerTab = 'navigation'; // Track active computer tab
        this.alphaTesterVisible = false; // Alpha tester panel visibility

        // Initialize immediately (DOM is already loaded when constructor runs)
        this.init();
    }

    // Minigame Launchers
    startAsteroidCombat(difficulty, onComplete) {
        if (this.asteroidMinigame) {
            if (window.particleSystem) window.particleSystem.setMode('asteroids');
            this.audio.stopMusic();
            this.asteroidMinigame.start(difficulty, (result) => {
                this.updateParticleBackground();
                this.audio.playMusic('exploration');
                if (onComplete) onComplete(result);
            });
        }
    }

    startPirateCombat(strength, onComplete) {
        if (this.pirateMinigame) {
            this.audio.stopMusic();
            this.pirateMinigame.start(strength, (result) => {
                this.updateParticleBackground();
                this.audio.playMusic('exploration');
                if (onComplete) onComplete(result);
            });
        }
    }

    startHiveCombat(difficulty, onComplete) {
        if (this.hiveMinigame) {
            this.audio.stopMusic();
            this.hiveMinigame.start(difficulty, (result) => {
                this.updateParticleBackground();
                this.audio.playMusic('exploration');
                if (onComplete) onComplete(result);
            });
        }
    }

    startStarKrakenCombat(difficulty, onComplete) {
        if (this.starKrakenMinigame) {
            this.audio.stopMusic();
            this.starKrakenMinigame.start(difficulty, (result) => {
                this.updateParticleBackground();
                this.audio.playMusic('exploration');
                if (onComplete) onComplete(result);
            });
        }
    }

    // Helper to restore correct background based on sector location
    updateParticleBackground() {
        if (!window.particleSystem) return;

        const sectorId = this.gameState.gameData?.currentSector;
        const sector = this.galaxy?.getSector(sectorId);

        let mode = 'starfield';
        if (sector && sector.contents.some(c => c.type === 'debris')) {
            mode = 'asteroids';
        }

        window.particleSystem.setMode(mode);
    }

    init() {
        console.log('Ad Astra - Initializing...');

        // Load galaxy if exists, otherwise generate
        if (!this.galaxy.load()) {
            console.log('No galaxy found, generating new one...');
            this.galaxy.generate();
        }

        // Ensure GameState has the galaxy data
        this.gameState.galaxy = this.galaxy.data;

        // Initialize navigation computer with galaxy
        this.navigation = new NavigationComputer(this.galaxy);

        // Setup all event listeners
        this.setupEventListeners();

        // Check if already logged in
        if (this.auth.isLoggedIn()) {
            this.handleAutoLogin();
        } else {
            this.ui.showScreen('auth');
        }

        console.log('Initialization complete!');
    }

    async handleAutoLogin() {
        // Attempt to load user from Arkade token
        const success = await this.auth.loadCurrentUser();

        if (success) {
            const user = this.auth.getCurrentUser();

            // Set username immediately so we know who we are
            this.gameState.setCurrentUser(user.username);

            console.log('🔄 Auto-Login User Check:', user);

            // Check if this is a new player (no pilot/game state)
            // CRITICAL FIX: Trust GameState cache first before forcing creation
            const authHasPilot = user.pilotName && user.pilotName !== 'Unknown';
            const authHasState = user.gameState && Object.keys(user.gameState).length > 0;

            // Also check the GameState object directly (it might have loaded from localStorage independently)
            const localStateHasPilot = this.gameState.gameData &&
                this.gameState.gameData.pilotName &&
                this.gameState.gameData.pilotName !== 'Unknown';

            if (!authHasPilot && !authHasState && !localStateHasPilot) {
                console.log('✅ Auth success, but no character data found. Redirecting to creation.');
                this.ui.showAuthForm('character-creation');
                this.characterCustomization.initializeCharacterCreation();
                return;
            }

            // Sync server data to local game state
            if (authHasState) {
                console.log('✅ Loading existing game state from server...');
                this.gameState.gameData = user.gameState;

                // Ensure critical fields from DB are synced if missing from JSON blob
                if (user.credits !== undefined) this.gameState.gameData.credits = user.credits;
                if (user.turns !== undefined) this.gameState.gameData.turns = user.turns;
                if (user.currentSector !== undefined) this.gameState.gameData.currentSector = user.currentSector;
                if (user.shipVariant !== undefined) this.gameState.gameData.shipVariant = user.shipVariant;

                await this.gameState.save();
            } else if (authHasPilot) {
                // We have a pilot name but no JSON blob - reconstruct minimal state
                console.log('⚠️ Reconstructing state from basic pilot data...');
                const playerData = this.gameState.createPlayer(
                    user.username,
                    user.pilotName,
                    user.shipName || 'Explorer',
                    user.shipType || 'Scout',
                    user.shipVariant || 1
                );
                this.gameState.gameData = playerData;
                await this.gameState.save();
            }

            this.startGame();
        } else {
            this.ui.showScreen('auth');
        }
    }

    claimPlanet(sectorId, planetIndex) {
        const result = this.colonization.claimPlanet(
            this.galaxy,
            sectorId,
            planetIndex,
            this.gameState.currentUser,
            this.gameState.gameData.pilotName,
            this.gameState.gameData.credits
        );

        if (result.success) {
            this.gameState.gameData.credits -= result.cost;
            this.gameState.save();
            this.ui.addMessage(`Successfully claimed ${result.colony.planetName}!`, 'success');
            this.audio.playSfx('success');
            this.updateUI(); // Refresh UI to show "Manage" button
        } else {
            this.ui.showError(result.error);
            this.audio.playSfx('error');
        }
    }



    setupEventListeners() {
        // Global click listener for audio init
        let firstClick = true;
        document?.addEventListener('click', async () => {
            this.audio.init();

            // Discover music files on first click
            if (firstClick) {
                firstClick = false;
                await this.audio.discoverMusic();
                console.log('🎵 Music system ready!');
            }

            this.audio.playSfx('click');

            // If on auth screen and no music playing, try playing menu theme
            if (document.getElementById('auth-screen').classList.contains('active') && !this.audio.currentTrack) {
                this.audio.playMusic('menu');
            }
        }, { once: false }); // Keep listening for clicks for sfx

        // Auth screen
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.ui.showAuthForm('register');
            return false;
        });

        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Show login clicked');
            this.ui.showAuthForm('login');
        });

        // New Unified Auth Handlers
        document.getElementById('start-game-btn')?.addEventListener('click', () => this.handleStartGame());

        // Admin Access Toggle
        document.getElementById('show-admin-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('landing-actions').style.display = 'none';
            document.getElementById('admin-login-form').style.display = 'block';
        });

        document.getElementById('hide-admin-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('admin-login-form').style.display = 'none';
            document.getElementById('landing-actions').style.display = 'block';
        });

        // Admin login form handlers
        document.getElementById('show-login-from-admin')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('admin-login-form').style.display = 'none';
            document.getElementById('landing-actions').style.display = 'block';
        });

        document.getElementById('admin-login-btn')?.addEventListener('click', () => this.handleAdminLoginSubmit());

        // Enter key support for admin login
        document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('admin-login-btn').click();
            }
        });

        // Admin Galaxy Generation
        document.getElementById('admin-generate-galaxy')?.addEventListener('click', () => this.handleAdminGenerateGalaxy());

        // Navigation
        document.getElementById('nav-ship')?.addEventListener('click', () => this.showShip());
        document.getElementById('nav-sector')?.addEventListener('click', () => this.showSector());
        document.getElementById('nav-galaxy')?.addEventListener('click', () => this.showGalaxy());
        document.getElementById('nav-computer')?.addEventListener('click', () => this.showComputer());
        document.getElementById('nav-trade')?.addEventListener('click', () => this.showTrade());
        document.getElementById('nav-stats')?.addEventListener('click', () => this.showStats());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());

        // Mining
        document.getElementById('mine-asteroids-btn')?.addEventListener('click', () => {
            console.log('⛏️ Mining button clicked');
            this.mining.mineAsteroids();
        });

        // Message Board
        document.getElementById('messageboard-back')?.addEventListener('click', () => this.showSector());
        document.getElementById('mb-post-new')?.addEventListener('click', () => this.messageBoardHandlers.showPostForm());
        document.getElementById('mb-filter-type')?.addEventListener('change', () => this.messageBoardHandlers.filterMessages());
        document.getElementById('mb-search')?.addEventListener('input', () => this.messageBoardHandlers.filterMessages());
        document.getElementById('mb-refresh')?.addEventListener('click', () => this.messageBoardHandlers.loadMessages());
        document.getElementById('mb-submit-post')?.addEventListener('click', () => this.messageBoardHandlers.submitPost());
        document.getElementById('mb-cancel-post')?.addEventListener('click', () => this.messageBoardHandlers.hidePostForm());
        document.getElementById('mb-submit-reply')?.addEventListener('click', () => this.messageBoardHandlers.submitReply());
        document.getElementById('mb-cancel-reply')?.addEventListener('click', () => this.messageBoardHandlers.hideReplyForm());

        // Character counters for message board
        document.getElementById('mb-post-subject')?.addEventListener('input', (e) => {
            document.getElementById('mb-subject-count').textContent = e.target.value.length;
        });
        document.getElementById('mb-post-body')?.addEventListener('input', (e) => {
            document.getElementById('mb-body-count').textContent = e.target.value.length;
        });
        document.getElementById('mb-reply-body')?.addEventListener('input', (e) => {
            document.getElementById('mb-reply-count').textContent = e.target.value.length;
        });

        // Computer Interface
        document.getElementById('comp-nav-navigation')?.addEventListener('click', () => this.switchComputerTab('navigation'));
        document.getElementById('comp-nav-intel')?.addEventListener('click', () => this.switchComputerTab('intel'));
        document.getElementById('comp-nav-bookmarks')?.addEventListener('click', () => this.switchComputerTab('bookmarks'));
        document.getElementById('comp-nav-fighters')?.addEventListener('click', () => this.switchComputerTab('fighters'));
        document.getElementById('comp-nav-colonies')?.addEventListener('click', () => this.switchComputerTab('colonies'));

        // Navigation Computer
        document.getElementById('nav-calculate-route')?.addEventListener('click', () => this.calculateRoute());
        document.getElementById('nav-find-planet')?.addEventListener('click', () => this.findNearest('planet'));
        document.getElementById('nav-find-station')?.addEventListener('click', () => this.findNearest('station'));
        document.getElementById('nav-find-military')?.addEventListener('click', () => this.findNearest('military'));
        document.getElementById('nav-find-blackmarket')?.addEventListener('click', () => this.findNearest('blackmarket'));
        document.getElementById('nav-find-trade')?.addEventListener('click', () => this.findTradeRoute());

        // Intel Computer
        document.getElementById('intel-analyze-galaxy')?.addEventListener('click', () => this.analyzeGalaxy());

        // Bookmarks
        document.getElementById('bookmark-add-btn')?.addEventListener('click', () => this.addBookmark());

        // Fighters
        document.getElementById('fighter-deploy-btn')?.addEventListener('click', () => this.deployFighters());
        document.getElementById('mine-deploy-btn')?.addEventListener('click', () => this.deployMines());
        document.getElementById('fighter-refresh')?.addEventListener('click', () => this.refreshFighters());

        // Colonies
        document.getElementById('colony-genesis-btn')?.addEventListener('click', () => this.launchGenesis());
        document.getElementById('colony-refresh')?.addEventListener('click', () => this.refreshColonies());
        document.getElementById('colony-collect-all')?.addEventListener('click', () => this.collectAllIncome());

        // Alpha Tester
        document.getElementById('nav-alpha-tester')?.addEventListener('click', () => this.alphaHandlers.toggleAlphaTester());
        document.getElementById('alpha-close')?.addEventListener('click', () => this.alphaHandlers.toggleAlphaTester());
        document.getElementById('alpha-export')?.addEventListener('click', () => this.alphaHandlers.exportAlphaResults());
        document.getElementById('alpha-clear')?.addEventListener('click', () => this.alphaHandlers.clearAlphaResults());

        // Message log
        document.getElementById('clear-log')?.addEventListener('click', () => this.ui.clearMessages());
        // Admin
        document.getElementById('show-admin-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Admin Panel Listeners
        document.getElementById('admin-logout')?.addEventListener('click', () => {
            this.ui.showScreen('auth');
            this.admin = null;
        });

        document.getElementById('admin-generate-galaxy')?.addEventListener('click', () => this.handleAdminGenerateGalaxy());
        document.getElementById('admin-save-settings')?.addEventListener('click', () => this.handleAdminUpdateSettings());

        // Admin Tabs
        ['dashboard', 'players', 'galaxy', 'settings'].forEach(tab => {
            const el = document.getElementById(`admin-tab-${tab}`);
            if (el) {
                el?.addEventListener('click', () => {
                    this.ui.showAdminPanel(tab);
                    if (tab === 'players') this.refreshAdminPlayers();
                    if (tab === 'dashboard') this.refreshAdminDashboard();
                });
            }
        });

        // Admin Player Management
        document.getElementById('admin-refresh-players')?.addEventListener('click', () => this.refreshAdminPlayers());
        document.getElementById('admin-player-search')?.addEventListener('input', () => this.refreshAdminPlayers());
        document.getElementById('admin-save-player')?.addEventListener('click', () => this.handleAdminSavePlayer());
        document.getElementById('admin-cancel-edit')?.addEventListener('click', () => this.ui.hideAdminPlayerModal());
        document.getElementById('admin-refresh-economy')?.addEventListener('click', () => this.handleAdminRefreshEconomy());

        // Settings
        document.getElementById('nav-settings')?.addEventListener('click', async () => {
            if (!this.audio.musicDiscovered) {
                await this.audio.discoverMusic();
            }
            this.ui.showView('settings');
            this.ui.renderAudioSettings(this.audio);
        });

        document.getElementById('settings-volume-master')?.addEventListener('input', (e) => {
            this.audio.setMusicVolume(e.target.value / 100);
            const label = document.getElementById('settings-volume-master-value');
            if (label) label.textContent = `${Math.round(e.target.value)}%`;
        });

        document.getElementById('settings-volume-sfx')?.addEventListener('input', (e) => {
            this.audio.setSfxVolume(e.target.value / 100);
            const label = document.getElementById('settings-volume-sfx-value');
            if (label) label.textContent = `${Math.round(e.target.value)}%`;
        });

        document.getElementById('settings-music-enabled')?.addEventListener('change', (e) => {
            if (this.audio.musicEnabled !== e.target.checked) {
                this.audio.toggleMusic();
            }
        });

        document.getElementById('settings-playlist-mode')?.addEventListener('change', (e) => {
            this.audio.setPlaylistMode(e.target.checked);
        });

        document.getElementById('settings-shuffle-playlist')?.addEventListener('click', () => {
            this.audio.shufflePlaylist();
            this.ui.renderAudioSettings(this.audio);
        });

        // Keyboard shortcuts
        document?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.combat.combatActive) {
                this.combatFlee();
            }
        });
    }

    // Preview a track from the playlist
    previewTrack(key) {
        if (this.audio) {
            this.audio.playMusic(key);
        }
    }

    async handleLogin() {
        console.log('handleLogin called');
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        console.log('Attempting login for:', username);

        const result = await this.auth.login(username, password);
        console.log('Login result:', result);

        if (result.success) {
            console.log('Login successful, checking user data...');
            const serverData = this.auth.getCurrentUser();
            console.log('Server Data:', serverData);

            this.gameState.setCurrentUser(username);

            console.log('📊 Server data received:', {
                pilotName: serverData.pilotName,
                shipVariant: serverData.shipVariant,
                gameStateKeys: serverData.gameState ? Object.keys(serverData.gameState) : []
            });

            // Sync server data to local game state
            if (serverData.gameState && Object.keys(serverData.gameState).length > 0) {
                console.log('✅ Found existing game state, loading...');
                this.gameState.gameData = serverData.gameState;

                // Merge direct database fields that may have been updated by admin
                // These fields are stored in separate columns, not in game_state JSON
                console.log('🔄 Merging server fields:');
                console.log(`   DB turns: ${serverData.turns}, gameState turns: ${this.gameState.gameData.turns}`);
                console.log(`   DB credits: ${serverData.credits}, gameState credits: ${this.gameState.gameData.credits}`);
                console.log(`   DB sector: ${serverData.currentSector}, gameState sector: ${this.gameState.gameData.currentSector}`);
                if (this.gameState.gameData.ship) {
                    console.log(`   gameState hull: ${this.gameState.gameData.ship.hull}, fuel: ${this.gameState.gameData.ship.fuel}`);
                }

                if (serverData.turns !== undefined) {
                    this.gameState.gameData.turns = serverData.turns;
                }
                if (serverData.credits !== undefined) {
                    this.gameState.gameData.credits = serverData.credits;
                }
                if (serverData.currentSector !== undefined) {
                    this.gameState.gameData.currentSector = serverData.currentSector;
                }

                // Ensure shipVariant is preserved from server response
                if (serverData.shipVariant) {
                    console.log(`🚀 Setting shipVariant from server: ${serverData.shipVariant}`);
                    this.gameState.gameData.shipVariant = serverData.shipVariant;
                }
                await this.gameState.save();
                this.startGame();
            } else if (serverData.pilotName && serverData.pilotName !== 'Unknown') {
                console.log('⚠️ Found pilot name but no game state, reconstructing...');
                // Create minimal game state from server data
                const playerData = this.gameState.createPlayer(
                    username,
                    serverData.pilotName,
                    serverData.shipName,
                    serverData.shipType || 'scout',
                    serverData.shipVariant || 1
                );
                this.gameState.gameData = playerData;
                console.log(`🚀 Set shipVariant: ${serverData.shipVariant}`);
                await this.gameState.save();
                this.startGame();
            } else {
                console.log('❌ No character found, showing character creation...');
                // No character data found (or pilot name is Unknown)
                this.ui.showAuthForm('character-creation');
                this.characterCustomization.initializeCharacterCreation();
            }
        } else {
            console.log('Login failed:', result.error);
            this.ui.showError(result.error);
        }
    }

    async handleRegister() {
        console.log('handleRegister called');
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (password !== confirm) {
            this.ui.showError('Passwords do not match!');
            return;
        }

        // Register with placeholder pilot name
        const result = await this.auth.register(username, password, 'Unknown', 'Scout');
        console.log('Register result:', result);

        if (result.success) {
            console.log('Registration successful, auto-logging in...');
            // Auto-login after registration
            const loginResult = await this.auth.login(username, password);

            if (loginResult.success) {
                console.log('Auto-login successful, showing character creation...');
                this.gameState.setCurrentUser(username);
                // Go straight to character creation
                this.ui.showAuthForm('character-creation');
                this.characterCustomization.initializeCharacterCreation();
            } else {
                this.ui.showError('Registration successful, but auto-login failed. Please login manually.');
                this.ui.showAuthForm('login');
            }
        } else {
            this.ui.showError(result.error);
        }
    }

    async handleCreateCharacter() {
        // Delegate to character customization handler
        await this.characterCustomization.createCharacter();
    }

    startGame() {
        // Check for daily turn reset (replaces continuous regeneration)
        const wasReset = this.gameState.checkDailyReset();
        if (wasReset) {
            this.ui.addMessage('New day! Your turns have been reset.', 'success');
        }

        // Register player in multiplayer system
        this.multiplayer.registerPlayer(
            this.gameState.currentUser,
            this.gameState.gameData.pilotName,
            this.gameState.gameData.ship,
            this.gameState.gameData.currentSector
        );

        this.ui.showScreen('game');
        this.ui.showView('sector');
        this.updateUI();
        this.ui.addMessage('Welcome to Ad Astra!', 'success');
        this.ui.addMessage(`You are in Sector ${this.gameState.gameData.currentSector}`, 'info');

        // Show multiplayer status
        const activePlayers = this.multiplayer.getActivePlayers().length;
        if (activePlayers > 1) {
            this.ui.addMessage(`${activePlayers} active players in the galaxy`, 'info');
        }

        // Start exploration music
        this.audio.playMusic('exploration');

        // Initialize admin if user is admin
        if (this.auth.isAdmin(this.gameState.currentUser)) {
            this.admin = new AdminPanel(this.gameState, this.galaxy);
        }
    }

    // Start Game from Title Screen
    handleStartGame() {
        if (this.auth.isLoggedIn()) {
            this.handleAutoLogin();
        } else {
            this.auth.requireAuth();
        }
    }

    handleLogout() {
        this.gameState.logout();
        this.ui.showScreen('auth');
        // Show the landing actions (Launch/Auth) instead of the old login form
        this.ui.showAuthForm('landing-actions');
        this.ui.clearMessages();

        // Switch back to menu music
        this.audio.playMusic('menu');
    }

    updateUI() {
        this.ui.updateTopBar(this.gameState);

        if (this.ui.currentView === 'sector') {
            const sector = this.gameState.getCurrentSector();
            this.ui.displaySector(sector, this.gameState);

            // Switch particle effect based on sector contents
            if (window.particleSystem) {
                const hasAsteroids = sector?.contents.some(c => c.type === 'debris' && c.name === 'Asteroid Field');
                console.log(`🎨 Particle switch check: asteroids=${hasAsteroids}, sector=${sector?.id}`);
                window.particleSystem.setMode(hasAsteroids ? 'asteroids' : 'starfield');
            } else {
                console.warn('⚠️ window.particleSystem not available');
            }
        } else if (this.ui.currentView === 'ship') {
            this.ui.displayShip(this.gameState.gameData.ship, this.gameState.gameData.cargo);
        } else if (this.ui.currentView === 'trade' && this.currentPlanet) {
            this.ui.displayTrading(this.currentPlanet, this.gameState);
        } else if (this.ui.currentView === 'combat') {
            const status = this.combat.getStatus(this.gameState.gameData.ship);
            this.ui.displayCombat(status);
        } else if (this.ui.currentView === 'stats') {
            this.ui.displayStats(this.gameState.gameData);
        } else if (this.ui.currentView === 'galaxy') {
            // Refresh galaxy map to show new position
            this.ui.renderGalaxyMap(this.galaxy.data, this.gameState.gameData.currentSector, this.gameState.gameData.ship);
        }
    }

    showSector() {
        this.ui.showView('sector');
        this.updateUI();
    }

    /**
     * Check if sector has asteroid field and trigger minigame if so
     * @param {number} sectorId - Sector to check
     * @param {function} onComplete - Callback when minigame completes (or immediately if no asteroids)
     */
    checkAsteroidField(sectorId, onComplete) {
        const sector = this.galaxy.getSector(sectorId);
        const hasAsteroids = sector?.contents?.some(c => c.type === 'debris' && c.name === 'Asteroid Field');

        if (!hasAsteroids) {
            // No asteroid field, continue immediately
            if (onComplete) onComplete();
            return;
        }

        // Check if player has mining equipment
        const ship = this.gameState.gameData.ship;
        // Ensure equipment field exists for backward compatibility
        if (!ship.equipment) {
            ship.equipment = { miningLaser: null, scanner: null, tractor: null };
        }
        const hasMining = ship.equipment.miningLaser !== null && ship.equipment.miningLaser !== undefined;

        this.ui.addMessage('⚠️ Entering asteroid field!', 'warning');

        // Start minigame
        this.asteroidMinigame.start(hasMining, async (results) => {
            // Process results
            if (results.survived) {
                this.ui.addMessage('✅ Cleared the asteroid field!', 'success');

                // Add loot to cargo
                if (results.loot.ore > 0) {
                    if (!this.gameState.gameData.cargo) this.gameState.gameData.cargo = {};
                    this.gameState.gameData.cargo.Ore = (this.gameState.gameData.cargo.Ore || 0) + results.loot.ore;
                    this.ui.addMessage(`📦 Collected ${results.loot.ore} Ore`, 'success');
                }
                if (results.loot.equipment > 0) {
                    if (!this.gameState.gameData.cargo) this.gameState.gameData.cargo = {};
                    this.gameState.gameData.cargo.Equipment = (this.gameState.gameData.cargo.Equipment || 0) + results.loot.equipment;
                    this.ui.addMessage(`📦 Collected ${results.loot.equipment} Equipment`, 'success');
                }

                // Apply hull damage from hits taken
                if (results.hullDamage > 0) {
                    ship.hull = Math.max(1, ship.hull - results.hullDamage);
                    this.ui.addMessage(`⚠️ Hull took ${results.hullDamage} damage`, 'warning');
                }
            } else {
                // Ship destroyed in asteroid field
                this.ui.addMessage('💀 Ship destroyed in asteroid field!', 'error');
                // TODO: Handle ship destruction / game over
            }

            await this.gameState.save();
            this.updateUI();

            // Continue with callback
            if (onComplete) onComplete();
        });
    }

    showShip() {
        this.ui.showView('ship');
        this.updateUI();
    }

    showStats() {
        this.ui.showView('stats');
        setTimeout(() => this.updateUI(), 0);
    }

    showGalaxy() {
        this.ui.showView('galaxy');
        // Galaxy map rendering is handled by ui.showView special case
    }

    showTrade() {
        const sector = this.gameState.getCurrentSector();
        const planet = sector?.contents.find(c => c.type === 'planet');
        const station = sector?.contents.find(c => c.type === 'station' && c.services?.includes('trade'));

        // Prefer planet, but allow station trading
        const tradingLocation = planet || station;

        if (tradingLocation) {
            this.currentPlanet = tradingLocation; // Used for trading logic
            this.currentLocation = tradingLocation; // For message board
            this.ui.showView('trade');

            // Show message board button if location has message board
            const mbBtn = document.getElementById('trade-messageboard-btn');
            if (mbBtn && tradingLocation.messageBoard) {
                mbBtn.style.display = 'block';
            }

            this.updateUI();
        } else {
            this.ui.showError('No trading post in this sector!');
        }
    }

    // Show vendor dialogue response with typewriter effect
    showVendorResponse(message) {
        console.log('🛒 showVendorResponse called with:', message);
        const dialogueElement = document.getElementById('vendor-dialogue');
        if (!dialogueElement || !this.vendorDialogue) {
            console.log('🛒 No dialogue element or vendorDialogue!', { dialogueElement, vendorDialogue: this.vendorDialogue });
            return;
        }

        // Store current message for skip function
        this.currentVendorMessage = message;

        // Clear and type new message
        dialogueElement.textContent = '';
        this.vendorDialogue.typeText(message, dialogueElement, 25); // Slightly faster for responses
    }

    // Skip vendor dialogue animation (jump to end)
    skipVendorDialogue() {
        const dialogueElement = document.getElementById('vendor-dialogue');
        if (!dialogueElement || !this.vendorDialogue) return;

        const fullText = this.currentVendorMessage || this.currentVendorGreeting || '';
        this.vendorDialogue.skipTyping(dialogueElement, fullText);
    }

    warpToSector(sectorId) {
        if (this.gameState.gameData.turns < 1) {
            this.ui.showError('Not enough turns!');
            this.audio.playSfx('error');
            return;
        }

        const currentSectorId = this.gameState.gameData.currentSector;
        const currentSector = this.galaxy.getSector(currentSectorId);
        const targetSector = this.galaxy.getSector(sectorId);

        if (!currentSector || !targetSector) {
            this.ui.showError('Invalid sector data!');
            return;
        }

        // Check if there's a warp lane connection (multiplayer requirement)
        if (!currentSector.warps.includes(sectorId)) {
            this.ui.showError('No warp lane to that sector! You can only travel to connected sectors.');
            return;
            this.audio.playSfx('error');
            return;
        }

        // Calculate distance and fuel
        const dist = Utils.distance(currentSector.x, currentSector.y, targetSector.x, targetSector.y);
        const fuelCost = ShipManager.calculateFuelCost(dist);
        let travelTime = ShipManager.calculateTravelTime(dist, this.gameState.gameData.ship.speed);

        // Safety check: Ensure minimum 10 seconds
        if (!travelTime || isNaN(travelTime) || travelTime < 10000) {
            console.warn('⚠️ Invalid travelTime calculated:', travelTime, 'Forcing to 10000ms');
            travelTime = 10000;
        }

        // Check turns
        if (this.gameState.gameData.turns < 1) {
            this.ui.showError('Not enough turns! Waits for daily reset or buy more.');
            this.audio.playSfx('error');
            return;
        }

        // Check fuel
        if (this.gameState.gameData.ship.fuel < fuelCost) {
            this.ui.showError(`Not enough fuel! Need ${fuelCost}, have ${this.gameState.gameData.ship.fuel}`);
            this.audio.playSfx('error');
            return;
        }

        // Start travel sequence
        this.ui.showTravelOverlay(travelTime, sectorId);
        this.audio.playSfx('warp');

        let elapsed = 0;
        const updateInterval = setInterval(() => {
            elapsed += 100;
            const progress = Math.min(100, (elapsed / travelTime) * 100);
            const remaining = Math.max(0, travelTime - elapsed);
            this.ui.updateTravelOverlay(remaining, progress);
        }, 100);

        setTimeout(() => {
            clearInterval(updateInterval);
            this.ui.hideTravelOverlay();

            // Consume fuel
            ShipManager.useFuel(this.gameState.gameData.ship, fuelCost);

            // Check for random event
            const event = EventSystem.checkForEvent();
            if (event) {
                this.handleEvent(event);
                // If event is combat, switch music
                if (event.key === 'pirateEncounter') {
                    this.audio.playMusic('combat');
                    this.audio.playSfx('alert');
                }
                // Even if event happens, we might still arrive? 
                // Original logic returned here, effectively cancelling the move if event happened.
                // But we already paid fuel and time. 
                // Let's say the event intercepts you *before* arrival or *at* arrival.
                // If it's an interception, you are stuck at previous sector or a "deep space" location?
                // For simplicity, let's stick to original logic: Event interrupts warp.
                // But we already consumed fuel. That's the risk!
                this.updateUI(); // Update to show fuel loss
                return;
            }

            if (this.gameState.moveToSector(sectorId)) {
                // Update multiplayer position
                this.multiplayer.updatePosition(
                    sectorId
                );

                // --- TRADEWARS DEFENSE MECHANICS ---
                if (this.fighters) {
                    const defenseResult = this.fighters.fighterAutoDefense(
                        sectorId,
                        this.gameState.gameData.ship,
                        this.gameState.currentUser
                    );

                    // Tolls Logic
                    if (defenseResult.hasTolls) {
                        defenseResult.tolls.forEach(toll => {
                            if (confirm(`WARN: Sector controlled by ${toll.owner}.\n\nPay Toll of ${toll.amount} Credits?\n(Cancel to Invoke ${toll.fighters} Fighters)`)) {
                                if (this.gameState.gameData.credits >= toll.amount) {
                                    this.gameState.gameData.credits -= toll.amount;
                                    this.ui.addMessage(`Paid toll of ${toll.amount} to ${toll.owner}.`, 'info');
                                } else {
                                    this.ui.addMessage(`Can't afford toll! ${toll.owner}'s fighters attacking!`, 'error');
                                    // Trigger attack
                                    const damage = Math.floor(toll.fighters * this.fighters.FIGHTER_ATTACK_POWER * 0.5);
                                    if (damage > 0) {
                                        this.gameState.gameData.ship.hull = Math.max(0, this.gameState.gameData.ship.hull - damage);
                                        this.ui.addMessage(`Combined Fighter Attack: ${damage} Damage!`, 'error');
                                    }
                                }
                            } else {
                                this.ui.addMessage(`Refused Toll! ${toll.owner}'s fighters attacking!`, 'warning');
                                // Trigger attack
                                const damage = Math.floor(toll.fighters * this.fighters.FIGHTER_ATTACK_POWER * 0.5);
                                if (damage > 0) {
                                    this.gameState.gameData.ship.hull = Math.max(0, this.gameState.gameData.ship.hull - damage);
                                    this.ui.addMessage(`Combined Fighter Attack: ${damage} Damage!`, 'error');
                                }
                            }
                        });
                    }

                    // Standard Auto-Attack Logic
                    if (defenseResult.attacked) {
                        this.ui.addMessage(`⚠️ SECTOR DEFENDED! Taken ${defenseResult.damage} damage from automated fighters!`, 'warning');
                        this.gameState.gameData.ship.hull = Math.max(0, this.gameState.gameData.ship.hull - defenseResult.damage);
                        this.audio.playSfx('explosion');
                    }

                    // Mines Logic
                    const mineResult = this.fighters.triggerMines(
                        sectorId,
                        this.gameState.currentUser,
                        this.gameState.gameData.ship
                    );

                    if (mineResult.triggered) {
                        this.ui.addMessage(`💥 HIT MINES! Taken ${mineResult.damage} damage!`, 'error');
                        this.gameState.gameData.ship.hull = Math.max(0, this.gameState.gameData.ship.hull - mineResult.damage);
                        this.audio.playSfx('explosion');
                    }
                }

                // Check for death
                if (this.gameState.gameData.ship.hull <= 0) {
                    this.ui.addMessage('💀 SHIP DESTROYED BY SECTOR DEFENSES', 'error');
                }

                this.gameState.save();
                this.ui.addMessage(`Warped to Sector ${sectorId}`, 'success');

                // Check for asteroid field and trigger minigame if needed
                this.checkAsteroidField(sectorId, () => {
                    this.updateUI();
                });
            } else {
                this.ui.showError('Cannot warp to that sector!');
            }
        }, travelTime);
    }

    handleEvent(event) {
        this.pendingEvent = event;
        this.ui.addMessage(event.title, 'warning');
        this.ui.addMessage(event.description, 'info');

        // Show choices
        let choicesHtml = '<div style="margin-top: 20px;"><strong>What do you do?</strong></div>';
        event.choices.forEach((choice, index) => {
            choicesHtml += `<button onclick="window.game.selectEventChoice(${index})" style="margin: 5px;">${choice.text}</button>`;
        });

        const eventDiv = document.createElement('div');
        eventDiv.innerHTML = choicesHtml;
        eventDiv.style.cssText = 'background: var(--bg-medium); border: 2px solid var(--accent-yellow); padding: 20px; margin: 20px 0; border-radius: 8px;';

        const sectorInfo = document.getElementById('sector-info');
        sectorInfo.insertBefore(eventDiv, sectorInfo.firstChild);
    }

    async selectEventChoice(choiceIndex) {
        if (!this.pendingEvent) return;

        const result = EventSystem.processChoice(this.pendingEvent, choiceIndex);
        const outcome = EventSystem.applyOutcome(this.gameState, result.outcome);

        this.ui.addMessage(outcome.message, outcome.success ? 'success' : 'warning');

        // Handle special outcomes
        if (outcome.changes.combat) {
            const enemy = EventSystem.generateEnemy();
            this.startCombat(enemy);
        } else if (outcome.changes.randomWarp) {
            const randomSector = Utils.random.int(1, this.galaxy.data.size);
            this.gameState.gameData.currentSector = randomSector;
            await this.gameState.save();
            this.ui.addMessage(`Warped to random Sector ${randomSector}!`, 'warning');
        }

        this.pendingEvent = null;
        this.updateUI();
    }

    showTrading(planet) {
        this.currentPlanet = planet;
        this.ui.showView('trade');
        this.updateUI();
    }

    buyCommodity(commodity) {
        const qtyInput = document.getElementById(`trade-qty-${commodity}`);
        const quantity = parseInt(qtyInput.value) || 0;

        if (quantity <= 0) {
            this.ui.showError('Invalid quantity!');
            return;
        }

        const result = TradingSystem.buy(this.gameState, commodity, quantity, this.currentPlanet);

        if (result.success) {
            this.ui.addMessage(
                `Bought ${result.quantity} ${result.commodity} for ${Utils.format.credits(result.cost)}`,
                'success'
            );

            this.updateUI();

            // Show vendor response AFTER updateUI (so it doesn't get overwritten)
            setTimeout(() => {
                this.showVendorResponse(
                    this.vendorDialogue.generatePurchaseResponse(commodity, result.quantity)
                );
            }, 50);
        } else {
            this.ui.showError(result.error);
        }
    }

    sellCommodity(commodity) {
        const qtyInput = document.getElementById(`trade-qty-${commodity}`);
        const quantity = parseInt(qtyInput.value) || 0;

        if (quantity <= 0) {
            this.ui.showError('Invalid quantity!');
            return;
        }

        const result = TradingSystem.sell(this.gameState, commodity, quantity, this.currentPlanet);

        if (result.success) {
            this.ui.addMessage(
                `Sold ${result.quantity} ${result.commodity} for ${Utils.format.credits(result.revenue)}`,
                'success'
            );

            this.updateUI();

            // Show vendor response AFTER updateUI (so it doesn't get overwritten)
            setTimeout(() => {
                this.showVendorResponse(
                    this.vendorDialogue.generateSaleResponse(commodity, result.quantity)
                );
            }, 50);
        } else {
            this.ui.showError(result.error);
        }
    }

    dockAtStation(station) {
        this.currentStation = station;
        this.currentLocation = station; // For message board
        this.ui.addMessage(`Docked at ${station.name}${station.class ? ` (${station.icon} ${station.class})` : ''}`, 'info');

        // Switch to docked music and play success sound
        this.audio.playMusic('docked');
        this.audio.playSfx('success');

        // Show station options
        const options = [];

        // Add trade if station has trade service
        if (station.services && station.services.includes('trade')) {
            options.push({ text: '💰 Trade Goods', action: 'trade' });
        }

        // Equipment shop for Industrial and stations with 'upgrade' service
        if (station.services && (station.services.includes('upgrade') || station.class === 'Industrial' || station.class === 'Mining')) {
            options.push({ text: '🛠️ Equipment Shop', action: 'equipment' });
        }

        options.push({ text: '📋 Message Board', action: 'messageboard' });
        options.push({ text: '🔧 Repair Hull', action: 'repair' });
        options.push({ text: '⛽ Refuel', action: 'refuel' });
        options.push({ text: '🚪 Undock', action: 'undock' });

        let html = '<div style="margin-top: 20px;"><strong>Station Services:</strong></div>';
        if (station.description) {
            html += `<p style="color: #888; font-style: italic; margin: 10px 0;">${station.description}</p>`;
        }
        options.forEach(opt => {
            html += `<button onclick="window.game.stationAction('${opt.action}')" style="margin: 5px;">${opt.text}</button>`;
        });

        const sectorInfo = document.getElementById('sector-info');
        const serviceDiv = document.createElement('div');
        serviceDiv.innerHTML = html;
        serviceDiv.style.cssText = 'background: var(--bg-medium); border: 2px solid var(--accent-green); padding: 20px; margin: 20px 0; border-radius: 8px;';
        sectorInfo.insertBefore(serviceDiv, sectorInfo.firstChild);
    }

    async stationAction(action) {
        if (action === 'trade') {
            // Use the station for trading
            this.currentPlanet = this.currentStation; // Trading uses currentPlanet
            this.currentLocation = this.currentStation;
            this.ui.showView('trade');
            this.updateUI();
        } else if (action === 'messageboard') {
            this.messageBoardHandlers.showMessageBoard();
        } else if (action === 'repair') {
            const ship = this.gameState.gameData.ship;
            const hullNeeded = ship.hullMax - ship.hull;
            const cost = hullNeeded * this.currentStation.repairCost;

            if (cost > this.gameState.gameData.credits) {
                this.ui.showError('Not enough credits for full repair!');
                return;
            }

            this.gameState.repairShip(hullNeeded, 0);
            this.gameState.modifyCredits(-cost);
            this.ui.addMessage(`Ship repaired for ${Utils.format.credits(cost)}`, 'success');
            this.audio.playSfx('success');
            this.updateUI();
        } else if (action === 'refuel') {
            const ship = this.gameState.gameData.ship;
            const fuelNeeded = ship.fuelMax - ship.fuel;
            const cost = fuelNeeded * this.currentStation.refuelCost;

            if (cost > this.gameState.gameData.credits) {
                this.ui.showError('Not enough credits for full refuel!');
                this.audio.playSfx('error');
                return;
            }

            ship.fuel = ship.fuelMax;
            this.gameState.modifyCredits(-cost);
            await this.gameState.save();
            this.ui.addMessage(`Ship refueled for ${Utils.format.credits(cost)}`, 'success');
            this.audio.playSfx('success');
            this.updateUI();
        } else if (action === 'undock') {
            this.currentStation = null;
            this.currentLocation = null;
            this.audio.playMusic('exploration');
            this.updateUI();
        } else if (action === 'equipment') {
            this.showEquipmentShop();
        }
    }

    showEquipmentShop() {
        const station = this.currentStation;
        if (!station) return;

        // Mining equipment available
        const miningEquipment = this.mining.EQUIPMENT;
        const currentEquipment = this.gameState.gameData.ship.equipment?.miningLaser;
        const credits = this.gameState.gameData.credits;

        let html = `
            <div style="background: var(--bg-medium); border: 2px solid var(--accent-blue); padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="color: var(--accent-blue); margin-bottom: 15px;">⛏️ Mining Equipment</h3>
                <p style="color: var(--text-secondary); margin-bottom: 15px;">
                    Current: ${currentEquipment ? currentEquipment.name : 'None installed'}
                </p>
        `;

        for (const [key, equip] of Object.entries(miningEquipment)) {
            const owned = currentEquipment && currentEquipment.name === equip.name;
            const canAfford = credits >= equip.price;
            const buttonStyle = owned ? 'background: #666; cursor: default;' :
                canAfford ? 'background: var(--accent-green);' : 'background: #666; cursor: not-allowed;';
            const buttonText = owned ? '✓ Installed' : canAfford ? 'Buy' : 'Insufficient Credits';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 10px 0; background: rgba(0,0,0,0.3); border-radius: 4px;">
                    <div>
                        <strong style="color: var(--accent-yellow);">${equip.name}</strong>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">
                            Level ${equip.level} - ${equip.level === 1 ? '1x' : equip.level === 2 ? '1.5x' : '2x'} ore yield
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--accent-green); margin-bottom: 5px;">${Utils.format.credits(equip.price)}</div>
                        <button onclick="window.game.buyMiningEquipment('${key}')" 
                                style="${buttonStyle} padding: 5px 15px; border: none; border-radius: 4px; color: white;"
                                ${owned || !canAfford ? 'disabled' : ''}>
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `;
        }

        html += `
                <button onclick="window.game.closeEquipmentShop()" style="margin-top: 15px; padding: 10px 20px;">
                    Close Shop
                </button>
            </div>
        `;

        const sectorInfo = document.getElementById('sector-info');
        const shopDiv = document.createElement('div');
        shopDiv.id = 'equipment-shop';
        shopDiv.innerHTML = html;
        sectorInfo.insertBefore(shopDiv, sectorInfo.firstChild);
    }

    buyMiningEquipment(equipmentKey) {
        const result = this.mining.purchaseMiningEquipment(equipmentKey);
        if (result.success) {
            this.ui.addMessage(`Purchased ${result.equipment}!`, 'success');
            this.audio.playSfx('success');
            this.closeEquipmentShop();
            this.showEquipmentShop(); // Refresh the shop
        } else {
            this.ui.showError(result.error);
            this.audio.playSfx('error');
        }
    }

    closeEquipmentShop() {
        const shop = document.getElementById('equipment-shop');
        if (shop) shop.remove();
    }

    startCombat(enemy) {
        this.combat.startCombat(this.gameState.gameData.ship, enemy);
        this.ui.showView('combat');
        this.audio.playMusic('combat');
        this.audio.playSfx('alert');
        this.updateUI();
    }

    /**
     * Start the pirate combat minigame
     * @param {number} strength - Pirate strength (1-3)
     * @param {Function} onComplete - Optional callback when minigame finishes
     */
    startPirateCombat(strength = 1, onComplete = null) {
        console.log(`🏴‍☠️ Starting pirate combat minigame (strength: ${strength})`);

        this.pirateMinigame.start(strength, async (results) => {
            console.log('🏴‍☠️ Pirate combat results:', results);

            const gameData = this.gameState.gameData;

            if (results.victory) {
                // Player won - collect loot
                this.ui.addMessage('🏴‍☠️ Pirates defeated!', 'success');

                // Add loot to cargo
                if (results.loot && results.loot.length > 0) {
                    for (const item of results.loot) {
                        const cargoType = item.name === 'Ore' || item.name === 'Equipment' ||
                            item.name === 'Fuel Cells' || item.name === 'Spare Parts'
                            ? item.name : 'Equipment';

                        if (!gameData.cargo) gameData.cargo = {};
                        gameData.cargo[cargoType] = (gameData.cargo[cargoType] || 0) + item.amount;
                        this.ui.addMessage(`📦 Salvaged ${item.amount} ${item.name}`, 'success');
                    }
                }

                // Random credit bonus
                const credits = Math.floor(Math.random() * 300 + 100) * strength;
                gameData.credits += credits;
                this.ui.addMessage(`💰 Looted ${credits} credits from pirate wreckage`, 'success');

                // Apply hull damage taken during fight
                if (results.hullDamage > 0) {
                    gameData.ship.hull = Math.max(0, gameData.ship.hull - results.hullDamage);
                    this.ui.addMessage(`⚠️ Hull damage: -${results.hullDamage}%`, 'warning');
                }

                this.audio.playMusic('exploration');
            } else {
                // Player lost - pirates take cargo
                this.ui.addMessage('💀 Ship disabled! Pirates ransack your cargo holds...', 'error');

                // Lose percentage of cargo
                if (gameData.cargo) {
                    for (const [item, qty] of Object.entries(gameData.cargo)) {
                        const lost = Math.floor(qty * 0.5);
                        if (lost > 0) {
                            gameData.cargo[item] = qty - lost;
                            this.ui.addMessage(`📦 Lost ${lost} ${item}`, 'error');
                        }
                        if (gameData.cargo[item] <= 0) {
                            delete gameData.cargo[item];
                        }
                    }
                }

                // Lose credits
                const lostCredits = Math.floor(gameData.credits * 0.3);
                gameData.credits -= lostCredits;
                if (lostCredits > 0) {
                    this.ui.addMessage(`💰 Pirates stole ${lostCredits} credits`, 'error');
                }

                // Heavy hull damage
                gameData.ship.hull = Math.max(5, gameData.ship.hull - results.hullDamage);
                this.ui.addMessage(`⚠️ Hull damage: -${results.hullDamage}%`, 'warning');

                this.audio.playMusic('exploration');
            }

            // Check if ship destroyed
            if (gameData.ship.hull <= 0) {
                this.ui.addMessage('💀 Your ship has been destroyed!', 'error');
                // TODO: Game over handling
            }

            await this.gameState.save();
            this.updateUI();

            // Call completion callback (e.g., to resume route planner)
            if (onComplete) {
                onComplete(results);
            }
        });
    }

    async combatAttack() {
        this.audio.playSfx('laser');
        const result = this.combat.playerAttack(this.gameState.gameData.ship);

        if (result.playerDestroyed) {
            this.ui.addMessage('Your ship was destroyed!', 'error');
            this.audio.playSfx('explosion');
            this.gameOver();
            return;
        }

        if (result.victory) {
            const enemy = this.combat.endCombat();
            const rewards = this.combat.calculateRewards(enemy, this.gameState.gameData.ship);

            this.gameState.modifyCredits(rewards.credits);
            this.gameState.updateStat('combatsWon', 1);

            this.audio.playSfx('explosion');
            setTimeout(() => this.audio.playSfx('success'), 1000);
            this.audio.playMusic('exploration');

            for (const [commodity, qty] of Object.entries(rewards.cargo)) {
                this.gameState.addCargo(commodity, qty);
            }

            this.ui.addMessage(`Victory! Earned ${Utils.format.credits(rewards.credits)}`, 'success');
            this.ui.showView('sector');
        }

        await this.gameState.save();
        this.updateUI();
    }

    async combatFlee() {
        const result = this.combat.attemptFlee(this.gameState.gameData.ship);

        if (result.escaped) {
            this.ui.showView('sector');
            this.ui.addMessage('Escaped from combat!', 'success');
        } else if (result.playerDestroyed) {
            this.ui.addMessage('Your ship was destroyed while fleeing!', 'error');
            this.gameOver();
            return;
        }

        await this.gameState.save();
        this.updateUI();
    }

    gameOver() {
        this.ui.showError('GAME OVER - Your ship was destroyed!');
        setTimeout(() => {
            if (confirm('Create a new character?')) {
                Utils.storage.remove(`player_${this.gameState.currentUser}`);
                this.ui.showAuthForm('character-creation');
                this.characterCustomization.initializeCharacterCreation();
                this.ui.showScreen('auth');
            } else {
                this.handleLogout();
            }
        }, 1000);
    }



    // Admin functions
    handleAdminLogin() {
        // Show the admin login form instead of using prompt()
        this.ui.showAuthForm('admin-login');
    }


    async handleAdminLoginSubmit() {
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;

        if (!username || !password) {
            this.ui.showError('Please enter admin credentials');
            return;
        }

        console.log('🔑 Attempting admin login for:', username);
        const result = await this.auth.login(username, password);
        console.log('📝 Login result:', result);

        if (!result.success) {
            this.ui.showError(result.error || 'Invalid admin credentials');
            return;
        }

        // Check if user is actually admin using the is_admin flag from server
        const currentUser = this.auth.getCurrentUser();
        console.log('👤 Current user after login:', currentUser);
        console.log('🔐 Is admin?', this.auth.isAdmin(username));

        /*
        // TEMPORARILY DISABLED: Client-side check causing false negatives.
        // Server endpoints enforce admin permissions securely.
        if (!this.auth.isAdmin(username)) {
            this.ui.showError('Access denied: Not an admin account');
            this.auth.logout(); // Log them out since they're not admin
            return;
        }
        */

        // Login successful - show admin screen
        console.log('✅ Admin login successful');
        this.gameState.setCurrentUser(username);

        this.ui.showScreen('admin');
        this.admin = new AdminPanel(this.gameState, this.galaxy);

        // Initialize admin dashboard
        this.ui.showAdminPanel('dashboard');
        this.refreshAdminDashboard();

        // Clear form fields
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
    }


    async refreshAdminDashboard() {
        if (!this.admin) return;

        const stats = document.getElementById('admin-dashboard-stats');

        // Fetch stats from server
        try {
            const response = await fetch('/api/adastra/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${this.auth.token || ''}`
                }
            });
            const data = await response.json();

            const galaxySize = this.galaxy.data?.size || 100;

            stats.innerHTML = `
                <div class="stat-card">
                    <h3>Total Players</h3>
                    <div class="value">${data.totalPlayers || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Active Sessions</h3>
                    <div class="value">${data.activeSessions || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Galaxy Size</h3>
                    <div class="value">${galaxySize} sectors</div>
                </div>
                <div class="stat-card">
                    <h3>Server Time</h3>
                    <div class="value">${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to fetch admin stats:', error);
            stats.innerHTML = '<p style="color: #f87171;">Failed to load dashboard stats</p>';
        }
    }

    handleAdminEditPlayer(username) {
        const player = this.admin.getPlayer(username);
        if (player) {
            this.ui.showAdminPlayerModal(player);
        }
    }

    handleAdminDeletePlayer(username) {
        if (confirm(`Are you sure you want to delete player ${username}? This cannot be undone.`)) {
            const result = this.admin.deletePlayer(username);
            if (result.success) {
                this.ui.showSuccess('Player deleted successfully');
                this.refreshAdminPlayers();
            } else {
                this.ui.showError(result.error);
            }
        }
    }

    async handleAdminSavePlayer() {
        const username = document.getElementById('edit-player-username').value;
        const updates = {
            credits: parseInt(document.getElementById('edit-player-credits').value),
            turns: parseInt(document.getElementById('edit-player-turns').value),
            hull: parseInt(document.getElementById('edit-player-hull').value),
            fuel: parseInt(document.getElementById('edit-player-fuel').value),
            sector: parseInt(document.getElementById('edit-player-sector').value)
        };

        const result = await this.admin.updatePlayer(username, updates);
        if (result.success) {
            this.ui.showSuccess('Player updated successfully');
            this.ui.hideAdminPlayerModal();
            this.refreshAdminPlayers();
        } else {
            this.ui.showError(result.error || 'Failed to update player');
        }
    }

    async refreshAdminPlayers() {
        const players = await this.admin.getAllPlayers();
        const searchTerm = document.getElementById('admin-player-search')?.value?.toLowerCase() || '';

        const filtered = players.filter(p =>
            p.username.toLowerCase().includes(searchTerm) ||
            p.pilotName.toLowerCase().includes(searchTerm)
        );

        this.ui.renderAdminPlayers(filtered);

        if (filtered.length === 0 && searchTerm) {
            this.ui.showError('No players found matching search');
        }
    }

    async handleAdminGenerateGalaxy() {
        const sizeInput = parseInt(document.getElementById('admin-galaxy-size').value);

        // Uses NEW UI Confirm
        const confirmed = await this.ui.showConfirm(
            'Generate New Galaxy?',
            `Are you sure you want to generate a new galaxy with ${sizeInput} sectors?\n\nThis will RESET all player positions and progress!`
        );

        if (!confirmed) return;

        // Show loading
        this.ui.showLoading('Generating Galaxy...');

        // Slight artificial delay so they see the spinner
        await new Promise(r => setTimeout(r, 1000));

        // Pass true to skip inner confirm
        const result = await this.admin.generateGalaxy(sizeInput, true);

        this.ui.hideLoading();

        if (result.success) {
            // VERIFICATION STEP: Check if galaxy size actually matches
            const currentSize = this.galaxy.data?.size;

            if (currentSize === sizeInput) {
                // NEW UI Success Modal with Buttons
                this.ui.showCustomModal(
                    'Galaxy Generated',
                    `✅ Success!\n\nThe galaxy has been regenerated with ${currentSize} sectors.\nAll players have been reset to Sector 1.`
                );
                this.refreshAdminDashboard();
                return;
            } else {
                this.ui.showCustomModal('Warning', `⚠️ Galaxy generation reported success, but size mismatch. Expected ${sizeInput}, got ${currentSize}. Please retry.`);
            }
        } else {
            this.ui.showCustomModal('Error', `Error: ${result.error}`);
        }
    }

    handleAdminUpdateSettings() {
        const turnsPerDay = parseInt(document.getElementById('admin-turns-per-day').value);
        const result = this.admin.updateSettings({ turnsPerDay });

        if (result.success) {
            this.ui.showCustomModal('Settings Saved', '✅ Game settings have been updated successfully.');
            this.refreshAdminDashboard();
        } else {
            this.ui.showCustomModal('Error', `Error: ${result.errors.join(', ')}`);
        }
    }

    async handleAdminRefreshEconomy() {
        const confirmed = await this.ui.showConfirm(
            'Refresh Economy?',
            'This will regenerate commodity prices across the galaxy based on current supply/demand simulations.'
        );
        if (!confirmed) return;

        this.ui.showLoading('Updating Economy...');
        await new Promise(r => setTimeout(r, 800)); // Visual delay

        const result = this.admin.refreshEconomy();

        this.ui.hideLoading();

        if (result.success) {
            this.ui.showCustomModal('Economy Updated', `✅ ${result.message}`);
        } else {
            this.ui.showCustomModal('Error', 'Failed to refresh economy');
        }
    }

    // ===== MESSAGE BOARD METHODS =====

    // ===== COMPUTER INTERFACE METHODS =====

    showComputer() {
        this.ui.showView('computer');

        // Load computer data for current user
        this.computer.load(this.gameState.currentUser);

        // Display current sector intel by default
        this.displayCurrentSectorIntel();

        // Refresh all computer displays
        this.refreshComputerDisplays();
    }

    switchComputerTab(tabName) {
        this.currentComputerTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.comp-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`comp-nav-${tabName}`).classList.add('active');

        // Update panels
        document.querySelectorAll('.comp-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`comp-${tabName}`).classList.add('active');

        // Refresh the active panel
        this.refreshComputerDisplays();
    }

    refreshComputerDisplays() {
        const tab = this.currentComputerTab;

        if (tab === 'navigation') {
            // Navigation panel is interactive, no auto-refresh needed
        } else if (tab === 'intel') {
            this.displayCurrentSectorIntel();
        } else if (tab === 'bookmarks') {
            this.displayBookmarks();
            this.displayNotes();
        } else if (tab === 'fighters') {
            this.displayFighterSummary();
        } else if (tab === 'colonies') {
            this.displayColonies();
            this.displayColonyStats();
        }
    }

    // Navigation Computer Methods
    calculateRoute() {
        const destSector = parseInt(document.getElementById('nav-dest-sector').value);

        if (!destSector || isNaN(destSector)) {
            this.ui.showError('Please enter a valid sector ID');
            return;
        }

        const currentSector = this.gameState.gameData.currentSector;
        const route = this.navigation.calculateRoute(currentSector, destSector, this.gameState.gameData.ship);

        const display = document.getElementById('nav-route-display');

        if (!route.success) {
            display.innerHTML = `<div class="route-info"><p style="color: #ff4444;">❌ ${route.error}</p></div>`;
            return;
        }

        const canAfford = route.canAfford ? '✅ Sufficient fuel' : '❌ Insufficient fuel';
        const pathStr = route.path.join(' → ');

        display.innerHTML = `
            <div class="route-info">
                <h5>Route Found!</h5>
                <p><strong>Jumps:</strong> ${route.jumps}</p>
                <p><strong>Distance:</strong> ${route.totalDistance} units</p>
                <p><strong>Fuel Needed:</strong> ${route.fuelNeeded} units ${canAfford}</p>
                <p><strong>Turns Required:</strong> ${route.turns}</p>
                <div class="route-path">${pathStr}</div>
            </div>
        `;

        this.audio.playSfx('success');
    }

    findNearest(type) {
        const currentSector = this.gameState.gameData.currentSector;
        let result;

        if (type === 'planet') {
            result = this.navigation.findNearest(currentSector, 'planet');
        } else if (type === 'station') {
            result = this.navigation.findNearest(currentSector, 'station');
        } else if (type === 'military') {
            result = this.navigation.findNearest(currentSector, 'station', { portClass: 'Military' });
        } else if (type === 'blackmarket') {
            result = this.navigation.findNearest(currentSector, 'station', { portClass: 'Black Market' });
        }

        const display = document.getElementById('nav-nearest-display');

        if (!result) {
            display.innerHTML = `<div class="location-info"><p style="color: #ff4444;">❌ No ${type} found</p></div>`;
            return;
        }

        const content = result.content;
        display.innerHTML = `
            <div class="location-info">
                <h5>${content.name || content.class || 'Unknown'}</h5>
                <p><strong>Sector:</strong> ${result.sector.id} (${result.sector.x}, ${result.sector.y})</p>
                <p><strong>Distance:</strong> ${Math.round(result.distance)} units</p>
                <p><strong>Jumps:</strong> ${result.jumps}</p>
                ${content.class ? `<p><strong>Class:</strong> ${content.class}</p>` : ''}
                ${content.planetType ? `<p><strong>Type:</strong> ${content.planetType}</p>` : ''}
                ${content.specialty ? `<p><strong>Specialty:</strong> ${content.specialty}</p>` : ''}
            </div>
        `;

        this.audio.playSfx('success');
    }

    findTradeRoute() {
        const maxJumps = parseInt(document.getElementById('nav-trade-jumps').value) || 10;
        const currentSector = this.gameState.gameData.currentSector;
        const ship = this.gameState.gameData.ship;

        const route = this.navigation.findTradeRoute(currentSector, ship, maxJumps);

        const display = document.getElementById('nav-trade-display');

        if (!route) {
            display.innerHTML = `<div class="trade-info"><p style="color: #ff4444;">❌ No profitable trade routes found within ${maxJumps} jumps</p></div>`;
            return;
        }

        display.innerHTML = `
            <div class="trade-info">
                <h5>Best Trade Route Found!</h5>
                <p><strong>Commodity:</strong> ${route.commodity}</p>
                <p><strong>Buy at:</strong> ${route.buy.planet.name} (Sector ${route.buy.sector.id})</p>
                <p><strong>Buy Price:</strong> ${Utils.format.credits(route.buy.price)} each</p>
                <p><strong>Available:</strong> ${route.buy.available} units</p>
                <p><strong>Sell at:</strong> ${route.sell.planet.name} (Sector ${route.sell.sector.id})</p>
                <p><strong>Sell Price:</strong> ${Utils.format.credits(route.sell.price)} each</p>
                <p><strong>Quantity:</strong> ${route.quantity} units</p>
                <p><strong>Investment:</strong> ${Utils.format.credits(route.investment)}</p>
                <p><strong>Revenue:</strong> ${Utils.format.credits(route.revenue)}</p>
                <p><strong>Profit:</strong> <span style="color: #00ff88; font-weight: bold;">${Utils.format.credits(route.profit)}</span></p>
                <p><strong>Profit Margin:</strong> ${route.profitMargin}%</p>
                <p><strong>Total Jumps:</strong> ${route.totalJumps}</p>
                <p><strong>Profit per Jump:</strong> ${Utils.format.credits(route.profitPerJump)}</p>
            </div>
        `;

        this.audio.playSfx('success');
    }

    // Interactive Vendor Chat
    chatWithVendor() {
        if (!this.vendorDialogue || !this.currentPlanet) return;

        const topics = [
            "Rumors of a hidden pirate base in Sector 8...",
            "They say the price of Ore is skyrocketing on mining colonies.",
            "I saw an Imperial cruiser pass through here yesterday. Stay sharp.",
            "Don't trust the automated navigation systems in the nebula.",
            "My cousin runs a station in the deep rim. Says it's quiet out there.",
            "Have you heard about the Genesis Device? Tints of godhood, they say.",
            "Trade's been slow lately. Pirates are getting bolder.",
            "Watch your back in the anarchy sectors. No laws out there.",
            "I've got a special deal on retro-rockets, but... maybe next time."
        ];

        // Pick random topic
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const fullMessage = `"${randomTopic}"`;

        this.showVendorResponse(fullMessage);
    }

    // Intel Computer Methods
    displayCurrentSectorIntel() {
        const currentSector = this.gameState.gameData.currentSector;
        const analysis = this.navigation.analyzeSector(currentSector);

        const display = document.getElementById('intel-current-display');

        if (!analysis) {
            display.innerHTML = '<p>Unable to analyze current sector</p>';
            return;
        }

        let html = `
            <div class="intel-stat">
                <span class="intel-label">Sector ID:</span>
                <span class="intel-value">${analysis.id}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Warp Connections:</span>
                <span class="intel-value">${analysis.connections}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Contents:</span>
                <span class="intel-value">${analysis.contents.length} objects</span>
            </div>
        `;

        if (analysis.contents.length > 0) {
            html += '<h5 style="color: var(--accent-blue); margin-top: 15px;">Sector Contents:</h5>';
            analysis.contents.forEach(c => {
                html += `
                    <div class="intel-stat">
                        <span class="intel-label">${c.type}: ${c.name || c.class || 'Unknown'}</span>
                        <span class="intel-value">✓</span>
                    </div>
                `;
            });
        }

        html += `
            <h5 style="color: var(--accent-blue); margin-top: 15px;">Nearby (3 jumps):</h5>
            <div class="intel-stat">
                <span class="intel-label">Planets:</span>
                <span class="intel-value">${analysis.nearby.planets}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Stations:</span>
                <span class="intel-value">${analysis.nearby.stations}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Total Sectors:</span>
                <span class="intel-value">${analysis.nearby.total}</span>
            </div>
        `;

        display.innerHTML = html;
    }

    analyzeGalaxy() {
        const analysis = this.computer.analyzeGalaxy(this.galaxy);

        if (!analysis) {
            this.ui.showError('Unable to analyze galaxy');
            return;
        }

        const display = document.getElementById('intel-galaxy-display');

        let html = `
            <h5 style="color: var(--accent-green);">Galaxy Overview</h5>
            <div class="intel-stat">
                <span class="intel-label">Galaxy Size:</span>
                <span class="intel-value">${analysis.size} sectors</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Seed:</span>
                <span class="intel-value">${analysis.seed}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Created:</span>
                <span class="intel-value">${new Date(analysis.created).toLocaleDateString()}</span>
            </div>

            <h5 style="color: var(--accent-green); margin-top: 15px;">Sectors</h5>
            <div class="intel-stat">
                <span class="intel-label">Total:</span>
                <span class="intel-value">${analysis.sectors.total}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">With Content:</span>
                <span class="intel-value">${analysis.sectors.withContent}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Empty:</span>
                <span class="intel-value">${analysis.sectors.empty} (${analysis.sectors.percentEmpty}%)</span>
            </div>

            <h5 style="color: var(--accent-green); margin-top: 15px;">Contents</h5>
            <div class="intel-stat">
                <span class="intel-label">Planets:</span>
                <span class="intel-value">${analysis.contents.planets}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Stations:</span>
                <span class="intel-value">${analysis.contents.stations}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Debris Fields:</span>
                <span class="intel-value">${analysis.contents.debris}</span>
            </div>

            <h5 style="color: var(--accent-green); margin-top: 15px;">Connectivity</h5>
            <div class="intel-stat">
                <span class="intel-label">Average Connections:</span>
                <span class="intel-value">${analysis.connectivity.average}</span>
            </div>
            <div class="intel-stat">
                <span class="intel-label">Min/Max:</span>
                <span class="intel-value">${analysis.connectivity.min} / ${analysis.connectivity.max}</span>
            </div>
        `;

        display.innerHTML = html;
        this.audio.playSfx('success');
    }

    // Bookmarks Methods
    displayBookmarks() {
        const bookmarks = this.computer.bookmarks;
        const display = document.getElementById('bookmark-display');

        if (bookmarks.length === 0) {
            display.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No bookmarks yet</p>';
            return;
        }

        let html = '';
        bookmarks.forEach(bookmark => {
            html += `
                <div class="bookmark-item" data-bookmark-id="${bookmark.id}">
                    <button class="bookmark-remove" onclick="window.game.removeBookmark('${bookmark.id}')">✕</button>
                    <div class="bookmark-name">${bookmark.name}</div>
                    <div class="bookmark-sector">Sector ${bookmark.sectorId}</div>
                    ${bookmark.notes ? `<div class="bookmark-notes">${bookmark.notes}</div>` : ''}
                    <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">
                        Added ${new Date(bookmark.created).toLocaleDateString()}
                    </div>
                </div>
            `;
        });

        display.innerHTML = html;
    }

    addBookmark() {
        const sectorId = parseInt(document.getElementById('bookmark-sector').value);
        const name = document.getElementById('bookmark-name').value.trim();
        const notes = document.getElementById('bookmark-notes').value.trim();

        if (!sectorId || isNaN(sectorId)) {
            this.ui.showError('Please enter a valid sector ID');
            return;
        }

        if (!name) {
            this.ui.showError('Please enter a bookmark name');
            return;
        }

        this.computer.addBookmark(sectorId, name, notes);
        this.computer.save(this.gameState.currentUser);

        this.ui.addMessage(`Bookmark "${name}" created for Sector ${sectorId}`, 'success');
        this.audio.playSfx('success');

        // Clear form
        document.getElementById('bookmark-sector').value = '';
        document.getElementById('bookmark-name').value = '';
        document.getElementById('bookmark-notes').value = '';

        this.displayBookmarks();
    }

    removeBookmark(bookmarkId) {
        if (!confirm('Remove this bookmark?')) return;

        this.computer.removeBookmark(bookmarkId);
        this.computer.save(this.gameState.currentUser);

        this.ui.addMessage('Bookmark removed', 'info');
        this.displayBookmarks();
    }

    displayNotes() {
        const currentSector = this.gameState.gameData.currentSector;
        const notes = this.computer.getNotes(currentSector);

        const display = document.getElementById('notes-display');

        if (notes.length === 0) {
            display.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No notes for current sector</p>';
            return;
        }

        let html = `<h5 style="color: var(--accent-blue); margin-bottom: 10px;">Sector ${currentSector} Notes:</h5>`;
        notes.forEach(note => {
            html += `
                <div class="note-item">
                    <div class="note-text">${note.text}</div>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">
                        ${new Date(note.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
        });

        display.innerHTML = html;
    }

    // Fighter Methods
    async deployFighters() {
        const quantity = parseInt(document.getElementById('fighter-quantity').value);

        if (!quantity || quantity <= 0) {
            this.ui.showError('Please enter a valid quantity');
            return;
        }

        const sectorId = this.gameState.gameData.currentSector;
        const owner = this.gameState.gameData.name;
        const credits = this.gameState.gameData.credits;

        const result = this.fighters.deployFighters(sectorId, owner, quantity, credits);

        if (result.success) {
            this.gameState.gameData.credits -= result.cost;
            await this.gameState.save();
            this.updateUI();

            this.ui.addMessage(`Deployed ${result.deployed} fighters in Sector ${sectorId} for ${Utils.format.credits(result.cost)}`, 'success');
            this.audio.playSfx('success');

            this.displayFighterSummary();
        } else {
            this.ui.showError(result.error);
        }
    }

    async deployMines() {
        const quantity = parseInt(document.getElementById('mine-quantity').value);

        if (!quantity || quantity <= 0) {
            this.ui.showError('Please enter a valid quantity');
            return;
        }

        const sectorId = this.gameState.gameData.currentSector;
        const owner = this.gameState.gameData.name;
        const credits = this.gameState.gameData.credits;

        const result = this.fighters.deployMines(sectorId, owner, quantity, credits);

        if (result.success) {
            this.gameState.gameData.credits -= result.cost;
            await this.gameState.save();
            this.updateUI();

            this.ui.addMessage(`Deployed ${result.deployed} mines in Sector ${sectorId} for ${Utils.format.credits(result.cost)}`, 'success');
            this.audio.playSfx('success');

            this.displayFighterSummary();
        } else {
            this.ui.showError(result.error);
        }
    }

    refreshFighters() {
        this.displayFighterSummary();
        this.ui.addMessage('Fighter deployments refreshed', 'info');
    }

    updateFighterOrders(sectorId, mode) {
        const owner = this.gameState.gameData.name;
        let toll = 0;

        if (mode === 'toll') {
            const input = document.getElementById(`toll-input-${sectorId}`);
            toll = input ? parseInt(input.value) : 0;
            if (toll < 0) toll = 0;
        }

        const result = this.fighters.updateOrders(sectorId, owner, mode, toll);

        if (result.success) {
            this.ui.addMessage(`Fighter orders updated for Sector ${sectorId}: ${mode.toUpperCase()} ${mode === 'toll' ? toll + 'cr' : ''}`, 'success');
            this.audio.playSfx('click');
            this.displayFighterSummary();
        } else {
            this.ui.showError(result.error);
        }
    }

    displayFighterSummary() {
        const playerName = this.gameState.gameData.name;
        const summary = this.fighters.getPlayerFighterSummary(playerName);

        const display = document.getElementById('fighter-display');

        if (summary.totalFighters === 0 && summary.totalMines === 0) {
            display.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No fighters or mines deployed</p>';
            return;
        }

        let html = `
            <div style="padding: 15px; background: var(--bg-medium); border-radius: 4px; margin-bottom: 15px;">
                <h5 style="color: var(--accent-green);">Total Deployments</h5>
                <p><strong>Fighters:</strong> ${summary.totalFighters} (${Utils.format.credits(summary.totalFighters * this.fighters.FIGHTER_COST)} value)</p>
                <p><strong>Mines:</strong> ${summary.totalMines} (${Utils.format.credits(summary.totalMines * this.fighters.MINE_COST)} value)</p>
                <p><strong>Total Value:</strong> ${Utils.format.credits(summary.totalValue)}</p>
            </div>
            <h5 style="color: var(--accent-blue);">Deployment Locations</h5>
        `;

        summary.locations.forEach(loc => {
            // Determine current mode display
            const isToll = loc.mode === 'toll';
            const modeDisplay = isToll ? `<span style="color: gold;">TOLL: ${loc.toll}cr</span>` : '<span style="color: red;">ATTACK</span>';

            html += `
                <div class="fighter-location">
                    <div class="fighter-location-info">
                        <div class="fighter-location-sector">Sector ${loc.sectorId}</div>
                        <div class="fighter-location-counts">
                            Fighters: ${loc.fighters} | Mines: ${loc.mines}
                        </div>
                        <div class="fighter-location-mode" style="font-size: 0.9em; margin-top: 5px;">
                            ${modeDisplay}
                        </div>
                    </div>
                    <div class="fighter-location-actions" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">
                        <div style="display: flex; gap: 5px; align-items: center;">
                            <input type="number" id="toll-input-${loc.sectorId}" placeholder="Toll" value="${loc.toll || 0}" style="width: 60px; background: rgba(0,0,0,0.5); border: 1px solid #444; color: white; padding: 2px;">
                            <button class="btn-sm" onclick="window.game.updateFighterOrders(${loc.sectorId}, 'toll')">Set Toll</button>
                            <button class="btn-sm btn-danger" onclick="window.game.updateFighterOrders(${loc.sectorId}, 'attack')">Set Attack</button>
                        </div>
                    </div>
                </div>
            `;
        });

        display.innerHTML = html;
    }

    // Colony Methods
    async launchGenesis() {
        const sectorId = this.gameState.gameData.currentSector;
        const owner = this.gameState.currentUser;
        const pilotName = this.gameState.gameData.name;
        const credits = this.gameState.gameData.credits;

        const result = this.colonization.createColony(this.galaxy, sectorId, owner, pilotName, credits);

        if (result.success) {
            this.gameState.gameData.credits -= result.cost;
            await this.gameState.save();
            this.updateUI();

            this.ui.addMessage(`Genesis torpedo launched! Created ${result.colony.planetName} in Sector ${sectorId}`, 'success');
            this.audio.playSfx('success');

            // Refresh sector view to show new planet
            if (this.ui.currentView === 'sector') {
                const sector = this.gameState.getCurrentSector();
                this.ui.displaySector(sector, this.gameState);
            }

            this.displayColonies();
            this.displayColonyStats();
        } else {
            this.ui.showError(result.error);
        }
    }

    refreshColonies() {
        this.displayColonies();
        this.displayColonyStats();
        this.ui.addMessage('Colony data refreshed', 'info');
    }

    displayColonies() {
        const owner = this.gameState.currentUser;
        const colonies = this.colonization.getPlayerColonies(owner);

        const display = document.getElementById('colony-display');

        if (colonies.length === 0) {
            display.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No colonies established yet</p>';
            return;
        }

        let html = '';

        colonies.forEach(colony => {
            const pendingIncome = this.colonization.getPendingIncome(owner);
            const timeSince = Date.now() - colony.lastCollection;
            const daysElapsed = (timeSince / (24 * 60 * 60 * 1000)).toFixed(2);

            html += `
                <div class="colony-item">
                    <div class="colony-header">
                        <div class="colony-name">${colony.planetName}</div>
                        <div class="colony-level">Level ${colony.level}</div>
                    </div>
                    <div class="colony-info">
                        <div class="colony-stat">
                            <div class="colony-stat-label">Sector</div>
                            <div class="colony-stat-value">${colony.sectorId}</div>
                        </div>
                        <div class="colony-stat">
                            <div class="colony-stat-label">Population</div>
                            <div class="colony-stat-value">${Utils.format.number(colony.population)}</div>
                        </div>
                        <div class="colony-stat">
                            <div class="colony-stat-label">Income/Day</div>
                            <div class="colony-stat-value">${Utils.format.credits(colony.income)}</div>
                        </div>
                        <div class="colony-stat">
                            <div class="colony-stat-label">Total Earned</div>
                            <div class="colony-stat-value">${Utils.format.credits(colony.totalEarned)}</div>
                        </div>
                        <div class="colony-stat">
                            <div class="colony-stat-label">Days Since Collection</div>
                            <div class="colony-stat-value">${daysElapsed}</div>
                        </div>
                    </div>
                    <div class="colony-actions">
                        <button onclick="window.game.collectColonyIncome('${colony.id}')">
                            Collect Income
                        </button>
                        <button class="upgrade" onclick="window.game.upgradeColony('${colony.id}', 'income')">
                            Upgrade Income
                        </button>
                        <button class="upgrade" onclick="window.game.upgradeColony('${colony.id}', 'population')">
                            Upgrade Population
                        </button>
                        <button class="upgrade" onclick="window.game.upgradeColony('${colony.id}', 'production')">
                            Upgrade Production
                        </button>
                        <button class="upgrade" onclick="window.game.upgradeColony('${colony.id}', 'defense')">
                            Upgrade Defense
                        </button>
                    </div>
                </div>
            `;
        });

        display.innerHTML = html;
    }

    async collectColonyIncome(colonyId) {
        const owner = this.gameState.currentUser;
        const result = this.colonization.collectIncome(colonyId, owner);

        if (result.success) {
            this.gameState.gameData.credits += result.income;
            await this.gameState.save();
            this.updateUI();

            this.ui.addMessage(`Collected ${Utils.format.credits(result.income)} from colony (${result.daysElapsed} days)`, 'success');
            this.audio.playSfx('success');

            this.displayColonies();
            this.displayColonyStats();
        } else {
            this.ui.showError(result.error);
        }
    }

    async collectAllIncome() {
        const owner = this.gameState.currentUser;
        const result = this.colonization.collectAllIncome(owner);

        if (result.success) {
            this.gameState.gameData.credits += result.totalIncome;
            await this.gameState.save();
            this.updateUI();

            this.ui.addMessage(`Collected ${Utils.format.credits(result.totalIncome)} from ${result.coloniesCollected} colonies`, 'success');
            this.audio.playSfx('success');

            this.displayColonies();
            this.displayColonyStats();
        } else {
            this.ui.showError('No income available to collect');
        }
    }

    async upgradeColony(colonyId, upgradeType) {
        const owner = this.gameState.currentUser;
        const credits = this.gameState.gameData.credits;

        const result = this.colonization.upgradeColony(colonyId, owner, upgradeType, credits);

        if (result.success) {
            this.gameState.gameData.credits -= result.cost;
            await this.gameState.save();
            this.updateUI();

            this.ui.addMessage(`Colony upgraded! ${upgradeType} now level ${result.newLevel}`, 'success');
            this.audio.playSfx('success');

            this.displayColonies();
            this.displayColonyStats();
        } else {
            this.ui.showError(result.error);
        }
    }

    displayColonyStats() {
        const owner = this.gameState.currentUser;
        const stats = this.colonization.getColonyStats(owner);

        const display = document.getElementById('colony-stats-display');

        let html = `
            <div class="colony-stats-grid">
                <div class="colony-stats-item">
                    <h5>Colonies</h5>
                    <div class="value">${stats.totalColonies} / ${stats.maxColonies}</div>
                </div>
                <div class="colony-stats-item">
                    <h5>Total Population</h5>
                    <div class="value">${Utils.format.number(stats.totalPopulation)}</div>
                </div>
                <div class="colony-stats-item">
                    <h5>Daily Income</h5>
                    <div class="value">${Utils.format.credits(stats.totalIncome)}</div>
                </div>
                <div class="colony-stats-item">
                    <h5>Pending Income</h5>
                    <div class="value" style="color: var(--accent-green);">${Utils.format.credits(stats.pendingIncome)}</div>
                </div>
                <div class="colony-stats-item">
                    <h5>Total Earned</h5>
                    <div class="value">${Utils.format.credits(stats.totalEarned)}</div>
                </div>
                <div class="colony-stats-item">
                    <h5>Average Level</h5>
                    <div class="value">${stats.averageLevel}</div>
                </div>
            </div>
        `;

        display.innerHTML = html;
    }


}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, creating Game instance...');
        window.game = new Game();
        console.log('Game instance created successfully:', window.game);
    } catch (error) {
        console.error('Failed to initialize game:', error);
        console.error('Error stack:', error.stack);
        alert('Failed to initialize game. Check console for details.');
    }
});