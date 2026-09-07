@echo off
chcp 65001 > nul
title Wind Resource Manager - Frontend Web

echo =====================================================================
echo           WIND RESOURCE MANAGER - FRONTEND WEB (VITE)
echo =====================================================================
cd /d "%~dp0..\..\frontend"
echo Iniciando servidor Vite em http://localhost:5173...
echo.
npm.cmd run dev
pause