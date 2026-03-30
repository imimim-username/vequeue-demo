# Governance Town / veQueue Demo — Project Context

_Last updated: 2026-03-29_

---

## What This Project Is

A browser-based educational game teaching the **veQueue protocol** — a rate-limited governance token locking mechanism with entry/exit queues, watermark/principal protection, ERC-6909 NFT positions, and vqShares.

The project lives at: `/workspace/extra/gits/vequeue-demo/`
GitHub remote: `github.com:imimim-username/vequeue-demo.git`
Deploy key: `/workspace/extra/github-keys/github_deploy`

---

## Git History

| Commit | Description |
|--------|-------------|
| `aa047d5` | initial commit — v2 single-player SNES-style demo (`index.html`) |
| `c800dc6` | Add Governance Town multiplayer game (v2) — **reverted** |
| `d502c0c` | Revert of multiplayer commit (files removed, history preserved) |

The multiplayer code (server.js, public/index.html, package.json, nginx-vequeue.conf) is preserved in commit `c800dc6` and can be cherry-picked or referenced later.

---

## Current State of the Repo

Only `index.html` is in the working tree — the v2 single-player SNES-style demo.

Published static demo URL: `https://earthy-atlas-nvjk.here.now/`

---

## v2 Single-Player Demo (`index.html`)

### Visual Style
- SNES-quality pixel art
- Wainscoting walls: plaster + wood baseboard + gold chair rail
- Checkered marble floors, carpet texture, tech floor tiles
- Chunky 2×2 pixel-art sprites
- CRT scanline overlay

### Responsive / Mobile
- Canvas scales via CSS `width/height`; `image-rendering: pixelated`
- Scale factor: `Math.min(availableWidth/BASE_W, availableHeight/BASE_H, 2)`
- Mobile D-pad overlay shown when `window.matchMedia('(pointer:coarse)')` is true
- Touch events feed into `held` object (same as keyboard)

### Queue Flow (Fixed)
1. Player enters lobby → picks up number ticket
2. Serving counter advances → player's number gets called (`G.queue.called = true`)
3. Player walks to WN (clerk window) tile at row 2 of entryQueue
4. 6-page clerk dialog plays out
5. `G.processed = true` → lobby side/south doors unlock (tiles flip from WA to open)

### Map Generation
- `getLobbyMap()` builds the governance hall dynamically
- Side/south doors are WA (wall) until `G.processed = true`

---

## Multiplayer Game Design (Governance Town) — Future Work

This was designed but the commit was reverted pending proper droplet setup.

### Architecture
- **Backend**: Node.js + Socket.io, bind to `127.0.0.1:3001`
- **Frontend**: Single `public/index.html` served by Express
- **Proxy**: nginx → localhost:3001, domain: `vequeue.imimim.info`
- **TLS**: Certbot / Let's Encrypt

### Player Model
- Anonymous nicknames + color selection (no login)
- localStorage opt-in persistence: `gt_state` key stores `{tokens, quests, nickname, color}`
- Warn users who opt out that progress won't be saved
- 1000 GOV tokens starting balance

### World
- Small town, 40×28 tile map
- 4 buildings: Tavern, Governance Hall, Marketplace, Treasury
- Local (zone-scoped) chat only — not global
- Camera follows player in town; buildings use fixed viewport

### Quest Chain (5 quests)
1. Talk to Town Crier (SI tile, col 16 row 9 in town)
2. Complete intake window in Governance Hall
3. Talk to vault keeper NPC
4. Talk to assessor NPC
5. Talk to exit clerk NPC

### Rewards (Scaffolded, Not Wired)
- Discord role assignment (bot not built yet)
- Base free mint (contract not deployed yet)
- Both appear as buttons in completion modal with "coming soon" labels

### Socket Events
```
join          → spawn at x:20,y:14 in town; emit 'welcome' + 'player_joined'
move          → update pos; broadcast to zone
zone_change   → leave old zone room; join new; sync players
chat          → io.to(p.zone).emit (local chat)
quest_update  → update quests/tokens; broadcast player_updated
get_scoreboard → emit sorted scoreboard
disconnect    → broadcast player_left; delete from registry
```

---

## Droplet Deployment (TODO — Do Properly Next Time)

**Before doing anything on the droplet, run recon first:**

```bash
# What's already running?
sudo systemctl list-units --type=service --state=running

# What ports are in use?
sudo ss -tlnp

# Is nginx already installed?
nginx -v 2>/dev/null || echo "not installed"

# Is node already installed?
node -v 2>/dev/null || echo "not installed"
npm -v 2>/dev/null || echo "not installed"

# Is pm2 already installed?
pm2 -v 2>/dev/null || echo "not installed"

# Any existing nginx sites?
ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "no nginx"

# What's in /etc/nginx/sites-enabled if it exists?
cat /etc/nginx/sites-enabled/* 2>/dev/null
```

Only proceed with installs after reviewing output — don't clobber existing bots or services.

### Install Node.js (if not present)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

### Install nginx (if not present)
```bash
sudo apt install -y nginx
sudo systemctl status nginx
```

### Deploy nginx config
```bash
sudo cp nginx-vequeue.conf /etc/nginx/sites-available/vequeue
sudo ln -sf /etc/nginx/sites-available/vequeue /etc/nginx/sites-enabled/vequeue
# Remove listen 443 ssl line BEFORE certbot (certbot adds it)
sudo sed -i 's/listen 443 ssl;/listen 443;/' /etc/nginx/sites-available/vequeue
sudo nginx -t && sudo systemctl reload nginx
```

### TLS
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vequeue.imimim.info
```

### Start server
```bash
cd ~/gits/vequeue-demo
npm install
# Option A: foreground (testing)
node server.js
# Option B: pm2 (persistent)
npm install -g pm2
pm2 start server.js --name governance-town
pm2 save
pm2 startup   # follow printed instructions
```

---

## Git Push Command

SSH deploy key is at `/workspace/extra/github-keys/github_deploy`

```bash
mkdir -p ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
GIT_SSH_COMMAND="ssh -i /workspace/extra/github-keys/github_deploy -o StrictHostKeyChecking=no" git push origin main
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth | Anonymous nicknames | No friction; no PII |
| Persistence | localStorage opt-in | Simple; no server DB needed |
| Chat scope | Zone-local only | Reduces noise; more immersive |
| Backend | Node.js + Socket.io | ~50-80MB RAM; single process |
| Port | 3001 internal | nginx is sole public entry point |
| Rewards | Scaffolded only | Discord bot / contract not ready |
