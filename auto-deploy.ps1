[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DaLines Instant Auto Deploy ⚡"

$folder = $PSScriptRoot
Set-Location $folder

Clear-Host
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   🎮 DaLines-Site Instant Auto Deploy ⚡              " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[*] กำลังตรวจจับไฟล์และอัปเดต..." -ForegroundColor Yellow
git add -A

$status = git status --porcelain 2>$null
$unpushed = git rev-list '@{u}..HEAD' --count 2>$null

if (-not $status -and ($unpushed -eq $null -or [int]$unpushed -eq 0)) {
    Write-Host "[i] ทุกอย่างเป็นปัจจุบันแล้ว ไม่มีไฟล์ใหม่ที่ต้อง Deploy!" -ForegroundColor Green
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($status) {
        $msg = "Auto Deploy: $timestamp"
        Write-Host "[*] กำลังบันทึกการเปลี่ยนแปลง: $msg" -ForegroundColor DarkCyan
        git commit -m $msg | Out-Null
    }
    
    Write-Host "[*] กำลัง Push ขึ้น GitHub -> Cloudflare..." -ForegroundColor Cyan
    $push = git push origin main 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "======================================================" -ForegroundColor Green
        Write-Host "   🎉 AUTO DEPLOY สำเร็จเรียบร้อย!                    " -ForegroundColor Green
        Write-Host "   ⚡ Cloudflare กำลังอัปเดตขึ้นหน้าเว็บจริงทันที!       " -ForegroundColor Yellow
        Write-Host "   🌐 https://dalines-site.dalines.workers.dev/       " -ForegroundColor Cyan
        Write-Host "======================================================" -ForegroundColor Green
    } else {
        Write-Host "[!] Push ไม่สำเร็จ: $push" -ForegroundColor Red
    }
}

Write-Host "`nหน้าต่างนี้จะปิดอัตโนมัติใน 3 วินาที..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3
