@echo off
chcp 65001 >nul
title DaLines-Site Auto Push
echo ===================================================
echo   🎮 DaLines-Site Auto Push to GitHub
echo ===================================================
echo.

cd /d "%~dp0"

echo [*] Checking git changes...
git status --short

git diff --quiet && git diff --cached --quiet
if %errorlevel% equ 0 (
    git status --porcelain | findstr "^??" >nul
    if errorlevel 1 (
        echo.
        echo [i] No changes detected. Everything is up to date!
        echo.
        goto done
    )
)

echo.
set /p commit_msg="[?] Enter commit message (Press Enter for auto timestamp): "

if "%commit_msg%"=="" (
    for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set mydate=%%c-%%a-%%b
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a:%%b
    set commit_msg=Update site: %date% %time%
)

echo.
echo [*] Adding files to staging...
git add -A

echo [*] Committing: "%commit_msg%"...
git commit -m "%commit_msg%"

echo [*] Pushing to GitHub (origin main)...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   🎉 Push to GitHub successfully!
    echo   ⚡ Cloudflare is now auto-deploying your site!
    echo   🌐 Live at: https://pages.dalines.workers.dev/
    echo ===================================================
) else (
    echo.
    echo [!] Push failed. Please check your internet or git login.
)

:done
echo.
pause
