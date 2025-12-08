// Ad Astra - Authentication System
// auth.js - User registration, login, and session management

import { Utils } from './utils.js';

export class AuthSystem {
    constructor() {
        this.users = Utils.storage.get('users', {});
    }

    // Register new user
    register(username, password) {
        // Validate username
        const usernameError = Utils.validateUsername(username);
        if (usernameError) {
            return { success: false, error: usernameError };
        }

        // Validate password
        const passwordError = Utils.validatePassword(password);
        if (passwordError) {
            return { success: false, error: passwordError };
        }

        // Check if username exists
        if (this.users[username]) {
            return { success: false, error: 'Username already exists' };
        }

        // Create user account
        this.users[username] = {
            username: username,
            passwordHash: Utils.simpleHash(password),
            created: Date.now(),
            lastLogin: Date.now(),
            isAdmin: false
        };

        // Save to storage
        this.saveUsers();

        return { success: true };
    }

    // Login user
    login(username, password) {
        const user = this.users[username];

        if (!user) {
            return { success: false, error: 'Invalid username or password' };
        }

        const passwordHash = Utils.simpleHash(password);
        if (passwordHash !== user.passwordHash) {
            return { success: false, error: 'Invalid username or password' };
        }

        // Update last login
        user.lastLogin = Date.now();
        this.saveUsers();

        return {
            success: true,
            username: username,
            isAdmin: user.isAdmin
        };
    }

    // Check if user exists
    userExists(username) {
        return !!this.users[username];
    }

    // Check if user has character
    hasCharacter(username) {
        return Utils.storage.has(`player_${username}`);
    }

    // Set user as admin
    setAdmin(username, isAdmin = true) {
        if (!this.users[username]) return false;

        this.users[username].isAdmin = isAdmin;
        this.saveUsers();
        return true;
    }

    // Check if user is admin
    isAdmin(username) {
        return this.users[username]?.isAdmin || false;
    }

    // Delete user account (Admin override)
    adminDeleteAccount(username) {
        if (!this.users[username]) return false;

        delete this.users[username];
        Utils.storage.remove(`player_${username}`);
        this.saveUsers();
        return true;
    }

    // Change password
    changePassword(username, oldPassword, newPassword) {
        const user = this.users[username];

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        const oldPasswordHash = Utils.simpleHash(oldPassword);
        if (oldPasswordHash !== user.passwordHash) {
            return { success: false, error: 'Current password is incorrect' };
        }

        const passwordError = Utils.validatePassword(newPassword);
        if (passwordError) {
            return { success: false, error: passwordError };
        }

        user.passwordHash = Utils.simpleHash(newPassword);
        this.saveUsers();

        return { success: true };
    }

    // Delete user account
    deleteAccount(username, password) {
        const user = this.users[username];

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        const passwordHash = Utils.simpleHash(password);
        if (passwordHash !== user.passwordHash) {
            return { success: false, error: 'Password is incorrect' };
        }

        // Delete user data
        delete this.users[username];
        Utils.storage.remove(`player_${username}`);
        this.saveUsers();

        return { success: true };
    }

    // Get all usernames (admin function)
    getAllUsernames() {
        return Object.keys(this.users);
    }

    // Get user stats (admin function)
    getUserStats(username) {
        const user = this.users[username];
        if (!user) return null;

        const playerData = Utils.storage.get(`player_${username}`);

        return {
            username: user.username,
            created: user.created,
            lastLogin: user.lastLogin,
            isAdmin: user.isAdmin,
            hasCharacter: !!playerData,
            stats: playerData?.stats || null
        };
    }

    // Save users to storage
    saveUsers() {
        Utils.storage.set('users', this.users);
    }

    // Reset all user data (admin function - dangerous!)
    resetAllData() {
        const confirmed = confirm('WARNING: This will delete ALL user data. Are you sure?');
        if (!confirmed) return false;

        const doubleConfirm = confirm('This action cannot be undone. Continue?');
        if (!doubleConfirm) return false;

        Utils.storage.clear();
        this.users = {};
        return true;
    }

    // Create default admin account (for first-time setup)
    createDefaultAdmin() {
        if (!this.users['admin']) {
            this.users['admin'] = {
                username: 'admin',
                passwordHash: Utils.simpleHash('admin123'), // Change this!
                created: Date.now(),
                lastLogin: Date.now(),
                isAdmin: true
            };
            this.saveUsers();
            return true;
        }
        return false;
    }
}

export default AuthSystem;
