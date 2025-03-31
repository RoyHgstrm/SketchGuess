#!/bin/bash

# SketchGuess Deployment Script

# Help message
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "SketchGuess Deployment Script"
  echo ""
  echo "Usage: ./deploy.sh [options]"
  echo ""
  echo "Options:"
  echo "  --build       Build the application before deployment"
  echo "  --restart     Restart existing services"
  echo "  --help, -h    Show this help message"
  exit 0
fi

# Set up environment
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env
  echo "Please edit .env file with your configuration"
fi

# Build if requested
if [ "$1" == "--build" ]; then
  echo "Building application..."
  npm ci
  npm run build
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "PM2 is not installed. Installing globally..."
  npm install -g pm2
fi

# Restart services if requested
if [ "$1" == "--restart" ]; then
  echo "Restarting services..."
  pm2 restart sketch-guess-frontend sketch-guess-websocket
  pm2 save
  echo "Services restarted successfully!"
  exit 0
fi

# Deploy application
echo "Deploying SketchGuess..."

# Stop existing processes if they exist
pm2 stop sketch-guess-frontend sketch-guess-websocket 2>/dev/null || true

# Start Remix server
echo "Starting web server..."
pm2 start npm --name "sketch-guess-frontend" -- run start:prod

# Start WebSocket server
echo "Starting WebSocket server..."
pm2 start npm --name "sketch-guess-websocket" -- run websocket:prod

# Save PM2 configuration
pm2 save

echo ""
echo "Deployment complete! SketchGuess is now running."
echo "Web server: http://localhost:3000"
echo "WebSocket server: ws://localhost:8080"
echo ""
echo "To monitor processes, run: pm2 monit"
echo "To view logs, run: pm2 logs" 