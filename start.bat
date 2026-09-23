@echo off
chcp 65001 >nul
title Quan Ly Vat Tu Thi Cong

echo ================================================
echo   HE THONG QUAN LY VAT TU THI CONG
echo   CONG TY CP DTXD GIAO THONG PHUONG THANH
echo ================================================
echo.

:: Khởi động Backend FastAPI
echo [1/2] Khoi dong Backend API (cong 8000)...
start "QLVT-Backend" /MIN cmd /c "cd /d C:\QLVT\app\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: Khởi động Frontend
echo [2/2] Khoi dong Frontend (cong 5173)...
start "QLVT-Frontend" /MIN cmd /c "cd /d C:\QLVT\app\frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ================================================
echo   HE THONG DA KHOI DONG THANH CONG!
echo.
echo   Backend API : http://localhost:8000
echo   API Docs    : http://localhost:8000/docs
echo   Giao dien   : http://localhost:5173
echo ================================================
echo.
echo Dang mo trinh duyet...
start http://localhost:5173
echo.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
