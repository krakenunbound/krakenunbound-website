// ============================================================================
// KRAKEN ARKADE - DATABASE CLIENT MODULE
// Fetch wrapper for all API calls
// ============================================================================

const Database = {
    baseUrl: '',  // Empty = same origin
    
    // ==================== HELPER ====================
    
    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(this.baseUrl + endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            return { error: error.message };
        }
    },
    
    async get(endpoint) {
        return this.fetch(endpoint);
    },
    
    async post(endpoint, data) {
        return this.fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async delete(endpoint) {
        return this.fetch(endpoint, { method: 'DELETE' });
    },
    
    // ==================== PLAYER ====================
    
    async getPlayer() {
        return this.get('/api/player');
    },
    
    async setPlayerName(name) {
        return this.post('/api/player', { player_name: name });
    },
    
    async addPlaytime(seconds) {
        return this.post('/api/player/playtime', { seconds });
    },
    
    // ==================== WALLET ====================
    
    async getWallet() {
        return this.get('/api/wallet');
    },
    
    async addCurrency(currencyType, amount, gameId, reason) {
        return this.post('/api/wallet/add', {
            currency_type: currencyType,
            amount,
            game_id: gameId,
            reason
        });
    },
    
    async spendCurrency(currencyType, amount, reason) {
        return this.post('/api/wallet/spend', {
            currency_type: currencyType,
            amount,
            reason
        });
    },
    
    // Convenience methods for each currency
    async addMinerals(amount, gameId = 'asteroid_run', reason = 'collected') {
        return this.addCurrency('minerals', amount, gameId, reason);
    },
    
    async addBiomatter(amount, gameId = 'hive_assault', reason = 'collected') {
        return this.addCurrency('biomatter', amount, gameId, reason);
    },
    
    async addSpecimens(amount, gameId = 'hive_assault', reason = 'collected') {
        return this.addCurrency('specimens', amount, gameId, reason);
    },
    
    async addSalvage(amount, gameId = 'it_lurks_below', reason = 'collected') {
        return this.addCurrency('salvage', amount, gameId, reason);
    },
    
    async addCargo(amount, gameId = 'space_pirates', reason = 'collected') {
        return this.addCurrency('cargo', amount, gameId, reason);
    },
    
    async addCredits(amount, gameId, reason = 'converted') {
        return this.addCurrency('credits', amount, gameId, reason);
    },
    
    // ==================== GAME PROGRESS ====================
    
    async getProgress(gameId) {
        return this.get(`/api/progress/${gameId}`);
    },
    
    async getAllProgress() {
        return this.get('/api/progress');
    },
    
    async updateProgress(gameId, data) {
        return this.post(`/api/progress/${gameId}`, data);
    },
    
    // Convenience: Report end of level/session
    async reportLevelComplete(gameId, data) {
        const { score, minerals, enemies, bossDefeated, level, playtime } = data;
        return this.updateProgress(gameId, {
            current_level: level,
            high_score: score,
            total_score: score,
            minerals_collected: minerals || 0,
            enemies_killed: enemies || 0,
            bosses_defeated: bossDefeated ? 1 : 0,
            playtime: playtime || 0
        });
    },
    
    // ==================== HIGH SCORES ====================
    
    async getHighScores(gameId) {
        return this.get(`/api/highscores/${gameId}`);
    },
    
    async getAllHighScores() {
        return this.get('/api/highscores');
    },
    
    async submitHighScore(gameId, initials, score, levelReached) {
        return this.post(`/api/highscores/${gameId}`, {
            initials,
            score,
            level_reached: levelReached
        });
    },
    
    async isHighScore(gameId, score) {
        const scores = await this.getHighScores(gameId);
        if (scores.error) return true; // Assume yes if error
        if (scores.length < 10) return true;
        return score > scores[scores.length - 1].score;
    },
    
    // ==================== SESSION SAVES ====================
    
    async getSave(gameId) {
        return this.get(`/api/save/${gameId}`);
    },
    
    async saveGame(gameId, saveData) {
        return this.post(`/api/save/${gameId}`, saveData);
    },
    
    async deleteSave(gameId) {
        return this.delete(`/api/save/${gameId}`);
    },
    
    // ==================== STATS ====================
    
    async getFullStats() {
        return this.get('/api/stats');
    },
    
    async getCurrencyLog(gameId = null, limit = 50) {
        let url = `/api/currency-log?limit=${limit}`;
        if (gameId) url += `&game_id=${gameId}`;
        return this.get(url);
    },
    
    // ==================== HEALTH ====================
    
    async healthCheck() {
        return this.get('/api/health');
    },
    
    async isServerOnline() {
        try {
            const result = await this.healthCheck();
            return result.status === 'ok';
        } catch {
            return false;
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}
