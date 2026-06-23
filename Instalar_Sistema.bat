@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Instalador - Compras App

:: 1. Solicita Privilégios de Administrador
if "%~1"=="ELEVATED" goto gotAdmin

echo =====================================================
echo SOLICITANDO PRIVILEGIOS DE ADMINISTRADOR...
echo =====================================================
powershell -Command "Start-Process cmd -ArgumentList '/c', '\"\"%~dpnx0\"\" ELEVATED' -Verb RunAs"
exit /B

:gotAdmin
pushd "%CD%"
CD /D "%~dp0"

echo =====================================================
echo       BEM VINDO AO INSTALADOR DO COMPRAS APP
echo =====================================================
echo.
echo Verificando dependencias no seu servidor...
echo.

:: 2. Verifica se o Docker existe
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker nao encontrado no sistema.
    echo.
    if not exist "Docker Desktop Installer.exe" (
        echo Baixando o Instalador do Docker Oficial (Isso pode levar alguns minutos]...
        curl -L -o "Docker Desktop Installer.exe" "https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe"
    )
    
    echo =====================================================
    echo ABRINDO O INSTALADOR OFICIAL DO DOCKER
    echo =====================================================
    echo Uma janela do Docker vai se abrir. Siga as instrucoes na tela, 
    echo deixe a opcao "Use WSL 2" marcada e clique em OK.
    echo Se o Docker pedir para reiniciar o PC no final, reinicie e rode este script novamente.
    echo Aguardando a conclusao da instalacao...
    start /wait "" "Docker Desktop Installer.exe" install
    
    echo.
    echo [!] IMPORTANTE: O Docker terminou a instalacao. 
    echo Pressione qualquer tecla para continuar e tentar iniciar o sistema...
    pause >nul
) else (
    echo [OK] Docker detectado.
)

:: 3. Garante que o serviço do Docker inicie (em caso de Docker Engine)
echo Iniciando os servicos do Docker...
net start com.docker.service >nul 2>&1

:: 4. Inicializa o Sistema
echo.
echo =====================================================
echo       CONSTRUINDO E INICIANDO O SISTEMA
echo =====================================================
echo Isso criara o banco de dados e os servidores web.
echo.
docker-compose up -d --build

:: 5. Cria Atalho na Área de Trabalho
echo.
echo Criando atalho na Area de Trabalho...
set SCRIPT="%TEMP%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%USERPROFILE%\Desktop\Compras App.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "http://localhost:5000" >> %SCRIPT%
echo oLink.IconLocation = "%~dp0frontend\public\favicon.svg" >> %SCRIPT%
echo oLink.Description = "Sistema Hamoa Compras ERP" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

:: 6. Finalização
echo.
echo =====================================================
echo        INSTALACAO CONCLUIDA COM SUCESSO!
echo =====================================================
echo O sistema estara rodando em segundo plano.
echo.
echo Abrindo o navegador...
start http://localhost:5000

echo.
echo Pode fechar esta janela preta.
pause
