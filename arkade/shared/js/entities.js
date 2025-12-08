// ============================================================================
// KRAKEN ARKADE - SHARED ENTITIES MODULE
// Base entity classes for players, enemies, bullets, etc.
// ============================================================================

// ==================== BASE ENTITY ====================

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 10;
        this.width = 20;
        this.height = 20;
        this.dead = false;
        this.hp = 1;
        this.maxHP = 1;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    draw(ctx) {
        // Override in subclass
        ctx.fillStyle = '#f0f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.dead = true;
        }
        return this.dead;
    }
    
    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHP);
    }
    
    getHPPercent() {
        return this.hp / this.maxHP;
    }
}

// ==================== BULLET ====================

class Bullet extends Entity {
    constructor(x, y, angle = -Math.PI / 2, speed = 700) {
        super(x, y);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = 4;
        this.life = 2;
        this.damage = 1;
        this.color = '#ffff88';
        this.trailColor = '#ffff44';
    }
    
    update(dt) {
        super.update(dt);
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }
    
    draw(ctx) {
        // Glow trail
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x - this.vx * 0.02, this.y - this.vy * 0.02
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.015, this.y - this.vy * 0.015);
        ctx.stroke();
        
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== POWERUP ====================

class Powerup extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type; // { id, icon, color, duration }
        this.vy = 60;
        this.radius = 15;
        this.pulse = 0;
        this.angle = 0;
    }
    
    update(dt) {
        super.update(dt);
        this.pulse += dt * 5;
        this.angle += dt * 2;
    }
    
    // Called when magnet is active
    attractTo(targetX, targetY, dt, range = 250, strength = 400) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range) {
            const force = (range - dist) / range * strength;
            this.x += (dx / dist) * force * dt;
            this.y += (dy / dist) * force * dt;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const scale = 1 + Math.sin(this.pulse) * 0.1;
        ctx.scale(scale, scale);
        
        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.type.color;
        
        // Container (diamond shape)
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(15, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Icon
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 1);
        
        ctx.restore();
    }
}

// ==================== LOOT / COLLECTIBLE ====================

class Loot extends Entity {
    constructor(x, y, value = 1, type = 'common') {
        super(x, y);
        this.value = value;
        this.type = type; // 'common' or 'rare'
        this.vy = 40;
        this.vx = (Math.random() - 0.5) * 30;
        this.pulse = Math.random() * Math.PI * 2;
        this.radius = 8;
    }
    
    update(dt) {
        super.update(dt);
        this.pulse += dt * 6;
    }
    
    attractTo(targetX, targetY, dt, range = 300, strength = 500) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range) {
            const force = (range - dist) / range * strength;
            this.x += (dx / dist) * force * dt;
            this.y += (dy / dist) * force * dt;
        }
    }
    
    draw(ctx) {
        const color = this.type === 'rare' ? '#44ffff' : '#ffdd44';
        const scale = 1 + Math.sin(this.pulse) * 0.2;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        
        if (this.type === 'rare') {
            // Diamond
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            // Crystal
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(6, -3);
            ctx.lineTo(6, 6);
            ctx.lineTo(0, 10);
            ctx.lineTo(-6, 6);
            ctx.lineTo(-6, -3);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ==================== ENTITY MANAGER ====================

const EntityManager = {
    // Arrays for different entity types
    bullets: [],
    enemies: [],
    powerups: [],
    loots: [],
    
    // Clear all
    clearAll() {
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.loots = [];
    },
    
    // Update all
    updateAll(dt) {
        this.bullets.forEach(b => b.update(dt));
        this.enemies.forEach(e => e.update(dt));
        this.powerups.forEach(p => p.update(dt));
        this.loots.forEach(l => l.update(dt));
    },
    
    // Clean up dead entities
    cleanup() {
        this.bullets = this.bullets.filter(b => !b.dead);
        this.enemies = this.enemies.filter(e => !e.dead);
        this.powerups = this.powerups.filter(p => !p.dead);
        this.loots = this.loots.filter(l => !l.dead);
    },
    
    // Draw all (in correct order)
    drawAll(ctx) {
        this.loots.forEach(l => l.draw(ctx));
        this.powerups.forEach(p => p.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.bullets.forEach(b => b.draw(ctx));
    },
    
    // Spawn helpers
    spawnBullet(x, y, angle, speed) {
        this.bullets.push(new Bullet(x, y, angle, speed));
    },
    
    spawnPowerup(x, y, type) {
        this.powerups.push(new Powerup(x, y, type));
    },
    
    spawnLoot(x, y, value, type) {
        this.loots.push(new Loot(x, y, value, type));
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, Bullet, Powerup, Loot, EntityManager };
}
