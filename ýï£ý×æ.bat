@echo off
chcp 65001 >nul
title 나라장터 IT 입찰공고 검색기
cd /d "%~dp0"

REM Node 경로 보정 (PATH에 없을 때 대비)
where node >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않습니다.
  echo  https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  echo  또는 PowerShell에서: winget install OpenJS.NodeJS.LTS
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 최초 실행 - 필요한 구성요소를 설치합니다. 잠시만 기다려 주세요...
  call npm install --omit=dev
)

if not exist "build\web\index.js" (
  echo 빌드 중...
  call npm run build
)

echo 검색기를 실행합니다. 브라우저가 자동으로 열립니다.
node build\web\index.js
pause
