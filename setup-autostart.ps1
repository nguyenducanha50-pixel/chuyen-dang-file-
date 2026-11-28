# Tao 2 tac vu Windows tu khoi dong cung may:
#   - PDF2Office Server : chay Flask khi dang nhap
#   - PDF2Office Tunnel : tao link cong khai va cap nhat current-link.txt
# Ca hai chay bang pythonw.exe nen khong hien cua so console.
# Chay lai file nay bat cu luc nao de bat lai sau khi auto-stop.

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$Pythonw = Join-Path $ProjectDir ".venv\Scripts\pythonw.exe"
$TunnelScript = Join-Path $ProjectDir "tunnel_service.py"
$LinkFile = Join-Path $ProjectDir "current-link.txt"
$User = "$env:USERDOMAIN\$env:USERNAME"

if (-not (Test-Path $Pythonw)) {
    throw "Chua co .venv. Hay chay start.bat mot lan truoc."
}
if (-not (Test-Path $TunnelScript)) {
    throw "Khong tim thay tunnel_service.py."
}

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $User
$principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

# Don sach phien cu de lan chay nay chac chan tao link moi.
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and ($_.CommandLine -like '*app.py*' -or $_.CommandLine -like '*tunnel_service.py*') } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
foreach ($name in @("PDF2Office Server", "PDF2Office Tunnel")) {
    $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($task -and $task.State -eq "Running") { Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

$serverAction = New-ScheduledTaskAction -Execute $Pythonw -Argument "app.py" -WorkingDirectory $ProjectDir
Register-ScheduledTask -TaskName "PDF2Office Server" -Action $serverAction -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

$tunnelAction = New-ScheduledTaskAction -Execute $Pythonw -Argument "tunnel_service.py" -WorkingDirectory $ProjectDir
Register-ScheduledTask -TaskName "PDF2Office Tunnel" -Action $tunnelAction -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

Enable-ScheduledTask -TaskName "PDF2Office Server" | Out-Null
Enable-ScheduledTask -TaskName "PDF2Office Tunnel" | Out-Null

# Chi xoa link cu khi khong con tunnel nao dang chay.
if (-not (Get-Process -Name cloudflared -ErrorAction SilentlyContinue)) {
    Remove-Item $LinkFile -Force -ErrorAction SilentlyContinue
}

Start-ScheduledTask -TaskName "PDF2Office Server"
Start-ScheduledTask -TaskName "PDF2Office Tunnel"

Write-Host "Da cai dat tu khoi dong cung Windows."
