# DaLines Auto-Watch and Push Script
$folder = $PSScriptRoot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  🎮 DaLines-Site Auto Watcher (Realtime Push)     " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Watching: $folder" -ForegroundColor Yellow
Write-Host "Any saved changes will be auto-pushed to GitHub..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $folder
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true

$script:lastPush = [DateTime]::MinValue

$action = {
    param($source, $event)
    $name = $event.Name
    if ($name -match '(\.git|\.log|auto-push|\.tmp)') { return }
    
    $now = [DateTime]::Now
    if (($now - $script:lastPush).TotalSeconds -lt 5) { return }
    $script:lastPush = $now

    Start-Sleep -Seconds 2
    Write-Host "[*] Change detected ($name) -> Auto-pushing to GitHub..." -ForegroundColor Yellow
    
    Set-Location $PSScriptRoot
    git add -A
    $status = git status --porcelain
    if ($status) {
        $msg = "Auto-update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $msg
        git push origin main
        Write-Host "🎉 Successfully auto-pushed: $msg" -ForegroundColor Green
        Write-Host "⚡ Cloudflare is auto-deploying!" -ForegroundColor Cyan
    }
}

Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Created' -Action $action | Out-Null

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    $watcher.Dispose()
}
