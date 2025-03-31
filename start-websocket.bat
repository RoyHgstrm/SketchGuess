@echo off
echo ================================================
echo SketchGuess WebSocket Server
echo ================================================
echo This server will accept connections from any origin/device on your network.
echo Keep this window open while playing! Closing it will disconnect all players.
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

:: Check if npm packages are installed
if not exist "node_modules" (
  echo Node modules not found. Installing packages...
  call npm install
  if %errorlevel% neq 0 (
    echo Error: Failed to install npm packages.
    echo Please run 'npm install' manually and try again.
    echo.
    pause
    exit /b 1
  )
)

:start_server
echo Starting the WebSocket server...
echo.

:: Start the WebSocket server with automatic restart
call npm run websocket
set EXIT_CODE=%errorlevel%

if %EXIT_CODE% neq 0 (
  echo.
  echo The WebSocket server crashed with exit code %EXIT_CODE%.
  echo.
  
  choice /C YN /M "Do you want to restart the server?"
  if %errorlevel% equ 1 (
    echo.
    echo Restarting the WebSocket server...
    goto start_server
  )
)

echo.
echo The WebSocket server has stopped.
echo Press any key to exit...
pause 