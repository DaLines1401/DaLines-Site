@echo off
title DaLines Instant Auto Deploy
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0auto-deploy.ps1"
