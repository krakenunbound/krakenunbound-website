// Ad Astra - Asteroid Field Mini-Game
// asteroid-minigame.js - Navigate and mine asteroid fields

class AsteroidMinigame {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.audioCtx = null;
        
        // Game state
        this.state = 'idle'; // idle, playing, paused, victory, gameover
        this.hasMiningEquipment = false;
        this.onComplete = null;
        
        // Config
        this.CONFIG = {
            SHIP_SPEED: 250,
            BULLET_SPEED: 500,
            SCROLL_SPEED: 60,
            TOTAL_DISTANCE: 3000,
            WIDTH: 600,
            HEIGHT: 700
        };
        
        // Game objects
        this.player = { x: 300, y: 550, invuln: 0, shootTimer: 0 };
        this.bullets = [];
        this.asteroids = [];
        this.loots = [];
        this.particles = [];
        this.stars = [];
        
        // Stats
        this.lives = 3;
        this.distanceRemaining = 0;
        this.inventory = { ore: 0, equipment: 0, list: [] };
        
        // Input
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };
        this.lastTime = 0;
        this.animationId = null;
        
        // Loot table for Ad Astra
        this.LOOT_TABLE = [
            { name: 'Iron Ore', type: 'ore', weight: 30 },
            { name: 'Copper Ore', type: 'ore', weight: 25 },
            { name: 'Titanium Ore', type: 'ore', weight: 15 },
            { name: 'Platinum Ore', type: 'ore', weight: 10 },
            { name: 'Salvaged Parts', type: 'equipment', weight: 15 },
            { name: 'Rare Isotope', type: 'equipment', weight: 5 }
        ];
    }

    /**
     * Start the asteroid minigame
     * @param {boolean} hasMining - Whether player has mining equipment
     * @param {function} onComplete - Callback with results {survived: bool, loot: {ore: n, equipment: n}}
     */
    start(hasMining, onComplete) {
        this.hasMiningEquipment = hasMining;
        this.onComplete = onComplete;
        
        // Reset game objects
        this.lives = 3;
        this.distanceRemaining = this.CONFIG.TOTAL_DISTANCE;
        this.inventory = { ore: 0, equipment: 0, list: [] };
        this.player = { x: this.CONFIG.WIDTH / 2, y: this.CONFIG.HEIGHT - 100, invuln: 0, shootTimer: 0 };
        this.bullets = [];
        this.asteroids = [];
        this.loots = [];
        this.particles = [];
        
        // Create UI (this calls destroy() first which sets state to 'idle')
        this.createUI();
        this.initAudio();
        this.initStars();
        
        // Pre-seed some asteroids
        for (let i = 0; i < 5; i++) {
            this.asteroids.push(this.createAsteroid(Math.random() * this.CONFIG.HEIGHT * 0.4));
        }
        
        // Set state AFTER createUI (which calls destroy and sets state to 'idle')
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
        this.container.id = 'asteroid-minigame-container';
        this.container.innerHTML = `
            <div id="asteroid-minigame-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 3000;
                display: flex;
                justify-content: center;
                align-items: center;
            ">
                <div id="asteroid-game-box" style="
                    position: relative;
                    border: 3px solid #f80;
                    box-shadow: 0 0 30px rgba(255, 136, 0, 0.5);
                    width: ${this.CONFIG.WIDTH}px;
                    height: ${this.CONFIG.HEIGHT}px;
                ">
                    <canvas id="asteroid-canvas" width="${this.CONFIG.WIDTH}" height="${this.CONFIG.HEIGHT}" style="
                        display: block;
                        background: radial-gradient(circle at bottom, #1a1a2e 0%, #000000 100%);
                    "></canvas>
                    
                    <!-- HUD -->
                    <div id="asteroid-hud" style="
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        right: 10px;
                        display: flex;
                        justify-content: space-between;
                        color: #f80;
                        font-family: 'Courier New', monospace;
                        font-size: 16px;
                        text-shadow: 0 0 10px #f80;
                        pointer-events: none;
                    ">
                        <div id="asteroid-ore">ORE: 0</div>
                        <div id="asteroid-equip">PARTS: 0</div>
                    </div>
                    
                    <div id="asteroid-distance" style="
                        position: absolute;
                        top: 35px;
                        left: 10px;
                        color: #fff;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        pointer-events: none;
                    ">DISTANCE: ${this.CONFIG.TOTAL_DISTANCE}m</div>
                    
                    <div id="asteroid-hull" style="
                        position: absolute;
                        top: 35px;
                        right: 10px;
                        color: #5f5;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        pointer-events: none;
                    ">HULL: 100%</div>
                    
                    <div id="asteroid-mining-status" style="
                        position: absolute;
                        top: 55px;
                        left: 10px;
                        color: ${this.hasMiningEquipment ? '#5f5' : '#f55'};
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        pointer-events: none;
                    ">${this.hasMiningEquipment ? '⛏️ MINING LASER ACTIVE' : '❌ NO MINING EQUIPMENT'}</div>
                    
                    <!-- Start Screen -->
                    <div id="asteroid-start-screen" style="
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: rgba(0,0,0,0.9);
                        color: #f80;
                        font-family: 'Courier New', monospace;
                    ">
                        <h1 style="font-size: 36px; text-shadow: 0 0 20px #f80; margin-bottom: 10px;">☄️ ASTEROID FIELD ☄️</h1>
                        <h2 style="font-size: 18px; color: #fff; margin-bottom: 30px;">Navigate to Safety</h2>
                        <div style="color: #ccc; margin: 8px 0;">⬅️ ➡️ Steer Ship</div>
                        <div style="color: #ccc; margin: 8px 0;">⬆️ ⬇️ Thrust / Brake</div>
                        <div style="color: #ccc; margin: 8px 0;">SPACE Shoot Asteroids</div>
                        ${this.hasMiningEquipment ? 
                            '<div style="color: #5f5; margin: 15px 0; font-size: 14px;">⛏️ Mining equipment detected - collect debris!</div>' :
                            '<div style="color: #f55; margin: 15px 0; font-size: 14px;">❌ No mining equipment - survival only!</div>'
                        }
                        <button id="asteroid-start-btn" style="
                            margin-top: 20px;
                            padding: 12px 30px;
                            font-size: 18px;
                            font-family: 'Courier New', monospace;
                            background: transparent;
                            border: 2px solid #f80;
                            color: #f80;
                            cursor: pointer;
                        ">ENGAGE THRUSTERS</button>
                    </div>
                    
                    <!-- Victory Screen -->
                    <div id="asteroid-victory-screen" style="
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        display: none;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: rgba(0,0,0,0.9);
                        color: #5f5;
                        font-family: 'Courier New', monospace;
                    ">
                        <h1 style="font-size: 36px; text-shadow: 0 0 20px #0f0;">✅ CLEAR SPACE</h1>
                        <h2 style="font-size: 18px; color: #fff; margin: 20px 0;">Field Escaped!</h2>
                        <div id="asteroid-loot-box" style="
                            border: 2px solid #5f5;
                            padding: 20px;
                            margin: 20px;
                            min-width: 250px;
                            background: rgba(0,255,0,0.1);
                        ">
                            <h3 style="color: #5f5; margin-bottom: 15px;">📦 CARGO SECURED</h3>
                            <div id="asteroid-loot-list"></div>
                        </div>
                        <button id="asteroid-continue-btn" style="
                            padding: 12px 30px;
                            font-size: 18px;
                            font-family: 'Courier New', monospace;
                            background: transparent;
                            border: 2px solid #5f5;
                            color: #5f5;
                            cursor: pointer;
                        ">CONTINUE</button>
                    </div>
                    
                    <!-- Game Over Screen -->
                    <div id="asteroid-gameover-screen" style="
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
                        <h1 style="font-size: 36px; text-shadow: 0 0 20px #f00;">💥 SHIP DESTROYED</h1>
                        <h2 style="font-size: 18px; color: #fff; margin: 20px 0;">Hull Breach Critical</h2>
                        <div style="color: #f55; margin: 20px;">All cargo lost in the debris field.</div>
                        <button id="asteroid-fail-btn" style="
                            padding: 12px 30px;
                            font-size: 18px;
                            font-family: 'Courier New', monospace;
                            background: transparent;
                            border: 2px solid #f55;
                            color: #f55;
                            cursor: pointer;
                        ">ACCEPT FATE</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
        
        // Get canvas
        this.canvas = document.getElementById('asteroid-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Button handlers
        document.getElementById('asteroid-start-btn').onclick = () => this.hideStartScreen();
        document.getElementById('asteroid-continue-btn').onclick = () => this.finishGame(true);
        document.getElementById('asteroid-fail-btn').onclick = () => this.finishGame(false);
    }

    hideStartScreen() {
        document.getElementById('asteroid-start-screen').style.display = 'none';
        this.state = 'playing';
    }

    initAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) {
            console.warn('Audio not available for minigame');
        }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        switch (type) {
            case 'shoot':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
                break;
                
            case 'explode':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
                break;
                
            case 'collect':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
                setTimeout(() => {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(1800, ctx.currentTime);
                    gain2.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start();
                    osc2.stop(ctx.currentTime + 0.1);
                }, 50);
                break;
                
            case 'hit':
                // White noise burst
                const bufferSize = ctx.sampleRate * 0.3;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1);
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                noise.connect(noiseGain);
                noiseGain.connect(ctx.destination);
                noise.start();
                break;
        }
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * this.CONFIG.WIDTH,
                y: Math.random() * this.CONFIG.HEIGHT,
                s: Math.random() * 2 + 1
            });
        }
    }

    bindInput() {
        this.keyDownHandler = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                this.keys[e.code] = true;
                e.preventDefault();
            }
            if (e.code === 'Escape') {
                this.finishGame(false);
            }
        };
        
        this.keyUpHandler = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                this.keys[e.code] = false;
            }
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

    createAsteroid(yStart = null) {
        const sizeClass = Math.random() < 0.15 ? 3 : (Math.random() < 0.4 ? 2 : 1);
        const radius = sizeClass * 15 + 10;
        
        // Generate irregular shape
        const points = [];
        const numPoints = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numPoints; i++) {
            points.push(0.8 + Math.random() * 0.4);
        }
        
        return {
            x: Math.random() * (this.CONFIG.WIDTH - 40) + 20,
            y: yStart !== null ? yStart : -radius - 50,
            vx: (Math.random() - 0.5) * 40,
            vy: Math.random() * 50 + this.CONFIG.SCROLL_SPEED,
            radius: radius,
            sizeClass: sizeClass,
            hp: sizeClass * 2,
            points: points,
            angle: Math.random() * 6,
            rotSpeed: (Math.random() - 0.5) * 2,
            dead: false
        };
    }

    createLoot(x, y, sizeClass) {
        // Roll on loot table
        const totalWeight = this.LOOT_TABLE.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;
        let lootDef = this.LOOT_TABLE[0];
        
        for (const item of this.LOOT_TABLE) {
            roll -= item.weight;
            if (roll <= 0) {
                lootDef = item;
                break;
            }
        }
        
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 20,
            vy: this.CONFIG.SCROLL_SPEED * 0.7,
            type: lootDef.type,
            name: lootDef.name,
            value: sizeClass,
            dead: false
        };
    }

    update(dt) {
        // Always update visuals (stars, asteroid rotation) for nice background effect
        // Scroll stars
        for (const s of this.stars) {
            s.y += this.CONFIG.SCROLL_SPEED * 0.5 * dt;
            if (s.y > this.CONFIG.HEIGHT) {
                s.y = 0;
                s.x = Math.random() * this.CONFIG.WIDTH;
            }
        }
        
        // Update asteroid positions and rotation (for tumbling effect)
        for (const a of this.asteroids) {
            a.y += a.vy * dt;
            a.x += a.vx * dt;
            a.angle += a.rotSpeed * dt;
            
            // Bounce off walls
            if (a.x < a.radius || a.x > this.CONFIG.WIDTH - a.radius) {
                a.vx *= -1;
            }
        }
        
        // Cleanup off-screen asteroids
        this.asteroids = this.asteroids.filter(a => !a.dead && a.y < this.CONFIG.HEIGHT + 50);
        
        // Spawn new asteroids to keep the field populated
        if (this.asteroids.length < 8 && Math.random() < 0.03) {
            this.asteroids.push(this.createAsteroid());
        }
        
        // Update particles
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);
        
        // === GAMEPLAY UPDATES (only when playing) ===
        if (this.state !== 'playing') return;
        
        // Distance
        this.distanceRemaining -= this.CONFIG.SCROLL_SPEED * dt;
        if (this.distanceRemaining <= 0) {
            this.victory();
            return;
        }
        
        // Update HUD
        document.getElementById('asteroid-distance').textContent = `DISTANCE: ${Math.floor(this.distanceRemaining)}m`;
        
        // Player invulnerability
        if (this.player.invuln > 0) this.player.invuln -= dt;
        if (this.player.shootTimer > 0) this.player.shootTimer -= dt;
        
        // Player movement
        if (this.keys.ArrowLeft) this.player.x -= this.CONFIG.SHIP_SPEED * dt;
        if (this.keys.ArrowRight) this.player.x += this.CONFIG.SHIP_SPEED * dt;
        if (this.keys.ArrowUp) this.player.y -= this.CONFIG.SHIP_SPEED * dt;
        if (this.keys.ArrowDown) this.player.y += this.CONFIG.SHIP_SPEED * dt;
        
        // Clamp player position
        this.player.x = Math.max(15, Math.min(this.CONFIG.WIDTH - 15, this.player.x));
        this.player.y = Math.max(15, Math.min(this.CONFIG.HEIGHT - 15, this.player.y));
        
        // Shooting
        if (this.keys.Space && this.player.shootTimer <= 0) {
            this.bullets.push({ x: this.player.x, y: this.player.y - 20, dead: false });
            this.playSound('shoot');
            this.player.shootTimer = 0.15;
        }
        
        // Update bullets
        for (const b of this.bullets) {
            b.y -= this.CONFIG.BULLET_SPEED * dt;
        }
        
        // Update loot
        for (const l of this.loots) {
            l.y += l.vy * dt;
            l.x += l.vx * dt;
        }
        
        // Collision: Bullets -> Asteroids
        for (const b of this.bullets) {
            if (b.dead) continue;
            for (const a of this.asteroids) {
                if (a.dead) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                if (dx * dx + dy * dy < a.radius * a.radius) {
                    b.dead = true;
                    a.hp--;
                    
                    if (a.hp <= 0) {
                        a.dead = true;
                        this.destroyAsteroid(a);
                    } else {
                        // Spark
                        this.particles.push({
                            x: b.x, y: b.y,
                            vx: (Math.random() - 0.5) * 100,
                            vy: -100,
                            life: 0.2,
                            color: '#fff'
                        });
                    }
                }
            }
        }
        
        // Collision: Player -> Asteroids
        if (this.player.invuln <= 0) {
            for (const a of this.asteroids) {
                if (a.dead) continue;
                const dx = this.player.x - a.x;
                const dy = this.player.y - a.y;
                const minDist = 15 + a.radius;
                if (dx * dx + dy * dy < minDist * minDist) {
                    this.playerHit();
                    break;
                }
            }
        }
        
        // Collision: Player -> Loot (only if has mining equipment)
        if (this.hasMiningEquipment) {
            for (const l of this.loots) {
                if (l.dead) continue;
                const dx = this.player.x - l.x;
                const dy = this.player.y - l.y;
                if (dx * dx + dy * dy < 900) { // 30px pickup radius
                    l.dead = true;
                    this.collectLoot(l);
                }
            }
        }
        
        // Cleanup gameplay items
        this.bullets = this.bullets.filter(b => !b.dead && b.y > -20);
        this.loots = this.loots.filter(l => !l.dead && l.y < this.CONFIG.HEIGHT + 20);
    }

    destroyAsteroid(asteroid) {
        this.playSound('explode');
        
        // Spawn loot (only if has mining equipment)
        if (this.hasMiningEquipment && Math.random() < 0.5) {
            this.loots.push(this.createLoot(asteroid.x, asteroid.y, asteroid.sizeClass));
        }
        
        // Split into smaller asteroids
        if (asteroid.sizeClass > 1) {
            for (let i = 0; i < 2; i++) {
                const child = this.createAsteroid(asteroid.y);
                child.x = asteroid.x;
                child.sizeClass = asteroid.sizeClass - 1;
                child.radius = child.sizeClass * 15 + 10;
                child.hp = child.sizeClass * 2;
                child.vx = (Math.random() - 0.5) * 100;
                child.vy = asteroid.vy + Math.random() * 50;
                this.asteroids.push(child);
            }
        }
        
        // Explosion particles
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: asteroid.x,
                y: asteroid.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.5,
                color: '#888'
            });
        }
    }

    playerHit() {
        this.lives--;
        this.playSound('hit');
        this.player.invuln = 2.0;
        
        // Explosion at player
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.8,
                color: '#f80'
            });
        }
        
        // Update HUD
        this.updateHullDisplay();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Knockback
            this.player.y = Math.min(this.CONFIG.HEIGHT - 50, this.player.y + 50);
        }
    }

    updateHullDisplay() {
        const hullEl = document.getElementById('asteroid-hull');
        let hpStr = 'DANGER';
        if (this.lives === 3) hpStr = '100%';
        else if (this.lives === 2) hpStr = '66%';
        else if (this.lives === 1) hpStr = '33%';
        
        hullEl.textContent = `HULL: ${hpStr}`;
        hullEl.style.color = this.lives === 1 ? '#f00' : '#5f5';
    }

    collectLoot(loot) {
        this.playSound('collect');
        this.inventory.list.push(loot.name);
        
        if (loot.type === 'ore') {
            this.inventory.ore += loot.value;
        } else {
            this.inventory.equipment += loot.value;
        }
        
        // Update HUD
        document.getElementById('asteroid-ore').textContent = `ORE: ${this.inventory.ore}`;
        document.getElementById('asteroid-equip').textContent = `PARTS: ${this.inventory.equipment}`;
    }

    victory() {
        this.state = 'victory';
        
        // Build loot list
        const lootList = document.getElementById('asteroid-loot-list');
        if (this.inventory.list.length === 0) {
            lootList.innerHTML = '<div style="color: #aaa;">Empty hold</div>';
        } else {
            // Count items
            const counts = {};
            this.inventory.list.forEach(item => counts[item] = (counts[item] || 0) + 1);
            
            lootList.innerHTML = Object.entries(counts).map(([name, count]) =>
                `<div style="color: #fff; margin: 5px 0; display: flex; justify-content: space-between;">
                    <span style="color: #ff0;">${count}x</span>
                    <span>${name}</span>
                </div>`
            ).join('');
        }
        
        document.getElementById('asteroid-victory-screen').style.display = 'flex';
    }

    gameOver() {
        this.state = 'gameover';
        document.getElementById('asteroid-gameover-screen').style.display = 'flex';
    }

    finishGame(survived) {
        // Stop game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Calculate loot to give to game
        const results = {
            survived: survived,
            loot: {
                ore: survived ? this.inventory.ore : 0,
                equipment: survived ? this.inventory.equipment : 0
            },
            hullDamage: (3 - this.lives) * 15 // 15% damage per hit taken
        };
        
        // Clean up
        this.destroy();
        
        // Callback
        if (this.onComplete) {
            this.onComplete(results);
        }
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;
        
        ctx.clearRect(0, 0, this.CONFIG.WIDTH, this.CONFIG.HEIGHT);
        
        // Stars
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        for (const s of this.stars) {
            ctx.fillRect(s.x, s.y, s.s, s.s);
        }
        ctx.globalAlpha = 1;
        
        // Loot (only draw if mining equipment)
        if (this.hasMiningEquipment) {
            for (const l of this.loots) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = l.type === 'ore' ? '#ff0' : '#0ff';
                
                if (l.type === 'ore') {
                    ctx.fillStyle = '#fd0';
                    ctx.beginPath();
                    ctx.moveTo(l.x, l.y - 6);
                    ctx.lineTo(l.x + 6, l.y);
                    ctx.lineTo(l.x, l.y + 6);
                    ctx.lineTo(l.x - 6, l.y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#0ff';
                    ctx.fillRect(l.x - 5, l.y - 5, 10, 10);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
                }
                ctx.shadowBlur = 0;
            }
        }
        
        // Asteroids
        for (const a of this.asteroids) {
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.angle);
            
            ctx.fillStyle = '#555';
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            for (let i = 0; i < a.points.length; i++) {
                const angle = (i / a.points.length) * Math.PI * 2;
                const r = a.radius * a.points[i];
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Crater
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(a.radius * 0.2, a.radius * 0.2, a.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Bullets
        ctx.fillStyle = '#ff0';
        for (const b of this.bullets) {
            ctx.fillRect(b.x - 2, b.y, 4, 10);
        }
        
        // Player ship
        if (this.state === 'playing') {
            if (this.player.invuln <= 0 || Math.floor(Date.now() / 100) % 2 === 0) {
                const x = this.player.x;
                const y = this.player.y;
                const s = 15;
                
                // Engine trail
                if (this.keys.ArrowUp) {
                    ctx.fillStyle = '#fa0';
                    ctx.beginPath();
                    ctx.moveTo(x - 5, y + s);
                    ctx.lineTo(x, y + s + 15 + Math.random() * 10);
                    ctx.lineTo(x + 5, y + s);
                    ctx.fill();
                }
                
                // Hull
                ctx.fillStyle = '#ccc';
                ctx.beginPath();
                ctx.moveTo(x, y - s);
                ctx.lineTo(x + s, y + s);
                ctx.lineTo(x, y + s * 0.7);
                ctx.lineTo(x - s, y + s);
                ctx.closePath();
                ctx.fill();
                
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Cockpit
                ctx.fillStyle = '#0ff';
                ctx.beginPath();
                ctx.moveTo(x, y - s * 0.2);
                ctx.lineTo(x + s * 0.3, y + s * 0.4);
                ctx.lineTo(x - s * 0.3, y + s * 0.4);
                ctx.fill();
            }
        }
        
        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        ctx.globalAlpha = 1;
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

export default AsteroidMinigame;