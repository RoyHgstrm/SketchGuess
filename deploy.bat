@echo off
echo =================================================
echo            SketchGuess Deployment Script
echo =================================================
echo.

:: Check for help argument
if "%1"=="--help" goto :help
if "%1"=="-h" goto :help

:: Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
  echo PM2 is not installed. Installing globally...
  call npm install -g pm2
)

:: Handle different deployment options
if "%1"=="--build" goto :build
if "%1"=="--restart" goto :restart

goto :deploy

:help
echo Usage: deploy.bat [options]
echo.
echo Options:
echo   --build       Build the application before deployment
echo   --restart     Restart existing services
echo   --help, -h    Show this help message
echo.
goto :eof

:build
echo Building application...
call npm ci
call npm run build
goto :deploy

:restart
echo Restarting services...
call pm2 restart sketch-guess-frontend sketch-guess-websocket
call pm2 save
echo Services restarted successfully!
goto :eof

:deploy
echo Deploying SketchGuess...

:: Stop existing processes if they exist
call pm2 stop sketch-guess-frontend sketch-guess-websocket >nul 2>nul

:: Start Remix server
echo Starting web server...
call pm2 start npm --name "sketch-guess-frontend" -- run start:prod

:: Start WebSocket server
echo Starting WebSocket server...
call pm2 start npm --name "sketch-guess-websocket" -- run websocket:prod

:: Save PM2 configuration
call pm2 save

echo.
echo Deployment complete! SketchGuess is now running.
echo Web server: http://localhost:3000
echo WebSocket server: ws://localhost:8080
echo.
echo To monitor processes, run: pm2 monit
echo To view logs, run: pm2 logs 