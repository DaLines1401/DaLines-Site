@echo off
chcp 65001 >nul
title DaLines Valorant Live Battlestation Sync
cls
echo [*] Launching DaLines Valorant Live Sync...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0tools\val-sync.ps1"
pause
