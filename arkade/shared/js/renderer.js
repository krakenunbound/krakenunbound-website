// ============================================================================
// KRAKEN ARKADE - SHARED RENDERER MODULE
// Screen shake, star field, canvas rendering helpers
// ============================================================================

// ==================== SCREEN SHAKE ====================

const ScreenShake = {
    intensity: 0,
    x: 0,
    y: 0,
    decay: 0.9,
    
    add(amount) {
        this.intensity = Math.max(this.intensity, amount);
    },
    
    update(dt) {
        if (this.intensity > 0.5) {
            this.x = (Math.random() - 0.5) * this.intensity * 2;
            this.y = (Math.random() - 0.5) * this.intensity * 2;
            this.intensity *= this.decay;
        } else {
            this.intensity = 0;
            this.x = 0;
            this.y = 0;
        }
    },
    
    apply(ctx) {
        ctx.translate(this.x, this.y);
    },
    
    reset() {
        this.intensity = 0;
        this.x = 0;
        this.y = 0;
    }
};

// ==================== STAR FIELD ====================

class Star {
    constructor(width, height, y = null) {
        this.width = width;
        this.height = height;
        this.x = Math.random() * width;
        this.y = y !== null ? y : Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speed = (3 - this.size) * 20 + 10;
        this.brightness = Math.random() * 0.5 + 0.3;
        this.twinkle = Math.random() * Math.PI * 2;
    }
    
    update(dt, scrollSpeed = 80) {
        this.y += this.speed * dt * (scrollSpeed / 80);
        this.twinkle += dt * 3;
        if (this.y > this.height) {
            this.y = -5;
            this.x = Math.random() * this.width;
        }
    }
    
    // For horizontal scrollers
    updateHorizontal(dt, scrollSpeed = 80) {
        this.x -= this.speed * dt * (scrollSpeed / 80);
        this.twinkle += dt * 3;
        if (this.x < 0) {
            this.x = this.width + 5;
            this.y = Math.random() * this.height;
        }
    }
    
    draw(ctx) {
        const alpha = this.brightness * (0.7 + Math.sin(this.twinkle) * 0.3);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

const StarField = {
    stars: [],
    
    init(count, width, height) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push(new Star(width, height));
        }
    },
    
    update(dt, scrollSpeed = 80, horizontal = false) {
        this.stars.forEach(s => {
            if (horizontal) {
                s.updateHorizontal(dt, scrollSpeed);
            } else {
                s.update(dt, scrollSpeed);
            }
        });
    },
    
    draw(ctx) {
        this.stars.forEach(s => s.draw(ctx));
    },
    
    clear() {
        this.stars = [];
    }
};

// ==================== RENDERING HELPERS ====================

const Renderer = {
    
    // Draw a gradient background
    drawBackground(ctx, width, height, color1, color2, angle = 135) {
        const rad = angle * Math.PI / 180;
        const x1 = width / 2 - Math.cos(rad) * width;
        const y1 = height / 2 - Math.sin(rad) * height;
        const x2 = width / 2 + Math.cos(rad) * width;
        const y2 = height / 2 + Math.sin(rad) * height;
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    },
    
    // Draw radial glow
    drawGlow(ctx, x, y, innerRadius, outerRadius, color, alpha = 0.5) {
        const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
        gradient.addColorStop(0, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        ctx.fill();
    },
    
    // Draw a health bar
    drawHealthBar(ctx, x, y, width, height, percent, bgColor = '#333', fgColor = '#0f0', borderColor = '#fff') {
        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
        
        // Fill
        const fillWidth = width * Math.max(0, Math.min(1, percent));
        ctx.fillStyle = fgColor;
        ctx.fillRect(x, y, fillWidth, height);
        
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    },
    
    // Draw a progress bar (vertical)
    drawProgressBarVertical(ctx, x, y, width, height, percent, bgColor = '#333', fgColor = '#0ff') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
        
        const fillHeight = height * Math.max(0, Math.min(1, percent));
        ctx.fillStyle = fgColor;
        ctx.fillRect(x, y + height - fillHeight, width, fillHeight);
    },
    
    // Draw text with shadow/glow
    drawText(ctx, text, x, y, font = '16px monospace', color = '#fff', shadowColor = null, shadowBlur = 0) {
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (shadowColor && shadowBlur > 0) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
        }
        
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        
        ctx.shadowBlur = 0;
    },
    
    // Draw text with outline
    drawTextOutlined(ctx, text, x, y, font = '16px monospace', fillColor = '#fff', strokeColor = '#000', lineWidth = 2) {
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeText(text, x, y);
        
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
    },
    
    // Flash effect (screen-wide)
    drawFlash(ctx, width, height, color, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
    },
    
    // Vignette effect
    drawVignette(ctx, width, height, intensity = 0.5) {
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    },
    
    // Scanline effect
    drawScanlines(ctx, width, height, alpha = 0.1, gap = 2) {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        for (let y = 0; y < height; y += gap * 2) {
            ctx.fillRect(0, y, width, gap);
        }
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScreenShake, Star, StarField, Renderer };
}
