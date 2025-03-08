# Production Setup Guide

This guide provides comprehensive instructions for setting up the Marks Management System (MMS) in a production environment.

## Prerequisites

- Google Cloud Platform account
- Basic knowledge of Linux, Nginx, Node.js, and MongoDB
- GitHub access to the repository

## 1. Server Provisioning

### VM Instance Setup

1. Create a VM instance on Google Cloud Platform:

   - Name: `mms-app-prod`
   - Machine type: e2-medium (2 vCPU, 4 GB memory)
   - Boot disk: Ubuntu 22.04 LTS
   - Firewall: Allow HTTP and HTTPS traffic

2. Reserve a static IP address:

   - Go to VPC network > IP addresses
   - Reserve a static external IP address
   - Assign it to your VM instance

3. Connect to your VM:
   ```bash
   ssh username@your-vm-ip
   ```

## 2. Environment Setup

### System Updates and Dependencies

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod  # Verify MongoDB is running

# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 3. Application Setup

### Clone Repository and Configure

```bash
# Clone the repository
mkdir -p ~/mms
cd ~/mms
git clone https://github.com/vinobc/mms.git .
git checkout production  # Switch to production branch

# Set up server environment variables
cd ~/mms/server
cp .env.example .env
nano .env
```

Configure your `.env` file with appropriate values:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mms
JWT_SECRET=your_secure_jwt_secret
ADMIN_SECRET_KEY=your_secure_admin_key
```

### Build Application

```bash
# Build server
cd ~/mms/server
npm install
npm run build

# Build client
cd ~/mms/client
npm install
npm run build
```

## 4. Nginx Configuration

### Configure Nginx as Reverse Proxy

```bash
# Create a new Nginx site configuration
sudo nano /etc/nginx/sites-available/mms-app
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name 34.93.175.190;  # Replace with your VM's IP or domain name

    # Serve static React files
    location / {
        root /var/www/mms;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js server
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Create web directory and enable the configuration:

```bash
# Create directory for web files
sudo mkdir -p /var/www/mms
sudo cp -r ~/mms/client/dist/* /var/www/mms/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/mms
sudo chmod -R 755 /var/www/mms

# Enable the site and disable default
sudo ln -s /etc/nginx/sites-available/mms-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test is successful, restart Nginx
sudo systemctl restart nginx
```

## 5. Process Manager (PM2) Setup

### Install and Configure PM2

```bash
# Install PM2 globally
sudo npm install -y pm2 -g

# Start the server with PM2
cd ~/mms/server
pm2 start dist/server.js --name "mms-server"

# Verify it's running
pm2 status

# Configure PM2 to start on system boot
pm2 startup
# Run the command that the above outputs
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u username --hp /home/username

# Save the PM2 process list
pm2 save
```

## 6. Database Setup

### Create Admin User

```bash
# Run the admin user creation script
cd ~/mms/server
node dist/scripts/createAdminUser.js
```

Follow the prompts to create an admin user with:

- Full Name
- Email
- Department
- Password (min 6 characters)

## 7. Automatic Deployment Script

### Create a Deployment Script

```bash
# Create the deployment script
nano ~/mms/deploy.sh
```

Add the following content:

```bash
#!/bin/bash

echo "Starting deployment process..."

# Pull latest production code
cd ~/mms
git checkout production
git pull origin production

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
```

Make the script executable:

```bash
chmod +x ~/mms/deploy.sh
```

## 8. Security Considerations

### Firewall Setup

```bash
# Enable UFW (Uncomplicated Firewall)
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Verify rules
sudo ufw status
```

### Secure MongoDB (Optional but Recommended)

```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf
```

Find the `net` section and modify to only listen on localhost:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

## 9. SSL Setup (Optional)

For secure HTTPS connections, set up SSL with Let's Encrypt:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 10. Monitoring and Maintenance

### Logs

Access logs for troubleshooting:

```bash
# Application logs
pm2 logs mms-server

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Backup

Set up MongoDB backups:

```bash
# Create backup directory
mkdir -p ~/backups

# Create a backup script
nano ~/backup.sh
```

Add to the script:

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR=~/backups
mongodump --out $BACKUP_DIR/mongodb_$TIMESTAMP
```

Make executable and set up a cron job:

```bash
chmod +x ~/backup.sh
crontab -e
```

Add to crontab for daily backup at 2 AM:

```
0 2 * * * /home/username/backup.sh
```

## 11. Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Issues

- Check if MongoDB is running: `sudo systemctl status mongod`
- Verify MongoDB connection string in `.env` file
- Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

#### Nginx Issues

- Check Nginx configuration: `sudo nginx -t`
- Check Nginx status: `sudo systemctl status nginx`
- Check error logs: `sudo tail -f /var/log/nginx/error.log`

#### Node.js/PM2 Issues

- Check PM2 process status: `pm2 status`
- Check application logs: `pm2 logs mms-server`
- Try restarting the application: `pm2 restart mms-server`

#### Permission Issues

- Ensure correct ownership: `sudo chown -R www-data:www-data /var/www/mms`
- Ensure correct permissions: `sudo chmod -R 755 /var/www/mms`

## 12. Scaling Considerations

As your application grows, consider:

1. **Database scaling**:

   - Implement MongoDB replication for redundancy
   - Consider sharding for horizontal scaling

2. **Application scaling**:

   - Use PM2 cluster mode: `pm2 start dist/server.js -i max`
   - Set up a load balancer in front of multiple application servers

3. **Caching**:
   - Implement Redis for session storage and caching
   - Configure Nginx caching for static assets

## 13. Performance Optimization

1. **Frontend optimization**:

   - Enable Gzip compression in Nginx
   - Set up proper caching headers for static assets
   - Consider a CDN for static content

2. **Backend optimization**:
   - Implement database query optimization
   - Add appropriate indexes to MongoDB collections
   - Use server-side caching where appropriate

## Conclusion

Your Marks Management System should now be properly set up in a production environment.
