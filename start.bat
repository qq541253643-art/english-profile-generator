@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 英文账号资料生成器

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js。请先安装 Node.js 22 LTS 或更高版本。
  echo https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] 首次运行，正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

echo [2/2] 正在启动，浏览器将自动打开...
call npm run start
pause
