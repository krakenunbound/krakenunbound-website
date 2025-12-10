// Ad Astra - Pirate Combat Mini-Game
// pirate-minigame.js - Polished version based on 'Space Pirates'

class PirateMinigame {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.audioCtx = null;

        // Game state
        this.state = 'idle';
        this.onComplete = null;
        this.wave = 1;
        this.totalWaves = 3;

        // Config
        this.CONFIG = {
            WIDTH: 700,
            HEIGHT: 850,
            PLAYER_SPEED: 280,
            BULLET_SPEED: 600,
            FIRE_RATE: 0.15
        };

        // Entities
        this.player = {
            x: 350, y: 750,
            width: 40, height: 40,
            health: 100, maxHealth: 100,
            invuln: 0,
            powerups: { shield: 0, rapid: 0, triple: 0, magnet: 0 }
        };

        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = [];
        this.stars = [];

        // Loot tracking
        this.loot = { materials: 0, cargo: 0, list: [] };

        // Input
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };
        this.lastTime = 0;
        this.lastShot = 0;
        this.animationId = null;

        // Constants from Space Pirates
        this.ENEMY_TYPES = {
            SCOUT: { hp: 1, score: 100, width: 28, height: 28, matDrop: 1, cargoDrop: 0 },
            RAIDER: { hp: 2, score: 200, width: 32, height: 32, matDrop: 2, cargoDrop: 0 },
            CAPTAIN: { hp: 5, score: 500, width: 36, height: 36, matDrop: 5, cargoDrop: 1 }
        };

        this.POWERUP_TYPES = [
            { id: 'shield', icon: '🛡️', color: '#44aaff', duration: 8, chance: 0.08 },
            { id: 'rapid', icon: '⚡', color: '#ffff44', duration: 10, chance: 0.08 },
            { id: 'triple', icon: '🔱', color: '#ff44ff', duration: 8, chance: 0.06 },
            { id: 'heal', icon: '💚', color: '#44ff44', duration: 0, chance: 0.08 }
        ];
    }

    // ==========================================
    // INITIALIZATION & UI
    // ==========================================

    start(strength, onComplete) {
        this.totalWaves = Math.max(1, Math.min(3, strength));
        this.onComplete = onComplete;

        this.createUI();
        this.initAudio();
        this.resetGame();

        this.state = 'start';
        this.lastTime = performance.now();
        this.loop(this.lastTime);
        this.bindInput();
    }

    resetGame() {
        this.player.x = this.CONFIG.WIDTH / 2;
        this.player.y = this.CONFIG.HEIGHT - 100;
        this.player.health = 100;
        this.player.invuln = 0;
        this.player.powerups = { shield: 0, rapid: 0, triple: 0, magnet: 0 };
        this.wave = 1;

        this.loot = { materials: 0, cargo: 0, list: [] };

        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = [];

        // Stars
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * this.CONFIG.WIDTH,
                y: Math.random() * this.CONFIG.HEIGHT,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 20 + 10
            });
        }

        this.spawnWave();
    }

    createUI() {
        this.destroy(); // Cleanup

        this.container = document.createElement('div');
        this.container.id = 'pirate-minigame-container';
        this.container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(5px);';

        this.container.innerHTML = `
            <div id="pirate-game-box" style="position:relative;width:${this.CONFIG.WIDTH}px;height:${this.CONFIG.HEIGHT}px;box-shadow:0 0 50px rgba(255,0,0,0.3);border:2px solid #f44;">
                <canvas id="pirate-canvas" width="${this.CONFIG.WIDTH}" height="${this.CONFIG.HEIGHT}" style="background:#100505;display:block;"></canvas>
                
                <!-- HUD -->
                <div style="position:absolute;top:15px;left:20px;color:#fff;font-family:'Courier New',monospace;text-shadow:0 0 5px #f00;font-weight:bold;font-size:18px;">
                    <div>SHIELD: <span id="hud-hp" style="color:#0f0">100%</span></div>
                    <div style="margin-top:5px">WAVE: <span id="hud-wave">1/${this.totalWaves}</span></div>
                </div>
                
                <div style="position:absolute;top:15px;right:20px;text-align:right;color:#fc0;font-family:'Courier New',monospace;text-shadow:0 0 5px #f80;font-weight:bold;font-size:18px;">
                    <div>SALVAGE: <span id="hud-loot">0</span></div>
                    <div>CARGO: <span id="hud-cargo">0</span></div>
                </div>

                <!-- OVERLAYS -->
                <div id="screen-start" style="position:absolute;inset:0;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                    <h1 style="font-size:42px;color:#f44;text-shadow:0 0 20px #f00;margin-bottom:10px">PIRATE ATTACK</h1>
                    <p style="color:#aaa;margin-bottom:30px">Defend your ship against hostile raiders!</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:left;margin-bottom:40px;font-family:monospace;color:#ccc">
                        <div>⬆️⬇️⬅️➡️ Evasive Maneuvers</div>
                        <div>SPACE Return Fire</div>
                    </div>
                    <button id="btn-start" style="padding:15px 40px;background:#f44;border:none;color:#fff;font-size:20px;cursor:pointer;border-radius:4px;box-shadow:0 0 15px #f00">BATTLE STATIONS</button>
                </div>

                <div id="screen-gameover" style="position:absolute;inset:0;background:rgba(50,0,0,0.9);display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                    <h1 style="font-size:48px;color:#f44;text-shadow:0 0 20px #f00;">DEFEAT</h1>
                    <p>Ship disabled. Cargo seized.</p>
                    <button id="btn-fail" style="margin-top:30px;padding:12px 30px;background:transparent;border:2px solid #f44;color:#f44;cursor:pointer;font-family:monospace;font-size:18px;">SURRENDER</button>
                </div>

                <div id="screen-victory" style="position:absolute;inset:0;background:rgba(0,50,0,0.9);display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                    <h1 style="font-size:48px;color:#4f4;text-shadow:0 0 20px #0f0;">VICTORY</h1>
                    <div id="victory-stats" style="margin:20px;padding:20px;background:rgba(0,20,0,0.5);border:1px solid #4f4;min-width:300px;"></div>
                    <button id="btn-win" style="margin-top:10px;padding:12px 30px;background:#4f4;border:none;color:#000;cursor:pointer;font-weight:bold;font-size:18px;">SALVAGE & LEAVE</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        this.canvas = document.getElementById('pirate-canvas');
        this.ctx = this.canvas.getContext('2d');

        document.getElementById('btn-start').onclick = () => {
            document.getElementById('screen-start').style.display = 'none';
            this.state = 'playing';
        };

        document.getElementById('btn-fail').onclick = () => this.finish(false);
        document.getElementById('btn-win').onclick = () => this.finish(true);
    }

    destroy() {
        if (this.container) this.container.remove();
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.unbindInput();
    }

    // ==========================================
    // GAME LOOP
    // ==========================================

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (this.state === 'playing') {
            this.update(dt);
        }
        this.draw();

        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Starfield
        this.stars.forEach(s => {
            s.y += s.speed * dt;
            if (s.y > this.CONFIG.HEIGHT) { s.y = 0; s.x = Math.random() * this.CONFIG.WIDTH; }
        });

        // Player
        if (this.keys.ArrowLeft) this.player.x -= this.CONFIG.PLAYER_SPEED * dt;
        if (this.keys.ArrowRight) this.player.x += this.CONFIG.PLAYER_SPEED * dt;
        if (this.keys.ArrowUp) this.player.y -= this.CONFIG.PLAYER_SPEED * dt;
        if (this.keys.ArrowDown) this.player.y += this.CONFIG.PLAYER_SPEED * dt;

        // Clamp
        this.player.x = Math.max(20, Math.min(this.CONFIG.WIDTH - 20, this.player.x));
        this.player.y = Math.max(20, Math.min(this.CONFIG.HEIGHT - 20, this.player.y));

        // Fire
        const now = Date.now();
        const fireRate = this.player.powerups.rapid > 0 ? this.CONFIG.FIRE_RATE * 0.5 : this.CONFIG.FIRE_RATE;
        if (this.keys.Space && (now - this.lastShot) / 1000 > fireRate) {
            this.firePlayerBullet();
            this.lastShot = now;
        }

        // Powerup Timers
        Object.keys(this.player.powerups).forEach(k => {
            if (this.player.powerups[k] > 0) this.player.powerups[k] -= dt;
        });

        // Bullets
        this.bullets.forEach(b => b.y -= this.CONFIG.BULLET_SPEED * dt);
        this.bullets = this.bullets.filter(b => b.y > -50);

        this.enemyBullets.forEach(b => b.y += b.speed * dt);
        this.enemyBullets = this.enemyBullets.filter(b => b.y < this.CONFIG.HEIGHT + 50);

        // Enemies
        this.enemies.forEach(e => this.updateEnemy(e, dt));
        this.enemies = this.enemies.filter(e => e.alive);

        // Powerups (Loot)
        this.powerups.forEach(p => p.y += 100 * dt);
        this.powerups = this.powerups.filter(p => !p.dead && p.y < this.CONFIG.HEIGHT + 50);

        // Particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * p.decay;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        // COLLISIONS
        // Player Bullet -> Enemy
        this.bullets.forEach(b => {
            this.enemies.forEach(e => {
                if (!b.dead && e.alive && this.checkHit(b, e)) {
                    b.dead = true;
                    this.hitEnemy(e, 10);
                }
            });
        });

        // Enemy Bullet -> Player
        if (this.player.invuln <= 0) {
            this.enemyBullets.forEach(b => {
                if (!b.dead && this.checkHitCircle(b, this.player)) {
                    b.dead = true;
                    this.playerHit(10);
                }
            });

            // Enemy Ram
            this.enemies.forEach(e => {
                if (e.alive && this.checkHitCircle(e, this.player, 20)) {
                    this.hitEnemy(e, 50); // Ramming damages enemy
                    this.playerHit(20);
                }
            });
        } else {
            this.player.invuln -= dt;
        }

        // Player -> Powerup
        this.powerups.forEach(p => {
            if (!p.dead && this.checkHitCircle(p, this.player, 30)) {
                p.dead = true;
                this.collectPowerup(p);
            }
        });

        // Wave Logic
        if (this.enemies.length === 0) {
            if (this.wave < this.totalWaves) {
                this.wave++;
                this.spawnWave();
                this.spawnPowerup(this.CONFIG.WIDTH / 2, -50); // Free powerup between waves
            } else {
                this.victory();
            }
        }

        // HUD
        document.getElementById('hud-hp').innerText = Math.ceil(this.player.health);
        document.getElementById('hud-hp').style.color = this.player.health < 30 ? '#f00' : '#0f0';
        document.getElementById('hud-wave').innerText = this.wave + '/' + this.totalWaves;
        document.getElementById('hud-loot').innerText = this.loot.materials;
        document.getElementById('hud-cargo').innerText = this.loot.cargo;
    }

    // ==========================================
    // SPAWNING & AI
    // ==========================================

    spawnWave() {
        const rows = this.wave + 1;
        const cols = 6;
        const startX = (this.CONFIG.WIDTH - (cols * 60)) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const type = r === 0 && this.wave === this.totalWaves ? this.ENEMY_TYPES.CAPTAIN :
                    r % 2 === 0 ? this.ENEMY_TYPES.RAIDER : this.ENEMY_TYPES.SCOUT;

                this.enemies.push({
                    x: startX + c * 60,
                    y: -100 - r * 50,
                    targetY: 80 + r * 50,
                    startX: startX + c * 60,
                    type: type,
                    hp: type.hp * 20, // Scale HP
                    width: type.width, height: type.height,
                    alive: true,
                    state: 'enter', // enter, hover, dive
                    timer: Math.random() * 5
                });
            }
        }
    }

    updateEnemy(e, dt) {
        e.timer -= dt;

        if (e.state === 'enter') {
            e.y += 200 * dt;
            if (e.y >= e.targetY) {
                e.y = e.targetY;
                e.state = 'hover';
            }
        }
        else if (e.state === 'hover') {
            e.x = e.startX + Math.sin(Date.now() * 0.002 + e.startX) * 30;
            if (e.timer <= 0 && Math.random() < 0.05) {
                e.state = 'dive';
            }
            if (Math.random() < 0.005) this.enemyShoot(e);
        }
        else if (e.state === 'dive') {
            e.y += 200 * dt;
            // Seek player slightly
            if (e.x < this.player.x) e.x += 100 * dt;
            else e.x -= 100 * dt;

            if (e.y > this.CONFIG.HEIGHT) {
                e.y = -50;
                e.state = 'enter';
                e.timer = Math.random() * 5 + 2;
            }
        }
    }

    enemyShoot(e) {
        this.enemyBullets.push({
            x: e.x, y: e.y + 20,
            speed: 300,
            radius: 5
        });
        this.playSound('enemyShoot');
    }

    hitEnemy(e, dmg) {
        e.hp -= dmg;
        this.playSound('hit');
        this.spawnExplosion(e.x, e.y, 5, '#ffa');

        if (e.hp <= 0) {
            e.alive = false;
            this.playSound('explosion');
            this.spawnExplosion(e.x, e.y, 20, '#f80');

            this.loot.materials += e.type.matDrop;
            this.loot.cargo += e.type.cargoDrop;

            // Drop Powerup?
            if (Math.random() < 0.1) this.spawnPowerup(e.x, e.y);
        }
    }

    firePlayerBullet() {
        const spread = this.player.powerups.triple > 0 ? 3 : 1;

        for (let i = 0; i < spread; i++) {
            const offset = (i - (spread - 1) / 2) * 10;
            this.bullets.push({
                x: this.player.x + offset,
                y: this.player.y - 20,
                radius: 3,
                vx: offset * 5 // slight spread angle
            });
        }
        this.playSound('shoot');
    }

    spawnPowerup(x, y) {
        const type = this.POWERUP_TYPES[Math.floor(Math.random() * this.POWERUP_TYPES.length)];
        this.powerups.push({
            x: x, y: y,
            id: type.id, icon: type.icon,
            color: type.color,
            dead: false
        });
    }

    collectPowerup(p) {
        this.playSound('powerup');
        if (p.id === 'heal') {
            this.player.health = Math.min(100, this.player.health + 30);
        } else {
            this.player.powerups[p.id] = 10; // 10 seconds duration
        }
    }

    // ==========================================
    // UTILS
    // ==========================================

    checkHit(circle, rect) {
        // Simple AABB for now for speed
        return (circle.x > rect.x - rect.width / 2 && circle.x < rect.x + rect.width / 2 &&
            circle.y > rect.y - rect.height / 2 && circle.y < rect.y + rect.height / 2);
    }

    checkHitCircle(c1, c2, buffer = 0) {
        const dx = c1.x - c2.x;
        const dy = c1.y - c2.y;
        const r = (c1.radius || 5) + (c2.radius || 20) + buffer;
        return (dx * dx + dy * dy) < r * r;
    }

    spawnExplosion(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.5,
                decay: 2,
                color: color
            });
        }
    }

    playerHit(dmg) {
        if (this.player.powerups.shield > 0) {
            this.playSound('shield');
            return;
        }
        this.player.health -= dmg;
        this.player.invuln = 1.0;
        this.playSound('damage');
        this.spawnExplosion(this.player.x, this.player.y, 10, '#f00');

        if (this.player.health <= 0) {
            this.state = 'gameover';
            document.getElementById('screen-gameover').style.display = 'flex';
        }
    }

    victory() {
        this.state = 'victory';
        document.getElementById('screen-victory').style.display = 'flex';
        document.getElementById('victory-stats').innerHTML = `
            <div>Salvage: ${this.loot.materials}</div>
            <div>Cargo Seized: ${this.loot.cargo}</div>
            <div>Hull Integrity: ${this.player.health}%</div>
        `;
    }

    finish(success) {
        this.destroy();
        if (this.onComplete) {
            this.onComplete({
                success: success,
                loot: this.loot,
                hullDamage: 100 - this.player.health
            });
        }
    }

    // ==========================================
    // DRAWING
    // ==========================================

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.CONFIG.WIDTH, this.CONFIG.HEIGHT);

        // Stars
        ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });

        // Powerups
        this.powerups.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.font = '24px Arial';
            ctx.fillText(p.icon, p.x - 10, p.y + 8);
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Enemies
        this.enemies.forEach(e => {
            ctx.save();
            ctx.translate(e.x, e.y);

            // Simple detailed ship
            ctx.fillStyle = e.type === this.ENEMY_TYPES.CAPTAIN ? '#f44' : (e.type === this.ENEMY_TYPES.RAIDER ? '#4af' : '#4f4');
            ctx.beginPath();
            ctx.moveTo(0, e.height / 2);
            ctx.lineTo(e.width / 2, -e.height / 2);
            ctx.lineTo(0, -e.height / 2 + 10);
            ctx.lineTo(-e.width / 2, -e.height / 2);
            ctx.fill();

            // Engine glow
            ctx.fillStyle = '#fff';
            ctx.fillRect(-2, -e.height / 2 - 5, 4, 5);

            ctx.restore();
        });

        // Bullets
        ctx.fillStyle = '#4f4';
        this.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 5, 4, 10));

        ctx.fillStyle = '#f44';
        this.enemyBullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Player
        if (this.player.health > 0) {
            ctx.save();
            ctx.translate(this.player.x, this.player.y);

            // Shield
            if (this.player.powerups.shield > 0) {
                ctx.strokeStyle = '#4af';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Ship
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(15, 15);
            ctx.lineTo(0, 10);
            ctx.lineTo(-15, 15);
            ctx.fill();

            // Engine
            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.moveTo(-5, 15);
            ctx.lineTo(0, 25 + Math.random() * 5);
            ctx.lineTo(5, 15);
            ctx.fill();

            ctx.restore();
        }

        // Particles
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        });
        ctx.globalAlpha = 1;
    }

    // ==========================================
    // AUDIO
    // ==========================================

    initAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } catch (e) { }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;

        switch (type) {
            case 'shoot':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;
            case 'enemyShoot':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;
            case 'hit':
                osc.type = 'noise';
                // Mock noise
                osc.frequency.setValueAtTime(100, t);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;
            case 'powerup':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.linearRampToValueAtTime(880, t + 0.2);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t); osc.stop(t + 0.2);
                break;
        }
    }

    bindInput() {
        this._down = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            this.keys[e.key] = true;
            this.keys[e.code] = true; // Handle both
        };
        this._up = (e) => {
            this.keys[e.key] = false;
            this.keys[e.code] = false;
        };
        window.addEventListener('keydown', this._down);
        window.addEventListener('keyup', this._up);
    }

    unbindInput() {
        window.removeEventListener('keydown', this._down);
        window.removeEventListener('keyup', this._up);
    }
}

window.PirateMinigame = PirateMinigame;
export default PirateMinigame;
