import { Utils } from './utils.js';

// ============================================================================
// ASTEROID RUN - NEBULA ESCAPE (Ported for Ad Astra)
// ============================================================================

const CONFIG = {
    // Canvas size will be dynamic based on overlay
    SHIP_SPEED: 320,
    SHIP_FOCUS_SPEED: 160,
    BULLET_SPEED: 700,
    SCROLL_SPEED: 80,
    MAX_BULLETS: 20,
    FIRE_RATE: 0.15,
    RAPID_FIRE_RATE: 0.06,
    MAX_HEALTH: 100,
    COMBO_TIMEOUT: 2
};

const LEVELS = [
    { name: "OUTER RIM", distance: 3000, asteroidRate: 0.03, maxAsteroids: 10, speedMod: 1, bossName: "ROCK TITAN", bossHP: 50, color: '#4488ff', gravityWells: false, iceChance: 0, fireChance: 0 },
    { name: "DEBRIS FIELD", distance: 4000, asteroidRate: 0.04, maxAsteroids: 14, speedMod: 1.15, bossName: "IRON GOLEM", bossHP: 75, color: '#ff8844', gravityWells: false, iceChance: 0.1, fireChance: 0 },
    { name: "CRYSTAL ZONE", distance: 5000, asteroidRate: 0.045, maxAsteroids: 16, speedMod: 1.3, bossName: "CRYSTAL HYDRA", bossHP: 100, color: '#ff44ff', gravityWells: false, iceChance: 0.3, fireChance: 0 },
    { name: "VOID SECTOR", distance: 6000, asteroidRate: 0.05, maxAsteroids: 18, speedMod: 1.45, bossName: "VOID LEVIATHAN", bossHP: 150, color: '#44ffff', gravityWells: false, iceChance: 0.15, fireChance: 0.15 },
    { name: "CORE BREACH", distance: 8000, asteroidRate: 0.055, maxAsteroids: 20, speedMod: 1.6, bossName: "NEBULA EMPEROR", bossHP: 200, color: '#ffff44', gravityWells: false, iceChance: 0.1, fireChance: 0.2 }
];

const POWERUP_TYPES = [
    { id: 'shield', icon: '🛡️', color: '#44aaff', duration: 8, chance: 0.15 },
    { id: 'rapid', icon: '⚡', color: '#ffff44', duration: 10, chance: 0.2 },
    { id: 'triple', icon: '🔱', color: '#ff44ff', duration: 8, chance: 0.15 },
    { id: 'magnet', icon: '🧲', color: '#ff4444', duration: 12, chance: 0.15 },
    { id: 'heal', icon: '💚', color: '#44ff44', duration: 0, chance: 0.2 },
    { id: 'bomb', icon: '💣', color: '#ff8844', duration: 0, chance: 0.12 },
    { id: 'extend', icon: '⏱️', color: '#ff88ff', duration: 0, chance: 0.03 }
];

// Helper Classes
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 10;
        this.dead = false;
        this.hp = 1;
        this.maxHP = 1;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}

class Bullet extends Entity {
    constructor(x, y, angle = -Math.PI / 2, speed = 700) {
        super(x, y);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = 4;
        this.life = 2;
        this.color = '#ffff88';
    }
    update(dt) {
        super.update(dt);
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x - this.vx * 0.02, this.y - this.vy * 0.02);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.015, this.y - this.vy * 0.015);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class NebulaCloud {
    constructor(w, h, levelColor) {
        this.w = w; this.h = h;
        this.reset(levelColor);
        this.y = Math.random() * h;
    }
    reset(levelColor) {
        this.x = Math.random() * this.w;
        this.y = -200;
        this.radius = Math.random() * 150 + 100;
        this.color = levelColor || '#4488ff';
        this.alpha = Math.random() * 0.1 + 0.02;
        this.speed = Math.random() * 10 + 5;
    }
    update(dt) {
        this.y += this.speed * dt;
        if (this.y > this.h + this.radius) this.reset(this.color);
    }
    draw(ctx) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color + Math.floor(this.alpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }
}

class Asteroid {
    constructor(w, h, yStart = null, sizeClass = null, xPos = null, levelSpeedMod = 1, levelConfig = {}) {
        this.sizeClass = sizeClass || (Math.random() < 0.15 ? 3 : Math.random() < 0.4 ? 2 : 1);
        this.radius = this.sizeClass * 18 + 12;
        this.hp = this.sizeClass * 3;
        this.maxHP = this.hp;
        this.x = xPos !== null ? xPos : Math.random() * (w - 60) + 30;
        this.y = yStart !== null ? yStart : -this.radius - 20;
        this.w = w; this.h = h;

        this.vy = (Math.random() * 60 + CONFIG.SCROLL_SPEED) * levelSpeedMod;
        this.vx = (Math.random() - 0.5) * 60;
        this.rotSpeed = (Math.random() - 0.5) * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.dead = false;

        this.vertices = [];
        const numVerts = 7 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numVerts; i++) {
            this.vertices.push({ angle: (i / numVerts) * Math.PI * 2, r: 0.7 + Math.random() * 0.5 });
        }

        const iceChance = levelConfig.iceChance || 0;
        const fireChance = levelConfig.fireChance || 0;
        const rand = Math.random();
        if (rand < iceChance) this.type = 'ice';
        else if (rand < iceChance + fireChance) this.type = 'fire';
        else if (Math.random() < 0.3) this.type = 'metal';
        else this.type = 'rock';

        this.craters = [];
        for (let i = 0; i < this.sizeClass + 1; i++) {
            this.craters.push({ x: (Math.random() - 0.5) * this.radius * 0.8, y: (Math.random() - 0.5) * this.radius * 0.8, r: Math.random() * this.radius * 0.2 + 3 });
        }
    }
    update(dt) {
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.angle += this.rotSpeed * dt;
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -0.8; }
        if (this.x > this.w - this.radius) { this.x = this.w - this.radius; this.vx *= -0.8; }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const colors = { rock: '#665544', ice: '#99ccee', metal: '#778899', fire: '#cc4400' };

        ctx.fillStyle = colors[this.type];
        ctx.strokeStyle = '#rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this.vertices.forEach((v, i) => {
            const px = Math.cos(v.angle) * this.radius * v.r;
            const py = Math.sin(v.angle) * this.radius * v.r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.craters.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
    }
}

// Particle System
class Particle {
    constructor(x, y, color, size, speed) {
        this.x = x; this.y = y; this.color = color;
        this.size = size; this.life = 1.0;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt * 1.5;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Powerup extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type;
        this.vy = 60;
        this.radius = 15;
        this.pulse = 0;
    }
    update(dt) { super.update(dt); this.pulse += dt * 5; }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const scale = 1 + Math.sin(this.pulse) * 0.1;
        ctx.scale(scale, scale);
        ctx.shadowBlur = 10; ctx.shadowColor = this.type.color;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeStyle = this.type.color;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 1);
        ctx.restore();
    }
    attractTo(tx, ty, dt) {
        const dx = tx - this.x; const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
            this.x += (dx / dist) * 400 * dt; this.y += (dy / dist) * 400 * dt;
        }
    }
}

class Loot extends Entity {
    constructor(x, y, value = 1) {
        super(x, y);
        this.value = value;
        this.vy = 40;
        this.radius = 8;
        this.color = '#ffdd44';
    }
    update(dt) { super.update(dt); }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
        ctx.fill();
        ctx.restore();
    }
    attractTo(tx, ty, dt) {
        const dx = tx - this.x; const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
            this.x += (dx / dist) * 500 * dt; this.y += (dy / dist) * 500 * dt;
        }
    }
}

// Boss Class Simplified
class Boss extends Entity {
    constructor(level, w, h) {
        super(w / 2, -100);
        const config = LEVELS[level];
        this.name = config.bossName;
        this.maxHP = config.bossHP;
        this.hp = this.maxHP;
        this.targetY = 120;
        this.radius = 60;
        this.phase = 0;
        this.w = w;
        this.color = config.color;
    }
    update(dt) {
        if (this.y < this.targetY) this.y += 50 * dt;
        this.phase += dt;
        this.x = this.w / 2 + Math.sin(this.phase) * 150;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20; ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        // Inner
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    hit(dmg) {
        this.hp -= dmg;
        return true;
    }
}

// MAIN MINIGAME CLASS
export default class AsteroidMinigame {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.canvas = null;
        this.ctx = null;
        this.overlay = null;
        this.loopId = null;

        // Game State
        this.player = null;
        this.bullets = [];
        this.asteroids = [];
        this.powerups = [];
        this.loots = [];
        this.particles = [];
        this.nebulaClouds = [];

        this.details = {
            score: 0,
            sector: 0,
            loot: { ore: 0, rare: 0, biomass: 0 }
        };

        this.keys = {};
        this.width = 0;
        this.height = 0;

        this.boundHandleKey = this.handleKey.bind(this);
    }

    start(difficulty = 1, onComplete) {
        this.active = true;
        this.onComplete = onComplete;

        // Setup UI
        this.createOverlay();

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Init Game
        let levelIdx = Math.max(0, Math.min(Math.floor(((difficulty || 1) - 1) / 2), LEVELS.length - 1));
        this.currentLevel = LEVELS[levelIdx];
        this.distanceRemaining = this.currentLevel.distance;
        this.boss = null;
        this.bombs = 1;

        this.player = {
            x: this.width / 2,
            y: this.height - 120,
            radius: 20,
            width: 40, height: 50,
            health: 100,
            fireTimer: 0,
            thrustTimer: 0,
            thrustTrail: [],
            powerups: { shield: 0, rapid: 0, triple: 0, magnet: 0 }
        };

        this.bullets = [];
        this.asteroids = [];
        this.powerups = [];
        this.loots = [];
        this.particles = [];
        this.nebulaClouds = [];
        for (let i = 0; i < 5; i++) this.nebulaClouds.push(new NebulaCloud(this.width, this.height, this.currentLevel.color));

        window.addEventListener('keydown', this.boundHandleKey);
        window.addEventListener('keyup', this.boundHandleKey);

        this.game.audio.playMusic('asteroid-run'); // Assuming mapped in audio.js, else try file

        this.lastTime = performance.now();
        this.loop();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 2000; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.width = Math.min(window.innerWidth - 40, 700);
        this.canvas.height = Math.min(window.innerHeight - 40, 850);
        this.canvas.style.border = '2px solid #0ff';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.ctx = this.canvas.getContext('2d');

        // HUD
        this.hud = document.createElement('div');
        this.hud.style.cssText = 'position: absolute; top: 20px; color: #fff; font-family: monospace; font-size: 16px; width: 100%; text-align: center; pointer-events: none;';
        this.hud.innerHTML = '<div id="am-score">SCORE: 0</div><div id="am-health">HULL: 100%</div><div id="am-dist">DIST: 100%</div>';

        this.overlay.appendChild(this.canvas);
        this.overlay.appendChild(this.hud);
        document.body.appendChild(this.overlay);
    }

    handleKey(e) {
        if (e.type === 'keydown') this.keys[e.code] = true;
        if (e.type === 'keyup') this.keys[e.code] = false;

        if (e.code === 'KeyB' && e.type === 'keydown') this.useBomb();
        if (e.code === 'Escape' && e.type === 'keydown') this.finish(false);
    }

    finish(success) {
        this.active = false;
        cancelAnimationFrame(this.loopId);
        window.removeEventListener('keydown', this.boundHandleKey);
        window.removeEventListener('keyup', this.boundHandleKey);

        if (this.overlay) document.body.removeChild(this.overlay);

        // Switch back main game music
        this.game.audio.playMusic('exploration');

        if (this.onComplete) {
            this.onComplete({
                success,
                survived: success, // Compatibility
                score: Math.floor(this.details.score),
                loot: this.details.loot
            });
        }
    }

    useBomb() {
        if (this.bombs <= 0) return;
        this.bombs--;
        this.game.audio.playSfx('explosion'); // Fallback

        // Clear screen
        this.asteroids.forEach(a => {
            a.dead = true;
            this.details.score += 50;
            this.details.loot.ore += a.sizeClass;
            this.explode(a.x, a.y, '#ff8844', 10);
        });
        if (this.boss) { this.boss.hp -= 50; }
    }

    explode(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, Math.random() * 3 + 2, Math.random() * 150 + 50));
        }
    }

    loop() {
        if (!this.active) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.loopId = requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        // Player Input
        let speed = CONFIG.SHIP_SPEED;
        if (this.keys['ShiftLeft']) speed = CONFIG.SHIP_FOCUS_SPEED;
        if (this.keys['ArrowLeft']) this.player.x -= speed * dt;
        if (this.keys['ArrowRight']) this.player.x += speed * dt;
        if (this.keys['ArrowUp']) this.player.y -= speed * dt;
        if (this.keys['ArrowDown']) this.player.y += speed * dt;

        // Clamp
        this.player.x = Math.max(20, Math.min(this.width - 20, this.player.x));
        this.player.y = Math.max(50, Math.min(this.height - 20, this.player.y));

        // Fire
        this.player.fireTimer -= dt;
        const isFiring = this.keys['Space'];
        if (isFiring && this.player.fireTimer <= 0) {
            const isRapid = this.player.powerups.rapid > 0;
            this.player.fireTimer = isRapid ? CONFIG.RAPID_FIRE_RATE : CONFIG.FIRE_RATE;
            this.game.audio.playSfx(isRapid ? 'shoot' : 'laser');

            this.bullets.push(new Bullet(this.player.x, this.player.y - 25));
            if (this.player.powerups.triple > 0) {
                this.bullets.push(new Bullet(this.player.x - 10, this.player.y - 20, -Math.PI / 2 - 0.2));
                this.bullets.push(new Bullet(this.player.x + 10, this.player.y - 20, -Math.PI / 2 + 0.2));
            }
        }

        // Updates
        this.nebulaClouds.forEach(n => n.update(dt));
        this.bullets.forEach(b => b.update(dt));
        this.asteroids.forEach(a => a.update(dt));
        this.powerups.forEach(p => { p.update(dt); if (this.player.powerups.magnet > 0) p.attractTo(this.player.x, this.player.y, dt); });
        this.loots.forEach(l => { l.update(dt); if (this.player.powerups.magnet > 0) l.attractTo(this.player.x, this.player.y, dt); });
        this.particles.forEach(p => p.update(dt));
        if (this.boss) this.boss.update(dt);

        // Spawning
        if (!this.boss && this.distanceRemaining > 0) {
            this.distanceRemaining -= CONFIG.SCROLL_SPEED * dt;
            if (Math.random() < this.currentLevel.asteroidRate && this.asteroids.length < this.currentLevel.maxAsteroids) {
                this.asteroids.push(new Asteroid(this.width, this.height, null, null, null, this.currentLevel.speedMod, this.currentLevel));
            }
            if (this.distanceRemaining <= 0) {
                this.boss = new Boss(0, this.width, this.height); // Reuse first boss logic for now
                // this.game.audio.playMusic('boss');
            }
        }

        // Collisions
        // Bullet vs Asteroid
        this.bullets.forEach(b => {
            if (b.dead) return;
            this.asteroids.forEach(a => {
                if (a.dead) return;
                const dist = Math.hypot(b.x - a.x, b.y - a.y);
                if (dist < a.radius) {
                    b.dead = true;
                    a.hp--;
                    if (a.hp <= 0) {
                        a.dead = true;
                        this.details.score += a.sizeClass * 50;
                        this.details.loot.ore += a.sizeClass; // Ore
                        this.explode(a.x, a.y, '#aa8855', 8);
                        this.game.audio.playSfx('explosion');
                        if (Math.random() < 0.2) this.loots.push(new Loot(a.x, a.y, a.sizeClass));
                        if (Math.random() < 0.1) this.powerups.push(new Powerup(a.x, a.y, POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]));
                    } else {
                        this.game.audio.playSfx('hit');
                    }
                }
            });
            if (this.boss && !b.dead) {
                if (Math.hypot(b.x - this.boss.x, b.y - this.boss.y) < this.boss.radius) {
                    b.dead = true;
                    this.boss.hit(1);
                    this.explode(b.x, b.y, '#f00', 3);
                    if (this.boss.hp <= 0) {
                        this.explode(this.boss.x, this.boss.y, '#fff', 50);
                        setTimeout(() => this.finish(true), 2000);
                        this.boss = null;
                        this.distanceRemaining = -1;
                    }
                }
            }
        });

        // Player vs Asteroid
        this.asteroids.forEach(a => {
            if (a.dead) return;
            if (Math.hypot(this.player.x - a.x, this.player.y - a.y) < this.player.radius + a.radius) {
                a.dead = true;
                if (this.player.powerups.shield > 0) {
                    this.player.powerups.shield = 0;
                } else {
                    this.player.health -= 20;
                    this.game.audio.playSfx('damage');
                }
                this.explode(a.x, a.y, '#f00', 10);
            }
        });

        // Player vs Powerup
        this.powerups.forEach(p => {
            if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < 30) {
                p.dead = true;
                this.activatePowerup(p.type);
            }
        });

        // Player vs Loot
        this.loots.forEach(l => {
            if (Math.hypot(this.player.x - l.x, this.player.y - l.y) < 30) {
                l.dead = true;
                this.details.score += l.value * 25;
                this.details.loot.ore += l.value;
                this.game.audio.playSfx('collect');
            }
        });

        // Cleanup
        this.bullets = this.bullets.filter(e => !e.dead && e.y > -50);
        this.asteroids = this.asteroids.filter(e => !e.dead && e.y < this.height + 100);
        this.powerups = this.powerups.filter(e => !e.dead && e.y < this.height + 50);
        this.loots = this.loots.filter(e => !e.dead && e.y < this.height + 50);
        this.particles = this.particles.filter(e => e.life > 0);

        // Powerup timers
        for (let k in this.player.powerups) {
            if (this.player.powerups[k] > 0) this.player.powerups[k] -= dt;
        }

        // Check Death
        if (this.player.health <= 0) {
            this.finish(false);
        }

        // Update HUD
        document.getElementById('am-score').textContent = `SCORE: ${Math.floor(this.details.score)}`;
        document.getElementById('am-health').textContent = `HULL: ${Math.floor(this.player.health)}%`;
        if (this.distanceRemaining > 0)
            document.getElementById('am-dist').textContent = `DIST: ${Math.floor(this.distanceRemaining)}`;
        else if (this.boss)
            document.getElementById('am-dist').textContent = `BOSS HP: ${Math.floor(this.boss.hp)}`;
    }

    activatePowerup(type) {
        this.game.audio.playSfx('powerup');
        if (type.id === 'heal') this.player.health = Math.min(100, this.player.health + 30);
        else if (type.id === 'bomb') this.bombs++;
        else this.player.powerups[type.id] = type.duration;
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);

        this.nebulaClouds.forEach(n => n.draw(ctx));

        // Player
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        if (this.player.powerups.shield > 0) {
            ctx.strokeStyle = '#0ff'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#0ff';
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(15, 20); ctx.lineTo(0, 10); ctx.lineTo(-15, 20); ctx.fill();
        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
        this.asteroids.forEach(a => a.draw(ctx));
        this.powerups.forEach(p => p.draw(ctx));
        this.loots.forEach(l => l.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
        if (this.boss) this.boss.draw(ctx);
    }
}