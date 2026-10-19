@echo off
setlocal
cd /d "%~dp0"

echo =========================================================
echo   DALINES MOTION SHOWCASE // EXPORT PIPELINE
echo   1920x1080 @ 60 FPS (12.0 Seconds = 720 Frames)
echo =========================================================
echo.

if not exist node_modules (
    echo [1/3] Installing dependencies...
    call npm.cmd install
) else (
    echo [1/3] Dependencies found.
)

echo.
echo [2/3] Rendering frames with Puppeteer...
node render.js

if errorlevel 1 (
    echo [ERROR] Frame rendering failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Encoding frames into MP4 with FFmpeg...
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    ffmpeg -y -r 60 -i frames/frame_%%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p dalines_showcase.mp4
    echo.
    echo =========================================================
    echo   SUCCESS! Video exported to: dalines_showcase.mp4
    echo =========================================================
) else (
    echo.
    echo [NOTICE] FFmpeg was not found in your PATH.
    echo To compile the video manually, install FFmpeg (e.g. winget install Gyan.FFmpeg)
    echo and run the following command:
    echo.
    echo ffmpeg -r 60 -i frames/frame_%%%%04d.png -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p dalines_showcase.mp4
    echo.
)

pause
