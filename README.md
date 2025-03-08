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

## 💻 Development Environment Setup

### Prerequisites

- Node.js (v22.14.0)
- npm (10.9.2)
- MongoDB (7.0.17)
- Git (2.34.1)

### Local Setup

1. Clone the repository

   ```bash
   git clone https://github.com/vinobc/mms.git
   cd mms
   ```

2. Install server dependencies

   ```bash
   cd server
   npm install
   ```

3. Set up environment variables

   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env with your configuration
   nano .env
   ```

4. Start the server in development mode

   ```bash
   npm run dev
   ```

5. Install client dependencies and start development server

   ```bash
   cd ../client
   npm install
   npm run dev
   ```

6. The application should now be running at http://localhost:5173/ with the API server at http://localhost:3000/

## 🌎 Production Environment

The production environment is hosted on Google Cloud Platform (GCP) using:

- Ubuntu 22.04 VM instance (e2-medium)
- Nginx for static file serving and reverse proxy
- PM2 for Node.js process management
- MongoDB for database

### Production Setup

Complete setup instructions can be found in the [Production Setup Guide](PRODUCTION_SETUP.md)

## 🔄 Development Workflow

We follow a structured workflow to ensure smooth development and deployment:

### Branch Strategy

- `main`: Main development branch
- `production`: Production-ready code deployed to the live server

### Development Process

1. **Develop locally** on your main branch

   ```bash
   # Make sure you're on main branch
   git checkout main

   # Create a feature branch (optional)
   git checkout -b feature/new-feature

   # Make your changes, test locally
   # ...

   # Commit your changes
   git add .
   git commit -m "Add new feature"

   # Merge back to main if using feature branch
   git checkout main
   git merge feature/new-feature
   ```

2. **Push changes** to GitHub (main branch)

   ```bash
   git push origin main
   ```

3. **Merge to production** branch on GitHub

   - Through GitHub Pull Request (recommended):

     1. Go to GitHub repository
     2. Create new Pull Request from `main` to `production`
     3. Review changes and merge

   - Or manually:
     ```bash
     # On your local machine
     git checkout production
     git pull origin production  # Get latest production
     git merge main             # Merge main into production
     git push origin production # Push to GitHub
     ```

4. **Deploy to production**:

   ```bash
   # SSH into your GCP server
   ssh <user_name>@<ip>

   # Run the deployment script
   ~/mms/deploy.sh
   ```

## 📝 Deployment Script

The `deploy.sh` script automates the deployment process:

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
