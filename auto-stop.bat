@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo Dang tat PDF2Office...
schtasks /End /TN "PDF2Office Tunnel" >nul 2>nul
schtasks /Change /TN "PDF2Office Tunnel" /DISABLE >nul 2>nul
schtasks /End /TN "PDF2Office Server" >nul 2>nul
schtasks /Change /TN "PDF2Office Server" /DISABLE >nul 2>nul

powershell -NoProfile -Command "Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force; Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -like '*app.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

del /q "current-link.txt" >nul 2>nul
echo.
echo Da tat website va link cong khai.
echo Chay auto-start.bat de bat lai bat cu luc nao.
echo.
pause
