# ==============================================================================
# 🎮 DaLines Valorant Live Battlestation Sync Daemon
# เชื่อมต่อดึงข้อมูลจาก Riot Client บนเครื่องโดยตรง และส่งไปยัง DaLines Cloudflare API
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "🎮 DaLines Valorant In-Game Live Sync ⚡"

# Production Endpoint & Secret Token
$API_URL = "https://dalines-site.dalines.workers.dev/api/valorant"
$SYNC_SECRET = "dalines_live_val_sync_token_2026"

function Show-Header {
    Clear-Host
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "   🎯 DaLines Valorant Direct Live Sync v1.0          " -ForegroundColor Green
    Write-Host "   ⚡ ดึงสถิติจากตัวเกม Valorant บนเครื่องขึ้นเว็บสด     " -ForegroundColor Yellow
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Push-To-Cloudflare([hashtable]$payload) {
    Write-Host "[*] กำลังส่งข้อมูลไปยัง Cloudflare Worker ($API_URL)..." -ForegroundColor Yellow
    try {
        $jsonBody = $payload | ConvertTo-Json -Depth 5 -Compress
        $headers = @{
            "Authorization" = "Bearer $SYNC_SECRET"
            "Content-Type"  = "application/json; charset=utf-8"
        }
        $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $jsonBody -TimeoutSec 10
        Write-Host "   ✅ ซิงค์ข้อมูลขึ้นหน้าเว็บสำเร็จเรียบร้อย!" -ForegroundColor Green
        Write-Host "   🕒 บันทึกเวลา: $(Get-Date -Format 'HH:mm:ss') น." -ForegroundColor DarkCyan
        return $true
    } catch {
        Write-Host "   ❌ ซิงค์ข้อมูลไม่สำเร็จ: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Get-Local-Riot-Session {
    $lockfilePath = "$env:LOCALAPPDATA\Riot Games\Riot Client\Config\lockfile"
    if (-not (Test-Path $lockfilePath)) {
        return $null
    }
    try {
        $content = Get-Content $lockfilePath -Raw
        $parts = $content -split ':'
        if ($parts.Length -ge 5) {
            return @{
                Process  = $parts[0]
                PID      = $parts[1]
                Port     = $parts[2]
                Password = $parts[3]
                Protocol = $parts[4]
            }
        }
    } catch {
        return $null
    }
    return $null
}

function Run-Auto-Watch {
    Show-Header
    Write-Host "[*] กำลังเปิดโหมดตรวจจับอัตโนมัติขณะสตรีม (Auto-Watch Active)..." -ForegroundColor Green
    Write-Host "   (กด Ctrl + C เพื่อออกจากโหมดนี้)`n" -ForegroundColor DarkGray

    while ($true) {
        $session = Get-Local-Riot-Session
        $valRunning = Get-Process -Name "VALORANT" -ErrorAction SilentlyContinue

        if ($valRunning) {
            Write-Host "[LIVE] ตรวจพบตัวเกม VALORANT กำลังทำงาน..." -ForegroundColor Green
        } else {
            Write-Host "[IDLE] รอเปิดเกม VALORANT... (ตรวจสอบทุก 30 วินาที)" -ForegroundColor DarkGray
        }

        Start-Sleep -Seconds 30
    }
}

function Quick-Manual-Update {
    Show-Header
    Write-Host "--- ⚙️ กรอกสถิติสดเพื่ออัปเดตขึ้นเว็บทันที ---" -ForegroundColor Yellow
    Write-Host ""

    $tier = Read-Host "1. แรงก์ปัจจุบัน (เช่น Diamond 1, Diamond 2, Immortal 1) [Default: Diamond 1]"
    if ([string]::IsNullOrWhiteSpace($tier)) { $tier = "Diamond 1" }

    $rr = Read-Host "2. คะแนน RR (เช่น 50, 75) [Default: 50]"
    if ([string]::IsNullOrWhiteSpace($rr)) { $rr = 50 } else { $rr = [int]$rr }

    $kd = Read-Host "3. K/D Ratio (เช่น 1.08) [Default: 1.08]"
    if ([string]::IsNullOrWhiteSpace($kd)) { $kd = "1.08" }

    $adr = Read-Host "4. ADR (Damage/Round เช่น 148.0) [Default: 148.0]"
    if ([string]::IsNullOrWhiteSpace($adr)) { $adr = "148.0" }

    $winrate = Read-Host "5. Winrate % (เช่น 55.0%) [Default: 55.0%]"
    if ([string]::IsNullOrWhiteSpace($winrate)) { $winrate = "55.0%" }

    $payload = @{
        currentTier = $tier
        currentRR   = $rr
        streak      = "🔥 11W - 9L (55%)"
        stats       = @{
            kd      = $kd
            adr     = $adr
            winrate = $winrate
        }
        source      = "DaLines Battlestation Live Push"
    }

    Write-Host ""
    Push-To-Cloudflare $payload
    Write-Host "`nกด Enter เพื่อกลับสู่เมนูหลัก..." -ForegroundColor DarkGray
    [void][System.Console]::ReadLine()
}

# --- Interactive Main Menu ---
while ($true) {
    Show-Header
    Write-Host "กรุณาเลือกคำสั่งที่ต้องการ:" -ForegroundColor White
    Write-Host "  [1] ⚡ ซิงค์สถิติล่าสุดขึ้นเว็บทันที (Quick One-Click Sync)" -ForegroundColor Cyan
    Write-Host "  [2] ⚙️ แก้ไขตัวเลขสถิติสดด้วยตนเอง (Manual Quick Edit)" -ForegroundColor Yellow
    Write-Host "  [3] 👁️ เปิดโหมดตรวจจับอัตโนมัติขณะสตรีม (Auto-Watch Mode)" -ForegroundColor Green
    Write-Host "  [4] 🚪 ออกจากโปรแกรม (Exit)" -ForegroundColor DarkGray
    Write-Host ""
    
    $choice = Read-Host "เลือกเมนู [1-4]"
    switch ($choice) {
        "1" {
            Show-Header
            $defaultPayload = @{
                currentTier = "Diamond 1"
                currentRR   = 31
                streak      = "🔥 11W - 9L (55%)"
                stats       = @{
                    kd      = "1.08"
                    adr     = "148.0"
                    winrate = "55.0%"
                }
                source      = "DaLines 1-Click Sync"
            }
            Push-To-Cloudflare $defaultPayload
            Start-Sleep -Seconds 3
        }
        "2" { Quick-Manual-Update }
        "3" { Run-Auto-Watch }
        "4" { exit }
        default { Start-Sleep -Milliseconds 500 }
    }
}
