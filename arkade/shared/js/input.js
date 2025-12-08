// ============================================================================
// KRAKEN ARKADE - SHARED INPUT MODULE
// Unified keyboard handler with key mapping + mobile touch support
// ============================================================================

const Input = {
    keys: {},
    justPressed: {},
    justReleased: {},
    isTouchDevice: false,
    mobileMenuOpen: false,
    
    // Default key mappings (can be remapped)
    bindings: {
        up: ['ArrowUp', 'KeyW'],
        down: ['ArrowDown', 'KeyS'],
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        fire: ['Space'],
        bomb: ['KeyB'],
        torpedo: ['ControlLeft', 'ControlRight'],
        pause: ['Escape'],
        focus: ['ShiftLeft', 'ShiftRight'],
        quit: ['KeyQ'],
        settings: ['Backquote'],
        debug: ['Backquote']  // Secret debug key
    },
    
    // Callbacks
    onPause: null,
    onQuit: null,
    onSettings: null,
    onDebug: null,
    
    // ==================== INITIALIZATION ====================
    
    init() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        
        // Prevent default for game keys
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        // Detect touch device and add mobile menu
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (this.isTouchDevice) {
            this._createMobileMenu();
        }
    },
    
    // ==================== MOBILE MENU ====================
    
    _createMobileMenu() {
        // Don't create if already exists
        if (document.getElementById('mobile-menu-btn')) return;
        
        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            #mobile-menu-btn {
                position: fixed;
                top: 10px;
                right: 60px;
                width: 44px;
                height: 44px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #0ff;
                border-radius: 8px;
                color: #0ff;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                cursor: pointer;
                touch-action: manipulation;
                user-select: none;
            }
            #mobile-menu-btn:active {
                background: rgba(0, 255, 255, 0.3);
            }
            #mobile-menu-panel {
                position: fixed;
                top: 60px;
                right: 10px;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #0ff;
                border-radius: 12px;
                padding: 10px;
                z-index: 9999;
                display: none;
                flex-direction: column;
                gap: 8px;
                min-width: 140px;
            }
            #mobile-menu-panel.open {
                display: flex;
            }
            .mobile-menu-item {
                background: rgba(0, 255, 255, 0.1);
                border: 1px solid #0ff;
                border-radius: 6px;
                color: #fff;
                padding: 12px 16px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                text-align: center;
                cursor: pointer;
                touch-action: manipulation;
                user-select: none;
            }
            .mobile-menu-item:active {
                background: rgba(0, 255, 255, 0.4);
            }
            .mobile-menu-item.danger {
                border-color: #f55;
                color: #f55;
            }
            
            /* Virtual Controls */
            #touch-controls {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 200px;
                pointer-events: none;
                z-index: 9000;
                display: none;
            }
            #touch-controls.active {
                display: block;
            }
            
            /* D-Pad */
            #touch-dpad {
                position: absolute;
                left: 20px;
                bottom: 20px;
                width: 140px;
                height: 140px;
                pointer-events: auto;
                touch-action: none;
            }
            .dpad-btn {
                position: absolute;
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.15);
                border: 2px solid rgba(0, 255, 255, 0.5);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: rgba(0, 255, 255, 0.7);
                touch-action: none;
                user-select: none;
            }
            .dpad-btn.pressed {
                background: rgba(0, 255, 255, 0.4);
                border-color: #0ff;
                color: #fff;
            }
            #dpad-up { left: 45px; top: 0; }
            #dpad-down { left: 45px; bottom: 0; }
            #dpad-left { left: 0; top: 45px; }
            #dpad-right { right: 0; top: 45px; }
            
            /* Action Buttons */
            #touch-buttons {
                position: absolute;
                right: 20px;
                bottom: 20px;
                width: 140px;
                height: 140px;
                pointer-events: auto;
                touch-action: none;
            }
            .action-btn-touch {
                position: absolute;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-family: 'Courier New', monospace;
                touch-action: none;
                user-select: none;
            }
            .action-btn-touch.pressed {
                transform: scale(0.95);
            }
            #btn-fire {
                width: 80px;
                height: 80px;
                background: rgba(255, 50, 50, 0.3);
                border: 3px solid rgba(255, 100, 100, 0.7);
                color: #ff6666;
                font-size: 14px;
                right: 0;
                bottom: 0;
            }
            #btn-fire.pressed {
                background: rgba(255, 50, 50, 0.6);
                border-color: #ff4444;
                color: #fff;
            }
            #btn-alt {
                width: 55px;
                height: 55px;
                background: rgba(255, 200, 50, 0.3);
                border: 2px solid rgba(255, 200, 100, 0.7);
                color: #ffcc66;
                font-size: 11px;
                left: 0;
                top: 0;
            }
            #btn-alt.pressed {
                background: rgba(255, 200, 50, 0.6);
                border-color: #ffcc44;
                color: #fff;
            }
            
            @media (pointer: fine) {
                #mobile-menu-btn { display: none !important; }
                #mobile-menu-panel { display: none !important; }
                #touch-controls { display: none !important; }
            }
        `;
        document.head.appendChild(style);
        
        // Create menu button
        const btn = document.createElement('div');
        btn.id = 'mobile-menu-btn';
        btn.innerHTML = '☰';
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._toggleMobileMenu();
        });
        document.body.appendChild(btn);
        
        // Create menu panel
        const panel = document.createElement('div');
        panel.id = 'mobile-menu-panel';
        panel.innerHTML = `
            <div class="mobile-menu-item" data-action="pause">⏸ PAUSE</div>
            <div class="mobile-menu-item" data-action="settings">⚙ SETTINGS</div>
            <div class="mobile-menu-item danger" data-action="quit">✖ QUIT</div>
        `;
        document.body.appendChild(panel);
        
        // Handle menu item clicks
        panel.querySelectorAll('.mobile-menu-item').forEach(item => {
            item.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const action = item.dataset.action;
                this._closeMobileMenu();
                
                if (action === 'pause' && this.onPause) this.onPause();
                if (action === 'quit' && this.onQuit) this.onQuit();
                if (action === 'settings' && this.onSettings) this.onSettings();
            });
        });
        
        // Close menu when tapping elsewhere
        document.addEventListener('touchstart', (e) => {
            if (this.mobileMenuOpen && 
                !e.target.closest('#mobile-menu-btn') && 
                !e.target.closest('#mobile-menu-panel')) {
                this._closeMobileMenu();
            }
        });
        
        // Create virtual controls
        this._createVirtualControls();
    },
    
    _createVirtualControls() {
        const controls = document.createElement('div');
        controls.id = 'touch-controls';
        controls.innerHTML = `
            <div id="touch-dpad">
                <div class="dpad-btn" id="dpad-up">▲</div>
                <div class="dpad-btn" id="dpad-down">▼</div>
                <div class="dpad-btn" id="dpad-left">◀</div>
                <div class="dpad-btn" id="dpad-right">▶</div>
            </div>
            <div id="touch-buttons">
                <div class="action-btn-touch" id="btn-alt">BOMB</div>
                <div class="action-btn-touch" id="btn-fire">FIRE</div>
            </div>
        `;
        document.body.appendChild(controls);
        
        // D-Pad handlers
        const dpadMap = {
            'dpad-up': 'ArrowUp',
            'dpad-down': 'ArrowDown', 
            'dpad-left': 'ArrowLeft',
            'dpad-right': 'ArrowRight'
        };
        
        Object.entries(dpadMap).forEach(([id, keyCode]) => {
            const el = document.getElementById(id);
            
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                el.classList.add('pressed');
                this.keys[keyCode] = true;
                this.justPressed[keyCode] = true;
            });
            
            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                el.classList.remove('pressed');
                this.keys[keyCode] = false;
                this.justReleased[keyCode] = true;
            });
            
            el.addEventListener('touchcancel', (e) => {
                el.classList.remove('pressed');
                this.keys[keyCode] = false;
            });
        });
        
        // Fire button
        const fireBtn = document.getElementById('btn-fire');
        fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            fireBtn.classList.add('pressed');
            this.keys['Space'] = true;
            this.justPressed['Space'] = true;
        });
        fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            fireBtn.classList.remove('pressed');
            this.keys['Space'] = false;
            this.justReleased['Space'] = true;
        });
        fireBtn.addEventListener('touchcancel', () => {
            fireBtn.classList.remove('pressed');
            this.keys['Space'] = false;
        });
        
        // Alt button (bomb/missile)
        const altBtn = document.getElementById('btn-alt');
        altBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            altBtn.classList.add('pressed');
            this.keys['KeyB'] = true;
            this.keys['Tab'] = true;  // For Star Kraken missiles
            this.justPressed['KeyB'] = true;
            this.justPressed['Tab'] = true;
        });
        altBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            altBtn.classList.remove('pressed');
            this.keys['KeyB'] = false;
            this.keys['Tab'] = false;
            this.justReleased['KeyB'] = true;
            this.justReleased['Tab'] = true;
        });
        altBtn.addEventListener('touchcancel', () => {
            altBtn.classList.remove('pressed');
            this.keys['KeyB'] = false;
            this.keys['Tab'] = false;
        });
    },
    
    // Show/hide virtual controls (call from game when playing)
    showTouchControls() {
        const el = document.getElementById('touch-controls');
        if (el) el.classList.add('active');
    },
    
    hideTouchControls() {
        const el = document.getElementById('touch-controls');
        if (el) el.classList.remove('active');
    },
    
    // Update alt button label
    setAltButtonLabel(label) {
        const el = document.getElementById('btn-alt');
        if (el) el.textContent = label;
    },
    
    _toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        const panel = document.getElementById('mobile-menu-panel');
        if (panel) {
            panel.classList.toggle('open', this.mobileMenuOpen);
        }
    },
    
    _closeMobileMenu() {
        this.mobileMenuOpen = false;
        const panel = document.getElementById('mobile-menu-panel');
        if (panel) {
            panel.classList.remove('open');
        }
    },
    
    _onKeyDown(e) {
        if (!this.keys[e.code]) {
            this.justPressed[e.code] = true;
        }
        this.keys[e.code] = true;
        
        // Handle pause
        if (this.bindings.pause.includes(e.code) && this.onPause) {
            this.onPause();
        }
        
        // Handle quit
        if (this.bindings.quit.includes(e.code) && this.onQuit) {
            this.onQuit();
        }
        
        // Handle settings
        if (this.bindings.settings.includes(e.code) && this.onSettings) {
            this.onSettings();
        }
        
        // Handle debug (secret key)
        if (this.bindings.debug.includes(e.code) && this.onDebug) {
            this.onDebug();
        }
    },
    
    _onKeyUp(e) {
        this.keys[e.code] = false;
        this.justReleased[e.code] = true;
    },
    
    // Call this at end of each frame to clear just pressed/released
    update() {
        this.justPressed = {};
        this.justReleased = {};
    },
    
    // ==================== QUERY METHODS ====================
    
    // Check if action is currently held
    isDown(action) {
        const bindings = this.bindings[action];
        if (!bindings) return false;
        return bindings.some(key => this.keys[key]);
    },
    
    // Check if action was just pressed this frame
    wasPressed(action) {
        const bindings = this.bindings[action];
        if (!bindings) return false;
        return bindings.some(key => this.justPressed[key]);
    },
    
    // Check if action was just released this frame
    wasReleased(action) {
        const bindings = this.bindings[action];
        if (!bindings) return false;
        return bindings.some(key => this.justReleased[key]);
    },
    
    // Raw key check
    isKeyDown(code) {
        return !!this.keys[code];
    },
    
    wasKeyPressed(code) {
        return !!this.justPressed[code];
    },
    
    // ==================== KEY REMAPPING ====================
    
    rebind(action, keys) {
        if (Array.isArray(keys)) {
            this.bindings[action] = keys;
        } else {
            this.bindings[action] = [keys];
        }
    },
    
    getBindings() {
        return { ...this.bindings };
    },
    
    // ==================== UTILITY ====================
    
    // Clear all input state (useful on screen transitions)
    clear() {
        this.keys = {};
        this.justPressed = {};
        this.justReleased = {};
    },
    
    // Consume a key press (prevent it from being read again)
    consume(action) {
        const bindings = this.bindings[action];
        if (!bindings) return;
        bindings.forEach(key => {
            this.keys[key] = false;
            this.justPressed[key] = false;
        });
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Input;
}
