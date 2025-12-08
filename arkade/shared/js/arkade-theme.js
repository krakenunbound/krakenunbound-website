/**
 * 🦑 KRAKEN ARKADE THEME
 * ========================
 * Unified visual theme for all Kraken Arkade pages
 * Features: Starfield, shooting stars, ambient music
 * 
 * This module is designed to work alongside existing starfield/audio systems
 * in individual game pages, or provide a complete solution if none exists.
 * 
 * Usage: Include this script and call ArkadeTheme.init() in your page
 */

// ============================================================================
// SHOOTING STARS OVERLAY
// ============================================================================

class ShootingStarOverlay {
    constructor(canvasId = 'arkade-shooting-stars') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                pointer-events: none;
            `;
            document.body.insertBefore(this.canvas, document.body.firstChild);
        }
        this.ctx = this.canvas.getContext('2d');
        this.shootingStars = [];
        this.animationId = null;
        this.lastTime = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawnShootingStar() {
        if (Math.random() > 0.015) return;

        this.shootingStars.push({
            x: Math.random() * this.canvas.width * 1.5 - this.canvas.width * 0.25,
            y: Math.random() * this.canvas.height * 0.6,
            vx: Math.random() * 400 + 300,
            vy: Math.random() * 200 + 100,
            life: 1,
            length: Math.random() * 100 + 50,
            brightness: Math.random() * 0.5 + 0.5
        });
    }

    update(dt) {
        this.shootingStars.forEach(star => {
            star.x += star.vx * dt;
            star.y += star.vy * dt;
            star.life -= dt * 0.7;
        });
        this.shootingStars = this.shootingStars.filter(s => s.life > 0);
        this.spawnShootingStar();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.shootingStars.forEach(star => {
            const tailX = star.x - star.length * (star.vx / 400);
            const tailY = star.y - star.length * (star.vy / 200);

            const gradient = this.ctx.createLinearGradient(star.x, star.y, tailX, tailY);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.life * star.brightness})`);
            gradient.addColorStop(0.2, `rgba(200, 230, 255, ${star.life * 0.7})`);
            gradient.addColorStop(0.5, `rgba(150, 200, 255, ${star.life * 0.4})`);
            gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(tailX, tailY);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            const glowGradient = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 6);
            glowGradient.addColorStop(0, `rgba(255, 255, 255, ${star.life})`);
            glowGradient.addColorStop(0.5, `rgba(200, 230, 255, ${star.life * 0.5})`);
            glowGradient.addColorStop(1, 'rgba(150, 200, 255, 0)');

            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = glowGradient;
            this.ctx.fill();
        });
    }

    animate(time = 0) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        this.update(dt);
        this.draw();
        this.animationId = requestAnimationFrame(t => this.animate(t));
    }

    start() {
        if (!this.animationId) this.animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// ============================================================================
// FULL STARFIELD (for pages without existing stars)
// ============================================================================

class ArkadeStarfield {
    constructor(canvasId = 'arkade-starfield') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -2;
                pointer-events: none;
            `;
            document.body.insertBefore(this.canvas, document.body.firstChild);
        }
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.shootingStars = [];
        this.animationId = null;
        this.lastTime = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initStars();
    }

    initStars() {
        const starCount = Math.floor((this.canvas.width * this.canvas.height) / 2500);
        this.stars = [];

        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 2 + 1,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    }

    spawnShootingStar() {
        if (Math.random() > 0.008) return;

        this.shootingStars.push({
            x: Math.random() * this.canvas.width * 1.5 - this.canvas.width * 0.25,
            y: Math.random() * this.canvas.height * 0.5,
            vx: Math.random() * 400 + 300,
            vy: Math.random() * 200 + 100,
            life: 1,
            length: Math.random() * 80 + 40,
            brightness: Math.random() * 0.5 + 0.5
        });
    }

    update(dt) {
        this.shootingStars.forEach(star => {
            star.x += star.vx * dt;
            star.y += star.vy * dt;
            star.life -= dt * 0.8;
        });
        this.shootingStars = this.shootingStars.filter(s => s.life > 0);
        this.spawnShootingStar();
    }

    draw(time) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Static stars with twinkling
        this.stars.forEach(star => {
            const twinkle = Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset);
            const alpha = star.brightness + twinkle * 0.2;

            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
            this.ctx.fill();
        });

        // Shooting stars
        this.shootingStars.forEach(star => {
            const gradient = this.ctx.createLinearGradient(
                star.x, star.y,
                star.x - star.length * (star.vx / 400),
                star.y - star.length * (star.vy / 200)
            );

            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.life * star.brightness})`);
            gradient.addColorStop(0.3, `rgba(200, 220, 255, ${star.life * 0.6})`);
            gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(
                star.x - star.length * (star.vx / 400),
                star.y - star.length * (star.vy / 200)
            );
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.life})`;
            this.ctx.fill();
        });
    }

    animate(time = 0) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        this.update(dt);
        this.draw(time);
        this.animationId = requestAnimationFrame(t => this.animate(t));
    }

    start() {
        if (!this.animationId) this.animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// ============================================================================
// AMBIENT MUSIC PLAYER
// ============================================================================

class ArkadeMusic {
    constructor(customTrack = null) {
        this.audio = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.volume = 0.15;
        this.button = null;
        this.storageKey = 'arkade_music_enabled';
        this.customTrack = customTrack; // Single track for game-specific music
    }

    async init() {
        // Don't initialize if there's already an audio-controls element (game has its own)
        if (document.getElementById('audio-controls')) {
            console.log('🎵 Existing audio system detected, skipping theme music');
            return;
        }

        this.audio = new Audio();
        this.audio.volume = this.volume;
        this.audio.loop = true; // Loop for menu music

        this.audio.addEventListener('error', (e) => {
            console.log('Audio error:', e);
        });

        // If custom track provided, use that instead of playlist
        if (this.customTrack) {
            this.playlist = [this.customTrack];
            console.log('🎵 Using custom track:', this.customTrack);
        } else {
            // Otherwise fetch from API
            try {
                const response = await fetch('/api/music_list');
                this.playlist = await response.json();

                // Shuffle playlist
                for (let i = this.playlist.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
                }
            } catch (e) {
                console.log('Music list not available');
                this.playlist = [];
            }
        }

        if (this.playlist.length === 0) return;

        this.createButton();

        // Auto-play if previously enabled (after user interaction)
        if (localStorage.getItem(this.storageKey) === 'true') {
            const startPlaying = () => {
                if (!this.isPlaying && localStorage.getItem(this.storageKey) === 'true') {
                    this.play();
                }
                document.removeEventListener('click', startPlaying);
                document.removeEventListener('keydown', startPlaying);
            };
            document.addEventListener('click', startPlaying, { once: true });
            document.addEventListener('keydown', startPlaying, { once: true });
        }
    }

    createButton() {
        let container = document.getElementById('arkade-music-control');
        if (!container) {
            container = document.createElement('div');
            container.id = 'arkade-music-control';
            container.style.cssText = `
                position: fixed;
                top: 15px;
                right: 15px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(container);
        }

        this.button = document.createElement('button');
        this.button.id = 'arkade-music-btn';
        this.button.innerHTML = '🔇';
        this.button.title = 'Toggle Ambient Music';
        this.button.style.cssText = `
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 2px solid rgba(0, 255, 255, 0.5);
            background: rgba(0, 0, 0, 0.7);
            color: #0ff;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        this.button.addEventListener('mouseenter', () => {
            this.button.style.borderColor = '#0ff';
            this.button.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
            this.button.style.transform = 'scale(1.1)';
        });

        this.button.addEventListener('mouseleave', () => {
            this.button.style.borderColor = 'rgba(0, 255, 255, 0.5)';
            this.button.style.boxShadow = 'none';
            this.button.style.transform = 'scale(1)';
        });

        this.button.addEventListener('click', () => this.toggle());

        container.appendChild(this.button);
    }

    updateButton() {
        if (this.button) {
            this.button.innerHTML = this.isPlaying ? '🔊' : '🔇';
            this.button.style.borderColor = this.isPlaying ? '#0ff' : 'rgba(0, 255, 255, 0.5)';
        }
    }

    play() {
        if (this.playlist.length === 0) return;

        const track = this.playlist[this.currentIndex];
        // Check if track is a full path or just a filename
        if (track.startsWith('/') || track.startsWith('http')) {
            this.audio.src = track;
        } else {
            this.audio.src = `/music/${encodeURIComponent(track)}`;
        }
        this.audio.volume = this.volume;

        this.audio.play().then(() => {
            this.isPlaying = true;
            localStorage.setItem(this.storageKey, 'true');
            this.updateButton();
        }).catch(e => {
            console.log('Audio play blocked, waiting for interaction');
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        localStorage.setItem(this.storageKey, 'false');
        this.updateButton();
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    playNext() {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        if (this.isPlaying) {
            this.play();
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    }
}

// ============================================================================
// MAIN THEME INITIALIZER
// ============================================================================

const ArkadeTheme = {
    starfield: null,
    shootingStars: null,
    music: null,
    initialized: false,

    async init(options = {}) {
        if (this.initialized) return;

        const {
            enableStarfield = true,
            enableShootingStarsOnly = false,
            enableMusic = true,
            musicVolume = 0.12,
            musicTrack = null  // Custom track path for game-specific music
        } = options;

        // Check if page already has a starfield (star-canvas)
        const hasExistingStarfield = document.getElementById('star-canvas') !== null;

        if (enableStarfield) {
            if (hasExistingStarfield && !enableShootingStarsOnly) {
                // Just add shooting stars overlay on top of existing starfield
                this.shootingStars = new ShootingStarOverlay();
                this.shootingStars.start();
                console.log('🌠 Added shooting stars to existing starfield');
            } else if (!hasExistingStarfield) {
                // Create full starfield with shooting stars
                this.starfield = new ArkadeStarfield();
                this.starfield.start();
                console.log('✨ Created full starfield with shooting stars');
            }
        }

        if (enableMusic) {
            this.music = new ArkadeMusic(musicTrack);
            this.music.setVolume(musicVolume);
            await this.music.init();
        }

        this.initialized = true;
        console.log('🦑 Arkade Theme initialized');
    },

    destroy() {
        if (this.starfield) this.starfield.stop();
        if (this.shootingStars) this.shootingStars.stop();
        if (this.music) this.music.pause();
        this.initialized = false;
    }
};

// Auto-initialize on DOMContentLoaded if data attribute is set
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.arkadeTheme === 'auto') {
        ArkadeTheme.init();
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArkadeTheme, ArkadeStarfield, ShootingStarOverlay, ArkadeMusic };
}
