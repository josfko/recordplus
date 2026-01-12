#!/bin/bash
# =============================================================================
# RecordPlus - Update Script
# Run this to deploy new code changes
# =============================================================================

set -e

APP_USER="appuser"
APP_DIR="/home/$APP_USER/recordplus"

echo "Updating RecordPlus..."

cd $APP_DIR

# Pull latest code
sudo -u $APP_USER git pull

# Install any new dependencies
sudo -u $APP_USER npm install --production

# Run any new migrations
sudo -u $APP_USER node migrations/run.js

# Restart the app
sudo -u $APP_USER pm2 restart recordplus

echo "Update complete!"
sudo -u $APP_USER pm2 status
