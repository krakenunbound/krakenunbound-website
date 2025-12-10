/**
 * Kraken Arkade - Unified Authentication Library
 * ================================================
 * Shared auth library for all Arkade games.
 * Uses localStorage to persist auth token across games.
 * 
 * Usage:
 *   import { ArkadeAuth } from '/arkade/js/arkade-auth.js';
 *   
 *   if (ArkadeAuth.isLoggedIn()) {
 *     console.log('Welcome,', ArkadeAuth.getUsername());
 *   }
 */

const API_BASE = '/api/arkade';
const TOKEN_KEY = 'arkade_token';
const USER_KEY = 'arkade_user';

export const ArkadeAuth = {
    /**
     * Check if auth is currently bypassed (local testing mode)
     * @returns {Promise<boolean>}
     */
    async checkBypass() {
        try {
            const response = await fetch(`${API_BASE}/auth-status`);
            const data = await response.json();
            return data.bypass === true;
        } catch (e) {
            console.warn('Could not check auth status:', e);
            return false;
        }
    },

    /**
     * Check if user is logged in (has valid token)
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored auth token
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored username
     * @returns {string|null}
     */
    getUsername() {
        return localStorage.getItem(USER_KEY);
    },

    /**
     * Register a new Arkade account
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async register(username, password) {
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_KEY, data.username);
                return { success: true, username: data.username };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (e) {
            return { success: false, error: 'Network error: ' + e.message };
        }
    },

    /**
     * Login to Arkade
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_KEY, data.username);
                return { success: true, username: data.username, is_admin: data.is_admin };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (e) {
            return { success: false, error: 'Network error: ' + e.message };
        }
    },

    /**
     * Verify current token is valid
     * @returns {Promise<{valid: boolean, username?: string}>}
     */
    async verify() {
        const token = this.getToken();
        if (!token) {
            return { valid: false };
        }

        try {
            const response = await fetch(`${API_BASE}/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.valid) {
                // Update stored username in case it changed
                localStorage.setItem(USER_KEY, data.username);
                return { valid: true, username: data.username, is_admin: data.is_admin };
            } else {
                // Token invalid, clear storage
                this.logout();
                return { valid: false };
            }
        } catch (e) {
            console.warn('Token verification failed:', e);
            return { valid: false };
        }
    },

    /**
     * Logout (clear token and notify server)
     */
    async logout() {
        const token = this.getToken();

        // Clear local storage first
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        // Notify server (fire and forget)
        if (token) {
            try {
                await fetch(`${API_BASE}/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                // Ignore logout errors
            }
        }
    },

    /**
     * Get Authorization header for API requests
     * @returns {object}
     */
    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    /**
     * Redirect to Arkade login if not authenticated
     * Call this at the start of games that require auth
     * @param {string} returnUrl - URL to return to after login
     */
    requireAuth(returnUrl = null) {
        if (!this.isLoggedIn()) {
            const redirect = returnUrl || window.location.href;
            window.location.href = `/arkade/?return=${encodeURIComponent(redirect)}`;
            return false;
        }
        return true;
    }
};

export default ArkadeAuth;
