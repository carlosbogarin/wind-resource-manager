@echo off
chcp 65001 > nul
title Wind Resource Manager - Inicializador Completo

echo =====================================================================
echo           WIND RESOURCE MANAGER - INICIALIZADOR COMPLETO
echo =====================================================================
echo.
echo Iniciando Backend Python (FastAPI + DuckDB) em http://127.0.0.1:8000...
start "Wind Resource Manager - Backend API" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo Iniciando Frontend Web (React 19 + Vite) em http://localhost:5173...
start "Wind Resource Manager - Frontend Web" cmd /k "cd frontend && npm.cmd run dev"

timeout /t 2 /nobreak > nul

echo Abrindo navegador...
start http://localhost:5173

echo.
echo Tudo pronto!
echo - Frontend: http://localhost:5173
echo - Backend API: http://127.0.0.1:8000
echo - Documentacao Swagger: http://127.0.0.1:8000/docs
echo.
pause