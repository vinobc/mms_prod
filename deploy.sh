# ~/mms/deploy.sh
#!/bin/bash

echo "Starting deployment process..."

# Install and build server
cd ~/mms/server
npm install
npm run build

# Install and build client
cd ~/mms/client
npm install
npm run build

# Deploy client build to Nginx
sudo cp -r dist/* /var/www/mms/
sudo chown -R www-data:www-data /var/www/mms
sudo chmod -R 755 /var/www/mms

# Restart Node.js server
pm2 restart mms-server

echo "Deployment completed successfully!"
