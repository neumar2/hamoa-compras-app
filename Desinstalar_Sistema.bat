@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Desinstalador - Compras App

:: 1. Solicita Privilegios de Administrador
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
echo       BEM VINDO AO DESINSTALADOR DO COMPRAS APP
echo =====================================================
echo.
echo Este script ira parar e remover os conteineres do sistema.
echo.

echo Parando e removendo os conteineres...
docker-compose down

echo.
set /p wipe_data="Deseja APAGAR tambem os DADOS do banco de dados (S/N)? "

if /I "%wipe_data%"=="S" (
    echo Apagando a pasta de dados do banco...
    if exist "data\pgdata" (
        rmdir /S /Q "data\pgdata"
        echo Dados apagados.
    ) else (
        echo A pasta de dados nao foi encontrada.
    )
)

echo.
echo Removendo atalho da Area de Trabalho...
if exist "%USERPROFILE%\Desktop\Compras App.lnk" (
    del "%USERPROFILE%\Desktop\Compras App.lnk"
    echo Atalho removido.
)

echo.
echo =====================================================
echo        DESINSTALACAO CONCLUIDA COM SUCESSO!
echo =====================================================
echo.
pause
