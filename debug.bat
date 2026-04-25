@echo off
echo ==========================================
echo Starting Diagnostic Tool...
echo ==========================================
echo This will test the project and save errors to debug_log.txt
echo Please wait about 30 seconds...

set PATH=%CD%\.nodelocal;%PATH%

echo Testing Backend... > debug_log.txt
cd backend
call npm install >> ..\debug_log.txt 2>&1
cd ..

echo. >> debug_log.txt
echo Testing Frontend Build (to catch hidden errors)... >> debug_log.txt
call npx next build >> debug_log.txt 2>&1

echo. >> debug_log.txt
echo Starting Next.js Dev Server Verification... >> debug_log.txt
:: 
start "Frontend Test" cmd /c "set PATH=%CD%\.nodelocal;%PATH% && npx next dev > temp_frontend.txt 2>&1"

echo ==========================================
echo Finished! Please go back and tell Antigravity "Done!"
echo ==========================================
timeout /t 5
