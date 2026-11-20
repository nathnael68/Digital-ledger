@echo off
TITLE Delgone Digital Sales Ledger - Local Launcher
COLOR 0A

echo =====================================================================
echo   DELGONE TRADING PLC - DIGITAL SALES LEDGER
echo   Starting Backend API, Frontend Server, and Cloudflare Tunnel...
echo =====================================================================

cd /d "%~dp0"

echo [1/3] Starting Backend API Server (Port 8000)...
start "Delgone Backend API" cmd /k "backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

echo [2/3] Starting Frontend PWA Server (Port 5173)...
start "Delgone Frontend PWA" cmd /k "npm --prefix frontend run dev"

timeout /t 3 >nul

echo [3/3] Starting Cloudflare HTTPS Tunnel...
start "Delgone Cloudflare Tunnel" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173"

echo.
echo All services have been launched in separate windows!
echo Look at the "Delgone Cloudflare Tunnel" window to copy your https://*.trycloudflare.com link.
echo Press any key to exit this launcher window...
pause >nul
