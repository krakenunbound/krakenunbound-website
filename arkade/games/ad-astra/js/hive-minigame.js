import { Utils } from './utils.js';

// ============================================================================
// HIVE ASSAULT (Ported for Ad Astra)
// Horizontal shooter - destroying alien hives
// ============================================================================

const CONFIG = {
    PLAYER_SPEED: 280,
    BULLET_SPEED: 500,
    FIRE_RATE: 0.15,
    PRIMARY: '#a0f',
    ACCENT: '#f0a',
    GLOW: '#0f8'
};

const LEVELS = [
    { hives: 1, droneChance: 0.1, spawnRate: 3.5, speedMod: 1.0, hiveHp: 5 },
    { hives: 2, droneChance: 0.15, spawnRate: 3.2, speedMod: 1.05, hiveHp: 6 },
    { hives: 2, droneChance: 0.2, spawnRate: 3.0, speedMod: 1.1, hiveHp: 7 },
    { hives: 3, droneChance: 0.25, spawnRate: 2.8, speedMod: 1.15, hiveHp: 8 },
    { hives: 0, droneChance: 0.3, spawnRate: 2.5, speedMod: 1.2, hiveHp: 0, boss: true } // Simplified level structure for minigame
];

const POWERUP_TYPES = [
    { id: 'shield', name: 'SHIELD', icon: '🛡️', color: '#00ffff', duration: 8 },
    { id: 'rapid', name: 'RAPID FIRE', icon: '⚡', color: '#ffff00', duration: 6 },
    { id: 'triple', name: 'TRIPLE SHOT', icon: '🔱', color: '#ff00ff', duration: 7 },
    { id: 'magnet', name: 'MAGNET', icon: '🧲', color: '#ff8800', duration: 10 },
    { id: 'heal', name: 'REPAIR', icon: '💚', color: '#00ff00', duration: 0 },
    { id: 'bomb', name: 'BOMB', icon: '💣', color: '#ff4444', duration: 0 }
];

// ENTITIES
class Entity {
    constructor(x, y) {
        this.x = x; this.y = y; this.dead = false;
    }
}

class Larva extends Entity {
    constructor(x, y, speedMod = 1) {
        super(x, y);
        this.width = 20; this.height = 12; this.hp = 1;
        this.speed = (120 + Math.random() * 60) * speedMod;
        this.phase = Math.random() * Math.PI * 2;
        this.baseY = y;
        this.glowHue = 120 + Math.random() * 40;
    }
    update(dt) {
        this.phase += dt * 5;
        this.x -= this.speed * dt;
        this.y = this.baseY + Math.sin(this.phase) * 30;
        if (this.x < -50) this.dead = true;
    }
    draw(ctx) {
        ctx.fillStyle = `hsl(${this.glowHue}, 70%, 50%)`;
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
}

class Drone extends Entity {
    constructor(x, y, player, speedMod = 1) {
        super(x, y);
        this.player = player;
        this.width = 35; this.height = 35; this.hp = 2;
        this.speed = (60 + Math.random() * 30) * speedMod;
        this.phase = Math.random() * Math.PI * 2;
        this.shootTimer = Math.random() * 2 + 1;
        this.glowHue = 280 + Math.random() * 40;
    }
    update(dt, bullets) {
        this.phase += dt * 1.5;
        this.x -= this.speed * dt;
        this.y += Math.sin(this.phase) * 30 * dt;

        // Shoot
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x > 50 && !this.player.dead) {
            this.shoot(bullets);
            this.shootTimer = 2 + Math.random() * 2;
        }
        if (this.x < -50) this.dead = true;
    }
    shoot(bullets) {
        bullets.push({ x: this.x - 15, y: this.y, vx: -180, vy: 0, enemy: true, size: 6 });
    }
    draw(ctx) {
        ctx.fillStyle = `hsl(${this.glowHue}, 60%, 50%)`;
        ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI * 2); ctx.fill();
    }
}

class Hive extends Entity {
    constructor(x, y, hp) {
        super(x, y);
        this.radius = 40; this.hp = hp; this.maxHp = hp;
        this.spawnTimer = 2;
    }
    update(dt, aliens, levelData, player) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            const spawnY = this.y + (Math.random() - 0.5) * 40;
            if (Math.random() < levelData.droneChance) aliens.push(new Drone(this.x - 30, spawnY, player));
            else aliens.push(new Larva(this.x - 30, spawnY));
            this.spawnTimer = levelData.spawnRate;
        }
    }
    draw(ctx) {
        ctx.fillStyle = '#a0f';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        // Health
        const hPct = this.hp / this.maxHp;
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 20, this.y - 50, 40 * hPct, 5);
    }
}

class SwarmQueen extends Entity {
    constructor(w, h) {
        super(w - 120, h / 2);
        this.w = w; this.h = h;
        this.width = 120; this.height = 150; this.hp = 100; this.maxHp = 100;
        this.phase = 0; this.moveTimer = 0; this.targetY = this.y;
        this.attackTimer = 2;
    }
    update(dt, aliens, bullets, player) {
        this.phase += dt;
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.targetY = 100 + Math.random() * (this.h - 200);
            this.moveTimer = 2 + Math.random() * 2;
        }
        this.y += (this.targetY - this.y) * dt;

        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI + (i - 2) * 0.2;
                bullets.push({ x: this.x - 50, y: this.y, vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200, enemy: true, size: 8 });
            }
            this.attackTimer = 2;
        }
    }
    draw(ctx) {
        ctx.fillStyle = '#f0a';
        ctx.beginPath(); ctx.arc(this.x, this.y, 60, 0, Math.PI * 2); ctx.fill();
    }
}

export default class HiveMinigame {
    constructor(game) {
        this.game = game;
        this.active = false;

        this.player = null;
        this.playerBullets = [];
        this.alienBullets = [];
        this.aliens = [];
        this.hives = [];
        this.loot = [];
        this.powerups = [];
        this.particles = [];
        this.boss = null;

        this.keys = {};
        this.loopId = null;

        this.details = { score: 0, biomass: 0, tech: 0 };
    }

    start(difficulty = 1, onComplete) {
        this.active = true;
        this.onComplete = onComplete;

        // Setup Overlay
        this.createOverlay();
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Init properties
        this.player = {
            x: 100, y: this.height / 2, width: 45, height: 30, radius: 20,
            health: 100, fireTimer: 0, powerups: { shield: 0, rapid: 0, triple: 0, magnet: 0 }
        };

        this.playerBullets = [];
        this.alienBullets = [];
        this.aliens = [];
        this.hives = [];
        this.loot = [];
        this.powerups = [];
        this.particles = [];
        this.boss = null;

        // Init Level
        let lvlIdx = Math.min(difficulty, LEVELS.length - 1);
        this.currentLevel = LEVELS[lvlIdx];

        if (this.currentLevel.boss) {
            this.boss = new SwarmQueen(this.width, this.height);
            this.game.audio.playMusic('hive-assault-boss');
        } else {
            for (let i = 0; i < this.currentLevel.hives; i++) {
                const hx = this.width - 100 - Math.random() * 50;
                const hy = 80 + (i * ((this.height - 160) / Math.max(1, this.currentLevel.hives - 1)));
                this.hives.push(new Hive(hx, hy, this.currentLevel.hiveHp));
            }
            this.game.audio.playMusic('hive-assault');
        }

        window.addEventListener('keydown', this.handleKey.bind(this));
        window.addEventListener('keyup', this.handleKey.bind(this));

        this.lastTime = performance.now();
        this.loop();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:2000;display:flex;align-items:center;justify-content:center;`;
        this.canvas = document.createElement('canvas');
        this.canvas.width = Math.min(window.innerWidth - 40, 900);
        this.canvas.height = Math.min(window.innerHeight - 40, 600);
        this.canvas.style.border = '2px solid #a0f';
        this.ctx = this.canvas.getContext('2d');
        this.overlay.appendChild(this.canvas);
        document.body.appendChild(this.overlay);
    }

    handleKey(e) {
        this.keys[e.code] = (e.type === 'keydown');
        if (e.code === 'Escape' && e.type === 'keydown') this.finish(false);
    }

    finish(success) {
        this.active = false;
        cancelAnimationFrame(this.loopId);
        if (this.overlay) document.body.removeChild(this.overlay);
        this.game.audio.playMusic('exploration');
        if (this.onComplete) this.onComplete({ success, survived: success, score: this.details.score, loot: { biomass: this.details.biomass, tech: this.details.tech } });
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
        const speed = CONFIG.PLAYER_SPEED;
        if (this.keys['ArrowLeft']) this.player.x -= speed * dt;
        if (this.keys['ArrowRight']) this.player.x += speed * dt;
        if (this.keys['ArrowUp']) this.player.y -= speed * dt;
        if (this.keys['ArrowDown']) this.player.y += speed * dt;
        this.player.x = Math.max(20, Math.min(this.width / 2, this.player.x));
        this.player.y = Math.max(30, Math.min(this.height - 30, this.player.y));

        // Shoot
        this.player.fireTimer -= dt;
        if (this.keys['Space'] && this.player.fireTimer <= 0) {
            this.player.fireTimer = CONFIG.FIRE_RATE;
            this.playerBullets.push({ x: this.player.x + 20, y: this.player.y, vx: CONFIG.BULLET_SPEED, vy: 0 });
            this.game.audio.playSfx('laser');
        }

        // Updates
        this.playerBullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
        this.alienBullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });

        this.aliens.forEach(a => a.update(dt, this.alienBullets));
        this.hives.forEach(h => h.update(dt, this.aliens, this.currentLevel, this.player));
        if (this.boss) this.boss.update(dt, this.aliens, this.alienBullets, this.player);

        this.particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; });
        this.particles = this.particles.filter(p => p.life > 0);

        // Collisions
        // Player Bullets vs Hives/Aliens/Boss
        this.playerBullets.forEach(b => {
            if (b.dead) return;
            // Vs Hives
            this.hives.forEach(h => {
                if (Math.hypot(b.x - h.x, b.y - h.y) < h.radius) {
                    b.dead = true; h.hp--;
                    if (h.hp <= 0) {
                        this.killHive(h);
                    }
                }
            });
            // Vs Aliens
            this.aliens.forEach(a => {
                if (Math.hypot(b.x - a.x, b.y - a.y) < 15) {
                    b.dead = true; a.dead = true;
                    this.killAlien(a);
                }
            });
            // Vs Boss
            if (this.boss && Math.hypot(b.x - this.boss.x, b.y - this.boss.y) < 60) {
                b.dead = true; this.boss.hp--;
                if (this.boss.hp <= 0) {
                    this.finish(true);
                }
            }
        });

        // Player vs Alien Bullets
        this.alienBullets.forEach(b => {
            if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < 15) {
                b.dead = true;
                this.player.health -= 10;
                this.game.audio.playSfx('damage');
            }
        });

        // Cleanup and Win Check
        this.aliens = this.aliens.filter(a => !a.dead);
        this.hives = this.hives.filter(h => h.hp > 0);
        this.playerBullets = this.playerBullets.filter(b => !b.dead && b.x < this.width);
        this.alienBullets = this.alienBullets.filter(b => !b.dead && b.x > 0);

        if (!this.boss && this.hives.length === 0 && this.aliens.length === 0) {
            setTimeout(() => this.finish(true), 1000);
        }

        if (this.player.health <= 0) this.finish(false);
    }

    killHive(h) {
        this.details.biomass += 5;
        this.details.score += 500;
        this.explode(h.x, h.y, '#a0f', 20);
        this.game.audio.playSfx('explosion');
    }

    killAlien(a) {
        this.details.score += 50;
        this.game.audio.playSfx('hit');
    }

    explode(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = Math.random() * 100 + 50;
            this.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, color, life: 1.0 });
        }
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#102'; ctx.fillRect(0, 0, this.width, this.height);

        // Player
        ctx.fillStyle = '#0ff'; ctx.beginPath(); ctx.moveTo(this.player.x + 20, this.player.y); ctx.lineTo(this.player.x - 20, this.player.y - 15); ctx.lineTo(this.player.x - 20, this.player.y + 15); ctx.fill();

        this.hives.forEach(h => h.draw(ctx));
        this.aliens.forEach(a => a.draw(ctx));
        if (this.boss) this.boss.draw(ctx);

        ctx.fillStyle = '#ff0'; this.playerBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#f0a'; this.alienBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill(); });

        this.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
        ctx.fillText(`SCORE: ${this.details.score}`, 20, 30);
        ctx.fillText(`HULL: ${this.player.health}%`, 20, 50);
        ctx.fillText(`BIOMASS: ${this.details.biomass}`, 20, 70);
    }
}
