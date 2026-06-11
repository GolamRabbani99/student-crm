@echo off
title EduFlow CRM Launcher
echo ==========================================
echo   EduFlow CRM - Student Recruitment
echo ==========================================
echo.

cd /d "%~dp0backend"
if not exist node_modules (
  echo First run: installing backend packages, please wait...
  call npm install
)

cd /d "%~dp0frontend"
if not exist node_modules (
  echo First run: installing frontend packages, please wait...
  call npm install
)

echo Starting the CRM...
start "EduFlow CRM - Backend (keep open)" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "EduFlow CRM - Frontend (keep open)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for servers to start...
timeout /t 8 /nobreak >nul
start http://localhost:4500

echo.
echo The CRM is now open in your browser at http://localhost:4500
echo Two black windows opened - keep them open while using the CRM.
echo Close this window whenever you like.
pause
