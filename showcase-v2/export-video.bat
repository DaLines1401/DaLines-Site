@echo off
chcp 65001 >nul
title DaLines Showcase V2 - 15s 1080p 60FPS Video Renderer

echo ======================================================================
echo    🎮 DALINES SHOWCASE V2 // 15-SECOND 60 FPS VIDEO RENDERER
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Synthesizing Cyber Electronic Soundtrack (audio.wav)...
node synth_audio.js
if errorlevel 1 (
    echo [ERROR] Audio synthesis failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Rendering 900 Frames and Encoding with FFmpeg...
node render.js
if errorlevel 1 (
    echo [ERROR] Frame rendering or FFmpeg encoding failed!
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo    ✅ SUCCESS! Video exported to: dalines_showcase_15s.mp4
echo ======================================================================
echo.
pause
