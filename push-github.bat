@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 goto :nogit

if not exist ".git" (
  echo [1/5] Khoi tao Git repository...
  git init -b main >nul
  if errorlevel 1 goto :failed
)

git config user.name >nul 2>nul
if errorlevel 1 (
  set /p GNAME=Nhap ten hien thi tren GitHub: 
  git config user.name "!GNAME!"
)

git config user.email >nul 2>nul
if errorlevel 1 (
  set /p GMAIL=Nhap email GitHub cua ban: 
  git config user.email "!GMAIL!"
)

echo [2/5] Chuan bi tep...
git add -A
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "PDF2Office: chuyen doi PDF sang Word va PowerPoint" >nul
  if errorlevel 1 goto :failed
  echo       Da tao commit moi.
) else (
  echo       Khong co thay doi moi de commit.
)

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if "!BRANCH!"=="" set "BRANCH=main"

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo.
  echo [3/5] Hay tao mot repository TRONG tren https://github.com/new
  echo       Khong tick "Add a README file", khong chon .gitignore hay license.
  echo.
  set /p REPO=Dan URL repo (vi du https://github.com/tenban/pdf2office.git): 
  if "!REPO!"=="" goto :failed
  git remote add origin "!REPO!"
  if errorlevel 1 goto :failed
) else (
  echo [3/5] Da co remote origin.
)

echo [4/5] Kiem tra...
git remote -v

echo.
echo [5/5] Dang day code len GitHub.
echo       Neu trinh duyet mo ra, hay dang nhap GitHub de cap quyen.
echo.
git push -u origin "!BRANCH!"
if errorlevel 1 goto :pushfail

echo.
echo ============================================================
echo  Da day code len GitHub thanh cong (nhanh !BRANCH!).
echo.
echo  Buoc tiep theo - dua website len internet:
echo    Render:  https://render.com  -^> New -^> Blueprint -^> chon repo
echo    Huong dan chi tiet: GITHUB.md va DEPLOY.md
echo ============================================================
echo.
pause
goto :eof

:nogit
echo Chua cai Git. Cai bang lenh sau trong PowerShell roi chay lai file nay:
echo.
echo    winget install --id Git.Git -e --source winget
echo.
echo Sau khi cai, dong cua so nay va mo lai (de nhan PATH moi).
pause
goto :eof

:pushfail
echo.
echo Day code that bai. Mot so nguyen nhan thuong gap:
echo   - Chua dang nhap GitHub: chay lai va dang nhap trong cua so hien ra.
echo   - Repo tren GitHub da co commit: chay "git pull --rebase origin !BRANCH!" roi thu lai.
echo   - Sai URL repo: kiem tra bang "git remote -v".
echo.
pause
goto :eof

:failed
echo.
echo Da xay ra loi. Xem thong bao phia tren de biet chi tiet.
pause
