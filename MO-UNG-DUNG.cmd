@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Lam Thao An Gi - Mo ban mau
where node >nul 2>nul
if errorlevel 1 (
  echo Ban can cai Node.js LTS tu https://nodejs.org truoc.
  echo Sau khi cai xong, dong cua so nay va mo lai file.
  pause
  exit /b 1
)
echo Dang cai cac thanh phan. Lan dau co the mat vai phut...
call npm ci
if errorlevel 1 (
  echo Khong cai duoc. Hay chup anh cua so nay gui lai trong chat.
  pause
  exit /b 1
)
echo Giu cua so nay mo. Dung Camera iPhone quet ma QR hien ben duoi.
call npm start -- --go
pause
