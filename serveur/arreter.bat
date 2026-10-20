@echo off
chcp 65001 >nul
rem Arrete le serveur YT Telechargeur qui tourne en arriere-plan
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "127.0.0.1:8765" ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul
echo Serveur arrete.
timeout /t 2 >nul
