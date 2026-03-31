@echo off
setlocal
TITLE NeuroStrategy OS - Portal de Controle

:menu
cls
echo ======================================================
echo           NEUROSTRATEGY OS - STARTUP SYSTEM
echo ======================================================
echo.
echo [INFO] Porta 3000 ocupada por outro projeto.
echo [INFO] NeuroStrategy OS utilizara a porta 1420.
echo.
echo  1. Executar Versao WEB (Porta 1420)
echo  2. Executar Versao DESKTOP (Tauri)
echo  3. Instalar/Reparar Dependencias (Recomendado)
echo  4. Sair
echo.
set /p opt="Escolha uma opcao (1-4): "

if "%opt%"=="1" goto start_web
if "%opt%"=="2" goto start_tauri
if "%opt%"=="3" goto update
if "%opt%"=="4" goto exit
goto menu

:start_web
cls
echo [i] Iniciando no Modo Web (Navegador)...
echo [i] O sistema abrira em: http://localhost:1420
cd neurostrategy-os
start cmd /k "npm run dev -- --port 1420 --strictPort true"
cd ..
goto menu

:start_tauri
cls
echo [i] Iniciando no Modo Desktop (Tauri)...
echo [i] Compilando Backend Rust e Frontend React...
cd neurostrategy-os
start cmd /k "npm run tauri dev"
cd ..
goto menu

:update
cls
echo [i] Instalando dependencias do Root e Modulos...
call npm install
cd neurostrategy-os
call npm install
cd ..
echo.
echo [V] Dependencias instaladas com sucesso.
pause
goto menu

:exit
exit
