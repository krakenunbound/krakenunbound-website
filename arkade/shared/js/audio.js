// ============================================================================
// KRAKEN ARKADE - SHARED AUDIO MODULE
// Web Audio API synthesizer + MP3 loader
// ============================================================================

const Audio = {
    ctx: null,
    masterGain: null,
    musicGain: null,
    sfxGain: null,      // For mp3 sound effects
    synthGain: null,    // For computer-generated synth sounds
    voiceGain: null,
    currentMusic: null,
    musicBuffer: null,
    voiceQueue: [],
    currentVoice: null,
    isVoicePlaying: false,
    
    // Loaded audio buffers cache
    buffers: {},
    
    // Individual synth sound volume multipliers (0-1)
    volumes: {
        collect: 1.0,
        hit: 1.0,
        explode: 1.0,
        powerup: 1.0,
        damage: 1.0,
        shield: 1.0
    },
    
    // Asset paths
    paths: {
        music: '/assets/music/',
        voices: '/assets/voices/',
        sfx: '/assets/effects/'
    },
    
    // Music track names
    tracks: {
        menu: 'main_menu.mp3',
        asteroidRun: 'theme_asteroid_run.mp3',
        asteroidRun2: 'theme_asteroid_run2.mp3',
        hiveAssault: 'theme_hive_assault.mp3',
        hiveAssaultBoss: 'theme_hive_assault_boss.mp3',
        itLurksBelow: 'theme_it_lurks_below.mp3',
        spacePirates: 'theme_space_pirates.mp3',
        starKraken: 'theme_star_kraken.mp3',
        starKrakenBoss: 'theme_star_kraken_boss.mp3',
        krakensTempest: 'theme_krakens_tempest.mp3',
        krakensTempestBoss: 'theme_krakens_tempest_boss.mp3',
        combat: 'theme_combat.mp3',
        asteroidRunBoss1: 'asteroid_run_boss1.mp3',
        asteroidRunBoss2: 'asteroid_run_boss2.mp3',
        bossIntro: 'boss_intro.mp3',
        bossBattle: 'boss_battle.mp3',
        bossVictory: 'boss_victory.mp3',
        gameOver: 'game_over.mp3',
        victory: 'victory_fanfare.mp3'
    },
    
    // SFX file names - arrays for random variation, null = use synth only
    // Files that don't exist will be skipped automatically
    // Use # pattern: cannon1.mp3, cannon2.mp3, etc.
    sfxFiles: {
        shoot: ['shoot.mp3', 'shoot1.mp3'],
        cannon: ['cannon1.mp3', 'cannon2.mp3', 'cannon3.mp3'],
        shootTriple: ['cannon1.mp3', 'cannon2.mp3', 'cannon3.mp3'],
        shootTorpedo: ['missle_launch1.mp3', 'missle_launch2.mp3'],
        hit: ['hit.mp3'],
        explode: null,
        explodeBig: null,
        collect: null,
        powerup: null,
        damage: null,
        bomb: null,
        thrust: ['thruster1.mp3', 'thruster2.mp3', 'thruster3.mp3', 'thruster4.mp3', 'thruster5.mp3'],
        shield: null,
        shieldDown: ['shield_down1.mp3', 'shield_down2.mp3', 'shield_down3.mp3'],
        spawn: null,  // Synth for now - could add spawn#.mp3
        bossHit: null,
        bossExplode: null
    },
    
    // Track which files failed to load
    failedFiles: new Set(),
    
    // Voice callout files - arrays for random variation
    // Use # pattern: boss_warning1.mp3, boss_warning2.mp3, etc.
    voiceFiles: {
        // Shared across all games
        begin: ['begin.mp3'],
        checkpoint: ['checkpoint.mp3'],
        gameOver: ['game_over.mp3'],
        levelComplete: ['level_complete1.mp3', 'level_complete2.mp3', 'level_complete3.mp3'],
        powerUp: ['power_up.mp3', 'power_up_alt1.mp3'],
        weaponUpgraded: ['weapon_upgraded.mp3'],
        weaponMax: ['weapon_max.mp3', 'weapon_max1.mp3', 'weapon_max2.mp3'],
        shieldDown: ['shield_down1.mp3', 'shield_down2.mp3', 'shield_down3.mp3'],
        bossWarning: ['boss_warning1.mp3', 'boss_warning2.mp3', 'boss_warning3.mp3'],
        
        // Hive Assault specific
        hiveLocated: ['hive_located1.mp3', 'hive_located2.mp3', 'hive_located3.mp3'],
        hiveDestroyed: ['hive_destroyed1.mp3', 'hive_destroyed2.mp3', 'hive_destroyed3.mp3'],
        swarmIncoming: ['swarm_incoming1.mp3', 'swarm_incoming2.mp3', 'swarm_incoming3.mp3'],
        
        // It Lurks Below specific
        oxygenReplenished: ['oxygen_replenished.mp3'],
        torpedo: ['torpedo.mp3', 'torpedo_alt1.mp3', 'torpedo_alt2.mp3'],
        
        // Space Pirates specific (future)
        piratesIncoming: ['pirates_incoming1.mp3', 'pirates_incoming2.mp3'],
        cargoSecured: ['cargo_secured1.mp3', 'cargo_secured2.mp3']
    },
    
    // ==================== INITIALIZATION ====================
    
    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master gain (overall volume)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);
        
        // Music gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.2;
        this.musicGain.connect(this.masterGain);
        
        // SFX gain (for mp3 sound effects)
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.2;
        this.sfxGain.connect(this.masterGain);
        
        // Synth gain (for computer-generated sounds)
        this.synthGain = this.ctx.createGain();
        this.synthGain.gain.value = 2.0;  // Boosted so 50% slider = previous 100%
        this.synthGain.connect(this.masterGain);
        
        // Voice gain
        this.voiceGain = this.ctx.createGain();
        this.voiceGain.gain.value = 0.4;
        this.voiceGain.connect(this.masterGain);
        
        // Load saved settings from localStorage
        this.loadSettings();
    },
    
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    // ==================== VOLUME CONTROLS ====================
    
    setMasterVolume(v) { this.masterGain.gain.value = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setMusicVolume(v) { this.musicGain.gain.value = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setSFXVolume(v) { 
        this.sfxGain.gain.value = Math.max(0, Math.min(1, v)); 
        this.saveSettings();
    },
    setSynthVolume(v) { this.synthGain.gain.value = Math.max(0, Math.min(2, v * 2)); this.saveSettings(); },  // 0-2 range
    setVoiceVolume(v) { this.voiceGain.gain.value = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    
    // Ensure audio context is ready to play
    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    // Individual sound volume setters
    setCollectVolume(v) { this.volumes.collect = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setHitVolume(v) { this.volumes.hit = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setExplodeVolume(v) { this.volumes.explode = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setPowerupVolume(v) { this.volumes.powerup = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setDamageVolume(v) { this.volumes.damage = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    setShieldVolume(v) { this.volumes.shield = Math.max(0, Math.min(1, v)); this.saveSettings(); },
    
    // Save settings to localStorage
    saveSettings() {
        if (!this.ctx) return;
        const settings = {
            master: this.masterGain.gain.value,
            music: this.musicGain.gain.value,
            sfx: this.sfxGain.gain.value,
            synth: this.synthGain.gain.value,
            voice: this.voiceGain.gain.value,
            volumes: this.volumes
        };
        try {
            localStorage.setItem('krakenAudioSettings', JSON.stringify(settings));
        } catch(e) {}
    },
    
    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('krakenAudioSettings');
            if (!saved) return;
            const settings = JSON.parse(saved);
            if (settings.master !== undefined) this.masterGain.gain.value = settings.master;
            if (settings.music !== undefined) this.musicGain.gain.value = settings.music;
            if (settings.sfx !== undefined) this.sfxGain.gain.value = settings.sfx;
            if (settings.synth !== undefined) this.synthGain.gain.value = settings.synth;
            if (settings.voice !== undefined) this.voiceGain.gain.value = settings.voice;
            if (settings.volumes) Object.assign(this.volumes, settings.volumes);
        } catch(e) {}
    },
    
    // ==================== MP3 LOADING ====================
    
    async loadAudio(url) {
        if (this.buffers[url]) return this.buffers[url];
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[url] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            console.warn(`Failed to load audio: ${url}`, e);
            return null;
        }
    },
    
    async preloadAll(urls) {
        const promises = urls.map(url => this.loadAudio(url));
        return Promise.all(promises);
    },
    
    // ==================== MUSIC PLAYBACK ====================
    
    async playMusic(url, loop = true) {
        if (!this.ctx) this.init();
        
        // Stop current music
        this.stopMusic();
        
        const buffer = await this.loadAudio(url);
        if (!buffer) return;
        
        this.currentMusic = this.ctx.createBufferSource();
        this.currentMusic.buffer = buffer;
        this.currentMusic.loop = loop;
        this.currentMusic.connect(this.musicGain);
        this.currentMusic.start(0);
    },
    
    // Play music by track name (convenience method)
    async playTrack(trackName, loop = true) {
        const filename = this.tracks[trackName];
        if (!filename) {
            console.warn(`Unknown track: ${trackName}`);
            return;
        }
        await this.playMusic(this.paths.music + filename, loop);
    },
    
    // Convenience methods for common music
    async playMenuMusic() { await this.playTrack('menu'); },
    async playGameMusic(gameId) {
        const trackMap = {
            'asteroid_run': 'asteroidRun',
            'asteroid-run': 'asteroidRun',
            'hive_assault': 'hiveAssault',
            'hive-assault': 'hiveAssault',
            'it_lurks_below': 'itLurksBelow',
            'it-lurks-below': 'itLurksBelow',
            'space_pirates': 'spacePirates',
            'space-pirates': 'spacePirates',
            'krakens_tempest': 'krakensTempest',
            'krakens-tempest': 'krakensTempest'
        };
        const track = trackMap[gameId] || 'combat';
        await this.playTrack(track);
    },
    async playBossMusic() { await this.playTrack('bossBattle'); },
    async playVictoryMusic() { await this.playTrack('victory', false); },
    async playGameOverMusic() { await this.playTrack('gameOver', false); },
    
    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.stop();
            } catch (e) {}
            this.currentMusic = null;
        }
    },
    
    fadeOutMusic(duration = 1) {
        if (!this.currentMusic) return;
        const now = this.ctx.currentTime;
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(0, now + duration);
        setTimeout(() => {
            this.stopMusic();
            this.musicGain.gain.value = 0.4; // Reset
        }, duration * 1000);
    },
    
    // ==================== VOICE PLAYBACK ====================
    
    async playVoice(url) {
        if (!this.ctx) this.init();
        
        const buffer = await this.loadAudio(url);
        if (!buffer) return;
        
        // Queue if something is playing (max 2 queued)
        if (this.isVoicePlaying) {
            if (this.voiceQueue.length < 2) {
                this.voiceQueue.push(buffer);
            }
            return;
        }
        
        this._playVoiceBuffer(buffer);
    },
    
    _playVoiceBuffer(buffer) {
        this.isVoicePlaying = true;
        this.currentVoice = this.ctx.createBufferSource();
        this.currentVoice.buffer = buffer;
        this.currentVoice.connect(this.voiceGain);
        this.currentVoice.onended = () => {
            this.isVoicePlaying = false;
            this.currentVoice = null;
            if (this.voiceQueue.length > 0) {
                this._playVoiceBuffer(this.voiceQueue.shift());
            }
        };
        this.currentVoice.start(0);
    },
    
    // Clear the voice queue (for game reset/transitions)
    clearVoiceQueue() {
        this.voiceQueue = [];
    },
    
    // Stop current voice and clear queue
    stopAllVoices() {
        this.voiceQueue = [];
        if (this.currentVoice) {
            try {
                this.currentVoice.stop();
            } catch(e) {}
            this.currentVoice = null;
        }
        this.isVoicePlaying = false;
    },
    
    // Play a voice callout by name (with random variation)
    async playVoiceCallout(name) {
        const files = this.voiceFiles[name];
        if (!files || files.length === 0) return;
        
        const filename = files[Math.floor(Math.random() * files.length)];
        await this.playVoice(this.paths.voices + filename);
    },
    
    // Convenience methods for voice callouts
    // Shared
    voiceBegin() { this.playVoiceCallout('begin'); },
    voiceCheckpoint() { this.playVoiceCallout('checkpoint'); },
    voiceGameOver() { this.playVoiceCallout('gameOver'); },
    voiceLevelComplete() { this.playVoiceCallout('levelComplete'); },
    voicePowerUp() { this.playVoiceCallout('powerUp'); },
    voiceWeaponUpgraded() { this.playVoiceCallout('weaponUpgraded'); },
    voiceWeaponMax() { this.playVoiceCallout('weaponMax'); },
    voiceShieldDown() { this.playVoiceCallout('shieldDown'); },
    voiceBossWarning() { this.playVoiceCallout('bossWarning'); },
    
    // Hive Assault
    voiceHiveLocated() { this.playVoiceCallout('hiveLocated'); },
    voiceHiveDestroyed() { this.playVoiceCallout('hiveDestroyed'); },
    voiceSwarmIncoming() { this.playVoiceCallout('swarmIncoming'); },
    
    // It Lurks Below
    voiceOxygenReplenished() { this.playVoiceCallout('oxygenReplenished'); },
    voiceTorpedo() { this.playVoiceCallout('torpedo'); },
    
    // Space Pirates
    voicePiratesIncoming() { this.playVoiceCallout('piratesIncoming'); },
    voiceCargoSecured() { this.playVoiceCallout('cargoSecured'); },
    
    // Play a sound effect from a direct URL path
    async playSFX(url) {
        if (!this.ctx) this.init();
        
        const buffer = await this.loadAudio(url);
        if (!buffer) return;
        
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.sfxGain);
        source.start(0);
    },
    
    // ==================== SYNTHESIZED SFX ====================
    
    // Try to play SFX from file - returns true if it will play from file
    // This is synchronous - loads async but plays synth as fallback
    trySFXFile(name) {
        if (!this.ctx) return false;
        
        let files = this.sfxFiles[name];
        if (!files) return false;
        if (!Array.isArray(files)) files = [files];
        
        // Filter out files that failed
        const available = files.filter(f => !this.failedFiles.has(f));
        if (available.length === 0) return false;
        
        const filename = available[Math.floor(Math.random() * available.length)];
        const url = this.paths.sfx + filename;
        
        // If cached, play immediately
        if (this.buffers[url]) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.buffers[url];
            source.connect(this.sfxGain);
            source.start(0);
            return true;
        }
        
        // Not cached - try to load (async), return false to play synth now
        fetch(url).then(r => {
            if (!r.ok) { this.failedFiles.add(filename); return null; }
            return r.arrayBuffer();
        }).then(ab => {
            if (!ab) return null;
            return this.ctx.decodeAudioData(ab);
        }).then(buf => {
            if (buf) this.buffers[url] = buf;
        }).catch(() => this.failedFiles.add(filename));
        
        return false; // Play synth this time, file will be cached for next
    },
    
    _createOsc(type, freq, duration, volume = 0.1, detune = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.detune.value = detune;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.synthGain);  // Synth sounds go through synthGain
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
        return { osc, gain };
    },
    
    _noise(duration, volume = 0.1, filterFreq = null) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        if (filterFreq) {
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            source.connect(filter);
            filter.connect(gain);
        } else {
            source.connect(gain);
        }
        
        gain.connect(this.synthGain);  // Synth sounds go through synthGain
        source.start();
    },
    
    // ==================== GAME SFX ====================
    
    shoot() {
        this.ensureContext();
        if (this.trySFXFile('shoot')) return;
        this._createOsc('square', 800, 0.08, 0.08);
        this._createOsc('sawtooth', 400, 0.05, 0.04);
    },
    
    shootTriple() {
        this.ensureContext();
        if (this.trySFXFile('shootTriple')) return;
        this._createOsc('square', 900, 0.1, 0.06);
        this._createOsc('triangle', 600, 0.08, 0.04);
        this._createOsc('sawtooth', 300, 0.06, 0.03);
    },
    
    shootTorpedo() {
        this.ensureContext();
        if (this.trySFXFile('shootTorpedo')) return;
        this._createOsc('sine', 150, 0.3, 0.1);
        this._createOsc('sawtooth', 80, 0.2, 0.08);
        this._noise(0.15, 0.05, 200);
    },
    
    hit(size = 1) {
        this.ensureContext();
        if (this.trySFXFile('hit')) return;
        const vol = this.volumes.hit;
        const freq = size === 3 ? 80 : size === 2 ? 150 : 300;
        this._createOsc('sawtooth', freq, 0.15, 0.2 * vol);
        this._noise(0.1, 0.15 * vol);
    },
    
    explode(big = false) {
        this.ensureContext();
        if (big) {
            if (this.trySFXFile('explodeBig')) return;
        } else {
            if (this.trySFXFile('explode')) return;
        }
        const vol = this.volumes.explode;
        const pitch = 50 + Math.random() * 40;
        this._noise(big ? 0.5 : 0.3, (big ? 0.3 : 0.2) * vol);
        this._createOsc('sawtooth', pitch, big ? 0.4 : 0.25, 0.2 * vol);
        if (big) {
            setTimeout(() => this._noise(0.3, 0.15 * vol), 100);
        }
    },
    
    collect() {
        this.ensureContext();
        if (this.trySFXFile('collect')) return;
        const vol = this.volumes.collect;
        const pattern = Math.floor(Math.random() * 4);
        switch(pattern) {
            case 0:
                this._createOsc('sine', 880, 0.12, 0.15 * vol);
                setTimeout(() => this._createOsc('sine', 1320, 0.12, 0.12 * vol), 50);
                setTimeout(() => this._createOsc('sine', 1760, 0.15, 0.1 * vol), 100);
                break;
            case 1:
                this._createOsc('sine', 1200, 0.08, 0.15 * vol);
                setTimeout(() => this._createOsc('sine', 1600, 0.08, 0.12 * vol), 40);
                setTimeout(() => this._createOsc('sine', 2000, 0.1, 0.1 * vol), 80);
                break;
            case 2:
                this._createOsc('square', 988, 0.06, 0.12 * vol);
                this._createOsc('square', 1319, 0.1, 0.1 * vol);
                break;
            case 3:
                this._createOsc('triangle', 1047, 0.15, 0.15 * vol);
                setTimeout(() => this._createOsc('triangle', 1568, 0.12, 0.12 * vol), 60);
                break;
        }
    },
    
    powerup() {
        this.ensureContext();
        if (this.trySFXFile('powerup')) return;
        const vol = this.volumes.powerup;
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => setTimeout(() => this._createOsc('sine', n, 0.15, 0.18 * vol), i * 60));
    },
    
    damage() {
        this.ensureContext();
        if (this.trySFXFile('damage')) return;
        const vol = this.volumes.damage;
        this._noise(0.3, 0.3 * vol);
        this._createOsc('sawtooth', 100, 0.2, 0.25 * vol);
    },
    
    bomb() {
        this.ensureContext();
        if (this.trySFXFile('bomb')) return;
        this._noise(0.8, 0.3);
        this._createOsc('sawtooth', 40, 0.6, 0.2);
        setTimeout(() => this._createOsc('square', 60, 0.4, 0.15), 100);
    },
    
    shield() {
        this.ensureContext();
        if (this.trySFXFile('shield')) return;
        const vol = this.volumes.shield;
        this._createOsc('sine', 440, 0.2, 0.18 * vol);
        this._createOsc('sine', 550, 0.2, 0.15 * vol, 5);
    },
    
    shieldDown() {
        this.ensureContext();
        if (this.trySFXFile('shieldDown')) return;
        // Electric fizzle synth fallback
        const vol = this.volumes.shield;
        this._noise(0.3, 0.2 * vol, 2000);
        this._createOsc('sawtooth', 200, 0.2, 0.15 * vol);
        this._createOsc('square', 100, 0.25, 0.1 * vol);
    },
    
    spawn() {
        this.ensureContext();
        if (this.trySFXFile('spawn')) return;
        // Organic squelchy synth fallback
        this._createOsc('sine', 150, 0.2, 0.1);
        this._createOsc('triangle', 200, 0.15, 0.08);
        this._noise(0.1, 0.05, 500);
    },
    
    cannon() {
        this.ensureContext();
        if (this.trySFXFile('cannon')) return;
        // Heavy cannon synth fallback
        this._noise(0.3, 0.25);
        this._createOsc('sawtooth', 60, 0.3, 0.2);
        this._createOsc('square', 40, 0.25, 0.15);
    },
    
    thrust() {
        this.ensureContext();
        if (this.trySFXFile('thrust')) return;
        this._noise(0.1, 0.03, 150);
    },
    
    bossHit() {
        this.ensureContext();
        if (this.trySFXFile('bossHit')) return;
        this._createOsc('sawtooth', 120, 0.1, 0.15);
        this._noise(0.08, 0.1);
    },
    
    bossExplode() {
        this.ensureContext();
        if (this.trySFXFile('bossExplode')) return;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this._noise(0.4, 0.2);
                this._createOsc('sawtooth', 40 + i * 10, 0.3, 0.15);
            }, i * 150);
        }
    },
    
    levelComplete() {
        const melody = [523, 659, 784, 880, 1047, 1319];
        melody.forEach((n, i) => setTimeout(() => this._createOsc('sine', n, 0.3, 0.12), i * 100));
    },
    
    gameOver() {
        const melody = [440, 349, 294, 220];
        melody.forEach((n, i) => setTimeout(() => this._createOsc('sawtooth', n, 0.4, 0.1), i * 200));
    },
    
    menuSelect() {
        this._createOsc('sine', 660, 0.1, 0.08);
    },
    
    menuConfirm() {
        this._createOsc('sine', 880, 0.08, 0.1);
        setTimeout(() => this._createOsc('sine', 1100, 0.12, 0.08), 80);
    },
    
    pause() {
        this._createOsc('triangle', 440, 0.15, 0.08);
        this._createOsc('triangle', 330, 0.2, 0.06);
    },
    
    unpause() {
        this._createOsc('triangle', 330, 0.1, 0.06);
        this._createOsc('triangle', 440, 0.15, 0.08);
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Audio;
}
