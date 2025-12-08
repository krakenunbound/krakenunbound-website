<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asteroid Field</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Use custom CSS for the canvas to ensure it fills the viewport and looks good */
        body {
            margin: 0;
            overflow: hidden;
            background-color: #0d0a13; /* Deep space background */
            font-family: 'Inter', sans-serif;
            color: #e5e7eb;
        }
        #fx-canvas {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 0;
        }
        .controls {
            position: absolute;
            top: 1rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            background: rgba(30, 30, 50, 0.8);
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        label, input {
            color: #e5e7eb;
            font-size: 0.875rem;
        }
        input[type="range"] {
            -webkit-appearance: none;
            width: 150px;
            height: 6px;
            background: #4b5563;
            border-radius: 3px;
            outline: none;
            opacity: 0.7;
            transition: opacity .15s ease-in-out;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #a5b4fc;
            cursor: pointer;
            box-shadow: 0 0 4px #a5b4fc;
        }
    </style>
</head>
<body>

    <canvas id="fx-canvas"></canvas>

    <div class="controls">
        <div class="flex flex-col items-center">
            <label for="speed">Speed (<span id="fx-speed-v">0.60</span>)</label>
            <input type="range" id="fx-speed" min="0.05" max="2.0" step="0.05" value="0.6">
        </div>
        <div class="flex flex-col items-center">
            <label for="count">Count (<span id="fx-count-v">120</span>)</label>
            <input type="range" id="fx-count" min="10" max="300" step="1" value="120">
        </div>
    </div>

    <script>
        // Global variables for canvas and context
        let fx, ctx;
        let rafHandle = null;

        // State for the Asteroid Field
        let count = 120;
        let speed = 0.6;
        let particles = [];
        const presetBase = 0.2; // Base speed multiplier for 'asteroids' from original file

        // -------------------------------------------------
        // DPR Resize Helper (Ensures crisp drawing on high-DPI screens)
        // -------------------------------------------------
        function resizeCanvasForDPR(canvas) {
            try {
                const dpr = (window.devicePixelRatio || 1);
                const cssW = canvas.clientWidth || window.innerWidth;
                const cssH = canvas.clientHeight || window.innerHeight;
                const w = Math.max(1, Math.floor(cssW * dpr));
                const h = Math.max(1, Math.floor(cssH * dpr));
                if (canvas.width !== w || canvas.height !== h) {
                    canvas.width = w;
                    canvas.height = h;
                    if (canvas.getContext) {
                        const context = canvas.getContext('2d');
                        if (context && typeof context.setTransform === 'function') {
                            context.setTransform(dpr, 0, 0, dpr, 0, 0);
                        }
                    }
                }
            } catch(e) {
                console.error("DPR Resize Error:", e);
            }
        }

        // -------------------------------------------------
        // Resize / reset
        // -------------------------------------------------
        function resize() {
            if (!fx) return;
            // Set canvas CSS dimensions to viewport size
            fx.style.width = window.innerWidth + 'px';
            fx.style.height = window.innerHeight + 'px';
            
            // Adjust canvas resolution for DPI and clear particles
            resizeCanvasForDPR(fx);
            resetParticles();
        }

        function resetParticles() {
            if (!fx) return;
            // Clear existing particles
            particles = [];

            // Generate new particles based on the 'asteroids' preset logic
            particles = Array.from({ length: count }, () => {
                let x, y, r, sp, ang, vx, vy, rot, rotSpeed, shape, z;

                // Depth (Z-index) for size and speed variation
                z = Math.random(); 

                // Size: larger and slower if z is small (closer)
                const r_base = Math.random() * 15 + 10;
                r = r_base * (1 - z * 0.7); // Smaller with depth

                // Speed: slower with depth
                const sp_base = Math.random() * 0.8 + 0.2;
                sp = sp_base * (1 - z * 0.6);

                // Movement direction (random angle)
                ang = Math.random() * Math.PI * 2;
                vx = Math.cos(ang) * sp;
                vy = Math.sin(ang) * sp;

                // Random starting position within the canvas
                x = Math.random() * fx.width;
                y = Math.random() * fx.height;

                // Rotation properties
                rot = Math.random() * Math.PI * 2;
                const rotSpeed_base = (Math.random() - 0.5) * 0.02;
                rotSpeed = rotSpeed_base * (1 - z * 0.6);

                // Shape generation: Irregular polygon
                shape = [];
                const n = Math.floor(Math.random() * 5) + 6; // 6 to 10 points
                for (let i = 0; i < n; i++) {
                    const a = (i / n) * Math.PI * 2;
                    // Introduce random perturbation to make it look like a rock
                    const rad = r + (Math.random() - 0.5) * (r * 0.4); 
                    shape.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
                }

                return { x, y, r, sp, vx, vy, rot, rotSpeed, shape, z };
            });

            // Re-apply speed setting if the animation is already running
            if (rafHandle) startLoop();
        }

        // -------------------------------------------------
        // Animation loop
        // -------------------------------------------------
        function loop() {
            if (!ctx || !fx) {
                rafHandle = requestAnimationFrame(loop);
                return;
            }

            // Clear the canvas completely (no trail effect needed for asteroids)
            ctx.clearRect(0, 0, fx.width, fx.height);
            ctx.globalCompositeOperation = 'source-over'; // Standard drawing mode

            // Sort particles by Z-index so closer (larger) ones are drawn last (on top)
            particles.sort((a, b) => a.z - b.z);

            const mult = presetBase;
            const curSpeed = speed / mult;

            for (const p of particles) {
                // Update position
                const base = p.sp || 1;
                p.x += (p.vx / base) * curSpeed * base;
                p.y += (p.vy / base) * curSpeed * base;
                
                // Update rotation
                p.rot += (speed / mult) * (p.rotSpeed || 0);

                // Wrap logic (toroidal space)
                if (p.x < -p.r * 2) p.x = fx.width + p.r * 2; 
                else if (p.x > fx.width + p.r * 2) p.x = -p.r * 2;
                if (p.y < -p.r * 2) p.y = fx.height + p.r * 2; 
                else if (p.y > fx.height + p.r * 2) p.y = -p.r * 2;

                // DRAW THE ASTEROID
                ctx.save();
                // Move context to asteroid position and apply rotation
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                
                ctx.beginPath();
                ctx.moveTo(p.shape[0].x, p.shape[0].y);
                for (let i = 1; i < p.shape.length; i++) {
                    ctx.lineTo(p.shape[i].x, p.shape[i].y);
                }
                ctx.closePath();
                
                // Calculate visual properties based on depth (z)
                const opacity = Math.max(0.15, 0.5 * (1 - p.z * 0.7)); // Duller and more transparent when far
                const hue = 220 + Math.floor(p.z * 40); // Slightly more red/yellow when closer
                const saturation = 10 + Math.floor(p.z * 15);
                const lightness = 40 + Math.floor(p.z * 20);

                ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                ctx.fill();

                // Add a subtle white outline/highlight
                ctx.strokeStyle = `rgba(200,220,255,${opacity * 0.8})`;
                ctx.lineWidth = Math.max(0.5, 1.0 * (1 - p.z * 0.7));
                ctx.stroke(); 
                
                ctx.restore();
            }

            rafHandle = requestAnimationFrame(loop);
        }
        
        function startLoop() {
            if (!rafHandle) rafHandle = requestAnimationFrame(loop);
        }

        // -------------------------------------------------
        // Initialize UI and Canvas
        // -------------------------------------------------
        function initialize() {
            fx = document.getElementById('fx-canvas');
            if (!fx) { 
                console.warn('#fx-canvas missing'); 
                return; 
            }
            ctx = fx.getContext('2d');

            // --- UI Elements ---
            const cN = document.getElementById('fx-count');
            const cS = document.getElementById('fx-speed');
            const vN = document.getElementById('fx-count-v');
            const vS = document.getElementById('fx-speed-v');
            
            // Set initial values
            if (cN) cN.value = count;
            if (vN) vN.textContent = count;
            if (cS) cS.value = speed;
            if (vS) vS.textContent = speed.toFixed(2);


            // --- Event Listeners ---
            window.addEventListener('resize', resize, { passive: true });
            
            if (cN) cN.oninput = () => { 
                count = parseInt(cN.value, 10) || 120; 
                if (vN) vN.textContent = count; 
                resetParticles(); // Re-initialize all asteroids with new count
            };
            
            if (cS) cS.oninput = () => { 
                speed = parseFloat(cS.value) || 0.6; 
                if (vS) vS.textContent = speed.toFixed(2); 
            };

            // Initial setup
            resize(); 
            startLoop();
        }

        window.onload = initialize;

    </script>
</body>
</html>