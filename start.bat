@echo off

cd /d %~dp0

echo Building React frontend...
pushd frontend\retina-sight-buddy
call npm install
call npm run build
popd

echo Stopping existing backend on port 8001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo Starting backend server on http://127.0.0.1:8001
start /b "OptiScan Backend" "%~dp0\.venv\Scripts\python.exe" -m uvicorn api:app --host 127.0.0.1 --port 8001

echo Starting frontend UI on http://127.0.0.1:8000
cd /d "%~dp0frontend\retina-sight-buddy"
call npm run dev -- --host 0.0.0.0 --port 8000
