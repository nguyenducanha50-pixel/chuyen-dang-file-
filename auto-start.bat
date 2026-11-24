@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo Dang cai dat tu khoi dong cung Windows...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-autostart.ps1"
if errorlevel 1 goto :failed

echo.
echo Dang cho link cong khai (10-30 giay)...
powershell -NoProfile -Command "$p='current-link.txt'; for($i=0;$i -lt 60;$i++){ if(Test-Path $p){ $u=(Select-String -Path $p -Pattern 'https://\S+trycloudflare\.com').Matches.Value; if($u){ break } }; Start-Sleep -Seconds 1 }"

echo.
if exist "current-link.txt" (
  echo ============================================================
  type "current-link.txt"
  echo ============================================================
  echo Shortcut "PDF2Office Online" tren Desktop cung mo link nay.
  echo Link tu cap nhat moi khi may khoi dong lai.
) else (
  echo Chua lay duoc link. Xem logs\tunnel.err.log de biet loi.
)
echo.
pause
exit /b 0

:failed
echo.
echo Cai dat that bai. Xem thong bao loi phia tren.
pause
