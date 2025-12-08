# Kraken Unbound Website Project

## Overview
This is the personal website for **Kraken Unbound** - a landing page with social links, featuring an animated SVG kraken with underwater bubble effects.

**Live Site:** https://krakenunbound.com (also https://www.krakenunbound.com)

---

## Hosting & Deployment

### GitHub Repository
- **Repo:** https://github.com/krakenunbound/krakenunbound-website
- **Branch:** master
- **Auto-deploys:** Yes - push to master triggers Cloudflare Pages deployment

### Cloudflare Pages
- **Account:** Krakenunbound@gmail.com
- **Project:** krakenunbound-website
- **Custom Domains:**
  - krakenunbound.com (Active, SSL enabled)
  - www.krakenunbound.com (Active, SSL enabled)
- **Build Settings:** None required - static HTML/CSS/JS served directly
- **Domain registered through:** Cloudflare

### Deployment Workflow
1. Edit files locally in `G:\Kraken Chat\website\`
2. `git add -A && git commit -m "message" && git push`
3. Cloudflare auto-deploys within ~30 seconds

---

## Project Structure

```
G:\Kraken Chat\website\
├── index.html          # Main page with SVG kraken and social links
├── css/
│   └── styles.css      # All styles, animations, responsive design
├── js/
│   ├── bubbles.js      # Rising bubble particle effect
│   └── tentacles.js    # JavaScript tentacle S-curve animation
└── website.md          # This documentation file
```

---

## Design System

### Color Theme (Ocean/Deep Sea)
```css
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
```

### Social Brand Colors
```css
--youtube-red: #ff0000;
--x-white: #ffffff;
--discord-blurple: #5865F2;
```

---

## The Kraken SVG

### Structure
- **Mantle (head):** Gradient-filled path with breathing animation
- **Eyes:** Large ellipses with iris rings, pupils that dilate, white shine highlights
- **Tentacles:** 8 total (6 front, 2 back) - animated via JavaScript
- **Bioluminescent spots:** Pulsing glow spots on body and tentacles
- **Suckers:** Small circles along tentacles
- **Siphon:** Small ellipse below eyes

### Animations
1. **Floating:** Whole kraken bobs up/down 20px and tilts ±3° (CSS)
2. **Mantle breathing:** Scales Y 8% in/out (CSS)
3. **Tentacles:** S-curve wiggling like snakes held by tail (JavaScript)
4. **Eyes looking around:** Moves in different directions (CSS)
5. **Pupil dilation:** Scales 0.8 to 1.3 (CSS)
6. **Bioluminescent pulse:** Grows to 2x size with brightness (CSS)
7. **Eye shine twinkle:** Opacity pulse (CSS)

### Tentacle Animation Details (tentacles.js)
Each tentacle is treated like a snake held by its tail:
- Uses sine waves to create S-curve motion
- More movement at tips, anchored at head
- Each has unique: speed (0.5-1.0), amplitude (8-15px), phase offset, wavelength
- Outer tentacles move more than center ones
- 60fps animation via requestAnimationFrame

---

## Social Links

| Platform | Handle/URL |
|----------|------------|
| YouTube  | @krakenunbound |
| X (Twitter) | @krakenunbound |
| Discord  | https://discord.gg/pv7VPUEcg7 |

---

## Bubble Effect (bubbles.js)
- 20 bubbles rising continuously
- Random sizes (4-24px), positions, speeds (10-25s)
- Horizontal drift variation
- Fade in at bottom, fade out at top
- Self-recycling (removes and recreates after animation)

---

## Responsive Design
- Max-width container: 600px
- Mobile breakpoint: 480px
- Kraken scales: 180x220px desktop, 140x170px mobile

---

## Future Plans
- Add custom background artwork
- Potentially more interactive kraken (eyes follow mouse?)
- Expand with more content/pages

---

## Git Commands Reference
```bash
# Navigate to project
cd "G:/Kraken Chat/website"

# Check status
git status

# Stage all changes
git add -A

# Commit with message
git commit -m "Description of changes"

# Push to GitHub (triggers Cloudflare deploy)
git push

# Full deploy command
git add -A && git commit -m "message" && git push
```

---

## Notes for Future Sessions
- The kraken SVG is inline in index.html (not a separate file)
- CSS animations and JS animations work together
- tentacles.js modifies the actual SVG path `d` attributes at 60fps
- The site has no build step - pure static files
- Cloudflare handles SSL, CDN, and DNS automatically

---

*Last updated: December 2024*
