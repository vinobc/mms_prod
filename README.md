# Marks Management System (MMS)

A comprehensive web application for managing student marks and course assessments. Built with MERN.

## 🌟 Features

- User authentication with role-based access control (Faculty/Admin)
- Course management
- Student enrollment and management
- Score entry and management for different assessment components
- Score reporting and visualization
- Responsive design for desktop and mobile devices

## 🏗️ Architecture

- **Frontend**: React with Material UI
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT-based authentication
- **Deployment**: Nginx as reverse proxy, PM2 for process management

## 🚀 Live Demo

The application is deployed at: http://34.93.175.190/

## 🌎 Production Environment

The production environment is hosted on Google Cloud Platform (GCP) using:

- Ubuntu 22.04 VM instance (e2-medium)
- Nginx for static file serving and reverse proxy
- PM2 for Node.js process management
- MongoDB for database

## 📝 Deployment Script

The `deploy.sh` script automates the deployment process:

```bash
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
```

## 🔧 Configuration

### Server Configuration (.env)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mms
JWT_SECRET=your_jwt_secret
ADMIN_SECRET_KEY=admin_creation_key
```

## 🧰 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**

   - Check if MongoDB service is running: `sudo systemctl status mongod`
   - Verify connection string in `.env` file

2. **API Connection Issues**

   - In development: Check if server is running on correct port
   - In production: Check Nginx configuration and proxy settings

3. **Build Failures**
   - Check for sufficient memory (at least e2-medium VM recommended)
   - Verify Node.js and npm versions
   - Clear node_modules and reinstall dependencies

### Logs

- **Client logs**: Browser console
- **Server logs**: `cd ~/mms/server && pm2 logs mms-server`
- **Nginx logs**: `sudo tail -f /var/log/nginx/access.log` and `sudo tail -f /var/log/nginx/error.log`

## 👥 Contributors

- Vinob Chander R, AUB

## 📄 License

- # MIT
