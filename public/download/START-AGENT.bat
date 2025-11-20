@echo off
title SAK WhatsApp Desktop Agent
color 0A

:: Change to the directory where this script is located
cd /d "%~dp0"

:: Clear screen and show info
cls
echo ========================================================================
echo.
echo          SAK WhatsApp Desktop Agent - FREE Broadcast System
echo.
echo ========================================================================
echo.
echo [i] What this does:
echo     - Connects your WhatsApp to the cloud AI assistant
echo     - Enables FREE broadcasts through your local WhatsApp
echo     - No API costs - unlimited messages!
echo.
echo ========================================================================
echo.
echo [*] FIRST TIME SETUP:
echo     1. A QR code will appear below
echo     2. Open WhatsApp on your phone
echo     3. Go to: Settings ^> Linked Devices ^> Link a Device
echo     4. Scan the QR code that appears below
echo     5. Wait for "WhatsApp Web connected successfully!"
echo.
echo [*] ALREADY SETUP?
echo     - Agent will reconnect automatically (no QR needed)
echo     - Your WhatsApp session is saved locally
echo.
echo ========================================================================
echo.
echo [!] IMPORTANT:
echo     - Keep this window OPEN while using broadcasts
echo     - Dashboard will show "Desktop Agent Online (FREE!)"
echo     - To stop: Press Ctrl+C
echo.
echo ========================================================================
echo.
echo Starting agent...
echo.

:: Run the agent (keeps window open)
sak-whatsapp-agent-windows.exe

echo.
echo.
echo ========================================================================
echo Agent stopped.
echo Press any key to exit...
pause >nul
