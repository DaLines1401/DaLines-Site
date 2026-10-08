# ===================================================
#   🎮 DaLines-Site Realtime Auto-Deploy Watcher
# ===================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DaLines Realtime Auto-Deploy Watcher 👁️"

$folder = $PSScriptRoot
Set-Location $folder

Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   🎮 DaLines-Site Realtime Auto-Deploy Watcher 👁️     " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "📂 Watching: $folder" -ForegroundColor Yellow
Write-Host "⚡ ทุกครั้งที่คุณบันทึกไฟล์ (Ctrl+S) ระบบจะ Auto-Deploy ทันที!" -ForegroundColor White
Write-Host "🌐 Live Site: https://dalines-site.dalines.workers.dev/" -ForegroundColor Cyan
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "💡 สามารถย่อหน้านี้ลง Taskbar ไว้ได้เลย (กด Ctrl+C เพื่อหยุด)`n" -ForegroundColor DarkGray

$isWorking = $false

while ($true) {
    try {
        # Check if there are modified or untracked files
        $status = git status --porcelain 2>$null
        
        # Also check unpushed commits
        $unpushed = git rev-list '@{u}..HEAD' --count 2>$null

        if (($status -or ($unpushed -and [int]$unpushed -gt 0)) -and -not $isWorking) {
            $isWorking = $true
            
            # Wait 1.5 seconds for file write buffers to settle
            Start-Sleep -Milliseconds 1500
            
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Write-Host "[$timestamp] 🔄 ตรวจพบการเปลี่ยนแปลง! กำลังเตรียม Deploy..." -ForegroundColor Yellow
            
            git add -A
            $currentStatus = git status --porcelain 2>$null
            if ($currentStatus) {
                $commitMsg = "Auto Deploy: $timestamp"
                git commit -m $commitMsg | Out-Null
                Write-Host "[$timestamp] 💾 บันทึกการเปลี่ยนแปลงเรียบร้อย ($commitMsg)" -ForegroundColor DarkCyan
            }
            
            Write-Host "[$timestamp] 🚀 กำลัง Push ขึ้น GitHub -> Cloudflare..." -ForegroundColor Cyan
            $pushResult = git push origin main 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$timestamp] 🎉 AUTO-DEPLOY สำเร็จเรียบร้อย!" -ForegroundColor Green
                Write-Host "[$timestamp] ⚡ หน้าเว็บจริงอัปเดตแล้ว: https://dalines-site.dalines.workers.dev/`n" -ForegroundColor Green
            } else {
                Write-Host "[$timestamp] ⚠️ Push ไม่สำเร็จ: $pushResult" -ForegroundColor Red
            }
            
            $isWorking = $false
        }
    } catch {
        $isWorking = $false
    }
    
    Start-Sleep -Seconds 2
}
