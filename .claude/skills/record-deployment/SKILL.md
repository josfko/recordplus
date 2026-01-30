---
name: record-deployment
description: Deployment patterns for Record+ on Clouding.io VPS with PM2 and Cloudflare Tunnel. Use when deploying, managing the server, configuring PM2, setting up Cloudflare, or troubleshooting production issues. Triggers on deployment, server management, PM2, or Cloudflare questions.
---

# Record+ Deployment

## Architecture

```
[Cloudflare Pages]  ──►  [Cloudflare Tunnel]  ──►  [VPS Backend]
   (Frontend)                (Zero Trust)           (Node.js + SQLite)
```

## Infrastructure

| Component | Service | Location |
|-----------|---------|----------|
| Frontend | Cloudflare Pages | Edge (global) |
| Backend | Clouding.io VPS | Barcelona, Spain |
| Auth | Cloudflare Zero Trust | Edge |
| Tunnel | cloudflared | VPS |
| Process | PM2 | VPS |
| Database | SQLite | VPS (`/home/appuser/data/`) |

## VPS Details

- **OS:** Ubuntu 22.04 LTS
- **User:** `appuser` (non-root)
- **Node.js:** 20.x (NodeSource)
- **App Path:** `/home/appuser/recordplus/`
- **Data Path:** `/home/appuser/data/`

## PM2 Commands

```bash
# Status
pm2 status
pm2 logs recordplus
pm2 logs recordplus --lines 100

# Restart/Reload
pm2 restart recordplus
pm2 reload recordplus    # Zero-downtime reload

# Stop/Start
pm2 stop recordplus
pm2 start recordplus

# Configuration
pm2 start ecosystem.config.cjs
pm2 save                  # Save process list
pm2 startup              # Enable on boot
```

## PM2 Configuration

File: `ecosystem.config.cjs`

```javascript
module.exports = {
  apps: [{
    name: "recordplus",
    script: "src/server/index.js",
    cwd: "/home/appuser/recordplus",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "500M",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      DB_PATH: "/home/appuser/data/legal-cases.db",
      DOCUMENTS_PATH: "/home/appuser/data/documents",
    },
  }],
};
```

## Cloudflare Tunnel

### Check Status
```bash
systemctl status cloudflared
```

### Restart Tunnel
```bash
sudo systemctl restart cloudflared
```

### View Logs
```bash
journalctl -u cloudflared -f
```

## Deployment Steps

### 1. Update Code
```bash
cd /home/appuser/recordplus
git pull origin main
npm ci --production
```

### 2. Run Migrations
```bash
sqlite3 /home/appuser/data/legal-cases.db < migrations/NNN_description.sql
```

### 3. Restart App
```bash
pm2 reload recordplus
```

## Database Backup

### Manual Backup
```bash
cp /home/appuser/data/legal-cases.db /home/appuser/backups/legal-cases-$(date +%Y%m%d).db
```

### Automated (cron)
```bash
# Daily at 2 AM, keep 30 days
0 2 * * * cp /home/appuser/data/legal-cases.db /home/appuser/backups/legal-cases-$(date +\%Y\%m\%d).db && find /home/appuser/backups -name "*.db" -mtime +30 -delete
```

## Environment Variables

| Variable | Production Value |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DB_PATH` | `/home/appuser/data/legal-cases.db` |
| `DOCUMENTS_PATH` | `/home/appuser/data/documents` |

## Troubleshooting

### App Not Responding
```bash
pm2 logs recordplus --err --lines 50
pm2 restart recordplus
```

### Database Locked
```bash
# Check for stale processes
lsof /home/appuser/data/legal-cases.db

# If needed, restart PM2
pm2 restart recordplus
```

### Tunnel Down
```bash
systemctl status cloudflared
sudo systemctl restart cloudflared
```

### Check Memory
```bash
pm2 monit
free -h
```

### Check Disk
```bash
df -h /home/appuser
du -sh /home/appuser/data/*
```

## Security Notes

- No open ports (all traffic via Cloudflare Tunnel)
- Zero Trust authentication required
- App runs as `appuser` (non-root)
- Database file permissions: `600`
- RGPD compliance: data stored in Spain
