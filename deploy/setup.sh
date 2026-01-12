#!/bin/bash
# =============================================================================
# RecordPlus - Initial Server Setup Script
# Run this ONCE on a fresh Ubuntu 24.04 server
# =============================================================================

set -e  # Exit on error

echo "=========================================="
echo "RecordPlus Server Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_USER="appuser"
APP_DIR="/home/$APP_USER/recordplus"
DATA_DIR="/home/$APP_USER/data"
BACKUP_DIR="/home/$APP_USER/backups"
REPO_URL="https://github.com/josfko/recordplus.git"

echo -e "${YELLOW}Step 1: System Update${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Install Node.js 20${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}Node.js $(node -v) installed${NC}"
else
    echo -e "${GREEN}Node.js $(node -v) already installed${NC}"
fi

echo -e "${YELLOW}Step 3: Install PM2${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}PM2 installed${NC}"
else
    echo -e "${GREEN}PM2 already installed${NC}"
fi

echo -e "${YELLOW}Step 4: Install Git${NC}"
apt install -y git

echo -e "${YELLOW}Step 5: Create application user${NC}"
if ! id "$APP_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" $APP_USER
    echo -e "${GREEN}User $APP_USER created${NC}"
else
    echo -e "${GREEN}User $APP_USER already exists${NC}"
fi

echo -e "${YELLOW}Step 6: Create directories${NC}"
mkdir -p $APP_DIR
mkdir -p $DATA_DIR
mkdir -p $BACKUP_DIR
chown -R $APP_USER:$APP_USER /home/$APP_USER

echo -e "${YELLOW}Step 7: Clone repository${NC}"
if [ ! -d "$APP_DIR/.git" ]; then
    sudo -u $APP_USER git clone $REPO_URL $APP_DIR
    echo -e "${GREEN}Repository cloned${NC}"
else
    echo -e "${GREEN}Repository already exists, pulling latest${NC}"
    cd $APP_DIR
    sudo -u $APP_USER git pull
fi

echo -e "${YELLOW}Step 8: Install dependencies${NC}"
cd $APP_DIR
sudo -u $APP_USER npm install --production

echo -e "${YELLOW}Step 9: Initialize database${NC}"
if [ ! -f "$DATA_DIR/legal-cases.db" ]; then
    sudo -u $APP_USER node migrations/run.js
    echo -e "${GREEN}Database initialized${NC}"
else
    echo -e "${GREEN}Database already exists${NC}"
fi

echo -e "${YELLOW}Step 10: Configure PM2${NC}"
cd $APP_DIR
sudo -u $APP_USER pm2 delete recordplus 2>/dev/null || true
sudo -u $APP_USER pm2 start ecosystem.config.cjs
sudo -u $APP_USER pm2 save

# Setup PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
sudo -u $APP_USER pm2 save

echo -e "${YELLOW}Step 11: Setup daily backups${NC}"
BACKUP_SCRIPT="/home/$APP_USER/backup.sh"
cat > $BACKUP_SCRIPT << 'EOF'
#!/bin/bash
# Daily SQLite backup
BACKUP_DIR="/home/appuser/backups"
DB_PATH="/home/appuser/data/legal-cases.db"
DATE=$(date +%Y%m%d)

# Create backup
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/legal-cases-$DATE.db'"

# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete

echo "Backup completed: legal-cases-$DATE.db"
EOF

chmod +x $BACKUP_SCRIPT
chown $APP_USER:$APP_USER $BACKUP_SCRIPT

# Add cron job for daily backup at 3 AM
(crontab -u $APP_USER -l 2>/dev/null | grep -v backup.sh; echo "0 3 * * * /home/$APP_USER/backup.sh >> /home/$APP_USER/backups/backup.log 2>&1") | crontab -u $APP_USER -

echo -e "${YELLOW}Step 12: Install SQLite (for backups)${NC}"
apt install -y sqlite3

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "App running at: http://localhost:3000"
echo "Data directory: $DATA_DIR"
echo "Backups: $BACKUP_DIR (daily at 3 AM)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Install Cloudflare Tunnel (see deploy/cloudflare-setup.md)"
echo "2. Configure Zero Trust access"
echo "3. Deploy frontend to Cloudflare Pages"
echo ""
echo "To check app status: sudo -u $APP_USER pm2 status"
echo "To view logs: sudo -u $APP_USER pm2 logs recordplus"
