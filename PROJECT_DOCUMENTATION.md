# Kraken Unbound - Complete Project Documentation

This document contains all setup, configuration, and technical details for the krakenunbound.com website and related services.

---

## Table of Contents
1. [Overview](#overview)
2. [Cloudflare Pages Setup](#cloudflare-pages-setup)
3. [Cloudflare Workers API](#cloudflare-workers-api)
4. [Cloudflare D1 Database](#cloudflare-d1-database)
5. [Groq AI Integration](#groq-ai-integration)
6. [Landing Page Details](#landing-page-details)
7. [Project Structure](#project-structure)
8. [Design System](#design-system)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Live Site:** https://krakenunbound.com (also https://www.krakenunbound.com)

The project consists of:
- **Landing Page** - Animated kraken with social links
- **Kraken Arkade** - Game arcade with daily puzzles
- **Ad Astra** - Space trading game
- **Backend API** - Cloudflare Worker for game data

---

## Cloudflare Pages Setup

### Account Details
- **Email:** Krakenunbound@gmail.com
- **Dashboard:** https://dash.cloudflare.com

### Pages Project
- **Project Name:** krakenunbound-website
- **Type:** Cloudflare Pages (auto-deploy from GitHub)
- **Build Settings:** None required - pure static HTML/CSS/JS

### Custom Domains
| Domain | Status |
|--------|--------|
| krakenunbound.com | Active, SSL enabled |
| www.krakenunbound.com | Active, SSL enabled |

### DNS Configuration
- Domain was registered through Cloudflare
- DNS records were auto-configured when connecting Pages
- SSL certificates are automatic (managed by Cloudflare)

### GitHub Integration
- **Repository:** https://github.com/krakenunbound/krakenunbound-website
- **Branch:** master
- **Auto-deploy:** Yes - every push to master triggers deployment
- **Deploy Time:** ~30 seconds

---

## Cloudflare Workers API

### Worker Details
- **Name:** kraken-arkade-api
- **Purpose:** Backend API for all games (puzzles, scores, leaderboards, Ad Astra)
- **Source:** `api/src/index.js`
- **Config:** `api/wrangler.toml`

### Wrangler Configuration
```toml
name = "kraken-arkade-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "kraken-arkade"
database_id = "631d64b0-6dfa-4ee5-87a3-fccf56425f5c"

[vars]
ALLOWED_ORIGIN = "https://krakenunbound.com"

[triggers]
crons = ["0 8 * * *"]
```

### Scheduled Tasks
- **Cron:** `0 8 * * *` (8 AM UTC daily)
- **Purpose:** Pre-generate puzzles for the next day

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/health | GET | Health check |
| /api/daily-word | GET | Get Wordle word |
| /api/wordle/score | POST | Submit score |
| /api/connections/daily | GET | Get Connections puzzle |
| /api/spellingbee/daily | GET | Get Spelling Bee |
| /api/contexto/guess | POST | Check Contexto guess |
| /api/between/daily | GET | Get Betweenle puzzle |
| /api/phrase/daily | GET | Get Phrase puzzle |
| /api/adastra/* | Various | Ad Astra game endpoints |

---

## Cloudflare D1 Database

### Database Details
- **Name:** kraken-arkade
- **ID:** `631d64b0-6dfa-4ee5-87a3-fccf56425f5c`
- **Type:** SQLite (serverless)

### Tables
| Table | Purpose |
|-------|---------|
| daily_words | Wordle daily words + themes |
| wordle_scores | Player Wordle scores |
| game_state | Saved game progress |
| daily_connections | Connections puzzle data |
| connections_scores | Connections scores |
| daily_spellingbee | Spelling Bee puzzles |
| spellingbee_scores | Spelling Bee scores |
| daily_contexto | Contexto secret words |
| contexto_scores | Contexto scores |
| daily_between | Betweenle puzzles |
| between_scores | Betweenle scores |
| daily_phrases | Phrase puzzles |
| phrase_scores | Phrase scores |
| arcade_scores | Generic arcade scores |
| daily_crosswords | Crossword puzzles |
| crossword_scores | Crossword scores |
| adastra_accounts | Ad Astra user accounts |
| adastra_players | Ad Astra player data |
| adastra_sessions | Ad Astra login sessions |
| adastra_settings | Ad Astra game settings |
| adastra_multiplayer | Ad Astra multiplayer state |

### D1 CLI Commands
```bash
# List databases
wrangler d1 list

# Query database
wrangler d1 execute kraken-arkade --command "SELECT * FROM daily_words LIMIT 5"

# Run SQL file
wrangler d1 execute kraken-arkade --file schema.sql
```

---

## Groq AI Integration

### Account
- **Console:** https://console.groq.com
- **API Keys:** https://console.groq.com/keys

### API Configuration
- **URL:** `https://api.groq.com/openai/v1/chat/completions`
- **Model:** `llama-3.3-70b-versatile`
- **Temperature:** 0.7

### Secret Setup
The Groq API key is stored as a Cloudflare Worker secret:
```bash
cd api
wrangler secret put GROQ_API_KEY
# Paste your API key when prompted
```

### What Groq Generates
1. **Wordle** - Daily 5-letter words with themes
2. **Connections** - 4 categories of 4 words each with red herrings
3. **Spelling Bee** - Center letter, outer letters, valid words, pangrams
4. **Contexto** - Secret words for semantic similarity game
5. **Betweenle** - Target word and alphabetical bounds
6. **Phrase** - Famous phrases/quotes with categories
7. **Word Validation** - Checks if guessed words are real English words

### Daily Generation
At 8 AM UTC, the Worker cron job:
1. Generates all puzzle types for the next day
2. Stores them in D1 database
3. Avoids repeating past words/phrases

---

## Landing Page Details

### The Kraken SVG
Located inline in `index.html` (not a separate file)

**Structure:**
- Mantle (head) with gradient fill
- 8 tentacles (6 front, 2 back)
- Large eyes with iris rings, pupils, shine highlights
- Parrot-like beak (upper and lower parts)
- Bioluminescent glow spots
- Siphon

**CSS Animations:**
| Animation | Effect | Duration |
|-----------|--------|----------|
| krakenFloat | Bob up/down 20px, tilt +/-3 degrees | 6s |
| mantleBreathe | Scale Y 8% in/out | 4s |
| glowPulse | Bioluminescent spots grow to 2x | 2-3s |
| eyeLook | Eyes move around | 8s |
| pupilPulse | Pupils scale 0.8 to 1.3 | 4s |
| eyeTwinkle | Shine opacity pulse | 2s |
| beakPulse | Beak color pulse | 3s |
| beakUpperMove | Upper beak opens | 4s |
| beakLowerMove | Lower beak opens | 4s |

**JavaScript Animation (tentacles.js):**
- S-curve wiggling motion like snakes held by tail
- Uses sine waves with different phases per segment
- Each tentacle has unique: speed, amplitude, phase, wavelength
- Runs at 60fps via requestAnimationFrame
- Outer tentacles move more than center ones

### Bubble Effect (bubbles.js)
- 20 bubbles rising continuously
- Random sizes: 4-24px
- Random positions across screen width
- Random speeds: 10-25s rise time
- Horizontal drift variation
- Self-recycling after animation ends

### Social Links
| Platform | Handle/URL |
|----------|------------|
| YouTube | @krakenunbound |
| X (Twitter) | @krakenunbound |
| Discord | https://discord.gg/pv7VPUEcg7 |

---

## Project Structure

```
website/
├── index.html              # Landing page with inline SVG kraken
├── favicon.ico             # Browser tab icon (legacy)
├── favicon.svg             # Browser tab icon (modern)
├── css/
│   └── styles.css          # All styles, animations, responsive
├── js/
│   ├── bubbles.js          # Rising bubble particle effect
│   └── tentacles.js        # Tentacle S-curve animation
├── arkade/                 # Game arcade
│   └── index.html          # Arcade hub page
│   └── [game folders]      # Individual games
├── api/                    # Cloudflare Worker
│   ├── src/
│   │   └── index.js        # Worker code (all API endpoints)
│   └── wrangler.toml       # Worker configuration
├── PROJECT_DOCUMENTATION.md # This file
└── SETUP_GUIDE.md          # Abbreviated setup guide
```

---

## Design System

### Color Theme (Ocean/Deep Sea)
```css
:root {
    --bg-primary: #0f1115;      /* Darkest background */
    --bg-secondary: #152030;    /* Secondary background */
    --bg-card: #1a2535;         /* Card backgrounds */
    --bg-hover: #1e2d42;        /* Hover states */
    --text-primary: #e0e8f0;    /* Main text */
    --text-secondary: #8aa4bc;  /* Secondary text */
    --text-muted: #4a6480;      /* Muted text */
    --border-color: #1e3045;    /* Borders */
    --accent: #3b9ebe;          /* Accent blue/teal */
    --accent-hover: #4fb8d8;    /* Accent hover */
    --accent-glow: rgba(59, 158, 190, 0.4);  /* Glow effects */
}
```

### Social Brand Colors
```css
--youtube-red: #ff0000;
--x-white: #ffffff;
--discord-blurple: #5865F2;
```

### Responsive Breakpoints
- **Desktop:** Default styles
- **Mobile:** 480px breakpoint
- **Container max-width:** 600px
- **Kraken:** 180x220px desktop, 140x170px mobile

---

## Deployment Guide

### Deploy Static Site (Pages)
```bash
# Navigate to project
cd "G:\Kraken Chat\website"

# Stage all changes
git add -A

# Commit
git commit -m "Description of changes"

# Push (triggers auto-deploy)
git push

# Or all at once:
git add -A && git commit -m "message" && git push
```

### Deploy Worker (API)
```bash
cd "G:\Kraken Chat\website\api"

# Login to Cloudflare (first time only)
wrangler login

# Deploy
wrangler deploy

# View live logs
wrangler tail
```

### Add/Update Secrets
```bash
cd api
wrangler secret put GROQ_API_KEY
# Paste key when prompted
```

### Local Development
```bash
# Test Worker locally
cd api
wrangler dev
# Runs at http://localhost:8787
```

---

## Troubleshooting

### Pages Not Updating
1. Check GitHub for push success
2. Check Cloudflare Pages dashboard for deploy status
3. Force refresh browser: Ctrl+Shift+R
4. Clear Cloudflare cache in dashboard

### Worker Errors
```bash
# View live logs
wrangler tail

# Check worker status
wrangler deployments list
```

### Database Issues
```bash
# Test query
wrangler d1 execute kraken-arkade --command "SELECT * FROM daily_words ORDER BY date DESC LIMIT 1"

# Check table structure
wrangler d1 execute kraken-arkade --command ".schema daily_words"
```

### Groq API Errors
1. Verify API key: https://console.groq.com/keys
2. Check rate limits on Groq dashboard
3. View Worker logs: `wrangler tail`
4. Re-add secret if needed:
```bash
wrangler secret put GROQ_API_KEY
```

### Git Issues
```bash
# Check status
git status

# View remote
git remote -v

# Reset to remote state
git fetch origin
git reset --hard origin/master
```

---

## Quick Reference

### URLs
| Service | URL |
|---------|-----|
| Live Website | https://krakenunbound.com |
| Cloudflare Dashboard | https://dash.cloudflare.com |
| GitHub Repo | https://github.com/krakenunbound/krakenunbound-website |
| Groq Console | https://console.groq.com |

### Credentials Needed
| Item | Location |
|------|----------|
| Cloudflare Login | Krakenunbound@gmail.com |
| GitHub Access | Configured locally via git |
| Groq API Key | Cloudflare Worker secret |

### Important IDs
| Item | Value |
|------|-------|
| D1 Database ID | 631d64b0-6dfa-4ee5-87a3-fccf56425f5c |
| D1 Database Name | kraken-arkade |
| Worker Name | kraken-arkade-api |
| Pages Project | krakenunbound-website |

---

## Notes for Future Sessions

1. **SVG is inline** - The kraken is embedded directly in index.html, not a separate file
2. **CSS + JS animations** - Both work together (CSS for body, JS for tentacles)
3. **No build step** - Pure static files, no npm/webpack needed for the site
4. **Worker is separate** - The API has its own deployment via wrangler
5. **Groq is for puzzles** - Only used by the Worker, not the landing page
6. **Cron runs at 8 AM UTC** - Generates next day's puzzles automatically
7. **SSL is automatic** - Cloudflare handles all certificates

---

*Last updated: December 2024*
