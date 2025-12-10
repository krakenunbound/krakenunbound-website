# Ad Astra Changelog

## [1.0.8] - 2025-12-10

### User Interface & Experience
- **Unified Login Integration**:
    - Removed game-specific Login and Register forms to enforce "Single Account" architecture.
    - Added new "Launch Mission" landing screen.
    - Players are now properly redirected to the global Kraken Arkade login if not authenticated.
    - Preserved "Character Creation" flow for new pilots who are already logged in.
- **Visual Feedback System**:
    - Replaced native browser alerts with a custom, game-themed implementation.
    - Added `UI.showCustomModal()` for rich dialog boxes.
    - Added `UI.showLoading()` with a spinning overlay for long-running operations.
    - Added `UI.showConfirm()` for stylized confirmation dialogs.
- **Galaxy Generation**:
    - Fixed an issue where clicking "Generate New Galaxy" did nothing (missing event listener).
    - Added verify-after-generate logic to ensure the galaxy size was correctly updated.
    - Galaxy size limit is now strictly enforced at 500 sectors in `utils.js` (MAX_SIZE).
    - Success message now includes the actual sector count to confirm generation.
- **Economy Refresh**:
    - Updated "Refresh Economy" to use the new modal/loading system.
    - Added confirmation step before refreshing economy.
- **Login**:
    - Removed client-side credential checking; now relies on server validation.
    - (Local Test Server) Login is now strict: `admin` / `admin123`.

### Local Development
- **Mock Server (`local_test_server.py`)**:
    - Added mock implementations for:
        - `/api/adastra/admin/stats` (Dashboard stats).
        - `/api/adastra/admin/reset-galaxy` (Player reset logic).
    - Fixed API method routing (moved stats to GET).
    - Mocked Admin verification to allow testing sysop features without a real backend.
