@echo off
chcp 65001 > nul
title Wind Resource Manager - Backend API

echo =====================================================================
echo            WIND RESOURCE MANAGER - BACKEND API (FASTAPI)
echo =====================================================================
echo.
echo Ativando ambiente virtual .venv...
call .venv\Scripts\activate.bat
echo.
echo Iniciando servidor Uvicorn em http://127.0.0.1:8000...
echo Swagger UI disponivel em: http://127.0.0.1:8000/docs
echo.
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
pause