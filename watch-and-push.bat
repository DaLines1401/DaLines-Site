@echo off
title DaLines Auto Watch and Push
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0watch-and-push.ps1"
pause
