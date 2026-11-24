# Chay ngam: cho website san sang, mo Cloudflare quick tunnel,
# luu link hien tai vao current-link.txt va shortcut tren Desktop.
# File nay duoc Task Scheduler goi khi dang nhap Windows.

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$Cloudflared = Join-Path $env:LOCALAPPDATA "PDF2Office\cloudflared.exe"
$LogDir = Join-Path $ProjectDir "logs"
$LogOut = Join-Path $LogDir "tunnel.out.log"
$LogErr = Join-Path $LogDir "tunnel.err.log"
$LinkFile = Join-Path $ProjectDir "current-link.txt"
$Shortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "PDF2Office Online.url"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path $Cloudflared)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Cloudflared) | Out-Null
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $Cloudflared
}

# Cho may chu noi bo san sang (toi da 90 giay).
for ($i = 0; $i -lt 45; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:5000/api/health"
        if ($r.StatusCode -eq 200) { break }
    } catch { }
    Start-Sleep -Seconds 2
}

# Khong tao trung tunnel neu da co tien trinh khac dang chay.
if (Get-Process -Name cloudflared -ErrorAction SilentlyContinue) { exit 0 }

while ($true) {
    Remove-Item $LogOut, $LogErr -Force -ErrorAction SilentlyContinue

    $proc = Start-Process -FilePath $Cloudflared `
        -ArgumentList "tunnel --url http://127.0.0.1:5000 --no-autoupdate --protocol http2" `
        -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr `
        -PassThru -WindowStyle Hidden

    $url = $null
    for ($i = 0; $i -lt 180; $i++) {
        Start-Sleep -Seconds 1
        $text = ""
        if (Test-Path $LogOut) { $text += [string](Get-Content $LogOut -Raw -ErrorAction SilentlyContinue) }
        if (Test-Path $LogErr) { $text += [string](Get-Content $LogErr -Raw -ErrorAction SilentlyContinue) }
        $m = [regex]::Match($text, "https://[a-z0-9-]+\.trycloudflare\.com")
        if ($m.Success) { $url = $m.Value; break }
        if ($proc.HasExited) { break }
    }

    if ($url) {
        $now = Get-Date -Format "HH:mm dd/MM/yyyy"
        @(
            "PDF2Office - link truy cap tu xa",
            "Cap nhat: $now",
            "",
            $url,
            "",
            "Link chi hoat dong khi may tinh dang bat, co Internet",
            "va khong o che do ngu. Dung chia se link cho nguoi la.",
            "Tat chia se: chay auto-stop.bat",
            "Bat lai:     chay auto-start.bat"
        ) | Set-Content -Path $LinkFile -Encoding UTF8
        Set-Content -Path $Shortcut -Value "[InternetShortcut]`r`nURL=$url`r`n" -Encoding ASCII
    }

    $proc.WaitForExit()
    Start-Sleep -Seconds 5
}
