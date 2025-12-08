// ==================== HIVE ASSAULT - GAME.JS ====================
// Horizontal shooter - destroy alien hives across 10 sectors

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==================== CONFIGURATION ====================
const CONFIG = {
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 600,
    MAX_HEALTH: 100,
    PLAYER_SPEED: 280,
    BULLET_SPEED: 500,
    FIRE_RATE: 0.15,
    
    // Game colors (purple/pink/green theme)
    PRIMARY: '#a0f',
    ACCENT: '#f0a',
    GLOW: '#0f8'
};

// ==================== POWERUP TYPES ====================
const POWERUP_TYPES = [
    { id: 'shield', name: 'SHIELD', icon: '🛡️', color: '#00ffff', duration: 8, chance: 0.15 },
    { id: 'rapid', name: 'RAPID FIRE', icon: '⚡', color: '#ffff00', duration: 6, chance: 0.20 },
    { id: 'triple', name: 'TRIPLE SHOT', icon: '🔱', color: '#ff00ff', duration: 7, chance: 0.15 },
    { id: 'magnet', name: 'MAGNET', icon: '🧲', color: '#ff8800', duration: 10, chance: 0.15 },
    { id: 'heal', name: 'REPAIR', icon: '💚', color: '#00ff00', duration: 0, chance: 0.20 },
    { id: 'bomb', name: 'BOMB', icon: '💣', color: '#ff4444', duration: 0, chance: 0.15 }
];

// ==================== LEVEL DEFINITIONS ====================
const LEVELS = [
    // Level 1 - Tutorial
    { hives: 1, droneChance: 0.1, spawnRate: 3.5, speedMod: 1.0, hiveHp: 5 },
    // Level 2 - Getting started
    { hives: 2, droneChance: 0.15, spawnRate: 3.2, speedMod: 1.05, hiveHp: 6 },
    // Level 3 - First challenge
    { hives: 2, droneChance: 0.2, spawnRate: 3.0, speedMod: 1.1, hiveHp: 7 },
    // Level 4 - Warming up
    { hives: 3, droneChance: 0.25, spawnRate: 2.8, speedMod: 1.15, hiveHp: 8 },
    // Level 5 - Mid-game
    { hives: 3, droneChance: 0.3, spawnRate: 2.5, speedMod: 1.2, hiveHp: 9 },
    // Level 6 - Picking up pace
    { hives: 3, droneChance: 0.35, spawnRate: 2.3, speedMod: 1.25, hiveHp: 10 },
    // Level 7 - Getting serious
    { hives: 4, droneChance: 0.4, spawnRate: 2.0, speedMod: 1.3, hiveHp: 12 },
    // Level 8 - Hard
    { hives: 4, droneChance: 0.45, spawnRate: 1.8, speedMod: 1.35, hiveHp: 14 },
    // Level 9 - Very hard
    { hives: 4, droneChance: 0.5, spawnRate: 1.5, speedMod: 1.4, hiveHp: 16 },
    // Level 10 - BOSS
    { hives: 0, droneChance: 0.3, spawnRate: 2.5, speedMod: 1.2, hiveHp: 0, boss: true }
];

// ==================== GAME STATE ====================
let gameState = 'menu'; // menu, playing, paused, gameover, victory
let score = 0;
let level = 1;
let bombs = 0;
let secretMenuOpen = false;
let godMode = false;

// Player
let player = {
    x: 150,
    y: CONFIG.CANVAS_HEIGHT / 2,
    width: 45,
    height: 30,
    health: CONFIG.MAX_HEALTH,
    isDead: false,
    fireTimer: 0,
    invincibleTimer: 0,
    powerups: {
        shield: 0,
        rapid: 0,
        triple: 0,
        magnet: 0
    }
};

// Game objects
let playerBullets = [];
let alienBullets = [];
let aliens = [];
let hives = [];
let loot = [];
let powerups = [];
let boss = null;

// Background
let stars = [];
let nebulae = [];
let thrusterTime = 0;

// Timers
let levelTimer = 0;
let hiveSpawnTimer = 0;
let levelComplete = false;
let levelTransition = false;
let transitionTimer = 0;

// ==================== AUDIO INITIALIZATION ====================
// Audio is initialized on first user interaction via the shared module

// ==================== INITIALIZATION ====================
function initBackground() {
    stars = [];
    nebulae = [];
    
    // Create stars
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: Math.random() * 2,
            speed: 30 + Math.random() * 50,
            alpha: Math.random() * 0.5 + 0.3
        });
    }
    
    // Create nebula clouds
    for (let i = 0; i < 8; i++) {
        nebulae.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: 100 + Math.random() * 150,
            speed: 10 + Math.random() * 20,
            hue: 260 + Math.random() * 60, // Purple to pink
            alpha: 0.05 + Math.random() * 0.1
        });
    }
}

function initLevel() {
    const levelData = LEVELS[level - 1];
    
    aliens = [];
    alienBullets = [];
    loot = [];
    
    levelTimer = 0;
    hiveSpawnTimer = 0;
    levelComplete = false;
    levelTransition = false;
    
    // Spawn hives for this level
    hives = [];
    if (!levelData.boss) {
        for (let i = 0; i < levelData.hives; i++) {
            const hx = CONFIG.CANVAS_WIDTH - 80 - Math.random() * 100;
            const hy = 80 + (i * ((CONFIG.CANVAS_HEIGHT - 160) / Math.max(1, levelData.hives - 1)));
            hives.push(new Hive(hx, hy + (Math.random() - 0.5) * 40, levelData.hiveHp));
        }
        // Voice callout for hives
        if (level > 1) {
            setTimeout(() => Audio.voiceHiveLocated(), 500);
        }
    }
    
    // Spawn boss on level 10
    boss = null;
    if (levelData.boss) {
        boss = new SwarmQueen();
        document.getElementById('bossHealthContainer').classList.remove('hidden');
        // Boss warning voice
        setTimeout(() => Audio.voiceBossWarning(), 500);
        // Switch to boss music
        Audio.playTrack('hiveAssaultBoss');
    } else {
        document.getElementById('bossHealthContainer').classList.add('hidden');
    }
    
    updateUI();
}

function resetPlayer() {
    player.x = 150;
    player.y = CONFIG.CANVAS_HEIGHT / 2;
    player.health = CONFIG.MAX_HEALTH;
    player.isDead = false;
    player.fireTimer = 0;
    player.invincibleTimer = 2; // Brief invincibility on spawn
    player.powerups = { shield: 0, rapid: 0, triple: 0, magnet: 0 };
    playerBullets = [];
}

// ==================== PLAYER SHIP (Rotated for horizontal) ====================
function drawShip() {
    if (player.isDead) return;
    
    const x = player.x;
    const y = player.y;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Shield effect
    if (player.powerups.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(Date.now() * 0.01) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = `rgba(0, 255, 255, 0.1)`;
        ctx.fill();
    }
    
    // Invincibility flash
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    thrusterTime += 0.25;
    
    // Thruster flames (pointing left, ship faces right)
    const isThrusting = Input.isDown('right');
    const baseLength = isThrusting ? 35 : 18;
    const flickerAmt = isThrusting ? 15 : 8;
    
    const f1 = Math.sin(thrusterTime * 2.1) * 0.5 + 0.5;
    const f2 = Math.sin(thrusterTime * 3.4) * 0.5 + 0.5;
    const flicker = (f1 + f2) / 2;
    const thrusterLen = baseLength + flicker * flickerAmt + Math.random() * 5;
    
    // Outer flame (red)
    ctx.globalAlpha = 0.3 + flicker * 0.2;
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-18 - thrusterLen - 5, 0);
    ctx.lineTo(-18, 8);
    ctx.closePath();
    ctx.fill();
    
    // Middle flame (orange)
    ctx.globalAlpha = 0.6 + f1 * 0.3;
    ctx.fillStyle = '#f80';
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(-18 - thrusterLen, 0);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    
    // Inner flame (yellow)
    ctx.globalAlpha = 0.8 + f2 * 0.2;
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(-18 - thrusterLen * 0.6, 0);
    ctx.lineTo(-18, 3);
    ctx.closePath();
    ctx.fill();
    
    // Core flame (white)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-18 - thrusterLen * 0.3, 0);
    ctx.lineTo(-18, 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.globalAlpha = 1;
    
    // Ship hull glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    
    // Main body (facing right)
    ctx.fillStyle = '#1a2a3a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(25, 0);      // Nose
    ctx.lineTo(10, -12);
    ctx.lineTo(-15, -15);
    ctx.lineTo(-20, -8);
    ctx.lineTo(-20, 8);
    ctx.lineTo(-15, 15);
    ctx.lineTo(10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Cockpit
    const cockpitGrad = ctx.createLinearGradient(5, -8, 15, 8);
    cockpitGrad.addColorStop(0, '#00ffff');
    cockpitGrad.addColorStop(1, '#004466');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(8, -6);
    ctx.lineTo(2, 0);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();
    
    // Wing stripes
    ctx.strokeStyle = '#00aaaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(-12, -14);
    ctx.moveTo(-5, 10);
    ctx.lineTo(-12, 14);
    ctx.stroke();
    
    // Engine pods
    ctx.fillStyle = '#334455';
    ctx.fillRect(-18, -14, 8, 5);
    ctx.fillRect(-18, 9, 8, 5);
    
    ctx.restore();
}

// ==================== ENEMY CLASSES ====================

// Larva - Small, fast, weak
class Larva {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 12;
        this.hp = 1;
        this.speed = (120 + Math.random() * 60) * LEVELS[level - 1].speedMod;
        this.phase = Math.random() * Math.PI * 2;
        this.waveAmp = 30 + Math.random() * 20;
        this.waveFreq = 3 + Math.random() * 2;
        this.baseY = y;
        this.alive = true;
        this.tentaclePhase = Math.random() * Math.PI * 2;
        this.glowHue = 120 + Math.random() * 40; // Green-cyan
    }
    
    update(dt) {
        this.phase += dt * this.waveFreq;
        this.tentaclePhase += dt * 8;
        this.x -= this.speed * dt;
        this.y = this.baseY + Math.sin(this.phase) * this.waveAmp;
        
        if (this.x < -50) this.alive = false;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        glow.addColorStop(0, `hsla(${this.glowHue}, 100%, 60%, 0.4)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Body (oval blob)
        ctx.fillStyle = `hsl(${this.glowHue}, 70%, 40%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tentacles (wavy lines trailing behind)
        ctx.strokeStyle = `hsl(${this.glowHue}, 80%, 50%)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(8, (i - 1) * 4);
            for (let j = 1; j <= 4; j++) {
                const tx = 8 + j * 5;
                const ty = (i - 1) * 4 + Math.sin(this.tentaclePhase + j * 0.8 + i) * 3;
                ctx.lineTo(tx, ty);
            }
            ctx.stroke();
        }
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-3, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsl(${this.glowHue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(-4, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.alive = false;
            spawnLoot(this.x, this.y, 2);
            Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 8);
            Audio.explode();
            score += 50;
        }
    }
}

// Drone - Medium, shoots, jellyfish-like
class Drone {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 35;
        this.hp = 2;
        this.speed = (60 + Math.random() * 30) * LEVELS[level - 1].speedMod;
        this.alive = true;
        this.phase = Math.random() * Math.PI * 2;
        this.tentaclePhase = Math.random() * Math.PI * 2;
        this.shootTimer = Math.random() * 2 + 1;
        this.glowHue = 280 + Math.random() * 40; // Purple-magenta
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    
    update(dt) {
        this.phase += dt * 1.5;
        this.tentaclePhase += dt * 5;
        this.pulsePhase += dt * 4;
        
        // Drift toward player with wobble
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.x -= this.speed * dt;
        if (dist > 50) {
            this.y += (dy / dist) * this.speed * 0.5 * dt;
        }
        this.y += Math.sin(this.phase) * 30 * dt;
        
        // Shooting
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < CONFIG.CANVAS_WIDTH - 100 && !player.isDead) {
            this.shoot();
            this.shootTimer = 2 + Math.random() * 2;
        }
        
        if (this.x < -50) this.alive = false;
    }
    
    shoot() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            alienBullets.push({
                x: this.x - 15,
                y: this.y,
                vx: (dx / dist) * 180,
                vy: (dy / dist) * 180,
                size: 6,
                hue: this.glowHue
            });
            Audio.shoot();
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;
        
        // Glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 * pulse);
        glow.addColorStop(0, `hsla(${this.glowHue}, 100%, 50%, 0.3)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body (jellyfish dome)
        ctx.fillStyle = `hsla(${this.glowHue}, 60%, 35%, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(0, -3, 15 * pulse, 12 * pulse, 0, Math.PI, 0);
        ctx.fill();
        
        // Inner dome highlight
        ctx.fillStyle = `hsla(${this.glowHue}, 80%, 60%, 0.5)`;
        ctx.beginPath();
        ctx.ellipse(0, -6, 8 * pulse, 6 * pulse, 0, Math.PI, 0);
        ctx.fill();
        
        // Tentacles (6 wavy)
        ctx.strokeStyle = `hsl(${this.glowHue}, 70%, 50%)`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI - Math.PI / 2;
            const startX = Math.cos(angle + Math.PI/2) * 10;
            const startY = 5;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            for (let j = 1; j <= 5; j++) {
                const segLen = 6;
                const wave = Math.sin(this.tentaclePhase + i * 0.5 + j * 0.6) * 4;
                const tx = startX + wave;
                const ty = startY + j * segLen;
                ctx.lineTo(tx, ty);
            }
            ctx.stroke();
        }
        
        // Central eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `hsl(${this.glowHue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(-1, -6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 5);
        if (this.hp <= 0) {
            this.alive = false;
            spawnLoot(this.x, this.y, 5);
            if (Math.random() < 0.25) spawnPowerup(this.x, this.y);
            Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 15);
            Audio.explode();
            score += 100;
        }
    }
}

// Hive - Stationary spawner, main target
class Hive {
    constructor(x, y, hp) {
        this.x = x;
        this.y = y;
        this.width = 70;
        this.height = 90;
        this.hp = hp;
        this.maxHp = hp;
        this.alive = true;
        this.phase = Math.random() * Math.PI * 2;
        this.tentaclePhase = Math.random() * Math.PI * 2;
        this.spawnTimer = 2;
        this.glowHue = 320; // Pink/magenta
        this.pulsePhase = 0;
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt;
        this.tentaclePhase += dt * 3;
        this.pulsePhase += dt * 2;
        
        // Spawn aliens
        const levelData = LEVELS[level - 1];
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawn();
            this.spawnTimer = levelData.spawnRate + Math.random() * 1.5;
        }
    }
    
    spawn() {
        const spawnY = this.y + (Math.random() - 0.5) * 40;
        const levelData = LEVELS[level - 1];
        
        if (Math.random() < levelData.droneChance) {
            aliens.push(new Drone(this.x - 30, spawnY));
        } else {
            aliens.push(new Larva(this.x - 30, spawnY));
        }
        Audio.spawn();
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = 0.9 + Math.sin(this.pulsePhase) * 0.1;
        const healthRatio = this.hp / this.maxHp;
        
        // Outer glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 60 * pulse);
        glow.addColorStop(0, `hsla(${this.glowHue}, 100%, 50%, ${0.3 * healthRatio})`);
        glow.addColorStop(0.5, `hsla(${this.glowHue}, 100%, 30%, ${0.15 * healthRatio})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 60 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Main hive body (organic, lumpy)
        ctx.fillStyle = `hsl(${this.glowHue}, 40%, ${20 + healthRatio * 15}%)`;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const wobble = Math.sin(this.phase * 2 + i) * 5;
            const r = (30 + wobble) * pulse;
            const px = Math.cos(angle) * r * (i % 2 === 0 ? 1.2 : 0.9);
            const py = Math.sin(angle) * r * 1.3;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        
        // Veins/texture
        ctx.strokeStyle = `hsla(${this.glowHue}, 60%, 40%, 0.5)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const angle = (i / 5) * Math.PI * 2 + this.phase * 0.2;
            ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 30);
            ctx.stroke();
        }
        
        // Tentacles extending outward
        ctx.strokeStyle = `hsl(${this.glowHue}, 50%, 45%)`;
        ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
            const baseAngle = (i / 8) * Math.PI * 2;
            const startX = Math.cos(baseAngle) * 30;
            const startY = Math.sin(baseAngle) * 35;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            let tx = startX, ty = startY;
            for (let j = 1; j <= 4; j++) {
                const wave = Math.sin(this.tentaclePhase + i + j * 0.5) * 8;
                tx = startX + Math.cos(baseAngle) * j * 10 + Math.cos(baseAngle + Math.PI/2) * wave;
                ty = startY + Math.sin(baseAngle) * j * 10 + Math.sin(baseAngle + Math.PI/2) * wave;
                ctx.lineTo(tx, ty);
            }
            ctx.stroke();
        }
        
        // Central eye/mouth
        const eyeOpen = 0.5 + Math.sin(this.pulsePhase * 1.5) * 0.5;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 15 * eyeOpen, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (eyeOpen > 0.3) {
            ctx.fillStyle = `hsl(${this.glowHue}, 100%, 60%)`;
            ctx.beginPath();
            ctx.arc(0, -3 * eyeOpen, 4 * eyeOpen, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Health bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-25, -55, 50, 6);
        ctx.fillStyle = `hsl(${120 * healthRatio}, 70%, 50%)`;
        ctx.fillRect(-25, -55, 50 * healthRatio, 6);
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 5);
        
        if (this.hp <= 0) {
            this.alive = false;
            spawnLoot(this.x, this.y, 15);
            spawnPowerup(this.x, this.y);
            Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 40);
            Particles.explode(this.x - 20, this.y - 20, '#f0a', 20);
            Particles.explode(this.x + 20, this.y + 20, '#a0f', 20);
            Audio.explode(true); // Big explosion
            Audio.voiceHiveDestroyed();
            score += 500;
        }
    }
}

// ==================== BOSS: THE SWARM QUEEN ====================
class SwarmQueen {
    constructor() {
        this.x = CONFIG.CANVAS_WIDTH - 120;
        this.y = CONFIG.CANVAS_HEIGHT / 2;
        this.width = 120;
        this.height = 150;
        this.hp = 100;
        this.maxHp = 100;
        this.alive = true;
        this.phase = 0;
        this.tentaclePhase = 0;
        this.attackTimer = 3;
        this.moveTimer = 0;
        this.targetY = this.y;
        this.spawnTimer = 5;
        this.enraged = false; // Below 30% HP
        this.glowHue = 300;
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt;
        this.tentaclePhase += dt * 4;
        
        // Check enrage
        if (this.hp < this.maxHp * 0.3 && !this.enraged) {
            this.enraged = true;
            Particles.explode(this.x, this.y, '#f00', 30);
        }
        
        // Movement - bob up and down, occasionally dash
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            this.targetY = 100 + Math.random() * (CONFIG.CANVAS_HEIGHT - 200);
            this.moveTimer = 2 + Math.random() * 2;
        }
        
        const dy = this.targetY - this.y;
        this.y += dy * dt * (this.enraged ? 2 : 1);
        this.y += Math.sin(this.phase * 2) * 20 * dt;
        
        // Attacks
        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && !player.isDead) {
            this.attack();
            this.attackTimer = this.enraged ? 1 : 2;
        }
        
        // Spawn minions
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnMinions();
            this.spawnTimer = this.enraged ? 4 : 6;
        }
        
        // Update boss health UI
        document.getElementById('bossHealthFill').style.width = (this.hp / this.maxHp * 100) + '%';
    }
    
    attack() {
        // Spread shot
        const numBullets = this.enraged ? 7 : 5;
        for (let i = 0; i < numBullets; i++) {
            const angle = Math.PI + (i - (numBullets-1)/2) * 0.15;
            alienBullets.push({
                x: this.x - 50,
                y: this.y,
                vx: Math.cos(angle) * 200,
                vy: Math.sin(angle) * 200,
                size: 8,
                hue: this.enraged ? 0 : 300
            });
        }
        Audio.cannon();
    }
    
    spawnMinions() {
        const count = this.enraged ? 3 : 2;
        for (let i = 0; i < count; i++) {
            const spawnY = this.y + (Math.random() - 0.5) * 100;
            if (Math.random() < 0.4) {
                aliens.push(new Drone(this.x - 60, spawnY));
            } else {
                aliens.push(new Larva(this.x - 60, spawnY));
            }
        }
        Audio.spawn();
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = 0.9 + Math.sin(this.phase * 3) * 0.1;
        const healthRatio = this.hp / this.maxHp;
        const hue = this.enraged ? 0 : this.glowHue;
        
        // Massive glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 * pulse);
        glow.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.4)`);
        glow.addColorStop(0.5, `hsla(${hue}, 100%, 30%, 0.2)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 100 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Main body - large organic mass
        ctx.fillStyle = `hsl(${hue}, 50%, ${25 + healthRatio * 10}%)`;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const wobble = Math.sin(this.phase * 2 + i * 0.5) * 8;
            const r = (50 + wobble) * pulse;
            const px = Math.cos(angle) * r * (i % 2 === 0 ? 1.3 : 1);
            const py = Math.sin(angle) * r * 1.2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        
        // Crown/crest
        ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
        ctx.beginPath();
        ctx.moveTo(-30, -45);
        ctx.lineTo(-15, -70);
        ctx.lineTo(0, -55);
        ctx.lineTo(15, -70);
        ctx.lineTo(30, -45);
        ctx.closePath();
        ctx.fill();
        
        // Many tentacles
        ctx.strokeStyle = `hsl(${hue}, 60%, 45%)`;
        ctx.lineWidth = 5;
        for (let i = 0; i < 12; i++) {
            const baseAngle = (i / 12) * Math.PI * 2;
            const startX = Math.cos(baseAngle) * 45;
            const startY = Math.sin(baseAngle) * 50;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            for (let j = 1; j <= 6; j++) {
                const wave = Math.sin(this.tentaclePhase + i * 0.4 + j * 0.5) * 12;
                const tx = startX + Math.cos(baseAngle) * j * 12 + Math.cos(baseAngle + Math.PI/2) * wave;
                const ty = startY + Math.sin(baseAngle) * j * 12 + Math.sin(baseAngle + Math.PI/2) * wave;
                ctx.lineTo(tx, ty);
            }
            ctx.stroke();
        }
        
        // Multiple eyes
        const eyePositions = [
            {x: -20, y: -15, size: 12},
            {x: 20, y: -15, size: 12},
            {x: 0, y: 10, size: 18}
        ];
        
        for (const eye of eyePositions) {
            const eyePulse = 0.8 + Math.sin(this.phase * 2 + eye.x) * 0.2;
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(eye.x, eye.y, eye.size * eyePulse, eye.size * 0.7 * eyePulse, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = this.enraged ? '#f00' : `hsl(${hue}, 100%, 60%)`;
            ctx.beginPath();
            ctx.arc(eye.x - eye.size * 0.2, eye.y - eye.size * 0.1, eye.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 60, 
            this.enraged ? '#f00' : '#f0a', 8);
        
        if (this.hp <= 0) {
            this.alive = false;
            // Epic death explosion
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const ex = this.x + (Math.random() - 0.5) * 100;
                    const ey = this.y + (Math.random() - 0.5) * 100;
                    Particles.explode(ex, ey, ['#f0a', '#a0f', '#0ff', '#ff0'][Math.floor(Math.random() * 4)], 25);
                    Audio.explode();
                }, i * 150);
            }
            
            // Spawn tons of loot
            for (let i = 0; i < 30; i++) {
                setTimeout(() => spawnLoot(this.x + (Math.random() - 0.5) * 80, 
                    this.y + (Math.random() - 0.5) * 80, 3), i * 50);
            }
            
            score += 5000;
            
            // Victory after delay
            setTimeout(() => {
                gameState = 'victory';
                showScreen('victoryScreen');
                document.getElementById('victoryScore').textContent = score.toLocaleString();
            }, 2000);
        }
    }
}

// ==================== POWERUP CLASS ====================
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 15;
        this.phase = Math.random() * Math.PI * 2;
        this.alive = true;
        this.lifetime = 12;
    }
    
    update(dt) {
        this.phase += dt * 3;
        this.x -= 30 * dt; // Drift left slowly
        this.y += Math.sin(this.phase) * 20 * dt;
        
        this.lifetime -= dt;
        if (this.lifetime <= 0 || this.x < -30) {
            this.alive = false;
        }
        
        // Magnet pull
        if (player.powerups.magnet > 0 && !player.isDead) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 0) {
                this.x += (dx / dist) * 300 * dt;
                this.y += (dy / dist) * 300 * dt;
            }
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = 1 + Math.sin(this.phase * 2) * 0.2;
        const blink = this.lifetime < 3 ? (Math.sin(this.phase * 8) > 0 ? 1 : 0.3) : 1;
        
        // Glow
        ctx.globalAlpha = 0.5 * blink;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2.5);
        glow.addColorStop(0, this.type.color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = blink;
        
        // Box
        ctx.fillStyle = '#111';
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-this.size * pulse, -this.size * pulse, this.size * 2 * pulse, this.size * 2 * pulse, 5);
        ctx.fill();
        ctx.stroke();
        
        // Icon
        ctx.font = `${14 * pulse}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 0);
        
        ctx.restore();
    }
}

// ==================== LOOT SYSTEM ====================
class LootDrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 100;
        this.vy = (Math.random() - 0.5) * 100;
        this.size = 6 + Math.random() * 4;
        this.phase = Math.random() * Math.PI * 2;
        this.alive = true;
        this.lifetime = 10;
        this.hue = 280 + Math.random() * 60; // Purple-pink
    }
    
    update(dt) {
        this.phase += dt * 4;
        
        // Drift
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        // Magnet pull (always active for loot, stronger with powerup)
        if (!player.isDead) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const pullRange = player.powerups.magnet > 0 ? 250 : 80;
            const pullStrength = player.powerups.magnet > 0 ? 400 : 150;
            
            if (dist < pullRange && dist > 0) {
                this.x += (dx / dist) * pullStrength * dt;
                this.y += (dy / dist) * pullStrength * dt;
            }
        }
        
        this.lifetime -= dt;
        if (this.lifetime <= 0 || this.x < -30) {
            this.alive = false;
        }
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = 0.8 + Math.sin(this.phase) * 0.2;
        const blink = this.lifetime < 2 ? (Math.sin(this.phase * 6) > 0 ? 1 : 0.4) : 1;
        
        ctx.globalAlpha = 0.6 * blink;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
        glow.addColorStop(0, `hsl(${this.hue}, 100%, 70%)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = blink;
        ctx.fillStyle = `hsl(${this.hue}, 80%, 60%)`;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

function spawnLoot(x, y, count) {
    for (let i = 0; i < count; i++) {
        loot.push(new LootDrop(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30));
    }
}

function spawnPowerup(x, y) {
    const roll = Math.random();
    let cumulative = 0;
    for (const type of POWERUP_TYPES) {
        cumulative += type.chance;
        if (roll < cumulative) {
            powerups.push(new Powerup(x, y, type));
            return;
        }
    }
    powerups.push(new Powerup(x, y, POWERUP_TYPES[0]));
}

function activatePowerup(type) {
    Audio.powerup();
    
    if (type.id === 'heal') {
        player.health = Math.min(player.health + 35, CONFIG.MAX_HEALTH);
        Particles.explode(player.x, player.y, '#0f0', 20);
    } else if (type.id === 'bomb') {
        bombs++;
        document.getElementById('bombCount').textContent = bombs;
    } else {
        player.powerups[type.id] = type.duration;
    }
    
    updatePowerupUI();
}

// ==================== UPDATE FUNCTIONS ====================
function update(dt) {
    if (gameState !== 'playing') return;
    
    levelTimer += dt;
    
    // Player movement (horizontal game - ship faces right)
    if (!player.isDead) {
        if (Input.isDown('left') && player.x > 50) {
            player.x -= CONFIG.PLAYER_SPEED * dt;
        }
        if (Input.isDown('right') && player.x < CONFIG.CANVAS_WIDTH * 0.6) {
            player.x += CONFIG.PLAYER_SPEED * dt;
        }
        if (Input.isDown('up') && player.y > 40) {
            player.y -= CONFIG.PLAYER_SPEED * dt;
        }
        if (Input.isDown('down') && player.y < CONFIG.CANVAS_HEIGHT - 40) {
            player.y += CONFIG.PLAYER_SPEED * dt;
        }
        
        // Firing
        player.fireTimer -= dt;
        const fireRate = player.powerups.rapid > 0 ? CONFIG.FIRE_RATE * 0.4 : CONFIG.FIRE_RATE;
        
        if (Input.isDown('fire') && player.fireTimer <= 0) {
            fire();
            player.fireTimer = fireRate;
        }
        
        // Bomb
        if (Input.wasPressed('bomb') && bombs > 0) {
            deployBomb();
        }
        
        // Invincibility timer
        if (player.invincibleTimer > 0) {
            player.invincibleTimer -= dt;
        }
        
        // Powerup timers
        for (const key in player.powerups) {
            if (player.powerups[key] > 0) {
                player.powerups[key] -= dt;
                if (player.powerups[key] <= 0) {
                    player.powerups[key] = 0;
                }
            }
        }
    }
    
    // Update background
    updateBackground(dt);
    
    // Update bullets
    playerBullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    });
    playerBullets = playerBullets.filter(b => b.x < CONFIG.CANVAS_WIDTH + 20 && b.x > -20);
    
    alienBullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    });
    alienBullets = alienBullets.filter(b => 
        b.x > -20 && b.x < CONFIG.CANVAS_WIDTH + 20 && 
        b.y > -20 && b.y < CONFIG.CANVAS_HEIGHT + 20
    );
    
    // Update hives
    hives.forEach(h => h.update(dt));
    hives = hives.filter(h => h.alive);
    
    // Update boss
    if (boss) boss.update(dt);
    
    // Update aliens
    aliens.forEach(a => a.update(dt));
    aliens = aliens.filter(a => a.alive);
    
    // Update loot
    loot.forEach(l => l.update(dt));
    loot = loot.filter(l => l.alive);
    
    // Update powerups
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => p.alive);
    
    // Update particles
    Particles.update(dt);
    
    // Collision detection
    checkCollisions();
    
    // Check level completion
    checkLevelComplete();
    
    // Update UI
    updateUI();
    updatePowerupUI();
}

function updateBackground(dt) {
    // Stars scroll left
    stars.forEach(s => {
        s.x -= s.speed * dt;
        if (s.x < -5) {
            s.x = CONFIG.CANVAS_WIDTH + 5;
            s.y = Math.random() * CONFIG.CANVAS_HEIGHT;
        }
    });
    
    // Nebulae scroll left slower
    nebulae.forEach(n => {
        n.x -= n.speed * dt;
        if (n.x < -n.size) {
            n.x = CONFIG.CANVAS_WIDTH + n.size;
            n.y = Math.random() * CONFIG.CANVAS_HEIGHT;
        }
    });
}

function fire() {
    const baseX = player.x + 25;
    const baseY = player.y;
    
    if (player.powerups.triple > 0) {
        // Triple shot - spread
        playerBullets.push({ x: baseX, y: baseY, vx: CONFIG.BULLET_SPEED, vy: 0 });
        playerBullets.push({ x: baseX, y: baseY - 5, vx: CONFIG.BULLET_SPEED, vy: -40 });
        playerBullets.push({ x: baseX, y: baseY + 5, vx: CONFIG.BULLET_SPEED, vy: 40 });
    } else {
        playerBullets.push({ x: baseX, y: baseY, vx: CONFIG.BULLET_SPEED, vy: 0 });
    }
    
    Audio.shoot();
}

function deployBomb() {
    bombs--;
    document.getElementById('bombCount').textContent = bombs;
    
    // Screen flash
    ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Kill all aliens on screen
    aliens.forEach(a => {
        Particles.explode(a.x, a.y, '#f0a', 15);
        spawnLoot(a.x, a.y, 3);
        score += 50;
    });
    aliens = [];
    
    // Clear alien bullets
    alienBullets = [];
    
    // Damage hives
    hives.forEach(h => {
        h.hp -= 2;
        Particles.explode(h.x, h.y, '#f0a', 10);
        if (h.hp <= 0) {
            h.alive = false;
            score += 500;
        }
    });
    
    // Damage boss
    if (boss && boss.alive) {
        boss.hp -= 10;
        Particles.explode(boss.x, boss.y, '#f0a', 20);
        if (boss.hp <= 0) boss.hit(); // Trigger death
    }
    
    Audio.bomb();
}

function checkCollisions() {
    if (player.isDead) return;
    
    // Player bullets vs aliens
    playerBullets.forEach(b => {
        aliens.forEach(a => {
            if (a.alive && circleCollision(b.x, b.y, 5, a.x, a.y, a.width / 2)) {
                a.hit();
                b.x = -100; // Mark for removal
            }
        });
        
        // vs hives
        hives.forEach(h => {
            if (h.alive && circleCollision(b.x, b.y, 5, h.x, h.y, h.width / 2)) {
                h.hit();
                b.x = -100;
            }
        });
        
        // vs boss
        if (boss && boss.alive && circleCollision(b.x, b.y, 5, boss.x, boss.y, 50)) {
            boss.hit();
            b.x = -100;
        }
    });
    
    // Player vs alien bullets
    if (player.invincibleTimer <= 0 && !godMode) {
        alienBullets.forEach(b => {
            if (circleCollision(b.x, b.y, b.size, player.x, player.y, 15)) {
                if (player.powerups.shield > 0) {
                    player.powerups.shield = 0;
                    Particles.explode(player.x, player.y, '#0ff', 15);
                    Audio.shieldDown();
                    Audio.voiceShieldDown();
                } else {
                    damagePlayer(15);
                }
                b.x = -100;
            }
        });
    }
    
    // Player vs aliens (collision damage)
    if (player.invincibleTimer <= 0 && !godMode) {
        aliens.forEach(a => {
            if (a.alive && circleCollision(player.x, player.y, 20, a.x, a.y, a.width / 2)) {
                if (player.powerups.shield > 0) {
                    player.powerups.shield = 0;
                    a.hit();
                    Particles.explode(player.x, player.y, '#0ff', 15);
                    Audio.shieldDown();
                    Audio.voiceShieldDown();
                } else {
                    damagePlayer(20);
                    a.hit();
                }
            }
        });
    }
    
    // Player vs loot
    loot.forEach(l => {
        if (l.alive && circleCollision(player.x, player.y, 25, l.x, l.y, l.size)) {
            l.alive = false;
            score += 10;
            Audio.collect();
        }
    });
    
    // Player vs powerups
    powerups.forEach(p => {
        if (p.alive && circleCollision(player.x, player.y, 25, p.x, p.y, p.size)) {
            p.alive = false;
            activatePowerup(p.type);
        }
    });
}

function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

function damagePlayer(amount) {
    player.health -= amount;
    player.invincibleTimer = 0.5;
    Particles.explode(player.x, player.y, '#f00', 10);
    Audio.hit();
    
    if (player.health <= 0) {
        player.health = 0;
        player.isDead = true;
        Particles.explode(player.x, player.y, '#ff0', 30);
        Particles.explode(player.x, player.y, '#f80', 25);
        Audio.explode();
        
        setTimeout(() => {
            gameState = 'gameover';
            showScreen('gameOverScreen');
            document.getElementById('finalScore').textContent = score.toLocaleString();
            document.getElementById('finalLevel').textContent = level;
        }, 1500);
    }
}

function checkLevelComplete() {
    if (levelComplete || levelTransition) return;
    
    const levelData = LEVELS[level - 1];
    
    // Boss level - handled in boss death
    if (levelData.boss) return;
    
    // All hives destroyed
    if (hives.length === 0) {
        levelComplete = true;
        
        // Clear remaining aliens
        aliens.forEach(a => {
            Particles.explode(a.x, a.y, '#0f8', 10);
            spawnLoot(a.x, a.y, 2);
            score += 25;
        });
        aliens = [];
        alienBullets = [];
        
        // Audio feedback
        Audio.levelComplete();
        Audio.voiceLevelComplete();
        
        // Transition to next level
        setTimeout(() => {
            if (level < 10) {
                level++;
                levelTransition = true;
                transitionTimer = 2;
                initLevel();
            }
        }, 2000);
    }
}

// ==================== DRAW FUNCTIONS ====================
function draw() {
    // Clear
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Background
    drawBackground();
    
    // Hives
    hives.forEach(h => h.draw());
    
    // Boss
    if (boss) boss.draw();
    
    // Aliens
    aliens.forEach(a => a.draw());
    
    // Loot
    loot.forEach(l => l.draw());
    
    // Powerups
    powerups.forEach(p => p.draw());
    
    // Player bullets
    ctx.fillStyle = '#0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0ff';
    playerBullets.forEach(b => {
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Alien bullets
    alienBullets.forEach(b => {
        ctx.fillStyle = `hsl(${b.hue}, 100%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsl(${b.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Player
    drawShip();
    
    // Particles
    Particles.draw(ctx);
    
    // Level transition text
    if (levelTransition && transitionTimer > 0) {
        ctx.fillStyle = '#0ff';
        ctx.font = '36px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(`SECTOR ${level}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    }
}

function drawBackground() {
    // Nebulae (behind everything)
    nebulae.forEach(n => {
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size);
        gradient.addColorStop(0, `hsla(${n.hue}, 70%, 40%, ${n.alpha})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Stars
    stars.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// ==================== UI FUNCTIONS ====================
function updateUI() {
    document.getElementById('scoreValue').textContent = score.toLocaleString();
    document.getElementById('levelValue').textContent = level;
    document.getElementById('healthFill').style.width = (player.health / CONFIG.MAX_HEALTH * 100) + '%';
}

function updatePowerupUI() {
    document.getElementById('pw-shield').classList.toggle('active', player.powerups.shield > 0);
    document.getElementById('pw-rapid').classList.toggle('active', player.powerups.rapid > 0);
    document.getElementById('pw-triple').classList.toggle('active', player.powerups.triple > 0);
    document.getElementById('pw-magnet').classList.toggle('active', player.powerups.magnet > 0);
    document.getElementById('pw-bomb').classList.toggle('active', bombs > 0);
    document.getElementById('bombCount').textContent = bombs;
}

function showScreen(id) {
    ['startScreen', 'pauseScreen', 'gameOverScreen', 'victoryScreen'].forEach(s => {
        document.getElementById(s).classList.add('hidden');
    });
    if (id) document.getElementById(id).classList.remove('hidden');
}

// ==================== GAME CONTROL ====================
const Game = {
    start() {
        gameState = 'playing';
        score = 0;
        level = 1;
        bombs = 0;
        godMode = false;
        
        initBackground();
        resetPlayer();
        initLevel();
        showScreen(null);
        
        // Audio
        Audio.init();
        Audio.playGameMusic('hive-assault');
        setTimeout(() => Audio.voiceBegin(), 500);
    },
    
    restart() {
        this.start();
    },
    
    pause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            showScreen('pauseScreen');
        }
    },
    
    resume() {
        if (gameState === 'paused') {
            gameState = 'playing';
            showScreen(null);
        }
    },
    
    quit() {
        window.location.href = '/arkade/';
    },
    
    toggleSecretMenu() {
        secretMenuOpen = !secretMenuOpen;
        document.getElementById('secretMenu').classList.toggle('hidden', !secretMenuOpen);
        document.getElementById('godMode').checked = godMode;
        document.getElementById('warpLevel').value = level;
    },
    
    warpToLevel() {
        level = parseInt(document.getElementById('warpLevel').value);
        resetPlayer();
        initLevel();
        this.toggleSecretMenu();
        if (gameState !== 'playing') {
            gameState = 'playing';
            showScreen(null);
        }
    },
    
    spawnTestPowerup() {
        const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push(new Powerup(player.x + 100, player.y, type));
    },
    
    spawnTestEnemy() {
        if (Math.random() < 0.5) {
            aliens.push(new Drone(CONFIG.CANVAS_WIDTH - 50, player.y));
        } else {
            aliens.push(new Larva(CONFIG.CANVAS_WIDTH - 50, player.y));
        }
    }
};

// ==================== INPUT HANDLING ====================
document.addEventListener('keydown', (e) => {
    // Secret menu toggle (backtick)
    if (e.key === '`') {
        Game.toggleSecretMenu();
        return;
    }
    
    // God mode toggle in secret menu
    if (e.key === 'g' && secretMenuOpen) {
        godMode = !godMode;
        document.getElementById('godMode').checked = godMode;
        return;
    }
    
    // ESC - pause/resume
    if (e.key === 'Escape') {
        if (secretMenuOpen) {
            Game.toggleSecretMenu();
        } else if (gameState === 'playing') {
            Game.pause();
        } else if (gameState === 'paused') {
            Game.resume();
        }
        return;
    }
    
    // Q - quit to menu
    if (e.key === 'q' || e.key === 'Q') {
        if (gameState === 'playing' || gameState === 'paused') {
            Game.quit();
        }
        return;
    }
});

// God mode checkbox
document.getElementById('godMode').addEventListener('change', (e) => {
    godMode = e.target.checked;
});

// ==================== GAME LOOP ====================
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    
    // Handle level transition timer
    if (levelTransition) {
        transitionTimer -= dt;
        if (transitionTimer <= 0) {
            levelTransition = false;
        }
    }
    
    update(dt);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZATION ====================
function init() {
    Input.init();
    Particles.clear(); // Just clear any existing particles
    initBackground();
    
    console.log('🎮 Hive Assault loaded');
    console.log('🔧 Press ` for secret menu');
    
    requestAnimationFrame(gameLoop);
}

init();
