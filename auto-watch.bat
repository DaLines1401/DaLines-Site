@echo off
chcp 65001 >nul
title DaLines Realtime Auto-Deploy Watcher
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0auto-watch.ps1"
pause
