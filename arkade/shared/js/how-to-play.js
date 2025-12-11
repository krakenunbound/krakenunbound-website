const GAME_INSTRUCTIONS = {
    "word-kraken": `
        <h2>HOW TO PLAY</h2>
        <p>Guess the <strong>WORD KRAKEN</strong> in 6 tries.</p>
        <ul>
            <li>Each guess must be a valid 5-letter word.</li>
            <li>The color of the tiles will change to show how close your guess was to the word.</li>
        </ul>
        <div style="display:flex; gap:5px; margin:10px 0;">
            <div style="width:30px; height:30px; background:#538d4e; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">W</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">O</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">R</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">D</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">S</div>
        </div>
        <p><strong>GREEN</strong> means the letter is in the word and in the correct spot.</p>
        <div style="display:flex; gap:5px; margin:10px 0;">
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">P</div>
            <div style="width:30px; height:30px; background:#b59f3b; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">I</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">L</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">O</div>
            <div style="width:30px; height:30px; background:#000; display:flex; align-items:center; justify-content:center; border:1px solid #fff;">T</div>
        </div>
        <p><strong>YELLOW</strong> means the letter is in the word but in the wrong spot.</p>
    `,
    "cosmic-connections": `
        <h2>HOW TO PLAY</h2>
        <p>Group words into 4 sets of 4.</p>
        <ul>
            <li>Select 4 words that share a common category.</li>
            <li>Categories range from straightforward to tricky.</li>
            <li>You have 4 mistakes allowed.</li>
        </ul>
        <p>Examples of categories:</p>
        <ul>
            <li><strong>FISH:</strong> Bass, Salmon, Trout, Pike</li>
            <li><strong>FIRE ___:</strong> Ant, Drill, Island, Opal</li>
        </ul>
    `,
    "abyssal-guess": `
        <h2>HOW TO PLAY</h2>
        <p>Find the secret word.</p>
        <ul>
            <li>You have unlimited guesses.</li>
            <li>The words were sorted by an AI algorithm according to how similar they are to the secret word.</li>
            <li>After submitting a word, you will see its position. Number 1 is the secret word.</li>
            <li>The secret word is usually a common noun.</li>
        </ul>
    `,
    "mini-crossword": `
        <h2>HOW TO PLAY</h2>
        <p>Complete the crossword puzzle.</p>
        <ul>
            <li>Click on a cell to select it.</li>
            <li>Click again to switch between Across and Down.</li>
            <li>Use the keyboard to type letters.</li>
            <li>Use Backspace to delete.</li>
        </ul>
    `,
    "spelling-kraken": `
        <h2>HOW TO PLAY</h2>
        <p>Create words using the given letters.</p>
        <ul>
            <li>Words must contain at least 4 letters.</li>
            <li>Words must include the center letter.</li>
            <li>Letters can be used more than once.</li>
            <li>Our word list does not include hyphenated words, proper nouns, or offensive words.</li>
        </ul>
        <p><strong>Score points:</strong></p>
        <ul>
            <li>4-letter words are worth 1 point.</li>
            <li>Longer words earn 1 point per letter.</li>
            <li><strong>Pangrams</strong> (using all 7 letters) earn 7 bonus points.</li>
        </ul>
    `,
    "phrase-kraken": `
        <h2>HOW TO PLAY</h2>
        <p>Guess the secret phrase.</p>
        <ul>
            <li>Like Wordle, but for multiple words at once.</li>
            <li>Green means correct letter in correct spot.</li>
            <li>Yellow means correct letter in the phrase, but wrong spot.</li>
            <li>Purple means the letter is in the phrase, but in a different word.</li>
        </ul>
    `,
    "abyssal-between": `
        <h2>HOW TO PLAY</h2>
        <p>Find the secret word hidden between two others.</p>
        <ul>
            <li>The secret word is alphabetically between the top and bottom words.</li>
            <li>Make a guess to narrow the range.</li>
            <li>The new range will be updated based on your guess.</li>
        </ul>
    `,
    "krakens-tempest": `
        <h2>🦑 KRAKEN'S TEMPEST</h2>
        <p style="color:#7b2cbf; font-style:italic;">Defend the rim from creatures rising from the abyss!</p>

        <h3 style="color:#0ff; margin-top:20px; font-size:1rem;">⌨️ CONTROLS</h3>
        <table style="width:100%; border-collapse:collapse; margin:10px 0;">
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:8px; color:#0ff;">← →</td>
                <td style="padding:8px;">Move around the rim</td>
            </tr>
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:8px; color:#0ff;">SPACE</td>
                <td style="padding:8px;">Fire into the depths</td>
            </tr>
            <tr style="border-bottom:1px solid #333;">
                <td style="padding:8px; color:#7b2cbf;">R-CTRL</td>
                <td style="padding:8px;">Ink Cloud (destroys ALL enemies)</td>
            </tr>
            <tr>
                <td style="padding:8px; color:#888;">ESC / Q</td>
                <td style="padding:8px;">Pause / Quit</td>
            </tr>
        </table>

        <h3 style="color:#0ff; margin-top:20px; font-size:1rem;">🐙 ENEMIES</h3>
        <div style="display:grid; gap:8px; margin:10px 0;">
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,68,68,0.1); border-left:3px solid #ff4444; border-radius:4px;">
                <span style="font-size:1.2rem;">🦀</span>
                <div><strong style="color:#ff4444;">Crab</strong> - Basic enemy, crawls toward the rim</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,107,53,0.1); border-left:3px solid #ff6b35; border-radius:4px;">
                <span style="font-size:1.2rem;">⭐</span>
                <div><strong style="color:#ff6b35;">Starfish</strong> - Splits into 2 when destroyed!</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,105,180,0.1); border-left:3px solid #ff69b4; border-radius:4px;">
                <span style="font-size:1.2rem;">🎐</span>
                <div><strong style="color:#ff69b4;">Jellyfish</strong> - Pulses damage to adjacent lanes</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,255,0,0.1); border-left:3px solid #ffff00; border-radius:4px;">
                <span style="font-size:1.2rem;">⚡</span>
                <div><strong style="color:#ffff00;">Electric Eel</strong> - Shoots bolts that electrify lanes</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(57,255,20,0.1); border-left:3px solid #39ff14; border-radius:4px;">
                <span style="font-size:1.2rem;">🐟</span>
                <div><strong style="color:#39ff14;">Anglerfish</strong> - Chases you with its glowing lure</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(153,50,204,0.1); border-left:3px solid #9932CC; border-radius:4px;">
                <span style="font-size:1.2rem;">🔮</span>
                <div><strong style="color:#9932CC;">Sea Urchin</strong> - Leaves spike traps behind</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,215,0,0.1); border-left:3px solid #FFD700; border-radius:4px;">
                <span style="font-size:1.2rem;">🐡</span>
                <div><strong style="color:#FFD700;">Puffer Fish</strong> - Evasive! Dodges your shots</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:rgba(205,133,63,0.1); border-left:3px solid #CD853F; border-radius:4px;">
                <span style="font-size:1.2rem;">🐚</span>
                <div><strong style="color:#CD853F;">Hermit Crab</strong> - Hops along rim toward you!</div>
            </div>
        </div>

        <h3 style="color:#7b2cbf; margin-top:20px; font-size:1rem;">🦑 INK CLOUD</h3>
        <p style="background:rgba(123,44,191,0.2); padding:10px; border-radius:8px; border:1px solid #7b2cbf;">
            Press <strong style="color:#7b2cbf;">Right CTRL</strong> to release the Kraken's ink!<br>
            <span style="color:#b060d0;">• Destroys ALL enemies on screen</span><br>
            <span style="color:#b060d0;">• 2 charges per wave (replenishes each wave)</span><br>
            <span style="color:#888; font-size:0.9rem;">Save them for emergencies!</span>
        </p>

        <h3 style="color:#0ff; margin-top:20px; font-size:1rem;">💡 TIPS</h3>
        <ul>
            <li>Watch for <span style="color:#9932CC;">purple spikes</span> left by Sea Urchins</li>
            <li>Hermit Crabs are dangerous - they hop along the rim!</li>
            <li>Yellow <span style="color:#ffff00;">electrified lanes</span> will damage you</li>
            <li>Puffer Fish are hard to hit - lead your shots</li>
            <li>New enemy types appear in higher waves</li>
        </ul>
    `,
    "default": `
        <h2>HOW TO PLAY</h2>
        <p>Follow the on-screen instructions to complete the objective.</p>
        <p>Good luck, Captain.</p>
    `
};

function initHowToPlay(gameId, containerId = "setup") {
    // 1. Create Button
    const btn = document.createElement("button");
    btn.innerHTML = "?";
    btn.id = "how-to-play-btn";
    btn.style.cssText = `
        position: absolute;
        top: 70px;
        left: 20px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid var(--neon, #0ff);
        color: var(--neon, #0ff);
        font-size: 1.2rem;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Courier New', monospace;
        transition: all 0.3s ease;
    `;

    // Hover effect
    btn.onmouseover = () => {
        btn.style.background = "rgba(0, 255, 255, 0.2)";
        btn.style.boxShadow = "0 0 10px var(--neon, #0ff)";
    };
    btn.onmouseout = () => {
        btn.style.background = "rgba(0, 0, 0, 0.6)";
        btn.style.boxShadow = "none";
    };

    // Find container
    let container = document.getElementById(containerId);
    if (!container) {
        // Fallback to body if container not found, but try to position relative to viewport
        container = document.body;
        btn.style.position = "fixed";
    } else {
        // If container is relative/absolute, we can position absolutely within it
        // But if it's a flex container (like #setup often is), we might need to be careful.
        // Actually, most #setup divs are relative or fixed/absolute centered.
        // Let's force it to be appended to body but positioned fixed top-left for consistency across games?
        // The user said "on every game front menu page".
        // If I append to body, it's always visible.
        // But we only want it visible when the menu is visible.
        // So appending to the #setup div is better.

        // Ensure container has position relative if it's static
        const style = window.getComputedStyle(container);
        if (style.position === 'static') {
            container.style.position = 'relative';
        }
    }

    // 2. Create Modal
    const modal = document.createElement("div");
    modal.id = "how-to-play-modal";
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
        background: #111;
        border: 2px solid var(--neon, #0ff);
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        color: #fff;
        font-family: 'Courier New', monospace;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
        position: relative;
    `;

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        color: #888;
        font-size: 2rem;
        cursor: pointer;
    `;
    closeBtn.onclick = () => {
        modal.style.opacity = "0";
        setTimeout(() => modal.style.display = "none", 300);
    };
    closeBtn.onmouseover = () => closeBtn.style.color = "#fff";
    closeBtn.onmouseout = () => closeBtn.style.color = "#888";

    // Content Body
    const body = document.createElement("div");
    body.innerHTML = GAME_INSTRUCTIONS[gameId] || GAME_INSTRUCTIONS["default"];

    // Style the content
    const style = document.createElement("style");
    style.textContent = `
        #how-to-play-modal h2 {
            color: var(--neon, #0ff);
            margin-top: 0;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        #how-to-play-modal p {
            line-height: 1.6;
            margin-bottom: 15px;
            color: #ddd;
        }
        #how-to-play-modal ul {
            padding-left: 20px;
            margin-bottom: 15px;
        }
        #how-to-play-modal li {
            margin-bottom: 8px;
            color: #ccc;
        }
    `;
    document.head.appendChild(style);

    content.appendChild(closeBtn);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Button Click
    btn.onclick = (e) => {
        e.stopPropagation(); // Prevent bubbling
        modal.style.display = "flex";
        // Force reflow
        modal.offsetHeight;
        modal.style.opacity = "1";
    };

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeBtn.click();
        }
    };

    container.appendChild(btn);
}
