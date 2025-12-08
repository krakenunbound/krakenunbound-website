// ============================================================================
// KRAKEN ARKADE - SHARED PARTICLES MODULE
// Particle system for explosions, trails, and effects
// ============================================================================

class Particle {
    constructor(x, y, vx, vy, color, life = 1, size = 3) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.gravity = 50; // Default gravity
        this.friction = 1; // No friction by default
        this.fadeOut = true;
        this.shrink = false;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= dt;
    }
    
    draw(ctx) {
        const alpha = this.fadeOut ? (this.life / this.maxLife) : 1;
        const size = this.shrink ? this.size * (this.life / this.maxLife) : this.size;
        
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
        ctx.globalAlpha = 1;
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// Particle manager
const Particles = {
    particles: [],
    
    // ==================== MANAGEMENT ====================
    
    clear() {
        this.particles = [];
    },
    
    update(dt) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.isDead());
    },
    
    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    },
    
    count() {
        return this.particles.length;
    },
    
    // ==================== SPAWNERS ====================
    
    // Generic explosion
    explode(x, y, color, count = 15, speed = 200, life = 0.5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * speed + speed * 0.25;
            const p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                color,
                Math.random() * life + life * 0.5,
                Math.random() * 4 + 2
            );
            this.particles.push(p);
        }
    },
    
    // Multi-color explosion
    explodeMulti(x, y, colors, count = 20, speed = 200, life = 0.5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * speed + speed * 0.25;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                color,
                Math.random() * life + life * 0.5,
                Math.random() * 4 + 2
            );
            this.particles.push(p);
        }
    },
    
    // Directional burst (for impacts)
    burst(x, y, angle, spread, color, count = 10, speed = 150) {
        for (let i = 0; i < count; i++) {
            const a = angle + (Math.random() - 0.5) * spread;
            const spd = Math.random() * speed + speed * 0.5;
            const p = new Particle(
                x, y,
                Math.cos(a) * spd,
                Math.sin(a) * spd,
                color,
                Math.random() * 0.3 + 0.2,
                Math.random() * 3 + 1
            );
            this.particles.push(p);
        }
    },
    
    // Smoke/debris (slower, floaty)
    smoke(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 30 + 10;
            const p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd - 20,
                color,
                Math.random() * 1 + 0.5,
                Math.random() * 6 + 4
            );
            p.gravity = -10; // Float upward
            p.shrink = true;
            this.particles.push(p);
        }
    },
    
    // Sparks (fast, short-lived)
    sparks(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 300 + 100;
            const p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                color,
                Math.random() * 0.2 + 0.1,
                Math.random() * 2 + 1
            );
            p.gravity = 100;
            this.particles.push(p);
        }
    },
    
    // Trail particle (single, for engine trails etc)
    trail(x, y, color, size = 4, life = 0.3) {
        const p = new Particle(x, y, 0, 0, color, life, size);
        p.gravity = 0;
        p.shrink = true;
        this.particles.push(p);
    },
    
    // Ring explosion (expands outward)
    ring(x, y, color, count = 24, radius = 50, life = 0.3) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const spd = radius / life;
            const p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                color,
                life,
                3
            );
            p.gravity = 0;
            this.particles.push(p);
        }
    },
    
    // Confetti (celebration)
    confetti(x, y, count = 30) {
        const colors = ['#ff0', '#f0f', '#0ff', '#0f0', '#f80', '#08f'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 200 + 100;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd - 100,
                color,
                Math.random() * 2 + 1,
                Math.random() * 4 + 2
            );
            p.gravity = 150;
            this.particles.push(p);
        }
    },
    
    // Underwater bubbles
    bubbles(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            const p = new Particle(
                x + (Math.random() - 0.5) * 20,
                y,
                (Math.random() - 0.5) * 20,
                -Math.random() * 80 - 40,
                'rgba(150, 200, 255, 0.6)',
                Math.random() * 1.5 + 0.5,
                Math.random() * 6 + 3
            );
            p.gravity = -30;
            this.particles.push(p);
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Particle, Particles };
}
