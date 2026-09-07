@echo off
chcp 65001 > nul
title Wind Resource Manager - Inicializador Completo

echo =====================================================================
echo           WIND RESOURCE MANAGER - INICIALIZADOR COMPLETO
echo =====================================================================
cd /d "%~dp0"

echo Iniciando Backend Python (FastAPI + DuckDB) em http://127.0.0.1:8000...
start "Wind Resource Manager - Backend API" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload"

ping 127.0.0.1 -n 4 > nul

echo Iniciando Frontend Web (React 19 + Vite) em http://localhost:5173...
start "Wind Resource Manager - Frontend Web" cmd /k "cd frontend && npm.cmd run dev"

ping 127.0.0.1 -n 3 > nul

echo Abrindo navegador...
start http://localhost:5173

echo.
echo =====================================================================
echo    SISTEMA INICIADO COM SUCESSO!
echo =====================================================================
echo - Frontend: http://localhost:5173
echo - Backend API: http://127.0.0.1:8000
echo - Documentacao Swagger: http://127.0.0.1:8000/docs
echo.
echo Para fechar tudo com 1 clique, execute: Fechar_Wind_Resource_Manager.bat
echo =====================================================================
echo.
pause