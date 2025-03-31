@echo off
echo Starting the SketchGuess servers...
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

echo Starting the WebSocket server...
:: Start the WebSocket server in a new terminal with error handling
start cmd /k "title SketchGuess WebSocket Server && npm run websocket || (echo WebSocket server crashed! && pause)"

echo Starting the web server...
:: Start the dev server in a new terminal with error handling
start cmd /k "title SketchGuess Web Server && npm run dev || (echo Web server crashed! && pause)"

echo.
echo Servers started successfully!
echo.
echo Access the application at http://localhost:3000
echo.
echo Keep both terminal windows open while playing.
echo If either server crashes, you may need to restart both servers.
echo.
pause 