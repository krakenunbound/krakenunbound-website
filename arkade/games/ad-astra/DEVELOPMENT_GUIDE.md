# Ad Astra - Development Guide

## Local Environment Setup

To develop the frontend without connecting to the production Cloudflare backend, a **Local Test Server** is provided. This server mocks the API endpoints and simulates database operations in memory.

### Running the Test Server
1. Navigate to the `website/` directory:
   ```bash
   cd "G:\kraken-arkade v5\website"
   ```
2. Start the Python server:
   ```bash
   python local_test_server.py
   ```
3. Access the game at: `http://localhost:8000/arkade/games/ad-astra/index.html`

### The "Temporary Database" (Mock Server)
The `local_test_server.py` script acts as a temporary backend.
- **No Real Database**: It does NOT use a persistent SQLite file. All data (players, galaxy state) is stored in **memory** or returned as static JSON responses.
- **Persistence**: Changes made during a session (e.g., generating a galaxy) are lost when the server interacts with certain mocked endpoints that just return success without persisting state, OR they persist only as long as the server is running (if variables are used).
    - *Note for Galaxy Generation*: The frontend logic `galaxy.js` handles saving the galaxy structure to `localStorage` (via `Utils.storage`). The server's role here is to authorize the action and "reset players".
- **Authentication**:
    - The game uses **Unified Login**. If you are redirected to the Arkade Hub (`/arkade/`), look for the "Login" button there.
    - **Local Mock Login**: You can use any username/password in the local Arkade Hub to create a session token.
- **Admin Access in Ad Astra**:
    - **Username**: `admin`
    - **Password**: `admin123`
    - **Features**: Full access to the Admin Panel, Galaxy Generation, and Economy tools.

### UI Component System
A custom UI system is implemented in `ui.js` and `ui.css` to replace browser defaults.

#### Modals
Use `window.game.ui.showCustomModal(title, message, buttons[])` to display dialogs.
- `buttons`: Array of objects `{ text: 'Label', class: 'btn-primary', callback: () => {} }`.
- If no buttons are provided, a default "OK" button closes the modal.

#### Loading Overlay
Use `window.game.ui.showLoading(text)` to block interaction during async tasks.
Always pair with `window.game.ui.hideLoading()` in a `finally` block or after the await.

#### Confirmation
Use `await window.game.ui.showConfirm(title, message)` to prompt the user.
- Returns `true` (Confirm) or `false` (Cancel).
- **Style**: "Confirm" button uses `btn-danger` style (red) by default.
