# Kraken Arkade - Deployment Flags

This document tracks flags/switches that need to be changed between **development** and **production** environments.

---

## 🔐 Authentication Bypass Flag

**File:** `website/api/src/index.js`  
**Line:** Line 8  
**Variable:** `BYPASS_AUTH`

```javascript
// =============================================================================
// DEPLOYMENT FLAGS - CHANGE THESE BEFORE PUSHING TO PRODUCTION
// =============================================================================
const BYPASS_AUTH = false;  // true = skip login (local testing), false = require login (production)
```

### Settings:

| Environment | Value | Effect |
|-------------|-------|--------|
| **Local Development** | `true` | Skip login, use "TestPilot" user, all games accessible without auth |
| **Production (Cloudflare)** | `false` | Require login at Arkade hub, token stored in localStorage |

### Reminder Checklist Before Push:
- [ ] Set `BYPASS_AUTH = false` in `api/src/index.js`
- [ ] Test login flow works
- [ ] Verify localStorage token persistence

---

## 📝 Change History

| Date | Changed By | Flag | From → To | Reason |
|------|------------|------|-----------|--------|
| 2024-12-09 | Initial | BYPASS_AUTH | N/A | Created unified auth system |

---

## Related Files

- `website/api/src/index.js` - Cloudflare Worker (main API)
- `website/arkade/index.html` - Arkade hub with login
- `website/arkade/js/arkade-auth.js` - Shared auth library
- `website/arkade/games/*/` - Individual games using shared auth
