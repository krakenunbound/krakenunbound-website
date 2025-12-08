@echo off
echo ========================================
echo  Ad Astra Sysop Station
echo  Launching monitoring dashboard...
echo ========================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting Sysop Station...
call npm start

pause
