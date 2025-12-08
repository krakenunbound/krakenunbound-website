// Ad Astra - Audio System
// audio.js - Manages background music and sound effects

import { MusicLoader } from './music-loader.js';

export class AudioSystem {
    constructor() {
        this.musicVolume = 0.2; // 20% volume for ambient atmosphere
        this.sfxVolume = 0.7;
        this.currentTrack = null;
        this.currentAudio = null;
        this.sounds = {};
        this.music = {};
        this.playlistMode = true;
        this.currentPlaylistIndex = 0;
        this.playlist = [];
        this.musicLoader = new MusicLoader();

        // Will be populated by discoverMusic()
        this.availableTracks = {};

        // Legacy tracks object for backward compatibility
        this.tracks = {};

        this.sfxFiles = {
            warp: 'assets/audio/sfx/warp.mp3',
            laser: 'assets/audio/sfx/laser.mp3',
            explosion: 'assets/audio/sfx/explosion.mp3',
            click: 'assets/audio/sfx/click.mp3',
            alert: 'assets/audio/sfx/alert.mp3',
            success: 'assets/audio/sfx/success.mp3',
            error: 'assets/audio/sfx/error.mp3'
        };

        this.initialized = false;
        this.musicEnabled = true; // Can be toggled off
        this.musicDiscovered = false;

        // Load saved settings
        this.loadSettings();
    }

    // Discover available music files dynamically
    async discoverMusic() {
        if (this.musicDiscovered) {
            console.log('🎵 Music already discovered');
            return this.availableTracks;
        }

        console.log('🎵 Starting music discovery...');

        try {
            this.availableTracks = await this.musicLoader.discoverTracks();

            // Update tracks object for backward compatibility
            this.tracks = {};
            Object.keys(this.availableTracks).forEach(key => {
                this.tracks[key] = this.availableTracks[key].path;
            });

            // Update playlist if it was using default tracks
            if (this.playlist.length === 0 || this.playlist.every(key => ['menu', 'exploration', 'combat', 'docked'].includes(key))) {
                this.playlist = this.musicLoader.getAllTrackKeys();
                this.shufflePlaylist();
                this.playlistMode = true;
                this.saveSettings();
            }

            this.musicDiscovered = true;
            console.log(`✨ Music discovery complete! ${this.musicLoader.getTrackCount()} tracks available`);

            return this.availableTracks;
        } catch (e) {
            console.warn('⚠️ Music discovery failed:', e);
            // Fall back to default tracks
            this.availableTracks = this.getDefaultTracks();
            this.tracks = {};
            Object.keys(this.availableTracks).forEach(key => {
                this.tracks[key] = this.availableTracks[key].path;
            });
            this.musicDiscovered = true;
            return this.availableTracks;
        }
    }

    // Get default tracks (fallback if discovery fails)
    getDefaultTracks() {
        return {
            menu: {
                name: 'Menu Theme',
                path: 'assets/audio/music/theme_menu.mp3',
                description: 'Calm and welcoming',
                category: 'menu',
                variant: 0
            },
            exploration: {
                name: 'Exploration Theme',
                path: 'assets/audio/music/theme_exploration.mp3',
                description: 'Adventure and discovery',
                category: 'exploration',
                variant: 0
            },
            combat: {
                name: 'Combat Theme',
                path: 'assets/audio/music/theme_combat.mp3',
                description: 'Intense and action-packed',
                category: 'combat',
                variant: 0
            },
            docked: {
                name: 'Docked Theme',
                path: 'assets/audio/music/theme_docked.mp3',
                description: 'Peaceful station ambience',
                category: 'docked',
                variant: 0
            }
        };
    }

    // Load audio settings from localStorage
    loadSettings() {
        const settings = localStorage.getItem('audioSettings');
        if (settings) {
            try {
                const parsed = JSON.parse(settings);
                this.musicVolume = parsed.musicVolume ?? 0.2;
                this.sfxVolume = parsed.sfxVolume ?? 0.7;
                this.musicEnabled = parsed.musicEnabled ?? true;
                this.playlist = parsed.playlist ?? [];
                this.playlistMode = parsed.playlistMode ?? true;
            } catch (e) {
                console.warn('Failed to load audio settings:', e);
            }
        }
    }

    // Save audio settings to localStorage
    saveSettings() {
        const settings = {
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            musicEnabled: this.musicEnabled,
            playlist: this.playlist,
            playlistMode: this.playlistMode
        };
        localStorage.setItem('audioSettings', JSON.stringify(settings));
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('Audio System Initialized');
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    // Play a music track
    playMusic(theme) {
        if (!this.initialized || !this.musicEnabled) return;

        let path = null;
        let trackKey = theme;

        // Try to get a random track if 'theme' is a category (e.g. 'combat')
        // This enables playing 'combat1', 'combat2', etc. randomly
        const randomTrack = this.musicLoader.getRandomTrackFromCategory(theme);
        if (randomTrack) {
            trackKey = randomTrack.key;
            path = randomTrack.path;
        } else {
            // Fallback to direct lookup if theme is a specific key or not a category
            path = this.tracks[theme];
        }

        if (!path) {
            console.warn(`Theme not found: ${theme}`);
            return;
        }

        // Don't restart if already playing
        if (this.currentTrack === theme && this.currentAudio && !this.currentAudio.paused) {
            console.log(`Music already playing: ${theme}`);
            return;
        }

        // Stop current
        this.stopMusic();

        console.log(`🎵 Playing music: ${theme} (${path})`);

        // Create audio element for music (easier for streaming/looping)
        const audio = new Audio(path);
        audio.volume = this.musicVolume;
        audio.preload = 'auto';

        // In playlist mode, don't loop individual tracks
        if (this.playlistMode && this.playlist.length > 1) {
            audio.loop = false;
        } else {
            audio.loop = true; // Loop single track
        }

        // Track playlist position so the next track is predictable
        if (this.playlistMode && this.playlist.length > 0) {
            const playlistIndex = this.playlist.indexOf(trackKey);
            if (playlistIndex >= 0) {
                this.currentPlaylistIndex = playlistIndex;
            } else {
                this.playlist.unshift(trackKey);
                this.currentPlaylistIndex = 0;
                this.saveSettings();
            }
        }

        // Handle loading errors gracefully (since files might be missing)
        audio.onerror = (e) => {
            console.warn(`⚠️ Audio file missing or failed to load: ${path}`);
            console.warn('Please add music files to assets/audio/music/ directory');
            console.warn('Music will be silent until audio files are added');
        };

        // Log when music actually starts playing
        audio.onplay = () => {
            console.log(`✅ Music started: ${theme}`);
        };

        // Handle track ending
        audio.onended = () => {
            console.log(`🎵 Track ended: ${theme}`);

            if (this.playlistMode && this.playlist.length > 1) {
                // Play next track in playlist
                console.log('🔄 Playing next track in playlist...');
                this.playNextTrack();
            } else {
                // Loop the same track (backup for loop failure)
                console.log(`🔄 Restarting track: ${theme}`);
                setTimeout(() => {
                    if (this.currentTrack === theme && this.musicEnabled) {
                        audio.currentTime = 0;
                        audio.play().catch(e => console.warn('Failed to restart music:', e));
                    }
                }, 100);
            }
        };

        try {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log(`Music playback started successfully: ${theme}`);
                    })
                    .catch(e => {
                        console.log('Audio play blocked (waiting for user interaction):', e.message);
                    });
            }
            this.music[theme] = audio;
            this.currentAudio = audio;
            this.currentTrack = theme;
        } catch (e) {
            console.warn('Failed to play music', e);
        }
    }

    // Stop current music
    stopMusic() {
        if (this.currentTrack && this.music[this.currentTrack]) {
            this.music[this.currentTrack].pause();
            this.music[this.currentTrack].currentTime = 0;
            this.currentTrack = null;
        }
    }

    // Play a sound effect
    playSfx(name) {
        if (!this.initialized) return;

        const path = this.sfxFiles[name];
        if (!path) return;

        const audio = new Audio(path);
        audio.volume = this.sfxVolume;

        audio.onerror = () => {
            // Suppress errors for missing sfx
        };

        try {
            audio.play().catch(() => { });
        } catch (e) {
            // Ignore
        }
    }

    // Set volume (0.0 to 1.0)
    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.currentAudio) {
            this.currentAudio.volume = this.musicVolume;
        }
        this.saveSettings();
        console.log(`🔊 Music volume set to: ${Math.round(this.musicVolume * 100)}%`);
    }

    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        this.saveSettings();
        console.log(`🔊 SFX volume set to: ${Math.round(this.sfxVolume * 100)}%`);
    }

    // Toggle music on/off
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.saveSettings();

        if (!this.musicEnabled) {
            this.stopMusic();
            console.log('🔇 Music disabled');
        } else {
            console.log('🔊 Music enabled');
            // Resume playing if we were in the middle of something
            if (this.currentTrack) {
                this.playMusic(this.currentTrack);
            }
        }
        return this.musicEnabled;
    }

    // Enable/disable playlist mode
    setPlaylistMode(enabled) {
        this.playlistMode = enabled;
        this.saveSettings();
        console.log(`🎵 Playlist mode: ${enabled ? 'enabled' : 'disabled'}`);

        // If enabling playlist mode and music is playing, restart with playlist logic
        if (enabled && this.currentTrack && this.currentAudio) {
            const currentTheme = this.currentTrack;
            this.stopMusic();
            this.playMusic(currentTheme);
        }
    }

    // Add track to playlist
    addToPlaylist(trackKey) {
        if (!this.availableTracks[trackKey]) {
            console.warn(`Track not found: ${trackKey}`);
            return false;
        }

        if (!this.playlist.includes(trackKey)) {
            this.playlist.push(trackKey);
            this.saveSettings();
            console.log(`➕ Added ${this.availableTracks[trackKey].name} to playlist`);
            return true;
        }
        return false;
    }

    // Remove track from playlist
    removeFromPlaylist(trackKey) {
        const index = this.playlist.indexOf(trackKey);
        if (index > -1) {
            this.playlist.splice(index, 1);
            this.saveSettings();
            console.log(`➖ Removed ${this.availableTracks[trackKey].name} from playlist`);
            return true;
        }
        return false;
    }

    // Set entire playlist
    setPlaylist(trackKeys) {
        // Validate all tracks exist
        const validTracks = trackKeys.filter(key => this.availableTracks[key]);
        this.playlist = validTracks;
        this.currentPlaylistIndex = 0;
        this.saveSettings();
        console.log(`📝 Playlist updated with ${this.playlist.length} tracks`);
    }

    // Play next track in playlist
    playNextTrack() {
        if (!this.playlistMode || this.playlist.length === 0) return;

        this.currentPlaylistIndex = (this.currentPlaylistIndex + 1) % this.playlist.length;
        const nextTrack = this.playlist[this.currentPlaylistIndex];
        console.log(`⏭️ Next track: ${this.availableTracks[nextTrack].name}`);
        this.playMusic(nextTrack);
    }

    // Play previous track in playlist
    playPreviousTrack() {
        if (!this.playlistMode || this.playlist.length === 0) return;

        this.currentPlaylistIndex = (this.currentPlaylistIndex - 1 + this.playlist.length) % this.playlist.length;
        const prevTrack = this.playlist[this.currentPlaylistIndex];
        console.log(`⏮️ Previous track: ${this.availableTracks[prevTrack].name}`);
        this.playMusic(prevTrack);
    }

    // Start playing from playlist
    playFromPlaylist() {
        if (this.playlist.length === 0) {
            console.warn('Playlist is empty');
            return;
        }

        this.playlistMode = true;
        this.currentPlaylistIndex = 0;
        this.playMusic(this.playlist[0]);
    }

    // Shuffle playlist
    shufflePlaylist() {
        for (let i = this.playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
        }
        this.currentPlaylistIndex = 0;
        this.saveSettings();
        console.log('🔀 Playlist shuffled');
    }

    // Get playlist info
    getPlaylistInfo() {
        return {
            enabled: this.playlistMode,
            tracks: this.playlist.map(key => ({
                key: key,
                name: this.availableTracks[key].name,
                description: this.availableTracks[key].description
            })),
            currentIndex: this.currentPlaylistIndex,
            currentTrack: this.playlist[this.currentPlaylistIndex]
        };
    }

    // Get list of available tracks
    getTrackList() {
        console.log('🎵 Available Music Tracks:');
        Object.entries(this.tracks).forEach(([name, path]) => {
            console.log(`  - ${name}: ${path}`);
        });
        console.log('\n🔊 Available Sound Effects:');
        Object.entries(this.sfxFiles).forEach(([name, path]) => {
            console.log(`  - ${name}: ${path}`);
        });
        return { music: this.tracks, sfx: this.sfxFiles };
    }

    // Get current playback status
    getStatus() {
        return {
            initialized: this.initialized,
            currentTrack: this.currentTrack,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            musicEnabled: this.musicEnabled,
            playlistMode: this.playlistMode,
            playlistLength: this.playlist.length,
            isPlaying: this.currentAudio && !this.currentAudio.paused
        };
    }
}

export default AudioSystem;
