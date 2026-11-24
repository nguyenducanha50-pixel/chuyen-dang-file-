# Chạy PDF2Office bằng PowerShell
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "[1/3] Dang tao moi truong Python..." -ForegroundColor Cyan
    if (Get-Command py -ErrorAction SilentlyContinue) {
        & py -m venv .venv
    } else {
        & python -m venv .venv
    }

    Write-Host "[2/3] Dang cai thu vien (lan dau mat 1-3 phut)..." -ForegroundColor Cyan
    & $python -m pip install --upgrade pip
    & $python -m pip install -r requirements.txt
}

Write-Host "[3/3] Dang khoi dong PDF2Office tai http://127.0.0.1:5000" -ForegroundColor Green
$env:PDF2OFFICE_OPEN = "1"
& $python app.py
