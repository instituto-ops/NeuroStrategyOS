@echo off
setlocal
TITLE NeuroStrategy OS - Startup Manager
:: Definir cores: 0 = Preto, B = Ciano Claro
color 0B

echo ======================================================
echo           NEUROSTRATEGY OS - STARTUP MANAGER
echo ======================================================
echo.

:: Verificar Node.js
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Node.js/NPM nao encontrado. 
    echo Por favor, instale o Node.js para continuar.
    pause
    exit
)

:: Verificar integridade do ambiente
if not exist "neurostrategy-os\package.json" (
    color 0C
    echo [ERRO] Pasta 'neurostrategy-os' ou 'package.json' nao encontrada.
    echo Certifique-se de estar na raiz do projeto.
    pause
    exit
)

:: Auto-install se node_modules estiver faltando
if not exist "neurostrategy-os\node_modules\" (
    echo [!] Dependencias nao encontradas. Instalando automaticamente...
    cd neurostrategy-os
    call npm install
    cd ..
)

:menu
cls
echo ======================================================
echo           NEUROSTRATEGY OS - MENU INICIAL
echo ======================================================
echo.
echo  [1] Executar Versao WEB (Vite - Rapido)
echo  [2] Executar Versao DESKTOP (Tauri - Completo)
echo  [3] Instalar/Atualizar Dependencias
echo  [4] Abrir Pasta do Projeto
echo  [5] Sair
echo.
echo ======================================================
set /p opt="Selecione uma opcao (1-5): "

if "%opt%"=="1" goto start_web
if "%opt%"=="2" goto start_tauri
if "%opt%"=="3" goto update
if "%opt%"=="4" goto open_folder
if "%opt%"=="5" goto exit
echo Opcao invalida.
timeout /t 2 >nul
goto menu

:start_web
echo.
echo [i] Iniciando servidor Vite...
echo [i] O sistema estara disponivel no navegador em instantes.
cd neurostrategy-os
start cmd /k "TITLE NeuroStrategy OS - Web Dev && npm run dev"
cd ..
goto menu

:start_tauri
echo.
echo [i] Iniciando ambiente Tauri...
echo [i] Isso pode levar alguns segundos na primeira execucao.
cd neurostrategy-os
start cmd /k "TITLE NeuroStrategy OS - Desktop Dev && npm run tauri dev"
cd ..
goto menu

:update
echo.
echo [!] Atualizando dependencias do sistema...
echo [1/2] Atualizando raiz...
call npm install
echo [2/2] Atualizando core (neurostrategy-os)...
cd neurostrategy-os
call npm install
cd ..
echo.
echo [V] Tudo pronto!
pause
goto menu

:open_folder
start .
goto menu

:exit
echo Saindo...
timeout /t 1 >nul
exit
