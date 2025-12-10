// Ad Astra - Star Kraken Mini-Game
// starkraken-minigame.js - Simplified 3D Space Combat based on 'Star Kraken'

class StarKrakenMinigame {
    constructor(game) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        this.audioCtx = null;

        this.state = 'idle';
        this.onComplete = null;

        this.CONFIG = {
            WIDTH: 800,
            HEIGHT: 600,
            FOV: 60,
            VIEW_DIST: 2000,
            SPEED: 200,
            LASER_SPEED: 1800
        };

        this.player = {
            x: 0, y: 0,
            health: 100,
            invuln: 0,
            energy: 100
        };

        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.stars = [];
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };

        this.kills = 0;
        this.targetKills = 5;
    }

    start(difficulty, onComplete) {
        this.targetKills = 5 + (difficulty || 1) * 2;
        this.onComplete = onComplete;

        this.createUI();
        this.initAudio();
        this.resetGame();

        this.state = 'start';
        this.lastTime = performance.now();
        this.bindInput();
        this.loop(this.lastTime);
    }

    resetGame() {
        this.player.x = 0;
        this.player.y = 0;
        this.player.health = 100;
        this.player.energy = 100;
        this.kills = 0;

        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.stars = [];

        // Stars
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * 4000,
                y: (Math.random() - 0.5) * 4000,
                z: Math.random() * this.CONFIG.VIEW_DIST
            });
        }
    }

    createUI() {
        this.destroy(); // Cleanup

        this.container = document.createElement('div');
        this.container.id = 'starkraken-minigame-container';
        this.container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9000;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.9);';

        this.container.innerHTML = `
            <div id="sk-game-box" style="position:relative;width:${this.CONFIG.WIDTH}px;height:${this.CONFIG.HEIGHT}px;border:2px solid #0ff;box-shadow:0 0 40px rgba(0,255,255,0.2);">
                <canvas id="sk-canvas" width="${this.CONFIG.WIDTH}" height="${this.CONFIG.HEIGHT}" style="background:#000;display:block;"></canvas>
                
                <!-- HUD -->
                <div style="position:absolute;top:20px;left:20px;right:20px;display:flex;justify-content:space-between;pointer-events:none;font-family:'Courier New',monospace;font-size:18px;font-weight:bold;text-shadow:0 0 5px #0ff;color:#0ff;">
                    <div>SHIELDS: <span id="sk-hp">100%</span></div>
                    <div>TARGETS: <span id="sk-kills">0/${this.targetKills}</span></div>
                    <div>ENERGY: <span id="sk-nrg">100%</span></div>
                </div>

                <!-- OVERLAYS -->
                <div id="screen-start" style="position:absolute;inset:0;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                    <h1 style="font-size:42px;color:#0ff;text-shadow:0 0 20px #0ff;margin-bottom:10px">STAR KRAKEN DEFENSE</h1>
                    <p style="color:#aaa;margin-bottom:30px">Intercept enemy fighters.</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:left;margin-bottom:40px;font-family:monospace;color:#ccc">
                        <div>⬆️⬇️⬅️➡️ Track Targets</div>
                        <div>SPACE Fire Lasers</div>
                    </div>
                    <button id="btn-start" style="padding:15px 40px;background:rgba(0,255,255,0.2);border:2px solid #0ff;color:#0ff;font-size:20px;cursor:pointer;text-shadow:0 0 5px #0ff;">LAUNCH</button>
                </div>

                 <div id="screen-gameover" style="position:absolute;inset:0;background:rgba(50,0,0,0.9);display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                    <h1 style="font-size:48px;color:#f00;text-shadow:0 0 20px #f00;">CRITICAL FAILURE</h1>
                    <button id="btn-fail" style="margin-top:30px;padding:12px 30px;background:transparent;border:2px solid #f00;color:#f00;cursor:pointer;font-family:monospace;font-size:18px;">EJECT</button>
                </div>

                <div id="screen-victory" style="position:absolute;inset:0;background:rgba(0,0,50,0.9);display:none;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
                    <h1 style="font-size:48px;color:#0ff;text-shadow:0 0 20px #0ff;">SECTOR SECURE</h1>
                    <button id="btn-win" style="margin-top:30px;padding:12px 30px;background:rgba(0,255,255,0.2);border:2px solid #0ff;color:#0ff;cursor:pointer;font-family:monospace;font-size:18px;">PROCEED</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);
        this.canvas = document.getElementById('sk-canvas');
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
        // Player Movement (Simulates turning ship)
        if (this.keys.ArrowLeft) this.player.x -= this.CONFIG.SPEED * dt;
        if (this.keys.ArrowRight) this.player.x += this.CONFIG.SPEED * dt;
        if (this.keys.ArrowUp) this.player.y -= this.CONFIG.SPEED * dt;
        if (this.keys.ArrowDown) this.player.y += this.CONFIG.SPEED * dt;

        this.player.energy = Math.min(100, this.player.energy + 5 * dt);

        // Fire
        if (this.keys.Space && this.player.energy > 5) {
            // Check debouce
            if (!this.lastFire || Date.now() - this.lastFire > 200) {
                this.fire();
                this.lastFire = Date.now();
            }
        }

        // Spawn Enemies
        if (this.enemies.length < 3 && Math.random() < 0.02) {
            this.spawnEnemy();
        }

        // Update Entities
        // Stars
        this.stars.forEach(s => {
            s.z -= 100 * dt; // Forward motion
            if (s.z <= 0) {
                s.z = this.CONFIG.VIEW_DIST;
                s.x = (Math.random() - 0.5) * 4000 + this.player.x;
                s.y = (Math.random() - 0.5) * 4000 + this.player.y;
            }
        });

        // Bullets
        this.bullets.forEach(b => {
            b.x += b.dx * b.speed * dt;
            b.y += b.dy * b.speed * dt;
            b.z += b.dz * b.speed * dt;
            b.life -= dt;
        });
        this.bullets = this.bullets.filter(b => b.life > 0);

        // Enemies
        this.enemies.forEach(e => {
            e.z -= 150 * dt; // Move toward player
            // AI: Adjust X/Y to "aim" at player (0,0 relative)
            const ex = e.x - this.player.x;
            const ey = e.y - this.player.y;

            // Simple bobbing
            e.x += Math.sin(Date.now() * 0.002 + e.id) * 50 * dt;

            if (e.z <= 0) {
                e.dead = true; // Passed player
                this.playerHit(10);
            }
        });
        this.enemies = this.enemies.filter(e => !e.dead);

        // Particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        // Collisions
        this.bullets.forEach(b => {
            this.enemies.forEach(e => {
                if (!b.dead && !e.dead && this.checkHit(b, e)) {
                    b.dead = true;
                    this.hitEnemy(e);
                }
            });
        });

        // HUD
        document.getElementById('sk-hp').innerText = Math.floor(this.player.health) + '%';
        document.getElementById('sk-hp').style.color = this.player.health < 30 ? '#f00' : '#0ff';
        document.getElementById('sk-nrg').innerText = Math.floor(this.player.energy) + '%';
        document.getElementById('sk-kills').innerText = this.kills + '/' + this.targetKills;

        if (this.kills >= this.targetKills && this.state === 'playing') {
            this.victory();
        }
    }

    fire() {
        this.player.energy -= 5;
        this.playSound('shoot');
        // Shoots from bottom corners converging to center
        this.bullets.push({
            x: this.player.x + 20, y: this.player.y + 20, z: 0,
            dx: 0, dy: 0, dz: 1, // Straight forward in world space
            speed: this.CONFIG.LASER_SPEED,
            life: 2,
            dead: false
        });
        this.bullets.push({
            x: this.player.x - 20, y: this.player.y + 20, z: 0,
            dx: 0, dy: 0, dz: 1,
            speed: this.CONFIG.LASER_SPEED,
            life: 2,
            dead: false
        });
    }

    spawnEnemy() {
        this.enemies.push({
            id: Math.random(),
            x: this.player.x + (Math.random() - 0.5) * 1000,
            y: this.player.y + (Math.random() - 0.5) * 800,
            z: this.CONFIG.VIEW_DIST,
            hp: 3,
            dead: false,
            color: Math.random() < 0.3 ? '#f00' : '#ff0'
        });
    }

    hitEnemy(e) {
        e.hp--;
        this.spawnExplosion(e.x, e.y, e.z, 5, e.color);
        this.playSound('hit');
        if (e.hp <= 0) {
            e.dead = true;
            this.kills++;
            this.forceSyncKills(); // Visual update
            this.spawnExplosion(e.x, e.y, e.z, 20, '#fff');
            this.playSound('explode');
        }
    }

    forceSyncKills() {
        document.getElementById('sk-kills').innerText = this.kills + '/' + this.targetKills;
    }

    playerHit(dmg) {
        this.player.health -= dmg;
        this.playSound('damage');
        this.spawnExplosion(this.player.x, this.player.y, 10, 10, '#f00'); // Screen shake/flash in future
        if (this.player.health <= 0) {
            this.state = 'gameover';
            document.getElementById('screen-gameover').style.display = 'flex';
        }
    }

    spawnExplosion(x, y, z, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * 6.28;
            const speed = Math.random() * 100;
            this.particles.push({
                x: x, y: y, z: z,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: (Math.random() - 0.5) * 100,
                color: color,
                life: 0.5 + Math.random() * 0.5
            });
        }
    }

    project(x, y, z) {
        if (z <= 0) return null;
        // Relative to player
        const rx = x - this.player.x;
        const ry = y - this.player.y;

        const scale = this.CONFIG.FOV / z;
        return {
            x: this.CONFIG.WIDTH / 2 + rx * scale,
            y: this.CONFIG.HEIGHT / 2 + ry * scale,
            scale: scale
        };
    }

    checkHit(b, e) {
        // 3D Distance check
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dz = b.z - e.z;
        // Hitbox size (approx 50 units wide)
        return (Math.sqrt(dx * dx + dy * dy + dz * dz) < 60);
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.CONFIG.WIDTH, this.CONFIG.HEIGHT);

        // Stars
        this.stars.forEach(s => {
            const p = this.project(s.x, s.y, s.z);
            if (p) {
                const sz = Math.max(1, 2 * p.scale);
                ctx.fillStyle = '#fff';
                ctx.fillRect(p.x, p.y, sz, sz);
            }
        });

        // Bullets
        this.bullets.forEach(b => {
            const p = this.project(b.x, b.y, b.z);
            if (p) {
                ctx.fillStyle = '#0ff';
                const sz = Math.max(2, 5 * p.scale);
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Enemies
        // Sort by Z (painter's algo)
        const renderList = [...this.enemies, ...this.particles].sort((a, b) => b.z - a.z);

        renderList.forEach(e => {
            const p = this.project(e.x, e.y, e.z);
            if (!p) return;

            if (e.hp !== undefined) { // Enemy
                const sz = 60 * p.scale;
                ctx.save();
                ctx.translate(p.x, p.y);

                // Wireframe Ship
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -sz);
                ctx.lineTo(sz, sz);
                ctx.lineTo(0, sz * 0.5);
                ctx.lineTo(-sz, sz);
                ctx.closePath();
                ctx.stroke();

                // Core glow
                ctx.fillStyle = e.color;
                ctx.globalAlpha = 0.2;
                ctx.fill();

                ctx.restore();
            } else { // Particle
                ctx.globalAlpha = e.life;
                ctx.fillStyle = e.color;
                const sz = 10 * p.scale;
                ctx.fillRect(p.x, p.y, sz, sz);
            }
        });

        ctx.globalAlpha = 1;

        // Reticle
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.CONFIG.WIDTH / 2, this.CONFIG.HEIGHT / 2, 20, 0, Math.PI * 2);
        ctx.moveTo(this.CONFIG.WIDTH / 2 - 30, this.CONFIG.HEIGHT / 2);
        ctx.lineTo(this.CONFIG.WIDTH / 2 + 30, this.CONFIG.HEIGHT / 2);
        ctx.moveTo(this.CONFIG.WIDTH / 2, this.CONFIG.HEIGHT / 2 - 30);
        ctx.lineTo(this.CONFIG.WIDTH / 2, this.CONFIG.HEIGHT / 2 + 30);
        ctx.stroke();
    }

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
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(880, t);
                osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;
            case 'hit':
                osc.type = 'square';
                osc.frequency.setValueAtTime(120, t);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.05);
                osc.start(t); osc.stop(t + 0.05);
                break;
            case 'explode':
                osc.type = 'noise'; // simplified
                osc.frequency.setValueAtTime(100, t);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t); osc.stop(t + 0.3);
                break;
        }
    }

    bindInput() {
        this._down = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            if (e.code === 'ArrowUp') this.keys.ArrowUp = true;
            if (e.code === 'ArrowDown') this.keys.ArrowDown = true;
            if (e.code === 'ArrowLeft') this.keys.ArrowLeft = true;
            if (e.code === 'ArrowRight') this.keys.ArrowRight = true;
            if (e.code === 'Space') this.keys.Space = true;
        };
        this._up = (e) => {
            if (e.code === 'ArrowUp') this.keys.ArrowUp = false;
            if (e.code === 'ArrowDown') this.keys.ArrowDown = false;
            if (e.code === 'ArrowLeft') this.keys.ArrowLeft = false;
            if (e.code === 'ArrowRight') this.keys.ArrowRight = false;
            if (e.code === 'Space') this.keys.Space = false;
        };
        window.addEventListener('keydown', this._down);
        window.addEventListener('keyup', this._up);
    }

    unbindInput() {
        window.removeEventListener('keydown', this._down);
        window.removeEventListener('keyup', this._up);
    }

    finish(success) {
        this.destroy();
        if (this.onComplete) {
            this.onComplete({
                success: success,
                kills: this.kills,
                hullDamage: 100 - this.player.health
            });
        }
    }
}

window.StarKrakenMinigame = StarKrakenMinigame;
export default StarKrakenMinigame;
