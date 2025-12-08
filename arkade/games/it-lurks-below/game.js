// ============================================================================
// IT LURKS BELOW - Kraken ArKade
// A Sea Dragon-inspired deep sea adventure
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==================== CONFIGURATION ====================
const CONFIG = {
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 600,
    SUB_SPEED: 200,
    SCROLL_SPEED_BASE: 80,
    SCROLL_SPEED_MAX: 200,
    BULLET_SPEED: 500,
    TORPEDO_SPEED: 350,
    MAX_TORPEDOES: 3,
    MAX_AIR: 100,
    AIR_DRAIN_RATE: 2.5,  // Per second
    MAX_HULL: 100,
    CAVE_START_LEVEL: 2,  // Caves begin at level 2
    CAVE_SEGMENT_WIDTH: 120
};

// ==================== LEVEL DEFINITIONS ====================
const LEVELS = [
    { name: 'OPEN OCEAN', depth: 0, hasCave: false, darkness: 0, enemyRate: 2.5, checkpointBonus: 1000 },
    { name: 'THE DEEP', depth: 200, hasCave: false, darkness: 0.15, enemyRate: 2.0, checkpointBonus: 2000 },
    { name: 'CAVE ENTRANCE', depth: 500, hasCave: true, darkness: 0.3, enemyRate: 1.8, checkpointBonus: 3000 },
    { name: 'THE DESCENT', depth: 800, hasCave: true, darkness: 0.5, enemyRate: 1.5, checkpointBonus: 4000 },
    { name: 'THE ABYSS', depth: 1200, hasCave: true, darkness: 0.7, enemyRate: 1.2, checkpointBonus: 5000 },
    { name: "KRAKEN'S LAIR", depth: 1500, hasCave: true, darkness: 0.6, enemyRate: 1.0, checkpointBonus: 10000, boss: true }
];

// Checkpoint types - objects on the ocean/cave floor
const CHECKPOINT_TYPES = [
    { name: 'SUNKEN GALLEON', width: 150, height: 120 },
    { name: 'ANCIENT RUINS', width: 120, height: 80 },
    { name: 'WHALE SKELETON', width: 180, height: 60 },
    { name: 'LOST SUBMARINE', width: 140, height: 50 },
    { name: 'CRYSTAL FORMATION', width: 100, height: 90 }
];

// ==================== GAME STATE ====================
let gameState = 'menu'; // menu, playing, paused, gameover, victory
let score = 0;
let currentLevel = 0;
let depth = 0;
let gameTime = 0;
let currentScrollSpeed = CONFIG.SCROLL_SPEED_BASE;

// Debug
let godMode = false;
let infiniteAir = false;
let secretMenuOpen = false;

// Submarine state
const sub = {
    x: 150,
    y: CONFIG.CANVAS_HEIGHT / 2,
    width: 80,
    height: 50,
    hull: CONFIG.MAX_HULL,
    air: CONFIG.MAX_AIR,
    torpedoes: CONFIG.MAX_TORPEDOES,
    invincible: 0,
    isDead: false
};

// Game objects
let bullets = [];
let torpedoes = [];
let enemies = [];
let mines = [];
let airBubbles = [];
let powerups = [];
let caveWalls = [];
let floorRocks = [];
let checkpoint = null;
let checkpointsPassed = 0;
let boss = null;

// Environment
let lightRays = [];
let backgroundBubbles = [];
let seaweed = [];
let ambientFish = [];
let shells = [];
let nextCaveX = 0;

// Timers
let enemySpawnTimer = 0;
let lastShot = 0;
let lastTorpedo = 0;

// Screen shake
const shake = { x: 0, y: 0, intensity: 0 };

// ==================== INITIALIZATION ====================
function initGame() {
    // Light rays (surface levels only)
    lightRays = [];
    for (let i = 0; i < 5; i++) {
        lightRays.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            width: 30 + Math.random() * 50,
            speed: 10 + Math.random() * 20
        });
    }
    
    // Background bubbles
    backgroundBubbles = [];
    for (let i = 0; i < 30; i++) {
        backgroundBubbles.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: 2 + Math.random() * 4,
            speed: 20 + Math.random() * 40,
            wobble: Math.random() * Math.PI * 2
        });
    }
    
    // Floor rocks
    floorRocks = [];
    for (let i = 0; i < 25; i++) {
        floorRocks.push({
            x: i * 50 + Math.random() * 30,
            size: 10 + Math.random() * 20,
            height: 5 + Math.random() * 15
        });
    }
    
    // Seaweed (swaying plants attached to floor)
    seaweed = [];
    for (let i = 0; i < 12; i++) {
        seaweed.push({
            x: i * 100 + Math.random() * 80,
            height: 60 + Math.random() * 80,
            phase: Math.random() * Math.PI * 2,
            segments: 5 + Math.floor(Math.random() * 4),
            hue: 120 + Math.random() * 40  // Green to teal
        });
    }
    
    // Ambient fish (decorative, invulnerable)
    ambientFish = [];
    for (let i = 0; i < 8; i++) {
        spawnAmbientFish();
    }
    
    // Shells and decorations
    shells = [];
    for (let i = 0; i < 15; i++) {
        shells.push({
            x: i * 80 + Math.random() * 60,
            type: Math.floor(Math.random() * 4),  // 0=shell, 1=starfish, 2=coral, 3=skull
            size: 8 + Math.random() * 12,
            rotation: Math.random() * Math.PI * 2
        });
    }
    
    // Air bubbles (collectible)
    airBubbles = [];
    
    // Cave walls
    caveWalls = [];
    nextCaveX = CONFIG.CANVAS_WIDTH;
}

function resetSub() {
    sub.x = 150;
    sub.y = CONFIG.CANVAS_HEIGHT / 2;
    sub.hull = CONFIG.MAX_HULL;
    sub.air = CONFIG.MAX_AIR;
    sub.torpedoes = CONFIG.MAX_TORPEDOES;
    sub.invincible = 2;
    sub.isDead = false;
}

function spawnFirstCheckpoint() {
    const type = CHECKPOINT_TYPES[0];
    const floorY = getFloorY(CONFIG.CANVAS_WIDTH + 800);
    checkpoint = {
        x: CONFIG.CANVAS_WIDTH + 800,
        y: floorY,
        width: type.width,
        height: type.height,
        name: type.name,
        reached: false,
        phase: 0
    };
}

// Get floor Y position (cave bottom or ocean floor)
function getFloorY(x) {
    if (currentLevel >= CONFIG.CAVE_START_LEVEL && caveWalls.length > 0) {
        // Find cave segment at this X
        for (const wall of caveWalls) {
            if (x >= wall.x && x < wall.x + wall.width) {
                // Interpolate bottom points
                for (let i = 0; i < wall.bottomPoints.length - 1; i++) {
                    const p1 = wall.bottomPoints[i];
                    const p2 = wall.bottomPoints[i + 1];
                    if (x >= p1.x && x < p2.x) {
                        const t = (x - p1.x) / (p2.x - p1.x);
                        return p1.y * (1 - t) + p2.y * t - 20; // Slightly above floor
                    }
                }
            }
        }
    }
    return CONFIG.CANVAS_HEIGHT - 60; // Ocean floor
}

// ==================== SUBMARINE DRAWING ====================
function drawSub() {
    if (sub.isDead) return;
    
    ctx.save();
    ctx.translate(sub.x + shake.x, sub.y + shake.y);
    
    // Blink when invincible
    if (sub.invincible > 0 && Math.sin(sub.invincible * 20) > 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Thrust particles when moving right
    if (Input.isDown('right')) {
        if (Math.random() < 0.4) {
            // Create thrust particle manually
            Particles.explode(sub.x - 35, sub.y + (Math.random() - 0.5) * 12, '#f80', 2, 100, 0.3);
        }
        
        // Engine glow
        const glowGrad = ctx.createRadialGradient(-32, 0, 0, -32, 0, 35);
        glowGrad.addColorStop(0, 'rgba(255, 136, 0, 0.8)');
        glowGrad.addColorStop(0.5, 'rgba(255, 68, 0, 0.4)');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(-32, 0, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // Engine flame
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-30, -7);
        ctx.lineTo(-30 - 18 - Math.random() * 12, 0);
        ctx.lineTo(-30, 7);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(-30, -5);
        ctx.lineTo(-30 - 12 - Math.random() * 8, 0);
        ctx.lineTo(-30, 5);
        ctx.closePath();
        ctx.fill();
    }
    
    // Hull glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    
    // Main hull - streamlined submarine
    ctx.fillStyle = '#1a3a4a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(32, -10);
    ctx.lineTo(15, -13);
    ctx.lineTo(-25, -13);
    ctx.lineTo(-35, -9);
    ctx.lineTo(-38, 0);
    ctx.lineTo(-35, 9);
    ctx.lineTo(-25, 13);
    ctx.lineTo(15, 13);
    ctx.lineTo(32, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Hull shading
    const hullGrad = ctx.createLinearGradient(0, -13, 0, 13);
    hullGrad.addColorStop(0, 'rgba(0, 50, 80, 0.6)');
    hullGrad.addColorStop(0.5, 'transparent');
    hullGrad.addColorStop(1, 'rgba(0, 20, 40, 0.6)');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    
    // Conning tower
    ctx.fillStyle = '#2a4a5a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(-8, -24);
    ctx.lineTo(18, -24);
    ctx.lineTo(18, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Cockpit window
    const windowGrad = ctx.createLinearGradient(0, -24, 0, -13);
    windowGrad.addColorStop(0, '#00ffff');
    windowGrad.addColorStop(0.5, '#00aaff');
    windowGrad.addColorStop(1, '#004466');
    ctx.fillStyle = windowGrad;
    ctx.fillRect(0, -23, 12, 9);
    
    // Window highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(1, -22, 4, 3);
    
    // Hull panel lines
    ctx.strokeStyle = '#00aaaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, -13);
    ctx.lineTo(15, 13);
    ctx.moveTo(-5, -13);
    ctx.lineTo(-5, 13);
    ctx.moveTo(-20, -13);
    ctx.lineTo(-20, 13);
    ctx.stroke();
    
    // Rivets
    ctx.fillStyle = '#00aaaa';
    for (let i = -25; i < 35; i += 12) {
        ctx.beginPath();
        ctx.arc(i, -9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(i, 9, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Dive planes - top
    ctx.fillStyle = '#2a4a5a';
    ctx.strokeStyle = '#00aaaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(22, -13);
    ctx.lineTo(28, -20);
    ctx.lineTo(18, -13);
    ctx.fill();
    ctx.stroke();
    
    // Dive planes - bottom
    ctx.beginPath();
    ctx.moveTo(22, 13);
    ctx.lineTo(28, 20);
    ctx.lineTo(18, 13);
    ctx.fill();
    ctx.stroke();
    
    // Propeller (spinning)
    ctx.fillStyle = '#334455';
    ctx.save();
    ctx.translate(-34, 0);
    ctx.rotate(gameTime * 15);
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.fillStyle = i % 2 === 0 ? '#334455' : '#445566';
        ctx.fillRect(-8, -2, 16, 4);
        ctx.restore();
    }
    ctx.restore();
    
    // Propeller hub
    ctx.fillStyle = '#556677';
    ctx.beginPath();
    ctx.arc(-34, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Torpedo tubes
    ctx.fillStyle = '#0a1a2a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
        const y = i === 0 ? -7 : 7;
        ctx.beginPath();
        ctx.arc(35, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    // Periscope
    ctx.fillStyle = '#2a4a5a';
    ctx.strokeStyle = '#00aaaa';
    ctx.lineWidth = 1;
    ctx.fillRect(3, -30, 2, 6);
    ctx.strokeRect(3, -30, 2, 6);
    
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ==================== ENEMY CLASSES (Ported from Hive Assault) ====================

// Squid - Fast small enemy (based on Hive Assault Larva - superior design!)
class Squid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 14;
        this.hp = 1;
        this.speed = 100 + Math.random() * 60;
        this.phase = Math.random() * Math.PI * 2;
        this.waveAmp = 30 + Math.random() * 20;
        this.waveFreq = 3 + Math.random() * 2;
        this.baseY = y;
        this.alive = true;
        this.tentaclePhase = Math.random() * Math.PI * 2;
        this.glowHue = 180 + Math.random() * 40; // Cyan-blue for underwater
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt * this.waveFreq;
        this.tentaclePhase += dt * 8;
        this.x -= (this.speed + currentScrollSpeed) * dt;
        this.y = this.baseY + Math.sin(this.phase) * this.waveAmp;
        
        if (this.x < -50) this.alive = false;
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
        glow.addColorStop(0, `hsla(${this.glowHue}, 100%, 60%, 0.5)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Body (oval blob - like Hive Assault Larva)
        ctx.fillStyle = `hsl(${this.glowHue}, 70%, 45%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tentacles (3 wavy lines trailing behind to the right)
        ctx.strokeStyle = `hsl(${this.glowHue}, 80%, 55%)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(10, (i - 1) * 5);
            for (let j = 1; j <= 4; j++) {
                const tx = 10 + j * 6;
                const ty = (i - 1) * 5 + Math.sin(this.tentaclePhase + j * 0.8 + i) * 4;
                ctx.lineTo(tx, ty);
            }
            ctx.stroke();
        }
        
        // Single eye (like Larva)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-4, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye highlight
        ctx.fillStyle = `hsl(${this.glowHue}, 100%, 75%)`;
        ctx.beginPath();
        ctx.arc(-5, -1, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 8);
        
        if (this.hp <= 0) {
            this.alive = false;
            Audio.explode();
            score += 50;
            
            // Chance to drop air bubble
            if (Math.random() < 0.3) {
                spawnAirBubble(this.x, this.y);
            }
        }
    }
}

// Jellyfish - Medium enemy that shoots (based on Drone)
class Jellyfish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 45;
        this.hp = 2;
        this.alive = true;
        this.speed = 40 + Math.random() * 30;
        this.phase = Math.random() * Math.PI * 2;
        this.tentaclePhase = Math.random() * Math.PI * 2;
        this.glowHue = 280 + Math.random() * 40; // Purple-magenta
        this.shootTimer = 2 + Math.random() * 2;
        this.targetY = y;
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt * 2;
        this.tentaclePhase += dt * 5;
        
        // Drift left
        this.x -= (this.speed + currentScrollSpeed * 0.5) * dt;
        
        // Track player Y loosely
        const dy = sub.y - this.y;
        this.y += dy * 0.3 * dt;
        
        // Pulsing movement
        this.y += Math.sin(this.phase * 2) * 15 * dt;
        
        // Shooting
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && !sub.isDead) {
            this.shoot();
            this.shootTimer = 2 + Math.random() * 2;
        }
        
        if (this.x < -50) this.alive = false;
    }
    
    shoot() {
        const angle = Math.atan2(sub.y - this.y, sub.x - this.x);
        enemyBullets.push({
            x: this.x,
            y: this.y + 10,
            vx: Math.cos(angle) * 150,
            vy: Math.sin(angle) * 150,
            size: 6,
            hue: this.glowHue
        });
        Audio.cannon();
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const pulse = 0.85 + Math.sin(this.phase * 3) * 0.15;
        
        // Glow
        ctx.globalAlpha = 0.5;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35 * pulse);
        glow.addColorStop(0, `hsla(${this.glowHue}, 100%, 50%, 0.5)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 35 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Bell/dome (draw top half - from PI to 0)
        ctx.fillStyle = `hsla(${this.glowHue}, 60%, 50%, 0.8)`;
        ctx.beginPath();
        ctx.ellipse(0, -5, 18 * pulse, 15 * pulse, 0, Math.PI, 0);
        ctx.fill();
        
        // Inner bell detail
        ctx.fillStyle = `hsla(${this.glowHue}, 70%, 60%, 0.5)`;
        ctx.beginPath();
        ctx.ellipse(0, -3, 12 * pulse, 10 * pulse, 0, Math.PI, 0);
        ctx.fill();
        
        // Tentacles (6 long wavy)
        ctx.strokeStyle = `hsla(${this.glowHue}, 60%, 55%, 0.9)`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const startX = -12 + i * 5;
            ctx.beginPath();
            ctx.moveTo(startX, 8);
            
            for (let j = 1; j <= 6; j++) {
                const wave = Math.sin(this.tentaclePhase + i * 0.5 + j * 0.4) * 8;
                ctx.lineTo(startX + wave, 8 + j * 7);
            }
            ctx.stroke();
        }
        
        // Central eye (like Hive Assault Drone)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, -3, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `hsl(${this.glowHue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(-2, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x, this.y, `hsl(${this.glowHue}, 100%, 60%)`, 10);
        
        if (this.hp <= 0) {
            this.alive = false;
            Audio.explode();
            score += 100;
            
            // Higher chance for air or powerup
            if (Math.random() < 0.5) {
                spawnAirBubble(this.x, this.y);
            }
            if (Math.random() < 0.2) {
                spawnPowerup(this.x, this.y);
            }
        }
    }
}

// Anglerfish - Lurking enemy in caves
class Anglerfish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 35;
        this.hp = 3;
        this.alive = true;
        this.phase = Math.random() * Math.PI * 2;
        this.lurePhase = 0;
        this.glowHue = 60; // Yellow-orange lure
        this.charging = false;
        this.chargeTimer = 0;
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt * 2;
        this.lurePhase += dt * 5;
        
        // Scroll with environment
        this.x -= currentScrollSpeed * dt;
        
        // Lure player - if sub gets close, charge!
        const dist = Math.sqrt((sub.x - this.x) ** 2 + (sub.y - this.y) ** 2);
        if (dist < 200 && !this.charging) {
            this.charging = true;
            this.chargeTimer = 0.3;
        }
        
        if (this.charging) {
            this.chargeTimer -= dt;
            // Lunge toward player
            const angle = Math.atan2(sub.y - this.y, sub.x - this.x);
            this.x += Math.cos(angle) * 250 * dt;
            this.y += Math.sin(angle) * 250 * dt;
            
            if (this.chargeTimer <= 0) {
                this.charging = false;
            }
        }
        
        if (this.x < -80) this.alive = false;
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Lure glow (attracts player)
        const lureIntensity = 0.5 + Math.sin(this.lurePhase) * 0.5;
        ctx.globalAlpha = 0.6 * lureIntensity;
        const lureGlow = ctx.createRadialGradient(-25, -20, 0, -25, -20, 40);
        lureGlow.addColorStop(0, `hsla(${this.glowHue}, 100%, 70%, 1)`);
        lureGlow.addColorStop(0.5, `hsla(${this.glowHue}, 100%, 50%, 0.5)`);
        lureGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = lureGlow;
        ctx.beginPath();
        ctx.arc(-25, -20, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Body - dark and menacing
        ctx.fillStyle = '#1a1a2a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Massive jaw
        ctx.fillStyle = '#2a1a1a';
        ctx.beginPath();
        ctx.moveTo(20, 5);
        ctx.lineTo(35, 15);
        ctx.lineTo(20, 20);
        ctx.lineTo(-5, 15);
        ctx.closePath();
        ctx.fill();
        
        // Teeth
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(5 + i * 5, 8);
            ctx.lineTo(7 + i * 5, 15);
            ctx.lineTo(9 + i * 5, 8);
            ctx.fill();
        }
        
        // Lure stalk
        ctx.strokeStyle = '#3a3a4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.quadraticCurveTo(-20, -25, -25 + Math.sin(this.lurePhase) * 3, -20);
        ctx.stroke();
        
        // Lure bulb
        ctx.fillStyle = `hsl(${this.glowHue}, 100%, ${50 + lureIntensity * 30}%)`;
        ctx.beginPath();
        ctx.arc(-25 + Math.sin(this.lurePhase) * 3, -20, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Evil eye
        ctx.fillStyle = '#300';
        ctx.beginPath();
        ctx.ellipse(8, -5, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.charging ? '#f00' : '#ff0';
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x, this.y, '#ff8800', 12);
        
        if (this.hp <= 0) {
            this.alive = false;
            Audio.explode(true);
            score += 200;
            spawnAirBubble(this.x, this.y);
            spawnAirBubble(this.x + 20, this.y + 10);
        }
    }
}

// Shark - Fast, menacing predator
class Shark {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 25;
        this.hp = 2;
        this.alive = true;
        this.speed = 120 + Math.random() * 40;
        this.phase = Math.random() * Math.PI * 2;
        this.tailPhase = Math.random() * Math.PI * 2;
        this.color = '#607080';
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt * 2;
        this.tailPhase += dt * 8;
        
        // Sharks swim steadily left, slight vertical wave
        this.x -= (this.speed + currentScrollSpeed) * dt;
        this.y += Math.sin(this.phase) * 20 * dt;
        
        if (this.x < -80) this.alive = false;
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Tail wag
        const tailWag = Math.sin(this.tailPhase) * 0.15;
        ctx.rotate(tailWag);
        
        // Main body (nose on LEFT side facing player)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-30, 0);  // Nose pointing left
        ctx.quadraticCurveTo(-25, -6, -15, -8);
        ctx.lineTo(10, -8);
        ctx.quadraticCurveTo(20, -6, 25, -3);
        ctx.lineTo(30, 0);  // Tail on right
        ctx.lineTo(25, 3);
        ctx.quadraticCurveTo(20, 6, 10, 8);
        ctx.lineTo(-15, 8);
        ctx.quadraticCurveTo(-25, 6, -30, 0);
        ctx.closePath();
        ctx.fill();
        
        // Body shading
        const bodyGrad = ctx.createLinearGradient(0, -8, 0, 8);
        bodyGrad.addColorStop(0, 'rgba(100,120,140,0.3)');
        bodyGrad.addColorStop(0.5, 'transparent');
        bodyGrad.addColorStop(1, 'rgba(40,50,60,0.3)');
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        
        // Dorsal fin
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-5, -8);
        ctx.lineTo(0, -20);
        ctx.lineTo(8, -8);
        ctx.closePath();
        ctx.fill();
        
        // Pectoral fins
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.quadraticCurveTo(-12, 15, -5, 18);
        ctx.lineTo(-5, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Tail fin
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(38, -8);
        ctx.lineTo(30, -2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(36, 6);
        ctx.lineTo(30, 2);
        ctx.closePath();
        ctx.fill();
        
        // Gills
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(2 + i * 4, -6);
            ctx.quadraticCurveTo(2 + i * 4, 0, 4 + i * 4, 6);
            ctx.stroke();
        }
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-20, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-19, -4, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Open mouth with teeth
        ctx.fillStyle = '#200';
        ctx.beginPath();
        ctx.moveTo(-30, -3);
        ctx.quadraticCurveTo(-26, 0, -30, 3);
        ctx.quadraticCurveTo(-32, 0, -30, -3);
        ctx.fill();
        
        // Teeth
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-29 + i * 1.5, -2.5);
            ctx.lineTo(-28.5 + i * 1.5, 0);
            ctx.lineTo(-28 + i * 1.5, -2.5);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-29 + i * 1.5, 2.5);
            ctx.lineTo(-28.5 + i * 1.5, 0);
            ctx.lineTo(-28 + i * 1.5, 2.5);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    hit() {
        this.hp--;
        Particles.explode(this.x, this.y, '#708090', 10);
        
        if (this.hp <= 0) {
            this.alive = false;
            Audio.explode();
            score += 150;
            
            // Sometimes drops air
            if (Math.random() < 0.4) {
                spawnAirBubble(this.x, this.y);
            }
        }
    }
}

// Enemy bullets array
let enemyBullets = [];

// ==================== MINES ====================
class Mine {
    constructor(x, y, chained = false) {
        this.x = x;
        this.y = y;
        this.size = 18;
        this.hp = 2;
        this.alive = true;
        this.phase = Math.random() * Math.PI * 2;
        this.chained = chained;
        this.chainY = y + 100 + Math.random() * 80; // Anchor point on floor
        this.released = false;  // Has it been triggered?
        this.riseSpeed = 0;     // Vertical rise speed when triggered
        this.detectRange = 150; // How close before it triggers
    }
    
    update(dt) {
        if (!this.alive) return;
        
        this.phase += dt * 2;
        this.x -= currentScrollSpeed * dt;
        
        // Check proximity to player - trigger release
        if (this.chained && !this.released) {
            const dist = Math.sqrt((sub.x - this.x) ** 2 + (sub.y - this.y) ** 2);
            if (dist < this.detectRange) {
                this.released = true;
                this.riseSpeed = 80 + Math.random() * 40;  // Start rising
                Audio.spawn();  // Alert sound
            }
        }
        
        // Movement behavior
        if (this.released) {
            // Released mine rises up trying to intercept player
            this.y -= this.riseSpeed * dt;
            // Also drift toward player's Y position slightly
            const dy = sub.y - this.y;
            this.y += dy * 0.5 * dt;
            // Explode if it gets too close
            if (Math.sqrt((sub.x - this.x) ** 2 + (sub.y - this.y) ** 2) < 40) {
                this.explode();
            }
        } else if (!this.chained) {
            // Floating mines bob gently
            this.y += Math.sin(this.phase) * 10 * dt;
        } else {
            // Chained mines sway
            this.y += Math.sin(this.phase * 0.5) * 5 * dt;
        }
        
        if (this.x < -50 || this.y < -50) this.alive = false;
    }
    
    draw() {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Chain to floor (only if still chained)
        if (this.chained && !this.released) {
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, this.size);
            ctx.lineTo(0, this.chainY - this.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Mine body - glow more intensely when released
        if (this.released) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f00';
        }
        ctx.fillStyle = this.released ? '#3a2a2a' : '#2a2a2a';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Spikes
        ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * this.size * 0.8, Math.sin(angle) * this.size * 0.8);
            ctx.lineTo(Math.cos(angle) * (this.size + 8), Math.sin(angle) * (this.size + 8));
            ctx.lineTo(Math.cos(angle + 0.2) * this.size * 0.8, Math.sin(angle + 0.2) * this.size * 0.8);
            ctx.fill();
        }
        
        // Warning light - blinks faster when released
        const blinkSpeed = this.released ? 8 : 4;
        const blink = Math.sin(this.phase * blinkSpeed) > 0;
        ctx.fillStyle = blink ? '#f00' : '#600';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        if (blink) {
            ctx.globalAlpha = this.released ? 0.5 : 0.3;
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.released ? 35 : 25);
            glow.addColorStop(0, '#f00');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, this.released ? 35 : 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    explode() {
        this.alive = false;
        Particles.explode(this.x, this.y, '#f80', 25);
        Particles.explode(this.x, this.y, '#ff0', 15);
        Audio.explode(true);
        shake.intensity = 8;
        
        // Damage player if close
        const dist = Math.sqrt((sub.x - this.x) ** 2 + (sub.y - this.y) ** 2);
        if (dist < 60) {
            damageSub(25, 'explosion');
        }
    }
    
    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.explode();
            score += 75;
        }
    }
}

// ==================== CAVE WALL GENERATION ====================
function generateCaveSegment() {
    if (currentLevel < CONFIG.CAVE_START_LEVEL) return;
    
    // Calculate gap based on level (narrower as we go deeper)
    const baseGap = 320;
    const narrowing = (currentLevel - CONFIG.CAVE_START_LEVEL) * 40;
    const gap = Math.max(160, baseGap - narrowing);
    
    // Natural variation
    const gapVariation = Math.sin(nextCaveX * 0.006) * 40 + Math.sin(nextCaveX * 0.015) * 25;
    const finalGap = gap + gapVariation;
    
    // Center line with organic sine wave movement
    const centerY = CONFIG.CANVAS_HEIGHT / 2 +
        Math.sin(nextCaveX * 0.004) * 100 +
        Math.sin(nextCaveX * 0.01) * 50;
    
    // Generate organic curve points
    const numPoints = 10;
    const topPoints = [];
    const bottomPoints = [];
    
    for (let i = 0; i <= numPoints; i++) {
        const segX = nextCaveX + (i / numPoints) * CONFIG.CAVE_SEGMENT_WIDTH;
        
        // Stalactites (top) - jagged
        const topVariation =
            Math.sin(segX * 0.025) * 20 +
            Math.sin(segX * 0.06) * 12 +
            Math.sin(segX * 0.12) * 6 +
            (Math.random() - 0.5) * 8;
        
        // Stalagmites (bottom) - different pattern
        const bottomVariation =
            Math.sin(segX * 0.02) * 25 +
            Math.sin(segX * 0.055) * 15 +
            Math.sin(segX * 0.1) * 8 +
            (Math.random() - 0.5) * 8;
        
        const topY = Math.max(15, centerY - finalGap / 2 + topVariation);
        const bottomY = Math.min(CONFIG.CANVAS_HEIGHT - 15, centerY + finalGap / 2 + bottomVariation);
        
        topPoints.push({ x: segX, y: topY });
        bottomPoints.push({ x: segX, y: bottomY });
    }
    
    caveWalls.push({
        x: nextCaveX,
        width: CONFIG.CAVE_SEGMENT_WIDTH,
        topPoints: topPoints,
        bottomPoints: bottomPoints,
        level: currentLevel
    });
    
    nextCaveX += CONFIG.CAVE_SEGMENT_WIDTH;
}

function updateCaveWalls(dt) {
    if (currentLevel < CONFIG.CAVE_START_LEVEL) return;
    
    // Scroll walls
    caveWalls.forEach(wall => {
        wall.x -= currentScrollSpeed * dt;
        wall.topPoints.forEach(p => p.x -= currentScrollSpeed * dt);
        wall.bottomPoints.forEach(p => p.x -= currentScrollSpeed * dt);
    });
    
    // Remove off-screen walls
    caveWalls = caveWalls.filter(wall => wall.x > -CONFIG.CAVE_SEGMENT_WIDTH * 2);
    
    // Find rightmost edge
    let rightmostX = 0;
    caveWalls.forEach(wall => {
        const wallRight = wall.x + wall.width;
        if (wallRight > rightmostX) rightmostX = wallRight;
    });
    
    // Generate new walls ahead
    while (rightmostX < CONFIG.CANVAS_WIDTH + 300) {
        nextCaveX = rightmostX;
        generateCaveSegment();
        rightmostX += CONFIG.CAVE_SEGMENT_WIDTH;
    }
}

function drawCaveWalls() {
    if (currentLevel < CONFIG.CAVE_START_LEVEL || caveWalls.length === 0) return;
    
    // Draw each wall segment
    caveWalls.forEach(wall => {
        // Top wall (ceiling/stalactites)
        const topGrad = ctx.createLinearGradient(0, 0, 0, 150);
        topGrad.addColorStop(0, '#1a1a1a');
        topGrad.addColorStop(0.5, '#2a2a3a');
        topGrad.addColorStop(1, '#3a3a4a');
        
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(wall.topPoints[0].x, 0);
        
        // Draw curve through points
        for (let i = 0; i < wall.topPoints.length; i++) {
            if (i === 0) {
                ctx.lineTo(wall.topPoints[i].x, wall.topPoints[i].y);
            } else {
                // Smooth curve between points
                const prev = wall.topPoints[i - 1];
                const curr = wall.topPoints[i];
                const cpx = (prev.x + curr.x) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
            }
        }
        ctx.lineTo(wall.topPoints[wall.topPoints.length - 1].x, wall.topPoints[wall.topPoints.length - 1].y);
        ctx.lineTo(wall.topPoints[wall.topPoints.length - 1].x, 0);
        ctx.closePath();
        ctx.fill();
        
        // Add stalactite details
        ctx.fillStyle = '#252535';
        for (let i = 1; i < wall.topPoints.length - 1; i += 2) {
            const p = wall.topPoints[i];
            const spike = 15 + Math.random() * 20;
            ctx.beginPath();
            ctx.moveTo(p.x - 8, p.y);
            ctx.lineTo(p.x, p.y + spike);
            ctx.lineTo(p.x + 8, p.y);
            ctx.fill();
        }
        
        // Bottom wall (floor/stalagmites)
        const bottomGrad = ctx.createLinearGradient(0, CONFIG.CANVAS_HEIGHT - 150, 0, CONFIG.CANVAS_HEIGHT);
        bottomGrad.addColorStop(0, '#3a3a4a');
        bottomGrad.addColorStop(0.5, '#2a2a3a');
        bottomGrad.addColorStop(1, '#1a1a1a');
        
        ctx.fillStyle = bottomGrad;
        ctx.beginPath();
        ctx.moveTo(wall.bottomPoints[0].x, CONFIG.CANVAS_HEIGHT);
        
        for (let i = 0; i < wall.bottomPoints.length; i++) {
            if (i === 0) {
                ctx.lineTo(wall.bottomPoints[i].x, wall.bottomPoints[i].y);
            } else {
                const prev = wall.bottomPoints[i - 1];
                const curr = wall.bottomPoints[i];
                const cpx = (prev.x + curr.x) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
            }
        }
        ctx.lineTo(wall.bottomPoints[wall.bottomPoints.length - 1].x, wall.bottomPoints[wall.bottomPoints.length - 1].y);
        ctx.lineTo(wall.bottomPoints[wall.bottomPoints.length - 1].x, CONFIG.CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();
        
        // Stalagmite details
        ctx.fillStyle = '#353545';
        for (let i = 1; i < wall.bottomPoints.length - 1; i += 2) {
            const p = wall.bottomPoints[i];
            const spike = 15 + Math.random() * 25;
            ctx.beginPath();
            ctx.moveTo(p.x - 10, p.y);
            ctx.lineTo(p.x, p.y - spike);
            ctx.lineTo(p.x + 10, p.y);
            ctx.fill();
        }
    });
    
    // Edge glow for visibility
    ctx.strokeStyle = 'rgba(0, 150, 200, 0.3)';
    ctx.lineWidth = 2;
    caveWalls.forEach(wall => {
        ctx.beginPath();
        wall.topPoints.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        
        ctx.beginPath();
        wall.bottomPoints.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    });
}

function checkCaveCollision() {
    if (currentLevel < CONFIG.CAVE_START_LEVEL) return false;
    if (sub.invincible > 0 || godMode) return false;
    
    const subLeft = sub.x - 35;
    const subRight = sub.x + 40;
    const subTop = sub.y - 25;
    const subBottom = sub.y + 20;
    
    for (const wall of caveWalls) {
        // Check collision points along sub
        for (let checkX = subLeft; checkX <= subRight; checkX += 15) {
            // Find wall Y at this X
            for (let i = 0; i < wall.topPoints.length - 1; i++) {
                const p1 = wall.topPoints[i];
                const p2 = wall.topPoints[i + 1];
                
                if (checkX >= p1.x && checkX < p2.x) {
                    const t = (checkX - p1.x) / (p2.x - p1.x);
                    const wallTopY = p1.y * (1 - t) + p2.y * t;
                    
                    if (subTop < wallTopY + 10) {
                        return true; // Hit ceiling
                    }
                }
            }
            
            for (let i = 0; i < wall.bottomPoints.length - 1; i++) {
                const p1 = wall.bottomPoints[i];
                const p2 = wall.bottomPoints[i + 1];
                
                if (checkX >= p1.x && checkX < p2.x) {
                    const t = (checkX - p1.x) / (p2.x - p1.x);
                    const wallBottomY = p1.y * (1 - t) + p2.y * t;
                    
                    if (subBottom > wallBottomY - 10) {
                        return true; // Hit floor
                    }
                }
            }
        }
    }
    
    return false;
}

// Get safe spawn Y (not inside walls)
function getSafeSpawnY() {
    const x = CONFIG.CANVAS_WIDTH + 50;
    
    if (currentLevel >= CONFIG.CAVE_START_LEVEL && caveWalls.length > 0) {
        // Find cave bounds at spawn X
        let minY = 80;
        let maxY = CONFIG.CANVAS_HEIGHT - 80;
        
        for (const wall of caveWalls) {
            if (x >= wall.x && x < wall.x + wall.width) {
                // Get top and bottom at this X
                for (let i = 0; i < wall.topPoints.length - 1; i++) {
                    const p1 = wall.topPoints[i];
                    const p2 = wall.topPoints[i + 1];
                    if (x >= p1.x && x < p2.x) {
                        const t = (x - p1.x) / (p2.x - p1.x);
                        minY = Math.max(minY, p1.y * (1 - t) + p2.y * t + 30);
                    }
                }
                for (let i = 0; i < wall.bottomPoints.length - 1; i++) {
                    const p1 = wall.bottomPoints[i];
                    const p2 = wall.bottomPoints[i + 1];
                    if (x >= p1.x && x < p2.x) {
                        const t = (x - p1.x) / (p2.x - p1.x);
                        maxY = Math.min(maxY, p1.y * (1 - t) + p2.y * t - 30);
                    }
                }
            }
        }
        
        if (maxY > minY) {
            return minY + Math.random() * (maxY - minY);
        }
    }
    
    return 80 + Math.random() * (CONFIG.CANVAS_HEIGHT - 160);
}

// ==================== CHECKPOINT SYSTEM ====================
function updateCheckpoint(dt) {
    if (!checkpoint) return;
    
    checkpoint.phase += dt;
    checkpoint.x -= currentScrollSpeed * dt;
    
    // Update Y to stay on floor
    checkpoint.y = getFloorY(checkpoint.x);
    
    // Check if passed
    if (!checkpoint.reached && checkpoint.x < sub.x) {
        checkpoint.reached = true;
        reachCheckpoint();
    }
    
    // Spawn new checkpoint after this one scrolls off
    if (checkpoint.x < -checkpoint.width) {
        spawnNextCheckpoint();
    }
}

function reachCheckpoint() {
    checkpointsPassed++;
    
    const level = LEVELS[Math.min(currentLevel, LEVELS.length - 1)];
    const bonus = level.checkpointBonus;
    
    score += bonus;
    
    // Restore resources
    sub.hull = Math.min(sub.hull + 25, CONFIG.MAX_HULL);
    sub.air = Math.min(sub.air + 30, CONFIG.MAX_AIR);
    sub.torpedoes = Math.min(sub.torpedoes + 1, CONFIG.MAX_TORPEDOES);
    
    // Audio
    Audio.voiceCheckpoint();
    Audio.levelComplete();
    
    // Flash effect
    document.getElementById('checkpointFlash').style.opacity = '1';
    setTimeout(() => document.getElementById('checkpointFlash').style.opacity = '0', 300);
    
    // Progress to next level every 2 checkpoints
    if (checkpointsPassed > 0 && checkpointsPassed % 3 === 0) {
        const oldLevel = currentLevel;
        currentLevel = Math.min(currentLevel + 1, LEVELS.length - 1);
        
        if (currentLevel !== oldLevel) {
            // Entering new zone
            if (currentLevel >= CONFIG.CAVE_START_LEVEL && oldLevel < CONFIG.CAVE_START_LEVEL) {
                // Just entered caves - generate initial walls
                caveWalls = [];
                nextCaveX = CONFIG.CANVAS_WIDTH;
                for (let i = 0; i < 8; i++) {
                    generateCaveSegment();
                }
            }
        }
    }
}

function spawnNextCheckpoint() {
    const typeIndex = checkpointsPassed % CHECKPOINT_TYPES.length;
    const type = CHECKPOINT_TYPES[typeIndex];
    
    checkpoint = {
        x: CONFIG.CANVAS_WIDTH + 1800 + Math.random() * 600,  // Much further apart (was 600-1000)
        y: getFloorY(CONFIG.CANVAS_WIDTH + 2200),
        width: type.width,
        height: type.height,
        name: type.name,
        reached: false,
        phase: 0
    };
}

function drawCheckpoint() {
    if (!checkpoint) return;
    
    const c = checkpoint;
    ctx.save();
    ctx.translate(c.x, c.y);
    
    // Beacon glow
    const pulse = 0.5 + Math.sin(c.phase * 2) * 0.3;
    ctx.globalAlpha = 0.4 * pulse;
    const glow = ctx.createRadialGradient(0, -c.height / 2, 0, 0, -c.height / 2, 100);
    glow.addColorStop(0, '#0ff');
    glow.addColorStop(0.5, '#08f');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -c.height / 2, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw checkpoint object
    if (c.name === 'SUNKEN GALLEON') {
        drawSunkenShip(c);
    } else if (c.name === 'ANCIENT RUINS') {
        drawAncientRuins(c);
    } else if (c.name === 'WHALE SKELETON') {
        drawWhaleSkeleton(c);
    } else if (c.name === 'LOST SUBMARINE') {
        drawLostSubmarine(c);
    } else if (c.name === 'CRYSTAL FORMATION') {
        drawCrystals(c);
    }
    
    // Label
    ctx.fillStyle = '#0ff';
    ctx.globalAlpha = 0.9;
    ctx.font = 'bold 12px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◆ CHECKPOINT ◆', 0, -c.height - 25);
    ctx.font = '10px Orbitron, monospace';
    ctx.fillText(c.name, 0, -c.height - 10);
    ctx.globalAlpha = 1;
    
    ctx.restore();
    
    // Distance indicator
    if (c.x > CONFIG.CANVAS_WIDTH) {
        const dist = Math.floor((c.x - CONFIG.CANVAS_WIDTH) / 10);
        ctx.fillStyle = '#0ff';
        ctx.globalAlpha = 0.8;
        ctx.font = '12px Orbitron, monospace';
        ctx.textAlign = 'right';
        ctx.fillText('CHECKPOINT »', CONFIG.CANVAS_WIDTH - 15, CONFIG.CANVAS_HEIGHT - 80);
        ctx.fillText(dist + 'm', CONFIG.CANVAS_WIDTH - 15, CONFIG.CANVAS_HEIGHT - 65);
        ctx.globalAlpha = 1;
    }
}

function drawSunkenShip(c) {
    // Hull
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(-70, -10);
    ctx.lineTo(-60, -50);
    ctx.lineTo(60, -55);
    ctx.lineTo(75, -25);
    ctx.lineTo(70, -5);
    ctx.lineTo(-65, 0);
    ctx.closePath();
    ctx.fill();
    
    // Deck
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(-50, -55, 100, 8);
    
    // Broken mast
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, -55);
    ctx.lineTo(-20, -100);
    ctx.stroke();
    
    // Tattered sail
    ctx.fillStyle = 'rgba(200, 180, 150, 0.4)';
    ctx.beginPath();
    ctx.moveTo(-20, -95);
    ctx.quadraticCurveTo(10 + Math.sin(c.phase) * 5, -75, 5, -55);
    ctx.lineTo(-15, -55);
    ctx.closePath();
    ctx.fill();
}

function drawAncientRuins(c) {
    // Columns
    ctx.fillStyle = '#4a4a3a';
    ctx.fillRect(-50, -80, 15, 80);
    ctx.fillRect(35, -60, 15, 60);
    ctx.fillRect(-10, -70, 12, 70);
    
    // Fallen column
    ctx.save();
    ctx.translate(20, -10);
    ctx.rotate(0.3);
    ctx.fillRect(-30, -8, 60, 16);
    ctx.restore();
    
    // Archway
    ctx.strokeStyle = '#5a5a4a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(-17, -60, 40, Math.PI, 0);
    ctx.stroke();
}

function drawWhaleSkeleton(c) {
    ctx.strokeStyle = '#c0c0b0';
    ctx.lineWidth = 4;
    
    // Spine
    ctx.beginPath();
    ctx.moveTo(-80, -20);
    ctx.quadraticCurveTo(0, -35, 80, -25);
    ctx.stroke();
    
    // Ribs
    for (let i = 0; i < 8; i++) {
        const rx = -60 + i * 18;
        ctx.beginPath();
        ctx.moveTo(rx, -25);
        ctx.quadraticCurveTo(rx - 5, -45, rx, -55);
        ctx.stroke();
    }
    
    // Skull
    ctx.fillStyle = '#d0d0c0';
    ctx.beginPath();
    ctx.ellipse(-75, -25, 20, 15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye socket
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-80, -28, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawLostSubmarine(c) {
    // Tilted, rusted hull
    ctx.save();
    ctx.rotate(0.15);
    
    ctx.fillStyle = '#3a4a4a';
    ctx.beginPath();
    ctx.ellipse(0, -25, 65, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rust patches
    ctx.fillStyle = '#5a3a2a';
    ctx.beginPath();
    ctx.ellipse(20, -20, 15, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Conning tower
    ctx.fillStyle = '#4a5a5a';
    ctx.fillRect(-10, -50, 25, 20);
    
    ctx.restore();
}

function drawCrystals(c) {
    const colors = ['#0ff', '#08f', '#f0f', '#0f8'];
    
    for (let i = 0; i < 6; i++) {
        const cx = -40 + i * 16;
        const ch = 30 + Math.random() * 40;
        const angle = (Math.random() - 0.5) * 0.4;
        
        ctx.save();
        ctx.translate(cx, 0);
        ctx.rotate(angle);
        
        const color = colors[i % colors.length];
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(0, -ch);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();
        
        // Glow
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        ctx.restore();
    }
}

// ==================== AIR BUBBLES (Collectible) ====================
function spawnAirBubble(x, y) {
    airBubbles.push({
        x: x,
        y: y,
        size: 12 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        lifetime: 10
    });
}

function updateAirBubbles(dt) {
    airBubbles.forEach(b => {
        b.phase += dt * 3;
        b.x -= currentScrollSpeed * dt;
        b.y -= 20 * dt; // Float up slowly
        b.y += Math.sin(b.phase) * 10 * dt; // Wobble
        b.lifetime -= dt;
    });
    
    airBubbles = airBubbles.filter(b => b.lifetime > 0 && b.x > -50);
}

function drawAirBubbles() {
    airBubbles.forEach(b => {
        const pulse = 0.9 + Math.sin(b.phase * 2) * 0.1;
        const blink = b.lifetime < 3 ? (Math.sin(b.phase * 6) > 0 ? 1 : 0.5) : 1;
        
        ctx.globalAlpha = 0.3 * blink;
        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 2);
        glow.addColorStop(0, '#0ff');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.6 * blink;
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    });
}

// ==================== POWERUPS ====================
function spawnPowerup(x, y) {
    const types = ['torpedo', 'hull', 'speed'];
    powerups.push({
        x: x,
        y: y,
        type: types[Math.floor(Math.random() * types.length)],
        phase: 0,
        lifetime: 12
    });
}

function updatePowerups(dt) {
    powerups.forEach(p => {
        p.phase += dt * 3;
        p.x -= currentScrollSpeed * dt;
        p.y += Math.sin(p.phase) * 15 * dt;
        p.lifetime -= dt;
    });
    
    powerups = powerups.filter(p => p.lifetime > 0 && p.x > -50);
}

function drawPowerups() {
    powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        const pulse = 1 + Math.sin(p.phase * 2) * 0.2;
        const blink = p.lifetime < 3 ? (Math.sin(p.phase * 6) > 0 ? 1 : 0.4) : 1;
        
        // Glow
        ctx.globalAlpha = 0.4 * blink;
        const color = p.type === 'torpedo' ? '#f80' : p.type === 'hull' ? '#0f8' : '#ff0';
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = blink;
        
        // Box
        ctx.fillStyle = '#111';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-15 * pulse, -15 * pulse, 30 * pulse, 30 * pulse, 5);
        ctx.fill();
        ctx.stroke();
        
        // Icon
        ctx.font = `${16 * pulse}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        const icon = p.type === 'torpedo' ? '🚀' : p.type === 'hull' ? '🛡️' : '⚡';
        ctx.fillText(icon, 0, 0);
        
        ctx.restore();
    });
}

// ==================== SPAWNING ====================
function checkSpawns(dt) {
    enemySpawnTimer -= dt;
    
    if (enemySpawnTimer <= 0) {
        const levelData = LEVELS[currentLevel];
        enemySpawnTimer = levelData.enemyRate + Math.random();
        
        // Choose enemy type based on level
        const roll = Math.random();
        const y = getSafeSpawnY();
        
        if (currentLevel >= 4 && roll < 0.15) {
            // Anglerfish in deeper levels
            enemies.push(new Anglerfish(CONFIG.CANVAS_WIDTH + 50, y));
        } else if (currentLevel < CONFIG.CAVE_START_LEVEL && roll < 0.25) {
            // Sharks in open ocean (levels 0-1)
            enemies.push(new Shark(CONFIG.CANVAS_WIDTH + 50, y));
        } else if (currentLevel >= 2 && roll < 0.4) {
            // Jellyfish from level 2+
            enemies.push(new Jellyfish(CONFIG.CANVAS_WIDTH + 50, y));
        } else {
            // Squids everywhere
            enemies.push(new Squid(CONFIG.CANVAS_WIDTH + 50, y));
        }
        
        // Spawn mines occasionally (more common in caves)
        const mineChance = currentLevel >= CONFIG.CAVE_START_LEVEL ? 0.3 : 0.15;
        if (Math.random() < mineChance) {
            const mineY = getSafeSpawnY();
            mines.push(new Mine(CONFIG.CANVAS_WIDTH + 100 + Math.random() * 200, mineY, Math.random() < 0.6));
        }
    }
}

// ==================== UPDATE ====================
function update(dt) {
    if (gameState !== 'playing') return;
    
    gameTime += dt;
    depth += currentScrollSpeed * dt * 0.3;
    
    // Air depletion
    if (!infiniteAir && !godMode) {
        sub.air -= CONFIG.AIR_DRAIN_RATE * dt;
        if (sub.air <= 0) {
            sub.air = 0;
            damageSub(999, 'suffocation');
            return;
        }
    }
    
    // Sub movement
    if (!sub.isDead) {
        if (sub.invincible > 0) sub.invincible -= dt;
        
        // Scroll speed
        if (Input.isDown('right')) {
            currentScrollSpeed = Math.min(CONFIG.SCROLL_SPEED_MAX, currentScrollSpeed + 150 * dt);
        } else {
            currentScrollSpeed = Math.max(CONFIG.SCROLL_SPEED_BASE, currentScrollSpeed - 100 * dt);
        }
        
        // Movement
        if (Input.isDown('up')) sub.y -= CONFIG.SUB_SPEED * dt;
        if (Input.isDown('down')) sub.y += CONFIG.SUB_SPEED * dt;
        if (Input.isDown('left')) sub.x -= CONFIG.SUB_SPEED * dt;
        if (Input.isDown('right')) sub.x += CONFIG.SUB_SPEED * 0.3 * dt;
        
        // Clamp position
        sub.x = Math.max(50, Math.min(CONFIG.CANVAS_WIDTH * 0.45, sub.x));
        
        // Clamp Y to cave or screen bounds
        if (currentLevel >= CONFIG.CAVE_START_LEVEL) {
            // Will be constrained by cave collision
            sub.y = Math.max(40, Math.min(CONFIG.CANVAS_HEIGHT - 40, sub.y));
        } else {
            sub.y = Math.max(40, Math.min(CONFIG.CANVAS_HEIGHT - 60, sub.y));
        }
        
        // Shooting
        if (Input.isDown('fire') && Date.now() - lastShot > 150) {
            fireBullet();
            lastShot = Date.now();
        }
        
        // Torpedo
        if (Input.wasPressed('torpedo') && sub.torpedoes > 0 && Date.now() - lastTorpedo > 500) {
            fireTorpedo();
            lastTorpedo = Date.now();
        }
    }
    
    // Update all objects
    updateBullets(dt);
    updateTorpedoes(dt);
    updateEnemies(dt);
    updateAirBubbles(dt);
    updatePowerups(dt);
    updateEnvironment(dt);
    updateAmbientElements(dt);
    updateCheckpoint(dt);
    updateCaveWalls(dt);
    Particles.update(dt);
    
    // Collisions
    checkCollisions();
    if (checkCaveCollision()) {
        damageSub(30, 'wall');
    }
    
    // Spawning
    checkSpawns(dt);
    
    // Screen shake decay
    shake.intensity *= 0.9;
    if (shake.intensity < 0.5) shake.intensity = 0;
    shake.x = (Math.random() - 0.5) * shake.intensity * 2;
    shake.y = (Math.random() - 0.5) * shake.intensity * 2;
    
    // Update UI
    updateUI();
}

function fireBullet() {
    bullets.push({
        x: sub.x + 40,
        y: sub.y,
        vx: CONFIG.BULLET_SPEED
    });
    Audio.shoot();
}

function fireTorpedo() {
    sub.torpedoes--;
    torpedoes.push({
        x: sub.x + 40,
        y: sub.y,
        vx: CONFIG.TORPEDO_SPEED,
        trail: []
    });
    Audio.shootTorpedo();
    Audio.voiceTorpedo();
    updateTorpedoUI();
}

function updateBullets(dt) {
    bullets.forEach(b => {
        b.x += b.vx * dt;
    });
    // Filter bullets that go off either side
    bullets = bullets.filter(b => b.x > -20 && b.x < CONFIG.CANVAS_WIDTH + 20);
    
    // Enemy bullets
    enemyBullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    });
    enemyBullets = enemyBullets.filter(b => 
        b.x > -20 && b.x < CONFIG.CANVAS_WIDTH + 20 &&
        b.y > -20 && b.y < CONFIG.CANVAS_HEIGHT + 20
    );
}

function updateTorpedoes(dt) {
    torpedoes.forEach(t => {
        t.x += t.vx * dt;
        
        // Trail particles
        if (Math.random() < 0.5) {
            Particles.explode(t.x - 10, t.y, '#f80', 1, 50, 0.2);
        }
    });
    torpedoes = torpedoes.filter(t => t.x < CONFIG.CANVAS_WIDTH + 50);
}

function updateEnemies(dt) {
    enemies.forEach(e => e.update(dt));
    enemies = enemies.filter(e => e.alive);
    
    mines.forEach(m => m.update(dt));
    mines = mines.filter(m => m.alive);
}

function updateEnvironment(dt) {
    // Light rays
    lightRays.forEach(r => {
        r.x -= r.speed * dt;
        if (r.x < -r.width * 2) {
            r.x = CONFIG.CANVAS_WIDTH + r.width;
        }
    });
    
    // Background bubbles
    backgroundBubbles.forEach(b => {
        b.wobble += dt * 2;
        b.y -= b.speed * dt;
        b.x += Math.sin(b.wobble) * 10 * dt;
        b.x -= currentScrollSpeed * 0.3 * dt;
        
        if (b.y < -20) {
            b.y = CONFIG.CANVAS_HEIGHT + 20;
            b.x = Math.random() * CONFIG.CANVAS_WIDTH;
        }
        if (b.x < -20) b.x = CONFIG.CANVAS_WIDTH + 20;
    });
}

// ==================== COLLISION DETECTION ====================
function checkCollisions() {
    if (sub.isDead) return;
    
    // Bullets vs enemies
    bullets.forEach(b => {
        enemies.forEach(e => {
            if (e.alive && circleCollision(b.x, b.y, 5, e.x, e.y, e.width / 2)) {
                e.hit();
                b.x = -100;
            }
        });
        
        mines.forEach(m => {
            if (m.alive && circleCollision(b.x, b.y, 5, m.x, m.y, m.size)) {
                m.hit();
                b.x = -100;
            }
        });
    });
    
    // Torpedoes vs enemies (more damage)
    torpedoes.forEach(t => {
        enemies.forEach(e => {
            if (e.alive && circleCollision(t.x, t.y, 10, e.x, e.y, e.width / 2 + 10)) {
                e.hp -= 3;
                e.hit();
                Particles.explode(t.x, t.y, '#f80', 15);
                t.x = -100;
            }
        });
        
        mines.forEach(m => {
            if (m.alive && circleCollision(t.x, t.y, 10, m.x, m.y, m.size + 10)) {
                m.hp = 0;
                m.hit();
                Particles.explode(t.x, t.y, '#f80', 20);
                t.x = -100;
            }
        });
    });
    
    // Sub vs enemies
    if (sub.invincible <= 0 && !godMode) {
        enemies.forEach(e => {
            if (e.alive && circleCollision(sub.x, sub.y, 25, e.x, e.y, e.width / 2)) {
                damageSub(20, 'enemy');
                e.hit();
            }
        });
        
        mines.forEach(m => {
            if (m.alive && circleCollision(sub.x, sub.y, 30, m.x, m.y, m.size)) {
                damageSub(35, 'mine');
                m.hp = 0;
                m.hit();
            }
        });
        
        // Enemy bullets
        enemyBullets.forEach(b => {
            if (circleCollision(sub.x, sub.y, 20, b.x, b.y, b.size)) {
                damageSub(15, 'bullet');
                b.x = -100;
            }
        });
    }
    
    // Sub vs air bubbles
    airBubbles.forEach(b => {
        if (circleCollision(sub.x, sub.y, 35, b.x, b.y, b.size)) {
            sub.air = Math.min(sub.air + 20, CONFIG.MAX_AIR);
            Audio.collect();
            Audio.voiceOxygenReplenished();
            b.lifetime = 0;
        }
    });
    
    // Sub vs powerups
    powerups.forEach(p => {
        if (circleCollision(sub.x, sub.y, 35, p.x, p.y, 15)) {
            if (p.type === 'torpedo') {
                sub.torpedoes = Math.min(sub.torpedoes + 2, CONFIG.MAX_TORPEDOES);
                updateTorpedoUI();
            } else if (p.type === 'hull') {
                sub.hull = Math.min(sub.hull + 30, CONFIG.MAX_HULL);
            } else if (p.type === 'speed') {
                // Temporary speed boost - just give points for now
                score += 200;
            }
            Audio.powerup();
            Audio.voicePowerUp();
            p.lifetime = 0;
        }
    });
}

function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

function damageSub(amount, source) {
    if (sub.invincible > 0 || godMode) return;
    
    sub.hull -= amount;
    sub.invincible = 1;
    shake.intensity = 15;
    
    Particles.explode(sub.x, sub.y, '#f80', 10);
    Audio.hit();
    
    if (sub.hull <= 0) {
        sub.hull = 0;
        sub.isDead = true;
        
        Particles.explode(sub.x, sub.y, '#ff0', 30);
        Particles.explode(sub.x, sub.y, '#f80', 25);
        Audio.explode(true);
        Audio.voiceGameOver();
        
        setTimeout(() => {
            gameState = 'gameover';
            showScreen('gameOverScreen');
            document.getElementById('finalScore').textContent = score.toLocaleString();
            document.getElementById('finalDepth').textContent = Math.floor(depth) + 'm';
            document.getElementById('finalCheckpoints').textContent = checkpointsPassed;
        }, 1500);
    }
}

// ==================== DRAWING ====================
function draw() {
    ctx.save();
    ctx.translate(shake.x, shake.y);
    
    // Background gradient based on depth
    const darkness = LEVELS[currentLevel]?.darkness || 0;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
    bgGrad.addColorStop(0, `rgba(0, ${30 - darkness * 20}, ${60 - darkness * 40}, 1)`);
    bgGrad.addColorStop(1, `rgba(0, ${10 - darkness * 8}, ${30 - darkness * 20}, 1)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Light rays (surface levels)
    if (currentLevel < 2) {
        drawLightRays();
    }
    
    // Background bubbles
    drawBackgroundBubbles();
    
    // Ocean floor (if not in caves)
    if (currentLevel < CONFIG.CAVE_START_LEVEL) {
        drawOceanFloor();
        drawAmbientFish();
    }
    
    // Cave walls
    drawCaveWalls();
    
    // Checkpoint
    drawCheckpoint();
    
    // Collectibles
    drawAirBubbles();
    drawPowerups();
    
    // Enemies
    enemies.forEach(e => e.draw());
    mines.forEach(m => m.draw());
    
    // Enemy bullets
    enemyBullets.forEach(b => {
        ctx.fillStyle = `hsl(${b.hue}, 100%, 60%)`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsl(${b.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Player bullets
    ctx.fillStyle = '#0ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#0ff';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Torpedoes
    torpedoes.forEach(t => {
        ctx.fillStyle = '#f80';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f80';
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    // Submarine
    drawSub();
    
    // Particles
    Particles.draw(ctx);
    
    // Darkness overlay
    if (darkness > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.4})`;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Submarine light cone
        if (!sub.isDead) {
            const lightGrad = ctx.createRadialGradient(sub.x + 50, sub.y, 0, sub.x + 50, sub.y, 200);
            lightGrad.addColorStop(0, `rgba(100, 200, 255, ${darkness * 0.3})`);
            lightGrad.addColorStop(0.5, `rgba(50, 100, 150, ${darkness * 0.15})`);
            lightGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.arc(sub.x + 50, sub.y, 200, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.restore();
}

function drawLightRays() {
    ctx.globalAlpha = 0.08;
    lightRays.forEach(r => {
        const gradient = ctx.createLinearGradient(r.x, 0, r.x + r.width, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(r.x, 0);
        ctx.lineTo(r.x + r.width, 0);
        ctx.lineTo(r.x + r.width * 2, CONFIG.CANVAS_HEIGHT);
        ctx.lineTo(r.x + r.width, CONFIG.CANVAS_HEIGHT);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawBackgroundBubbles() {
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
    backgroundBubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawOceanFloor() {
    const floorY = CONFIG.CANVAS_HEIGHT - 60;
    
    // Gradient
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, CONFIG.CANVAS_HEIGHT);
    floorGrad.addColorStop(0, 'transparent');
    floorGrad.addColorStop(0.3, 'rgba(60, 50, 30, 0.3)');
    floorGrad.addColorStop(1, 'rgba(40, 35, 20, 0.6)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, CONFIG.CANVAS_WIDTH, 60);
    
    // Rocks
    ctx.fillStyle = '#3a3020';
    floorRocks.forEach(r => {
        ctx.beginPath();
        ctx.ellipse(r.x, CONFIG.CANVAS_HEIGHT - 10, r.size, r.height, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Shells and decorations
    drawShells();
    
    // Seaweed
    drawSeaweed();
}

function drawSeaweed() {
    seaweed.forEach(s => {
        if (s.x < -50 || s.x > CONFIG.CANVAS_WIDTH + 50) return;
        
        const baseY = CONFIG.CANVAS_HEIGHT - 20;
        
        // Main stalk
        ctx.strokeStyle = `hsl(${s.hue}, 60%, 25%)`;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, baseY);
        
        for (let i = 1; i <= s.segments; i++) {
            const segY = baseY - (i / s.segments) * s.height;
            const sway = Math.sin(s.phase + i * 0.5) * (i * 4);
            ctx.lineTo(s.x + sway, segY);
        }
        ctx.stroke();
        
        // Fronds (leaves)
        ctx.strokeStyle = `hsl(${s.hue}, 50%, 20%)`;
        ctx.lineWidth = 2;
        for (let i = 2; i < s.segments; i += 1) {
            const fY = baseY - (i / s.segments) * s.height;
            const fX = s.x + Math.sin(s.phase + i * 0.5) * (i * 4);
            const side = i % 2 === 0 ? 1 : -1;
            
            ctx.beginPath();
            ctx.moveTo(fX, fY);
            ctx.quadraticCurveTo(fX + side * 15, fY - 10, fX + side * 20, fY + 5);
            ctx.stroke();
        }
    });
}

function drawShells() {
    shells.forEach(s => {
        if (s.x < -20 || s.x > CONFIG.CANVAS_WIDTH + 20) return;
        
        const y = CONFIG.CANVAS_HEIGHT - 15;
        ctx.save();
        ctx.translate(s.x, y);
        ctx.rotate(s.rotation);
        
        switch (s.type) {
            case 0: // Spiral shell
                ctx.fillStyle = '#d4a574';
                ctx.beginPath();
                ctx.ellipse(0, 0, s.size, s.size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#a67c52';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    ctx.arc(i * 2, 0, s.size - i * 3, 0, Math.PI);
                }
                ctx.stroke();
                break;
                
            case 1: // Starfish
                ctx.fillStyle = '#c45030';
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * s.size, Math.sin(angle) * s.size);
                    ctx.lineTo(Math.cos(angle + 0.3) * s.size * 0.4, Math.sin(angle + 0.3) * s.size * 0.4);
                    ctx.fill();
                }
                break;
                
            case 2: // Coral piece
                ctx.fillStyle = '#e08060';
                ctx.beginPath();
                ctx.moveTo(-s.size * 0.5, 0);
                ctx.lineTo(-s.size * 0.3, -s.size);
                ctx.lineTo(0, -s.size * 0.6);
                ctx.lineTo(s.size * 0.3, -s.size * 0.8);
                ctx.lineTo(s.size * 0.5, 0);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 3: // Skull (rare spooky)
                ctx.fillStyle = '#d0d0c0';
                ctx.beginPath();
                ctx.ellipse(0, -s.size * 0.3, s.size * 0.6, s.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(-s.size * 0.2, -s.size * 0.3, s.size * 0.15, 0, Math.PI * 2);
                ctx.arc(s.size * 0.2, -s.size * 0.3, s.size * 0.15, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    });
}

function spawnAmbientFish() {
    ambientFish.push({
        x: CONFIG.CANVAS_WIDTH + Math.random() * 200,
        y: 100 + Math.random() * 350,
        speed: 30 + Math.random() * 50,
        size: 5 + Math.random() * 10,
        hue: Math.random() < 0.5 ? 30 + Math.random() * 30 : 180 + Math.random() * 60,  // Orange or blue-green
        phase: Math.random() * Math.PI * 2,
        schoolId: Math.floor(Math.random() * 3)  // Fish swim in loose schools
    });
}

function drawAmbientFish() {
    ambientFish.forEach(f => {
        if (f.x < -20 || f.x > CONFIG.CANVAS_WIDTH + 50) return;
        
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.globalAlpha = 0.7;
        
        // Body
        ctx.fillStyle = `hsl(${f.hue}, 60%, 50%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail (on right since moving left)
        ctx.beginPath();
        ctx.moveTo(f.size * 0.7, 0);
        ctx.lineTo(f.size * 1.5, -f.size * 0.4);
        ctx.lineTo(f.size * 1.5, f.size * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-f.size * 0.4, -f.size * 0.1, f.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
        ctx.restore();
    });
}

function updateAmbientElements(dt) {
    // Update seaweed
    seaweed.forEach(s => {
        s.phase += dt * 1.5;
        s.x -= currentScrollSpeed * dt;
        
        // Respawn off screen
        if (s.x < -100) {
            s.x = CONFIG.CANVAS_WIDTH + 50 + Math.random() * 100;
            s.height = 60 + Math.random() * 80;
            s.segments = 5 + Math.floor(Math.random() * 4);
        }
    });
    
    // Update shells
    shells.forEach(s => {
        s.x -= currentScrollSpeed * dt;
        if (s.x < -30) {
            s.x = CONFIG.CANVAS_WIDTH + 30 + Math.random() * 50;
            s.type = Math.floor(Math.random() * 4);
            s.size = 8 + Math.random() * 12;
        }
    });
    
    // Update ambient fish
    ambientFish.forEach(f => {
        f.phase += dt * 3;
        f.x -= (f.speed + currentScrollSpeed * 0.5) * dt;
        f.y += Math.sin(f.phase) * 15 * dt;
        
        // Keep in bounds vertically
        f.y = Math.max(80, Math.min(CONFIG.CANVAS_HEIGHT - 100, f.y));
    });
    
    // Remove off-screen fish and spawn new ones
    ambientFish = ambientFish.filter(f => f.x > -50);
    while (ambientFish.length < 8 && currentLevel < CONFIG.CAVE_START_LEVEL) {
        spawnAmbientFish();
    }
    
    // Update floor rocks
    floorRocks.forEach(r => {
        r.x -= currentScrollSpeed * dt;
        if (r.x < -50) {
            r.x = CONFIG.CANVAS_WIDTH + 30 + Math.random() * 50;
            r.size = 10 + Math.random() * 20;
        }
    });
}

// ==================== UI ====================
function updateUI() {
    document.getElementById('scoreValue').textContent = score.toLocaleString();
    document.getElementById('depthValue').textContent = Math.floor(depth) + 'm';
    document.getElementById('sectorValue').textContent = LEVELS[currentLevel].name;
    
    // Air bar
    const airPercent = (sub.air / CONFIG.MAX_AIR) * 100;
    document.getElementById('airFill').style.width = airPercent + '%';
    document.getElementById('airFill').classList.toggle('low', airPercent < 30);
    
    // Hull bar
    const hullPercent = (sub.hull / CONFIG.MAX_HULL) * 100;
    document.getElementById('hullFill').style.width = hullPercent + '%';
    
    // Depth meter
    const depthPercent = Math.min(100, (depth / 1500) * 100);
    document.getElementById('depthFill').style.height = depthPercent + '%';
}

function updateTorpedoUI() {
    const torpedoBar = document.getElementById('torpedoBar');
    torpedoBar.innerHTML = '';
    for (let i = 0; i < CONFIG.MAX_TORPEDOES; i++) {
        const icon = document.createElement('div');
        icon.className = 'torpedo-icon' + (i >= sub.torpedoes ? ' empty' : '');
        torpedoBar.appendChild(icon);
    }
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
        currentLevel = 0;
        depth = 0;
        gameTime = 0;
        checkpointsPassed = 0;
        currentScrollSpeed = CONFIG.SCROLL_SPEED_BASE;
        
        bullets = [];
        torpedoes = [];
        enemies = [];
        mines = [];
        enemyBullets = [];
        airBubbles = [];
        powerups = [];
        caveWalls = [];
        boss = null;
        
        initGame();
        resetSub();
        spawnFirstCheckpoint();
        updateTorpedoUI();
        showScreen(null);
        
        Audio.init();
        Audio.playGameMusic('it-lurks-below');
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
        window.location.href = '/';
    },
    
    toggleSecretMenu() {
        secretMenuOpen = !secretMenuOpen;
        document.getElementById('secretMenu').classList.toggle('hidden', !secretMenuOpen);
        document.getElementById('godMode').checked = godMode;
        document.getElementById('infiniteAir').checked = infiniteAir;
        document.getElementById('warpLevel').value = currentLevel;
    },
    
    warpToLevel() {
        currentLevel = parseInt(document.getElementById('warpLevel').value);
        
        // Generate caves if needed
        if (currentLevel >= CONFIG.CAVE_START_LEVEL) {
            caveWalls = [];
            nextCaveX = CONFIG.CANVAS_WIDTH;
            for (let i = 0; i < 8; i++) {
                generateCaveSegment();
            }
        } else {
            caveWalls = [];
        }
        
        resetSub();
        spawnNextCheckpoint();
        this.toggleSecretMenu();
        
        if (gameState !== 'playing') {
            gameState = 'playing';
            showScreen(null);
        }
    },
    
    spawnTestEnemy() {
        const y = getSafeSpawnY();
        const roll = Math.random();
        if (roll < 0.25) {
            enemies.push(new Squid(CONFIG.CANVAS_WIDTH - 100, y));
        } else if (roll < 0.5) {
            enemies.push(new Jellyfish(CONFIG.CANVAS_WIDTH - 100, y));
        } else if (roll < 0.75) {
            enemies.push(new Anglerfish(CONFIG.CANVAS_WIDTH - 100, y));
        } else {
            enemies.push(new Shark(CONFIG.CANVAS_WIDTH - 100, y));
        }
    }
};

// ==================== INPUT HANDLING ====================
document.addEventListener('keydown', (e) => {
    if (e.key === '`') {
        Game.toggleSecretMenu();
        return;
    }
    
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
    
    if (e.key === 'q' || e.key === 'Q') {
        if (gameState === 'playing' || gameState === 'paused') {
            Game.quit();
        }
    }
});

document.getElementById('godMode').addEventListener('change', (e) => {
    godMode = e.target.checked;
});

document.getElementById('infiniteAir').addEventListener('change', (e) => {
    infiniteAir = e.target.checked;
});

// ==================== GAME LOOP ====================
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    
    update(dt);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZATION ====================
function init() {
    Input.init();
    Particles.clear();
    initGame();
    
    console.log('🌊 It Lurks Below loaded');
    console.log('🔧 Press ` for secret menu');
    
    requestAnimationFrame(gameLoop);
}

init();
