@echo off
color 0B
echo =========================================================
echo 🚀 Launching AI Interview Suite
echo =========================================================

:: Ensure we use the proper Node.js v20 included in this folder
set PATH=%CD%\.nodelocal;%PATH%

echo.
echo [1/2] Starting Backend API Server...
cd backend
start "Backend Server (Port 5000)" cmd /k "npm install && node server.js"
cd ..

echo.
echo [2/2] Starting Frontend Next.js Server...
echo ⚠️ PLEASE DO NOT CLOSE THIS WINDOW ⚠️
echo.

:: Bind to 127.0.0.1 to avoid IPv6 "refused to connect" bugs in Node 18+
npx next dev -H 127.0.0.1 -p 3000

echo.
echo Server unexpectedly stopped.
pause
