import { ArkadeAuth } from './arkade-auth.js';

export class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.apiUrl = '/api/adastra';

        // Initial load if token exists
        if (ArkadeAuth.isLoggedIn()) {
            // We can't await here, but main.js calls loadCurrentUser anyway
        }
    }

    // Register new account (Arkade-level only)
    async register(username, password, pilotName, shipName) {
        // We ignore pilotName/shipName here as they are handled by character creation
        const result = await ArkadeAuth.register(username, password);
        if (result.success) {
            await this.loadCurrentUser();
        }
        return result;
    }

    // Login to existing account
    async login(username, password) {
        const result = await ArkadeAuth.login(username, password);
        if (result.success) {
            await this.loadCurrentUser();
        }
        return result;
    }

    // Load current user data from Ad Astra endpoint
    async loadCurrentUser() {
        if (!ArkadeAuth.isLoggedIn()) {
            this.currentUser = null;
            return false;
        }

        const token = ArkadeAuth.getToken();
        const username = ArkadeAuth.getUsername();

        // 1. Check LocalStorage FIRST for cached player data
        // This is critical for preventing the "Character Creation Loop" on refresh
        const cachedData = localStorage.getItem(`player_${username}`);
        if (cachedData) {
            try {
                const gameState = JSON.parse(cachedData);
                // If we have a pilot name and valid gameState, USE IT immediately
                // This bypasses the server fetch latency/failure risk during dev
                if (gameState.pilotName && gameState.pilotName !== 'Unknown') {
                    console.log('✅ Loaded cached player data from localStorage');
                    this.currentUser = {
                        username: username,
                        pilotName: gameState.pilotName,
                        gameState: gameState,
                        isAdmin: false // Can't trust local admin flag, but fine for now
                    };
                    return true;
                }
            } catch (e) {
                console.warn('Failed to parse cached player data', e);
            }
        }

        // 2. Fetch from Server if not found locally
        try {
            const response = await fetch(`${this.apiUrl}/player`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Success - we have full player data
                this.currentUser = {
                    ...data,
                    username: username, // ensure we have username
                    isAdmin: data.is_admin || false
                };

                // Persist to local storage to survive refresh
                localStorage.setItem(`player_${username}`, JSON.stringify(this.currentUser.gameState || {}));

                console.log('✅ Ad Astra Player Loaded:', this.currentUser);
                return true;
            } else {
                // Failed - likely 404 Player Not Found (New Arkade User)
                console.log('⚠️ Player data not found (New User?)');

                // We construct a "partial" user so main.js sees we are logged in
                this.currentUser = {
                    username: username,
                    pilotName: null, // Signals need for creation
                    isAdmin: false
                };
                return true; // Return true so main.js knows we are "Authenticated"
            }
        } catch (error) {
            console.error("Ad Astra Load Error:", error);
            return false;
        }
    }

    // Save player data to server
    async savePlayerData(playerData) {
        if (!ArkadeAuth.isLoggedIn()) return false;

        const token = ArkadeAuth.getToken();
        try {
            const response = await fetch(`${this.apiUrl}/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(playerData)
            });
            const data = await response.json();
            return data.success;
        } catch (e) {
            console.error('Failed to save player data:', e);
            return false;
        }
    }

    // Logout
    logout() {
        ArkadeAuth.logout();
        this.currentUser = null;
    }

    // Check if user is logged in
    isLoggedIn() {
        return ArkadeAuth.isLoggedIn();
    }

    // Get current auth token
    getToken() {
        return ArkadeAuth.getToken();
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is admin
    isAdmin(username) {
        if (!this.currentUser) return false;
        if (username && this.currentUser.username && username !== this.currentUser.username) return false;
        return this.currentUser.isAdmin || this.currentUser.is_admin || false;
    }

    // Admin login (wrapper)
    async adminLogin(username, password) {
        return await this.login(username, password);
    }

    requireAuth(returnUrl) {
        return ArkadeAuth.requireAuth(returnUrl);
    }
}
