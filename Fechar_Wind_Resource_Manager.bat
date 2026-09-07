@echo off
chcp 65001 > nul
title Wind Resource Manager - Encerrar Servicos

echo =====================================================================
echo           WIND RESOURCE MANAGER - ENCERRAR APLICACAO
echo =====================================================================
echo.
echo Encerrando servicos do Backend (porta 8000) e Frontend (porta 5173)...
echo.

:: 1. Finaliza processos escutando na porta 8000 (Backend Python / Uvicorn)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [OK] Finalizando processo do Backend PID %%a
    taskkill /f /pid %%a >nul 2>&1
)

:: 2. Finaliza processos escutando na porta 5173 (Frontend Node / Vite)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [OK] Finalizando processo do Frontend PID %%a
    taskkill /f /pid %%a >nul 2>&1
)

:: 3. Fecha janelas do terminal CMD abertas pelo inicializador
taskkill /fi "WINDOWTITLE eq Wind Resource Manager - Backend API*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq Wind Resource Manager - Frontend Web*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq Wind Resource Manager - Inicializador Completo*" /f >nul 2>&1

echo.
echo =====================================================================
echo    Todos os servicos do Wind Resource Manager foram encerrados!
echo =====================================================================
echo.
echo Esta janela sera fechada automaticamente em 3 segundos...
ping 127.0.0.1 -n 3 > nul
exit
