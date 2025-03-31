#!/bin/bash
# Deployment script for BrainBuster backend

# Navigate to the backend directory
cd /var/www/html/games/brain-buster/backend

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Create a systemd service file
cat > /etc/systemd/system/brainbuster-backend.service << EOL
[Unit]
Description=BrainBuster Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/html/games/brain-buster/backend
ExecStart=/usr/bin/node /var/www/html/games/brain-buster/backend/dist/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd, enable and start the service
systemctl daemon-reload
systemctl enable brainbuster-backend
systemctl start brainbuster-backend

# Update NGINX configuration
# Make sure to replace your existing NGINX configuration with the provided one

# Restart NGINX
systemctl restart nginx

echo "Deployment completed successfully!"
