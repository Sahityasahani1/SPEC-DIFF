@echo off
echo ========================================================
echo Starting SmartPick FastAPI Backend (Port 8000)...
echo ========================================================
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
