// ============================================================================
// KRAKEN ARKADE - SHARED ENGINE MODULE
// Game loop, state machine, delta time management
// ============================================================================

const Engine = {
    // State
    state: 'init',
    previousState: null,
    
    // Timing
    lastTime: 0,
    deltaTime: 0,
    maxDeltaTime: 0.05, // Cap to prevent physics explosions
    totalTime: 0,
    frameCount: 0,
    fps: 0,
    fpsUpdateTime: 0,
    fpsFrameCount: 0,
    
    // Canvas
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    
    // Callbacks (set by game)
    onUpdate: null,
    onRender: null,
    onStateChange: null,
    
    // Animation frame ID (for stopping)
    animationId: null,
    running: false,
    
    // ==================== INITIALIZATION ====================
    
    init(canvasId, width, height) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas '${canvasId}' not found!`);
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        
        return true;
    },
    
    // ==================== STATE MANAGEMENT ====================
    
    setState(newState) {
        if (newState === this.state) return;
        
        this.previousState = this.state;
        this.state = newState;
        
        if (this.onStateChange) {
            this.onStateChange(newState, this.previousState);
        }
    },
    
    isState(state) {
        return this.state === state;
    },
    
    // ==================== GAME LOOP ====================
    
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    },
    
    stop() {
        this.running = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },
    
    _loop(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, this.maxDeltaTime);
        this.lastTime = timestamp;
        this.totalTime += this.deltaTime;
        this.frameCount++;
        
        // FPS calculation
        this.fpsFrameCount++;
        if (timestamp - this.fpsUpdateTime >= 1000) {
            this.fps = this.fpsFrameCount;
            this.fpsFrameCount = 0;
            this.fpsUpdateTime = timestamp;
        }
        
        // Update
        if (this.onUpdate) {
            this.onUpdate(this.deltaTime);
        }
        
        // Render
        if (this.onRender) {
            this.onRender(this.ctx);
        }
        
        // Continue loop
        this.animationId = requestAnimationFrame((t) => this._loop(t));
    },
    
    // ==================== TIMING UTILITIES ====================
    
    // Get time in seconds since engine started
    getTime() {
        return this.totalTime;
    },
    
    // Get current FPS
    getFPS() {
        return this.fps;
    },
    
    // Create a timer that counts down
    createTimer(duration) {
        return {
            remaining: duration,
            duration: duration,
            update(dt) {
                this.remaining -= dt;
            },
            isDone() {
                return this.remaining <= 0;
            },
            reset() {
                this.remaining = this.duration;
            },
            getProgress() {
                return 1 - (this.remaining / this.duration);
            }
        };
    },
    
    // Create a timer that counts up and triggers periodically
    createInterval(interval) {
        return {
            elapsed: 0,
            interval: interval,
            triggered: false,
            update(dt) {
                this.elapsed += dt;
                this.triggered = false;
                if (this.elapsed >= this.interval) {
                    this.elapsed -= this.interval;
                    this.triggered = true;
                }
            },
            check() {
                return this.triggered;
            },
            reset() {
                this.elapsed = 0;
                this.triggered = false;
            }
        };
    },
    
    // ==================== CANVAS UTILITIES ====================
    
    clear(color = '#000') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    },
    
    // Save/restore context (for transforms)
    save() {
        this.ctx.save();
    },
    
    restore() {
        this.ctx.restore();
    },
    
    // Apply screen shake offset
    applyShake(x, y) {
        this.ctx.translate(x, y);
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
}
