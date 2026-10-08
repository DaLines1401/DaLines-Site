@echo off
chcp 65001 >nul
title DaLines-Site Auto Push
echo ===================================================
echo   🎮 DaLines-Site Auto Push to GitHub
echo ===================================================
echo.

cd /d "%~dp0"

echo [*] Checking git status...
git status --short

:: Check if working directory is clean
git diff --quiet && git diff --cached --quiet
if %errorlevel% equ 0 (
    git status --porcelain | findstr "^??" >nul
    if errorlevel 1 (
        :: Check if there are local unpushed commits
        for /f %%i in ('git rev-list @{u}..HEAD --count 2^>nul') do (
            if "%%i"=="0" (
                echo [i] Everything is up to date! No changes to push.
                goto done
            ) else (
                echo [*] Found %%i unpushed commit(s). Pushing to GitHub...
                goto do_push
            )
        )
    )
)

echo.
set /p commit_msg="[?] Enter commit message (Press Enter for auto timestamp): "

if "%commit_msg%"=="" (
    set commit_msg=Update site: %date% %time%
)

echo.
echo [*] Adding files...
git add -A

echo [*] Committing: "%commit_msg%"...
git commit -m "%commit_msg%"

:do_push
echo.
echo [*] Pushing to GitHub (origin main)...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo   🎉 Push to GitHub successfully!
    echo   ⚡ Cloudflare is now auto-deploying your site!
    echo   🌐 Live at: https://dalines-site.dalines.workers.dev/
    echo ===================================================
) else (
    echo.
    echo [!] Push failed.
    echo Tip: You can also open GitHub Desktop to push anytime!
)

:done
echo.
pause
