// Ad Astra - Particle Background System
// Starfield with slow rotation and meteors for login screen
// Asteroid field for mining sectors

(function() {
    let canvas, ctx;
    let particles = [];
    let shooting = [];
    let angle = 0;
    let currentMode = 'starfield'; // 'starfield' or 'asteroids'
    
    const count = 150;
    const rotationSpeed = 0.00002; // Slow, dreamy rotation (visible over ~30 seconds)
    const meteorFrequency = 0.3; // 0 = rare, 1 = frequent
    let shootTimer = 0;

    // Set particle mode (starfield or asteroids)
    function setMode(mode) {
        console.log(`🎨 setMode called: requesting '${mode}', current is '${currentMode}'`);
        if (mode === currentMode) {
            console.log(`🎨 Mode already ${mode}, skipping`);
            return;
        }
        console.log(`🎨 Switching particle mode: ${currentMode} → ${mode}`);
        currentMode = mode;
        
        // Clear canvas completely when switching modes
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Clear shooting stars when switching
        shooting = [];
        
        resetParticles();
        console.log(`✅ Particle mode switched to ${mode}, particles reset`);
    }
    
    // Expose API immediately (before init runs)
    window.particleSystem = {
        setMode: setMode
    };
    console.log('✅ Particle system API exposed to window');

    // Initialize particle system
    function init() {
        canvas = document.getElementById('particle-canvas');
        if (!canvas) {
            console.warn('Particle canvas not found');
            return;
        }

        ctx = canvas.getContext('2d');
        
        // Set canvas to full screen
        resize();
        
        // Create initial particles
        resetParticles();
        
        // Start animation loop
        requestAnimationFrame(loop);
        
        // Handle window resize
        window.addEventListener('resize', resize);
        
        console.log('🌌 Starfield initialized');
    }

    // Resize canvas to fill screen
    function resize() {
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Reset transform before scaling (prevents accumulation)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        particles = [];
        resetParticles();
    }

    // Create starfield particles
    function resetParticles() {
        if (!canvas) return;
        
        const w = canvas.width;
        const h = canvas.height;
        
        if (currentMode === 'asteroids') {
            // Generate asteroid particles
            const asteroidCount = 80;
            particles = Array.from({ length: asteroidCount }, () => {
                // Depth (Z-index) for size and speed variation
                const z = Math.random(); 

                // Size: larger and slower if z is small (closer)
                const r_base = Math.random() * 15 + 10;
                const r = r_base * (1 - z * 0.7);

                // Speed: slower with depth
                const sp_base = Math.random() * 0.8 + 0.2;
                const sp = sp_base * (1 - z * 0.6);

                // Movement direction (random angle)
                const ang = Math.random() * Math.PI * 2;
                const vx = Math.cos(ang) * sp;
                const vy = Math.sin(ang) * sp;

                // Random starting position
                const x = Math.random() * w;
                const y = Math.random() * h;

                // Rotation properties
                const rot = Math.random() * Math.PI * 2;
                const rotSpeed_base = (Math.random() - 0.5) * 0.02;
                const rotSpeed = rotSpeed_base * (1 - z * 0.6);

                // Shape generation: Irregular polygon
                const shape = [];
                const n = Math.floor(Math.random() * 5) + 6; // 6 to 10 points
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * Math.PI * 2;
                    const rad = r + (Math.random() - 0.5) * (r * 0.4); 
                    shape.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
                }

                return { x, y, r, sp, vx, vy, rot, rotSpeed, shape, z };
            });
        } else {
            // Generate starfield particles
            particles = Array.from({ length: count }, () => {
                // Stars far outside canvas for rotation effect
                const fieldRadius = Math.hypot(w, h) * 2.5;
                const theta = Math.random() * Math.PI * 2;
                const dist = Math.random() * fieldRadius;
                
                const x = Math.cos(theta) * dist;
                const y = Math.sin(theta) * dist;
                const z = Math.random();
                const r = (Math.random() * 1.5 + 0.5) * (1 - z * 0.6);
                const color = `hsl(0, 0%, ${Math.random() * 40 + 60}%)`;
                
                return { x, y, r, z, color };
            });
        }
    }

    // Create shooting star
    function createShootingStar() {
        const w = canvas.width;
        const h = canvas.height;
        const buffer = 100;
        const skyHeight = h * 0.6; // Top 60% = visible sky
        
        let startX, startY;
        const side = Math.floor(Math.random() * 3); // 0=top, 1=left-sky, 2=right-sky
        
        switch (side) {
            case 0: // TOP
                startX = Math.random() * w;
                startY = -buffer;
                break;
            case 1: // LEFT (sky only)
                startX = -buffer;
                startY = Math.random() * skyHeight;
                break;
            case 2: // RIGHT (sky only)
                startX = w + buffer;
                startY = Math.random() * skyHeight;
                break;
        }
        
        const centerX = w / 2;
        const centerY = h / 2;
        const dx = centerX - startX;
        const dy = centerY - startY;
        const distance = Math.hypot(dx, dy);
        
        const duration = 0.6 + Math.random() * 0.4;
        const pixelsPerFrame = distance / (duration * 60);
        const vx = (dx / distance) * pixelsPerFrame;
        const vy = (dy / distance) * pixelsPerFrame;
        
        const tailLength = 60 + Math.random() * 80;
        const life = Math.ceil(distance / pixelsPerFrame) + 25;
        
        shooting.push({
            x: startX,
            y: startY,
            vx,
            vy,
            tailLength,
            life,
            maxLife: life,
            brightness: 0.8 + Math.random() * 0.2
        });
    }

    // Animation loop
    function loop() {
        if (!ctx || !canvas) {
            requestAnimationFrame(loop);
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;  // Use display dimensions, not canvas buffer
        const h = canvas.height / dpr;

        // FULL CLEAR - no trails (clear the full canvas buffer)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);  // Reset transform for clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        
        if (currentMode === 'asteroids') {
            // ASTEROID MODE: No rotation, simple drift
            
            // Sort by z-index (closer ones on top)
            particles.sort((a, b) => a.z - b.z);
            
            for (const p of particles) {
                // Update position
                p.x += p.vx * 0.6; // Speed multiplier
                p.y += p.vy * 0.6;
                p.rot += p.rotSpeed * 0.6;
                
                // Wrap around screen
                if (p.x < -p.r * 2) p.x = w + p.r * 2;
                else if (p.x > w + p.r * 2) p.x = -p.r * 2;
                if (p.y < -p.r * 2) p.y = h + p.r * 2;
                else if (p.y > h + p.r * 2) p.y = -p.r * 2;
                
                // Draw asteroid
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                
                ctx.beginPath();
                ctx.moveTo(p.shape[0].x, p.shape[0].y);
                for (let i = 1; i < p.shape.length; i++) {
                    ctx.lineTo(p.shape[i].x, p.shape[i].y);
                }
                ctx.closePath();
                
                // Visual properties based on depth
                const opacity = Math.max(0.15, 0.5 * (1 - p.z * 0.7));
                const hue = 220 + Math.floor(p.z * 40);
                const saturation = 10 + Math.floor(p.z * 15);
                const lightness = 40 + Math.floor(p.z * 20);
                
                ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                ctx.fill();
                
                // Subtle outline
                ctx.strokeStyle = `rgba(200,220,255,${opacity * 0.8})`;
                ctx.lineWidth = Math.max(0.5, 1.0 * (1 - p.z * 0.7));
                ctx.stroke();
                
                ctx.restore();
            }
        } else {
            // STARFIELD MODE: Rotating stars
            // Rotate starfield slowly
            angle += rotationSpeed;
            const cx = w / 2;
            const cy = h / 2;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            
            // Draw stars
            for (const p of particles) {
                const rx = p.x * cosA - p.y * sinA;
                const ry = p.x * sinA + p.y * cosA;
                const depth = 1 - p.z * 0.8;
                const sx = rx * depth + cx;
                const sy = ry * depth + cy;
                
                if (sx > -20 && sx < w + 20 && sy > -20 && sy < h + 20) {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, p.r * depth, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Spawn shooting stars (only in starfield mode)
            const baseInterval = 1800; // 30 seconds
            const minInterval = 60; // 1 second
            const interval = baseInterval - meteorFrequency * (baseInterval - minInterval);
            const framesPerMeteor = interval / 60 * 60;
            
            shootTimer++;
            if (shootTimer >= framesPerMeteor) {
                createShootingStar();
                shootTimer = 0;
            }
            
            // Draw shooting stars
            for (let i = shooting.length - 1; i >= 0; i--) {
                const s = shooting[i];
                s.x += s.vx;
                s.y += s.vy;
                s.life--;
                
                const alpha = s.life / s.maxLife;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * s.brightness})`;
                ctx.lineWidth = 2 + alpha;
                
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                const tail = s.tailLength / Math.hypot(s.vx, s.vy);
                ctx.lineTo(s.x - s.vx * tail, s.y - s.vy * tail);
                ctx.stroke();
                
                if (s.life <= 0) shooting.splice(i, 1);
            }
        }
        
        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(loop);
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();