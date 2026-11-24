@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "PY=py"
where py >nul 2>nul || set "PY=python"

if not exist ".venv\Scripts\python.exe" (
  echo [1/3] Đang tạo môi trường Python...
  %PY% -m venv .venv
  if errorlevel 1 goto :failed

  echo [2/3] Đang cài thư viện, lần đầu có thể mất 1-3 phút...
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 goto :failed
)

echo [3/3] Đang khởi động PDF2Office tại http://127.0.0.1:5000
set "PDF2OFFICE_OPEN=1"
".venv\Scripts\python.exe" app.py
goto :eof

:failed
echo.
echo Cài đặt thất bại. Vui lòng kiểm tra kết nối mạng và Python 3.9+ rồi thử lại.
pause
