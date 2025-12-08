// Ad Astra - Pirate Combat Mini-Game
// pirate-minigame.js - Galaga-style pirate battle

class PirateMinigame {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.audioCtx = null;
        
        // Game state
        this.state = 'idle'; // idle, start, playing, paused, victory, gameover
        this.onComplete = null;
        this.pirateStrength = 1; // 1-3, affects waves
        
        // Config
        this.CONFIG = {
            WIDTH: 600,
            HEIGHT: 700,
            PLAYER_SPEED: 200,
            BULLET_SPEED: 400,
            SHOOT_COOLDOWN: 350
        };
        
        // Game objects
        this.player = { x: 300, y: 630, width: 30, height: 30, isDead: false };
        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.particles = [];
        this.stars = [];
        
        // Stats
        this.lives = 3;
        this.wave = 1;
        this.totalWaves = 1;
        this.materials = 0;
        this.cargoCount = 0;
        this.gameTime = 0;
        this.lastShot = 0;
        this.thrusterTime = 0;
        
        // Input
        this.keys = {};
        this.lastTime = 0;
        this.animationId = null;
        
        // Enemy types
        this.ENEMY_TYPES = {
            SCOUT: { color: '#44ff44', hp: 1, diveSpeed: 180, matDrop: 1, cargoDrop: 0, width: 28, height: 28 },
            RAIDER: { color: '#44ccff', hp: 1, diveSpeed: 150, matDrop: 2, cargoDrop: 0, width: 32, height: 32 },
            CAPTAIN: { color: '#ff4444', hp: 2, diveSpeed: 120, matDrop: 0, cargoDrop: 1, width: 36, height: 36 }
        };
        
        // Loot tables for Ad Astra
        this.MATERIAL_TYPES = ['Ore', 'Equipment', 'Fuel Cells', 'Spare Parts'];
        this.CARGO_TYPES = ['Contraband', 'Luxury Goods', 'Medical Supplies'];
    }

    /**
     * Start the pirate combat minigame
     * @param {number} strength - Pirate strength 1-3 (affects waves)
     * @param {function} onComplete - Callback with results {victory: bool, loot: {...}, hullDamage: n}
     */
    start(strength, onComplete) {
        this.pirateStrength = Math.min(3, Math.max(1, strength || 1));
        this.onComplete = onComplete;
        
        // Reset game objects
        this.lives = 3;
        this.wave = 1;
        this.totalWaves = this.pirateStrength;
        this.materials = 0;
        this.cargoCount = 0;
        this.gameTime = 0;
        this.player = { x: this.CONFIG.WIDTH / 2, y: this.CONFIG.HEIGHT - 70, width: 30, height: 30, isDead: false };
        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.particles = [];
        
        // Create UI
        this.createUI();
        this.initAudio();
        this.initStars();
        
        // Set state AFTER createUI (which calls destroy)
        this.state = 'start';
        
        // Start loop
        this.lastTime = performance.now();
        this.loop(this.lastTime);
        
        // Input handlers
        this.bindInput();
    }

    createUI() {
        // Remove existing if any
        this.destroy();
        
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'pirate-minigame-container';
        this.container.innerHTML = `
            <div id="pirate-minigame-overlay" style="
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 3000;
                display: flex;
                justify-content: center;
                align-items: center;
            ">
                <div id="pirate-game-box" style="
                    position: relative;
                    border: 3px solid #f00;
                    box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
                    width: ${this.CONFIG.WIDTH}px;
                    height: ${this.CONFIG.HEIGHT}px;
                ">
                    <canvas id="pirate-canvas" width="${this.CONFIG.WIDTH}" height="${this.CONFIG.HEIGHT}" style="
                        display: block;
                        background: radial-gradient(circle at bottom, #1a1a2e 0%, #000000 100%);
                    "></canvas>
                    
                    <!-- HUD -->
                    <div id="pirate-hud" style="
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        right: 10px;
                        display: flex;
                        justify-content: space-between;
                        color: #0ff;
                        font-family: 'Courier New', monospace;
                        font-size: 16px;
                        text-shadow: 0 0 10px #0ff;
                        pointer-events: none;
                    ">
                        <div id="pirate-materials">LOOT: 0</div>
                        <div id="pirate-wave">WAVE: 1/${this.totalWaves}</div>
                        <div id="pirate-cargo">CARGO: 0</div>
                    </div>
                    
                    <div id="pirate-info" style="
                        position: absolute;
                        top: 35px;
                        left: 10px;
                        color: #f0f;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        text-shadow: 0 0 10px #f0f;
                        pointer-events: none;
                    ">DEFEAT THE PIRATES!</div>
                    
                    <div id="pirate-lives" style="
                        position: absolute;
                        top: 35px;
                        right: 10px;
                        color: #f55;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        text-shadow: 0 0 10px #f55;
                        pointer-events: none;
                    ">LIVES: ♥♥♥</div>
                    
                    <!-- Start Screen -->
                    <div id="pirate-start-screen" style="
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: rgba(0,0,0,0.9);
                        color: #f00;
                        font-family: 'Courier New', monospace;
                    ">
                        <h1 style="font-size: 36px; text-shadow: 0 0 20px #f00; margin-bottom: 10px;">🏴‍☠️ PIRATE ATTACK 🏴‍☠️</h1>
                        <h2 style="font-size: 18px; color: #fff; margin-bottom: 30px;">${this.totalWaves} Wave${this.totalWaves > 1 ? 's' : ''} of Hostiles</h2>
                        <div style="color: #ccc; margin: 8px 0;">⬅️ ➡️ ⬆️ ⬇️ Move Ship</div>
                        <div style="color: #ccc; margin: 8px 0;">SPACE Fire Weapons</div>
                        <div style="color: #f0f; margin: 15px 0; font-size: 14px;">Destroy all pirates to claim their loot!</div>
                        <button id="pirate-start-btn" style="
                            margin-top: 20px;
                            padding: 12px 30px;
                            font-size: 18px;
                            font-family: 'Courier New', monospace;
                            background: transparent;
                            border: 2px solid #f00;
                            color: #f00;
                            cursor: pointer;
                        ">ENGAGE HOSTILES</button>
                    </div>
                    
                    <!-- Victory Screen -->
                    <div id="pirate-victory-screen" style="
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        display: none;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: rgba(0,0,0,0.9);
                        color: #ff0;
                        font-family: 'Courier New', monospace;
                    ">
                        <h1 style="font-size: 36px; text-shadow: 0 0 20px #ff0;">🎉 VICTORY! 🎉</h1>
                        <h2 style="font-size: 18px; color: #fff; margin: 20px 0;">Pirates Defeated!</h2>
                        <div id="pirate-loot-box" style="
                            border: 2px solid #0f0;
                            padding: 20px;
                            margin: 20px;
                            min-width: 250px;
                            background: rgba(0,255,0,0.1);
                        ">
                            <h3 style="color: #0f0; margin-bottom: 15px;">📦 LOOT ACQUIRED</h3>
                            <div id="pirate-loot-list"></div>
                        </div>
                        <button id="pirate-continue-btn" style="
                            padding: 12px 30px;
                            font-size: 18px;
                            font-family: 'Courier New', monospace;
                            background: transparent;
                            border: 2px solid #ff0;
                            color: #ff0;
                            cursor: pointer;
                        ">COLLECT LOOT</button>
                    </div>
                    
                    <!-- Game Over Screen -->
                    <div id="pirate-gameover-screen" style="
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        display: none;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: rgba(0,0,0,0.9);
                        color: #f55;
                        font-family: 'Courier New', monospace;
                    ">
                        <h1 style="font-size: 36px; text-shadow: 0 0 20px #f00;">💀 DEFEATED 💀</h1>
                        <h2 style="font-size: 18px; color: #fff; margin: 20px 0;">Ship Disabled</h2>
                        <div style="color: #f55; margin: 20px;">The pirates stripped your cargo holds...</div>
                        <button id="pirate-fail-btn" style="
                            padding: 12px 30px;
                            font-size: 18px;
                            font-family: 'Courier New', monospace;
                            background: transparent;
                            border: 2px solid #f55;
                            color: #f55;
                            cursor: pointer;
                        ">LIMP AWAY</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // Get canvas
        this.canvas = document.getElementById('pirate-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Button handlers
        document.getElementById('pirate-start-btn').onclick = () => this.startGame();
        document.getElementById('pirate-continue-btn').onclick = () => this.finishGame(true);
        document.getElementById('pirate-fail-btn').onclick = () => this.finishGame(false);
    }

    startGame() {
        document.getElementById('pirate-start-screen').style.display = 'none';
        this.state = 'playing';
        this.spawnWave();
    }

    initAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) {
            console.warn('Audio not available for pirate minigame');
        }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        
        try {
            switch (type) {
                case 'shoot': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.15);
                    break;
                }
                case 'enemyShoot': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
                    gain.gain.setValueAtTime(0.06, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.12);
                    break;
                }
                case 'explosion': {
                    const bufferSize = ctx.sampleRate * 0.25;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                    }
                    const noise = ctx.createBufferSource();
                    const gain = ctx.createGain();
                    noise.buffer = buffer;
                    noise.connect(gain);
                    gain.connect(ctx.destination);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                    noise.start();
                    break;
                }
                case 'playerHit': {
                    const osc1 = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc1.connect(gain);
                    gain.connect(ctx.destination);
                    osc1.type = 'sawtooth';
                    osc1.frequency.setValueAtTime(150, ctx.currentTime);
                    osc1.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                    osc1.start();
                    osc1.stop(ctx.currentTime + 0.4);
                    break;
                }
                case 'victory': {
                    const notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.type = 'triangle';
                        osc.frequency.value = freq;
                        const startTime = ctx.currentTime + i * 0.15;
                        gain.gain.setValueAtTime(0.1, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                        osc.start(startTime);
                        osc.stop(startTime + 0.3);
                    });
                    break;
                }
                case 'dive': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.3);
                    break;
                }
            }
        } catch (e) {
            // Audio error, ignore
        }
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * this.CONFIG.WIDTH,
                y: Math.random() * this.CONFIG.HEIGHT,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 20 + 10,
                brightness: Math.random()
            });
        }
    }

    bindInput() {
        this.keyDownHandler = (e) => {
            this.keys[e.key] = true;
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'Escape') {
                this.finishGame(false);
            }
        };
        
        this.keyUpHandler = (e) => {
            this.keys[e.key] = false;
        };
        
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
    }

    unbindInput() {
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
        }
        if (this.keyUpHandler) {
            document.removeEventListener('keyup', this.keyUpHandler);
        }
    }

    spawnWave() {
        this.enemies = [];
        
        const rows = this.wave + 1;
        const cols = 8;
        const spacing = 50;
        const startX = (this.CONFIG.WIDTH - (cols - 1) * spacing) / 2;
        const startY = 80;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let type;
                if (row === 0) {
                    type = this.ENEMY_TYPES.CAPTAIN;
                } else if (row === 1) {
                    type = this.ENEMY_TYPES.RAIDER;
                } else {
                    type = this.ENEMY_TYPES.SCOUT;
                }
                
                const formationX = startX + col * spacing;
                const formationY = startY + row * 45;
                
                this.enemies.push(this.createEnemy(col, row, type, formationX, formationY));
            }
        }
        
        this.updateHUD();
    }

    createEnemy(gridX, gridY, type, formationX, formationY) {
        return {
            gridX, gridY, type,
            formationX, formationY,
            x: formationX,
            y: -50 - (gridY * 40),
            width: type.width,
            height: type.height,
            hp: type.hp,
            state: 'enter',
            diveAngle: 0,
            diveTimer: 0,
            wobble: Math.random() * Math.PI * 2,
            alive: true
        };
    }

    updateEnemy(enemy, dt) {
        if (!enemy.alive) return;
        
        enemy.wobble += dt * 2;
        
        if (enemy.state === 'enter') {
            const targetY = enemy.formationY;
            const dy = targetY - enemy.y;
            enemy.y += dy * 2 * dt;
            
            if (Math.abs(dy) < 3) {
                enemy.y = targetY;
                enemy.state = 'formation';
            }
        }
        else if (enemy.state === 'formation') {
            const sway = Math.sin(this.gameTime * 1.2) * 30;
            enemy.x = enemy.formationX + sway;
            enemy.y = enemy.formationY + Math.sin(enemy.wobble) * 5;
            
            let diveChance = 0.0008 * this.wave;
            if (this.wave === 1) diveChance = 0.0003;
            
            if (Math.random() < diveChance) {
                this.startEnemyDive(enemy);
            }
        }
        else if (enemy.state === 'dive') {
            enemy.diveTimer += dt;
            
            enemy.x += Math.cos(enemy.diveAngle) * enemy.type.diveSpeed * dt;
            enemy.y += Math.sin(enemy.diveAngle) * enemy.type.diveSpeed * dt;
            
            if (Math.random() < 0.02) {
                this.enemyShoot(enemy);
            }
            
            if (enemy.y > this.CONFIG.HEIGHT + 50) {
                enemy.y = -50;
                enemy.state = 'return';
            }
            
            if (enemy.x < -50 || enemy.x > this.CONFIG.WIDTH + 50) {
                enemy.state = 'return';
            }
        }
        else if (enemy.state === 'return') {
            const dx = enemy.formationX - enemy.x;
            const dy = enemy.formationY - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
                enemy.x = enemy.formationX;
                enemy.y = enemy.formationY;
                enemy.state = 'formation';
            } else {
                const speed = 150;
                enemy.x += (dx / dist) * speed * dt;
                enemy.y += (dy / dist) * speed * dt;
            }
        }
    }

    startEnemyDive(enemy) {
        enemy.state = 'dive';
        enemy.diveTimer = 0;
        
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        enemy.diveAngle = Math.atan2(dy, dx);
        
        this.playSound('dive');
    }

    enemyShoot(enemy) {
        this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            speed: 200
        });
        this.playSound('enemyShoot');
    }

    hitEnemy(enemy) {
        enemy.hp--;
        if (enemy.hp <= 0) {
            enemy.alive = false;
            
            this.materials += enemy.type.matDrop;
            this.cargoCount += enemy.type.cargoDrop;
            this.updateHUD();
            
            this.createExplosion(enemy.x, enemy.y, enemy.type.color);
            this.playSound('explosion');
        }
    }

    createExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 80 + 40;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: i % 2 === 0 ? color : '#ff0',
                life: 1.0,
                decay: Math.random() * 1.5 + 0.8
            });
        }
    }

    playerHit() {
        this.lives--;
        this.updateHUD();
        this.createExplosion(this.player.x, this.player.y, '#0ff', 15);
        this.playSound('playerHit');
        
        if (this.lives <= 0) {
            this.player.isDead = true;
            this.gameOver();
        } else {
            this.player.x = this.CONFIG.WIDTH / 2;
            this.player.y = this.CONFIG.HEIGHT - 70;
        }
    }

    updateHUD() {
        const materialsEl = document.getElementById('pirate-materials');
        const cargoEl = document.getElementById('pirate-cargo');
        const waveEl = document.getElementById('pirate-wave');
        const livesEl = document.getElementById('pirate-lives');
        
        if (materialsEl) materialsEl.textContent = `LOOT: ${this.materials}`;
        if (cargoEl) cargoEl.textContent = `CARGO: ${this.cargoCount}`;
        if (waveEl) waveEl.textContent = `WAVE: ${this.wave}/${this.totalWaves}`;
        if (livesEl) livesEl.textContent = `LIVES: ${'♥'.repeat(Math.max(0, this.lives))}`;
    }

    update(dt) {
        // Always update stars for visual effect
        for (const star of this.stars) {
            if (this.state === 'playing') {
                star.y += star.speed * dt;
                if (star.y > this.CONFIG.HEIGHT) {
                    star.y = 0;
                    star.x = Math.random() * this.CONFIG.WIDTH;
                }
            }
        }
        
        // Update particles always
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);
        
        // Update enemies in formation (for visual effect on start screen)
        if (this.state === 'start') {
            for (const enemy of this.enemies) {
                if (enemy.state === 'formation') {
                    enemy.wobble += dt * 2;
                    enemy.y = enemy.formationY + Math.sin(enemy.wobble) * 5;
                }
            }
        }
        
        // === GAMEPLAY UPDATES ===
        if (this.state !== 'playing') return;
        
        this.gameTime += dt;
        
        if (!this.player.isDead) {
            // Player movement
            if (this.keys['ArrowLeft'] && this.player.x > this.player.width / 2 + 10) {
                this.player.x -= this.CONFIG.PLAYER_SPEED * dt;
            }
            if (this.keys['ArrowRight'] && this.player.x < this.CONFIG.WIDTH - this.player.width / 2 - 10) {
                this.player.x += this.CONFIG.PLAYER_SPEED * dt;
            }
            if (this.keys['ArrowUp'] && this.player.y > this.CONFIG.HEIGHT * 0.4) {
                this.player.y -= this.CONFIG.PLAYER_SPEED * dt;
            }
            if (this.keys['ArrowDown'] && this.player.y < this.CONFIG.HEIGHT - this.player.height / 2 - 10) {
                this.player.y += this.CONFIG.PLAYER_SPEED * dt;
            }
            
            // Shooting
            const now = Date.now();
            if (this.keys[' '] && now - this.lastShot > this.CONFIG.SHOOT_COOLDOWN) {
                this.playerBullets.push({
                    x: this.player.x,
                    y: this.player.y - this.player.height / 2,
                    speed: this.CONFIG.BULLET_SPEED
                });
                this.lastShot = now;
                this.playSound('shoot');
            }
        }
        
        // Update bullets
        for (const b of this.playerBullets) {
            b.y -= b.speed * dt;
        }
        this.playerBullets = this.playerBullets.filter(b => b.y > -20);
        
        for (const b of this.enemyBullets) {
            b.y += b.speed * dt;
        }
        this.enemyBullets = this.enemyBullets.filter(b => b.y < this.CONFIG.HEIGHT + 20);
        
        // Update enemies
        for (const enemy of this.enemies) {
            this.updateEnemy(enemy, dt);
        }
        
        // Collision: player bullets -> enemies
        for (const bullet of this.playerBullets) {
            for (const enemy of this.enemies) {
                if (enemy.alive &&
                    bullet.x > enemy.x - enemy.width / 2 &&
                    bullet.x < enemy.x + enemy.width / 2 &&
                    bullet.y > enemy.y - enemy.height / 2 &&
                    bullet.y < enemy.y + enemy.height / 2) {
                    
                    bullet.y = -100;
                    this.hitEnemy(enemy);
                }
            }
        }
        
        // Collision: enemy bullets -> player
        if (!this.player.isDead) {
            for (const bullet of this.enemyBullets) {
                if (bullet.x > this.player.x - this.player.width / 2 &&
                    bullet.x < this.player.x + this.player.width / 2 &&
                    bullet.y > this.player.y - this.player.height / 2 &&
                    bullet.y < this.player.y + this.player.height / 2) {
                    
                    bullet.y = this.CONFIG.HEIGHT + 100;
                    this.playerHit();
                }
            }
            
            // Collision: enemies -> player
            for (const enemy of this.enemies) {
                if (enemy.alive) {
                    const dx = enemy.x - this.player.x;
                    const dy = enemy.y - this.player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 25) {
                        this.hitEnemy(enemy);
                        this.playerHit();
                    }
                }
            }
        }
        
        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.alive);
        
        // Check wave complete
        if (this.enemies.length === 0) {
            if (this.wave >= this.totalWaves) {
                this.victory();
            } else {
                this.wave++;
                this.updateHUD();
                document.getElementById('pirate-info').textContent = `WAVE ${this.wave} INCOMING!`;
                this.spawnWave();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;
        
        ctx.clearRect(0, 0, this.CONFIG.WIDTH, this.CONFIG.HEIGHT);
        
        // Draw stars
        for (const star of this.stars) {
            ctx.globalAlpha = star.brightness;
            ctx.fillStyle = '#fff';
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        ctx.globalAlpha = 1;
        
        // Draw player bullets
        ctx.fillStyle = '#0f0';
        for (const b of this.playerBullets) {
            ctx.fillRect(b.x - 2, b.y, 4, 12);
        }
        
        // Draw enemy bullets
        ctx.fillStyle = '#f33';
        for (const b of this.enemyBullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw enemies
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            this.drawEnemy(ctx, enemy);
        }
        
        // Draw player
        if (this.state === 'playing' && !this.player.isDead) {
            this.drawPlayer(ctx);
        }
        
        // Draw particles
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
    }

    drawEnemy(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        if (enemy.state === 'dive') {
            ctx.rotate(enemy.diveAngle + Math.PI / 2);
        }
        
        const s = enemy.width / 2;
        
        if (enemy.type === this.ENEMY_TYPES.SCOUT) {
            ctx.fillStyle = enemy.type.color;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s, s * 0.5);
            ctx.lineTo(s * 0.3, s * 0.3);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.3, s * 0.3);
            ctx.lineTo(-s, s * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (enemy.type === this.ENEMY_TYPES.RAIDER) {
            ctx.fillStyle = '#88f';
            ctx.beginPath();
            ctx.ellipse(0, -3, s * 0.4, s * 0.5, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = enemy.type.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, s, s * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff0';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(-s + (i * s * 0.66), 0, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        else if (enemy.type === this.ENEMY_TYPES.CAPTAIN) {
            const baseColor = enemy.hp === 1 ? '#ff8888' : enemy.type.color;
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, -3, s * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-6, -6, 4, 0, Math.PI * 2);
            ctx.arc(6, -6, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(-8, 4, 4, 6);
            ctx.fillRect(-2, 4, 4, 6);
            ctx.fillRect(4, 4, 4, 6);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-14, 12);
            ctx.lineTo(14, 20);
            ctx.moveTo(14, 12);
            ctx.lineTo(-14, 20);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    drawPlayer(ctx) {
        const x = this.player.x;
        const y = this.player.y;
        const s = this.player.width / 2;
        
        this.thrusterTime += 0.3;
        const isThrusting = this.keys['ArrowUp'];
        
        // Thruster flame
        const baseLength = isThrusting ? 28 : 12;
        const flickerAmount = isThrusting ? 12 : 5;
        const thrusterWidth = isThrusting ? 8 : 5;
        const flicker = Math.sin(this.thrusterTime * 3) * 0.5 + 0.5;
        const thrusterLength = baseLength + flicker * flickerAmount + Math.random() * 4;
        
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.moveTo(x - thrusterWidth, y + s);
        ctx.lineTo(x, y + s + thrusterLength);
        ctx.lineTo(x + thrusterWidth, y + s);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.moveTo(x - thrusterWidth * 0.5, y + s);
        ctx.lineTo(x, y + s + thrusterLength * 0.7);
        ctx.lineTo(x + thrusterWidth * 0.5, y + s);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1;
        
        // Ship body
        ctx.fillStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s * 0.8, y + s * 0.5);
        ctx.lineTo(x + s * 0.3, y + s);
        ctx.lineTo(x - s * 0.3, y + s);
        ctx.lineTo(x - s * 0.8, y + s * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Wings
        ctx.fillStyle = '#0aa';
        ctx.beginPath();
        ctx.moveTo(x - s * 0.8, y + s * 0.3);
        ctx.lineTo(x - s * 1.2, y + s);
        ctx.lineTo(x - s * 0.5, y + s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + s * 0.8, y + s * 0.3);
        ctx.lineTo(x + s * 1.2, y + s);
        ctx.lineTo(x + s * 0.5, y + s);
        ctx.closePath();
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#0cf';
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    victory() {
        this.state = 'victory';
        this.playSound('victory');
        
        // Build loot list
        const lootList = document.getElementById('pirate-loot-list');
        const loot = this.generateLoot();
        
        if (loot.length === 0) {
            lootList.innerHTML = '<div style="color: #aaa;">Nothing found...</div>';
        } else {
            lootList.innerHTML = loot.map(item =>
                `<div style="color: #fff; margin: 5px 0; display: flex; justify-content: space-between;">
                    <span style="color: #ff0;">${item.amount}x</span>
                    <span>${item.name}</span>
                </div>`
            ).join('');
        }
        
        document.getElementById('pirate-victory-screen').style.display = 'flex';
    }

    gameOver() {
        this.state = 'gameover';
        document.getElementById('pirate-gameover-screen').style.display = 'flex';
    }

    generateLoot() {
        const loot = [];
        
        if (this.materials > 0) {
            const matType = this.MATERIAL_TYPES[Math.floor(Math.random() * this.MATERIAL_TYPES.length)];
            loot.push({ type: 'material', name: matType, amount: this.materials * 5 });
        }
        
        if (this.cargoCount > 0) {
            const cargoType = this.CARGO_TYPES[Math.floor(Math.random() * this.CARGO_TYPES.length)];
            loot.push({ type: 'cargo', name: cargoType, amount: this.cargoCount * 3 });
        }
        
        return loot;
    }

    finishGame(victory) {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        const loot = victory ? this.generateLoot() : [];
        
        const results = {
            victory: victory,
            loot: loot,
            hullDamage: victory ? (3 - this.lives) * 10 : 30 // More damage if defeated
        };
        
        this.destroy();
        
        if (this.onComplete) {
            this.onComplete(results);
        }
    }

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        
        this.update(dt);
        this.draw();
        
        if (this.state !== 'idle') {
            this.animationId = requestAnimationFrame((t) => this.loop(t));
        }
    }

    destroy() {
        this.state = 'idle';
        this.unbindInput();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        this.canvas = null;
        this.ctx = null;
    }
}

export default PirateMinigame;
