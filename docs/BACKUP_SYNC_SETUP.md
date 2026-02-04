# Record+ Backup & Sync Setup Guide

This guide covers the complete backup system for Record+, including automatic syncing to your Mac using Syncthing.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKUP ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Clouding.io VPS (Barcelona)              Your Mac                      │
│   ┌─────────────────────────┐              ┌─────────────────────────┐  │
│   │                         │              │                         │  │
│   │  /home/appuser/data/    │              │  ~/Documents/           │  │
│   │    legal-cases.db       │              │    RecordPlus-Backups/  │  │
│   │         │               │              │         ▲               │  │
│   │         ▼               │   Syncthing  │         │               │  │
│   │  /home/appuser/backups/ │ ◄──────────► │    .db files appear     │  │
│   │    legal-cases-*.db     │   (auto)     │    automatically        │  │
│   │                         │              │         │               │  │
│   └─────────────────────────┘              │         ▼               │  │
│                                            │    TablePlus /          │  │
│   Cron job: Daily 3 AM backup              │    Beekeeper Studio     │  │
│   App: On-demand backups via UI            │                         │  │
│                                            └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Part 1: In-App Backup Management

The app includes a backup management UI at **Admin Panel → Copias de Seguridad**.

### Features
- View all backups with dates and sizes
- Create on-demand backups with one click
- Download any backup directly
- Delete old backups

### API Endpoints
```
GET  /api/backup/status              - Get backup system status
GET  /api/backup/list                - List all backups
POST /api/backup/create              - Create new backup
GET  /api/backup/:filename/download  - Download backup file
DELETE /api/backup/:filename         - Delete backup
```

### Backup Location
- **VPS:** `/home/appuser/backups/`
- **Local dev:** `./data/backups/`

---

## Part 2: Syncthing Installation

### Step 2.1: Install on VPS (Clouding.io)

SSH into your server:
```bash
ssh root@217.71.207.83
```

Add Syncthing repository and install:
```bash
# Add repository
curl -s https://syncthing.net/release-key.txt | sudo apt-key add -
echo "deb https://apt.syncthing.net/ syncthing stable" | sudo tee /etc/apt/sources.list.d/syncthing.list

# Install
sudo apt update
sudo apt install syncthing -y

# Enable and start as service for appuser
sudo systemctl enable syncthing@appuser
sudo systemctl start syncthing@appuser

# Verify it's running
sudo systemctl status syncthing@appuser
```

You should see "active (running)" in green.

### Step 2.2: Install on Mac

Open Terminal and run:
```bash
# Install via Homebrew
brew install syncthing

# Start as background service
brew services start syncthing

# Verify it's running
brew services list | grep syncthing
```

Open the Syncthing web UI: http://localhost:8384

---

## Part 3: Pairing Devices

### Step 3.1: Get the VPS Device ID

Create an SSH tunnel to access the VPS Syncthing web UI:
```bash
ssh -L 8385:localhost:8384 root@217.71.207.83
```

Now open http://localhost:8385 in your browser (note: port 8385, not 8384).

In the VPS Syncthing UI:
1. Click **Actions** (top right) → **Show ID**
2. Copy the Device ID (it looks like: `XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX`)

### Step 3.2: Add VPS as Remote Device on Mac

In your Mac's Syncthing UI (http://localhost:8384):
1. Click **+ Add Remote Device**
2. Paste the VPS Device ID
3. Device Name: `RecordPlus-VPS` (or any name you prefer)
4. Click **Save**

### Step 3.3: Accept Connection on VPS

Go back to the VPS Syncthing UI (http://localhost:8385):
1. You'll see a notification: "New Device"
2. Click **Add Device**
3. Device Name: `MacBook` (or your Mac's name)
4. Click **Save**

The devices are now paired! You'll see them connected in both UIs.

---

## Part 4: Configure Shared Folder

### Step 4.1: Add Folder on VPS

In VPS Syncthing UI (http://localhost:8385):
1. Click **+ Add Folder**
2. Configure:
   - **Folder Label:** `RecordPlus Backups`
   - **Folder Path:** `/home/appuser/backups`
   - **Folder ID:** `recordplus-backups` (auto-generated, note it down)
3. Go to **Sharing** tab:
   - Check your Mac device to share with it
4. Go to **Advanced** tab:
   - **Folder Type:** `Send Only` (VPS only sends, never receives changes)
5. Click **Save**

### Step 4.2: Accept Folder on Mac

In Mac Syncthing UI (http://localhost:8384):
1. You'll see a notification: "New Folder"
2. Click **Add**
3. Configure:
   - **Folder Path:** `~/Documents/RecordPlus-Backups` (or your preferred location)
   - **Folder Type:** `Receive Only` (Mac only receives, never sends changes)
4. Click **Save**

### Step 4.3: Verify Sync

1. Create a test backup on the VPS (see below)
2. Watch the Syncthing UIs - you should see sync activity
3. Check `~/Documents/RecordPlus-Backups/` on your Mac - the backup file should appear

**Create a test backup on VPS:**
```bash
sudo -u appuser sqlite3 /home/appuser/data/legal-cases.db ".backup '/home/appuser/backups/legal-cases-test.db'"
ls -la /home/appuser/backups/
```

**Check on Mac:**
```bash
ls -la ~/Documents/RecordPlus-Backups/
```

You should see `legal-cases-test.db` appear within seconds.

---

## Part 4.5: Alternative Backup Methods

### Method 1: Via App UI (after deployment)
Navigate to **Admin Panel → Copias de Seguridad → Crear Copia Ahora**

### Method 2: Direct SSH Command (always works)
Run on VPS via SSH/Termius:
```bash
# Create dated backup
sudo -u appuser sqlite3 /home/appuser/data/legal-cases.db ".backup '/home/appuser/backups/legal-cases-$(date +%Y%m%d-%H%M%S).db'"

# Verify
ls -la /home/appuser/backups/
```

### Method 3: Existing Cron Job (automatic daily)
The server already has a cron job that creates backups at 3 AM daily:
- Location: `/home/appuser/backup.sh`
- Output: `/home/appuser/backups/legal-cases-YYYYMMDD.db`
- Retention: 30 days (older backups auto-deleted)

---

## Part 5: Viewing Database in GUI Apps

Once backups sync to your Mac, you can open them with any SQLite GUI.

### Option A: TablePlus (Recommended)

1. Download from https://tableplus.com/ (free tier available)
2. Open TablePlus
3. Click **+ Create a new connection**
4. Select **SQLite**
5. Click **Select File** → Navigate to `~/Documents/RecordPlus-Backups/`
6. Select the most recent `.db` file (e.g., `legal-cases-20260204.db`)
7. Click **Connect**

You can now browse all tables: `cases`, `document_history`, `email_history`, `configuration`, `reference_counters`.

### Option B: Beekeeper Studio (Free)

1. Download from https://www.beekeeperstudio.io/
2. Open Beekeeper Studio
3. Connection Type: **SQLite**
4. Click **Choose File** → Navigate to `~/Documents/RecordPlus-Backups/`
5. Select a `.db` file
6. Click **Connect**

### Option C: DB Browser for SQLite (Free, Open Source)

1. Download from https://sqlitebrowser.org/
2. Open DB Browser
3. Click **Open Database**
4. Navigate to `~/Documents/RecordPlus-Backups/`
5. Select a `.db` file

---

## Part 6: Maintenance

### Check Syncthing Status

**On Mac:**
```bash
brew services list | grep syncthing
```

**On VPS:**
```bash
sudo systemctl status syncthing@appuser
```

### View Syncthing Logs

**On VPS:**
```bash
journalctl -u syncthing@appuser -f
```

### Restart Syncthing

**On Mac:**
```bash
brew services restart syncthing
```

**On VPS:**
```bash
sudo systemctl restart syncthing@appuser
```

### Stop Syncthing

**On Mac:**
```bash
brew services stop syncthing
```

**On VPS:**
```bash
sudo systemctl stop syncthing@appuser
```

---

## Part 7: Security Notes

### Data Privacy (RGPD)
- Syncthing is peer-to-peer: data goes directly between your devices
- No data stored on third-party servers
- End-to-end encrypted in transit
- Backups stay on devices you control (VPS in Barcelona + your Mac)

### Syncthing Relay Servers
- Used only for NAT traversal (connecting devices behind routers)
- Data is encrypted; relay servers cannot read it
- You can disable relays and use only direct connections if both devices have public IPs

### Firewall
- Syncthing uses port 22000 for sync and 21027 for discovery
- These work through NAT without port forwarding (uses relay servers)
- No need to open ports on your VPS firewall

---

## Troubleshooting

### Devices Not Connecting

1. Check both Syncthing services are running
2. Verify Device IDs are correct
3. Check for firewall blocks
4. Try restarting Syncthing on both devices

### Sync Not Working

1. Check folder paths exist and have correct permissions
2. On VPS: `ls -la /home/appuser/backups/`
3. Verify folder is shared with the remote device
4. Check Syncthing logs for errors

### Permission Issues on VPS

If Syncthing can't read the backups folder:
```bash
# Ensure appuser owns the backups directory
sudo chown -R appuser:appuser /home/appuser/backups
sudo chmod 755 /home/appuser/backups
```

### Mac Not Receiving Files

1. Check folder type is "Receive Only" on Mac
2. Check folder type is "Send Only" on VPS
3. Verify enough disk space on Mac
4. Check `~/Documents/RecordPlus-Backups/` exists

---

## Quick Reference

| Task | Command/Location |
|------|------------------|
| VPS Syncthing UI | `ssh -L 8385:localhost:8384 root@217.71.207.83` then http://localhost:8385 |
| Mac Syncthing UI | http://localhost:8384 |
| VPS backup folder | `/home/appuser/backups/` |
| Mac backup folder | `~/Documents/RecordPlus-Backups/` |
| Start Syncthing (Mac) | `brew services start syncthing` |
| Start Syncthing (VPS) | `sudo systemctl start syncthing@appuser` |
| Create backup (App) | Admin Panel → Copias de Seguridad → Crear Copia Ahora |
| Create backup (SSH) | `sudo -u appuser sqlite3 /home/appuser/data/legal-cases.db ".backup '/home/appuser/backups/legal-cases-$(date +%Y%m%d).db'"` |
| View in TablePlus | File → Open → select `.db` file from `~/Documents/RecordPlus-Backups/` |
| View in Beekeeper | New Connection → SQLite → Choose File → select `.db` file |

---

## Part 8: Extend to More Devices via iCloud

If you want backups available on all your Apple devices (iPhone, iPad, other Macs) without setting up Syncthing on each one, use iCloud Drive.

### Option A: Move Syncthing folder to iCloud Drive

1. Stop Syncthing on Mac:
   ```bash
   brew services stop syncthing
   ```

2. Move the backup folder to iCloud:
   ```bash
   mv ~/Documents/RecordPlus-Backups ~/Library/Mobile\ Documents/com~apple~CloudDocs/RecordPlus-Backups
   ```

3. Update Syncthing folder path:
   - Open http://localhost:8384
   - Edit "RecordPlus Backups" folder
   - Change path to: `~/Library/Mobile Documents/com~apple~CloudDocs/RecordPlus-Backups`
   - Save

4. Restart Syncthing:
   ```bash
   brew services start syncthing
   ```

Now backups sync: **VPS → Mac (Syncthing) → iCloud → all Apple devices**

### Option B: Create a symlink (simpler)

Keep Syncthing folder where it is, but make it appear in iCloud:

```bash
ln -s ~/Documents/RecordPlus-Backups ~/Library/Mobile\ Documents/com~apple~CloudDocs/RecordPlus-Backups
```

The folder will now appear in iCloud Drive on all your devices.

### Accessing on iPhone/iPad

1. Open the **Files** app
2. Go to **iCloud Drive**
3. Open **RecordPlus-Backups** folder
4. Tap any `.db` file to preview (limited view) or share to a SQLite app

**Note:** To fully browse SQLite on iOS, you'd need an app like "DB Browser for SQLite" or similar.

---

## Setup Completed Checklist

- [x] Syncthing installed on VPS
- [x] Syncthing installed on Mac
- [x] Devices paired
- [x] Folder shared (VPS → Mac)
- [x] Test backup synced successfully
- [ ] Deploy backup API to production (optional - SSH method always works)
- [ ] Extend to iCloud (optional - for access on all Apple devices)
