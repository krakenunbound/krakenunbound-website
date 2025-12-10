// Ad Astra - UI Management
// ui.js - UI rendering and update functions

import { Utils } from './utils.js';
import ShipManager from './ship.js';

export class UI {
    constructor() {
        this.currentView = 'sector';
        this.messageContainer = document.getElementById('message-container');
    }

    // Get random vendor image based on location (consistent per location)
    getRandomVendorImage(locationName) {
        // Seed random based on location name
        let hash = 0;
        for (let i = 0; i < locationName.length; i++) {
            hash = ((hash << 5) - hash) + locationName.charCodeAt(i);
            hash = hash & hash;
        }

        // Choose from 4 vendor images
        const vendorNum = (Math.abs(hash) % 4) + 1;
        return `assets/images/vendor${vendorNum}.webp`;
    }

    // Switch between screens
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            // screen.style.display = 'none'; // Removed to let CSS handle it
        });
        const targetScreen = document.getElementById(`${screenId}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            // targetScreen.style.display = 'block'; // Removed to let CSS handle it
        } else {
            console.error(`Screen not found: ${screenId}-screen`);
        }
    }

    // Switch between view panels
    showView(viewId) {
        // Remove active class from all panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-buttons button').forEach(btn => {
            btn.classList.remove('active');
            btn.removeAttribute('aria-current');
        });

        // Add active class to target panel
        const targetPanel = document.getElementById(`${viewId}-view`);
        if (targetPanel) {
            targetPanel.classList.add('active');

            // Add active class to corresponding nav button
            const navButton = document.getElementById(`nav-${viewId}`);
            if (navButton) {
                navButton.classList.add('active');
                navButton.setAttribute('aria-current', 'page');
            }

            // Special handling for galaxy view
            if (viewId === 'galaxy') {
                if (window.game && window.game.galaxy && window.game.galaxy.data && window.game.gameState && window.game.gameState.gameData) {
                    this.renderGalaxyMap(window.game.galaxy.data, window.game.gameState.gameData.currentSector, window.game.gameState.gameData.ship);
                } else {
                    console.warn('Galaxy data not ready for rendering yet.');
                    const mapContainer = document.getElementById('galaxy-map');
                    if (mapContainer) mapContainer.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">Loading galaxy data...</p>';
                }
            }
        } else {
            console.error(`View not found: ${viewId}-view`);
        }
        this.currentView = viewId;
    }

    // Render Galaxy Map with zoom and pan
    renderGalaxyMap(galaxyData, currentSectorId, ship = null) {
        const container = document.getElementById('galaxy-map');
        console.log('🗺️ renderGalaxyMap called:', {
            hasContainer: !!container,
            hasGalaxyData: !!galaxyData,
            currentSectorId: currentSectorId,
            sectorsCount: galaxyData?.sectors ? Object.keys(galaxyData.sectors).length : 0
        });

        if (!container || !galaxyData) {
            console.error('❌ Galaxy map render failed:', { container: !!container, galaxyData: !!galaxyData });
            return;
        }

        container.innerHTML = '';
        const sectors = galaxyData.sectors;

        // Initialize zoom state if not exists
        if (!this.galaxyMapState) {
            this.galaxyMapState = {
                zoom: 1,
                offsetX: 0,
                offsetY: 0,
                isDragging: false,
                lastX: 0,
                lastY: 0
            };
        }

        // Create inner container for zoom/pan
        const mapInner = document.createElement('div');
        mapInner.id = 'galaxy-map-inner';
        mapInner.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            transform-origin: center center;
        `;
        container.appendChild(mapInner);

        // Draw connections first (so they are behind nodes)
        const drawnConnections = new Set();

        Object.values(sectors).forEach(sector => {
            sector.warps.forEach(targetId => {
                // Avoid drawing twice
                const connectionId = [sector.id, targetId].sort().join('-');
                if (drawnConnections.has(connectionId)) return;
                drawnConnections.add(connectionId);

                const target = sectors[targetId];
                this.drawConnection(mapInner, sector, target);
            });
        });

        // Find current sector for centering
        const currentSector = sectors[currentSectorId];

        // Draw sector nodes
        let nodesCreated = 0;
        Object.values(sectors).forEach(sector => {
            const node = document.createElement('div');
            node.className = 'sector-node';

            // Assign star type for visual variety (deterministic based on sector ID)
            const starTypes = ['star-red-giant', 'star-red-dwarf', 'star-yellow', 'star-white-dwarf', 'star-blue-giant'];
            const starTypeIndex = sector.id % starTypes.length;
            node.classList.add(starTypes[starTypeIndex]);

            // Position (0-100 coordinate system)
            // Adjust offset based on star size
            const sizeOffset = sector.id == currentSectorId ? 25 : (starTypeIndex === 0 ? 9 : starTypeIndex === 3 ? 4 : 6);
            node.style.left = `calc(${sector.x}% - ${sizeOffset}px)`;
            node.style.top = `calc(${sector.y}% - ${sizeOffset}px)`;
            nodesCreated++;

            // Styling based on content
            if (sector.id == currentSectorId) {
                node.classList.add('current');
                node.style.zIndex = '30';
            }

            const hasPlanet = sector.contents.some(c => c.type === 'planet');
            const hasStation = sector.contents.some(c => c.type === 'station');

            if (hasPlanet) node.classList.add('has-planet');
            if (hasStation) node.classList.add('has-station');

            // Tooltip
            let tooltip = `Sector ${sector.id}`;
            if (hasPlanet) tooltip += '\n🪐 Planet';
            if (hasStation) tooltip += '\n⛽ Station';
            if (sector.id == currentSectorId) tooltip += '\n📍 You are here';

            // Calculate reachability zones
            let fuelCost = 0;
            let travelTime = 0;
            let hasWarpLane = false;
            let zone = 'green'; // green, yellow, red

            if (ship && sector.id != currentSectorId && window.game?.navigation) {
                const currentSectorData = galaxyData.sectors[currentSectorId];
                if (currentSectorData) {
                    // Check if there's a direct warp lane connection
                    // Use Number() to ensure type consistency
                    hasWarpLane = currentSectorData.warps?.includes(Number(sector.id)) ||
                        currentSectorData.warps?.includes(sector.id);

                    // Calculate direct distance (for single jump)
                    const dist = Utils.distance(currentSectorData.x, currentSectorData.y, sector.x, sector.y);
                    const directFuelCost = ShipManager.calculateFuelCost(dist);
                    travelTime = ShipManager.calculateTravelTime(dist, ship.speed);

                    if (hasWarpLane) {
                        // Direct connection exists
                        fuelCost = directFuelCost;
                        tooltip += `\n⛽ Fuel: ${fuelCost}`;
                        tooltip += `\n⏱️ Time: ${(travelTime / 1000).toFixed(1)}s`;

                        if (directFuelCost <= ship.fuel) {
                            zone = 'green';
                            tooltip += '\n✅ Direct jump available';
                        } else {
                            zone = 'red';
                            tooltip += '\n❌ Not enough fuel!';
                        }
                    } else {
                        // No direct connection - calculate route
                        const route = window.game.navigation.calculateRoute(currentSectorId, sector.id, ship);

                        if (route.success) {
                            fuelCost = route.fuelNeeded;
                            tooltip += `\n🗺️ Route: ${route.jumps} jumps`;
                            tooltip += `\n⛽ Total fuel: ${fuelCost}`;

                            if (route.fuelNeeded <= ship.fuel) {
                                zone = 'yellow';
                                tooltip += '\n🟡 Route plannable';
                                // The following code block was inserted by the user's request.
                                // It appears to be HTML generation for a "fighter-location" display,
                                // which is out of context for a galaxy map tooltip.
                                // It will cause a syntax error as 'summary' and 'html' are undefined here.
                                // To maintain syntactic correctness as per instructions, it's commented out.
                                // If this was intended for a different part of the UI, it should be placed there.
                                /*
                                summary.locations.forEach(loc => {
                                            html += `
                                                <div class="fighter-location">
                                                    <div class="fighter-location-info">
                                                        <div class="fighter-location-sector">Sector ${loc.sectorId}</div>
                                                        <div class="fighter-location-counts">
                                                            Fighters: ${loc.fighters} | Mines: ${loc.mines}
                                                        </div>
                                                    </div>
                                                </div>
                                            `;
                                        });
                                */
                            } else {
                                zone = 'red';
                                tooltip += '\n❌ Beyond fuel range';
                            }
                        } else {
                            zone = 'red';
                            tooltip += '\n❌ No route available';
                        }
                    }
                }
            }

            // Apply zone class
            node.classList.add(`zone-${zone}`);
            node.title = tooltip;

            // Click to warp or plan route
            node.onclick = () => {
                console.log('🗺️ Galaxy map click:', {
                    targetSector: sector.id,
                    currentSector: currentSectorId,
                    zone: zone,
                    hasWarpLane: hasWarpLane,
                    fuelCost: fuelCost
                });

                if (window.game) {
                    if (sector.id == currentSectorId) {
                        console.log('🗺️ Same sector, ignoring');
                        return;
                    }

                    // Red zone - can't reach
                    if (zone === 'red') {
                        window.game.ui.showError('Cannot reach this sector - not enough fuel!');
                        window.game.audio?.playSfx('error');
                        return;
                    }

                    // Green zone - direct jump
                    if (hasWarpLane && zone === 'green') {
                        if (confirm(`Warp to Sector ${sector.id}?\nCost: ${fuelCost} Fuel\nTime: ${(travelTime / 1000).toFixed(1)}s`)) {
                            console.log('🗺️ Warping to sector', sector.id);
                            window.game.warpToSector(sector.id);
                        }
                    } else {
                        // Yellow zone or non-direct green - route planning
                        console.log('🗺️ Opening route planner');
                        window.game.routePlanner.showPlanDialog(sector.id);
                    }
                } else {
                    console.error('🗺️ window.game not available!');
                }
            };

            mapInner.appendChild(node);
        });

        console.log(`✅ Created ${nodesCreated} sector nodes`);
        console.log(`📐 Container dimensions:`, {
            width: container.offsetWidth,
            height: container.offsetHeight,
            childCount: mapInner.children.length
        });

        // Auto-center on current location
        if (currentSector) {
            // Calculate offset to center current sector
            // Convert sector position (0-100%) to center of container
            const centerX = 50 - currentSector.x;
            const centerY = 50 - currentSector.y;

            this.galaxyMapState.offsetX = centerX;
            this.galaxyMapState.offsetY = centerY;
        }

        // Apply initial transform
        this.updateGalaxyMapTransform(mapInner);

        // Add zoom controls overlay
        this.addGalaxyMapControls(container);

        // Add event listeners for zoom and pan
        this.setupGalaxyMapInteraction(container, mapInner);
    }

    // Update galaxy map transform
    updateGalaxyMapTransform(mapInner) {
        const state = this.galaxyMapState;
        mapInner.style.transform = `translate(${state.offsetX}%, ${state.offsetY}%) scale(${state.zoom})`;
    }

    // Add zoom controls
    addGalaxyMapControls(container) {
        const controls = document.createElement('div');
        controls.id = 'galaxy-map-controls';
        controls.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 100;
        `;

        const buttonStyle = `
            background: var(--bg-medium);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            width: 40px;
            height: 40px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;

        // Zoom in button
        const zoomIn = document.createElement('button');
        zoomIn.innerHTML = '+';
        zoomIn.style.cssText = buttonStyle;
        zoomIn.title = 'Zoom In';
        zoomIn.onclick = () => this.zoomGalaxyMap(0.2);

        // Zoom out button
        const zoomOut = document.createElement('button');
        zoomOut.innerHTML = '−';
        zoomOut.style.cssText = buttonStyle;
        zoomOut.title = 'Zoom Out';
        zoomOut.onclick = () => this.zoomGalaxyMap(-0.2);

        // Reset button
        const reset = document.createElement('button');
        reset.innerHTML = '⌂';
        reset.style.cssText = buttonStyle;
        reset.title = 'Reset View';
        reset.onclick = () => this.resetGalaxyMapView();

        controls.appendChild(zoomIn);
        controls.appendChild(zoomOut);
        controls.appendChild(reset);

        container.appendChild(controls);
    }

    // Setup interaction handlers
    setupGalaxyMapInteraction(container, mapInner) {
        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoomGalaxyMap(delta);
        }, { passive: false });

        // Touch/pinch zoom
        let initialDistance = 0;
        let initialZoom = 1;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                initialZoom = this.galaxyMapState.zoom;
            }
        });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                const scale = currentDistance / initialDistance;
                this.galaxyMapState.zoom = Math.max(0.5, Math.min(5, initialZoom * scale));
                this.updateGalaxyMapTransform(mapInner);
            }
        }, { passive: false });

        // Pan with mouse drag
        container.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('sector-node')) return;
            this.galaxyMapState.isDragging = true;
            this.galaxyMapState.lastX = e.clientX;
            this.galaxyMapState.lastY = e.clientY;
            container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.galaxyMapState.isDragging) return;
            const dx = e.clientX - this.galaxyMapState.lastX;
            const dy = e.clientY - this.galaxyMapState.lastY;

            // Convert pixel movement to percentage based on container size
            const rect = container.getBoundingClientRect();
            this.galaxyMapState.offsetX += (dx / rect.width) * 100;
            this.galaxyMapState.offsetY += (dy / rect.height) * 100;

            this.galaxyMapState.lastX = e.clientX;
            this.galaxyMapState.lastY = e.clientY;
            this.updateGalaxyMapTransform(mapInner);
        });

        document.addEventListener('mouseup', () => {
            this.galaxyMapState.isDragging = false;
            container.style.cursor = 'default';
        });
    }

    // Zoom function
    zoomGalaxyMap(delta) {
        this.galaxyMapState.zoom = Math.max(0.5, Math.min(5, this.galaxyMapState.zoom + delta));
        const mapInner = document.getElementById('galaxy-map-inner');
        if (mapInner) {
            this.updateGalaxyMapTransform(mapInner);
        }
    }

    // Reset view
    resetGalaxyMapView() {
        // Re-render to reset to current location
        if (window.game && window.game.galaxy && window.game.galaxy.data && window.game.gameState && window.game.gameState.gameData) {
            this.galaxyMapState = null; // Reset state
            this.renderGalaxyMap(window.game.galaxy.data, window.game.gameState.gameData.currentSector, window.game.gameState.gameData.ship);
        }
    }

    // Helper to draw a line between two sectors
    drawConnection(container, s1, s2) {
        const line = document.createElement('div');
        line.className = 'warp-line';

        // Calculate length and angle
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Set position and dimensions
        // We use percentage for responsiveness
        // Note: This is an approximation that works well if the container is square-ish
        // For perfect lines in responsive containers, SVG is better, but this fits the current CSS approach

        line.style.width = `${distance}%`;
        line.style.left = `${s1.x}%`;
        line.style.top = `${s1.y}%`;
        line.style.transform = `rotate(${angle}deg)`;

        container.appendChild(line);
    }

    // Switch auth forms
    showAuthForm(formName) {
        document.querySelectorAll('.form-section').forEach(form => {
            form.classList.remove('active');
            form.style.display = 'none';
        });
        const targetForm = document.getElementById(`${formName}-form`) || document.getElementById(formName);
        if (targetForm) {
            targetForm.classList.add('active');
            targetForm.style.display = 'block';
        } else {
            console.error(`Form not found: ${formName}`);
        }
    }

    // Update top bar info
    updateTopBar(gameState) {
        const summary = gameState.getPlayerSummary();
        if (!summary) return;

        document.getElementById('pilot-name-display').textContent = summary.pilotName;
        document.getElementById('credits-display').textContent =
            `Credits: ${Utils.format.credits(summary.credits)}`;
        document.getElementById('turns-display').textContent =
            `Turns: ${summary.turns}`;

        // Update sector display
        document.getElementById('sector-display').textContent =
            `Sector: ${summary.sector}`;

        // Update fuel display (get fuel from ship data)
        const fuel = gameState.gameData.ship.fuel || 0;
        const fuelMax = gameState.gameData.ship.fuelMax || 0;
        document.getElementById('fuel-display').textContent =
            `Fuel: ${fuel}/${fuelMax}`;

        // Update the panel header sector ID
        const currentSectorIdElement = document.getElementById('current-sector-id');
        if (currentSectorIdElement) {
            currentSectorIdElement.textContent = summary.sector;
        }
    }

    // Display sector information
    displaySector(sector, gameState) {
        const sectorInfo = document.getElementById('sector-info');
        const sectorActions = document.getElementById('sector-actions');

        if (!sector) {
            sectorInfo.innerHTML = '<p>Invalid sector</p>';
            sectorActions.innerHTML = '';
            return;
        }

        // Build sector info HTML
        let html = `<h3>Sector ${sector.id}</h3>`;
        html += `<p class="text-secondary">Coordinates: (${sector.x.toFixed(1)}, ${sector.y.toFixed(1)})</p>`;

        // Show players in sector (low-key, informational)
        const playersHere = (window.game && window.game.multiplayer)
            ? window.game.multiplayer.getPlayersInSector(sector.id).filter(
                p => p.username !== gameState.currentUser
            )
            : [];

        if (playersHere.length > 0) {
            html += '<div class="players-present" style="background: rgba(100, 100, 255, 0.1); border-left: 3px solid var(--accent-blue); padding: 10px; margin: 10px 0; border-radius: 4px;">';
            html += `<div style="color: var(--accent-blue); font-size: 0.9rem; margin-bottom: 5px;">👥 ${playersHere.length} ${playersHere.length === 1 ? 'player' : 'players'} in sector</div>`;
            if (playersHere.length <= 5) {
                playersHere.forEach(player => {
                    const minutesAgo = Math.floor((Date.now() - player.lastSeen) / 60000);
                    const timeStr = minutesAgo < 1 ? 'just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
                    html += `<div style="font-size: 0.85rem; color: #aaa; margin-left: 10px;">• ${player.pilotName} (${player.ship.class}) - ${timeStr}</div>`;
                });
            }
            html += '</div>';
        }

        if (sector.contents.length === 0) {
            html += '<p>Empty space. Nothing of interest here.</p>';
        } else {
            html += '<div class="sector-contents">';
            sector.contents.forEach(content => {
                html += this.createContentCard(content);
            });
            html += '</div>';
        }

        sectorInfo.innerHTML = html;

        // Build action buttons
        sectorActions.innerHTML = '';

        // Warp buttons
        if (sector.warps && sector.warps.length > 0) {
            const warpDiv = document.createElement('div');
            warpDiv.style.width = '100%';
            warpDiv.innerHTML = '<h4 style="color: var(--accent-blue); margin-bottom: 10px;">Warp to:</h4>';

            sector.warps.forEach(warpId => {
                const btn = document.createElement('button');
                btn.textContent = `Sector ${warpId}`;
                btn.onclick = () => window.game.warpToSector(warpId);
                btn.disabled = gameState.gameData.turns < 1;
                warpDiv.appendChild(btn);
            });

            sectorActions.appendChild(warpDiv);
        }

        // Content-specific actions
        sector.contents.forEach(content => {
            if (content.type === 'planet') {
                const btn = document.createElement('button');
                btn.textContent = `Trade at ${content.name}`;
                btn.onclick = () => window.game.showTrading(content);
                sectorActions.appendChild(btn);

                // Planet Claim/Management
                if (content.owner === gameState.currentUser) {
                    const manageBtn = document.createElement('button');
                    manageBtn.textContent = 'Manage Colony';
                    manageBtn.className = 'btn-primary';
                    manageBtn.style.marginTop = '5px';
                    manageBtn.onclick = () => {
                        window.game.ui.showView('computer');
                        document.getElementById('comp-nav-colonies').click();
                    };
                    sectorActions.appendChild(manageBtn);
                } else if (!content.owner) {
                    const claimBtn = document.createElement('button');
                    claimBtn.textContent = 'Claim Planet (10k cr)';
                    claimBtn.className = 'btn-secondary';
                    claimBtn.style.marginTop = '5px';
                    // Pass current loop index
                    const planetIndex = sector.contents.indexOf(content);
                    claimBtn.onclick = () => window.game.claimPlanet(sector.id, planetIndex);
                    sectorActions.appendChild(claimBtn);
                }
            } else if (content.type === 'station') {
                const btn = document.createElement('button');
                btn.textContent = `Dock at ${content.name}`;
                btn.onclick = () => window.game.dockAtStation(content);
                sectorActions.appendChild(btn);
            }
        });

        // Check for asteroid field and show/hide mining controls
        const hasAsteroids = sector.contents.some(c => c.type === 'debris' && c.name === 'Asteroid Field');
        const miningControls = document.getElementById('mining-controls');
        const miningStatus = document.getElementById('mining-equipment-status');

        if (hasAsteroids && miningControls) {
            console.log('🪨 Asteroid field detected, showing mining controls');
            miningControls.style.display = 'block';

            // Show equipment status
            const ship = gameState.gameData.ship;
            if (ship.equipment && ship.equipment.miningLaser) {
                miningStatus.innerHTML = `
                    <span style="color: var(--accent-green);">✓ Mining Equipment Installed:</span> 
                    <strong>${ship.equipment.miningLaser.name}</strong> (Level ${ship.equipment.miningLaser.level})
                `;
            } else {
                miningStatus.innerHTML = `
                    <span style="color: var(--accent-red);">✗ No mining equipment installed</span><br>
                    <small style="color: var(--text-secondary);">Purchase mining lasers at stations to extract ore from asteroids</small>
                `;
            }
        } else if (miningControls) {
            miningControls.style.display = 'none';
        }
    }

    // Create content card HTML
    createContentCard(content) {
        let iconHtml = '';

        // Try to use assets if available
        if (window.game && window.game.assets) {
            let imgSrc = '';
            if (content.type === 'planet') {
                imgSrc = window.game.assets.getPlanetImage(content.planetType);
            } else if (content.type === 'station') {
                imgSrc = window.game.assets.getStationImage(content.class);
            }

            if (imgSrc) {
                iconHtml = `<div class="content-card-icon"><img src="${imgSrc}" alt="${content.name}" style="width: 64px; height: 64px; object-fit: contain;"></div>`;
            }
        }

        // Fallback to emojis
        if (!iconHtml) {
            const icons = {
                planet: '🌍',
                station: '🛰️',
                debris: '☄️'
            };
            iconHtml = `<div class="content-card-icon">${icons[content.type] || '❓'}</div>`;
        }

        let html = '<div class="content-card">';
        html += iconHtml;
        html += `<div class="content-card-title">${content.name}</div>`;

        if (content.type === 'planet') {
            html += `<div class="content-card-desc">${content.planetType} Planet</div>`;
            html += `<div class="content-card-desc">Pop: ${Utils.format.number(content.population)}</div>`;
        } else if (content.type === 'station') {
            html += `<div class="content-card-desc">Services Available</div>`;
        } else if (content.description) {
            html += `<div class="content-card-desc">${content.description}</div>`;
        }

        html += '</div>';
        return html;
    }

    // Display ship stats
    displayShip(ship, cargo) {
        const shipStats = document.getElementById('ship-stats');
        const cargoList = document.getElementById('cargo-list');

        let html = '<div class="ship-stats-grid">';

        // Add ship image
        if (window.game && window.game.assets) {
            // Use player's saved ship variant if available
            const shipVariant = window.game.gameState?.gameData?.shipVariant || ship.shipVariant || 1;
            console.log(`🖼️ Displaying ship: type=${ship.type}, variant=${shipVariant}`);
            const shipImg = window.game.assets.getPlayerShipImage(ship.type, shipVariant);
            html += `<div class="ship-image-container" style="grid-column: 1 / -1; text-align: center; margin-bottom: 20px;">
                <img src="${shipImg}" class="ship-image" style="max-width: 300px; height: auto; border-radius: 8px; border: 1px solid var(--border-color);">
            </div>`;
        }

        // Hull
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Hull Integrity</div>';
        html += `<div class="stat-value">${ship.hull}/${ship.hullMax}</div>`;
        html += `<div class="stat-bar"><div class="stat-bar-fill ${ship.hull < ship.hullMax * 0.3 ? 'low' : ''}" style="width: ${(ship.hull / ship.hullMax) * 100}%"></div></div>`;
        html += '</div>';

        // Shields
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Shields</div>';
        html += `<div class="stat-value">${ship.shields}/${ship.shieldsMax}</div>`;
        html += `<div class="stat-bar"><div class="stat-bar-fill" style="width: ${(ship.shields / ship.shieldsMax) * 100}%"></div></div>`;
        html += '</div>';

        // Weapons
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Weapons</div>';
        html += `<div class="stat-value">${ship.weapons}</div>`;
        html += '</div>';

        // Fuel
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Fuel</div>';
        html += `<div class="stat-value">${ship.fuel}/${ship.fuelMax}</div>`;
        html += `<div class="stat-bar"><div class="stat-bar-fill ${ship.fuel < ship.fuelMax * 0.2 ? 'low' : ''}" style="width: ${(ship.fuel / ship.fuelMax) * 100}%"></div></div>`;
        html += '</div>';

        // Cargo
        const totalCargo = Object.values(cargo).reduce((sum, q) => sum + q, 0);
        html += '<div class="stat-item">';
        html += '<div class="stat-label">Cargo</div>';
        html += `<div class="stat-value">${totalCargo}/${ship.cargoMax}</div>`;
        html += `<div class="stat-bar"><div class="stat-bar-fill" style="width: ${(totalCargo / ship.cargoMax) * 100}%"></div></div>`;
        html += '</div>';

        html += '</div>';
        shipStats.innerHTML = html;

        // Display cargo
        if (Object.keys(cargo).length === 0) {
            cargoList.innerHTML = '<div class="cargo-empty">Cargo hold is empty</div>';
        } else {
            let cargoHtml = '';
            for (const [commodity, quantity] of Object.entries(cargo)) {
                cargoHtml += '<div class="cargo-item">';
                cargoHtml += `<span class="cargo-item-name">${commodity}</span>`;
                cargoHtml += `<span class="cargo-item-quantity">${quantity} units</span>`;
                cargoHtml += '</div>';
            }
            cargoList.innerHTML = cargoHtml;
        }
    }

    // Display trading interface
    displayTrading(planet, gameState) {
        const tradeInterface = document.getElementById('trade-info');

        if (!planet || !planet.economy) {
            tradeInterface.innerHTML = '<p>No trading available here.</p>';
            return;
        }

        // Generate shop name and vendor dialogue
        const vendorDialogue = window.game?.vendorDialogue;
        let shopName = planet.name;
        let vendorGreeting = `Welcome to ${planet.name}. What can I do for you?`;
        let vendorImage = this.getRandomVendorImage(planet.name);

        if (vendorDialogue) {
            shopName = vendorDialogue.generateShopName(planet);
            vendorGreeting = vendorDialogue.generateVendorGreeting(shopName, gameState.gameData.pilotName || 'Pilot');
        }

        let html = '';

        // Outer container with background image covering everything
        html += `<div class="trading-post-container" style="
            position: relative;
            background: linear-gradient(to bottom, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.92)), 
                        url('${vendorImage}') center/cover;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            padding: 25px;
            min-height: 500px;
        ">`;

        // Vendor dialogue section
        html += `<div class="vendor-section" style="margin-bottom: 25px;">`;

        html += `<div style="text-align: center; margin-bottom: 15px; position: relative;">`;
        html += `<h3 style="color: var(--accent-blue); margin: 0 0 10px 0; font-size: 1.4em;">${shopName}</h3>`;
        html += `<div style="font-style: italic; color: var(--text-secondary); font-size: 0.9em;">${planet.planetType} Planet - Tech Level ${planet.techLevel}</div>`;
        html += `<button onclick="window.game.chatWithVendor()" style="position: absolute; right: 0; top: 0; padding: 5px 10px; font-size: 0.8em;">💬 Chat</button>`;
        html += `</div>`;

        html += `<div id="vendor-dialogue" style="
            background: rgba(0, 0, 0, 0.4);
            border-left: 3px solid var(--accent-green);
            padding: 15px 20px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 1.05em;
            line-height: 1.6;
            color: var(--accent-green);
            min-height: 50px;
            cursor: pointer;
        " onclick="window.game?.skipVendorDialogue()" title="Click to skip animation">${vendorGreeting}</div>`;

        html += `<div style="text-align: center; margin-top: 10px; font-size: 0.8em; color: var(--text-secondary); opacity: 0.7;">
            <em>Click dialogue to skip animation</em>
        </div>`;

        html += `</div>`; // End vendor-section

        // Trading grid (still inside the background container)
        html += '<div class="trade-grid">';

        for (const [commodity, eco] of Object.entries(planet.economy)) {
            const playerHas = gameState.getCargoAmount(commodity);

            html += `<div class="commodity-card" style="background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);">`;
            html += '<div class="commodity-header">';

            // Add icon
            if (window.game && window.game.assets) {
                const iconSrc = window.game.assets.getCommodityIcon(commodity);
                html += `<img src="${iconSrc}" class="commodity-icon" style="width: 32px; height: 32px; margin-right: 10px; object-fit: contain;">`;
            }

            html += `<span class="commodity-name">${commodity}</span>`;
            html += '</div>';
            const isProducer = eco.supply > 0;
            const isConsumer = eco.supply === 0;

            html += `<p style="color: var(--text-secondary); margin: 10px 0;">Supply: ${isProducer ? eco.supply + ' units' : '<span style="color:var(--accent-red)">OUT OF STOCK</span>'}</p>`;
            html += `<p style="color: var(--text-secondary);">You have: ${playerHas} units</p>`;
            html += '<div style="margin: 15px 0;">';

            if (isProducer) {
                html += `<div style="color: var(--accent-green);">Buy: ${Utils.format.credits(eco.buyPrice)}/unit</div>`;
            } else {
                html += `<div style="color: var(--text-secondary); opacity: 0.5;">Buy: N/A</div>`;
            }

            html += `<div style="color: var(--accent-yellow);">Sell: ${Utils.format.credits(eco.sellPrice)}/unit</div>`;
            html += '</div>';

            html += '<div class="commodity-controls">';
            html += `<input type="number" id="trade-qty-${commodity}" min="0" value="10" style="width: 60px;">`;

            if (isProducer) {
                html += `<button class="btn-buy" onclick="window.game.buyCommodity('${commodity}')">Buy</button>`;
            } else {
                html += `<button class="btn-buy" disabled style="opacity: 0.5; cursor: not-allowed;">Buy</button>`;
            }

            html += `<button class="btn-sell" onclick="window.game.sellCommodity('${commodity}')">Sell</button>`;
            html += '</div>';

            html += '</div>';
        }

        html += '</div>'; // End trade-grid
        html += '</div>'; // End trading-post-container

        tradeInterface.innerHTML = html;

        // Store current greeting for skip function
        if (window.game) {
            window.game.currentVendorGreeting = vendorGreeting;
        }

        // Trigger typewriter effect
        if (vendorDialogue) {
            const dialogueElement = document.getElementById('vendor-dialogue');
            if (dialogueElement) {
                dialogueElement.textContent = ''; // Clear for typing effect
                vendorDialogue.typeText(vendorGreeting, dialogueElement);
            }
        }
    }

    // Display combat interface
    displayCombat(combatStatus) {
        const combatInterface = document.getElementById('combat-interface');

        if (!combatStatus || !combatStatus.active) {
            combatInterface.innerHTML = '<p>No combat active</p>';
            return;
        }

        let html = '<div class="combat-status">';

        // Player
        html += '<div class="combatant player">';

        if (window.game && window.game.assets) {
            const shipImg = window.game.assets.getShipImage(combatStatus.player.type || 'scout');
            html += `<img src="${shipImg}" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 10px;">`;
        }

        html += '<div class="combatant-name">Your Ship</div>';
        html += '<div class="combatant-hp">';
        html += `<div>Hull: ${combatStatus.player.hull}/${combatStatus.player.hullMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill ${combatStatus.player.hullPercent < 30 ? 'low' : ''}" style="width: ${combatStatus.player.hullPercent}%">${combatStatus.player.hullPercent}%</div>`;
        html += '</div>';
        html += `<div style="margin-top: 10px;">Shields: ${combatStatus.player.shields}/${combatStatus.player.shieldsMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill" style="width: ${combatStatus.player.shieldsPercent}%">${combatStatus.player.shieldsPercent}%</div>`;
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // Enemy
        html += '<div class="combatant enemy">';

        if (window.game && window.game.assets) {
            const enemyImg = window.game.assets.getEnemyImage(combatStatus.enemy.type);
            html += `<img src="${enemyImg}" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 10px;">`;
        }

        html += `<div class="combatant-name">${combatStatus.enemy.name}</div>`;
        html += '<div class="combatant-hp">';
        html += `<div>Hull: ${combatStatus.enemy.hull}/${combatStatus.enemy.hullMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill ${combatStatus.enemy.hullPercent < 30 ? 'low' : ''}" style="width: ${combatStatus.enemy.hullPercent}%">${combatStatus.enemy.hullPercent}%</div>`;
        html += '</div>';
        html += `<div style="margin-top: 10px;">Shields: ${combatStatus.enemy.shields}/${combatStatus.enemy.shieldsMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill" style="width: ${combatStatus.enemy.shieldsPercent}%">${combatStatus.enemy.shieldsPercent}%</div>`;
        html += '</div>';
        html += '</div>';
        html += '</div>';

        html += '</div>';

        // Combat actions
        html += '<div class="combat-actions">';
        html += '<button onclick="window.game.combatAttack()">🔫 Attack</button>';
        html += '<button onclick="window.game.combatFlee()">🏃 Flee</button>';
        html += '</div>';

        // Combat log
        html += '<div class="combat-log">';
        combatStatus.log.forEach(entry => {
            html += `<div class="combat-message ${entry.type}">${entry.message}</div>`;
        });
        html += '</div>';

        combatInterface.innerHTML = html;
    }

    // Display player statistics
    displayStats(gameData) {
        const container = document.getElementById('player-stats');
        if (!container || !gameData) return;

        const stats = gameData.stats;
        const createdDate = new Date(gameData.created).toLocaleDateString();
        const lastLoginDate = new Date(gameData.lastLogin).toLocaleString();

        let html = '<div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">';

        // Helper to create stat card
        const createCard = (label, value, icon = '📊') => `
            <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 24px; margin-bottom: 10px;">${icon}</div>
                <div style="color: var(--text-secondary); font-size: 0.9em;">${label}</div>
                <div style="font-size: 1.2em; font-weight: bold; color: var(--accent-blue);">${value}</div>
            </div>
        `;

        html += createCard('Pilot Name', gameData.pilotName, '👨‍🚀');
        html += createCard('Rank', 'Ensign', '⭐'); // Placeholder for rank system
        html += createCard('Credits', Utils.format.credits(gameData.credits), '💳');
        html += createCard('Turns Available', gameData.turns, '⏳');
        html += createCard('Sectors Visited', stats.sectorsVisited, '🌌');
        html += createCard('Credits Earned', Utils.format.credits(stats.creditsEarned), '💰');
        html += createCard('Trades Completed', stats.tradesCompleted, '🤝');
        html += createCard('Combats Won', stats.combatsWon, '⚔️');
        html += createCard('Combats Lost', stats.combatsLost, '💀');
        html += createCard('Events Encountered', stats.eventsEncountered, '🎲');
        html += createCard('Commission Date', createdDate, '📅');
        html += createCard('Last Active', lastLoginDate, '🕒');

        html += '</div>';
        container.innerHTML = html;
    }

    // Add message to log
    addMessage(message, type = 'info') {
        const msgDiv = document.createElement('div');
        msgDiv.className = `log-message ${type}`;
        msgDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.messageContainer.appendChild(msgDiv);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;

        // Limit to 100 messages
        while (this.messageContainer.children.length > 100) {
            this.messageContainer.removeChild(this.messageContainer.firstChild);
        }
    }



    // Display trading interface

    // Display combat interface
    displayCombat(combatStatus) {
        const combatInterface = document.getElementById('combat-interface');

        if (!combatStatus || !combatStatus.active) {
            combatInterface.innerHTML = '<p>No combat active</p>';
            return;
        }

        let html = '<div class="combat-status">';

        // Player
        html += '<div class="combatant player">';

        if (window.game && window.game.assets) {
            const shipImg = window.game.assets.getShipImage(combatStatus.player.type || 'scout');
            html += `<img src="${shipImg}" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 10px;">`;
        }

        html += '<div class="combatant-name">Your Ship</div>';
        html += '<div class="combatant-hp">';
        html += `<div>Hull: ${combatStatus.player.hull}/${combatStatus.player.hullMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill ${combatStatus.player.hullPercent < 30 ? 'low' : ''}" style="width: ${combatStatus.player.hullPercent}%">${combatStatus.player.hullPercent}%</div>`;
        html += '</div>';
        html += `<div style="margin-top: 10px;">Shields: ${combatStatus.player.shields}/${combatStatus.player.shieldsMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill" style="width: ${combatStatus.player.shieldsPercent}%">${combatStatus.player.shieldsPercent}%</div>`;
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // Enemy
        html += '<div class="combatant enemy">';

        if (window.game && window.game.assets) {
            const enemyImg = window.game.assets.getEnemyImage(combatStatus.enemy.type);
            html += `<img src="${enemyImg}" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 10px;">`;
        }

        html += `<div class="combatant-name">${combatStatus.enemy.name}</div>`;
        html += '<div class="combatant-hp">';
        html += `<div>Hull: ${combatStatus.enemy.hull}/${combatStatus.enemy.hullMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill ${combatStatus.enemy.hullPercent < 30 ? 'low' : ''}" style="width: ${combatStatus.enemy.hullPercent}%">${combatStatus.enemy.hullPercent}%</div>`;
        html += '</div>';
        html += `<div style="margin-top: 10px;">Shields: ${combatStatus.enemy.shields}/${combatStatus.enemy.shieldsMax}</div>`;
        html += '<div class="hp-bar">';
        html += `<div class="hp-bar-fill" style="width: ${combatStatus.enemy.shieldsPercent}%">${combatStatus.enemy.shieldsPercent}%</div>`;
        html += '</div>';
        html += '</div>';
        html += '</div>';

        html += '</div>';

        // Combat actions
        html += '<div class="combat-actions">';
        html += '<button onclick="window.game.combatAttack()">🔫 Attack</button>';
        html += '<button onclick="window.game.combatFlee()">🏃 Flee</button>';
        html += '</div>';

        // Combat log
        html += '<div class="combat-log">';
        combatStatus.log.forEach(entry => {
            html += `<div class="combat-message ${entry.type}">${entry.message}</div>`;
        });
        html += '</div>';

        combatInterface.innerHTML = html;
    }

    // Display player statistics
    displayStats(gameData) {
        const container = document.getElementById('player-stats');
        if (!container || !gameData) return;

        const stats = gameData.stats;
        const createdDate = new Date(gameData.created).toLocaleDateString();
        const lastLoginDate = new Date(gameData.lastLogin).toLocaleString();

        let html = '<div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">';

        // Helper to create stat card
        const createCard = (label, value, icon = '📊') => `
            <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 24px; margin-bottom: 10px;">${icon}</div>
                <div style="color: var(--text-secondary); font-size: 0.9em;">${label}</div>
                <div style="font-size: 1.2em; font-weight: bold; color: var(--accent-blue);">${value}</div>
            </div>
        `;

        html += createCard('Pilot Name', gameData.pilotName, '👨‍🚀');
        html += createCard('Rank', 'Ensign', '⭐'); // Placeholder for rank system
        html += createCard('Credits', Utils.format.credits(gameData.credits), '💳');
        html += createCard('Turns Available', gameData.turns, '⏳');
        html += createCard('Sectors Visited', stats.sectorsVisited, '🌌');
        html += createCard('Credits Earned', Utils.format.credits(stats.creditsEarned), '💰');
        html += createCard('Trades Completed', stats.tradesCompleted, '🤝');
        html += createCard('Combats Won', stats.combatsWon, '⚔️');
        html += createCard('Combats Lost', stats.combatsLost, '💀');
        html += createCard('Events Encountered', stats.eventsEncountered, '🎲');
        html += createCard('Commission Date', createdDate, '📅');
        html += createCard('Last Active', lastLoginDate, '🕒');

        html += '</div>';
        container.innerHTML = html;
    }

    // Add message to log
    addMessage(message, type = 'info') {
        const msgDiv = document.createElement('div');
        msgDiv.className = `log-message ${type}`;
        msgDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.messageContainer.appendChild(msgDiv);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;

        // Limit to 100 messages
        while (this.messageContainer.children.length > 100) {
            this.messageContainer.removeChild(this.messageContainer.firstChild);
        }
    }

    // Clear message log
    clearMessages() {
        this.messageContainer.innerHTML = '';
    }

    // Show modal dialog
    showModal(title, body, buttons) {
        // Use the in-game message system instead of browser alerts
        if (!buttons) {
            // For simple messages, use the ship's log with appropriate styling
            const type = title.toLowerCase().includes('error') ? 'error' :
                title.toLowerCase().includes('success') ? 'success' : 'info';
            this.addMessage(`${title}: ${body}`, type);
        } else {
            // For complex modals with buttons, we would need a proper modal system
            // For now, fall back to confirm but also log the message
            this.addMessage(`${title}: ${body}`, 'info');
            return confirm(`${title}\n\n${body}`);
        }
    }

    // Show error message
    showError(message) {
        this.showModal('Error', message);
    }

    // Show success message
    showSuccess(message) {
        this.showModal('Success', message);
    }

    // Show travel overlay
    showTravelOverlay(duration, destinationId) {
        // Find the anchor element (Current Sector Info) to position relative to
        const anchor = document.getElementById('sector-info');
        let rect = { top: 100, right: 100, width: 500, height: 500 }; // Default fallback

        if (anchor) {
            rect = anchor.getBoundingClientRect();
        }

        // Create overlay container if not exists
        let overlay = document.getElementById('travel-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'travel-overlay';
            document.body.appendChild(overlay);
        }

        // Calculate position
        const gap = 20;
        const width = 512;
        const height = 512;

        let left = rect.right + gap;
        let top = rect.top;

        // If it doesn't fit to the right, center it on screen
        if (left + width > window.innerWidth) {
            left = (window.innerWidth - width) / 2;
            top = (window.innerHeight - height) / 2;
        }

        // Apply styles for the "New Box" look
        overlay.style.cssText = `
            position: fixed;
            top: ${top}px;
            left: ${left}px;
            width: ${width}px;
            height: ${height}px;
            background: rgba(5, 10, 16, 0.95);
            border: 1px solid var(--accent-blue);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
            z-index: 3000;
            display: flex;
            flex-direction: column;
            padding: 15px;
            border-radius: 4px;
            backdrop-filter: blur(5px);
        `;

        // Pick a random hyperdrive video (1-4)
        const videoNum = Math.floor(Math.random() * 4) + 1;
        const videoPath = `assets/videos/hyperdrive${videoNum}.webm`;

        overlay.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="color: var(--accent-blue); margin: 0; text-shadow: 0 0 5px rgba(0,212,255,0.5);">HYPERSPACE JUMP</h3>
                <span style="color: var(--text-secondary); font-size: 0.9em;">SEQ: ${Math.floor(Math.random() * 9999)}</span>
            </div>
            
            <div style="flex: 1; position: relative; width: 100%; overflow: hidden; border: 1px solid #333; background: #000; margin-bottom: 15px;">
                <video id="travel-video" autoplay muted loop playsinline style="width: 100%; height: 100%; object-fit: cover;">
                    <source src="${videoPath}" type="video/webm">
                </video>
            </div>
            
            <div style="text-align: center;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9em;">
                    <span style="color: #aaa;">DESTINATION</span>
                    <span style="color: var(--accent-blue);">SECTOR ${destinationId}</span>
                </div>
                <div style="width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden; margin-bottom: 5px;">
                    <div id="travel-progress" style="width: 0%; height: 100%; background: var(--accent-blue); transition: width 0.1s linear; box-shadow: 0 0 5px var(--accent-blue);"></div>
                </div>
                <p id="travel-time" style="margin: 0; color: #666; font-size: 0.8em; font-family: monospace;">T-MINUS: ${(duration / 1000).toFixed(1)}s</p>
            </div>
        `;
        overlay.style.display = 'flex';

        // Ensure the video starts playing
        const video = overlay.querySelector('#travel-video');
        if (video) {
            video.play().catch(e => {
                console.warn('Autoplay blocked:', e);
                // Try again shortly
                setTimeout(() => video.play().catch(() => { }), 100);
            });
        }
    }

    // Update travel overlay
    updateTravelOverlay(remaining, progress) {
        const bar = document.getElementById('travel-progress');
        const text = document.getElementById('travel-time');
        if (bar) bar.style.width = `${progress}%`;
        if (text) text.textContent = `T-MINUS: ${(remaining / 1000).toFixed(1)}s`;
    }

    // Hide travel overlay
    hideTravelOverlay() {
        const overlay = document.getElementById('travel-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // ==========================================
    // ADMIN UI METHODS
    // ==========================================

    // Switch admin panels
    showAdminPanel(panelId) {
        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.style.display = 'none';
            panel.classList.remove('active');
        });
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const targetPanel = document.getElementById(`admin-panel-${panelId}`);
        const targetTab = document.getElementById(`admin-tab-${panelId}`);

        if (targetPanel) {
            targetPanel.style.display = 'block';
            targetPanel.classList.add('active');
        }
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    // Render player list in admin panel
    renderAdminPlayers(players) {
        const tbody = document.querySelector('#admin-player-list tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (players.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No players found</td></tr>';
            return;
        }

        players.forEach(player => {
            if (!player) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${player.username || 'Unknown'}</td>
                <td>${player.pilotName || 'N/A'}</td>
                <td>${Utils.format.credits(player.credits || 0)}</td>
                <td>${player.turns || 0}</td>
                <td>${player.sector || 0}</td>
                <td>
                    <button class="btn-primary btn-sm" onclick="window.game.handleAdminEditPlayer('${player.username}')">Edit</button>
                    <button class="btn-danger btn-sm" onclick="window.game.handleAdminDeletePlayer('${player.username}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Show player edit modal
    showAdminPlayerModal(player) {
        const modal = document.getElementById('admin-player-modal');
        if (!modal) return;

        document.getElementById('edit-player-username').value = player.username;
        document.getElementById('edit-player-pilot').value = player.pilotName;
        document.getElementById('edit-player-credits').value = player.credits;
        document.getElementById('edit-player-turns').value = player.turns;
        document.getElementById('edit-player-hull').value = player.hull;
        document.getElementById('edit-player-fuel').value = player.fuel;
        document.getElementById('edit-player-sector').value = player.sector;

        modal.classList.add('active');
    }

    // Hide player edit modal
    hideAdminPlayerModal() {
        const modal = document.getElementById('admin-player-modal');
        if (modal) modal.classList.remove('active');
    }

    // Render Audio Settings
    renderAudioSettings(audioSystem) {
        const container = document.getElementById('settings-playlist-container');
        if (!container) return;

        container.innerHTML = '';

        // Update controls
        const musicSlider = document.getElementById('settings-volume-master');
        const musicLabel = document.getElementById('settings-volume-master-value');
        const sfxSlider = document.getElementById('settings-volume-sfx');
        const sfxLabel = document.getElementById('settings-volume-sfx-value');

        if (musicSlider) musicSlider.value = audioSystem.musicVolume * 100;
        if (musicLabel) musicLabel.textContent = `${Math.round(audioSystem.musicVolume * 100)}%`;
        if (sfxSlider) sfxSlider.value = audioSystem.sfxVolume * 100;
        if (sfxLabel) sfxLabel.textContent = `${Math.round(audioSystem.sfxVolume * 100)}%`;

        document.getElementById('settings-music-enabled').checked = audioSystem.musicEnabled;
        document.getElementById('settings-playlist-mode').checked = audioSystem.playlistMode;

        // Render playlist items
        const tracks = audioSystem.availableTracks;
        const playlist = audioSystem.playlist;

        if (Object.keys(tracks).length === 0) {
            container.innerHTML = '<p>No tracks found.</p>';
            return;
        }

        Object.values(tracks).forEach(track => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.style.cssText = `
                display: flex;
                align-items: center;
                padding: 10px;
                background: rgba(0, 0, 0, 0.3);
                margin-bottom: 5px;
                border-radius: 4px;
            `;

            const isSelected = playlist.includes(track.key);

            item.innerHTML = `
                <input type="checkbox" class="playlist-checkbox" data-key="${track.key}" ${isSelected ? 'checked' : ''} style="margin-right: 10px;">
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold;">${track.name}</div>
                    <div style="font-size: 0.8em; color: #888;">${track.description}</div>
                </div>
                <button class="btn-sm btn-secondary" onclick="window.game.previewTrack('${track.key}')">▶</button>
            `;

            container.appendChild(item);
        });

        // Add event listeners for checkboxes
        container.querySelectorAll('.playlist-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                if (e.target.checked) {
                    audioSystem.addToPlaylist(key);
                } else {
                    audioSystem.removeFromPlaylist(key);
                }
            });
        });
    }

    // New Custom Modal System
    showCustomModal(title, message, buttons = []) {
        const modal = document.getElementById('game-modal');
        const titleEl = document.getElementById('game-modal-title');
        const msgEl = document.getElementById('game-modal-message');
        const footer = document.getElementById('game-modal-footer');

        if (!modal || !titleEl || !msgEl || !footer) return;

        titleEl.textContent = title;
        msgEl.innerHTML = message.replace(/\n/g, '<br>');
        footer.innerHTML = '';

        if (buttons.length === 0) {
            // Default OK button
            buttons = [{
                text: 'OK',
                class: 'btn-primary',
                callback: () => this.hideCustomModal()
            }];
        }

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = btn.class || 'btn-secondary';
            button.textContent = btn.text;
            button.onclick = () => {
                if (btn.callback) btn.callback();
                if (btn.close !== false) this.hideCustomModal();
            };
            footer.appendChild(button);
        });

        modal.classList.add('active');
    }

    hideCustomModal() {
        const modal = document.getElementById('game-modal');
        if (modal) modal.classList.remove('active');
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            const buttons = [
                { text: 'Cancel', class: 'btn-secondary', callback: () => resolve(false) },
                { text: 'Confirm', class: 'btn-danger', callback: () => resolve(true) }
            ];
            this.showCustomModal(title, message, buttons);
        });
    }

    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const textEl = document.getElementById('loading-text');
        if (overlay && textEl) {
            textEl.textContent = text;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }
}

export default UI;