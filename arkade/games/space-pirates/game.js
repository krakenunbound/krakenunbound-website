// ============================================================================
// SPACE PIRATES - KRAKEN ARKADE
// Galaga-style wave shooter with formation mechanics
// ============================================================================

const CONFIG = {
    CANVAS_WIDTH: 700,
    CANVAS_HEIGHT: 850,
    MAX_HEALTH: 100,
    PLAYER_SPEED: 280,
    BULLET_SPEED: 600,
    FIRE_RATE: 0.15,
    SCROLL_SPEED: 30,
    FORMATION_Y: 150  // Where formations form - lowered to give room at top
};

// 10 Levels with increasing difficulty
const LEVELS = [
    { name: "OUTER RIM", waves: 3, enemyCount: 12, speedMod: 1.0, bossName: "SCOUT COMMANDER", bossHP: 150, color: '#44ff44' },
    { name: "TRADE ROUTES", waves: 3, enemyCount: 16, speedMod: 1.1, bossName: "RAIDER CHIEF", bossHP: 200, color: '#44ccff' },
    { name: "PIRATE TERRITORY", waves: 4, enemyCount: 18, speedMod: 1.2, bossName: "PIRATE FLAGSHIP", bossHP: 280, color: '#ff8844' },
    { name: "SMUGGLER'S DEN", waves: 4, enemyCount: 20, speedMod: 1.3, bossName: "SMUGGLER KING", bossHP: 350, color: '#ff44ff' },
    { name: "CORSAIR SECTOR", waves: 4, enemyCount: 22, speedMod: 1.4, bossName: "CORSAIR LORD", bossHP: 420, color: '#ffff44' },
    { name: "BLACKBEARD ZONE", waves: 5, enemyCount: 24, speedMod: 1.5, bossName: "DREADNOUGHT", bossHP: 500, color: '#ff4444' },
    { name: "SKULL NEBULA", waves: 5, enemyCount: 26, speedMod: 1.6, bossName: "SKULL CAPTAIN", bossHP: 600, color: '#ffffff' },
    { name: "GHOST FLEET", waves: 5, enemyCount: 28, speedMod: 1.7, bossName: "ARMADA COMMANDER", bossHP: 720, color: '#88ffff' },
    { name: "CRIMSON VOID", waves: 6, enemyCount: 30, speedMod: 1.8, bossName: "CRIMSON REAPER", bossHP: 850, color: '#ff0044' },
    { name: "MARAUDER'S END", waves: 6, enemyCount: 35, speedMod: 2.0, bossName: "THE BLACK MARAUDER", bossHP: 1000, color: '#ff00ff' }
];

// Enemy types
const ENEMY_TYPES = {
    SCOUT: { color: '#44ff44', hp: 1, diveSpeed: 180, matDrop: 1, cargoDrop: 0, width: 28, height: 28, points: 100 },
    RAIDER: { color: '#44ccff', hp: 1, diveSpeed: 150, matDrop: 2, cargoDrop: 0, width: 32, height: 32, points: 150 },
    CAPTAIN: { color: '#ff4444', hp: 2, diveSpeed: 120, matDrop: 0, cargoDrop: 1, width: 36, height: 36, points: 250 }
};

// Powerup types - chances are within the drop chance (not guaranteed drop)
const POWERUP_TYPES = [
    { id: 'shield', icon: '🛡️', color: '#44aaff', duration: 8, chance: 0.08 },
    { id: 'rapid', icon: '⚡', color: '#ffff44', duration: 10, chance: 0.08 },
    { id: 'triple', icon: '🔱', color: '#ff44ff', duration: 8, chance: 0.06 },
    { id: 'magnet', icon: '🧲', color: '#ff4444', duration: 12, chance: 0.06 },
    { id: 'heal', icon: '💚', color: '#44ff44', duration: 0, chance: 0.08 },
    { id: 'bomb', icon: '💣', color: '#ff8844', duration: 0, chance: 0.04 },
    { id: 'extend', icon: '⏱️', color: '#ff88ff', duration: 0, chance: 0.02 }
    // Total: 42% chance of powerup when spawnPowerup is called
];

// ==================== GAME STATE ====================

// Debug modes
let godMode = false;
let infiniteBombs = false;

let currentLevel = 0;
let currentWave = 0;
let totalScore = 0;
let sessionScore = 0;
let totalCargo = 0;
let sessionCargo = 0;
let totalKills = 0;
let sessionKills = 0;
let shotsFired = 0;
let shotsHit = 0;
let maxCombo = 0;
let combo = 0;
let comboTimer = 0;
let lives = 3;
let bombs = 3;
let waveEnemiesRemaining = 0;
let bossActive = false;
let boss = null;

// Player state
let player = {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT - 80,
    width: 40,
    health: CONFIG.MAX_HEALTH,
    invuln: 0,
    powerups: { shield: 0, rapid: 0, triple: 0, magnet: 0 },
    thrustTrail: []
};

// Game arrays
let bullets = [];
let enemies = [];
let enemyBullets = [];
let powerups = [];
let loots = [];
let explosions = [];

// Settings menu
let settingsOpen = false;
let stateBeforeSettings = null;
let settingsInitialized = false;

// ==================== GAME-SPECIFIC CLASSES ====================

// Enemy class with Galaga-style behavior
class Enemy {
    constructor(gridX, gridY, type, formationX, formationY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.type = type;
        this.formationX = formationX;
        this.formationY = formationY;
        this.x = formationX;
        this.y = -50;  // Start above screen
        this.hp = type.hp;
        this.maxHP = type.hp;
        this.alive = true;
        this.state = 'entering';  // entering, formation, diving, returning
        this.diveTarget = { x: 0, y: 0 };
        this.diveTimer = Math.random() * 5 + 2;  // Random dive delay
        this.angle = 0;
        this.enterProgress = 0;
        
        // Formation sway
        this.swayOffset = Math.random() * Math.PI * 2;
        this.swayAmount = 3;
        
        const levelMod = LEVELS[currentLevel]?.speedMod || 1;
        this.speed = type.diveSpeed * levelMod;
    }
    
    update(dt) {
        if (!this.alive) return;
        
        if (this.state === 'entering') {
            // Fly into formation
            this.enterProgress += dt * 2;
            this.y = -50 + (this.formationY + 50) * Math.min(1, this.enterProgress);
            if (this.enterProgress >= 1) {
                this.state = 'formation';
                this.y = this.formationY;
            }
        }
        else if (this.state === 'formation') {
            // Sway in formation
            this.x = this.formationX + Math.sin(Date.now() * 0.002 + this.swayOffset) * this.swayAmount;
            this.y = this.formationY + Math.cos(Date.now() * 0.003 + this.swayOffset) * 2;
            
            // Check if should dive
            this.diveTimer -= dt;
            if (this.diveTimer <= 0 && Math.random() < 0.3) {
                this.startDive();
            }
        }
        else if (this.state === 'diving') {
            // Dive toward player
            const dx = this.diveTarget.x - this.x;
            const dy = this.diveTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
                this.angle = Math.atan2(dy, dx) + Math.PI / 2;
            }
            
            // If past bottom, wrap to returning
            if (this.y > CONFIG.CANVAS_HEIGHT + 50) {
                this.state = 'returning';
                this.y = -50;
            }
            
            // Shoot while diving
            if (Math.random() < 0.02) {
                this.shoot();
            }
        }
        else if (this.state === 'returning') {
            // Return to formation
            const dx = this.formationX - this.x;
            const dy = this.formationY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                this.x += (dx / dist) * this.speed * 0.8 * dt;
                this.y += (dy / dist) * this.speed * 0.8 * dt;
                this.angle = Math.atan2(dy, dx) + Math.PI / 2;
            } else {
                this.state = 'formation';
                this.angle = 0;
                this.diveTimer = Math.random() * 5 + 2;
            }
        }
    }
    
    startDive() {
        this.state = 'diving';
        // Aim at player with some prediction
        this.diveTarget = {
            x: player.x + (Math.random() - 0.5) * 100,
            y: CONFIG.CANVAS_HEIGHT + 100
        };
        Audio.hit();
    }
    
    shoot() {
        const bulletSpeed = 250;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        enemyBullets.push({
            x: this.x,
            y: this.y + this.type.height / 2,
            vx: (dx / dist) * bulletSpeed,
            vy: (dy / dist) * bulletSpeed,
            radius: 4
        });
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const s = this.type.width / 2;
        const time = Date.now() * 0.003;
        const sailWave = Math.sin(time + this.swayOffset) * 0.15;
        
        // Damage flash
        if (this.hp < this.maxHP) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff4400';
        }
        
        if (this.type === ENEMY_TYPES.SCOUT) {
            // ===== CORSAIR SKIFF - Small fast pirate ship =====
            
            // Engine glow
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#0f0';
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.ellipse(0, s + 3, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Hull - sleek dark wood
            ctx.fillStyle = '#442200';
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.8);
            ctx.lineTo(s * 0.7, s * 0.3);
            ctx.lineTo(s * 0.5, s);
            ctx.lineTo(-s * 0.5, s);
            ctx.lineTo(-s * 0.7, s * 0.3);
            ctx.closePath();
            ctx.fill();
            
            // Hull trim
            ctx.strokeStyle = '#664422';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Mast
            ctx.strokeStyle = '#553311';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.5);
            ctx.lineTo(0, -s * 1.3);
            ctx.stroke();
            
            // Tattered sail (with wave animation)
            ctx.fillStyle = '#558844';
            ctx.beginPath();
            ctx.moveTo(0, -s * 1.3);
            ctx.quadraticCurveTo(s * 0.5 + sailWave * s, -s * 0.9, s * 0.4, -s * 0.5);
            ctx.lineTo(s * 0.2, -s * 0.55);  // Tatter
            ctx.lineTo(s * 0.3, -s * 0.6);   // Tatter
            ctx.lineTo(0, -s * 0.5);
            ctx.closePath();
            ctx.fill();
            
            // Small Jolly Roger on sail
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s * 0.15, -s * 0.85, 3, 0, Math.PI * 2);  // Tiny skull
            ctx.fill();
            
            // Cockpit glow
            ctx.fillStyle = '#44ff44';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#44ff44';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (this.type === ENEMY_TYPES.RAIDER) {
            // ===== BRIGANTINE - Medium pirate vessel =====
            
            // Engine glows
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#48f';
            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.ellipse(-s * 0.3, s + 2, 3, 5, 0, 0, Math.PI * 2);
            ctx.ellipse(s * 0.3, s + 2, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Main hull - weathered wood
            ctx.fillStyle = '#553322';
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.6);
            ctx.lineTo(s, 0);
            ctx.lineTo(s * 0.8, s);
            ctx.lineTo(-s * 0.8, s);
            ctx.lineTo(-s, 0);
            ctx.closePath();
            ctx.fill();
            
            // Hull details - planks
            ctx.strokeStyle = '#442211';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-s * 0.8, s * 0.3);
            ctx.lineTo(s * 0.8, s * 0.3);
            ctx.moveTo(-s * 0.7, s * 0.6);
            ctx.lineTo(s * 0.7, s * 0.6);
            ctx.stroke();
            
            // Cannons on sides
            ctx.fillStyle = '#333';
            ctx.fillRect(-s - 4, -2, 8, 4);
            ctx.fillRect(s - 4, -2, 8, 4);
            
            // Main mast
            ctx.strokeStyle = '#442211';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.3);
            ctx.lineTo(0, -s * 1.5);
            ctx.stroke();
            
            // Crossbar
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-s * 0.6, -s * 1.2);
            ctx.lineTo(s * 0.6, -s * 1.2);
            ctx.stroke();
            
            // Tattered main sail
            ctx.fillStyle = '#4488aa';
            ctx.beginPath();
            ctx.moveTo(-s * 0.55, -s * 1.2);
            ctx.quadraticCurveTo(-s * 0.3 + sailWave * s * 0.5, -s * 0.7, -s * 0.4, -s * 0.35);
            ctx.lineTo(-s * 0.2, -s * 0.4);  // Tatter notch
            ctx.lineTo(0, -s * 0.3);
            ctx.lineTo(s * 0.2, -s * 0.4);   // Tatter notch
            ctx.lineTo(s * 0.4, -s * 0.35);
            ctx.quadraticCurveTo(s * 0.3 + sailWave * s * 0.5, -s * 0.7, s * 0.55, -s * 1.2);
            ctx.closePath();
            ctx.fill();
            
            // Skull emblem on sail
            ctx.fillStyle = '#112233';
            ctx.beginPath();
            ctx.arc(0, -s * 0.75, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#48f';
            ctx.beginPath();
            ctx.arc(-2, -s * 0.77, 1.5, 0, Math.PI * 2);
            ctx.arc(2, -s * 0.77, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Small flag on top
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.moveTo(0, -s * 1.5);
            ctx.lineTo(s * 0.3, -s * 1.4 + sailWave * 3);
            ctx.lineTo(0, -s * 1.3);
            ctx.fill();
        }
        else if (this.type === ENEMY_TYPES.CAPTAIN) {
            // ===== DREAD GALLEON - Skull-shaped flagship =====
            const baseColor = this.hp === 1 ? '#aa3333' : '#662222';
            
            // Ghostly engine flames
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#f44';
            ctx.fillStyle = '#f44';
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.ellipse(i * s * 0.4, s + 5, 4, 8 + Math.random() * 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            
            // Main hull - dark crimson wood
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(0, s);
            ctx.lineTo(-s * 0.9, s * 0.5);
            ctx.lineTo(-s, -s * 0.2);
            ctx.lineTo(-s * 0.7, -s * 0.6);
            ctx.lineTo(s * 0.7, -s * 0.6);
            ctx.lineTo(s, -s * 0.2);
            ctx.lineTo(s * 0.9, s * 0.5);
            ctx.closePath();
            ctx.fill();
            
            // Deck planks
            ctx.strokeStyle = '#441111';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = -0.6; i <= 0.6; i += 0.3) {
                ctx.moveTo(i * s, -s * 0.5);
                ctx.lineTo(i * s * 1.2, s * 0.3);
            }
            ctx.stroke();
            
            // Skull bow (front of ship)
            ctx.fillStyle = '#ddccbb';
            ctx.beginPath();
            ctx.arc(0, -s * 0.3, s * 0.5, 0, Math.PI * 2);  // Skull head
            ctx.fill();
            
            // Skull jaw
            ctx.beginPath();
            ctx.arc(0, -s * 0.1, s * 0.35, 0, Math.PI);
            ctx.fill();
            
            // Glowing eye sockets
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(-s * 0.18, -s * 0.4, 5, 6, 0, 0, Math.PI * 2);
            ctx.ellipse(s * 0.18, -s * 0.4, 5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Glowing red eyes
            ctx.fillStyle = '#f00';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#f00';
            ctx.beginPath();
            ctx.arc(-s * 0.18, -s * 0.4, 3, 0, Math.PI * 2);
            ctx.arc(s * 0.18, -s * 0.4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Skull nose hole
            ctx.fillStyle = '#554433';
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.25);
            ctx.lineTo(-3, -s * 0.15);
            ctx.lineTo(3, -s * 0.15);
            ctx.closePath();
            ctx.fill();
            
            // Teeth
            ctx.fillStyle = '#eee';
            for (let i = -2; i <= 2; i++) {
                ctx.fillRect(i * 5 - 2, -s * 0.05, 4, 6);
            }
            
            // Main mast (taller)
            ctx.strokeStyle = '#331111';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.6);
            ctx.lineTo(0, -s * 1.8);
            ctx.stroke();
            
            // Crossbars
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-s * 0.7, -s * 1.5);
            ctx.lineTo(s * 0.7, -s * 1.5);
            ctx.moveTo(-s * 0.5, -s * 1.2);
            ctx.lineTo(s * 0.5, -s * 1.2);
            ctx.stroke();
            
            // Large tattered crimson sails
            ctx.fillStyle = '#881122';
            ctx.beginPath();
            ctx.moveTo(-s * 0.65, -s * 1.5);
            ctx.quadraticCurveTo(-s * 0.4 + sailWave * s, -s * 1.1, -s * 0.45, -s * 0.7);
            ctx.lineTo(-s * 0.25, -s * 0.75);  // Tatter
            ctx.lineTo(0, -s * 0.6);
            ctx.lineTo(s * 0.25, -s * 0.75);   // Tatter
            ctx.lineTo(s * 0.45, -s * 0.7);
            ctx.quadraticCurveTo(s * 0.4 + sailWave * s, -s * 1.1, s * 0.65, -s * 1.5);
            ctx.closePath();
            ctx.fill();
            
            // Crossed cannons on sail (like crossbones)
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, -s * 0.9);
            ctx.lineTo(s * 0.3, -s * 1.3);
            ctx.moveTo(s * 0.3, -s * 0.9);
            ctx.lineTo(-s * 0.3, -s * 1.3);
            ctx.stroke();
            
            // Jolly Roger flag on top
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.moveTo(0, -s * 1.8);
            ctx.lineTo(s * 0.4, -s * 1.65 + sailWave * 5);
            ctx.lineTo(s * 0.35, -s * 1.5 + sailWave * 4);
            ctx.lineTo(0, -s * 1.55);
            ctx.fill();
            
            // Tiny skull on flag
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s * 0.18, -s * 1.6 + sailWave * 4, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Side cannons
            ctx.fillStyle = '#222';
            ctx.fillRect(-s - 6, 0, 10, 5);
            ctx.fillRect(s - 4, 0, 10, 5);
            ctx.fillRect(-s - 5, s * 0.3, 8, 4);
            ctx.fillRect(s - 3, s * 0.3, 8, 4);
        }
        
        ctx.restore();
    }
    
    hit(damage = 1) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.alive = false;
            return true;  // Killed
        }
        return false;  // Damaged but alive
    }
}

// Boss class
class Boss {
    constructor(level) {
        const config = LEVELS[level];
        this.name = config.bossName;
        this.maxHP = config.bossHP;
        this.hp = this.maxHP;
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = -100;
        this.targetY = 120;
        this.width = 120;
        this.height = 80;
        this.phase = 1;
        this.attackTimer = 0;
        this.moveTimer = 0;
        this.moveDir = 1;
        this.color = config.color;
        this.entering = true;
        
        // Boss-specific attacks
        this.spreadTimer = 0;
        this.laserTimer = 0;
        this.minionTimer = 0;
    }
    
    update(dt) {
        if (this.entering) {
            this.y += 100 * dt;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.entering = false;
            }
            return;
        }
        
        // Movement
        this.moveTimer += dt;
        this.x += Math.sin(this.moveTimer) * 100 * dt * this.moveDir;
        this.x = Math.max(this.width / 2 + 20, Math.min(CONFIG.CANVAS_WIDTH - this.width / 2 - 20, this.x));
        
        // Attacks based on phase
        this.attackTimer += dt;
        this.spreadTimer += dt;
        this.laserTimer += dt;
        
        // Spread shot
        if (this.spreadTimer > (4 - this.phase * 0.5)) {
            this.spreadTimer = 0;
            this.spreadShot();
        }
        
        // Aimed shot
        if (this.attackTimer > (2 - this.phase * 0.3)) {
            this.attackTimer = 0;
            this.aimShot();
        }
        
        // Spawn minions in later phases
        if (this.phase >= 2) {
            this.minionTimer += dt;
            if (this.minionTimer > 5) {
                this.minionTimer = 0;
                this.spawnMinion();
            }
        }
        
        // Update phase based on HP
        const hpPercent = this.hp / this.maxHP;
        if (hpPercent < 0.33) this.phase = 3;
        else if (hpPercent < 0.66) this.phase = 2;
    }
    
    spreadShot() {
        const bulletSpeed = 200 + this.phase * 30;
        const count = 5 + this.phase * 2;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI / count) * i + Math.PI / 2 - Math.PI / (count * 2) * (count - 1) / 2;
            enemyBullets.push({
                x: this.x,
                y: this.y + this.height / 2,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                radius: 6
            });
        }
        Audio.shoot();
    }
    
    aimShot() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 280 + this.phase * 20;
        
        for (let i = -1; i <= 1; i++) {
            const angle = Math.atan2(dy, dx) + i * 0.2;
            enemyBullets.push({
                x: this.x,
                y: this.y + this.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 5
            });
        }
    }
    
    spawnMinion() {
        const type = Math.random() < 0.3 ? ENEMY_TYPES.RAIDER : ENEMY_TYPES.SCOUT;
        const side = Math.random() < 0.5 ? -1 : 1;
        const e = new Enemy(0, 0, type, this.x + side * 80, this.y + 50);
        e.state = 'formation';
        e.y = this.y + 50;
        e.diveTimer = 1;
        enemies.push(e);
    }
    
    hit(damage, x, y) {
        // Check if hit is on boss body
        const dx = x - this.x;
        const dy = y - this.y;
        if (Math.abs(dx) < this.width / 2 && Math.abs(dy) < this.height / 2) {
            this.hp -= damage;
            Particles.explode(x, y, this.color, 8);
            Audio.bossHit();
            return true;
        }
        return false;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const time = Date.now() * 0.002;
        const sailWave = Math.sin(time) * 0.2;
        const w = this.width;
        const h = this.height;
        
        // ===== EPIC PIRATE DREADNOUGHT =====
        
        // Massive engine flames (ghostly green/red based on phase)
        const flameColor = this.phase === 3 ? '#f00' : this.phase === 2 ? '#f80' : '#0f0';
        ctx.shadowBlur = 20;
        ctx.shadowColor = flameColor;
        ctx.fillStyle = flameColor;
        for (let i = -2; i <= 2; i++) {
            const flicker = Math.random() * 0.4 + 0.6;
            ctx.globalAlpha = flicker;
            ctx.beginPath();
            ctx.ellipse(i * w * 0.15, h / 2 + 15, 8, 18 + Math.random() * 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        
        // Main hull - dark weathered wood
        ctx.fillStyle = '#332211';
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 3);
        ctx.lineTo(-w / 2 + 10, -h / 3);
        ctx.lineTo(-w / 3, -h / 2);
        ctx.lineTo(w / 3, -h / 2);
        ctx.lineTo(w / 2 - 10, -h / 3);
        ctx.lineTo(w / 2, h / 3);
        ctx.lineTo(w / 3, h / 2);
        ctx.lineTo(-w / 3, h / 2);
        ctx.closePath();
        ctx.fill();
        
        // Hull planks
        ctx.strokeStyle = '#221100';
        ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * w / 8, -h / 2 + 10);
            ctx.lineTo(i * w / 7, h / 2 - 5);
            ctx.stroke();
        }
        
        // Gold trim
        ctx.strokeStyle = '#aa8833';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 3);
        ctx.lineTo(-w / 2 + 10, -h / 3);
        ctx.lineTo(-w / 3, -h / 2);
        ctx.lineTo(w / 3, -h / 2);
        ctx.lineTo(w / 2 - 10, -h / 3);
        ctx.lineTo(w / 2, h / 3);
        ctx.stroke();
        
        // Giant skull figurehead at bow
        ctx.fillStyle = '#ccbbaa';
        ctx.beginPath();
        ctx.arc(0, -h / 2 - 15, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Skull jaw
        ctx.beginPath();
        ctx.arc(0, -h / 2 - 5, 18, 0, Math.PI);
        ctx.fill();
        
        // Glowing eye sockets - intensity based on phase
        const eyeGlow = this.phase === 3 ? '#f00' : this.phase === 2 ? '#f80' : '#ff0';
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-10, -h / 2 - 20, 7, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -h / 2 - 20, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = eyeGlow;
        ctx.shadowBlur = 15 + this.phase * 5;
        ctx.shadowColor = eyeGlow;
        ctx.beginPath();
        ctx.arc(-10, -h / 2 - 20, 4, 0, Math.PI * 2);
        ctx.arc(10, -h / 2 - 20, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Skull nose
        ctx.fillStyle = '#443322';
        ctx.beginPath();
        ctx.moveTo(0, -h / 2 - 12);
        ctx.lineTo(-5, -h / 2 - 5);
        ctx.lineTo(5, -h / 2 - 5);
        ctx.closePath();
        ctx.fill();
        
        // Skull teeth
        ctx.fillStyle = '#eee';
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(i * 5 - 2, -h / 2 + 2, 4, 8);
        }
        
        // Three masts
        ctx.strokeStyle = '#221100';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-w / 3, -h / 4);
        ctx.lineTo(-w / 3, -h - 40);
        ctx.moveTo(0, -h / 4);
        ctx.lineTo(0, -h - 60);  // Taller center mast
        ctx.moveTo(w / 3, -h / 4);
        ctx.lineTo(w / 3, -h - 40);
        ctx.stroke();
        
        // Crossbars
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Left mast
        ctx.moveTo(-w / 3 - 25, -h - 20);
        ctx.lineTo(-w / 3 + 25, -h - 20);
        // Center mast (two crossbars)
        ctx.moveTo(-35, -h - 35);
        ctx.lineTo(35, -h - 35);
        ctx.moveTo(-25, -h - 10);
        ctx.lineTo(25, -h - 10);
        // Right mast
        ctx.moveTo(w / 3 - 25, -h - 20);
        ctx.lineTo(w / 3 + 25, -h - 20);
        ctx.stroke();
        
        // Massive tattered sails (color based on phase)
        const sailColor = this.phase === 3 ? '#440000' : this.phase === 2 ? '#442200' : '#111';
        ctx.fillStyle = sailColor;
        
        // Left sail
        ctx.beginPath();
        ctx.moveTo(-w / 3 - 22, -h - 20);
        ctx.quadraticCurveTo(-w / 3 - 15 + sailWave * 20, -h / 2, -w / 3 - 18, -h / 4);
        ctx.lineTo(-w / 3 - 8, -h / 4 - 5);
        ctx.lineTo(-w / 3, -h / 4);
        ctx.lineTo(-w / 3 + 8, -h / 4 - 5);
        ctx.lineTo(-w / 3 + 18, -h / 4);
        ctx.quadraticCurveTo(-w / 3 + 15 + sailWave * 20, -h / 2, -w / 3 + 22, -h - 20);
        ctx.closePath();
        ctx.fill();
        
        // Center sail (largest)
        ctx.beginPath();
        ctx.moveTo(-32, -h - 35);
        ctx.quadraticCurveTo(-20 + sailWave * 25, -h / 2 - 10, -28, -h / 4);
        ctx.lineTo(-15, -h / 4 - 8);
        ctx.lineTo(0, -h / 4);
        ctx.lineTo(15, -h / 4 - 8);
        ctx.lineTo(28, -h / 4);
        ctx.quadraticCurveTo(20 + sailWave * 25, -h / 2 - 10, 32, -h - 35);
        ctx.closePath();
        ctx.fill();
        
        // Right sail
        ctx.beginPath();
        ctx.moveTo(w / 3 - 22, -h - 20);
        ctx.quadraticCurveTo(w / 3 - 15 + sailWave * 20, -h / 2, w / 3 - 18, -h / 4);
        ctx.lineTo(w / 3 - 8, -h / 4 - 5);
        ctx.lineTo(w / 3, -h / 4);
        ctx.lineTo(w / 3 + 8, -h / 4 - 5);
        ctx.lineTo(w / 3 + 18, -h / 4);
        ctx.quadraticCurveTo(w / 3 + 15 + sailWave * 20, -h / 2, w / 3 + 22, -h - 20);
        ctx.closePath();
        ctx.fill();
        
        // Skull & crossbones on center sail
        ctx.fillStyle = '#aa8833';
        ctx.beginPath();
        ctx.arc(0, -h / 2 - 15, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-4, -h / 2 - 17, 3, 0, Math.PI * 2);
        ctx.arc(4, -h / 2 - 17, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Crossed swords on sail
        ctx.strokeStyle = '#aa8833';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-15, -h / 2);
        ctx.lineTo(15, -h / 2 - 30);
        ctx.moveTo(15, -h / 2);
        ctx.lineTo(-15, -h / 2 - 30);
        ctx.stroke();
        
        // Cannons along sides (more cannons in later phases)
        const cannonCount = 2 + this.phase;
        ctx.fillStyle = '#222';
        for (let i = 0; i < cannonCount; i++) {
            const cannonY = -h / 3 + (i * h / (cannonCount + 1));
            // Left side cannons
            ctx.fillRect(-w / 2 - 8, cannonY - 3, 12, 6);
            // Right side cannons  
            ctx.fillRect(w / 2 - 4, cannonY - 3, 12, 6);
        }
        
        // Glowing cannon muzzles
        ctx.fillStyle = '#f80';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#f80';
        for (let i = 0; i < cannonCount; i++) {
            const cannonY = -h / 3 + (i * h / (cannonCount + 1));
            ctx.beginPath();
            ctx.arc(-w / 2 - 8, cannonY, 3, 0, Math.PI * 2);
            ctx.arc(w / 2 + 8, cannonY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Jolly Roger flags on each mast
        ctx.fillStyle = '#000';
        for (const mastX of [-w / 3, 0, w / 3]) {
            const flagY = mastX === 0 ? -h - 60 : -h - 40;
            ctx.beginPath();
            ctx.moveTo(mastX, flagY);
            ctx.lineTo(mastX + 20, flagY + 8 + sailWave * 8);
            ctx.lineTo(mastX + 18, flagY + 20 + sailWave * 6);
            ctx.lineTo(mastX, flagY + 15);
            ctx.fill();
            
            // Tiny skull on flag
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mastX + 10, flagY + 12 + sailWave * 7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
        }
        
        // Phase indicator - hull damage/fire
        if (this.phase >= 2) {
            ctx.fillStyle = '#f40';
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < this.phase; i++) {
                ctx.beginPath();
                ctx.arc(
                    (Math.random() - 0.5) * w * 0.6,
                    (Math.random() - 0.5) * h * 0.4,
                    5 + Math.random() * 5,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
        
        // Health bar
        UI.removeClass('bossHealthContainer', 'hidden');
        UI.setText('bossName', this.name);
        document.getElementById('bossHealthFill').style.width = (this.hp / this.maxHP * 100) + '%';
    }
}

// ==================== FINAL BOSS - THE BLACK MARAUDER ====================
// Massive pirate galleon with destroyable cannons

class FinalBoss {
    constructor() {
        this.name = "THE BLACK MARAUDER";
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = -200;
        this.targetY = 80;
        this.width = 500;  // Huge ship
        this.height = 180;
        this.entering = true;
        this.moveDir = 1;
        this.moveSpeed = 40;
        
        // Ship HP (only damageable after all cannons destroyed)
        this.maxHP = 800;
        this.hp = this.maxHP;
        this.vulnerable = false;
        
        // Cannons - 8 cannons along the bottom of the ship
        this.cannons = [];
        const cannonCount = 8;
        for (let i = 0; i < cannonCount; i++) {
            this.cannons.push({
                xOffset: -this.width/2 + 50 + (i * (this.width - 100) / (cannonCount - 1)),
                yOffset: this.height / 2 - 10,
                hp: 30,
                maxHP: 30,
                alive: true,
                fireTimer: Math.random() * 2,
                fireRate: 1.5 + Math.random() * 1,  // Staggered firing
                width: 30,
                height: 25
            });
        }
        
        this.minionTimer = 0;
        this.color = '#ff00ff';
    }
    
    update(dt) {
        if (this.entering) {
            this.y += 60 * dt;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.entering = false;
            }
            return;
        }
        
        // Slow side-to-side movement
        this.x += this.moveSpeed * this.moveDir * dt;
        
        // Bounce off edges
        const leftEdge = this.width / 2 + 20;
        const rightEdge = CONFIG.CANVAS_WIDTH - this.width / 2 - 20;
        if (this.x <= leftEdge) {
            this.x = leftEdge;
            this.moveDir = 1;
        } else if (this.x >= rightEdge) {
            this.x = rightEdge;
            this.moveDir = -1;
        }
        
        // Update cannons
        this.cannons.forEach((cannon, index) => {
            if (!cannon.alive) return;
            
            cannon.fireTimer += dt;
            if (cannon.fireTimer >= cannon.fireRate) {
                cannon.fireTimer = 0;
                this.fireCannon(cannon, index);
            }
        });
        
        // Check if all cannons destroyed
        const cannonsAlive = this.cannons.filter(c => c.alive).length;
        if (cannonsAlive === 0 && !this.vulnerable) {
            this.vulnerable = true;
            // Big announcement
            Audio.bossHit();
            Particles.explodeMulti(this.x, this.y, ['#ff0', '#f80', '#f00'], 40);
        }
        
        // Spawn minions occasionally when vulnerable
        if (this.vulnerable) {
            this.minionTimer += dt;
            if (this.minionTimer > 4) {
                this.minionTimer = 0;
                this.spawnMinion();
            }
        }
    }
    
    fireCannon(cannon, index) {
        const cannonX = this.x + cannon.xOffset;
        const cannonY = this.y + cannon.yOffset;
        
        // Play cannon sound effect
        const cannonSound = Math.floor(Math.random() * 3) + 1;
        Audio.playSFX(Audio.paths.sfx + `cannon${cannonSound}.mp3`);
        
        // Aimed shot at player
        const dx = player.x - cannonX;
        const dy = player.y - cannonY;
        const angle = Math.atan2(dy, dx);
        const speed = 220;
        
        // Fire a big cannonball
        enemyBullets.push({
            x: cannonX,
            y: cannonY + 15,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 8,
            isCannon: true
        });
        
        // Muzzle flash particles
        Particles.explode(cannonX, cannonY + 20, '#ff8800', 6);
    }
    
    spawnMinion() {
        const type = ENEMY_TYPES.SCOUT;
        const side = Math.random() < 0.5 ? -1 : 1;
        const e = new Enemy(0, 0, type, this.x + side * 150, this.y + 100);
        e.state = 'formation';
        e.y = this.y + 100;
        e.diveTimer = 0.5;
        enemies.push(e);
    }
    
    hit(damage, x, y) {
        // First check if hitting a cannon
        for (let i = 0; i < this.cannons.length; i++) {
            const cannon = this.cannons[i];
            if (!cannon.alive) continue;
            
            const cannonX = this.x + cannon.xOffset;
            const cannonY = this.y + cannon.yOffset;
            
            if (Math.abs(x - cannonX) < cannon.width/2 && Math.abs(y - cannonY) < cannon.height/2) {
                cannon.hp -= damage;
                Particles.explode(x, y, '#ff8800', 8);
                Audio.bossHit();
                
                if (cannon.hp <= 0) {
                    cannon.alive = false;
                    // Big explosion for cannon destruction
                    Audio.explode();
                    Particles.explodeMulti(cannonX, cannonY, ['#ff4400', '#ff8800', '#ffcc00'], 25);
                    ScreenShake.add(10);
                }
                return true;
            }
        }
        
        // If all cannons destroyed, can damage hull
        if (this.vulnerable) {
            const dx = x - this.x;
            const dy = y - this.y;
            if (Math.abs(dx) < this.width / 2 && Math.abs(dy) < this.height / 2) {
                this.hp -= damage;
                Particles.explode(x, y, this.color, 8);
                Audio.bossHit();
                return true;
            }
        }
        
        return false;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const w = this.width;
        const h = this.height;
        const time = Date.now() * 0.001;
        
        // ===== THE BLACK MARAUDER - MASSIVE PIRATE GALLEON =====
        
        // Ghostly purple engine glow (multiple large engines)
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#f0f';
        for (let i = -3; i <= 3; i++) {
            const flicker = 0.6 + Math.random() * 0.4;
            ctx.fillStyle = `rgba(255, 0, 255, ${flicker * 0.8})`;
            ctx.beginPath();
            ctx.ellipse(i * 50, h/2 + 20, 15, 25 + Math.random() * 15, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Main hull - dark black wood
        ctx.fillStyle = '#1a0a0a';
        ctx.beginPath();
        ctx.moveTo(-w/2, h/3);
        ctx.lineTo(-w/2 + 30, -h/3);
        ctx.lineTo(-w/3, -h/2 + 10);
        ctx.lineTo(w/3, -h/2 + 10);
        ctx.lineTo(w/2 - 30, -h/3);
        ctx.lineTo(w/2, h/3);
        ctx.quadraticCurveTo(w/2 - 20, h/2, 0, h/2 + 10);
        ctx.quadraticCurveTo(-w/2 + 20, h/2, -w/2, h/3);
        ctx.fill();
        
        // Hull trim - gold
        ctx.strokeStyle = '#cc9900';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Deck planks
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 2;
        for (let i = -4; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 40, -h/3);
            ctx.lineTo(i * 35, h/3);
            ctx.stroke();
        }
        
        // Giant skull figurehead at bow
        ctx.fillStyle = '#ddccbb';
        ctx.beginPath();
        ctx.ellipse(0, -h/2 - 30, 40, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Skull eye sockets
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(-15, -h/2 - 35, 12, 15, 0, 0, Math.PI * 2);
        ctx.ellipse(15, -h/2 - 35, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing eyes (red when invulnerable, green when vulnerable)
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.vulnerable ? '#0f0' : '#f00';
        ctx.fillStyle = this.vulnerable ? '#0f0' : '#f00';
        ctx.beginPath();
        ctx.arc(-15, -h/2 - 35, 6, 0, Math.PI * 2);
        ctx.arc(15, -h/2 - 35, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Skull nose
        ctx.fillStyle = '#443322';
        ctx.beginPath();
        ctx.moveTo(0, -h/2 - 25);
        ctx.lineTo(-5, -h/2 - 15);
        ctx.lineTo(5, -h/2 - 15);
        ctx.closePath();
        ctx.fill();
        
        // Skull teeth
        ctx.fillStyle = '#eee';
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(i * 8 - 3, -h/2 - 10, 6, 10);
        }
        
        // Three massive masts with tattered sails
        const sailWave = Math.sin(time * 2) * 0.15;
        
        [-150, 0, 150].forEach((mastX, idx) => {
            // Mast
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(mastX - 6, -h - 80 - idx * 20, 12, h + 60);
            
            // Crossbar
            ctx.fillRect(mastX - 50, -h - 40 - idx * 20, 100, 8);
            
            // Tattered sail
            ctx.fillStyle = '#220000';
            ctx.beginPath();
            ctx.moveTo(mastX - 45, -h - 35 - idx * 20);
            ctx.quadraticCurveTo(mastX - 40 + sailWave * 30, -h/2 - 20, mastX - 35, -h/4);
            // Tattered edge
            ctx.lineTo(mastX - 25, -h/4 - 10);
            ctx.lineTo(mastX - 15, -h/4 + 5);
            ctx.lineTo(mastX, -h/4 - 8);
            ctx.lineTo(mastX + 15, -h/4 + 3);
            ctx.lineTo(mastX + 25, -h/4 - 5);
            ctx.lineTo(mastX + 35, -h/4);
            ctx.quadraticCurveTo(mastX + 40 + sailWave * 30, -h/2 - 20, mastX + 45, -h - 35 - idx * 20);
            ctx.closePath();
            ctx.fill();
            
            // Skull emblem on center sail
            if (idx === 1) {
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(mastX, -h/2 - 10, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#220000';
                ctx.beginPath();
                ctx.arc(mastX - 5, -h/2 - 12, 4, 0, Math.PI * 2);
                ctx.arc(mastX + 5, -h/2 - 12, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Jolly Roger flag on top
            ctx.fillStyle = '#000';
            ctx.fillRect(mastX + 8, -h - 75 - idx * 20, 25, 18);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(mastX + 20, -h - 68 - idx * 20, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw cannons
        this.cannons.forEach((cannon, i) => {
            if (!cannon.alive) {
                // Destroyed cannon - smoking wreck
                ctx.fillStyle = '#333';
                ctx.fillRect(cannon.xOffset - 10, cannon.yOffset - 8, 20, 16);
                // Smoke
                ctx.fillStyle = `rgba(100, 100, 100, ${0.3 + Math.random() * 0.3})`;
                ctx.beginPath();
                ctx.arc(cannon.xOffset, cannon.yOffset - 15 - Math.random() * 10, 8 + Math.random() * 5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Active cannon
                ctx.fillStyle = '#444';
                ctx.fillRect(cannon.xOffset - 15, cannon.yOffset - 12, 30, 24);
                
                // Cannon barrel
                ctx.fillStyle = '#222';
                ctx.fillRect(cannon.xOffset - 8, cannon.yOffset, 16, 20);
                
                // Gold trim
                ctx.strokeStyle = '#aa8800';
                ctx.lineWidth = 2;
                ctx.strokeRect(cannon.xOffset - 15, cannon.yOffset - 12, 30, 24);
                
                // Cannon health indicator (glow based on damage)
                const healthPercent = cannon.hp / cannon.maxHP;
                if (healthPercent < 1) {
                    ctx.fillStyle = `rgba(255, ${Math.floor(healthPercent * 200)}, 0, 0.5)`;
                    ctx.beginPath();
                    ctx.arc(cannon.xOffset, cannon.yOffset, 12, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
        
        // Hull damage effects when vulnerable
        if (this.vulnerable) {
            const damagePercent = 1 - (this.hp / this.maxHP);
            const fireCount = Math.floor(damagePercent * 10) + 2;
            
            ctx.globalAlpha = 0.7;
            for (let i = 0; i < fireCount; i++) {
                const fx = (Math.random() - 0.5) * w * 0.8;
                const fy = (Math.random() - 0.5) * h * 0.5;
                ctx.fillStyle = Math.random() > 0.5 ? '#f80' : '#f40';
                ctx.beginPath();
                ctx.arc(fx, fy, 8 + Math.random() * 12, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
        
        // Health bar - show cannons remaining or hull HP
        UI.removeClass('bossHealthContainer', 'hidden');
        const cannonsAlive = this.cannons.filter(c => c.alive).length;
        if (!this.vulnerable) {
            UI.setText('bossName', `${this.name} - DESTROY CANNONS (${cannonsAlive}/8)`);
            document.getElementById('bossHealthFill').style.width = (cannonsAlive / 8 * 100) + '%';
        } else {
            UI.setText('bossName', `${this.name} - HULL EXPOSED`);
            document.getElementById('bossHealthFill').style.width = (this.hp / this.maxHP * 100) + '%';
        }
    }
}

// Loot class
class SpaceLoot {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;  // 'material' or 'cargo'
        this.radius = type === 'cargo' ? 14 : 10;
        this.value = type === 'cargo' ? 1 : Math.floor(Math.random() * 2) + 1;
        this.vy = 40;
        this.pulse = Math.random() * Math.PI * 2;
    }
    
    update(dt) {
        this.y += this.vy * dt;
        this.pulse += dt * 5;
    }
    
    attractTo(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
            const force = (200 - dist) / 200 * 400;
            this.x += (dx / dist) * force * dt;
            this.y += (dy / dist) * force * dt;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const glow = Math.sin(this.pulse) * 0.3 + 0.7;
        
        if (this.type === 'cargo') {
            // Cargo crate
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0';
            ctx.fillStyle = `rgba(255, 255, 0, ${glow})`;
            ctx.fillRect(-10, -10, 20, 20);
            ctx.strokeStyle = '#880';
            ctx.lineWidth = 2;
            ctx.strokeRect(-10, -10, 20, 20);
            ctx.strokeRect(-5, -10, 10, 20);
        } else {
            // Material crystal
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#4f4';
            ctx.fillStyle = `rgba(68, 255, 68, ${glow})`;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.6, 0);
            ctx.lineTo(0, this.radius);
            ctx.lineTo(-this.radius * 0.6, 0);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Powerup class
class SpacePowerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 18;
        this.vy = 50;
        this.angle = 0;
    }
    
    update(dt) {
        this.y += this.vy * dt;
        this.angle += dt * 2;
    }
    
    attractTo(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
            const force = (150 - dist) / 150 * 300;
            this.x += (dx / dist) * force * dt;
            this.y += (dy / dist) * force * dt;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.type.color;
        
        // Background circle
        ctx.fillStyle = this.type.color + '44';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 0);
        
        ctx.restore();
    }
}

// ==================== HELPER FUNCTIONS ====================

function drawShip(ctx, x, y) {
    // Asteroid Run quality ship with red/magenta theme
    ctx.save();
    ctx.translate(x, y);
    
    // Engine flame
    const flicker = Math.random() * 0.4 + 0.6;
    const thrustLength = Input.isDown('up') ? 25 + Math.random() * 10 : 12 + Math.random() * 5;
    
    // Outer flame (red)
    ctx.fillStyle = `rgba(255, 0, 0, ${0.4 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(-8, 20);
    ctx.lineTo(0, 20 + thrustLength + 8);
    ctx.lineTo(8, 20);
    ctx.closePath();
    ctx.fill();
    
    // Middle flame (orange)
    ctx.fillStyle = `rgba(255, 136, 0, ${0.7 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(-5, 20);
    ctx.lineTo(0, 20 + thrustLength);
    ctx.lineTo(5, 20);
    ctx.closePath();
    ctx.fill();
    
    // Inner flame (yellow)
    ctx.fillStyle = `rgba(255, 255, 0, ${0.9 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(-3, 20);
    ctx.lineTo(0, 20 + thrustLength * 0.6);
    ctx.lineTo(3, 20);
    ctx.closePath();
    ctx.fill();
    
    // Hull glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f55';
    
    // Main body
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(15, 10);
    ctx.lineTo(10, 20);
    ctx.lineTo(-10, 20);
    ctx.lineTo(-15, 10);
    ctx.closePath();
    ctx.fill();
    
    // Wings
    ctx.fillStyle = '#c44';
    ctx.beginPath();
    ctx.moveTo(-15, 5);
    ctx.lineTo(-25, 18);
    ctx.lineTo(-10, 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15, 5);
    ctx.lineTo(25, 18);
    ctx.lineTo(10, 15);
    ctx.closePath();
    ctx.fill();
    
    // Engine pods
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.ellipse(-8, 18, 4, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(8, 18, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#f0f';
    ctx.shadowColor = '#f0f';
    ctx.beginPath();
    ctx.ellipse(0, -5, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
}

function spawnWave() {
    const level = LEVELS[currentLevel];
    
    // Galaga-style wide formation
    // More columns, fewer rows, spread across screen
    const totalEnemies = level.enemyCount;
    const cols = Math.min(10, Math.max(6, Math.ceil(totalEnemies / 3)));  // 6-10 columns wide
    const rows = Math.ceil(totalEnemies / cols);
    
    const spacing = 65;  // Wider horizontal spacing
    const rowSpacing = 50;  // Vertical spacing between rows
    const startX = (CONFIG.CANVAS_WIDTH - (cols - 1) * spacing) / 2;
    const startY = CONFIG.FORMATION_Y;
    
    enemies = [];
    let enemyCount = 0;
    
    for (let row = 0; row < rows && enemyCount < totalEnemies; row++) {
        // Vary columns per row for visual interest (like Galaga)
        const colsThisRow = row === 0 ? Math.min(cols - 2, totalEnemies - enemyCount) : 
                           row === 1 ? Math.min(cols, totalEnemies - enemyCount) :
                           Math.min(cols - 1, totalEnemies - enemyCount);
        const rowStartX = (CONFIG.CANVAS_WIDTH - (colsThisRow - 1) * spacing) / 2;
        
        for (let col = 0; col < colsThisRow && enemyCount < totalEnemies; col++) {
            let type;
            if (row === 0) {
                type = ENEMY_TYPES.CAPTAIN;  // Top row: Captains (bosses)
            } else if (row === 1) {
                type = ENEMY_TYPES.RAIDER;   // Second row: Raiders
            } else {
                type = ENEMY_TYPES.SCOUT;    // Bottom rows: Scouts
            }
            
            const formationX = rowStartX + col * spacing;
            const formationY = startY + row * rowSpacing;
            
            const e = new Enemy(col, row, type, formationX, formationY);
            // Stagger entry from sides
            e.enterProgress = -(row * 0.4 + Math.abs(col - colsThisRow/2) * 0.15);
            enemies.push(e);
            enemyCount++;
        }
    }
    
    waveEnemiesRemaining = enemies.length;
}

function spawnPowerup(x, y) {
    let rand = Math.random();
    for (const type of POWERUP_TYPES) {
        if (rand < type.chance) {
            powerups.push(new SpacePowerup(x, y, type));
            return;
        }
        rand -= type.chance;
    }
}

function addScore(points) {
    const multiplier = 1 + combo * 0.1;
    const earned = Math.floor(points * multiplier);
    totalScore += earned;
    sessionScore += earned;
}

function updateCombo(hit) {
    if (hit) {
        combo++;
        comboTimer = 2;
        if (combo > maxCombo) maxCombo = combo;
    } else {
        combo = 0;
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
            addScore(500);
        }
    } else if (type.id === 'triple') {
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
    
    enemies.forEach(e => {
        if (e.alive) {
            e.alive = false;
            Particles.explode(e.x, e.y, e.type.color, 10);
            addScore(e.type.points);
            sessionKills++;
            totalKills++;
            // Low drop rate from bomb kills
            if (Math.random() < 0.1) loots.push(new SpaceLoot(e.x, e.y, e.type.cargoDrop > 0 ? 'cargo' : 'material'));
        }
    });
    
    enemyBullets = [];
    
    if (boss && boss.hp > 0) {
        boss.hp -= 30;
        Particles.explode(boss.x, boss.y, '#ff4444', 30);
    }
}

function playerHit(damage) {
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
    ScreenShake.add(10);
    Particles.explode(player.x, player.y, '#ff4444', 15);
    updateCombo(false);
    
    if (player.health <= 0) {
        lives--;
        if (lives <= 0) {
            gameOver();
        } else {
            // Respawn
            player.health = CONFIG.MAX_HEALTH;
            player.x = CONFIG.CANVAS_WIDTH / 2;
            player.y = CONFIG.CANVAS_HEIGHT - 80;
            player.invuln = 3;
            updateLivesDisplay();
        }
    }
}

function updateLivesDisplay() {
    const hearts = '❤️'.repeat(Math.max(0, lives));
    UI.setText('livesDisplay', hearts);
}

function gameOver() {
    Engine.setState('gameOver');
    Audio.stopMusic(); if (Audio.stopAllVoices) Audio.stopAllVoices();
    Audio.playTrack('gameOver');  // Fixed: was 'game_over'
    Input.hideTouchControls();
    
    document.getElementById('gameOverStats').innerHTML = `
        <p>Score: ${totalScore.toLocaleString()}</p>
        <p>Cargo Secured: ${totalCargo}</p>
        <p>Pirates Destroyed: ${totalKills}</p>
    `;
    
    UI.hideAllScreens();
    UI.showScreen('gameOverScreen');
}

function victory() {
    Engine.setState('victory');
    Audio.stopMusic(); if (Audio.stopAllVoices) Audio.stopAllVoices();
    Audio.playTrack('victory');
    Input.hideTouchControls();
    
    document.getElementById('victoryStats').innerHTML = `
        <p>Final Score: ${totalScore.toLocaleString()}</p>
        <p>Total Cargo: ${totalCargo}</p>
        <p>Pirates Eliminated: ${totalKills}</p>
        <p>Max Combo: ${maxCombo}x</p>
    `;
    
    UI.hideAllScreens();
    UI.showScreen('victoryScreen');
}

function waveComplete() {
    currentWave++;
    
    const level = LEVELS[currentLevel];
    
    if (currentWave >= level.waves && !bossActive) {
        // Spawn boss - use FinalBoss for level 10 (index 9)
        bossActive = true;
        if (currentLevel === 9) {
            boss = new FinalBoss();
        } else {
            boss = new Boss(currentLevel);
        }
        Audio.playBossMusic();
        return;
    }
    
    if (!bossActive) {
        // Next wave
        spawnWave();
    }
}

function levelComplete() {
    Engine.setState('levelComplete');
    Audio.stopMusic(); if (Audio.stopAllVoices) Audio.stopAllVoices();
    
    document.getElementById('sectorClearedName').textContent = `${LEVELS[currentLevel].name} Cleared!`;
    document.getElementById('levelStats').innerHTML = `
        <p>Wave Score: ${sessionScore.toLocaleString()}</p>
        <p>Cargo Secured: ${sessionCargo}</p>
        <p>Pirates Destroyed: ${sessionKills}</p>
    `;
    
    UI.hideAllScreens();
    UI.addClass('bossHealthContainer', 'hidden');
    UI.showScreen('levelCompleteScreen');
}

function nextLevel() {
    currentLevel++;
    
    if (currentLevel >= LEVELS.length) {
        victory();
        return;
    }
    
    startLevel(LEVELS[currentLevel]);
}

function startLevel(level) {
    Engine.setState('playing');
    Input.showTouchControls();
    Input.setAltButtonLabel('BOMB');
    
    currentWave = 0;
    sessionScore = 0;
    sessionCargo = 0;
    sessionKills = 0;
    bossActive = false;
    boss = null;
    
    player.x = CONFIG.CANVAS_WIDTH / 2;
    player.y = CONFIG.CANVAS_HEIGHT - 80;
    player.health = CONFIG.MAX_HEALTH;
    player.invuln = 1;
    player.powerups = { shield: 0, rapid: 0, triple: 0, magnet: 0 };
    player.thrustTrail = [];
    
    bullets = [];
    enemies = [];
    enemyBullets = [];
    powerups = [];
    loots = [];
    explosions = [];
    
    StarField.init(80, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    spawnWave();
    
    UI.hideAllScreens();
    UI.addClass('bossHealthContainer', 'hidden');
    UI.setText('levelDisplay', `WAVE 1 - ${level.name}`);
    updateLivesDisplay();
    
    // Play level music
    if (currentLevel % 2 === 0) {
        Audio.playTrack('spacePirates');
    } else {
        Audio.playTrack('combat');
    }
}

function startGame() {
    // Clear any queued voices
    if (Audio.stopAllVoices) Audio.stopAllVoices();
    Audio.init();
    Audio.resume();
    
    currentLevel = 0;
    totalScore = 0;
    totalCargo = 0;
    totalKills = 0;
    maxCombo = 0;
    lives = 3;
    bombs = 3;
    
    startLevel(LEVELS[0]);
    Audio.voiceBegin();
}

// ==================== UPDATE & RENDER ====================

let lastFireTime = 0;

function update(dt) {
    // Skip game logic if not playing
    if (!Engine.isState('playing')) {
        Input.update();
        return;
    }
    
    const level = LEVELS[currentLevel];
    
    // Powerup timers
    ['shield', 'rapid', 'triple', 'magnet'].forEach(id => {
        if (player.powerups[id] > 0) {
            player.powerups[id] -= dt;
        }
    });
    
    // Invulnerability
    if (player.invuln > 0) player.invuln -= dt;
    
    // Combo timer
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) combo = 0;
    }
    
    // Player movement
    if (Input.isDown('left') && player.x > 30) {
        player.x -= CONFIG.PLAYER_SPEED * dt;
    }
    if (Input.isDown('right') && player.x < CONFIG.CANVAS_WIDTH - 30) {
        player.x += CONFIG.PLAYER_SPEED * dt;
    }
    if (Input.isDown('up') && player.y > CONFIG.CANVAS_HEIGHT * 0.4) {
        player.y -= CONFIG.PLAYER_SPEED * 0.7 * dt;
        // Thrust trail
        if (Math.random() < 0.5) {
            player.thrustTrail.push({
                x: player.x + (Math.random() - 0.5) * 10,
                y: player.y + 20,
                life: 0.3
            });
        }
    }
    if (Input.isDown('down') && player.y < CONFIG.CANVAS_HEIGHT - 50) {
        player.y += CONFIG.PLAYER_SPEED * 0.5 * dt;
    }
    
    // Thrust trail update
    player.thrustTrail = player.thrustTrail.filter(t => {
        t.life -= dt;
        t.y += 50 * dt;
        return t.life > 0;
    });
    
    // Firing
    const fireRate = player.powerups.rapid > 0 ? CONFIG.FIRE_RATE * 0.5 : CONFIG.FIRE_RATE;
    if (Input.isDown('fire') && Date.now() - lastFireTime > fireRate * 1000) {
        lastFireTime = Date.now();
        shotsFired++;
        Audio.shoot();
        
        if (player.powerups.triple > 0) {
            bullets.push({ x: player.x, y: player.y - 20, vy: -CONFIG.BULLET_SPEED, vx: 0 });
            bullets.push({ x: player.x - 15, y: player.y - 15, vy: -CONFIG.BULLET_SPEED, vx: -50 });
            bullets.push({ x: player.x + 15, y: player.y - 15, vy: -CONFIG.BULLET_SPEED, vx: 50 });
        } else {
            bullets.push({ x: player.x, y: player.y - 20, vy: -CONFIG.BULLET_SPEED, vx: 0 });
        }
    }
    
    // Bomb
    if (Input.wasPressed('bomb')) {
        useBomb();
    }
    
    // Update bullets
    bullets.forEach(b => {
        b.y += b.vy * dt;
        b.x += (b.vx || 0) * dt;
    });
    bullets = bullets.filter(b => b.y > -20 && b.y < CONFIG.CANVAS_HEIGHT + 20 && b.x > -20 && b.x < CONFIG.CANVAS_WIDTH + 20);
    
    // Update enemy bullets
    enemyBullets.forEach(b => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    });
    enemyBullets = enemyBullets.filter(b => b.y > -20 && b.y < CONFIG.CANVAS_HEIGHT + 50 && b.x > -50 && b.x < CONFIG.CANVAS_WIDTH + 50);
    
    // Update enemies
    enemies.forEach(e => e.update(dt));
    
    // Update powerups
    powerups.forEach(p => {
        p.update(dt);
        if (player.powerups.magnet > 0) p.attractTo(player.x, player.y, dt);
    });
    
    // Update loots
    loots.forEach(l => {
        l.update(dt);
        if (player.powerups.magnet > 0) l.attractTo(player.x, player.y, dt);
    });
    
    // Update boss (only if alive)
    if (boss && boss.hp > 0) boss.update(dt);
    
    // Particles
    Particles.update(dt);
    ScreenShake.update(dt);
    
    // Explosions
    explosions = explosions.filter(e => {
        e.radius += 2000 * dt;
        e.alpha -= dt * 2;
        return e.alpha > 0;
    });
    
    // Collision: Bullets vs Enemies
    bullets.forEach(b => {
        enemies.forEach(e => {
            if (e.alive && Collision.pointCircle(b.x, b.y, e.x, e.y, e.type.width / 2)) {
                b.y = -100;  // Mark for removal
                shotsHit++;
                Particles.explode(b.x, b.y, '#ffaa00', 5);
                
                if (e.hit(1)) {
                    // Killed
                    Audio.explode();
                    ScreenShake.add(5);
                    Particles.explode(e.x, e.y, e.type.color, 12);
                    addScore(e.type.points);
                    updateCombo(true);
                    sessionKills++;
                    totalKills++;
                    
                    // Drop loot - captains always drop, others rarely
                    if (e.type.cargoDrop > 0) {
                        loots.push(new SpaceLoot(e.x, e.y, 'cargo'));
                    } else if (Math.random() < 0.15) {  // 15% chance for scouts/raiders
                        loots.push(new SpaceLoot(e.x, e.y, 'material'));
                    }
                    
                    // Powerup chance: Captains 50%, Raiders 25%, Scouts 10%
                    const powerupChance = e.type === ENEMY_TYPES.CAPTAIN ? 0.5 :
                                         e.type === ENEMY_TYPES.RAIDER ? 0.25 : 0.1;
                    if (Math.random() < powerupChance) {
                        spawnPowerup(e.x, e.y);
                    }
                } else {
                    Audio.hit();
                }
            }
        });
        
        // Bullets vs Boss
        if (boss && boss.hp > 0) {
            if (boss.hit(3, b.x, b.y)) {
                b.y = -100;
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
                                by + (Math.random() - 0.5) * 100,
                                [boss.color, '#ff0', '#f80'],
                                15
                            );
                        }, i * 50);
                    }
                    
                    // Drop loot from boss
                    for (let i = 0; i < 5; i++) {
                        loots.push(new SpaceLoot(
                            bx + (Math.random() - 0.5) * 100,
                            by + (Math.random() - 0.5) * 80,
                            Math.random() < 0.4 ? 'cargo' : 'material'
                        ));
                    }
                    
                    addScore(LEVELS[currentLevel].bossHP * 10);
                    
                    setTimeout(levelComplete, 3000);
                }
            }
        }
    });
    
    // Collision: Enemy bullets vs Player
    enemyBullets.forEach(b => {
        if (Collision.circleCircle(player.x, player.y, 15, b.x, b.y, b.radius)) {
            b.y = CONFIG.CANVAS_HEIGHT + 100;
            playerHit(15);
        }
    });
    
    // Collision: Enemies vs Player
    enemies.forEach(e => {
        if (e.alive && e.state === 'diving') {
            if (Collision.circleCircle(player.x, player.y, 20, e.x, e.y, e.type.width / 2)) {
                e.alive = false;
                Particles.explode(e.x, e.y, e.type.color, 10);
                playerHit(30);
            }
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
            if (l.type === 'cargo') {
                totalCargo += l.value;
                sessionCargo += l.value;
                addScore(l.value * 100);
            } else {
                addScore(l.value * 25);
            }
            return false;
        }
        return l.y < CONFIG.CANVAS_HEIGHT + 50;
    });
    
    // Cleanup dead enemies
    const aliveCount = enemies.filter(e => e.alive).length;
    if (aliveCount === 0 && !bossActive && enemies.length > 0) {
        waveComplete();
    }
    
    // Update UI
    UI.setText('scoreDisplay', totalScore.toLocaleString());
    UI.setText('cargoDisplay', `📦 ${totalCargo}`);
    UI.setText('bombDisplay', `💣 x${infiniteBombs ? '∞' : bombs}`);
    UI.updateHealthBar('healthFill', (player.health / CONFIG.MAX_HEALTH) * 100);
    UI.setDanger('scoreDisplay', player.health < CONFIG.MAX_HEALTH * 0.25);
    
    // Wave progress
    const waveProgress = bossActive ? 100 : ((currentWave + 1) / LEVELS[currentLevel].waves) * 100;
    document.getElementById('waveFill').style.width = waveProgress + '%';
    UI.setText('levelDisplay', bossActive ? `BOSS - ${LEVELS[currentLevel].bossName}` : `WAVE ${currentWave + 1} - ${LEVELS[currentLevel].name}`);
    
    // Powerup slots
    ['shield', 'rapid', 'triple', 'magnet'].forEach(id => {
        const duration = POWERUP_TYPES.find(t => t.id === id).duration;
        UI.updatePowerupSlot('slot-' + id, player.powerups[id] > 0, (player.powerups[id] / duration) * 100);
    });
    
    Input.update();
}

function render(ctx) {
    ctx.save();
    ScreenShake.apply(ctx);
    
    // Clear
    ctx.fillStyle = '#050510';
    ctx.fillRect(-10, -10, CONFIG.CANVAS_WIDTH + 20, CONFIG.CANVAS_HEIGHT + 20);
    
    // Background
    StarField.draw(ctx);
    
    // Explosions (bomb effect)
    explosions.forEach(e => {
        const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${e.alpha})`);
        gradient.addColorStop(0.3, `rgba(255, 136, 0, ${e.alpha * 0.8})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    });
    
    // Loots
    loots.forEach(l => l.draw(ctx));
    
    // Powerups
    powerups.forEach(p => p.draw(ctx));
    
    // Enemies
    enemies.forEach(e => e.draw(ctx));
    
    // Boss
    if (boss && boss.hp > 0) boss.draw(ctx);
    
    // Enemy bullets - glowing cannonballs!
    enemyBullets.forEach(b => {
        // Outer fire glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f80';
        ctx.fillStyle = '#f80';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner hot core
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // White hot center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Player bullets
    ctx.fillStyle = '#f0f';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f0f';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    
    // Thrust trail
    player.thrustTrail.forEach(t => {
        const alpha = t.life / 0.3;
        ctx.fillStyle = `rgba(255,${Math.floor(100 + alpha * 100)},0,${alpha})`;
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
    
    // Combo display
    if (combo > 1) {
        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 20px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(`${combo}x COMBO`, CONFIG.CANVAS_WIDTH / 2, 80);
    }
    
    ctx.restore();
}

// ==================== INPUT CALLBACKS ====================

Input.onPause = function() {
    if (Engine.state === 'playing') {
        togglePause();
    }
};

Input.onQuit = function() {
    if (Engine.state === 'start') {
        window.location.href = '/KrakenArKade.html';
    } else if (Engine.state === 'paused' || Engine.state === 'levelComplete' || 
               Engine.state === 'gameOver' || Engine.state === 'victory') {
        Engine.setState('start');
        Audio.stopMusic(); if (Audio.stopAllVoices) Audio.stopAllVoices();
        UI.hideAllScreens();
        UI.addClass('bossHealthContainer', 'hidden');
        UI.showScreen('startScreen');
        Input.hideTouchControls();
    } else if (Engine.state === 'playing') {
        togglePause();
    }
};

Input.onSettings = function() {
    toggleSettings();
};

function togglePause() {
    if (Engine.state === 'playing') {
        Engine.setState('paused');
        UI.showScreen('pauseScreen');
        Input.hideTouchControls();
    } else if (Engine.state === 'paused') {
        Engine.setState('playing');
        UI.hideScreen('pauseScreen');
        Input.showTouchControls();
    }
}

function toggleSettings() {
    if (!settingsOpen) {
        stateBeforeSettings = Engine.state;
        settingsOpen = true;
        initSettingsControls();
        syncSettingsUI();
        UI.showScreen('settingsScreen');
    } else {
        settingsOpen = false;
        UI.hideScreen('settingsScreen');
    }
}

function syncSettingsUI() {
    if (!Audio.ctx) return;
    
    const musicVal = Math.round(Audio.musicGain.gain.value * 100);
    const sfxVal = Math.round(Audio.sfxGain.gain.value * 100);
    const voiceVal = Math.round(Audio.voiceGain.gain.value * 100);
    const synthVal = Math.round(Audio.synthGain.gain.value * 50);
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
    
    const collectVol = document.getElementById('collectVolume');
    const hitVol = document.getElementById('hitVolume');
    const explodeVol = document.getElementById('explodeVolume');
    const powerupVol = document.getElementById('powerupVolume');
    
    if (collectVol) { collectVol.value = Audio.volumes.collect * 100; document.getElementById('collectVolLabel').textContent = Math.round(Audio.volumes.collect * 100) + '%'; }
    if (hitVol) { hitVol.value = Audio.volumes.hit * 100; document.getElementById('hitVolLabel').textContent = Math.round(Audio.volumes.hit * 100) + '%'; }
    if (explodeVol) { explodeVol.value = Audio.volumes.explode * 100; document.getElementById('explodeVolLabel').textContent = Math.round(Audio.volumes.explode * 100) + '%'; }
    if (powerupVol) { powerupVol.value = Audio.volumes.powerup * 100; document.getElementById('powerupVolLabel').textContent = Math.round(Audio.volumes.powerup * 100) + '%'; }
    
    const godModeToggle = document.getElementById('godModeToggle');
    const infiniteBombsToggle = document.getElementById('infiniteBombsToggle');
    if (godModeToggle) godModeToggle.checked = godMode;
    if (infiniteBombsToggle) infiniteBombsToggle.checked = infiniteBombs;
}

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
            Audio.collect();
        });
    }
    
    if (collectVol) {
        collectVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setCollectVolume(val);
            document.getElementById('collectVolLabel').textContent = e.target.value + '%';
            Audio.collect();
        });
    }
    
    if (hitVol) {
        hitVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setHitVolume(val);
            document.getElementById('hitVolLabel').textContent = e.target.value + '%';
            Audio.hit();
        });
    }
    
    if (explodeVol) {
        explodeVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setExplodeVolume(val);
            document.getElementById('explodeVolLabel').textContent = e.target.value + '%';
            Audio.explode();
        });
    }
    
    if (powerupVol) {
        powerupVol.addEventListener('input', (e) => {
            const val = e.target.value / 100;
            Audio.setPowerupVolume(val);
            document.getElementById('powerupVolLabel').textContent = e.target.value + '%';
            Audio.powerup();
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

function warpToLevel(levelIndex) {
    currentLevel = levelIndex;
    toggleSettings();
    startLevel(LEVELS[levelIndex]);
    
    player.health = CONFIG.MAX_HEALTH;
    lives = 3;
    bombs = 5;
    updateLivesDisplay();
    
    console.log(`WARPED TO WAVE 1: ${LEVELS[levelIndex].name}`);
}

// ==================== INITIALIZATION ====================

// Initialize engine
Engine.init('gameCanvas', CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
Engine.onUpdate = update;
Engine.onRender = render;

// Initialize audio context early
Audio.init();

// Initialize input
Input.init();

// Button handlers
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('victoryBtn').addEventListener('click', startGame);
document.getElementById('nextLevelBtn').addEventListener('click', nextLevel);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('quitBtn')?.addEventListener('click', () => {
    Engine.setState('start');
    UI.hideAllScreens();
    UI.showScreen('startScreen');
});

// Start engine
Engine.setState('start');
Engine.start();

// Auto-resume audio context on user interaction
function unlockAudio() {
    Audio.init();
    if (Audio.ctx && Audio.ctx.state === 'suspended') {
        Audio.ctx.resume();
    }
}

window.addEventListener('keydown', unlockAudio);
window.addEventListener('mousedown', unlockAudio);
window.addEventListener('touchstart', unlockAudio);
window.addEventListener('click', unlockAudio);
