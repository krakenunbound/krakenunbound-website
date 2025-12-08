// Ad Astra - Character Customization Handlers
// character-customization-handlers.js - Handle player character and ship customization

export class CharacterCustomizationHandlers {
    constructor(game) {
        this.game = game;
        this.selectedPilotName = '';
        this.selectedShipVariant = null;
        this.selectedShipType = 'Scout';
        this.currentStep = 1;
    }

    // Initialize character creation flow
    initializeCharacterCreation() {
        this.currentStep = 1;
        this.showStep(1);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Step navigation
        document.getElementById('char-next-1')?.addEventListener('click', () => this.nextStep(1));
        document.getElementById('char-back-2')?.addEventListener('click', () => this.previousStep(2));
        document.getElementById('char-next-2')?.addEventListener('click', () => this.nextStep(2));
        document.getElementById('char-back-3')?.addEventListener('click', () => this.previousStep(3));

        // Pilot name input
        document.getElementById('pilot-name')?.addEventListener('input', (e) => {
            const btn = document.getElementById('char-next-1');
            if (btn) {
                btn.disabled = e.target.value.trim().length < 2;
            }
        });

        // Ship name input
        document.getElementById('ship-custom-name')?.addEventListener('input', (e) => {
            const btn = document.getElementById('create-character-btn');
            if (btn) {
                btn.disabled = e.target.value.trim().length < 2;
            }
        });
    }

    showStep(step) {
        // Hide all steps
        document.querySelectorAll('.char-creation-step').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });

        // Show current step
        const stepEl = document.getElementById(`char-step-${step}`);
        if (stepEl) {
            stepEl.classList.add('active');
            stepEl.style.display = 'block';
        }

        // Populate ship selection on step 2
        if (step === 2) {
            this.renderShipSelection();
        }

        // Show ship preview on step 3
        if (step === 3) {
            this.renderShipPreview();
        }

        this.currentStep = step;
    }

    nextStep(fromStep) {
        if (fromStep === 1) {
            // Validate pilot name
            const pilotName = document.getElementById('pilot-name').value.trim();
            if (pilotName.length < 2) {
                this.game.ui.showError('Pilot name must be at least 2 characters!');
                return;
            }
            this.selectedPilotName = pilotName;
            this.showStep(2);
        } else if (fromStep === 2) {
            // Validate ship selection
            if (this.selectedShipVariant === null) {
                this.game.ui.showError('Please select a ship!');
                return;
            }
            this.showStep(3);
        }
    }

    previousStep(fromStep) {
        this.showStep(fromStep - 1);
    }

    renderShipSelection() {
        const grid = document.getElementById('ship-selection-grid');
        if (!grid) return;

        const shipType = this.selectedShipType; // Currently only Scout
        const variants = this.game.assets.assetVariations[`ship_${shipType.toLowerCase()}`] || [1];

        let html = '';
        variants.forEach(variant => {
            const isSelected = this.selectedShipVariant === variant;
            const imagePath = `${this.game.assets.assetsPath}ship_${shipType.toLowerCase()}_${variant}.webp`;
            
            html += `
                <div class="ship-option ${isSelected ? 'selected' : ''}" 
                     data-variant="${variant}"
                     onclick="window.game.characterCustomization.selectShip(${variant})">
                    <img src="${imagePath}" alt="${shipType} ${variant}">
                    <div class="ship-option-label">${shipType} ${variant}</div>
                    ${isSelected ? '<div class="ship-option-checkmark">✓</div>' : ''}
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    selectShip(variant) {
        this.selectedShipVariant = variant;
        
        // Enable next button
        const nextBtn = document.getElementById('char-next-2');
        if (nextBtn) nextBtn.disabled = false;

        // Update visual selection
        document.querySelectorAll('.ship-option').forEach(el => {
            el.classList.remove('selected');
            const checkmark = el.querySelector('.ship-option-checkmark');
            if (checkmark) checkmark.remove();
        });

        const selectedEl = document.querySelector(`[data-variant="${variant}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
            selectedEl.innerHTML += '<div class="ship-option-checkmark">✓</div>';
        }

        this.game.audio.playSfx('click');
    }

    renderShipPreview() {
        const preview = document.getElementById('selected-ship-preview');
        if (!preview) return;

        const shipType = this.selectedShipType;
        const variant = this.selectedShipVariant;
        const imagePath = `${this.game.assets.assetsPath}ship_${shipType.toLowerCase()}_${variant}.webp`;

        preview.innerHTML = `
            <div class="ship-preview-card">
                <img src="${imagePath}" alt="${shipType} ${variant}">
                <p class="ship-preview-label">Your ${shipType}</p>
            </div>
        `;

        // Set default ship name suggestion
        const shipNameInput = document.getElementById('ship-custom-name');
        if (shipNameInput && !shipNameInput.value) {
            const suggestions = [
                'Starhawk', 'Nova Runner', 'Starfire', 'Eclipse', 'Phoenix',
                'Wanderer', 'Seeker', 'Pathfinder', 'Explorer', 'Pioneer'
            ];
            shipNameInput.placeholder = suggestions[Math.floor(Math.random() * suggestions.length)];
        }
    }

    async createCharacter() {
        const pilotName = this.selectedPilotName;
        const shipCustomName = document.getElementById('ship-custom-name').value.trim();
        const shipVariant = this.selectedShipVariant;
        const shipType = this.selectedShipType;

        if (!shipCustomName || shipCustomName.length < 2) {
            this.game.ui.showError('Ship name must be at least 2 characters!');
            return;
        }

        // Create player data with customized ship
        const playerData = this.game.gameState.createPlayer(
            this.game.gameState.currentUser, 
            pilotName,
            shipCustomName,
            shipType,
            shipVariant
        );
        
        this.game.gameState.gameData = playerData;
        this.game.gameState.save();

        // Save to server
        const saveData = {
            pilotName: pilotName,
            shipName: shipCustomName,
            shipType: shipType,
            shipVariant: shipVariant,
            gameState: playerData,
            credits: playerData.credits,
            turns: playerData.turns,
            currentSector: playerData.currentSector,
            cargo: playerData.cargo,
            equipment: {}
        };
        
        console.log('💾 Saving character to server:', saveData);
        const success = await this.game.auth.savePlayerData(saveData);
        console.log('💾 Save result:', success);

        if (success) {
            this.game.startGame();
        } else {
            this.game.ui.showError('Failed to save character to server!');
        }
    }

    // Admin function to edit player ship
    editPlayerShip(username, shipType, shipVariant, shipCustomName) {
        // This will be called from admin panel
        const playerData = this.game.gameState.gameData;
        
        if (playerData && playerData.username === username) {
            playerData.ship.type = shipType.toLowerCase();
            playerData.ship.name = shipCustomName;
            playerData.shipVariant = shipVariant;
            
            this.game.gameState.save();
            return { success: true };
        }
        
        return { success: false, error: 'Player not found' };
    }
}

export default CharacterCustomizationHandlers;