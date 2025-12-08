// ============================================================================
// KRAKEN ARKADE - SHARED UI MODULE
// Health bars, progress bars, menus, overlays, HUD components
// ============================================================================

const UI = {
    
    // ==================== SCREEN MANAGEMENT ====================
    
    showScreen(id) {
        const screen = document.getElementById(id);
        if (screen) screen.classList.remove('hidden');
    },
    
    hideScreen(id) {
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('hidden');
    },
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    },
    
    toggleScreen(id) {
        const screen = document.getElementById(id);
        if (screen) screen.classList.toggle('hidden');
    },
    
    // ==================== TEXT UPDATES ====================
    
    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },
    
    setHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    },
    
    formatNumber(num) {
        return num.toLocaleString();
    },
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    // ==================== CLASS TOGGLING ====================
    
    addClass(id, className) {
        const el = document.getElementById(id);
        if (el) el.classList.add(className);
    },
    
    removeClass(id, className) {
        const el = document.getElementById(id);
        if (el) el.classList.remove(className);
    },
    
    toggleClass(id, className) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle(className);
    },
    
    // ==================== STYLE UPDATES ====================
    
    setStyle(id, property, value) {
        const el = document.getElementById(id);
        if (el) el.style[property] = value;
    },
    
    setWidth(id, percent) {
        this.setStyle(id, 'width', `${Math.max(0, Math.min(100, percent))}%`);
    },
    
    setHeight(id, percent) {
        this.setStyle(id, 'height', `${Math.max(0, Math.min(100, percent))}%`);
    },
    
    // ==================== HEALTH BAR ====================
    
    updateHealthBar(fillId, percent, thresholds = { low: 25, mid: 50 }) {
        const el = document.getElementById(fillId);
        if (!el) return;
        
        const pct = Math.max(0, Math.min(100, percent));
        el.style.width = pct + '%';
        
        // Color based on health
        if (pct <= thresholds.low) {
            el.style.background = 'linear-gradient(90deg, #f44, #f66)';
        } else if (pct <= thresholds.mid) {
            el.style.background = 'linear-gradient(90deg, #f80, #fa0)';
        } else {
            el.style.background = 'linear-gradient(90deg, #4f4, #6f6)';
        }
        
        // Background position for gradient effect
        el.style.backgroundPosition = (100 - pct) + '% 0';
    },
    
    // ==================== BOSS HEALTH ====================
    
    showBossHealth(containerId, name) {
        this.addClass(containerId, 'visible');
        const nameEl = document.querySelector(`#${containerId} .boss-name`);
        if (nameEl) nameEl.textContent = name;
    },
    
    hideBossHealth(containerId) {
        this.removeClass(containerId, 'visible');
    },
    
    updateBossHealth(fillId, percent) {
        this.setWidth(fillId, Math.max(0, Math.min(100, percent)));
    },
    
    // ==================== POWERUP SLOTS ====================
    
    updatePowerupSlot(slotId, active, timerPercent = 0) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const timer = slot.querySelector('.powerup-timer');
        
        if (active) {
            slot.classList.add('active');
            if (timer) timer.style.width = timerPercent + '%';
        } else {
            slot.classList.remove('active');
            if (timer) timer.style.width = '0%';
        }
    },
    
    // ==================== COMBO DISPLAY ====================
    
    updateCombo(displayId, combo, active) {
        const el = document.getElementById(displayId);
        if (!el) return;
        
        if (active && combo > 1) {
            el.textContent = `COMBO x${combo}`;
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    },
    
    // ==================== DISTANCE/PROGRESS BAR ====================
    
    updateDistanceBar(fillId, percent) {
        this.setHeight(fillId, Math.max(0, Math.min(100, percent)));
    },
    
    // ==================== STATS DISPLAY ====================
    
    updateStats(stats) {
        // Generic stat updater - pass object with { elementId: value }
        for (const [id, value] of Object.entries(stats)) {
            const el = document.getElementById(id);
            if (el) {
                if (typeof value === 'number') {
                    el.textContent = value.toLocaleString();
                } else {
                    el.textContent = value;
                }
            }
        }
    },
    
    // ==================== DANGER FLASH ====================
    
    setDanger(id, isDanger) {
        const el = document.getElementById(id);
        if (!el) return;
        
        if (isDanger) {
            el.classList.add('danger');
        } else {
            el.classList.remove('danger');
        }
    },
    
    // ==================== NOTIFICATIONS ====================
    
    notifications: [],
    
    notify(message, duration = 2000, color = '#0ff') {
        // Create notification element
        const notif = document.createElement('div');
        notif.className = 'game-notification';
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 30px;
            background: rgba(0,0,0,0.8);
            border: 2px solid ${color};
            color: ${color};
            font-family: monospace;
            font-size: 18px;
            text-shadow: 0 0 10px ${color};
            z-index: 1000;
            animation: notifFade ${duration}ms ease-out forwards;
        `;
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.remove();
        }, duration);
    },
    
    // ==================== FLOATING TEXT ====================
    
    floatingTexts: [],
    
    createFloatingText(x, y, text, color = '#fff') {
        this.floatingTexts.push({
            x, y,
            text,
            color,
            life: 1,
            vy: -50
        });
    },
    
    updateFloatingTexts(dt) {
        this.floatingTexts.forEach(ft => {
            ft.y += ft.vy * dt;
            ft.life -= dt;
        });
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    },
    
    drawFloatingTexts(ctx) {
        this.floatingTexts.forEach(ft => {
            ctx.globalAlpha = ft.life;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        });
        ctx.globalAlpha = 1;
    },
    
    // ==================== INIT CSS ====================
    
    injectCSS() {
        if (document.getElementById('arkade-ui-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'arkade-ui-styles';
        style.textContent = `
            @keyframes notifFade {
                0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
            
            .hidden { display: none !important; }
            
            .danger { 
                animation: pulse 0.5s infinite; 
                color: #f44 !important;
                text-shadow: 0 0 10px #f44 !important;
            }
            
            @keyframes pulse { 
                0%, 100% { opacity: 1; } 
                50% { opacity: 0.7; } 
            }
        `;
        document.head.appendChild(style);
    }
};

// Auto-inject CSS on load
if (typeof document !== 'undefined') {
    UI.injectCSS();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
