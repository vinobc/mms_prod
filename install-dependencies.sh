#!/bin/bash

echo "Installing server dependencies..."
cd server
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
cd ..

echo "Dependencies installed successfully!"
echo "You can now run the server with: cd server && npm run dev"