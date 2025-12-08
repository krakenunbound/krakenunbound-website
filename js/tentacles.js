// Tentacle Animation - Each tentacle wiggles like a snake held by its tail
// Uses sine waves to create S-curve motion along the tentacle length

(function() {
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTentacles);
    } else {
        initTentacles();
    }

    function initTentacles() {
        // Original tentacle paths (control points we'll animate)
        const tentacleData = [
            // Front tentacles - t1 through t6
            { id: 't1', base: {x: 60, y: 115}, points: [{x: 35, y: 145}, {x: 25, y: 180}, {x: 20, y: 210}, {x: 35, y: 235}] },
            { id: 't2', base: {x: 75, y: 120}, points: [{x: 55, y: 155}, {x: 50, y: 190}, {x: 48, y: 220}, {x: 60, y: 240}] },
            { id: 't3', base: {x: 88, y: 122}, points: [{x: 78, y: 160}, {x: 80, y: 200}, {x: 82, y: 230}, {x: 92, y: 240}] },
            { id: 't4', base: {x: 112, y: 122}, points: [{x: 122, y: 160}, {x: 120, y: 200}, {x: 118, y: 230}, {x: 108, y: 240}] },
            { id: 't5', base: {x: 125, y: 120}, points: [{x: 145, y: 155}, {x: 150, y: 190}, {x: 152, y: 220}, {x: 140, y: 240}] },
            { id: 't6', base: {x: 140, y: 115}, points: [{x: 165, y: 145}, {x: 175, y: 180}, {x: 180, y: 210}, {x: 165, y: 235}] },
            // Back tentacles
            { id: 't-back-1', base: {x: 70, y: 95}, points: [{x: 45, y: 130}, {x: 35, y: 165}, {x: 30, y: 190}, {x: 45, y: 215}] },
            { id: 't-back-2', base: {x: 130, y: 95}, points: [{x: 155, y: 130}, {x: 165, y: 165}, {x: 170, y: 190}, {x: 155, y: 215}] }
        ];

        // Each tentacle gets unique animation parameters
        const animParams = [
            { speed: 0.8, amplitude: 12, phase: 0, waveLength: 2.5 },      // t1 - outer left
            { speed: 1.0, amplitude: 10, phase: 0.5, waveLength: 2.2 },    // t2
            { speed: 0.9, amplitude: 8, phase: 1.0, waveLength: 2.8 },     // t3 - center left
            { speed: 0.9, amplitude: 8, phase: 1.5, waveLength: 2.8 },     // t4 - center right
            { speed: 1.0, amplitude: 10, phase: 2.0, waveLength: 2.2 },    // t5
            { speed: 0.8, amplitude: 12, phase: 2.5, waveLength: 2.5 },    // t6 - outer right
            { speed: 0.5, amplitude: 15, phase: 0.3, waveLength: 3.0 },    // back-1
            { speed: 0.5, amplitude: 15, phase: 1.8, waveLength: 3.0 }     // back-2
        ];

        // Get all tentacle elements
        const tentacles = [];
        tentacleData.forEach((data, i) => {
            const el = document.querySelector(`.${data.id}`);
            if (el) {
                tentacles.push({
                    element: el,
                    data: data,
                    params: animParams[i]
                });
            }
        });

        if (tentacles.length === 0) return;

        let time = 0;

        function animate() {
            time += 0.016; // ~60fps

            tentacles.forEach(t => {
                const { data, params, element } = t;
                const { speed, amplitude, phase, waveLength } = params;

                // Calculate new path with S-curve wiggle
                const newPath = calculateWigglyPath(data, time * speed + phase, amplitude, waveLength);
                element.setAttribute('d', newPath);
            });

            requestAnimationFrame(animate);
        }

        function calculateWigglyPath(data, time, amplitude, waveLength) {
            const { base, points } = data;

            // Create wiggled points - more movement toward the tip
            const wiggledPoints = points.map((pt, i) => {
                // Progress along tentacle (0 = base, 1 = tip)
                const progress = (i + 1) / points.length;

                // S-curve: use different phase for each point along tentacle
                const waveOffset = progress * waveLength * Math.PI;
                const wiggle = Math.sin(time * 2 + waveOffset) * amplitude * progress;

                // Determine direction based on which side of center
                const isLeftSide = base.x < 100;
                const direction = isLeftSide ? 1 : -1;

                return {
                    x: pt.x + wiggle * direction,
                    y: pt.y + Math.sin(time * 1.5 + waveOffset) * amplitude * 0.3 * progress
                };
            });

            // Build SVG path - using quadratic curves for smooth S-shape
            // Start at base
            let path = `M${base.x} ${base.y}`;

            // First curve from base to first control point
            const cp1 = wiggledPoints[0];
            const cp2 = wiggledPoints[1];
            path += ` Q${cp1.x} ${cp1.y} ${(cp1.x + cp2.x)/2} ${(cp1.y + cp2.y)/2}`;

            // Continue with smooth curves
            for (let i = 1; i < wiggledPoints.length - 1; i++) {
                const current = wiggledPoints[i];
                const next = wiggledPoints[i + 1];
                path += ` Q${current.x} ${current.y} ${(current.x + next.x)/2} ${(current.y + next.y)/2}`;
            }

            // Final curve to tip
            const last = wiggledPoints[wiggledPoints.length - 1];
            const secondLast = wiggledPoints[wiggledPoints.length - 2];
            path += ` Q${last.x} ${last.y} ${last.x + (last.x - secondLast.x) * 0.3} ${last.y + 5}`;

            // Close the tentacle shape (add thickness)
            // Go back up the other side with slight offset
            const thickness = 12;
            path += ` Q${last.x + thickness * 0.5} ${last.y} ${(last.x + secondLast.x)/2 + thickness} ${(last.y + secondLast.y)/2}`;

            for (let i = wiggledPoints.length - 2; i >= 1; i--) {
                const current = wiggledPoints[i];
                const prev = wiggledPoints[i - 1];
                const offset = thickness * (1 - i / wiggledPoints.length * 0.5);
                path += ` Q${current.x + offset} ${current.y} ${(current.x + prev.x)/2 + offset} ${(current.y + prev.y)/2}`;
            }

            path += ` Q${wiggledPoints[0].x + thickness} ${wiggledPoints[0].y} ${base.x + thickness * 0.8} ${base.y}`;
            path += ' Z';

            return path;
        }

        // Start animation
        animate();
    }
})();
