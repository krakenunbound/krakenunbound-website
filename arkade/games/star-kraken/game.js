// ============================================================================
// STAR KRAKEN - GALACTIC DEFENDER
// First-person space combat game inspired by Starmaster/Star Raiders
// ============================================================================

// ==================== CONFIGURATION ====================

const CONFIG = {
    WIDTH: 900,
    HEIGHT: 700,
    FOV: 60,
    VIEW_DISTANCE: 2000,
    SHIP_SPEED: 250,
    RETICLE_SPEED: 350,
    FIRE_RATE: 0.12,
    MISSILE_RATE: 0.6,
    MAX_SHIELDS: 100,
    MAX_ENERGY: 100,
    MAX_HULL: 100,
    ENERGY_REGEN: 8,
    LASER_COST: 2,
    MISSILE_COST: 10,
    LOOT_MAGNET_RANGE: 400,
    POWERUP_MAGNET_RANGE: 350
};

const LEVELS = [
    { name: "FRONTIER SPACE", waves: 3, enemyTypes: ['scout'], bossName: "PATROL LEADER", bossHP: 120, color: '#4488ff', spawnRate: 2.0 },
    { name: "ASTEROID BELT", waves: 4, enemyTypes: ['scout', 'fighter'], bossName: "BELT COMMANDER", bossHP: 180, color: '#ff8844', spawnRate: 1.8 },
    { name: "NEBULA DEPTHS", waves: 4, enemyTypes: ['fighter', 'bomber'], bossName: "NEBULA PHANTOM", bossHP: 250, color: '#ff44ff', spawnRate: 1.6 },
    { name: "DEAD ZONE", waves: 5, enemyTypes: ['fighter', 'bomber', 'elite'], bossName: "VOID HUNTER", bossHP: 320, color: '#44ffff', spawnRate: 1.5 },
    { name: "KRAKEN BORDER", waves: 5, enemyTypes: ['fighter', 'elite', 'heavy'], bossName: "BORDER WARDEN", bossHP: 400, color: '#ffff44', spawnRate: 1.4 },
    { name: "WAR SECTOR", waves: 6, enemyTypes: ['bomber', 'elite', 'heavy'], bossName: "WAR MASTER", bossHP: 500, color: '#ff4488', spawnRate: 1.3 },
    { name: "DARK TERRITORY", waves: 6, enemyTypes: ['elite', 'heavy', 'ace'], bossName: "SHADOW LORD", bossHP: 600, color: '#8844ff', spawnRate: 1.2 },
    { name: "KRAKEN FORTRESS", waves: 7, enemyTypes: ['heavy', 'ace'], bossName: "FORTRESS GUARDIAN", bossHP: 750, color: '#ff8800', spawnRate: 1.1 },
    { name: "THRONE APPROACH", waves: 7, enemyTypes: ['ace', 'elite'], bossName: "THRONE DEFENDER", bossHP: 900, color: '#ff0044', spawnRate: 1.0 },
    { name: "KRAKEN'S HEART", waves: 8, enemyTypes: ['ace'], bossName: "THE KRAKEN OVERLORD", bossHP: 1200, color: '#ff00ff', spawnRate: 0.9 }
];

const ENEMY_TYPES = {
    scout:   { hp: 20,  speed: 280, size: 40, score: 100,  color: '#88ff88', shootRate: 3.5, damage: 5 },
    fighter: { hp: 40,  speed: 220, size: 50, score: 200,  color: '#ffff44', shootRate: 3.0, damage: 8 },
    bomber:  { hp: 70,  speed: 150, size: 65, score: 350,  color: '#ff8844', shootRate: 4.0, damage: 12 },
    elite:   { hp: 80,  speed: 260, size: 55, score: 500,  color: '#ff44ff', shootRate: 2.5, damage: 10 },
    heavy:   { hp: 150, speed: 120, size: 80, score: 750,  color: '#ff4444', shootRate: 3.5, damage: 15 },
    ace:     { hp: 100, speed: 320, size: 60, score: 1000, color: '#ffffff', shootRate: 2.0, damage: 12 }
};

const POWERUP_TYPES = [
    { id: 'shield', icon: '🛡️', color: '#44aaff', duration: 12, chance: 0.18 },
    { id: 'rapid', icon: '⚡', color: '#ffff44', duration: 15, chance: 0.20 },
    { id: 'spread', icon: '🔱', color: '#ff44ff', duration: 12, chance: 0.15 },
    { id: 'missiles', icon: '🚀', color: '#ff4444', duration: 0, chance: 0.15 },
    { id: 'repair', icon: '💚', color: '#44ff44', duration: 0, chance: 0.20 },
    { id: 'energy', icon: '🔋', color: '#ffaa00', duration: 0, chance: 0.12 }
];

// ==================== GAME STATE ====================

let currentLevel = 0;
let currentWave = 0;
let waveTimer = 0;
let score = 0;
let credits = 0;
let totalKills = 0;
let shotsFired = 0;
let shotsHit = 0;
let combo = 0;
let maxCombo = 0;
let comboTimer = 0;
let bossActive = false;
let boss = null;
let bossesDefeated = 0;
let gameStartTime = 0;
let mapOpen = false;

let godMode = false;
let infiniteMissiles = false;

const player = {
    shipX: 0,
    shipY: 0,
    reticleX: CONFIG.WIDTH / 2,
    reticleY: CONFIG.HEIGHT / 2,
    shields: CONFIG.MAX_SHIELDS,
    energy: CONFIG.MAX_ENERGY,
    hull: CONFIG.MAX_HULL,
    missiles: 5,
    fireTimer: 0,
    missileTimer: 0,
    invuln: 0,
    powerups: { shield: 0, rapid: 0, spread: 0 },
    lockedTarget: null,
    lockTimer: 0
};

let enemies = [];
let bullets = [];
let enemyBullets = [];
let powerups = [];
let loots = [];
let starbase = null;

// ==================== 3D PROJECTION ====================

function project(x, y, z) {
    if (z <= 0) return null;
    const relX = x - player.shipX;
    const relY = y - player.shipY;
    const scale = CONFIG.FOV / z;
    return { x: CONFIG.WIDTH / 2 + relX * scale, y: CONFIG.HEIGHT / 2 + relY * scale, scale };
}

function unproject(screenX, screenY, z) {
    const scale = CONFIG.FOV / z;
    return { x: (screenX - CONFIG.WIDTH / 2) / scale + player.shipX, y: (screenY - CONFIG.HEIGHT / 2) / scale + player.shipY, z };
}

// ==================== ENEMY CLASS ====================

class Enemy {
    constructor(type, x, y, z) {
        const def = ENEMY_TYPES[type];
        Object.assign(this, { type, x, y, z, hp: def.hp, maxHP: def.hp, speed: def.speed, size: def.size, score: def.score, color: def.color, shootRate: def.shootRate, damage: def.damage });
        this.shootTimer = Math.random() * def.shootRate;
        this.dead = false;
        this.charging = 0;
        this.patternTimer = Math.random() * Math.PI * 2;
        this.targetX = x;
        this.targetY = y;
        this.changeTargetTimer = 0;
        this.flash = 0;
    }
    
    update(dt) {
        this.z -= this.speed * 0.4 * dt;
        
        this.changeTargetTimer -= dt;
        if (this.changeTargetTimer <= 0) {
            this.changeTargetTimer = 1 + Math.random() * 2;
            this.targetX = (Math.random() - 0.5) * 800;
            this.targetY = (Math.random() - 0.5) * 500;
        }
        
        const dx = this.targetX - this.x, dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
            this.x += (dx / dist) * this.speed * 0.6 * dt;
            this.y += (dy / dist) * this.speed * 0.6 * dt;
        }
        
        this.patternTimer += dt * 2;
        if (this.type === 'ace') {
            this.x += Math.sin(this.patternTimer * 3) * 80 * dt;
            this.y += Math.cos(this.patternTimer * 2) * 60 * dt;
        } else if (this.type === 'elite') {
            this.x += Math.sin(this.patternTimer * 2) * 50 * dt;
        }
        
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.z < 800 && this.z > 200) {
            this.shootTimer = this.shootRate + Math.random() * 1.0;
            this.charging = 0.6; // Visual warning before firing
        }
        
        // Charging telegraph before shooting
        if (this.charging > 0) {
            this.charging -= dt;
            if (this.charging <= 0) {
                enemyBullets.push(new EnemyBullet(this.x, this.y, this.z, this.damage));
                Audio.shoot();
            }
        }
        
        if (this.flash > 0) this.flash -= dt * 5;
        if (this.z < 40) { this.dead = true; takeDamage(this.damage * 2, 'collision'); }
        if (this.z > CONFIG.VIEW_DISTANCE + 500) this.dead = true;
    }
    
    draw(ctx) {
        const proj = project(this.x, this.y, this.z);
        if (!proj || proj.x < -150 || proj.x > CONFIG.WIDTH + 150 || proj.y < -150 || proj.y > CONFIG.HEIGHT + 150) return;
        
        const size = this.size * proj.scale;
        if (size < 3) return;
        
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.globalAlpha = Math.min(1, 2 - this.z / CONFIG.VIEW_DISTANCE);
        
        const color = this.flash > 0 ? '#ffffff' : this.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, size * 0.08);
        
        this.drawShip(ctx, size);
        
        if (this.hp < this.maxHP && size > 20) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#222';
            ctx.fillRect(-size, size + 10, size * 2, 6);
            ctx.fillStyle = this.hp > this.maxHP * 0.3 ? '#00ff00' : '#ff0000';
            ctx.fillRect(-size, size + 10, size * 2 * (this.hp / this.maxHP), 6);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-size, size + 10, size * 2, 6);
        }
        
        // CHARGING WARNING - glowing red indicator
        if (this.charging > 0) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ff0000';
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ff000088';
            ctx.beginPath();
            ctx.arc(0, size * 0.3, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawShip(ctx, size) {
        if (this.type === 'scout') {
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.25, -size * 0.4);
            ctx.lineTo(size * 0.9, size * 0.2);
            ctx.lineTo(size * 0.5, size * 0.35);
            ctx.lineTo(size * 0.35, size * 0.9);
            ctx.lineTo(0, size * 0.55);
            ctx.lineTo(-size * 0.35, size * 0.9);
            ctx.lineTo(-size * 0.5, size * 0.35);
            ctx.lineTo(-size * 0.9, size * 0.2);
            ctx.lineTo(-size * 0.25, -size * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.25, size * 0.15, size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(size * 0.22, size * 0.8, size * 0.12, 0, Math.PI * 2);
            ctx.arc(-size * 0.22, size * 0.8, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'fighter') {
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.18, -size * 0.25);
            ctx.lineTo(size * 0.18, size * 0.65);
            ctx.lineTo(0, size * 0.85);
            ctx.lineTo(-size * 0.18, size * 0.65);
            ctx.lineTo(-size * 0.18, -size * 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            [[0.18, -0.5, 1, -0.85, 0.9, -0.25], [-0.18, -0.5, -1, -0.85, -0.9, -0.25], [0.18, 0.25, 0.9, 0.55, 0.8, 0.85], [-0.18, 0.25, -0.9, 0.55, -0.8, 0.85]].forEach(w => {
                ctx.beginPath();
                ctx.moveTo(size * w[0], size * w[1]);
                ctx.lineTo(size * w[2], size * w[3]);
                ctx.lineTo(size * w[4], size * w[5]);
                ctx.lineTo(size * w[0], size * (w[1] + 0.2));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.35, size * 0.12, size * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'bomber') {
            [[-0.55, -0.75, -0.22, -0.75, -0.18, 0.75, -0.65, 0.75, -0.75, 0.3], [0.55, -0.75, 0.22, -0.75, 0.18, 0.75, 0.65, 0.75, 0.75, 0.3]].forEach(h => {
                ctx.beginPath();
                ctx.moveTo(size * h[0], size * h[1]);
                ctx.lineTo(size * h[2], size * h[3]);
                ctx.lineTo(size * h[4], size * h[5]);
                ctx.lineTo(size * h[6], size * h[7]);
                ctx.lineTo(size * h[8], size * h[9]);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
            ctx.beginPath();
            ctx.rect(-size * 0.22, -size * 0.45, size * 0.44, size * 0.7);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-size * 0.15, size * 0.05, size * 0.3, size * 0.35);
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(-size * 0.42, size * 0.82, size * 0.14, 0, Math.PI * 2);
            ctx.arc(size * 0.42, size * 0.82, size * 0.14, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'elite') {
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.35, -size * 0.15);
            ctx.lineTo(size * 1.15, size * 0.05);
            ctx.lineTo(size * 0.45, size * 0.18);
            ctx.lineTo(size * 0.35, size * 0.75);
            ctx.lineTo(0, size * 0.45);
            ctx.lineTo(-size * 0.35, size * 0.75);
            ctx.lineTo(-size * 0.45, size * 0.18);
            ctx.lineTo(-size * 1.15, size * 0.05);
            ctx.lineTo(-size * 0.35, -size * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.55);
            ctx.lineTo(size * 0.18, -size * 0.05);
            ctx.lineTo(0, size * 0.15);
            ctx.lineTo(-size * 0.18, -size * 0.05);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'heavy') {
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.85);
            ctx.lineTo(size * 0.45, -size * 0.6);
            ctx.lineTo(size * 0.55, -size * 0.15);
            ctx.lineTo(size * 0.95, size * 0.05);
            ctx.lineTo(size * 0.55, size * 0.25);
            ctx.lineTo(size * 0.45, size * 0.75);
            ctx.lineTo(0, size * 0.95);
            ctx.lineTo(-size * 0.45, size * 0.75);
            ctx.lineTo(-size * 0.55, size * 0.25);
            ctx.lineTo(-size * 0.95, size * 0.05);
            ctx.lineTo(-size * 0.55, -size * 0.15);
            ctx.lineTo(-size * 0.45, -size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#880000';
            ctx.beginPath();
            ctx.arc(0, -size * 0.25, size * 0.22, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff4444';
            ctx.stroke();
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(size * 0.8, size * 0.05, size * 0.18, 0, Math.PI * 2);
            ctx.arc(-size * 0.8, size * 0.05, size * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff6600';
            for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * size * 0.28, size * 0.9, size * 0.12, 0, Math.PI * 2); ctx.fill(); }
        } else if (this.type === 'ace') {
            const pulse = Math.sin(Engine.totalTime * 8) * 0.08 + 1;
            ctx.scale(pulse, pulse);
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.quadraticCurveTo(size * 0.35, -size * 0.45, size * 0.25, -size * 0.15);
            ctx.lineTo(size * 1.25, size * 0.15);
            ctx.lineTo(size * 0.35, size * 0.25);
            ctx.quadraticCurveTo(size * 0.45, size * 0.55, size * 0.25, size * 0.65);
            ctx.lineTo(0, size * 0.45);
            ctx.lineTo(-size * 0.25, size * 0.65);
            ctx.quadraticCurveTo(-size * 0.45, size * 0.55, -size * 0.35, size * 0.25);
            ctx.lineTo(-size * 1.25, size * 0.15);
            ctx.lineTo(-size * 0.25, -size * 0.15);
            ctx.quadraticCurveTo(-size * 0.35, -size * 0.45, 0, -size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const coreGrad = ctx.createRadialGradient(0, -size * 0.15, 0, 0, -size * 0.15, size * 0.35);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.4, '#ff00ff');
            coreGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, -size * 0.15, size * 0.28, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    hit(damage) {
        this.hp -= damage;
        this.flash = 1;
        Audio.hit();
        const proj = project(this.x, this.y, this.z);
        if (proj) Particles.explode(proj.x, proj.y, this.color, 10, 120, 0.4);
        if (this.hp <= 0) { this.dead = true; return true; }
        return false;
    }
}

// ==================== BOSS CLASS ====================

class Boss {
    constructor(level) {
        const config = LEVELS[level];
        this.name = config.bossName;
        this.maxHP = config.bossHP;
        this.hp = this.maxHP;
        this.x = 0;
        this.y = 0;
        this.z = CONFIG.VIEW_DISTANCE;
        this.targetZ = 350;
        this.size = 120;
        this.color = config.color;
        this.dead = false;
        this.phase = 0;
        this.phaseTimer = 0;
        this.attackTimer = 0;
        this.charging = 0;
        this.flash = 0;
        this.angle = 0;
        this.cores = [];
        const coreCount = Math.min(level + 2, 6);
        for (let i = 0; i < coreCount; i++) {
            this.cores.push({ angle: (i / coreCount) * Math.PI * 2, dist: 70, hp: Math.floor(this.maxHP / coreCount), maxHP: Math.floor(this.maxHP / coreCount), alive: true });
        }
    }
    
    update(dt) {
        if (this.z > this.targetZ) this.z -= 180 * dt;
        this.angle += dt * 0.5;
        this.phaseTimer += dt;
        this.attackTimer += dt;
        
        if (this.phase === 0) { this.x = Math.sin(this.phaseTimer * 0.4) * 250; this.y = Math.cos(this.phaseTimer * 0.25) * 150; }
        else { this.x = Math.sin(this.phaseTimer * 0.8) * 350; this.y = Math.sin(this.phaseTimer * 1.2) * 200; }
        
        // Charging telegraph
        if (this.charging > 0) {
            this.charging -= dt;
            if (this.charging <= 0) {
                // Fire attack - fewer bullets, spread pattern
                const count = 2 + this.phase; // 2-3 bullets instead of 5-7
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + this.phaseTimer;
                    const spawnX = this.x + Math.cos(angle) * 100;
                    const spawnY = this.y + Math.sin(angle) * 100;
                    enemyBullets.push(new EnemyBullet(spawnX, spawnY, this.z, 8 + this.phase * 3));
                }
                Audio.shoot();
            }
        }
        
        // Start charging attack - slower rate
        if (this.attackTimer > 2.5 && this.z <= this.targetZ && this.charging <= 0) {
            this.attackTimer = 0;
            this.charging = 1.0; // 1 second warning
        }
        
        if (this.hp < this.maxHP * 0.5 && this.phase === 0) { this.phase = 1; this.phaseTimer = 0; ScreenShake.add(25); Audio.bossHit(); }
        if (this.flash > 0) this.flash -= dt * 5;
    }
    
    draw(ctx) {
        const proj = project(this.x, this.y, this.z);
        if (!proj) return;
        const size = this.size * proj.scale;
        if (size < 8) return;
        
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const color = this.flash > 0 ? '#ffffff' : this.color;
        
        const gradient = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 2.5);
        gradient.addColorStop(0, color + '55');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        for (let ring = 0; ring < 3; ring++) {
            ctx.save();
            ctx.rotate(this.angle * (ring % 2 === 0 ? 1 : -1) * (ring + 1));
            const innerR = size * (0.35 + ring * 0.18), outerR = size * (0.52 + ring * 0.18), segments = 8 + ring * 3;
            ctx.fillStyle = ring === 0 ? '#181818' : '#282828';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < segments; i++) {
                const a1 = (i / segments) * Math.PI * 2, a2 = ((i + 0.65) / segments) * Math.PI * 2;
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
            const cx = Math.cos(core.angle + this.angle) * core.dist * proj.scale;
            const cy = Math.sin(core.angle + this.angle) * core.dist * proj.scale;
            const coreSize = 18 * proj.scale;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
            coreGrad.addColorStop(0, '#ff8888');
            coreGrad.addColorStop(0.5, '#dd0000');
            coreGrad.addColorStop(1, '#660000');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // CHARGING WARNING - big pulsing ring
        if (this.charging > 0) {
            const pulse = Math.sin(Engine.totalTime * 15) * 0.3 + 1;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#ff0000';
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 5 * pulse;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5 * pulse, 0, Math.PI * 2);
            ctx.stroke();
            // Warning text
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ INCOMING ⚠', 0, -size - 30);
        }
        
        ctx.restore();
    }
    
    hit(damage, hitX, hitY) {
        const proj = project(this.x, this.y, this.z);
        if (!proj) return false;
        
        for (const core of this.cores) {
            if (!core.alive) continue;
            const cx = proj.x + Math.cos(core.angle + this.angle) * core.dist * proj.scale;
            const cy = proj.y + Math.sin(core.angle + this.angle) * core.dist * proj.scale;
            if (Math.sqrt((hitX - cx) ** 2 + (hitY - cy) ** 2) < 25 * proj.scale) {
                core.hp -= damage;
                this.hp -= damage;
                this.flash = 1;
                Audio.bossHit();
                Particles.explode(hitX, hitY, '#ff4444', 12);
                if (core.hp <= 0) { core.alive = false; ScreenShake.add(18); Particles.explode(cx, cy, '#ff8800', 30); }
                return true;
            }
        }
        
        if (Math.sqrt((hitX - proj.x) ** 2 + (hitY - proj.y) ** 2) < this.size * proj.scale) {
            this.hp -= damage * 0.25;
            this.flash = 0.4;
            Particles.sparks(hitX, hitY, '#ffff00', 6);
            return true;
        }
        return false;
    }
}

// ==================== STARBASE ====================

class Starbase {
    constructor() {
        this.x = (Math.random() - 0.5) * 400;
        this.y = (Math.random() - 0.5) * 300;
        this.z = 600 + Math.random() * 400;
        this.size = 60;
        this.angle = 0;
        this.pulse = 0;
        this.docking = false;
        this.dockProgress = 0;
    }
    
    update(dt) {
        this.angle += dt * 0.3;
        this.pulse += dt * 3;
        
        const proj = project(this.x, this.y, this.z);
        if (proj) {
            const dist = Math.sqrt((proj.x - CONFIG.WIDTH / 2) ** 2 + (proj.y - CONFIG.HEIGHT / 2) ** 2);
            if (dist < 80 && this.z < 200) {
                this.docking = true;
                this.dockProgress += dt;
                if (this.dockProgress >= 2) {
                    player.shields = Math.min(player.shields + 50, CONFIG.MAX_SHIELDS);
                    player.hull = Math.min(player.hull + 30, CONFIG.MAX_HULL);
                    player.energy = CONFIG.MAX_ENERGY;
                    player.missiles = Math.min(player.missiles + 3, 20);
                    Audio.powerup();
                    this.dockProgress = 0;
                    this.z = 800;
                }
            } else { this.docking = false; this.dockProgress = 0; }
        }
        if (this.z > 150) this.z -= 20 * dt;
    }
    
    draw(ctx) {
        const proj = project(this.x, this.y, this.z);
        if (!proj) return;
        const size = this.size * proj.scale;
        if (size < 5) return;
        
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(this.angle);
        ctx.scale(1 + Math.sin(this.pulse) * 0.05, 1 + Math.sin(this.pulse) * 0.05);
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff88';
        ctx.fillStyle = '#225533';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3);
            ctx.lineTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
            ctx.stroke();
        }
        
        ctx.fillStyle = '#00ffaa';
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        if (this.docking) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size + 10, 0, Math.PI * 2 * (this.dockProgress / 2));
            ctx.stroke();
        }
        ctx.restore();
        
        ctx.fillStyle = '#00ff88';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('STARBASE', proj.x, proj.y + size + 20);
        if (this.docking) { ctx.fillStyle = '#ffff00'; ctx.fillText('DOCKING...', proj.x, proj.y + size + 35); }
    }
}

// ==================== BULLETS ====================

class Bullet {
    constructor(x, y, z, dx, dy, dz) {
        this.x = x + player.shipX;
        this.y = y + player.shipY;
        this.z = z;
        this.dx = dx;
        this.dy = dy;
        this.dz = dz;
        this.speed = 1800;
        this.life = 2;
        this.dead = false;
        this.damage = 12;
        this.isMissile = false;
        this.target = null;
    }
    
    update(dt) {
        if (this.isMissile && this.target && !this.target.dead) {
            const toTarget = { x: this.target.x - this.x, y: this.target.y - this.y, z: this.target.z - this.z };
            const len = Math.sqrt(toTarget.x ** 2 + toTarget.y ** 2 + toTarget.z ** 2);
            if (len > 0) {
                const tracking = 6 * dt;
                this.dx += (toTarget.x / len - this.dx) * tracking;
                this.dy += (toTarget.y / len - this.dy) * tracking;
                this.dz += (toTarget.z / len - this.dz) * tracking;
                const dlen = Math.sqrt(this.dx ** 2 + this.dy ** 2 + this.dz ** 2);
                this.dx /= dlen; this.dy /= dlen; this.dz /= dlen;
            }
        }
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;
        this.z += this.dz * this.speed * dt;
        this.life -= dt;
        if (this.life <= 0 || this.z > CONFIG.VIEW_DISTANCE || this.z < 0) this.dead = true;
    }
    
    draw(ctx) {
        const proj = project(this.x, this.y, this.z);
        if (!proj) return;
        const size = (this.isMissile ? 8 : 5) * Math.min(1.5, proj.scale * 2.5);
        ctx.save();
        ctx.translate(proj.x, proj.y);
        if (this.isMissile) {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff8800';
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            Particles.trail(proj.x, proj.y, '#ff4400', 4, 0.25);
        } else {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class EnemyBullet {
    constructor(x, y, z, damage) {
        this.x = x; 
        this.y = y; 
        this.z = z; 
        this.speed = 280; // MUCH slower - was 600
        this.life = 5; 
        this.dead = false; 
        this.damage = damage;
        // Fixed direction toward where player WAS at time of firing (no homing)
        this.targetX = player.shipX;
        this.targetY = player.shipY;
        this.trail = [];
    }
    
    update(dt) {
        // Store trail positions
        if (this.trail.length > 8) this.trail.shift();
        this.trail.push({ x: this.x, y: this.y, z: this.z });
        
        // Move straight toward original target - NO HOMING
        this.z -= this.speed * dt;
        // Slight lateral movement toward where player WAS (predictable trajectory)
        const lateralSpeed = 80;
        this.x += (this.targetX - this.x) * 0.3 * dt;
        this.y += (this.targetY - this.y) * 0.3 * dt;
        
        this.life -= dt;
        
        // Collision check - only when very close
        if (this.z < 80 && this.z > 20) {
            const proj = project(this.x, this.y, this.z);
            if (proj) {
                // Check against current player position
                const dx = this.x - player.shipX;
                const dy = this.y - player.shipY;
                const dist3D = Math.sqrt(dx * dx + dy * dy);
                if (dist3D < 60) { // Hit radius in 3D space
                    takeDamage(this.damage, 'enemy fire');
                    this.dead = true;
                    Particles.explode(proj.x, proj.y, '#ff4444', 12);
                }
            }
        }
        if (this.life <= 0 || this.z < 0 || this.z > CONFIG.VIEW_DISTANCE) this.dead = true;
    }
    
    draw(ctx) {
        // Draw trail first
        this.trail.forEach((pos, i) => {
            const proj = project(pos.x, pos.y, pos.z);
            if (!proj) return;
            const alpha = (i / this.trail.length) * 0.5;
            const size = 5 * Math.min(2, proj.scale * 3);
            ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        const proj = project(this.x, this.y, this.z);
        if (!proj) return;
        const size = 10 * Math.min(3, proj.scale * 4); // Bigger bullets
        if (size < 3) return;
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff0000';
        // Bright core
        ctx.fillStyle = '#ffaaaa';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Outer glow
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== POWERUP & LOOT ====================

class Powerup3D {
    constructor(x, y, z, type) {
        this.x = x; this.y = y; this.z = z; this.type = type; this.dead = false; this.pulse = 0; this.speed = 30;
    }
    
    update(dt) {
        this.z -= this.speed * dt;
        this.pulse += dt * 5;
        const proj = project(this.x, this.y, this.z);
        if (proj && this.z < 400) {
            const dist = Math.sqrt((proj.x - CONFIG.WIDTH / 2) ** 2 + (proj.y - CONFIG.HEIGHT / 2) ** 2);
            if (dist < CONFIG.POWERUP_MAGNET_RANGE) {
                this.x += (player.shipX - this.x) * 3 * dt;
                this.y += (player.shipY - this.y) * 3 * dt;
                this.z -= 200 * dt;
            }
            if (dist < 120 && this.z < 150) { collectPowerup(this.type); this.dead = true; }
        }
        if (this.z < 30) this.dead = true;
    }
    
    draw(ctx) {
        const proj = project(this.x, this.y, this.z);
        if (!proj) return;
        const size = 22 * proj.scale;
        if (size < 4) return;
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.scale(1 + Math.sin(this.pulse) * 0.15, 1 + Math.sin(this.pulse) * 0.15);
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.type.color;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 8; if (i === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size); else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 2);
        ctx.restore();
    }
}

class Loot3D {
    constructor(x, y, z, value) {
        this.x = x; this.y = y; this.z = z; this.value = value; this.dead = false; this.pulse = Math.random() * Math.PI * 2; this.speed = 25;
    }
    
    update(dt) {
        this.z -= this.speed * dt;
        this.pulse += dt * 6;
        const proj = project(this.x, this.y, this.z);
        if (proj && this.z < 500) {
            const dist = Math.sqrt((proj.x - CONFIG.WIDTH / 2) ** 2 + (proj.y - CONFIG.HEIGHT / 2) ** 2);
            if (dist < CONFIG.LOOT_MAGNET_RANGE) {
                this.x += (player.shipX - this.x) * 4 * dt;
                this.y += (player.shipY - this.y) * 4 * dt;
                this.z -= 250 * dt;
            }
            if (dist < 100 && this.z < 120) { credits += this.value; this.dead = true; Audio.collect(); }
        }
        if (this.z < 20) this.dead = true;
    }
    
    draw(ctx) {
        const proj = project(this.x, this.y, this.z);
        if (!proj) return;
        const size = 12 * proj.scale;
        if (size < 3) return;
        const color = this.value >= 50 ? '#44ffff' : '#ffdd44';
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.scale(1 + Math.sin(this.pulse) * 0.25, 1 + Math.sin(this.pulse) * 0.25);
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.6, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// ==================== DAMAGE & COMBAT ====================

function takeDamage(amount, source) {
    if (godMode || player.invuln > 0) return;
    if (player.powerups.shield > 0) { amount *= 0.25; Audio.shield(); }
    if (player.shields > 0) { const sd = Math.min(player.shields, amount); player.shields -= sd; amount -= sd; }
    if (amount > 0) player.hull -= amount;
    player.invuln = 0.5;
    ScreenShake.add(amount * 0.6);
    Audio.damage();
    if (player.hull <= 0) gameOver();
}

function fireLaser() {
    if (player.fireTimer > 0) return;
    if (player.energy < CONFIG.LASER_COST && !godMode) return;
    if (!godMode) player.energy -= CONFIG.LASER_COST;
    player.fireTimer = player.powerups.rapid > 0 ? CONFIG.FIRE_RATE * 0.35 : CONFIG.FIRE_RATE;
    shotsFired++;
    const tp = unproject(player.reticleX, player.reticleY, 500);
    const len = Math.sqrt(tp.x ** 2 + tp.y ** 2 + tp.z ** 2);
    const dir = { x: tp.x / len, y: tp.y / len, z: tp.z / len };
    if (player.powerups.spread > 0) {
        for (let i = -1; i <= 1; i++) bullets.push(new Bullet(i * 40 * 0.08, 0, 50, dir.x + i * 0.08 * 0.25, dir.y, dir.z));
        Audio.shootTriple();
    } else { bullets.push(new Bullet(0, 0, 50, dir.x, dir.y, dir.z)); Audio.shoot(); }
}

function fireMissile() {
    if (player.missileTimer > 0) return;
    if (player.missiles <= 0 && !godMode && !infiniteMissiles) return;
    if (player.energy < CONFIG.MISSILE_COST && !godMode) return;
    if (!godMode && !infiniteMissiles) player.missiles--;
    if (!godMode) player.energy -= CONFIG.MISSILE_COST;
    player.missileTimer = CONFIG.MISSILE_RATE;
    const tp = unproject(player.reticleX, player.reticleY, 500);
    const len = Math.sqrt(tp.x ** 2 + tp.y ** 2 + tp.z ** 2);
    const dir = { x: tp.x / len, y: tp.y / len, z: tp.z / len };
    const missile = new Bullet(0, 0, 50, dir.x, dir.y, dir.z);
    missile.isMissile = true;
    missile.damage = 50;
    missile.speed = 900;
    missile.target = player.lockedTarget;
    bullets.push(missile);
    Audio.shootTorpedo();
}

function collectPowerup(type) {
    Audio.powerup();
    Particles.confetti(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 20);
    if (type.id === 'repair') { player.hull = Math.min(player.hull + 50, CONFIG.MAX_HULL); player.shields = Math.min(player.shields + 40, CONFIG.MAX_SHIELDS); }
    else if (type.id === 'energy') player.energy = CONFIG.MAX_ENERGY;
    else if (type.id === 'missiles') player.missiles += 5;
    else player.powerups[type.id] = type.duration;
    updatePowerupSlots();
}

// ==================== SPAWNING ====================

function spawnEnemy() {
    const types = LEVELS[currentLevel].enemyTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 300 + Math.random() * 300;
    enemies.push(new Enemy(type, Math.cos(angle) * dist, Math.sin(angle) * dist, CONFIG.VIEW_DISTANCE - 200 + Math.random() * 400));
}

function spawnWave() {
    const count = 2 + currentLevel + Math.floor(currentWave / 2);
    for (let i = 0; i < count; i++) setTimeout(() => spawnEnemy(), i * 400);
    currentWave++;
    UI.setText('waveDisplay', currentWave);
    if (currentWave <= LEVELS[currentLevel].waves) Audio.playVoice('incoming');
}

function spawnBoss() {
    boss = new Boss(currentLevel);
    bossActive = true;
    UI.addClass('bossHealthContainer', 'visible');
    document.getElementById('bossName').textContent = boss.name;
    Audio.playVoice('boss_incoming');
    Audio.playMusic(Audio.paths.music + 'star_kraken_boss.mp3');
}

function spawnLoot(x, y, z) {
    loots.push(new Loot3D(x, y, z, 15 + Math.floor(Math.random() * 25) + currentLevel * 8));
    if (Math.random() < 0.18) {
        const roll = Math.random();
        let cum = 0;
        for (const type of POWERUP_TYPES) { cum += type.chance; if (roll < cum) { powerups.push(new Powerup3D(x + (Math.random() - 0.5) * 50, y, z, type)); break; } }
    }
}

// ==================== COLLISION ====================

function checkCollisions() {
    for (const bullet of bullets) {
        if (bullet.dead) continue;
        if (bossActive && boss && !boss.dead) {
            const proj = project(bullet.x, bullet.y, bullet.z);
            if (proj && Math.abs(bullet.z - boss.z) < 60) {
                if (boss.hit(bullet.damage, proj.x, proj.y)) { bullet.dead = true; shotsHit++; if (boss.hp <= 0) bossDefeated(); continue; }
            }
        }
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const dist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2 + (bullet.z - enemy.z) ** 2);
            if (dist < enemy.size + 15) {
                const killed = enemy.hit(bullet.damage);
                bullet.dead = true;
                shotsHit++;
                if (killed) {
                    score += Math.floor(enemy.score * (1 + combo * 0.1));
                    combo++;
                    comboTimer = 2.5;
                    maxCombo = Math.max(maxCombo, combo);
                    totalKills++;
                    spawnLoot(enemy.x, enemy.y, enemy.z);
                    const proj = project(enemy.x, enemy.y, enemy.z);
                    if (proj) Particles.explodeMulti(proj.x, proj.y, [enemy.color, '#ffffff', '#ffff00'], 25);
                    Audio.explode(enemy.type === 'heavy' || enemy.type === 'bomber');
                }
                break;
            }
        }
    }
}

// ==================== GAME FLOW ====================

function startGame() {
    currentLevel = 0; currentWave = 0; waveTimer = 2; score = 0; credits = 0; totalKills = 0; shotsFired = 0; shotsHit = 0; combo = 0; maxCombo = 0; bossesDefeated = 0; gameStartTime = performance.now();
    resetPlayer(); clearEntities(); UI.hideAllScreens(); Engine.setState('playing'); startLevel(); Audio.playMusic(Audio.paths.music + 'theme_star_kraken.mp3');
    Input.showTouchControls(); Input.setAltButtonLabel('MISSILE');
}

function startLevel() {
    currentWave = 0; waveTimer = 2; bossActive = false; boss = null; starbase = null;
    UI.removeClass('bossHealthContainer', 'visible');
    document.getElementById('sectorName').textContent = `SECTOR ${currentLevel + 1} - ${LEVELS[currentLevel].name}`;
    UI.setText('totalWaves', LEVELS[currentLevel].waves);
    UI.setText('waveDisplay', '0');
    clearEntities();
    if (currentLevel > 0 && Math.random() < 0.5) starbase = new Starbase();
}

function resetPlayer() {
    player.shipX = 0; player.shipY = 0; player.reticleX = CONFIG.WIDTH / 2; player.reticleY = CONFIG.HEIGHT / 2;
    player.shields = CONFIG.MAX_SHIELDS; player.energy = CONFIG.MAX_ENERGY; player.hull = CONFIG.MAX_HULL; player.missiles = 10;
    player.fireTimer = 0; player.missileTimer = 0; player.invuln = 0; player.powerups = { shield: 0, rapid: 0, spread: 0 }; player.lockedTarget = null;
}

function clearEntities() { enemies = []; bullets = []; enemyBullets = []; powerups = []; loots = []; Particles.clear(); window.stars = null; }

function bossDefeated() {
    boss.dead = true; bossActive = false; bossesDefeated++;
    ScreenShake.add(35);
    const proj = project(boss.x, boss.y, boss.z);
    if (proj) for (let i = 0; i < 6; i++) setTimeout(() => { Particles.explodeMulti(proj.x + (Math.random() - 0.5) * 120, proj.y + (Math.random() - 0.5) * 120, ['#ff4400', '#ffff00', '#ffffff'], 35); Audio.explode(true); }, i * 180);
    score += boss.maxHP * 12; credits += 600 + currentLevel * 150;
    for (let i = 0; i < 12; i++) setTimeout(() => spawnLoot(boss.x + (Math.random() - 0.5) * 150, boss.y + (Math.random() - 0.5) * 150, boss.z), i * 80);
    setTimeout(() => levelComplete(), 2500);
}

function levelComplete() {
    Engine.setState('levelComplete');
    Input.hideTouchControls();
    document.getElementById('sectorClearedName').textContent = LEVELS[currentLevel].name + ' Secured!';
    document.getElementById('levelScore').textContent = score.toLocaleString();
    document.getElementById('levelCredits').textContent = credits.toLocaleString();
    document.getElementById('levelAccuracy').textContent = shotsFired > 0 ? Math.round(shotsHit / shotsFired * 100) + '%' : '0%';
    document.getElementById('levelCombo').textContent = maxCombo;
    UI.showScreen('levelScreen'); Audio.levelComplete();
}

function nextLevel() {
    currentLevel++;
    if (currentLevel >= LEVELS.length) { victory(); return; }
    UI.hideScreen('levelScreen'); Engine.setState('playing'); startLevel(); Audio.playMusic(Audio.paths.music + 'theme_star_kraken.mp3');
    Input.showTouchControls();
}

function gameOver() {
    Engine.setState('gameOver');
    Input.hideTouchControls();
    document.getElementById('deathSector').textContent = currentLevel + 1;
    document.getElementById('finalScore').textContent = score.toLocaleString();
    document.getElementById('lostCredits').textContent = credits.toLocaleString();
    document.getElementById('finalKills').textContent = totalKills;
    const elapsed = (performance.now() - gameStartTime) / 1000;
    document.getElementById('finalTime').textContent = `${Math.floor(elapsed / 60)}:${Math.floor(elapsed % 60).toString().padStart(2, '0')}`;
    UI.showScreen('gameOverScreen'); Audio.gameOver();
}

function victory() {
    Engine.setState('victory');
    Input.hideTouchControls();
    document.getElementById('victoryScore').textContent = score.toLocaleString();
    document.getElementById('victoryCredits').textContent = credits.toLocaleString();
    document.getElementById('victoryBosses').textContent = bossesDefeated;
    const elapsed = (performance.now() - gameStartTime) / 1000;
    document.getElementById('victoryTime').textContent = `${Math.floor(elapsed / 60)}:${Math.floor(elapsed % 60).toString().padStart(2, '0')}`;
    UI.showScreen('victoryScreen'); Audio.playVoice('mission_complete');
}

function togglePause() {
    if (Engine.state === 'playing') { Engine.setState('paused'); UI.showScreen('pauseScreen'); Audio.pause(); Input.hideTouchControls(); }
    else if (Engine.state === 'paused') { Engine.setState('playing'); UI.hideScreen('pauseScreen'); Audio.unpause(); Input.showTouchControls(); }
}

function toggleMap() { mapOpen = !mapOpen; document.getElementById('mapOverlay').classList.toggle('visible', mapOpen); }

// ==================== UPDATE ====================

function update(dt) {
    if (Engine.state !== 'playing') return;
    updateInput(dt);
    
    player.fireTimer -= dt; player.missileTimer -= dt; player.invuln -= dt;
    player.energy = Math.min(player.energy + CONFIG.ENERGY_REGEN * dt, CONFIG.MAX_ENERGY);
    
    // Shield regeneration (slow, only when not recently hit)
    if (player.invuln <= -2) { // 2 seconds after last hit
        player.shields = Math.min(player.shields + 3 * dt, CONFIG.MAX_SHIELDS);
    }
    
    if (godMode) { player.shields = CONFIG.MAX_SHIELDS; player.energy = CONFIG.MAX_ENERGY; player.hull = CONFIG.MAX_HULL; player.missiles = 99; player.powerups.shield = 10; player.powerups.rapid = 10; player.powerups.spread = 10; }
    
    for (const key in player.powerups) if (player.powerups[key] > 0 && !godMode) player.powerups[key] -= dt;
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
    
    if (!bossActive && enemies.length === 0 && currentWave < LEVELS[currentLevel].waves) { waveTimer -= dt; if (waveTimer <= 0) { spawnWave(); waveTimer = LEVELS[currentLevel].spawnRate + 2.5; } }
    if (!bossActive && currentWave >= LEVELS[currentLevel].waves && enemies.length === 0) spawnBoss();
    
    enemies.forEach(e => e.update(dt)); bullets.forEach(b => b.update(dt)); enemyBullets.forEach(b => b.update(dt)); powerups.forEach(p => p.update(dt)); loots.forEach(l => l.update(dt));
    if (boss) boss.update(dt); if (starbase) starbase.update(dt);
    
    enemies = enemies.filter(e => !e.dead); bullets = bullets.filter(b => !b.dead); enemyBullets = enemyBullets.filter(b => !b.dead); powerups = powerups.filter(p => !p.dead); loots = loots.filter(l => !l.dead);
    
    checkCollisions(); updateLockOn(dt); Particles.update(dt); ScreenShake.update(dt); updateHUD();
}

function updateInput(dt) {
    const moveSpeed = CONFIG.SHIP_SPEED;
    if (Input.isDown('left')) player.shipX -= moveSpeed * dt;
    if (Input.isDown('right')) player.shipX += moveSpeed * dt;
    if (Input.isDown('up')) player.shipY -= moveSpeed * dt;
    if (Input.isDown('down')) player.shipY += moveSpeed * dt;
    player.shipX = Math.max(-400, Math.min(400, player.shipX));
    player.shipY = Math.max(-300, Math.min(300, player.shipY));
    player.reticleX = CONFIG.WIDTH / 2; player.reticleY = CONFIG.HEIGHT / 2;
    if (Input.isDown('fire')) fireLaser();
    Input.update();
}

function updateLockOn(dt) {
    let closest = null, closestDist = Infinity;
    const targets = bossActive && boss ? [boss, ...enemies] : enemies;
    for (const target of targets) {
        if (target.dead) continue;
        const proj = project(target.x, target.y, target.z);
        if (!proj) continue;
        const dist = Math.sqrt((proj.x - CONFIG.WIDTH / 2) ** 2 + (proj.y - CONFIG.HEIGHT / 2) ** 2);
        if (dist < 150 && dist < closestDist) { closest = target; closestDist = dist; }
    }
    if (closest) { if (player.lockedTarget === closest) player.lockTimer += dt; else { player.lockedTarget = closest; player.lockTimer = 0; } }
    else { player.lockedTarget = null; player.lockTimer = 0; }
    
    const lockEl = document.getElementById('lockIndicator'), targetInfo = document.getElementById('targetInfo');
    if (player.lockedTarget && player.lockTimer > 0.4) { lockEl.classList.add('active'); targetInfo.textContent = `${player.lockedTarget.name || player.lockedTarget.type?.toUpperCase() || 'ENEMY'} - ${Math.round(player.lockedTarget.z)}m`; }
    else { lockEl.classList.remove('active'); targetInfo.textContent = player.lockedTarget ? 'ACQUIRING...' : 'NO TARGET'; }
}

function updateHUD() {
    UI.setText('scoreDisplay', score.toLocaleString()); UI.setText('creditsDisplay', credits.toLocaleString());
    document.getElementById('shieldFill').style.width = (player.shields / CONFIG.MAX_SHIELDS * 100) + '%';
    document.getElementById('energyFill').style.width = (player.energy / CONFIG.MAX_ENERGY * 100) + '%';
    document.getElementById('hullFill').style.width = (player.hull / CONFIG.MAX_HULL * 100) + '%';
    if (boss) document.getElementById('bossHealthFill').style.width = (boss.hp / boss.maxHP * 100) + '%';
    const comboEl = document.getElementById('comboDisplay');
    if (combo > 1) { comboEl.textContent = `COMBO x${combo}`; comboEl.classList.add('active'); } else comboEl.classList.remove('active');
    updatePowerupSlots();
    document.getElementById('alertIndicator').style.display = player.hull < 30 ? 'block' : 'none';
}

function updatePowerupSlots() {
    ['shield', 'rapid', 'spread', 'missiles'].forEach(id => {
        const slot = document.getElementById('slot-' + id);
        if (!slot) return;
        if (id === 'missiles') { slot.classList.toggle('active', player.missiles > 0); slot.querySelector('span').textContent = '🚀' + (player.missiles > 0 ? player.missiles : ''); }
        else { const active = player.powerups[id] > 0; slot.classList.toggle('active', active); const timer = slot.querySelector('.powerup-timer'); if (timer) { const type = POWERUP_TYPES.find(t => t.id === id); timer.style.width = active && type ? (player.powerups[id] / type.duration * 100) + '%' : '0%'; } }
    });
}

// ==================== RENDER ====================

function render(ctx) {
    ctx.fillStyle = '#000010'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    ctx.save(); ScreenShake.apply(ctx);
    drawStarfield(ctx); drawNebula(ctx);
    if (starbase) starbase.draw(ctx);
    loots.forEach(l => l.draw(ctx)); powerups.forEach(p => p.draw(ctx));
    [...enemies].sort((a, b) => b.z - a.z).forEach(e => e.draw(ctx));
    if (boss && !boss.dead) boss.draw(ctx);
    bullets.forEach(b => b.draw(ctx)); enemyBullets.forEach(b => b.draw(ctx));
    Particles.draw(ctx); 
    drawIncomingWarnings(ctx); // Warning arrows for incoming fire
    drawReticle(ctx); drawCockpit(ctx); drawRadar();
    ctx.restore();
    if (mapOpen) drawMap();
}

function drawStarfield(ctx) {
    if (!window.stars) { window.stars = []; for (let i = 0; i < 350; i++) window.stars.push({ x: (Math.random() - 0.5) * 2500, y: (Math.random() - 0.5) * 1800, z: Math.random() * CONFIG.VIEW_DISTANCE, speed: 250 + Math.random() * 500 }); }
    const dt = Engine.deltaTime || 0.016;
    window.stars.forEach(star => {
        star.z -= star.speed * dt;
        if (star.z <= 1) { star.z = CONFIG.VIEW_DISTANCE; star.x = (Math.random() - 0.5) * 2500; star.y = (Math.random() - 0.5) * 1800; star.speed = 250 + Math.random() * 500; }
        const proj = project(star.x, star.y, star.z);
        if (!proj || proj.x < -50 || proj.x > CONFIG.WIDTH + 50 || proj.y < -50 || proj.y > CONFIG.HEIGHT + 50) return;
        const size = Math.max(1, 3.5 * proj.scale), brightness = Math.min(1, 1.8 - star.z / CONFIG.VIEW_DISTANCE);
        const streakLength = Math.min(30, star.speed * dt * proj.scale * 0.6);
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`; ctx.lineWidth = size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(proj.x, proj.y);
        const dx = proj.x - CONFIG.WIDTH / 2, dy = proj.y - CONFIG.HEIGHT / 2, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) ctx.lineTo(proj.x + (dx / dist) * streakLength, proj.y + (dy / dist) * streakLength); else ctx.lineTo(proj.x, proj.y + streakLength);
        ctx.stroke();
        if (star.z < 250) { ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`; ctx.beginPath(); ctx.arc(proj.x, proj.y, size * 0.6, 0, Math.PI * 2); ctx.fill(); }
    });
}

function drawNebula(ctx) {
    const color = LEVELS[currentLevel]?.color || '#4488ff';
    const gradient = ctx.createRadialGradient(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 0, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 550);
    gradient.addColorStop(0, color + '18'); gradient.addColorStop(0.5, color + '0a'); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
}

function drawIncomingWarnings(ctx) {
    // Show warning arrows at screen edge for incoming projectiles
    enemyBullets.forEach(bullet => {
        if (bullet.z > 500 || bullet.z < 100) return; // Only warn for mid-range bullets
        
        const proj = project(bullet.x, bullet.y, bullet.z);
        if (!proj) return;
        
        // Check if bullet is heading toward player
        const dx = bullet.x - player.shipX;
        const dy = bullet.y - player.shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) { // Bullet is close to player's path
            const urgency = 1 - (bullet.z / 500); // More urgent as it gets closer
            const alpha = Math.min(1, urgency * 2);
            
            // Draw warning indicator pointing to bullet direction
            const angle = Math.atan2(dy, dx);
            const edgeDist = 80;
            const indicatorX = CONFIG.WIDTH / 2 + Math.cos(angle) * edgeDist;
            const indicatorY = CONFIG.HEIGHT / 2 + Math.sin(angle) * edgeDist;
            
            ctx.save();
            ctx.translate(indicatorX, indicatorY);
            ctx.rotate(angle);
            
            ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
            
            // Arrow pointing inward (direction of threat)
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-8, -10);
            ctx.lineTo(-8, 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    });
}

function drawReticle(ctx) {
    const x = CONFIG.WIDTH / 2, y = CONFIG.HEIGHT / 2, locked = player.lockedTarget && player.lockTimer > 0.4;
    ctx.save(); ctx.translate(x, y);
    if (locked) { ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 40 + Math.sin(Engine.totalTime * 10) * 6, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = locked ? '#ff4444' : '#00ffff'; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = ctx.strokeStyle;
    const size = 30;
    ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(-size * 0.35, 0); ctx.moveTo(size * 0.35, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size); ctx.lineTo(0, -size * 0.35); ctx.moveTo(0, size * 0.35); ctx.lineTo(0, size); ctx.stroke();
    ctx.beginPath(); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { ctx.moveTo(sx * size, sy * size); ctx.lineTo(sx * size * 0.5, sy * size); ctx.moveTo(sx * size, sy * size); ctx.lineTo(sx * size, sy * size * 0.5); }); ctx.stroke();
    ctx.restore();
}

function drawCockpit(ctx) {
    ctx.strokeStyle = '#006688'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 35); ctx.lineTo(120, 55); ctx.lineTo(CONFIG.WIDTH - 120, 55); ctx.lineTo(CONFIG.WIDTH, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CONFIG.HEIGHT - 35); ctx.lineTo(170, CONFIG.HEIGHT - 65); ctx.lineTo(CONFIG.WIDTH - 170, CONFIG.HEIGHT - 65); ctx.lineTo(CONFIG.WIDTH, CONFIG.HEIGHT - 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(55, 170); ctx.lineTo(55, CONFIG.HEIGHT - 170); ctx.lineTo(35, CONFIG.HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CONFIG.WIDTH - 35, 0); ctx.lineTo(CONFIG.WIDTH - 55, 170); ctx.lineTo(CONFIG.WIDTH - 55, CONFIG.HEIGHT - 170); ctx.lineTo(CONFIG.WIDTH - 35, CONFIG.HEIGHT); ctx.stroke();
    const gradient = ctx.createRadialGradient(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.HEIGHT * 0.25, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.HEIGHT * 0.85);
    gradient.addColorStop(0, 'transparent'); gradient.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
}

function drawRadar() {
    const radarCanvas = document.getElementById('radarCanvas'); if (!radarCanvas) return;
    const rctx = radarCanvas.getContext('2d'), size = 140, center = size / 2;
    rctx.clearRect(0, 0, size, size);
    const gradient = rctx.createRadialGradient(center, center, 0, center, center, center); gradient.addColorStop(0, '#001522'); gradient.addColorStop(1, '#000a11');
    rctx.fillStyle = gradient; rctx.beginPath(); rctx.arc(center, center, center - 2, 0, Math.PI * 2); rctx.fill();
    rctx.strokeStyle = '#004466'; rctx.lineWidth = 1;
    rctx.beginPath(); rctx.arc(center, center, center * 0.33, 0, Math.PI * 2); rctx.stroke();
    rctx.beginPath(); rctx.arc(center, center, center * 0.66, 0, Math.PI * 2); rctx.stroke();
    rctx.beginPath(); rctx.moveTo(center, 5); rctx.lineTo(center, size - 5); rctx.moveTo(5, center); rctx.lineTo(size - 5, center); rctx.stroke();
    const scale = (center - 10) / 600;
    enemies.forEach(enemy => { const rx = center + (enemy.x - player.shipX) * scale * 0.15, ry = center + (enemy.y - player.shipY) * scale * 0.15 - (enemy.z - 400) * scale * 0.08; if (rx > 5 && rx < size - 5 && ry > 5 && ry < size - 5) { rctx.fillStyle = enemy.color; rctx.beginPath(); rctx.arc(rx, ry, 4, 0, Math.PI * 2); rctx.fill(); } });
    if (boss && !boss.dead) { rctx.fillStyle = '#ff0000'; rctx.beginPath(); rctx.arc(center + (boss.x - player.shipX) * scale * 0.15, center - (boss.z - 400) * scale * 0.08, 6, 0, Math.PI * 2); rctx.fill(); }
    if (starbase) { rctx.fillStyle = '#00ff88'; rctx.beginPath(); rctx.rect(center + (starbase.x - player.shipX) * scale * 0.15 - 4, center - (starbase.z - 400) * scale * 0.08 - 4, 8, 8); rctx.fill(); }
    rctx.fillStyle = '#00ff00'; rctx.beginPath(); rctx.moveTo(center, center + 6); rctx.lineTo(center - 5, center - 4); rctx.lineTo(center + 5, center - 4); rctx.closePath(); rctx.fill();
    rctx.strokeStyle = '#00ff8855'; rctx.lineWidth = 2; rctx.beginPath(); rctx.moveTo(center, center); rctx.lineTo(center + Math.cos(Engine.totalTime * 2) * (center - 5), center + Math.sin(Engine.totalTime * 2) * (center - 5)); rctx.stroke();
}

function drawMap() {
    const mapCanvas = document.getElementById('mapCanvas'); if (!mapCanvas) return;
    const mctx = mapCanvas.getContext('2d');
    mctx.fillStyle = '#000511'; mctx.fillRect(0, 0, 900, 700);
    mctx.font = 'bold 32px monospace'; mctx.fillStyle = '#00ffff'; mctx.textAlign = 'center'; mctx.fillText('GALACTIC MAP', 450, 50);
    mctx.font = '14px monospace'; mctx.fillStyle = '#888'; mctx.fillText('Press M to close', 450, 75);
    LEVELS.forEach((level, i) => {
        const x = 100 + (i % 5) * 150, y = 200 + Math.floor(i / 5) * 200;
        const isCurrent = i === currentLevel, isCompleted = i < currentLevel, isLocked = i > currentLevel;
        if (i > 0) { mctx.strokeStyle = isCompleted ? '#00ff88' : '#333'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(100 + ((i - 1) % 5) * 150 + 30, 200 + Math.floor((i - 1) / 5) * 200); mctx.lineTo(x - 30, y); mctx.stroke(); }
        mctx.fillStyle = isCompleted ? '#00ff8844' : (isCurrent ? level.color + '44' : '#222'); mctx.strokeStyle = isCompleted ? '#00ff88' : (isCurrent ? level.color : '#444'); mctx.lineWidth = isCurrent ? 3 : 2;
        mctx.beginPath(); mctx.arc(x, y, 25, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
        mctx.font = 'bold 16px monospace'; mctx.fillStyle = isLocked ? '#666' : '#fff'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText(i + 1, x, y);
        mctx.font = '10px monospace'; mctx.fillStyle = isLocked ? '#444' : level.color; mctx.fillText(level.name, x, y + 40);
        if (isCurrent) { mctx.fillStyle = '#ffffff'; mctx.font = '16px monospace'; mctx.fillText('▼', x, y - 40); }
    });
    const current = LEVELS[currentLevel]; mctx.font = 'bold 18px monospace'; mctx.fillStyle = current.color; mctx.textAlign = 'left';
    mctx.fillText(`CURRENT: ${current.name}`, 50, 550); mctx.font = '14px monospace'; mctx.fillStyle = '#888';
    mctx.fillText(`Boss: ${current.bossName}`, 50, 580); mctx.fillText(`Waves: ${current.waves}`, 50, 600); mctx.fillText(`Enemy Types: ${current.enemyTypes.join(', ')}`, 50, 620);
}

// ==================== INPUT ====================

Input.init();
Input.bindings.fire = ['Space']; Input.bindings.missile = ['Tab']; Input.bindings.map = ['KeyM'];
Input.onPause = togglePause;
Input.onQuit = function() {
    if (Engine.state === 'start') {
        window.location.href = '/KrakenArKade.html';
    } else if (Engine.state === 'paused' || Engine.state === 'levelComplete' || Engine.state === 'gameOver' || Engine.state === 'victory') {
        Engine.setState('start');
        UI.hideAllScreens();
        UI.showScreen('startScreen');
        Input.hideTouchControls();
    } else if (Engine.state === 'playing') {
        togglePause();
    }
};
Input.onSettings = () => { if (Engine.state === 'playing' || Engine.state === 'paused') UI.toggleScreen('settingsScreen'); };
document.addEventListener('keydown', (e) => { if (e.code === 'Tab') { e.preventDefault(); fireMissile(); } if (e.code === 'KeyM') { e.preventDefault(); if (Engine.state === 'playing') toggleMap(); } });

// ==================== INIT ====================

if (!Engine.init('gameCanvas', CONFIG.WIDTH, CONFIG.HEIGHT)) console.error('Failed to initialize engine!');
Engine.onUpdate = update; Engine.onRender = render;

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('victoryBtn').addEventListener('click', startGame);
document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('quitBtn').addEventListener('click', () => { Engine.setState('start'); UI.hideAllScreens(); UI.showScreen('startScreen'); });
document.getElementById('settingsCloseBtn')?.addEventListener('click', () => UI.hideScreen('settingsScreen'));

['master', 'music', 'sfx', 'voice'].forEach(type => {
    const slider = document.getElementById(type + 'Volume'), label = document.getElementById(type + 'VolLabel');
    if (slider) slider.addEventListener('input', (e) => { const val = e.target.value / 100; if (type === 'master') Audio.setMasterVolume(val); else if (type === 'music') Audio.setMusicVolume(val); else if (type === 'sfx') Audio.setSFXVolume(val); else if (type === 'voice') Audio.setVoiceVolume(val); label.textContent = e.target.value + '%'; });
});

document.getElementById('godModeToggle')?.addEventListener('change', (e) => { godMode = e.target.checked; });
document.getElementById('infiniteMissiles')?.addEventListener('change', (e) => { infiniteMissiles = e.target.checked; });

const warpContainer = document.getElementById('warpButtons');
if (warpContainer) LEVELS.forEach((level, i) => { const btn = document.createElement('button'); btn.textContent = i + 1; btn.title = level.name; btn.style.cssText = `width:30px;height:25px;background:${level.color}33;border:1px solid ${level.color};color:${level.color};cursor:pointer;font-size:11px;`; btn.addEventListener('click', () => { currentLevel = i; UI.hideScreen('settingsScreen'); startLevel(); Engine.setState('playing'); }); warpContainer.appendChild(btn); });

Engine.setState('start'); Engine.start();

// Backup Q key listener for returning to Arkade from start screen
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' && Engine.state === 'start') {
        window.location.href = '/KrakenArKade.html';
    }
});

function unlockAudio() { Audio.init(); if (Audio.ctx?.state === 'suspended') Audio.ctx.resume(); }
['keydown', 'mousedown', 'touchstart', 'click'].forEach(e => window.addEventListener(e, unlockAudio));

console.log('🦑 STAR KRAKEN - Ready for launch!');