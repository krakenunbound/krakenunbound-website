// Ad Astra - Route Planner / Auto-Pilot System
// route-planner.js - Multi-jump travel with encounter interrupts

import { Utils } from './utils.js';
import ShipManager from './ship.js';

class RoutePlanner {
    constructor(game) {
        this.game = game;
        
        // Route state
        this.state = 'idle'; // idle | traveling | paused | complete
        this.currentRoute = null;
        this.currentJumpIndex = 0;
        this.turnsCost = 0;
        
        // Travel timing
        this.jumpDelay = 2000; // ms between jumps (for animation)
        this.jumpTimeout = null;
    }

    /**
     * Plan a route to a destination
     * @param {number} destinationId - Target sector ID
     * @returns {object} Route info or error
     */
    planRoute(destinationId) {
        const gameData = this.game.gameState.gameData;
        const currentSector = gameData.currentSector;
        const ship = gameData.ship;

        if (currentSector === destinationId) {
            return { success: false, error: 'Already at destination' };
        }

        // Use NavigationComputer to find path
        const route = this.game.navigation.calculateRoute(currentSector, destinationId, ship);

        if (!route.success) {
            return { success: false, error: route.error || 'No route found' };
        }

        // Estimate encounters (rough guess based on distance)
        const estimatedEncounters = Math.floor(route.jumps * 0.25); // ~25% chance per jump

        return {
            success: true,
            path: route.path,
            jumps: route.jumps,
            fuelNeeded: route.fuelNeeded,
            turnsNeeded: route.jumps, // 1 turn per jump minimum
            estimatedTurns: route.jumps + estimatedEncounters, // Could be more with encounters
            canAfford: {
                fuel: ship.fuel >= route.fuelNeeded,
                turns: gameData.turns >= route.jumps
            },
            destination: this.game.galaxy.getSector(destinationId)
        };
    }

    /**
     * Start traveling a planned route
     * @param {number} destinationId - Target sector ID
     * @returns {boolean} Success
     */
    startRoute(destinationId) {
        const plan = this.planRoute(destinationId);

        if (!plan.success) {
            this.game.ui.showError(plan.error);
            return false;
        }

        if (!plan.canAfford.fuel) {
            this.game.ui.showError(`Not enough fuel! Need ${plan.fuelNeeded}, have ${this.game.gameState.gameData.ship.fuel}`);
            return false;
        }

        if (!plan.canAfford.turns) {
            this.game.ui.showError(`Not enough turns! Need ${plan.jumps}, have ${this.game.gameState.gameData.turns}`);
            return false;
        }

        // Set up route
        this.currentRoute = plan;
        this.currentJumpIndex = 0;
        this.turnsCost = 0;
        this.state = 'traveling';

        // Show route started message
        this.game.ui.addMessage(`🚀 Auto-pilot engaged: ${plan.jumps} jumps to Sector ${destinationId}`, 'info');
        
        // Show travel UI
        this.showRouteProgress();

        // Start first jump
        this.executeNextJump();

        return true;
    }

    /**
     * Execute the next jump in the route
     */
    executeNextJump() {
        if (this.state !== 'traveling' || !this.currentRoute) {
            return;
        }

        const gameData = this.game.gameState.gameData;
        const path = this.currentRoute.path;
        
        // Check if route complete
        if (this.currentJumpIndex >= path.length - 1) {
            this.completeRoute();
            return;
        }

        // Get next sector
        const fromSector = path[this.currentJumpIndex];
        const toSector = path[this.currentJumpIndex + 1];

        // Check resources
        if (gameData.turns < 1) {
            this.pauseRoute('Out of turns!');
            return;
        }

        // Calculate fuel for this jump
        const fromData = this.game.galaxy.getSector(fromSector);
        const toData = this.game.galaxy.getSector(toSector);
        const distance = Utils.distance(fromData.x, fromData.y, toData.x, toData.y);
        const fuelCost = ShipManager.calculateFuelCost(distance);
        const travelTime = ShipManager.calculateTravelTime(distance, gameData.ship.speed);

        if (gameData.ship.fuel < fuelCost) {
            this.pauseRoute('Out of fuel!');
            return;
        }

        // Consume resources
        gameData.turns -= 1;
        ShipManager.useFuel(gameData.ship, fuelCost);
        this.turnsCost += 1;

        // Show hyperspace travel overlay
        this.game.ui.addMessage(`⭐ Jumping to Sector ${toSector}...`, 'info');
        this.game.ui.showTravelOverlay(travelTime, toSector);
        this.game.audio.playSfx('warp');

        // After travel animation completes, arrive and check for encounters
        setTimeout(() => {
            this.game.ui.hideTravelOverlay();
            
            // Move to sector
            gameData.currentSector = toSector;
            this.game.gameState.save();
            this.currentJumpIndex++;

            // Update particle effects for new sector
            this.updateParticlesForSector(toSector);

            // Update UI
            this.showRouteProgress();
            this.game.updateUI();

            // Check for asteroid field first (triggers minigame if present)
            this.game.checkAsteroidField(toSector, () => {
                // After asteroid field (or immediately if none), check for random encounter
                const encounter = this.checkForEncounter();
                
                if (encounter) {
                    // Pause route for encounter
                    this.state = 'paused';
                    this.game.encounters.triggerEncounter(encounter, () => {
                        // Callback when encounter resolved
                        this.resumeRoute();
                    });
                    return;
                }

                // Continue to next jump after short delay
                this.jumpTimeout = setTimeout(() => {
                    this.executeNextJump();
                }, 500); // Brief pause between jumps
            });
            
        }, travelTime);
    }

    /**
     * Check for random encounter during travel
     * @returns {object|null} Encounter or null
     */
    checkForEncounter() {
        // Base 25% chance per jump
        const encounterChance = 0.25;
        
        if (Math.random() < encounterChance) {
            return this.game.encounters.rollEncounter();
        }
        
        return null;
    }

    /**
     * Update particle effects based on sector contents
     * @param {number} sectorId - Sector to check
     */
    updateParticlesForSector(sectorId) {
        if (!window.particleSystem) return;
        
        const sector = this.game.galaxy.getSector(sectorId);
        const hasAsteroids = sector?.contents?.some(c => c.type === 'debris' && c.name === 'Asteroid Field');
        
        console.log(`🎨 Route particle switch: sector=${sectorId}, asteroids=${hasAsteroids}`);
        window.particleSystem.setMode(hasAsteroids ? 'asteroids' : 'starfield');
    }

    /**
     * Pause the route (for encounters or resource shortage)
     * @param {string} reason - Why route was paused
     */
    pauseRoute(reason) {
        this.state = 'paused';
        
        if (this.jumpTimeout) {
            clearTimeout(this.jumpTimeout);
            this.jumpTimeout = null;
        }

        this.game.ui.addMessage(`⚠️ Route paused: ${reason}`, 'warning');
        this.showRouteProgress();
    }

    /**
     * Resume route after encounter/pause
     */
    resumeRoute() {
        if (this.state !== 'paused' || !this.currentRoute) {
            return;
        }

        this.state = 'traveling';
        this.game.ui.addMessage('🚀 Resuming route...', 'info');
        
        // Refresh particles for current sector (in case encounter changed view)
        this.updateParticlesForSector(this.game.gameState.gameData.currentSector);
        
        // Continue after short delay
        this.jumpTimeout = setTimeout(() => {
            this.executeNextJump();
        }, 1000);
    }

    /**
     * Cancel the current route
     */
    cancelRoute() {
        if (this.jumpTimeout) {
            clearTimeout(this.jumpTimeout);
            this.jumpTimeout = null;
        }

        const wasActive = this.state === 'traveling' || this.state === 'paused';
        
        this.state = 'idle';
        this.currentRoute = null;
        this.currentJumpIndex = 0;

        if (wasActive) {
            this.game.ui.hideTravelOverlay();
            this.game.ui.addMessage('🛑 Route cancelled', 'warning');
        }

        this.hideRouteProgress();
    }

    /**
     * Complete the route successfully
     */
    completeRoute() {
        const destination = this.currentRoute.path[this.currentRoute.path.length - 1];
        
        this.state = 'complete';
        this.game.ui.addMessage(`✅ Arrived at Sector ${destination}! (${this.turnsCost} turns used)`, 'success');
        this.game.audio.playSfx('success');

        // Clean up
        this.currentRoute = null;
        this.currentJumpIndex = 0;
        this.state = 'idle';

        this.hideRouteProgress();
        this.game.updateUI();
    }

    /**
     * Show route progress UI
     */
    showRouteProgress() {
        if (!this.currentRoute) return;

        const progress = this.currentJumpIndex;
        const total = this.currentRoute.jumps;
        const destination = this.currentRoute.path[this.currentRoute.path.length - 1];
        const percent = Math.round((progress / total) * 100);

        let html = `
            <div id="route-progress" style="
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(15, 23, 42, 0.95);
                border: 2px solid var(--accent-blue);
                border-radius: 8px;
                padding: 15px 25px;
                z-index: 1000;
                min-width: 300px;
                text-align: center;
            ">
                <div style="color: var(--accent-blue); font-weight: bold; margin-bottom: 10px;">
                    🚀 AUTO-PILOT: Sector ${destination}
                </div>
                <div style="background: rgba(0,0,0,0.5); border-radius: 4px; height: 20px; margin-bottom: 10px;">
                    <div style="background: var(--accent-green); height: 100%; border-radius: 4px; width: ${percent}%; transition: width 0.3s;"></div>
                </div>
                <div style="color: var(--text-secondary); margin-bottom: 10px;">
                    Jump ${progress}/${total} (${percent}%)
                </div>
                <div style="color: ${this.state === 'paused' ? 'var(--accent-yellow)' : 'var(--accent-green)'};">
                    Status: ${this.state.toUpperCase()}
                </div>
                <button onclick="window.game.routePlanner.cancelRoute()" style="margin-top: 10px; padding: 5px 15px;">
                    Cancel Route
                </button>
            </div>
        `;

        // Remove existing progress if any
        this.hideRouteProgress();

        // Add new progress
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
    }

    /**
     * Hide route progress UI
     */
    hideRouteProgress() {
        const existing = document.getElementById('route-progress');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Get current route status
     */
    getStatus() {
        return {
            state: this.state,
            route: this.currentRoute,
            currentJump: this.currentJumpIndex,
            turnsCost: this.turnsCost
        };
    }

    /**
     * Check if currently traveling
     */
    isActive() {
        return this.state === 'traveling' || this.state === 'paused';
    }

    // ==========================================
    // ROUTE PLANNING DIALOG UI
    // ==========================================

    /**
     * Show route planning dialog for multi-jump travel
     * @param {number} destinationId - Target sector
     */
    showPlanDialog(destinationId) {
        const plan = this.planRoute(destinationId);
        
        if (!plan.success) {
            this.game.ui.showError(plan.error);
            return;
        }

        const destination = plan.destination;
        const destinationName = destination?.contents?.find(c => c.name)?.name || `Sector ${destinationId}`;
        
        // Build route preview
        const routePreview = plan.path.map((sectorId, index) => {
            if (index === 0) return `📍 ${sectorId} (You)`;
            if (index === plan.path.length - 1) return `🎯 ${sectorId} (Dest)`;
            return `→ ${sectorId}`;
        }).join(' ');

        const modalHtml = `
            <div id="route-planning-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
                    border: 2px solid var(--accent-blue);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                ">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 2.5em; margin-bottom: 10px;">🗺️</div>
                        <h2 style="color: var(--accent-blue); margin: 0;">Plan Route</h2>
                        <div style="color: var(--text-secondary); margin-top: 5px;">to ${destinationName}</div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <span style="color: var(--text-secondary);">Jumps:</span>
                                <span style="color: var(--accent-yellow); font-weight: bold;"> ${plan.jumps}</span>
                            </div>
                            <div>
                                <span style="color: var(--text-secondary);">Fuel:</span>
                                <span style="color: ${plan.canAfford.fuel ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: bold;"> ${plan.fuelNeeded}</span>
                            </div>
                            <div>
                                <span style="color: var(--text-secondary);">Min Turns:</span>
                                <span style="color: ${plan.canAfford.turns ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: bold;"> ${plan.turnsNeeded}</span>
                            </div>
                            <div>
                                <span style="color: var(--text-secondary);">Est. Turns:</span>
                                <span style="color: var(--accent-yellow); font-weight: bold;"> ~${plan.estimatedTurns}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 0.85em; color: var(--text-secondary); word-break: break-all;">
                        ${routePreview}
                    </div>
                    
                    <div style="color: var(--accent-yellow); font-size: 0.9em; margin-bottom: 20px; text-align: center;">
                        ⚠️ Random encounters may interrupt your journey
                    </div>
                    
                    ${!plan.canAfford.fuel ? '<div style="color: var(--accent-red); margin-bottom: 15px; text-align: center;">❌ Not enough fuel!</div>' : ''}
                    ${!plan.canAfford.turns ? '<div style="color: var(--accent-red); margin-bottom: 15px; text-align: center;">❌ Not enough turns!</div>' : ''}
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.game.routePlanner.confirmRoute(${destinationId})" 
                                style="padding: 10px 25px; background: var(--accent-green); border: none; border-radius: 4px; color: white; cursor: pointer;"
                                ${(!plan.canAfford.fuel || !plan.canAfford.turns) ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            🚀 Engage Auto-Pilot
                        </button>
                        <button onclick="window.game.routePlanner.closePlanDialog()" 
                                style="padding: 10px 25px; background: rgba(100,100,100,0.3); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        this.closePlanDialog();

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);
    }

    /**
     * Close route planning dialog
     */
    closePlanDialog() {
        const modal = document.getElementById('route-planning-modal');
        if (modal) modal.remove();
    }

    /**
     * Confirm and start route from dialog
     * @param {number} destinationId - Target sector
     */
    confirmRoute(destinationId) {
        this.closePlanDialog();
        this.startRoute(destinationId);
    }
}

export default RoutePlanner;