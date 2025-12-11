// ==================== KRAKEN'S TEMPEST ====================
// A Tempest-style arcade shooter with ocean horror theme
// For Kraken Arkade integration

// ==================== CONFIGURATION ====================
const CONFIG = {
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 900,
    CENTER_X: 450,
    CENTER_Y: 450,
    NUM_LANES: 16,
    OUTER_RADIUS: 400,
    INNER_RADIUS: 80,
    PLAYER_DEPTH: 0.98,
    
    // Player settings
    PLAYER_MOVE_SPEED: 12,      // Lanes per second - SMOOTH movement
    PLAYER_SHOOT_COOLDOWN: 0.12,
    PROJECTILE_SPEED: 2.8,
    INVINCIBLE_TIME: 2,
    
    // Enemy settings
    BASE_SPAWN_RATE: 1.8,
    SPAWN_RATE_DECREASE: 0.08,
    MIN_SPAWN_RATE: 0.4
};

// ==================== COLORS ====================
const COLORS = {
    abyssBlack: '#0a0a12',
    deepBlue: '#0d1b2a',
    krakenPurple: '#7b2cbf',
    electricCyan: '#00ffff',
    bioGreen: '#39ff14',
    warningOrange: '#ff6b35',
    plasmaPink: '#ff006e',
    goldGlow: '#ffd700',
    eelYellow: '#ffff00',
    jellyfishPink: '#ff69b4',
    crabRed: '#ff4444'
};

// ==================== GAME STATE ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'menu';  // 'menu', 'playing', 'paused', 'gameover'
let score = 0;
let lives = 3;
let wave = 1;
let gameTime = 0;

// Secret menu
let secretMenuOpen = false;
let godMode = false;

// Game objects
let player = null;
let enemies = [];
let projectiles = [];
let electricLanes = [];
let spikes = [];  // Sea urchin spike obstacles
let powerUps = [];  // Ink cloud, etc.
let inkCloudActive = 0;  // Timer for screen-clearing ink cloud
let superZapperCharges = 2;  // Player gets 2 per wave (like original Tempest)

// Wave management
let enemiesThisWave = 0;
let enemiesSpawned = 0;
let spawnTimer = 0;

// Tempest swirl animation
let swirlAngle = 0;

// ==================== UTILITY FUNCTIONS ====================
function getLaneAngle(lane) {
    return (lane / CONFIG.NUM_LANES) * Math.PI * 2 - Math.PI / 2;
}

function getPositionOnLane(lane, depth) {
    const angle = getLaneAngle(lane);
    const radius = CONFIG.INNER_RADIUS + (CONFIG.OUTER_RADIUS - CONFIG.INNER_RADIUS) * depth;
    return {
        x: CONFIG.CENTER_X + Math.cos(angle) * radius,
        y: CONFIG.CENTER_Y + Math.sin(angle) * radius
    };
}

function wrapLane(lane) {
    while (lane < 0) lane += CONFIG.NUM_LANES;
    while (lane >= CONFIG.NUM_LANES) lane -= CONFIG.NUM_LANES;
    return lane;
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// ==================== PLAYER ====================
function createPlayer() {
    return {
        lane: 0,
        targetLane: 0,
        shootCooldown: 0,
        invincible: 0,
        flash: false
    };
}

function updatePlayer(dt) {
    if (!player) return;

    // SMOOTH MOVEMENT - Arrow keys (classic arcade style)
    const moveLeft = Input.isDown('left') || touchState.left;
    const moveRight = Input.isDown('right') || touchState.right;

    if (moveLeft) {
        player.lane -= CONFIG.PLAYER_MOVE_SPEED * dt;
    }
    if (moveRight) {
        player.lane += CONFIG.PLAYER_MOVE_SPEED * dt;
    }

    // Wrap lane smoothly
    player.lane = wrapLane(player.lane);

    // Shooting - Space bar (classic arcade)
    const firing = Input.isDown('fire') || touchState.fire;

    player.shootCooldown -= dt;
    if (firing && player.shootCooldown <= 0) {
        fireProjectile();
        player.shootCooldown = CONFIG.PLAYER_SHOOT_COOLDOWN;
    }

    // Ink Cloud - Right Control (like missile in other games)
    if ((Input.isKeyDown('ControlRight') || touchState.inkCloud) && gameState === 'playing') {
        if (!player.inkCloudPressed) {
            player.inkCloudPressed = true;
            activateInkCloud();
        }
    } else {
        player.inkCloudPressed = false;
    }

    // Invincibility timer
    if (player.invincible > 0) {
        player.invincible -= dt;
        player.flash = Math.floor(player.invincible * 10) % 2 === 0;
    } else {
        player.flash = false;
    }
}

function drawPlayer() {
    if (!player || player.flash) return;

    const pos = getPositionOnLane(player.lane, CONFIG.PLAYER_DEPTH);
    const angle = getLaneAngle(player.lane);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle - Math.PI / 2);  // Face INWARD toward center

    // Glow effect
    ctx.shadowColor = COLORS.electricCyan;
    ctx.shadowBlur = 20;

    // Ship body - sleek arrowhead
    ctx.fillStyle = COLORS.electricCyan;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-15, 15);
    ctx.lineTo(-5, 8);
    ctx.lineTo(0, 12);
    ctx.lineTo(5, 8);
    ctx.lineTo(15, 15);
    ctx.closePath();
    ctx.fill();

    // Inner detail
    ctx.fillStyle = COLORS.abyssBlack;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-6, 8);
    ctx.lineTo(0, 5);
    ctx.lineTo(6, 8);
    ctx.closePath();
    ctx.fill();

    // Cockpit glow
    ctx.fillStyle = COLORS.bioGreen;
    ctx.shadowColor = COLORS.bioGreen;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ==================== PROJECTILES ====================
function fireProjectile() {
    const pos = getPositionOnLane(player.lane, CONFIG.PLAYER_DEPTH);
    projectiles.push({
        lane: player.lane,
        depth: CONFIG.PLAYER_DEPTH,
        speed: CONFIG.PROJECTILE_SPEED,
        type: 'player'
    });

    Audio.shoot();

    // Muzzle flash particles
    const angle = getLaneAngle(player.lane);
    for (let i = 0; i < 5; i++) {
        Particles.sparks(pos.x, pos.y, COLORS.electricCyan, 3);
    }
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        
        if (p.type === 'player') {
            p.depth -= p.speed * dt;
            if (p.depth <= 0) {
                projectiles.splice(i, 1);
                continue;
            }
        } else if (p.type === 'electric') {
            p.depth += p.speed * dt;
            if (p.depth >= CONFIG.PLAYER_DEPTH) {
                // Check if hits player
                if (Math.abs(wrapLaneDiff(p.lane, player.lane)) < 0.6 && player.invincible <= 0 && !godMode) {
                    playerHit();
                }
                // Electrify the lane
                electrifyLane(Math.round(p.lane), 3);
                projectiles.splice(i, 1);
                continue;
            }
        }

        // Check collisions with enemies (player projectiles only)
        if (p.type === 'player') {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const e = enemies[j];
                if (Math.abs(wrapLaneDiff(p.lane, e.lane)) < 0.6 && 
                    Math.abs(p.depth - e.depth) < 0.1) {
                    hitEnemy(j);
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
}

function wrapLaneDiff(lane1, lane2) {
    let diff = lane1 - lane2;
    if (diff > CONFIG.NUM_LANES / 2) diff -= CONFIG.NUM_LANES;
    if (diff < -CONFIG.NUM_LANES / 2) diff += CONFIG.NUM_LANES;
    return diff;
}

function drawProjectiles() {
    projectiles.forEach(p => {
        const pos = getPositionOnLane(p.lane, p.depth);
        
        ctx.save();
        if (p.type === 'player') {
            ctx.shadowColor = COLORS.electricCyan;
            ctx.shadowBlur = 15;
            ctx.fillStyle = COLORS.electricCyan;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Trail
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'electric') {
            ctx.shadowColor = COLORS.eelYellow;
            ctx.shadowBlur = 20;
            ctx.fillStyle = COLORS.eelYellow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 6 + Math.sin(gameTime * 20) * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Electric crackle effect
            ctx.strokeStyle = COLORS.eelYellow;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = Math.random() * Math.PI * 2;
                const len = randomRange(8, 15);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x + Math.cos(angle) * len, pos.y + Math.sin(angle) * len);
                ctx.stroke();
            }
        }
        ctx.restore();
    });
}

// ==================== ENEMIES ====================
const ENEMY_TYPES = {
    crab: {
        color: COLORS.crabRed,
        speed: 0.3,
        health: 1,
        points: 100,
        draw: drawCrab
    },
    eel: {
        color: COLORS.eelYellow,
        speed: 0.4,
        health: 2,
        points: 250,
        shootInterval: 2,
        draw: drawEel
    },
    jellyfish: {
        color: COLORS.jellyfishPink,
        speed: 0.2,
        health: 1,
        points: 150,
        draw: drawJellyfish
    },
    starfish: {
        color: COLORS.warningOrange,
        speed: 0.35,
        health: 1,
        points: 125,
        draw: drawStarfish
    },
    anglerfish: {
        color: COLORS.bioGreen,
        speed: 0.5,
        health: 2,
        points: 300,
        draw: drawAnglerfish
    },
    // NEW: Sea Urchin (Spiker) - leaves spike obstacles behind
    urchin: {
        color: '#8B4513',  // Saddle brown with purple spines
        speed: 0.25,
        health: 1,
        points: 175,
        draw: drawUrchin
    },
    // NEW: Puffer Fish (Fuseball) - evasive, moves along lane edges
    pufferfish: {
        color: '#FFD700',  // Gold with spots
        speed: 0.35,
        health: 1,
        points: 200,
        draw: drawPufferfish
    },
    // NEW: Hermit Crab (True Flipper) - hops lanes at rim
    hermitcrab: {
        color: '#CD853F',  // Peru/tan shell
        speed: 0.4,
        health: 1,
        points: 150,
        draw: drawHermitCrab
    }
};

function spawnEnemy(type, lane) {
    const template = ENEMY_TYPES[type];
    const enemy = {
        type,
        lane: lane !== undefined ? lane : Math.floor(Math.random() * CONFIG.NUM_LANES),
        depth: 0.05,
        speed: template.speed * (1 + wave * 0.05),  // Speed increases with waves
        health: template.health,
        points: template.points,
        shootTimer: template.shootInterval || 0,
        pulseTimer: 0,
        wobble: Math.random() * Math.PI * 2,
        small: false,
        // New properties for new enemy types
        spikeTimer: 0,  // For urchin spike placement
        puffed: false,  // For pufferfish puff state
        hopTimer: 0,    // For hermit crab lane hopping
        hopDirection: Math.random() < 0.5 ? -1 : 1,  // Which way to hop
        laneOffset: 0,  // For pufferfish edge movement
        edgeDirection: Math.random() < 0.5 ? -1 : 1  // Which edge to ride
    };
    enemies.push(enemy);

    Audio.spawn();
}

function hitEnemy(index) {
    const e = enemies[index];
    e.health--;
    
    const pos = getPositionOnLane(e.lane, e.depth);
    
    if (e.health <= 0) {
        score += e.points;
        updateUI();
        
        Particles.explode(pos.x, pos.y, ENEMY_TYPES[e.type].color, 20, 150, 0.5);
        Audio.explode();
        
        // Starfish splits
        if (e.type === 'starfish' && !e.small) {
            const lane1 = wrapLane(e.lane - 1);
            const lane2 = wrapLane(e.lane + 1);
            enemies.push({
                type: 'starfish',
                lane: lane1,
                depth: e.depth,
                speed: 0.5,
                health: 1,
                points: 50,
                wobble: Math.random() * Math.PI * 2,
                small: true
            });
            enemies.push({
                type: 'starfish',
                lane: lane2,
                depth: e.depth,
                speed: 0.5,
                health: 1,
                points: 50,
                wobble: Math.random() * Math.PI * 2,
                small: true
            });
        }
        
        enemies.splice(index, 1);
    } else {
        Particles.sparks(pos.x, pos.y, '#ffffff', 8);
        Audio.hit();
    }
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const template = ENEMY_TYPES[e.type];
        
        // Movement
        e.depth += e.speed * dt;
        e.wobble += dt * 3;
        
        // Type-specific behavior
        if (e.type === 'eel') {
            e.shootTimer -= dt;
            if (e.shootTimer <= 0 && e.depth > 0.2) {
                projectiles.push({
                    lane: e.lane,
                    depth: e.depth,
                    speed: 0.8,
                    type: 'electric'
                });
                e.shootTimer = template.shootInterval + Math.random();
                Audio.cannon();
            }
        }
        
        if (e.type === 'anglerfish' && e.depth > 0.3) {
            // Chase player
            const diff = wrapLaneDiff(player.lane, e.lane);
            e.lane += diff * 0.03;
            e.lane = wrapLane(e.lane);
        }
        
        if (e.type === 'jellyfish') {
            e.pulseTimer += dt;
            if (e.pulseTimer > 2) {
                e.pulseTimer = 0;
                // Pulse damage to adjacent lanes
                if (Math.abs(wrapLaneDiff(e.lane, player.lane)) <= 1 &&
                    Math.abs(e.depth - CONFIG.PLAYER_DEPTH) < 0.15 &&
                    player.invincible <= 0 && !godMode) {
                    playerHit();
                }
            }
        }

        // Sea Urchin (Spiker) - leaves spikes behind as it moves
        if (e.type === 'urchin') {
            e.spikeTimer += dt;
            if (e.spikeTimer > 0.8) {  // Drop spike every 0.8 seconds
                e.spikeTimer = 0;
                // Leave a spike at current position
                spikes.push({
                    lane: Math.round(e.lane),
                    depth: e.depth,
                    timer: 15 + wave * 2  // Spikes last longer in higher waves
                });
            }
        }

        // Puffer Fish (Fuseball) - evasive, rides lane edges
        if (e.type === 'pufferfish') {
            // Oscillate along lane edges (hard to hit)
            e.laneOffset = Math.sin(e.wobble * 2) * 0.4 * e.edgeDirection;

            // Detect incoming projectiles and dodge
            for (const p of projectiles) {
                if (p.type === 'player' && Math.abs(wrapLaneDiff(p.lane, e.lane)) < 1) {
                    if (p.depth > e.depth && p.depth < e.depth + 0.3) {
                        // Dodge! Change lanes
                        e.edgeDirection *= -1;
                        e.lane += e.edgeDirection * 0.5;
                        e.puffed = true;
                        setTimeout(() => { e.puffed = false; }, 500);
                        break;
                    }
                }
            }
        }

        // Hermit Crab (Flipper) - hops along rim when it reaches the top
        if (e.type === 'hermitcrab') {
            if (e.depth >= CONFIG.PLAYER_DEPTH - 0.15) {
                // At the rim - start hopping along lanes toward player!
                e.depth = CONFIG.PLAYER_DEPTH - 0.1;  // Stay at rim
                e.hopTimer += dt;
                if (e.hopTimer > 0.3) {  // Hop every 0.3 seconds
                    e.hopTimer = 0;
                    // Hop toward player
                    const diff = wrapLaneDiff(player.lane, e.lane);
                    if (Math.abs(diff) > 0.5) {
                        e.lane += diff > 0 ? 1 : -1;
                        e.lane = wrapLane(e.lane);
                    }
                }
            }
        }

        // Reached the rim?
        if (e.depth >= CONFIG.PLAYER_DEPTH - 0.05) {
            if (Math.abs(wrapLaneDiff(e.lane, player.lane)) < 0.6 && player.invincible <= 0 && !godMode) {
                playerHit();
            }
            enemies.splice(i, 1);
        }
    }
}

// Enemy drawing functions
function drawCrab(e, pos, angle) {
    const size = e.small ? 10 : 18;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle + Math.PI / 2);
    
    const wobble = Math.sin(e.wobble) * 0.15;
    
    // Glow
    ctx.shadowColor = COLORS.crabRed;
    ctx.shadowBlur = 12;
    
    // Legs (6 total, 3 per side)
    ctx.strokeStyle = '#aa3333';
    ctx.lineWidth = e.small ? 1.5 : 2.5;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i++) {
            const legAngle = side * (0.4 + i * 0.35) + wobble * side;
            const legLen = size * 0.9;
            ctx.beginPath();
            ctx.moveTo(side * size * 0.5, i * 4 - 4);
            ctx.quadraticCurveTo(
                side * (size * 0.7 + Math.cos(legAngle) * legLen * 0.5),
                i * 4 - 4 + Math.sin(legAngle) * legLen * 0.3,
                side * size * 0.5 + Math.cos(legAngle) * legLen,
                i * 4 - 4 + Math.sin(legAngle) * legLen * 0.6
            );
            ctx.stroke();
        }
    }
    
    // Shell (main body)
    ctx.fillStyle = COLORS.crabRed;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shell segments/texture
    ctx.strokeStyle = '#cc5555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -2, size * 0.6, size * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.3);
    ctx.quadraticCurveTo(0, size * 0.1, size * 0.3, size * 0.3);
    ctx.stroke();
    
    // Shell shading
    const shellGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.2, 0, 0, 0, size);
    shellGrad.addColorStop(0, 'rgba(255,150,150,0.4)');
    shellGrad.addColorStop(0.5, 'transparent');
    shellGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = shellGrad;
    ctx.fill();
    
    // Claws (pincers)
    const clawWobble = Math.sin(e.wobble * 2) * 0.3;
    ctx.fillStyle = '#dd4444';
    for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(side * (size + 3), -6);
        ctx.rotate(side * (0.3 + clawWobble * side));
        
        // Arm
        ctx.fillStyle = '#cc3333';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pincer (two parts)
        ctx.fillStyle = '#dd4444';
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(12, -5 - clawWobble * 3);
        ctx.lineTo(10, 0);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(4, 3);
        ctx.lineTo(12, 5 + clawWobble * 3);
        ctx.lineTo(10, 0);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // Eye stalks
    ctx.strokeStyle = '#aa3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -size * 0.5);
    ctx.lineTo(-6, -size * 0.5 - 8);
    ctx.moveTo(5, -size * 0.5);
    ctx.lineTo(6, -size * 0.5 - 8);
    ctx.stroke();
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-6, -size * 0.5 - 8, 3, 0, Math.PI * 2);
    ctx.arc(6, -size * 0.5 - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5, -size * 0.5 - 9, 1.5, 0, Math.PI * 2);
    ctx.arc(7, -size * 0.5 - 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawEel(e, pos, angle) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle + Math.PI / 2);
    
    const bodyLen = 50;
    const segments = 8;
    
    // Electric aura when about to shoot
    if (e.shootTimer < 0.5) {
        ctx.globalAlpha = 0.3 + Math.sin(e.wobble * 10) * 0.2;
        const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
        aura.addColorStop(0, COLORS.eelYellow);
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    ctx.shadowColor = COLORS.eelYellow;
    ctx.shadowBlur = 15;
    
    // Build body path
    const bodyPoints = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = -bodyLen/2 + t * bodyLen;
        const x = Math.sin(e.wobble * 2 + t * Math.PI * 2) * 10;
        bodyPoints.push({x, y});
    }
    
    // Body (thick gradient stroke)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw body shadow/outline
    ctx.strokeStyle = '#8B8B00';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y);
    for (let i = 1; i < bodyPoints.length; i++) {
        ctx.lineTo(bodyPoints[i].x, bodyPoints[i].y);
    }
    ctx.stroke();
    
    // Draw main body
    ctx.strokeStyle = COLORS.eelYellow;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y);
    for (let i = 1; i < bodyPoints.length; i++) {
        ctx.lineTo(bodyPoints[i].x, bodyPoints[i].y);
    }
    ctx.stroke();
    
    // Body highlight
    ctx.strokeStyle = '#FFFF88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bodyPoints[0].x - 2, bodyPoints[0].y);
    for (let i = 1; i < bodyPoints.length; i++) {
        ctx.lineTo(bodyPoints[i].x - 2, bodyPoints[i].y);
    }
    ctx.stroke();
    
    // Dorsal fin (wavy along top)
    ctx.fillStyle = '#CCCC00';
    ctx.beginPath();
    ctx.moveTo(bodyPoints[1].x, bodyPoints[1].y);
    for (let i = 1; i < bodyPoints.length - 1; i++) {
        const finHeight = 6 + Math.sin(e.wobble + i) * 3;
        ctx.lineTo(bodyPoints[i].x - 8, bodyPoints[i].y);
        ctx.lineTo(bodyPoints[i].x - 4 - finHeight, bodyPoints[i].y + 3);
    }
    ctx.lineTo(bodyPoints[bodyPoints.length - 2].x, bodyPoints[bodyPoints.length - 2].y);
    ctx.fill();
    
    // Head
    const headX = bodyPoints[0].x;
    const headY = bodyPoints[0].y;
    
    ctx.fillStyle = COLORS.eelYellow;
    ctx.beginPath();
    ctx.ellipse(headX, headY - 5, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Angry eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(headX - 4, headY - 8, 3, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(headX + 4, headY - 8, 3, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(headX - 4, headY - 9, 1.5, 0, Math.PI * 2);
    ctx.arc(headX + 4, headY - 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (slightly open, menacing)
    ctx.fillStyle = '#660';
    ctx.beginPath();
    ctx.ellipse(headX, headY - 14, 6, 3, 0, 0, Math.PI);
    ctx.fill();
    
    // Electric sparks radiating from body
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    for (let i = 0; i < 5; i++) {
        const sparkIdx = Math.floor(Math.random() * (segments - 1)) + 1;
        const base = bodyPoints[sparkIdx];
        const sparkAngle = Math.random() * Math.PI * 2;
        const len = 8 + Math.random() * 15;
        
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        // Jagged lightning
        let sx = base.x, sy = base.y;
        for (let j = 0; j < 3; j++) {
            sx += Math.cos(sparkAngle + (Math.random() - 0.5)) * len / 3;
            sy += Math.sin(sparkAngle + (Math.random() - 0.5)) * len / 3;
            ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    }
    
    // Tail fin
    const tailX = bodyPoints[bodyPoints.length - 1].x;
    const tailY = bodyPoints[bodyPoints.length - 1].y;
    ctx.fillStyle = '#CCCC00';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tailX - 8, tailY + 12);
    ctx.lineTo(tailX + 8, tailY + 12);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawJellyfish(e, pos, angle) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    
    const pulse = Math.sin(e.pulseTimer * Math.PI) * 0.3 + 1;
    const bellWidth = 18 * pulse;
    const bellHeight = 14 * pulse;
    
    // Outer glow (pulsing)
    ctx.globalAlpha = 0.3;
    const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35 * pulse);
    outerGlow.addColorStop(0, COLORS.jellyfishPink);
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 35 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    ctx.shadowColor = COLORS.jellyfishPink;
    ctx.shadowBlur = 25 * pulse;
    
    // Bell (dome) - outer
    ctx.fillStyle = `rgba(255, 105, 180, ${0.5 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(0, -2, bellWidth, bellHeight, 0, Math.PI, 0);
    ctx.fill();
    
    // Bell inner membrane
    ctx.fillStyle = `rgba(255, 150, 200, ${0.4 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(0, -1, bellWidth * 0.7, bellHeight * 0.6, 0, Math.PI, 0);
    ctx.fill();
    
    // Bell rim (frilly edge)
    ctx.strokeStyle = `rgba(255, 180, 220, 0.8)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const rimAngle = Math.PI + t * Math.PI;
        const rimX = Math.cos(rimAngle) * bellWidth;
        const rimY = -2 + Math.sin(rimAngle) * bellHeight * 0.3;
        const ruffle = Math.sin(i * 2 + e.wobble) * 2;
        if (i === 0) {
            ctx.moveTo(rimX, rimY + ruffle);
        } else {
            ctx.lineTo(rimX, rimY + ruffle);
        }
    }
    ctx.stroke();
    
    // Internal organs (gonads) - 4 horseshoe shapes
    ctx.strokeStyle = `rgba(255, 80, 150, 0.6)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const ox = -9 + i * 6;
        ctx.beginPath();
        ctx.arc(ox, -5, 4, 0.5, Math.PI - 0.5);
        ctx.stroke();
    }
    
    // Main tentacles (8 long wavy ones)
    ctx.strokeStyle = COLORS.jellyfishPink;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
        const startX = -14 + i * 4;
        const tentLen = 35 + Math.sin(i) * 10;
        
        ctx.beginPath();
        ctx.moveTo(startX, 2);
        
        for (let j = 1; j <= 5; j++) {
            const t = j / 5;
            const wave = Math.sin(e.wobble * 1.5 + i * 0.7 + j * 0.8) * (8 + t * 5);
            const ty = 2 + t * tentLen;
            ctx.lineTo(startX + wave, ty);
        }
        ctx.stroke();
    }
    
    // Oral arms (4 thick frilly ones in center)
    ctx.strokeStyle = `rgba(255, 150, 200, 0.9)`;
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        const startX = -6 + i * 4;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        
        for (let j = 1; j <= 4; j++) {
            const wave = Math.sin(e.wobble * 2 + i + j * 0.5) * 5;
            const ty = j * 8;
            ctx.lineTo(startX + wave, ty);
        }
        ctx.stroke();
    }
    
    // Highlight on bell
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-bellWidth * 0.3, -bellHeight * 0.4, bellWidth * 0.25, bellHeight * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function drawStarfish(e, pos, angle) {
    const size = e.small ? 8 : 16;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(e.wobble * 0.3);
    
    ctx.shadowColor = COLORS.warningOrange;
    ctx.shadowBlur = 12;
    
    // Build star points
    const points = [];
    for (let i = 0; i < 5; i++) {
        const outerAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const innerAngle = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
        points.push({
            outer: { x: Math.cos(outerAngle) * size, y: Math.sin(outerAngle) * size },
            inner: { x: Math.cos(innerAngle) * (size * 0.35), y: Math.sin(innerAngle) * (size * 0.35) }
        });
    }
    
    // Main body
    ctx.fillStyle = COLORS.warningOrange;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const p = points[i];
        if (i === 0) {
            ctx.moveTo(p.outer.x, p.outer.y);
        } else {
            ctx.lineTo(p.outer.x, p.outer.y);
        }
        ctx.lineTo(p.inner.x, p.inner.y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Texture bumps on each arm
    ctx.fillStyle = '#cc5522';
    for (let i = 0; i < 5; i++) {
        const armAngle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        // Row of bumps down each arm
        for (let j = 1; j <= 3; j++) {
            const dist = size * (0.3 + j * 0.2);
            const bx = Math.cos(armAngle) * dist;
            const by = Math.sin(armAngle) * dist;
            const bumpSize = (e.small ? 1 : 2) * (1 - j * 0.2);
            ctx.beginPath();
            ctx.arc(bx, by, bumpSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Center disc
    ctx.fillStyle = '#dd6633';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 200, 150, 0.5)';
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.1, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Arm edges (darker outline)
    ctx.strokeStyle = '#aa4411';
    ctx.lineWidth = e.small ? 0.5 : 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const p = points[i];
        if (i === 0) {
            ctx.moveTo(p.outer.x, p.outer.y);
        } else {
            ctx.lineTo(p.outer.x, p.outer.y);
        }
        ctx.lineTo(p.inner.x, p.inner.y);
    }
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
}

function drawAnglerfish(e, pos, angle) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle + Math.PI / 2);
    
    // Lure glow (pulsing intensely)
    const lureGlow = 0.7 + Math.sin(e.wobble * 3) * 0.3;
    const lureX = Math.sin(e.wobble) * 5;
    const lureY = -38;
    
    ctx.globalAlpha = 0.4;
    const glow = ctx.createRadialGradient(lureX, lureY, 0, lureX, lureY, 30);
    glow.addColorStop(0, COLORS.bioGreen);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lureX, lureY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    ctx.shadowColor = COLORS.bioGreen;
    ctx.shadowBlur = 15;
    
    // Body (lumpy, ugly)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(-20, 10);
    ctx.quadraticCurveTo(-22, 0, -18, -8);
    ctx.quadraticCurveTo(-10, -15, 0, -12);
    ctx.quadraticCurveTo(10, -15, 18, -8);
    ctx.quadraticCurveTo(22, 0, 20, 10);
    ctx.quadraticCurveTo(15, 18, 0, 20);
    ctx.quadraticCurveTo(-15, 18, -20, 10);
    ctx.closePath();
    ctx.fill();
    
    // Body texture (bumps and spots)
    ctx.fillStyle = '#252540';
    for (let i = 0; i < 6; i++) {
        const bx = -12 + Math.random() * 24;
        const by = -5 + Math.random() * 20;
        ctx.beginPath();
        ctx.arc(bx, by, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Fins (small, ragged)
    ctx.fillStyle = '#2a2a3e';
    // Dorsal
    ctx.beginPath();
    ctx.moveTo(-5, -12);
    ctx.lineTo(-8, -18);
    ctx.lineTo(-3, -14);
    ctx.lineTo(0, -20);
    ctx.lineTo(3, -14);
    ctx.lineTo(6, -16);
    ctx.lineTo(5, -12);
    ctx.closePath();
    ctx.fill();
    
    // Pectoral
    ctx.beginPath();
    ctx.moveTo(-18, 5);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-25, 8);
    ctx.lineTo(-18, 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(18, 5);
    ctx.lineTo(28, 0);
    ctx.lineTo(25, 8);
    ctx.lineTo(18, 10);
    ctx.closePath();
    ctx.fill();
    
    // Massive underbite mouth
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.quadraticCurveTo(-18, 5, -12, 8);
    ctx.lineTo(12, 8);
    ctx.quadraticCurveTo(18, 5, 15, -5);
    ctx.quadraticCurveTo(0, -2, -15, -5);
    ctx.fill();
    
    // Red throat
    ctx.fillStyle = '#300';
    ctx.beginPath();
    ctx.ellipse(0, 3, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Teeth - top row (jagged, uneven)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    const topTeeth = [-12, -8, -5, -2, 2, 5, 8, 12];
    topTeeth.forEach((tx, i) => {
        const th = 4 + Math.sin(i * 2) * 2;
        ctx.beginPath();
        ctx.moveTo(tx - 1.5, -4);
        ctx.lineTo(tx, -4 + th);
        ctx.lineTo(tx + 1.5, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    
    // Teeth - bottom row
    const botTeeth = [-10, -6, -2, 2, 6, 10];
    botTeeth.forEach((tx, i) => {
        const th = 3 + Math.sin(i * 3) * 1.5;
        ctx.beginPath();
        ctx.moveTo(tx - 1.5, 7);
        ctx.lineTo(tx, 7 - th);
        ctx.lineTo(tx + 1.5, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
    
    // Illicium (lure stalk)
    ctx.strokeStyle = '#2a3a2a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(
        Math.sin(e.wobble * 0.5) * 8, -25,
        lureX, lureY + 5
    );
    ctx.stroke();
    
    // Lure bulb (esca)
    ctx.fillStyle = COLORS.bioGreen;
    ctx.shadowBlur = 30 * lureGlow;
    ctx.beginPath();
    ctx.arc(lureX, lureY, 6 * lureGlow, 0, Math.PI * 2);
    ctx.fill();
    
    // Lure inner glow
    ctx.fillStyle = '#aaffaa';
    ctx.beginPath();
    ctx.arc(lureX - 1, lureY - 1, 3 * lureGlow, 0, Math.PI * 2);
    ctx.fill();
    
    // Evil eye (one big one)
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.plasmaPink;
    ctx.fillStyle = '#200';
    ctx.beginPath();
    ctx.ellipse(-10, -2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Iris
    ctx.fillStyle = COLORS.plasmaPink;
    ctx.beginPath();
    ctx.arc(-10, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupil (tracking player direction)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-10 + Math.sin(e.wobble) * 2, -2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-12, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Small secondary eye
    ctx.fillStyle = '#200';
    ctx.beginPath();
    ctx.arc(8, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.plasmaPink;
    ctx.beginPath();
    ctx.arc(8, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// NEW: Sea Urchin (Spiker) drawing function
function drawUrchin(e, pos, angle) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(e.wobble * 0.2);  // Slow rotation

    const size = 14;
    const numSpines = 12;

    // Glow
    ctx.shadowColor = '#9932CC';  // Purple glow
    ctx.shadowBlur = 15;

    // Body (dark spherical center)
    const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
    bodyGrad.addColorStop(0, '#4a3728');
    bodyGrad.addColorStop(0.7, '#2d1f14');
    bodyGrad.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Spines (long, sharp, purple-tipped)
    for (let i = 0; i < numSpines; i++) {
        const spineAngle = (i / numSpines) * Math.PI * 2;
        const spineLen = size + Math.sin(e.wobble * 3 + i) * 3;
        const wobble = Math.sin(e.wobble * 2 + i * 0.5) * 0.1;

        ctx.save();
        ctx.rotate(spineAngle + wobble);

        // Spine gradient (brown to purple tip)
        const spineGrad = ctx.createLinearGradient(0, 0, spineLen, 0);
        spineGrad.addColorStop(0, '#4a3728');
        spineGrad.addColorStop(0.6, '#6b4423');
        spineGrad.addColorStop(1, '#9932CC');

        ctx.strokeStyle = spineGrad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(size * 0.4, 0);
        ctx.lineTo(spineLen, 0);
        ctx.stroke();

        // Spine tip glow
        ctx.fillStyle = '#9932CC';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(spineLen, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Secondary shorter spines
    for (let i = 0; i < numSpines; i++) {
        const spineAngle = (i / numSpines) * Math.PI * 2 + Math.PI / numSpines;
        const spineLen = size * 0.7;

        ctx.save();
        ctx.rotate(spineAngle);
        ctx.strokeStyle = '#5a4738';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(size * 0.35, 0);
        ctx.lineTo(spineLen, 0);
        ctx.stroke();
        ctx.restore();
    }

    // Center highlight
    ctx.fillStyle = 'rgba(150, 100, 70, 0.4)';
    ctx.beginPath();
    ctx.arc(-2, -2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// NEW: Puffer Fish (Fuseball) drawing function
function drawPufferfish(e, pos, angle) {
    ctx.save();
    // Account for lane offset (edge riding)
    const offsetPos = getPositionOnLane(e.lane + (e.laneOffset || 0), e.depth);
    ctx.translate(offsetPos.x, offsetPos.y);
    ctx.rotate(angle + Math.PI / 2);

    const basSize = e.puffed ? 22 : 14;  // Puffs up when scared
    const wobble = Math.sin(e.wobble * 4) * 0.1;

    // Glow
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = e.puffed ? 25 : 12;

    // Body
    ctx.fillStyle = e.puffed ? '#FFFF00' : '#FFD700';
    ctx.beginPath();
    ctx.ellipse(0, 0, basSize, basSize * 0.8, wobble, 0, Math.PI * 2);
    ctx.fill();

    // Spots
    ctx.fillStyle = '#8B4513';
    const numSpots = 8;
    for (let i = 0; i < numSpots; i++) {
        const spotAngle = (i / numSpots) * Math.PI * 2 + e.wobble * 0.5;
        const spotDist = basSize * 0.5;
        const sx = Math.cos(spotAngle) * spotDist;
        const sy = Math.sin(spotAngle) * spotDist * 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Spikes when puffed
    if (e.puffed) {
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
            const spikeAngle = (i / 16) * Math.PI * 2;
            const spikeLen = 8 + Math.sin(e.wobble * 8 + i) * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(spikeAngle) * basSize, Math.sin(spikeAngle) * basSize * 0.8);
            ctx.lineTo(
                Math.cos(spikeAngle) * (basSize + spikeLen),
                Math.sin(spikeAngle) * (basSize * 0.8 + spikeLen)
            );
            ctx.stroke();
        }
    }

    // Fins
    ctx.fillStyle = '#DAA520';
    // Tail fin
    ctx.beginPath();
    ctx.moveTo(basSize * 0.8, 0);
    ctx.lineTo(basSize * 1.3, -5);
    ctx.lineTo(basSize * 1.3, 5);
    ctx.closePath();
    ctx.fill();
    // Top fin
    ctx.beginPath();
    ctx.moveTo(0, -basSize * 0.6);
    ctx.lineTo(-5, -basSize - 5);
    ctx.lineTo(5, -basSize - 5);
    ctx.closePath();
    ctx.fill();

    // Eyes (big, worried looking)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-basSize * 0.4, -basSize * 0.2, 5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(basSize * 0.1, -basSize * 0.2, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (looking around nervously)
    const pupilOffset = Math.sin(e.wobble * 3) * 2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-basSize * 0.4 + pupilOffset, -basSize * 0.2, 2.5, 0, Math.PI * 2);
    ctx.arc(basSize * 0.1 + pupilOffset, -basSize * 0.2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (small, pursed)
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-basSize * 0.15, basSize * 0.3, 3, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
}

// NEW: Hermit Crab (Flipper) drawing function
function drawHermitCrab(e, pos, angle) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle + Math.PI / 2);

    const size = 16;
    const hopBounce = e.depth >= CONFIG.PLAYER_DEPTH - 0.15 ?
        Math.abs(Math.sin(e.hopTimer * Math.PI * 3)) * 5 : 0;

    ctx.translate(0, -hopBounce);  // Bounce effect when hopping

    // Glow
    ctx.shadowColor = '#CD853F';
    ctx.shadowBlur = 12;

    // Shell (spiral nautilus-like)
    const shellGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, size);
    shellGrad.addColorStop(0, '#DEB887');
    shellGrad.addColorStop(0.5, '#CD853F');
    shellGrad.addColorStop(1, '#8B4513');
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.arc(0, 2, size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Shell spiral pattern
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
        const spiralR = size * (0.3 + i * 0.2);
        ctx.beginPath();
        ctx.arc(-2 + i, 2 - i, spiralR, Math.PI * 0.5, Math.PI * 2);
        ctx.stroke();
    }

    // Legs (4 pairs peeking out)
    ctx.strokeStyle = '#FF6347';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const legWobble = Math.sin(e.wobble * 4) * 0.3;
    for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 4; i++) {
            const legAngle = side * (0.8 + i * 0.25) + legWobble * side * (i + 1) * 0.3;
            const legLen = 10 + i * 2;
            const startX = side * (size * 0.4);
            const startY = 8 - i * 3;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(
                startX + side * legLen * 0.4,
                startY + 5,
                startX + Math.cos(legAngle) * legLen,
                startY + Math.sin(legAngle) * legLen * 0.5 + 5
            );
            ctx.stroke();
        }
    }

    // Claws (big, orange-red)
    ctx.fillStyle = '#FF4500';
    for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(side * (size * 0.6), -8);
        ctx.rotate(side * 0.4 + Math.sin(e.wobble * 2) * 0.2 * side);

        // Arm
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Claw
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.moveTo(3, -2);
        ctx.lineTo(12, -4);
        ctx.lineTo(10, 0);
        ctx.lineTo(12, 4);
        ctx.lineTo(3, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Eye stalks
    ctx.strokeStyle = '#FF6347';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, -size * 0.3);
    ctx.lineTo(-6, -size * 0.3 - 10);
    ctx.moveTo(4, -size * 0.3);
    ctx.lineTo(6, -size * 0.3 - 10);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-6, -size * 0.3 - 10, 3, 0, Math.PI * 2);
    ctx.arc(6, -size * 0.3 - 10, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5, -size * 0.3 - 11, 1.5, 0, Math.PI * 2);
    ctx.arc(7, -size * 0.3 - 11, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawEnemies() {
    enemies.forEach(e => {
        const pos = getPositionOnLane(e.lane, e.depth);
        const angle = getLaneAngle(e.lane);
        ENEMY_TYPES[e.type].draw(e, pos, angle);
    });
}

// ==================== ELECTRIC LANES ====================
function electrifyLane(lane, duration) {
    const existing = electricLanes.find(el => el.lane === lane);
    if (existing) {
        existing.timer = Math.max(existing.timer, duration);
    } else {
        electricLanes.push({ lane, timer: duration });
    }
}

function updateElectricLanes(dt) {
    for (let i = electricLanes.length - 1; i >= 0; i--) {
        electricLanes[i].timer -= dt;
        
        // Check if player is on electrified lane
        if (Math.abs(wrapLaneDiff(electricLanes[i].lane, player.lane)) < 0.6 && 
            player.invincible <= 0 && !godMode) {
            playerHit();
        }
        
        if (electricLanes[i].timer <= 0) {
            electricLanes.splice(i, 1);
        }
    }
}

function drawElectricLanes() {
    electricLanes.forEach(el => {
        const intensity = Math.min(el.timer, 1);
        
        ctx.save();
        ctx.globalAlpha = intensity * 0.6;
        
        const angle1 = getLaneAngle(el.lane - 0.5);
        const angle2 = getLaneAngle(el.lane + 0.5);
        
        const gradient = ctx.createRadialGradient(
            CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.INNER_RADIUS, 
            CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.OUTER_RADIUS
        );
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(
            CONFIG.CENTER_X + Math.cos(angle1) * CONFIG.INNER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle1) * CONFIG.INNER_RADIUS
        );
        ctx.lineTo(
            CONFIG.CENTER_X + Math.cos(angle1) * CONFIG.OUTER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle1) * CONFIG.OUTER_RADIUS
        );
        ctx.lineTo(
            CONFIG.CENTER_X + Math.cos(angle2) * CONFIG.OUTER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle2) * CONFIG.OUTER_RADIUS
        );
        ctx.lineTo(
            CONFIG.CENTER_X + Math.cos(angle2) * CONFIG.INNER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle2) * CONFIG.INNER_RADIUS
        );
        ctx.closePath();
        ctx.fill();
        
        // Lightning bolts
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.eelYellow;
        ctx.shadowBlur = 10;
        
        for (let i = 0; i < 3; i++) {
            const startDepth = Math.random();
            const startPos = getPositionOnLane(el.lane, startDepth);
            
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            
            let cx = startPos.x;
            let cy = startPos.y;
            for (let j = 0; j < 5; j++) {
                cx += randomRange(-15, 15);
                cy += randomRange(-15, 15);
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
        
        ctx.restore();
    });
}

// ==================== SPIKE OBSTACLES (from Sea Urchins) ====================
function updateSpikes(dt) {
    for (let i = spikes.length - 1; i >= 0; i--) {
        spikes[i].timer -= dt;
        if (spikes[i].timer <= 0) {
            spikes.splice(i, 1);
        }
    }
}

function drawSpikes() {
    spikes.forEach(spike => {
        const pos = getPositionOnLane(spike.lane, spike.depth);
        const alpha = Math.min(spike.timer / 3, 1);  // Fade out in last 3 seconds

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.globalAlpha = alpha;

        // Purple glowing spike
        ctx.shadowColor = '#9932CC';
        ctx.shadowBlur = 10;

        // Draw spike as small urchin spine cluster
        const numSpines = 6;
        const spikeSize = 8;
        for (let i = 0; i < numSpines; i++) {
            const angle = (i / numSpines) * Math.PI * 2 + gameTime;
            ctx.strokeStyle = '#9932CC';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * spikeSize, Math.sin(angle) * spikeSize);
            ctx.stroke();

            // Tip glow
            ctx.fillStyle = '#DA70D6';
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * spikeSize, Math.sin(angle) * spikeSize, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center
        ctx.fillStyle = '#4B0082';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// Check if player hits spikes (during warp or normal play)
function checkSpikeCollisions() {
    if (player.invincible > 0 || godMode) return;

    for (const spike of spikes) {
        // Only check spikes near the rim (where player could hit them)
        if (spike.depth >= CONFIG.PLAYER_DEPTH - 0.15) {
            if (Math.abs(wrapLaneDiff(spike.lane, player.lane)) < 0.6) {
                playerHit();
                // Remove the spike that hit the player
                const idx = spikes.indexOf(spike);
                if (idx > -1) spikes.splice(idx, 1);
                return;
            }
        }
    }
}

// ==================== INK CLOUD (SuperZapper) ====================
function activateInkCloud() {
    if (superZapperCharges <= 0) return false;

    superZapperCharges--;
    inkCloudActive = 1.5;  // 1.5 second effect

    // Kill all enemies on screen!
    const killCount = enemies.length;
    enemies.forEach(e => {
        const pos = getPositionOnLane(e.lane, e.depth);
        score += e.points;
        Particles.explode(pos.x, pos.y, ENEMY_TYPES[e.type].color, 15, 100, 0.4);
    });
    enemies = [];

    // Clear electric lanes too
    electricLanes = [];

    // Visual and audio feedback
    Audio.explode();
    updateUI();

    console.log(`🦑 INK CLOUD! Destroyed ${killCount} enemies. ${superZapperCharges} charges remaining.`);
    return true;
}

function updateInkCloud(dt) {
    if (inkCloudActive > 0) {
        inkCloudActive -= dt;
    }
}

function drawInkCloud() {
    if (inkCloudActive <= 0) return;

    ctx.save();
    const intensity = inkCloudActive / 1.5;

    // Dark ink spreading from center
    const inkGrad = ctx.createRadialGradient(
        CONFIG.CENTER_X, CONFIG.CENTER_Y, 0,
        CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.OUTER_RADIUS * (1.2 - intensity * 0.5)
    );
    inkGrad.addColorStop(0, `rgba(20, 0, 40, ${intensity * 0.8})`);
    inkGrad.addColorStop(0.5, `rgba(60, 0, 80, ${intensity * 0.5})`);
    inkGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = inkGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Swirling ink particles
    ctx.fillStyle = `rgba(100, 50, 150, ${intensity})`;
    for (let i = 0; i < 20; i++) {
        const angle = gameTime * 3 + i * 0.5;
        const dist = CONFIG.INNER_RADIUS + (CONFIG.OUTER_RADIUS - CONFIG.INNER_RADIUS) * (1 - intensity) * (i / 20);
        const x = CONFIG.CENTER_X + Math.cos(angle) * dist;
        const y = CONFIG.CENTER_Y + Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(x, y, 5 + Math.sin(gameTime * 5 + i) * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ==================== KRAKEN (Background Boss) ====================
function drawKraken() {
    const agitation = Math.min(wave / 10, 1);
    
    ctx.save();
    
    // Tentacles reaching up from center
    const numTentacles = 8;
    for (let i = 0; i < numTentacles; i++) {
        const baseAngle = (i / numTentacles) * Math.PI * 2 + gameTime * 0.1;
        const wobble = Math.sin(gameTime * 2 + i) * 0.2 * agitation;
        
        ctx.strokeStyle = `rgba(123, 44, 191, ${0.3 + agitation * 0.3})`;
        ctx.lineWidth = 8 + agitation * 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = COLORS.krakenPurple;
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        ctx.moveTo(CONFIG.CENTER_X, CONFIG.CENTER_Y);
        
        const segments = 6;
        for (let j = 1; j <= segments; j++) {
            const t = j / segments;
            const reach = CONFIG.INNER_RADIUS * (0.3 + t * 0.7 * (0.5 + agitation * 0.5));
            const angle = baseAngle + wobble * t + Math.sin(gameTime * 3 + i + j) * 0.15;
            const x = CONFIG.CENTER_X + Math.cos(angle) * reach;
            const y = CONFIG.CENTER_Y + Math.sin(angle) * reach;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Suckers
        ctx.fillStyle = `rgba(123, 44, 191, ${0.5 + agitation * 0.3})`;
        for (let j = 1; j <= 3; j++) {
            const t = j / 4;
            const reach = CONFIG.INNER_RADIUS * (0.3 + t * 0.5);
            const angle = baseAngle + wobble * t;
            const x = CONFIG.CENTER_X + Math.cos(angle) * reach;
            const y = CONFIG.CENTER_Y + Math.sin(angle) * reach;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Eyes
    const eyeOffset = 25;
    const eyeY = CONFIG.CENTER_Y + 5;
    const lookAtPlayer = getPositionOnLane(player ? player.lane : 0, CONFIG.PLAYER_DEPTH);
    const lookAngle = Math.atan2(lookAtPlayer.y - eyeY, lookAtPlayer.x - CONFIG.CENTER_X);
    const pupilOffset = 5 + agitation * 3;
    
    // Left eye
    ctx.fillStyle = `rgba(255, 0, 110, ${0.6 + agitation * 0.4})`;
    ctx.shadowColor = COLORS.plasmaPink;
    ctx.shadowBlur = 20 + agitation * 20;
    ctx.beginPath();
    ctx.ellipse(CONFIG.CENTER_X - eyeOffset, eyeY, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(
        CONFIG.CENTER_X - eyeOffset + Math.cos(lookAngle) * pupilOffset,
        eyeY + Math.sin(lookAngle) * pupilOffset,
        6, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Right eye
    ctx.fillStyle = `rgba(255, 0, 110, ${0.6 + agitation * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(CONFIG.CENTER_X + eyeOffset, eyeY, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(
        CONFIG.CENTER_X + eyeOffset + Math.cos(lookAngle) * pupilOffset,
        eyeY + Math.sin(lookAngle) * pupilOffset,
        6, 0, Math.PI * 2
    );
    ctx.fill();
    
    ctx.restore();
}

// ==================== PLAYFIELD ====================
function drawPlayfield() {
    ctx.save();
    
    // Outer glow
    const outerGradient = ctx.createRadialGradient(
        CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.OUTER_RADIUS - 50, 
        CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.OUTER_RADIUS + 20
    );
    outerGradient.addColorStop(0, 'transparent');
    outerGradient.addColorStop(0.5, 'rgba(123, 44, 191, 0.2)');
    outerGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Abyss gradient
    const abyssGradient = ctx.createRadialGradient(
        CONFIG.CENTER_X, CONFIG.CENTER_Y, 0, 
        CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.INNER_RADIUS
    );
    abyssGradient.addColorStop(0, 'rgba(10, 10, 18, 1)');
    abyssGradient.addColorStop(0.7, 'rgba(13, 27, 42, 0.9)');
    abyssGradient.addColorStop(1, 'rgba(123, 44, 191, 0.3)');
    ctx.fillStyle = abyssGradient;
    ctx.beginPath();
    ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.INNER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // ===== SWIRLING TEMPEST EFFECT =====
    ctx.save();
    
    // Spiral arms (6 arms rotating)
    const numArms = 6;
    const spiralTurns = 2.5;
    
    for (let arm = 0; arm < numArms; arm++) {
        const armOffset = (arm / numArms) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 + Math.sin(swirlAngle * 2 + arm) * 0.05})`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i <= 60; i++) {
            const t = i / 60;
            const radius = CONFIG.INNER_RADIUS + (CONFIG.OUTER_RADIUS - CONFIG.INNER_RADIUS) * t;
            const spiralAngle = armOffset + swirlAngle + t * spiralTurns * Math.PI * 2;
            const x = CONFIG.CENTER_X + Math.cos(spiralAngle) * radius;
            const y = CONFIG.CENTER_Y + Math.sin(spiralAngle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Swirling particles/debris
    for (let i = 0; i < 30; i++) {
        const particlePhase = swirlAngle * 1.5 + i * 0.7;
        const depth = (i / 30 + swirlAngle * 0.1) % 1;
        const radius = CONFIG.INNER_RADIUS + (CONFIG.OUTER_RADIUS - CONFIG.INNER_RADIUS) * depth;
        const angle = particlePhase + depth * Math.PI * 3;
        
        const px = CONFIG.CENTER_X + Math.cos(angle) * radius;
        const py = CONFIG.CENTER_Y + Math.sin(angle) * radius;
        const size = 1 + depth * 2;
        const alpha = 0.3 + depth * 0.4;
        
        ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Faint swirling rings
    for (let ring = 0; ring < 4; ring++) {
        const ringDepth = 0.2 + ring * 0.2;
        const radius = CONFIG.INNER_RADIUS + (CONFIG.OUTER_RADIUS - CONFIG.INNER_RADIUS) * ringDepth;
        const wobble = Math.sin(swirlAngle * 3 + ring) * 5;
        
        ctx.strokeStyle = `rgba(123, 44, 191, ${0.1 + ring * 0.03})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, radius + wobble, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
    // ===== END TEMPEST EFFECT =====
    
    // Lane lines
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < CONFIG.NUM_LANES; i++) {
        const angle = getLaneAngle(i);
        ctx.beginPath();
        ctx.moveTo(
            CONFIG.CENTER_X + Math.cos(angle) * CONFIG.INNER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle) * CONFIG.INNER_RADIUS
        );
        ctx.lineTo(
            CONFIG.CENTER_X + Math.cos(angle) * CONFIG.OUTER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle) * CONFIG.OUTER_RADIUS
        );
        ctx.stroke();
    }
    
    // Concentric rings
    const ringDepths = [0.25, 0.5, 0.75, 1];
    ringDepths.forEach((depth, index) => {
        const radius = CONFIG.INNER_RADIUS + (CONFIG.OUTER_RADIUS - CONFIG.INNER_RADIUS) * depth;
        ctx.strokeStyle = `rgba(0, 245, 255, ${0.15 + index * 0.05})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, radius, 0, Math.PI * 2);
        ctx.stroke();
    });
    
    // Outer rim (player track)
    ctx.strokeStyle = COLORS.electricCyan;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.electricCyan;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.OUTER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner rim
    ctx.strokeStyle = COLORS.krakenPurple;
    ctx.shadowColor = COLORS.krakenPurple;
    ctx.beginPath();
    ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.INNER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    
    // Highlight current lane
    if (player) {
        const angle1 = getLaneAngle(player.lane - 0.5);
        const angle2 = getLaneAngle(player.lane + 0.5);
        
        ctx.fillStyle = 'rgba(0, 245, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(
            CONFIG.CENTER_X + Math.cos(angle1) * CONFIG.INNER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle1) * CONFIG.INNER_RADIUS
        );
        ctx.lineTo(
            CONFIG.CENTER_X + Math.cos(angle1) * CONFIG.OUTER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle1) * CONFIG.OUTER_RADIUS
        );
        ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.OUTER_RADIUS, angle1, angle2);
        ctx.lineTo(
            CONFIG.CENTER_X + Math.cos(angle2) * CONFIG.INNER_RADIUS,
            CONFIG.CENTER_Y + Math.sin(angle2) * CONFIG.INNER_RADIUS
        );
        ctx.arc(CONFIG.CENTER_X, CONFIG.CENTER_Y, CONFIG.INNER_RADIUS, angle2, angle1, true);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// ==================== WAVE MANAGEMENT ====================
function startWave(waveNum) {
    wave = waveNum;
    // Improved difficulty scaling:
    // Wave 1: 8 enemies, Wave 5: 20, Wave 10: 35, Wave 15: 50
    // Formula: 5 + wave*2 + floor(wave/5)*5
    enemiesThisWave = 5 + waveNum * 2 + Math.floor(waveNum / 5) * 5;
    enemiesSpawned = 0;
    spawnTimer = 0;
    superZapperCharges = 2;  // Replenish Ink Cloud charges each wave
    updateUI();

    // Show wave announcement
    const announce = document.getElementById('waveAnnounce');
    announce.textContent = `WAVE ${waveNum}`;
    announce.style.display = 'block';
    announce.style.animation = 'none';
    announce.offsetHeight;
    announce.style.animation = 'waveIn 2s ease-out forwards';
    
    if (waveNum > 1) {
        Audio.voiceLevelComplete();
    }
    
    setTimeout(() => {
        announce.style.display = 'none';
    }, 2000);
}

function spawnWaveEnemy() {
    // Progressive enemy unlock system with weighted spawning
    // Earlier enemies remain common; newer enemies are rarer but more dangerous
    const enemyPool = [];

    // Always available
    enemyPool.push({ type: 'crab', weight: 10 });

    // Wave 2+: Starfish (Tanker - splits)
    if (wave >= 2) enemyPool.push({ type: 'starfish', weight: 8 });

    // Wave 3+: Jellyfish (area pulse) and Sea Urchin (spikes)
    if (wave >= 3) {
        enemyPool.push({ type: 'jellyfish', weight: 6 });
        enemyPool.push({ type: 'urchin', weight: 5 });
    }

    // Wave 4+: Eel (electric) and Puffer Fish (evasive)
    if (wave >= 4) {
        enemyPool.push({ type: 'eel', weight: 5 });
        enemyPool.push({ type: 'pufferfish', weight: 4 });
    }

    // Wave 5+: Anglerfish (chaser)
    if (wave >= 5) enemyPool.push({ type: 'anglerfish', weight: 4 });

    // Wave 6+: Hermit Crab (Flipper - hops at rim)
    if (wave >= 6) enemyPool.push({ type: 'hermitcrab', weight: 3 });

    // Wave 8+: Increase dangerous enemy weights
    if (wave >= 8) {
        enemyPool.forEach(e => {
            if (['eel', 'anglerfish', 'hermitcrab'].includes(e.type)) {
                e.weight += 2;
            }
        });
    }

    // Wave 10+: Even more dangerous enemies
    if (wave >= 10) {
        enemyPool.forEach(e => {
            if (['eel', 'anglerfish', 'hermitcrab', 'urchin'].includes(e.type)) {
                e.weight += 2;
            }
            // Reduce basic enemies
            if (e.type === 'crab') e.weight = Math.max(3, e.weight - 3);
        });
    }

    // Calculate total weight and select
    const totalWeight = enemyPool.reduce((sum, e) => sum + e.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedType = 'crab';

    for (const e of enemyPool) {
        rand -= e.weight;
        if (rand <= 0) {
            selectedType = e.type;
            break;
        }
    }

    spawnEnemy(selectedType);
    enemiesSpawned++;
}

function updateWave(dt) {
    const spawnRate = Math.max(CONFIG.MIN_SPAWN_RATE, CONFIG.BASE_SPAWN_RATE - wave * CONFIG.SPAWN_RATE_DECREASE);
    spawnTimer -= dt;
    
    if (spawnTimer <= 0 && enemiesSpawned < enemiesThisWave) {
        spawnWaveEnemy();
        spawnTimer = spawnRate;
    }
    
    if (enemiesSpawned >= enemiesThisWave && enemies.length === 0) {
        startWave(wave + 1);
    }
}

// ==================== GAME STATE ====================
function playerHit() {
    if (player.invincible > 0 || godMode) return;
    
    lives--;
    updateUI();
    
    const pos = getPositionOnLane(player.lane, CONFIG.PLAYER_DEPTH);
    Particles.explode(pos.x, pos.y, COLORS.electricCyan, 30, 200, 0.6);
    Audio.hit();
    
    if (lives <= 0) {
        gameOver();
    } else {
        player.invincible = CONFIG.INVINCIBLE_TIME;
        Audio.shieldDown();
    }
}

function resetGame() {
    score = 0;
    lives = 3;
    wave = 0;
    player = createPlayer();
    enemies = [];
    projectiles = [];
    electricLanes = [];
    spikes = [];
    powerUps = [];
    inkCloudActive = 0;
    superZapperCharges = 2;  // Start with 2 charges
    Particles.clear();
    gameTime = 0;
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('finalScore').textContent = score;
    showScreen('gameoverScreen');
    Audio.voiceGameOver();
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('wave').textContent = wave;
    document.getElementById('lives').textContent = lives;
    const inkEl = document.getElementById('inkCharges');
    if (inkEl) inkEl.textContent = superZapperCharges;
}

// ==================== GAME OBJECT ====================
const Game = {
    start() {
        gameState = 'playing';
        resetGame();
        showScreen(null);
        showTouchControls();  // Show touch controls on mobile
        Audio.init();
        Audio.playGameMusic('krakens-tempest');
        setTimeout(() => Audio.voiceBegin(), 500);
        startWave(1);
    },

    restart() {
        this.start();
    },

    pause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            showScreen('pauseScreen');
            hideTouchControls();  // Hide touch controls when paused
            Audio.pauseMusic();
        }
    },

    resume() {
        if (gameState === 'paused') {
            gameState = 'playing';
            showScreen(null);
            showTouchControls();  // Show touch controls again
            Audio.resumeMusic();
        }
    },

    quit() {
        hideTouchControls();  // Hide touch controls
        Audio.stopMusic();
        window.location.href = '/arkade/';
    },
    
    toggleSecretMenu() {
        secretMenuOpen = !secretMenuOpen;
        document.getElementById('secretMenu').classList.toggle('hidden', !secretMenuOpen);
    },
    
    toggleGodMode() {
        godMode = !godMode;
        console.log('God Mode:', godMode ? 'ON' : 'OFF');
    },
    
    warpToLevel(level) {
        wave = parseInt(level) - 1;
        enemies = [];
        projectiles = [];
        electricLanes = [];
        enemiesSpawned = 0;
        startWave(parseInt(level));
    },
    
    spawnTestEnemy() {
        const types = ['crab', 'eel', 'jellyfish', 'starfish', 'anglerfish', 'urchin', 'pufferfish', 'hermitcrab'];
        const type = types[Math.floor(Math.random() * types.length)];
        spawnEnemy(type, player ? Math.round(player.lane) : 0);
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

    if (e.key.toLowerCase() === 'q') {
        if (gameState === 'playing') {
            Game.pause();
        } else {
            Game.quit();
        }
        return;
    }
});

// ==================== TOUCH CONTROLS (Mobile) ====================
let touchState = {
    left: false,
    right: false,
    fire: false,
    inkCloud: false
};

function createTouchControls() {
    // Check if touch device
    if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0) return;

    // Create touch control overlay
    const touchOverlay = document.createElement('div');
    touchOverlay.id = 'tempest-touch-controls';
    touchOverlay.innerHTML = `
        <style>
            #tempest-touch-controls {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 180px;
                pointer-events: none;
                z-index: 9000;
                display: none;
            }
            #tempest-touch-controls.active {
                display: block;
            }
            .tempest-touch-btn {
                position: absolute;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Orbitron', monospace;
                font-weight: bold;
                pointer-events: auto;
                touch-action: none;
                user-select: none;
                transition: transform 0.1s;
            }
            .tempest-touch-btn.pressed {
                transform: scale(0.92);
            }
            /* Left/Right arc buttons */
            #tempest-btn-left {
                left: 15px;
                bottom: 30px;
                width: 100px;
                height: 100px;
                background: rgba(0, 255, 255, 0.15);
                border: 3px solid rgba(0, 255, 255, 0.5);
                color: rgba(0, 255, 255, 0.8);
                font-size: 36px;
            }
            #tempest-btn-left.pressed {
                background: rgba(0, 255, 255, 0.4);
                border-color: #0ff;
                color: #fff;
            }
            #tempest-btn-right {
                left: 130px;
                bottom: 30px;
                width: 100px;
                height: 100px;
                background: rgba(0, 255, 255, 0.15);
                border: 3px solid rgba(0, 255, 255, 0.5);
                color: rgba(0, 255, 255, 0.8);
                font-size: 36px;
            }
            #tempest-btn-right.pressed {
                background: rgba(0, 255, 255, 0.4);
                border-color: #0ff;
                color: #fff;
            }
            /* Fire button */
            #tempest-btn-fire {
                right: 15px;
                bottom: 30px;
                width: 110px;
                height: 110px;
                background: rgba(255, 50, 50, 0.2);
                border: 3px solid rgba(255, 100, 100, 0.6);
                color: rgba(255, 100, 100, 0.9);
                font-size: 14px;
            }
            #tempest-btn-fire.pressed {
                background: rgba(255, 50, 50, 0.5);
                border-color: #ff4444;
                color: #fff;
            }
            /* Ink Cloud (SuperZapper) button */
            #tempest-btn-ink {
                right: 140px;
                bottom: 50px;
                width: 70px;
                height: 70px;
                background: rgba(123, 44, 191, 0.2);
                border: 2px solid rgba(123, 44, 191, 0.6);
                color: rgba(180, 100, 220, 0.9);
                font-size: 11px;
            }
            #tempest-btn-ink.pressed {
                background: rgba(123, 44, 191, 0.5);
                border-color: #7b2cbf;
                color: #fff;
            }
            /* Hide on desktop */
            @media (pointer: fine) {
                #tempest-touch-controls { display: none !important; }
            }
        </style>
        <div class="tempest-touch-btn" id="tempest-btn-left">◀</div>
        <div class="tempest-touch-btn" id="tempest-btn-right">▶</div>
        <div class="tempest-touch-btn" id="tempest-btn-fire">FIRE</div>
        <div class="tempest-touch-btn" id="tempest-btn-ink">INK</div>
    `;
    document.body.appendChild(touchOverlay);

    // Touch handlers
    const setupTouchButton = (id, stateKey, onPress) => {
        const btn = document.getElementById(id);
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('pressed');
            touchState[stateKey] = true;
            if (onPress) onPress();
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('pressed');
            touchState[stateKey] = false;
        });
        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('pressed');
            touchState[stateKey] = false;
        });
    };

    setupTouchButton('tempest-btn-left', 'left');
    setupTouchButton('tempest-btn-right', 'right');
    setupTouchButton('tempest-btn-fire', 'fire');
    setupTouchButton('tempest-btn-ink', 'inkCloud', () => {
        if (gameState === 'playing') activateInkCloud();
    });
}

function showTouchControls() {
    const el = document.getElementById('tempest-touch-controls');
    if (el) el.classList.add('active');
}

function hideTouchControls() {
    const el = document.getElementById('tempest-touch-controls');
    if (el) el.classList.remove('active');
}

// ==================== HELPER FUNCTIONS ====================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (screenId) {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

// ==================== GAME LOOP ====================
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    Input.update();
    
    // Clear
    ctx.fillStyle = COLORS.abyssBlack;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Always draw playfield and kraken
    swirlAngle += dt * 0.5;  // Rotate tempest effect
    drawPlayfield();
    drawKraken();

    if (gameState === 'playing') {
        gameTime += dt;

        updatePlayer(dt);
        updateEnemies(dt);
        updateProjectiles(dt);
        updateElectricLanes(dt);
        updateSpikes(dt);           // NEW: Update spike obstacles
        updateInkCloud(dt);         // NEW: Update ink cloud effect
        checkSpikeCollisions();     // NEW: Check spike collisions
        Particles.update(dt);
        updateWave(dt);

        drawSpikes();               // NEW: Draw spike obstacles
        drawElectricLanes();
        drawEnemies();
        drawProjectiles();
        drawPlayer();
        drawInkCloud();             // NEW: Draw ink cloud effect (on top)
        Particles.draw(ctx);
    } else {
        // Ambient particles on menu screens
        Particles.update(dt);
        Particles.draw(ctx);
        
        if (Math.random() < 0.1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = randomRange(CONFIG.INNER_RADIUS, CONFIG.OUTER_RADIUS);
            Particles.sparks(
                CONFIG.CENTER_X + Math.cos(angle) * radius,
                CONFIG.CENTER_Y + Math.sin(angle) * radius,
                Math.random() < 0.5 ? COLORS.krakenPurple : COLORS.electricCyan,
                1
            );
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZATION ====================
Input.init();  // REQUIRED: Initialize input system
createTouchControls();  // Create mobile touch controls
showScreen('menuScreen');
requestAnimationFrame(gameLoop);

console.log('🦑 Kraken\'s Tempest loaded');
console.log('🔧 Press ` for secret menu');
console.log('📱 Touch controls: Left/Right to move, FIRE to shoot, INK for screen clear (2 per wave)');
