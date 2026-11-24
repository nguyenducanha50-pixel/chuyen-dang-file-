@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "URL=http://127.0.0.1:5000"
set "CF=%LOCALAPPDATA%\PDF2Office\cloudflared.exe"

powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 '%URL%/api/health').StatusCode } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo May chu chua chay. Hay mo start.bat truoc, sau do chay lai file nay.
  pause
  exit /b 1
)

if not exist "%CF%" (
  echo Dang tai cloudflared lan dau...
  if not exist "%LOCALAPPDATA%\PDF2Office" mkdir "%LOCALAPPDATA%\PDF2Office"
  powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%CF%'"
  if errorlevel 1 goto :failed
)

powershell -NoProfile -Command "if (Get-Process cloudflared -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo.
  echo Link cong khai dang chay san:
  echo.
  if exist "current-link.txt" type "current-link.txt"
  echo.
  echo Muon tao link moi, chay auto-stop.bat truoc.
  pause
  exit /b 0
)

echo.
echo ============================================================
echo  Dang tao link cong khai (chi can mang, khong can mo cong modem).
echo  Cho 5-10 giay, link https://....trycloudflare.com se hien ra.
echo  Link nay chi song khi cua so nay con mo va may con bat.
echo  Nhan Ctrl+C de dung chia se.
echo ============================================================
echo.
"%CF%" tunnel --url %URL% --no-autoupdate --protocol http2
goto :eof

:failed
echo.
echo Tai cloudflared that bai. Kiem tra ket noi mang roi thu lai.
echo Hoac cai bang: winget install --id Cloudflare.cloudflared -e
pause
