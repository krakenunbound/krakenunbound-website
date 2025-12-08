// Ad Astra - Authentication System (Server-Based)
// Uses Flask API backend for persistent account storage

export class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.apiUrl = 'http://localhost:8000/api';
        
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

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save token
            this.token = data.token;
            localStorage.setItem('authToken', this.token);

            // Load user data
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

            if (!response.ok) {
                // Invalid token
                this.logout();
                return false;
            }

            this.currentUser = await response.json();
            return true;

        } catch (error) {
            console.error('Failed to load user:', error);
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

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Admin login (for sysop access)
    async adminLogin(username, password) {
        // For now, use regular login
        // TODO: Add admin flag to database
        return await this.login(username, password);
    }
}
