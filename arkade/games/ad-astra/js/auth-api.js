// Ad Astra - Authentication System (Server-Based)
// Uses Cloudflare Workers API for persistent account storage

export class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.token = null;
        // Use Cloudflare Workers API - same domain serves both static files and API
        this.apiUrl = 'https://kraken-arkade-api.krakenunbound.workers.dev/api/adastra';
        
        // Load token from localStorage (only for session persistence)
        this.token = localStorage.getItem('authToken');
        
        // Auto-login if we have a token
        if (this.token) {
            this.loadCurrentUser();
        }
    }

    // Register new account
    async register(username, password, pilotName, shipName) {
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    pilotName,
                    shipName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Save token
            this.token = data.token;
            localStorage.setItem('authToken', this.token);

            // Load user data
            await this.loadCurrentUser();

            return { success: true };

        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Login to existing account
    async login(username, password) {
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });

            const data = await response.json();
            console.log('🔐 Server login response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save token
            this.token = data.token;
            localStorage.setItem('authToken', this.token);

            // Store basic user info from login response
            this.currentUser = {
                username: data.username,
                isAdmin: data.is_admin ?? false
            };
            console.log('👤 Stored currentUser:', this.currentUser);

            // Load player data - works for both regular users and admins who also play
            // If no player record exists (admin-only account), that's handled gracefully
            console.log('📦 Loading player data...');
            await this.loadCurrentUser();

            return { success: true };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Load current user data from server
    async loadCurrentUser() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${this.apiUrl}/player`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                // Player record not found
                // For admin-only accounts (no player record), this is expected
                if (this.currentUser?.isAdmin) {
                    console.log('⚠️ Admin account with no player data - that\'s OK');
                    return true; // Admin can still access admin panel
                }
                // For regular users, no player data means invalid state
                console.error('❌ No player data found for non-admin user');
                this.logout();
                return false;
            }

            // Got player data - merge it into currentUser
            console.log('✅ Player data loaded:', Object.keys(data));
            this.currentUser = {
                ...data,
                isAdmin: data.isAdmin ?? data.is_admin ?? false
            };
            return true;

        } catch (error) {
            console.error('Failed to load user:', error);
            // For admin-only accounts (no player record), this is expected
            if (this.currentUser?.isAdmin) {
                console.log('⚠️ Admin account with no player data (caught exception)');
                return true; // Admin can still access admin panel
            }
            return false;
        }
    }

    // Save player data to server
    async savePlayerData(playerData) {
        if (!this.token) {
            console.error('No auth token - cannot save');
            return false;
        }

        try {
            const response = await fetch(`${this.apiUrl}/player`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(playerData)
            });

            const data = await response.json();
            return data.success;

        } catch (error) {
            console.error('Failed to save player data:', error);
            return false;
        }
    }

    // Logout
    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    // Get current auth token
    getToken() {
        return this.token;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is admin
    isAdmin(username) {
        if (!this.currentUser) return false;

        // If a username is provided, ensure it matches
        if (username && this.currentUser.username && username !== this.currentUser.username) {
            return false;
        }

        // Prefer normalized flag
        if (this.currentUser.isAdmin) return true;

        // Fallback to raw server flag if present
        if (typeof this.currentUser.is_admin !== 'undefined') {
            return !!this.currentUser.is_admin;
        }

        return false;
    }

    // Admin login (for sysop access)
    async adminLogin(username, password) {
        // For now, use regular login
        // TODO: Add admin flag to database
        return await this.login(username, password);
    }
}