// ============================================================================
// ASTEROID RUN - NEBULA ESCAPE
// Game-specific logic (uses shared modules)
// ============================================================================

// ==================== CONFIGURATION ====================

const CONFIG = {
    CANVAS_WIDTH: 700,
    CANVAS_HEIGHT: 850,
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
    { name: "OUTER RIM", distance: 5000, asteroidRate: 0.03, maxAsteroids: 10, speedMod: 1, bossName: "ROCK TITAN", bossHP: 50, color: '#4488ff', gravityWells: false, iceChance: 0, fireChance: 0 },
    { name: "DEBRIS FIELD", distance: 6000, asteroidRate: 0.04, maxAsteroids: 14, speedMod: 1.15, bossName: "IRON GOLEM", bossHP: 75, color: '#ff8844', gravityWells: false, iceChance: 0.1, fireChance: 0 },
    { name: "CRYSTAL ZONE", distance: 7000, asteroidRate: 0.045, maxAsteroids: 16, speedMod: 1.3, bossName: "CRYSTAL HYDRA", bossHP: 100, color: '#ff44ff', gravityWells: false, iceChance: 0.3, fireChance: 0 },
    { name: "VOID SECTOR", distance: 8000, asteroidRate: 0.05, maxAsteroids: 18, speedMod: 1.45, bossName: "VOID LEVIATHAN", bossHP: 150, color: '#44ffff', gravityWells: false, iceChance: 0.15, fireChance: 0.15 },
    { name: "CORE BREACH", distance: 10000, asteroidRate: 0.055, maxAsteroids: 20, speedMod: 1.6, bossName: "NEBULA EMPEROR", bossHP: 200, color: '#ffff44', gravityWells: false, iceChance: 0.1, fireChance: 0.2 },
    { name: "PLASMA STORM", distance: 11000, asteroidRate: 0.06, maxAsteroids: 22, speedMod: 1.7, bossName: "STORM COLOSSUS", bossHP: 250, color: '#ff6644', gravityWells: false, iceChance: 0, fireChance: 0.4 },
    { name: "FROZEN ABYSS", distance: 12000, asteroidRate: 0.055, maxAsteroids: 20, speedMod: 1.6, bossName: "FROST TITAN", bossHP: 300, color: '#88ccff', gravityWells: false, iceChance: 0.5, fireChance: 0 },
    { name: "GRAVITY WELL", distance: 13000, asteroidRate: 0.05, maxAsteroids: 18, speedMod: 1.5, bossName: "SINGULARITY", bossHP: 350, color: '#aa44ff', gravityWells: true, iceChance: 0.15, fireChance: 0.15 },
    { name: "INFERNO RIM", distance: 14000, asteroidRate: 0.065, maxAsteroids: 24, speedMod: 1.8, bossName: "INFERNO PRIME", bossHP: 400, color: '#ff2200', gravityWells: true, iceChance: 0, fireChance: 0.6 },
    { name: "KRAKEN'S MAW", distance: 15000, asteroidRate: 0.07, maxAsteroids: 25, speedMod: 1.9, bossName: "THE KRAKEN", bossHP: 500, color: '#ff00ff', gravityWells: true, iceChance: 0.25, fireChance: 0.25 }
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

// ==================== GAME STATE ====================

// Debug modes
let godMode = false;
let infiniteBombs = false;

let currentLevel = 0;
let totalScore = 0;
let sessionScore = 0;
let totalMinerals = 0;
let sessionMinerals = 0;
let totalKills = 0;
let sessionKills = 0;
let shotsFired = 0;
let shotsHit = 0;
let maxCombo = 0;
let combo = 0;
let comboTimer = 0;
let distanceRemaining = 0;
let totalDistanceTraveled = 0;
let bossActive = false;
let boss = null;
let bombs = 1;
let gameStartTime = 0;
let bossesDefeated = 0;

const player = {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT - 120,
    width: 40,
    height: 50,
    radius: 20,
    health: CONFIG.MAX_HEALTH,
    invuln: 0,
    fireTimer: 0,
    thrustTimer: 0,
    thrustTrail: [],
    powerups: { shield: 0, rapid: 0, triple: 0, magnet: 0 }
};

// Entity arrays
let bullets = [];
let asteroids = [];
let powerups = [];
let loots = [];
let explosions = [];
let nebulaClouds = [];
let shards = [];
let gravityWells = [];

// ==================== GAME-SPECIFIC CLASSES ====================

class NebulaCloud {
    constructor() {
        this.reset();
        this.y = Math.random() * CONFIG.CANVAS_HEIGHT;
    }
    
    reset() {
        this.x = Math.random() * CONFIG.CANVAS_WIDTH;
        this.y = -200;
        this.radius = Math.random() * 150 + 100;
        this.color = LEVELS[currentLevel]?.color || '#4488ff';
        this.alpha = Math.random() * 0.1 + 0.02;
        this.speed = Math.random() * 10 + 5;
    }
    
    update(dt) {
        this.y += this.speed * dt;
        if (this.y > CONFIG.CANVAS_HEIGHT + this.radius) this.reset();
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
    constructor(yStart = null, sizeClass = null, xPos = null) {
        this.sizeClass = sizeClass || (Math.random() < 0.15 ? 3 : Math.random() < 0.4 ? 2 : 1);
        this.radius = this.sizeClass * 18 + 12;
        this.hp = this.sizeClass * 3;
        this.maxHP = this.hp;
        this.x = xPos !== null ? xPos : Math.random() * (CONFIG.CANVAS_WIDTH - 60) + 30;
        this.y = yStart !== null ? yStart : -this.radius - 20;
        
        const levelMod = LEVELS[currentLevel]?.speedMod || 1;
        this.vy = (Math.random() * 60 + CONFIG.SCROLL_SPEED) * levelMod;
        this.vx = (Math.random() - 0.5) * 60;
        this.rotSpeed = (Math.random() - 0.5) * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.dead = false;
        
        // Generate irregular shape
        this.vertices = [];
        const numVerts = 7 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numVerts; i++) {
            const angle = (i / numVerts) * Math.PI * 2;
            const variance = 0.7 + Math.random() * 0.5;
            this.vertices.push({ angle, r: variance });
        }
        
        // Determine asteroid type based on level
        const levelConfig = LEVELS[currentLevel] || {};
        const iceChance = levelConfig.iceChance || 0;
        const fireChance = levelConfig.fireChance || 0;
        const rand = Math.random();
        if (rand < iceChance) {
            this.type = 'ice';
        } else if (rand < iceChance + fireChance) {
            this.type = 'fire';
        } else if (Math.random() < 0.3) {
            this.type = 'metal';
        } else {
            this.type = 'rock';
        }
        this.craters = [];
        for (let i = 0; i < this.sizeClass + 1; i++) {
            this.craters.push({
                x: (Math.random() - 0.5) * this.radius * 0.8,
                y: (Math.random() - 0.5) * this.radius * 0.8,
                r: Math.random() * this.radius * 0.2 + 3
            });
        }
    }
    
    update(dt) {
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.angle += this.rotSpeed * dt;
        
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -0.8; }
        if (this.x > CONFIG.CANVAS_WIDTH - this.radius) { this.x = CONFIG.CANVAS_WIDTH - this.radius; this.vx *= -0.8; }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const colors = {
            rock: { fill: '#665544', stroke: '#887766', crater: '#554433' },
            ice: { fill: '#99ccee', stroke: '#bbddff', crater: '#77aacc' },
            metal: { fill: '#778899', stroke: '#99aabb', crater: '#556677' },
            fire: { fill: '#cc4400', stroke: '#ff6622', crater: '#aa2200' }
        };
        const c = colors[this.type];
        
        if (this.hp < this.maxHP) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff4400';
        }
        
        ctx.fillStyle = c.fill;
        ctx.strokeStyle = c.stroke;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            const px = Math.cos(v.angle) * this.radius * v.r;
            const py = Math.sin(v.angle) * this.radius * v.r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = c.crater;
        this.craters.forEach(cr => {
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
            ctx.fill();
        });
        
        if (this.hp < this.maxHP) {
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 1;
            const damage = 1 - (this.hp / this.maxHP);
            for (let i = 0; i < Math.floor(damage * 5) + 1; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const angle = Math.random() * Math.PI * 2;
                const len = this.radius * (0.5 + Math.random() * 0.5);
                ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

// Shards from ice/fire asteroids
class Shard {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'ice' or 'fire'
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 100;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = 6;
        this.life = 2.5; // seconds
        this.dead = false;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0 || this.y > CONFIG.CANVAS_HEIGHT + 50) {
            this.dead = true;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.type === 'ice') {
            ctx.fillStyle = '#aaddff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ccff';
        } else {
            ctx.fillStyle = '#ff6600';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3300';
        }
        
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.6, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Gravity wells - indestructible hazards that pull the player
class GravityWell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.pullRadius = 200; // Distance at which pull starts
        this.killRadius = 35;  // Instant death zone
        this.pullStrength = 300;
        this.pulse = 0;
        this.dead = false;
        this.vy = CONFIG.SCROLL_SPEED * 0.3; // Slow scroll with level
    }
    
    update(dt) {
        this.pulse += dt * 3;
        this.y += this.vy * dt;
        
        // Remove when off screen
        if (this.y > CONFIG.CANVAS_HEIGHT + this.pullRadius) {
            this.dead = true;
        }
    }
    
    // Returns pull force vector {x, y} to apply to player
    getPullForce(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.pullRadius && dist > 0) {
            const strength = (1 - dist / this.pullRadius) * this.pullStrength;
            return {
                x: (dx / dist) * strength,
                y: (dy / dist) * strength
            };
        }
        return { x: 0, y: 0 };
    }
    
    // Check if player is in kill zone
    isLethal(px, py, playerRadius) {
        const dx = this.x - px;
        const dy = this.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.killRadius + playerRadius;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Outer pull range indicator (faint)
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.pullRadius);
        gradient.addColorStop(0, 'rgba(128, 0, 255, 0.15)');
        gradient.addColorStop(0.7, 'rgba(128, 0, 255, 0.05)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.pullRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing glow
        const pulseSize = Math.sin(this.pulse) * 5;
        ctx.shadowBlur = 20 + pulseSize;
        ctx.shadowColor = '#aa00ff';
        
        // Dark core
        ctx.fillStyle = '#110022';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Purple outline
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner bright ring
        ctx.strokeStyle = '#ff88ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

class Boss {
    constructor(level) {
        const config = LEVELS[level];
        this.name = config.bossName;
        this.maxHP = config.bossHP;
        this.hp = this.maxHP;
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = -150;
        this.targetY = 120;
        this.radius = 80;
        this.angle = 0;
        this.phase = 0;
        this.phaseTimer = 0;
        this.attackTimer = 0;
        this.color = config.color;
        
        this.cores = [];
        const coreCount = Math.min(level + 2, 5);
        for (let i = 0; i < coreCount; i++) {
            const angle = (i / coreCount) * Math.PI * 2;
            this.cores.push({
                angle, dist: 50,
                hp: Math.floor(this.maxHP / coreCount),
                maxHP: Math.floor(this.maxHP / coreCount),
                alive: true
            });
        }
    }
    
    update(dt) {
        if (this.y < this.targetY) this.y += 50 * dt;
        
        this.angle += 0.3 * dt;
        this.phaseTimer += dt;
        this.attackTimer += dt;
        
        if (this.phase === 0) {
            this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.phaseTimer) * 150;
        } else if (this.phase === 1) {
            this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.phaseTimer * 2) * 200;
            this.targetY = 100 + Math.sin(this.phaseTimer * 0.5) * 30;
        }
        
        if (this.attackTimer > 2) {
            this.attackTimer = 0;
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) {
                asteroids.push(new Asteroid(-50, 1, this.x + (Math.random() - 0.5) * 100));
            }
        }
        
        const hpPercent = this.hp / this.maxHP;
        if (hpPercent < 0.5 && this.phase === 0) {
            this.phase = 1;
            this.phaseTimer = 0;
            ScreenShake.add(15);
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const gradient = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, this.radius * 1.5);
        gradient.addColorStop(0, this.color + '44');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        for (let ring = 0; ring < 3; ring++) {
            ctx.save();
            ctx.rotate(this.angle * (ring % 2 === 0 ? 1 : -1) * (ring + 1) * 0.3);
            
            const segments = 6 + ring * 2;
            const innerR = this.radius * (0.3 + ring * 0.2);
            const outerR = this.radius * (0.5 + ring * 0.2);
            
            ctx.fillStyle = ring === 0 ? '#222' : ring === 1 ? '#333' : '#444';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            
            for (let i = 0; i < segments; i++) {
                const a1 = (i / segments) * Math.PI * 2;
                const a2 = ((i + 0.8) / segments) * Math.PI * 2;
                
                ctx.beginPath();
                ctx.moveTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
                ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
                ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
                ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
        
        this.cores.forEach(core => {
            if (!core.alive) return;
            
            const cx = Math.cos(core.angle + this.angle) * core.dist;
            const cy = Math.sin(core.angle + this.angle) * core.dist;
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
            
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
            coreGrad.addColorStop(0, '#ff4444');
            coreGrad.addColorStop(0.5, '#aa0000');
            coreGrad.addColorStop(1, '#440000');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            const hpPct = core.hp / core.maxHP;
            ctx.fillStyle = `rgba(255,255,255,${hpPct * 0.5})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 8 * hpPct, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    
    hit(damage, x, y) {
        for (const core of this.cores) {
            if (!core.alive) continue;
            
            const cx = this.x + Math.cos(core.angle + this.angle) * core.dist;
            const cy = this.y + Math.sin(core.angle + this.angle) * core.dist;
            
            if (Collision.pointCircle(x, y, cx, cy, 20)) {
                core.hp -= damage;
                this.hp -= damage;
                Audio.bossHit();
                Particles.explode(x, y, '#ff4444', 5);
                
                if (core.hp <= 0) {
                    core.alive = false;
                    ScreenShake.add(10);
                    Particles.explode(cx, cy, '#ff8800', 20);
                }
                return true;
            }
        }
        return false;
    }
}

// ==================== PLAYER SHIP DRAWING ====================

function drawShip(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    if (Input.isDown('up')) {
        const gradient = ctx.createRadialGradient(0, 25, 0, 0, 25, 30);
        gradient.addColorStop(0, '#ff8800');
        gradient.addColorStop(0.5, '#ff440088');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(-15, 10, 30, 40);
        
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-8, 22);
        ctx.lineTo(0, 22 + 20 + Math.random() * 15);
        ctx.lineTo(8, 22);
        ctx.fill();
    }
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    
    ctx.fillStyle = '#1a2a3a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(18, 15);
    ctx.lineTo(12, 22);
    ctx.lineTo(5, 20);
    ctx.lineTo(0, 22);
    ctx.lineTo(-5, 20);
    ctx.lineTo(-12, 22);
    ctx.lineTo(-18, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    const cockpitGrad = ctx.createLinearGradient(0, -15, 0, 5);
    cockpitGrad.addColorStop(0, '#00ffff');
    cockpitGrad.addColorStop(1, '#004466');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#00aaaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-16, 15);
    ctx.moveTo(10, 5);
    ctx.lineTo(16, 15);
    ctx.stroke();
    
    ctx.fillStyle = '#334455';
    ctx.fillRect(-14, 15, 6, 8);
    ctx.fillRect(8, 15, 6, 8);
    
    ctx.restore();
}

// ==================== HELPER FUNCTIONS ====================

function selectPowerupType() {
    const roll = Math.random();
    let cumulative = 0;
    for (const type of POWERUP_TYPES) {
        cumulative += type.chance;
        if (roll < cumulative) return type;
    }
    return POWERUP_TYPES[0];
}

function spawnPowerup(x, y) {
    if (Math.random() < 0.25) {
        powerups.push(new Powerup(x, y, selectPowerupType()));
    }
}

function activatePowerup(type) {
    Audio.powerup();
    
    if (type.id === 'heal') {
        player.health = Math.min(player.health + 30, CONFIG.MAX_HEALTH);
        Particles.explode(player.x, player.y, '#44ff44', 20);
        Audio.voicePowerUp();
    } else if (type.id === 'bomb') {
        bombs++;
        Audio.voicePowerUp();
    } else if (type.id === 'extend') {
        // Extend all active powerups by 5 seconds
        let extended = false;
        ['shield', 'rapid', 'triple', 'magnet'].forEach(id => {
            if (player.powerups[id] > 0) {
                player.powerups[id] += 5;
                extended = true;
            }
        });
        if (extended) {
            Particles.explode(player.x, player.y, '#ff88ff', 25);
            Audio.voicePowerUp();
        } else {
            // No active powerups to extend - give a small score bonus instead
            addScore(500);
        }
    } else if (type.id === 'triple') {
        // Check if already at max (already have triple active)
        if (player.powerups.triple > 0) {
            Audio.voiceWeaponMax();
        } else {
            Audio.voiceWeaponUpgraded();
        }
        player.powerups[type.id] = type.duration;
    } else {
        player.powerups[type.id] = type.duration;
        Audio.voicePowerUp();
    }
}

function useBomb() {
    if (bombs <= 0 && !infiniteBombs) return;
    if (!infiniteBombs) bombs--;
    
    Audio.bomb();
    ScreenShake.add(20);
    explosions.push({ x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2, radius: 0, alpha: 1 });
    
    asteroids.forEach(a => {
        Particles.explode(a.x, a.y, '#ff8844', 10);
        addScore(a.sizeClass * 50);
        sessionKills++;
        totalKills++;
        if (Math.random() < 0.3) loots.push(new Loot(a.x, a.y, a.sizeClass));
    });
    asteroids = [];
    
    if (boss && boss.hp > 0) {
        boss.hp -= 20;
        Particles.explode(boss.x, boss.y, '#ff4444', 30);
    }
}

function playerHit(damage) {
    // God mode - invulnerable
    if (godMode) return;
    
    if (player.invuln > 0 || player.powerups.shield > 0) {
        if (player.powerups.shield > 0) {
            Audio.shield();
            Particles.explode(player.x, player.y, '#44aaff', 10);
        }
        return;
    }
    
    player.health -= damage;
    player.invuln = 1.5;
    Audio.damage();
    ScreenShake.add(15);
    Particles.explode(player.x, player.y, '#ff4444', 15);
    
    combo = 0;
    UI.updateCombo('comboDisplay', combo, false);
    
    if (player.health <= 0) gameOver();
}

function updateCombo(hit) {
    if (hit) {
        combo++;
        comboTimer = CONFIG.COMBO_TIMEOUT;
        maxCombo = Math.max(maxCombo, combo);
        UI.updateCombo('comboDisplay', combo, combo > 1);
    }
}

function addScore(base) {
    const multiplier = 1 + Math.floor(combo / 5) * 0.5;
    const points = Math.floor(base * multiplier);
    sessionScore += points;
    totalScore += points;
}

// ==================== GAME FLOW ====================

function startGame() {
    // Ensure audio is ready (this is called on button click = user gesture)
    Audio.init();
    Audio.resume();
    
    currentLevel = 0;
    totalScore = 0;
    totalMinerals = 0;
    totalKills = 0;
    bossesDefeated = 0;
    totalDistanceTraveled = 0;
    gameStartTime = performance.now();
    
    startLevel();
}

function startLevel() {
    const level = LEVELS[currentLevel];
    
    Engine.setState('playing');
    Input.showTouchControls();
    Input.setAltButtonLabel('BOMB');
    sessionScore = 0;
    sessionMinerals = 0;
    sessionKills = 0;
    shotsFired = 0;
    shotsHit = 0;
    maxCombo = 0;
    combo = 0;
    comboTimer = 0;
    distanceRemaining = level.distance;
    bossActive = false;
    boss = null;
    bombs = 1;
    
    player.x = CONFIG.CANVAS_WIDTH / 2;
    player.y = CONFIG.CANVAS_HEIGHT - 120;
    player.health = Math.min(player.health + 30, CONFIG.MAX_HEALTH);
    player.invuln = 2;
    player.thrustTimer = 0;
    player.powerups = { shield: 0, rapid: 0, triple: 0, magnet: 0 };
    player.thrustTrail = [];
    
    bullets = [];
    asteroids = [];
    powerups = [];
    loots = [];
    explosions = [];
    shards = [];
    gravityWells = [];
    
    StarField.init(80, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    nebulaClouds = [];
    for (let i = 0; i < 5; i++) nebulaClouds.push(new NebulaCloud());
    
    for (let i = 0; i < 5; i++) {
        asteroids.push(new Asteroid(Math.random() * CONFIG.CANVAS_HEIGHT * 0.4));
    }
    
    UI.hideAllScreens();
    UI.setText('levelDisplay', `SECTOR ${currentLevel + 1} - ${level.name}`);
    
    // Play level music - alternate between themes
    if (currentLevel % 2 === 0) {
        Audio.playTrack('asteroidRun');
    } else {
        Audio.playTrack('asteroidRun2');
    }
    
    // Voice callout on first level
    if (currentLevel === 0) {
        setTimeout(() => Audio.voiceBegin(), 500);
    }
}

function levelComplete() {
    Engine.setState('levelComplete');
    bossesDefeated++;
    Audio.levelComplete();
    
    UI.setText('sectorClearedName', `${LEVELS[currentLevel].name} Cleared!`);
    UI.setText('levelScore', sessionScore.toLocaleString());
    UI.setText('levelMinerals', sessionMinerals);
    UI.setText('levelAccuracy', shotsFired > 0 ? Math.floor((shotsHit / shotsFired) * 100) + '%' : 'N/A');
    UI.setText('levelCombo', maxCombo);
    UI.showScreen('levelScreen');
}

function nextLevel() {
    currentLevel++;
    if (currentLevel >= LEVELS.length) {
        victory();
    } else {
        startLevel();
    }
}

function gameOver() {
    Engine.setState('gameover');
    Audio.gameOver();
    Audio.playGameOverMusic();
    Input.hideTouchControls();
    
    UI.setText('deathSector', currentLevel + 1);
    UI.setText('finalScore', totalScore.toLocaleString());
    UI.setText('lostMinerals', totalMinerals);
    UI.setText('finalDistance', Math.floor(totalDistanceTraveled / 100) + ' km');
    UI.setText('finalKills', totalKills);
    UI.showScreen('gameOverScreen');
}

function victory() {
    Engine.setState('victory');
    Audio.levelComplete();
    Audio.playVictoryMusic();
    Input.hideTouchControls();
    
    const elapsed = Math.floor((performance.now() - gameStartTime) / 1000);
    UI.setText('victoryScore', totalScore.toLocaleString());
    UI.setText('victoryMinerals', totalMinerals);
    UI.setText('victoryTime', UI.formatTime(elapsed));
    UI.setText('victoryBosses', bossesDefeated);
    UI.showScreen('victoryScreen');
}

function togglePause() {
    if (Engine.isState('playing')) {
        Engine.setState('paused');
        Audio.pause();
        UI.showScreen('pauseScreen');
        Input.hideTouchControls();
    } else if (Engine.isState('paused')) {
        Engine.setState('playing');
        Audio.unpause();
        UI.hideScreen('pauseScreen');
        Input.showTouchControls();
    }
}

// ==================== UPDATE ====================

function update(dt) {
    if (!Engine.isState('playing')) return;
    
    const level = LEVELS[currentLevel];
    const scrollSpeed = CONFIG.SCROLL_SPEED * level.speedMod;
    
    // Combo timer
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) {
            combo = 0;
            UI.updateCombo('comboDisplay', combo, false);
        }
    }
    
    // Background
    StarField.update(dt, scrollSpeed);
    nebulaClouds.forEach(n => n.update(dt));
    
    // Powerup timers
    for (const key in player.powerups) {
        if (player.powerups[key] > 0) player.powerups[key] -= dt;
    }
    
    // Distance / Boss
    if (!bossActive) {
        distanceRemaining -= scrollSpeed * dt;
        totalDistanceTraveled += scrollSpeed * dt;
        
        if (distanceRemaining <= 0) {
            bossActive = true;
            boss = new Boss(currentLevel);
            UI.showBossHealth('bossHealthContainer', boss.name);
            // Random boss music
            Audio.playTrack(Math.random() < 0.5 ? 'asteroidRunBoss1' : 'asteroidRunBoss2');
        }
    }
    
    // Player movement
    let speed = CONFIG.SHIP_SPEED;
    if (Input.isDown('focus')) speed = CONFIG.SHIP_FOCUS_SPEED;
    
    if (Input.isDown('left')) player.x -= speed * dt;
    if (Input.isDown('right')) player.x += speed * dt;
    if (Input.isDown('up')) player.y -= speed * dt;
    if (Input.isDown('down')) player.y += speed * dt;
    
    player.x = Collision.clamp(player.x, 20, CONFIG.CANVAS_WIDTH - 20);
    player.y = Collision.clamp(player.y, 60, CONFIG.CANVAS_HEIGHT - 30);
    
    if (player.invuln > 0) player.invuln -= dt;
    
    // Thrust trail and sound
    if (Input.isDown('up')) {
        player.thrustTrail.push({ x: player.x, y: player.y + 25, life: 0.3 });
        player.thrustTimer -= dt;
        if (player.thrustTimer <= 0) {
            Audio.thrust();
            player.thrustTimer = 0.25; // Play thrust sound every 0.25 sec
        }
    } else {
        player.thrustTimer = 0; // Reset so it plays immediately on next thrust
    }
    player.thrustTrail = player.thrustTrail.filter(t => {
        t.life -= dt;
        t.y += 100 * dt;
        return t.life > 0;
    });
    
    // Shooting
    player.fireTimer -= dt;
    const fireRate = player.powerups.rapid > 0 ? CONFIG.RAPID_FIRE_RATE : CONFIG.FIRE_RATE;
    
    if (Input.isDown('fire') && player.fireTimer <= 0 && bullets.length < CONFIG.MAX_BULLETS) {
        player.fireTimer = fireRate;
        shotsFired++;
        
        if (player.powerups.triple > 0) {
            Audio.shootTriple();
            bullets.push(new Bullet(player.x, player.y - 25, -Math.PI / 2, CONFIG.BULLET_SPEED));
            bullets.push(new Bullet(player.x - 10, player.y - 20, -Math.PI / 2 - 0.15, CONFIG.BULLET_SPEED));
            bullets.push(new Bullet(player.x + 10, player.y - 20, -Math.PI / 2 + 0.15, CONFIG.BULLET_SPEED));
        } else {
            Audio.shoot();
            bullets.push(new Bullet(player.x, player.y - 25, -Math.PI / 2, CONFIG.BULLET_SPEED));
        }
    }
    
    // Bomb
    if (Input.wasPressed('bomb')) useBomb();
    
    // Update entities
    bullets.forEach(b => b.update(dt));
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => {
        p.update(dt);
        if (player.powerups.magnet > 0) p.attractTo(player.x, player.y, dt);
    });
    loots.forEach(l => {
        l.update(dt);
        if (player.powerups.magnet > 0) l.attractTo(player.x, player.y, dt);
    });
    Particles.update(dt);
    ScreenShake.update(dt);
    
    // Update shards
    shards.forEach(s => s.update(dt));
    shards = shards.filter(s => !s.dead);
    
    // Update gravity wells
    gravityWells.forEach(g => {
        g.update(dt);
        // Apply pull force to player
        const force = g.getPullForce(player.x, player.y);
        player.x += force.x * dt;
        player.y += force.y * dt;
    });
    gravityWells = gravityWells.filter(g => !g.dead);
    
    if (boss) boss.update(dt);
    
    // Explosions
    explosions = explosions.filter(e => {
        e.radius += 2000 * dt;
        e.alpha -= dt * 2;
        return e.alpha > 0;
    });
    
    // Spawn asteroids
    if (!bossActive && asteroids.length < level.maxAsteroids && Math.random() < level.asteroidRate) {
        asteroids.push(new Asteroid());
    }
    
    // Spawn gravity wells (in levels that have them)
    if (!bossActive && level.gravityWells && gravityWells.length < 3 && Math.random() < 0.003) {
        const x = Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50;
        gravityWells.push(new GravityWell(x, -100));
    }
    
    // Collision: Bullets vs Asteroids
    bullets.forEach(b => {
        if (b.dead) return;
        
        asteroids.forEach(a => {
            if (Collision.pointCircle(b.x, b.y, a.x, a.y, a.radius)) {
                b.dead = true;
                a.hp--;
                shotsHit++;
                Particles.explode(b.x, b.y, '#ffaa00', 5);
                
                if (a.hp <= 0) {
                    a.dead = true;
                    Audio.explode(a.sizeClass === 3);
                    ScreenShake.add(a.sizeClass * 3);
                    Particles.explode(a.x, a.y, '#ff8844', a.sizeClass * 8);
                    
                    // Spawn shards from ice/fire asteroids
                    if (a.type === 'ice' || a.type === 'fire') {
                        const numShards = a.sizeClass + 2;
                        for (let i = 0; i < numShards; i++) {
                            shards.push(new Shard(a.x, a.y, a.type));
                        }
                    }
                    
                    addScore(a.sizeClass * 100);
                    updateCombo(true);
                    sessionKills++;
                    totalKills++;
                    
                    if (a.sizeClass > 1) {
                        for (let i = 0; i < 2; i++) {
                            asteroids.push(new Asteroid(a.y, a.sizeClass - 1, a.x + (Math.random() - 0.5) * 30));
                        }
                    }
                    
                    if (Math.random() < 0.4) loots.push(new Loot(a.x, a.y, a.sizeClass));
                    spawnPowerup(a.x, a.y);
                } else {
                    Audio.hit(a.sizeClass);
                }
            }
        });
        
        // Bullets vs Boss
        if (boss && boss.hp > 0 && !b.dead) {
            if (boss.hit(3, b.x, b.y)) {
                b.dead = true;
                shotsHit++;
                updateCombo(true);
                addScore(25);
                
                if (boss.hp <= 0) {
                    Audio.bossExplode();
                    ScreenShake.add(30);
                    
                    const bx = boss.x, by = boss.y;
                    for (let i = 0; i < 50; i++) {
                        setTimeout(() => {
                            Particles.explodeMulti(
                                bx + (Math.random() - 0.5) * 150,
                                by + (Math.random() - 0.5) * 150,
                                ['#ff4444', '#ff8844', '#ffff44'], 15
                            );
                        }, i * 30);
                    }
                    
                    addScore(5000 * (currentLevel + 1));
                    for (let i = 0; i < 10; i++) {
                        loots.push(new Loot(bx + (Math.random() - 0.5) * 100, by + (Math.random() - 0.5) * 100, 3));
                    }
                    
                    boss = null;
                    UI.hideBossHealth('bossHealthContainer');
                    setTimeout(levelComplete, 5000); // 5 sec to collect loot
                }
            }
        }
    });
    
    // Collision: Player vs Asteroids
    asteroids.forEach(a => {
        if (a.dead) return;
        if (Collision.circleCircle(player.x, player.y, player.radius, a.x, a.y, a.radius)) {
            playerHit(25 + a.sizeClass * 5);
            a.dead = true;
            Particles.explode(a.x, a.y, '#ff4444', 15);
        }
    });
    
    // Collision: Player vs Powerups
    powerups = powerups.filter(p => {
        if (Collision.circleCircle(player.x, player.y, 30, p.x, p.y, p.radius)) {
            activatePowerup(p.type);
            return false;
        }
        return p.y < CONFIG.CANVAS_HEIGHT + 50;
    });
    
    // Collision: Player vs Loot
    loots = loots.filter(l => {
        if (Collision.circleCircle(player.x, player.y, 30, l.x, l.y, l.radius)) {
            Audio.collect();
            const value = l.type === 'rare' ? l.value * 3 : l.value;
            sessionMinerals += value;
            totalMinerals += value;
            addScore(value * 25);
            return false;
        }
        return l.y < CONFIG.CANVAS_HEIGHT + 50;
    });
    
    // Collision: Player vs Shards
    shards.forEach(s => {
        if (!s.dead && Collision.circleCircle(player.x, player.y, 25, s.x, s.y, s.radius)) {
            s.dead = true;
            const damage = s.type === 'fire' ? 15 : 10;  // Fire hurts more
            playerHit(damage);
            Particles.explode(s.x, s.y, s.type === 'fire' ? '#ff4400' : '#44ccff', 8);
        }
    });
    
    // Collision: Player vs Gravity Wells (lethal zone)
    gravityWells.forEach(g => {
        if (g.isLethal(player.x, player.y, 20)) {
            // Instant massive damage - basically death
            playerHit(CONFIG.MAX_HEALTH);
            Particles.explode(player.x, player.y, '#aa00ff', 30);
            ScreenShake.add(25);
        }
    });
    
    // Cleanup
    bullets = bullets.filter(b => !b.dead && b.y > -50 && b.y < CONFIG.CANVAS_HEIGHT + 50);
    asteroids = asteroids.filter(a => !a.dead && a.y < CONFIG.CANVAS_HEIGHT + 100);
    
    // Update UI
    UI.setText('scoreDisplay', totalScore.toLocaleString());
    UI.setText('mineralDisplay', totalMinerals);
    UI.updateHealthBar('healthFill', (player.health / CONFIG.MAX_HEALTH) * 100);
    UI.setDanger('scoreDisplay', player.health < CONFIG.MAX_HEALTH * 0.25);
    
    const distPct = bossActive ? 100 : (1 - distanceRemaining / level.distance) * 100;
    UI.updateDistanceBar('distanceFill', distPct);
    
    if (boss && boss.hp > 0) {
        UI.updateBossHealth('bossHealthFill', (boss.hp / boss.maxHP) * 100);
    }
    
    // Powerup slots
    ['shield', 'rapid', 'triple', 'magnet'].forEach(id => {
        const duration = POWERUP_TYPES.find(t => t.id === id).duration;
        UI.updatePowerupSlot('slot-' + id, player.powerups[id] > 0, (player.powerups[id] / duration) * 100);
    });
    
    Input.update();
}

// ==================== RENDER ====================

function render(ctx) {
    ctx.save();
    ScreenShake.apply(ctx);
    
    // Clear
    ctx.fillStyle = '#050510';
    ctx.fillRect(-10, -10, CONFIG.CANVAS_WIDTH + 20, CONFIG.CANVAS_HEIGHT + 20);
    
    // Background
    nebulaClouds.forEach(n => n.draw(ctx));
    StarField.draw(ctx);
    
    // Gravity wells (render behind everything)
    gravityWells.forEach(g => g.draw(ctx));
    
    // Entities
    loots.forEach(l => l.draw(ctx));
    powerups.forEach(p => p.draw(ctx));
    asteroids.forEach(a => a.draw(ctx));
    shards.forEach(s => s.draw(ctx));
    if (boss && boss.hp > 0) boss.draw(ctx);
    bullets.forEach(b => b.draw(ctx));
    
    // Thrust trail
    player.thrustTrail.forEach(t => {
        const alpha = t.life / 0.3;
        ctx.fillStyle = `rgba(255,${Math.floor(150 + alpha * 100)},0,${alpha})`;
        ctx.beginPath();
        ctx.arc(t.x + (Math.random() - 0.5) * 5, t.y, 4 * alpha + 2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Player
    if (player.invuln <= 0 || Math.floor(Date.now() / 80) % 2 === 0) {
        drawShip(ctx, player.x, player.y);
    }
    
    // Shield
    if (player.powerups.shield > 0) {
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#44aaff';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    // Particles
    Particles.draw(ctx);
    
    // Bomb flash
    explosions.forEach(e => {
        ctx.globalAlpha = e.alpha * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    ctx.restore();
}

// ==================== INITIALIZATION ====================

// Initialize engine
Engine.init('gameCanvas', CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
Engine.onUpdate = update;
Engine.onRender = render;

// Initialize audio context early (will be suspended until user gesture)
Audio.init();

// Initialize input
Input.init();
Input.onPause = () => {
    if (Engine.isState('playing')) {
        togglePause();
    }
};

// Q to quit - context sensitive
Input.onQuit = () => {
    const state = Engine.state;
    
    // From start screen -> go to launcher
    if (state === 'init' || state === 'start') {
        window.location.href = '/KrakenArKade.html';
        return;
    }
    
    // From paused, level complete, game over, victory -> go to start screen
    if (state === 'paused' || state === 'levelComplete' || state === 'gameover' || state === 'victory') {
        Audio.stopMusic();
        Engine.setState('start');
        UI.hideAllScreens();
        UI.showScreen('startScreen');
        Input.hideTouchControls();
        return;
    }
    
    // From playing -> pause first (then Q again to quit)
    if (state === 'playing') {
        togglePause();
    }
};

// K for Kraken settings (secret menu)
let settingsOpen = false;
let stateBeforeSettings = null;

function toggleSettings() {
    if (!settingsOpen) {
        // Open settings
        stateBeforeSettings = Engine.state;
        settingsOpen = true;
        initSettingsControls();
        syncSettingsUI();
        UI.showScreen('settingsScreen');
    } else {
        // Close settings
        settingsOpen = false;
        UI.hideScreen('settingsScreen');
    }
}

// Sync sliders with current Audio values
function syncSettingsUI() {
    if (!Audio.ctx) return;
    
    // Main channels
    const musicVal = Math.round(Audio.musicGain.gain.value * 100);
    const sfxVal = Math.round(Audio.sfxGain.gain.value * 100);
    const voiceVal = Math.round(Audio.voiceGain.gain.value * 100);
    const synthVal = Math.round(Audio.synthGain.gain.value * 50); // 0-2 range -> 0-100
    const masterVal = Math.round(Audio.masterGain.gain.value * 100);
    
    const musicVol = document.getElementById('musicVolume');
    const sfxVol = document.getElementById('sfxVolume');
    const voiceVol = document.getElementById('voiceVolume');
    const synthVol = document.getElementById('synthVolume');
    const masterVol = document.getElementById('masterVolume');
    
    if (musicVol) { musicVol.value = musicVal; document.getElementById('musicVolLabel').textContent = musicVal + '%'; }
    if (sfxVol) { sfxVol.value = sfxVal; document.getElementById('sfxVolLabel').textContent = sfxVal + '%'; }
    if (voiceVol) { voiceVol.value = voiceVal; document.getElementById('voiceVolLabel').textContent = voiceVal + '%'; }
    if (synthVol) { synthVol.value = synthVal; document.getElementById('synthVolLabel').textContent = synthVal + '%'; }
    if (masterVol) { masterVol.value = masterVal; document.getElementById('masterVolLabel').textContent = masterVal + '%'; }
    
    // Individual synth sounds
    const collectVol = document.getElementById('collectVolume');
    const hitVol = document.getElementById('hitVolume');
    const explodeVol = document.getElementById('explodeVolume');
    const powerupVol = document.getElementById('powerupVolume');
    
    if (collectVol) { collectVol.value = Audio.volumes.collect * 100; document.getElementById('collectVolLabel').textContent = Math.round(Audio.volumes.collect * 100) + '%'; }
    if (hitVol) { hitVol.value = Audio.volumes.hit * 100; document.getElementById('hitVolLabel').textContent = Math.round(Audio.volumes.hit * 100) + '%'; }
    if (explodeVol) { explodeVol.value = Audio.volumes.explode * 100; document.getElementById('explodeVolLabel').textContent = Math.round(Audio.volumes.explode * 100) + '%'; }
    if (powerupVol) { powerupVol.value = Audio.volumes.powerup * 100; document.getElementById('powerupVolLabel').textContent = Math.round(Audio.volumes.powerup * 100) + '%'; }
    
    // Sync debug toggles
    const godModeToggle = document.getElementById('godModeToggle');
    const infiniteBombsToggle = document.getElementById('infiniteBombsToggle');
    if (godModeToggle) godModeToggle.checked = godMode;
    if (infiniteBombsToggle) infiniteBombsToggle.checked = infiniteBombs;
}

Input.onSettings = toggleSettings;

// Settings initialization flag
let settingsInitialized = false;

function initSettingsControls() {
    if (settingsInitialized) return;
    settingsInitialized = true;
    
    const musicVol = document.getElementById('musicVolume');
    const sfxVol = document.getElementById('sfxVolume');
    const voiceVol = document.getElementById('voiceVolume');
    const masterVol = document.getElementById('masterVolume');
    const collectVol = document.getElementById('collectVolume');
    const hitVol = document.getElementById('hitVolume');
    const explodeVol = document.getElementById('explodeVolume');
    const powerupVol = document.getElementById('powerupVolume');
    const closeBtn = document.getElementById('settingsCloseBtn');
    
    // Main channel controls
    if (musicVol) {
        musicVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setMusicVolume(val);
            document.getElementById('musicVolLabel').textContent = e.target.value + '%';
        });
    }

    if (sfxVol) {
        sfxVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setSFXVolume(val);
            document.getElementById('sfxVolLabel').textContent = e.target.value + '%';
        });
    }

    if (voiceVol) {
        voiceVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setVoiceVolume(val);
            document.getElementById('voiceVolLabel').textContent = e.target.value + '%';
        });
    }

    if (masterVol) {
        masterVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setMasterVolume(val);
            document.getElementById('masterVolLabel').textContent = e.target.value + '%';
        });
    }
    
    const synthVol = document.getElementById('synthVolume');
    if (synthVol) {
        synthVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setSynthVolume(val);
            document.getElementById('synthVolLabel').textContent = e.target.value + '%';
            Audio.collect(); // Test sound
        });
    }
    
    // Individual sound controls
    if (collectVol) {
        collectVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setCollectVolume(val);
            document.getElementById('collectVolLabel').textContent = e.target.value + '%';
            Audio.collect(); // Test sound
        });
    }
    
    if (hitVol) {
        hitVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setHitVolume(val);
            document.getElementById('hitVolLabel').textContent = e.target.value + '%';
            Audio.hit(); // Test sound
        });
    }
    
    if (explodeVol) {
        explodeVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setExplodeVolume(val);
            document.getElementById('explodeVolLabel').textContent = e.target.value + '%';
            Audio.explode(); // Test sound
        });
    }
    
    if (powerupVol) {
        powerupVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setPowerupVolume(val);
            document.getElementById('powerupVolLabel').textContent = e.target.value + '%';
            Audio.powerup(); // Test sound
        });
    }
    
    // Debug controls
    const godModeToggle = document.getElementById('godModeToggle');
    const infiniteBombsToggle = document.getElementById('infiniteBombsToggle');
    const warpButtonsContainer = document.getElementById('warpButtons');
    
    if (godModeToggle) {
        godModeToggle.checked = godMode;
        godModeToggle.addEventListener('change', (e) => {
            godMode = e.target.checked;
        });
    }
    
    if (infiniteBombsToggle) {
        infiniteBombsToggle.checked = infiniteBombs;
        infiniteBombsToggle.addEventListener('change', (e) => {
            infiniteBombs = e.target.checked;
        });
    }
    
    if (warpButtonsContainer && warpButtonsContainer.children.length === 0) {
        LEVELS.forEach((level, index) => {
            const btn = document.createElement('button');
            btn.textContent = `${index + 1}`;
            btn.title = level.name;
            btn.style.cssText = `
                width: 35px; height: 30px; 
                background: ${level.color}33; 
                border: 1px solid ${level.color}; 
                color: ${level.color}; 
                cursor: pointer;
                font-weight: bold;
                font-size: 12px;
            `;
            btn.addEventListener('click', () => warpToLevel(index));
            btn.addEventListener('mouseenter', () => btn.style.background = level.color + '66');
            btn.addEventListener('mouseleave', () => btn.style.background = level.color + '33');
            warpButtonsContainer.appendChild(btn);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', toggleSettings);
    }
}

// Warp to a specific level with full health and powerups
function warpToLevel(levelIndex) {
    currentLevel = levelIndex;
    toggleSettings();  // Close settings
    startLevel(LEVELS[levelIndex]);
    
    // Give player full health and some bombs
    player.health = CONFIG.MAX_HEALTH;
    bombs = 5;
    
    // Flash a message
    console.log(`WARPED TO SECTOR ${levelIndex + 1}: ${LEVELS[levelIndex].name}`);
}

// Button handlers
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('victoryBtn').addEventListener('click', startGame);
document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('quitBtn').addEventListener('click', () => {
    Engine.setState('start');
    UI.hideAllScreens();
    UI.showScreen('startScreen');
});

// Start engine
Engine.setState('start');
Engine.start();

// Auto-resume audio context on any user interaction
// (handles cases where game is launched from arcade menu)
function unlockAudio() {
    Audio.init();
    if (Audio.ctx && Audio.ctx.state === 'suspended') {
        Audio.ctx.resume().then(() => {
            console.log('Audio context resumed');
        });
    }
}

window.addEventListener('keydown', unlockAudio);
window.addEventListener('mousedown', unlockAudio);
window.addEventListener('touchstart', unlockAudio);
window.addEventListener('click', unlockAudio);
