@echo off
title CertificaFacil - PHP Server (XAMPP)
chcp 65001 >nul 2>&1

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "XAMPP_PHP=C:\xampp\php"

:: Adiciona o PHP do XAMPP ao PATH
set "PATH=%XAMPP_PHP%;%PATH%"

echo.
echo  ============================================================
echo    CertificaFacil - Servidor PHP
echo    Powered by XAMPP
echo  ============================================================
echo.

:: Verifica se o XAMPP esta instalado
if not exist "%XAMPP_PHP%\php.exe" (
    echo  [ERRO] PHP do XAMPP nao encontrado em %XAMPP_PHP%\php.exe
    echo.
    echo  Verifique se o XAMPP esta instalado em C:\xampp
    echo  Download: https://www.apachefriends.org/
    echo.
    pause
    exit /b 1
)

:: Mostra versao do PHP
for /f "tokens=*" %%i in ('php -v 2^>nul ^| findstr /R "^PHP"') do echo  [OK] %%i
echo.

:: Verifica extensoes necessarias
call :check_ext gd "GD"
call :check_ext mbstring "mbstring"
call :check_ext fileinfo "fileinfo"
echo.

:: Instala dependencias Composer se necessario
if exist "%BACKEND_DIR%\vendor" goto :deps_ok

echo  [INFO] Instalando dependencias PHP (primeira execucao)...
echo.
call :install_deps
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias.
    echo  Instale o Composer manualmente: https://getcomposer.org/download/
    echo  Depois execute: cd backend ^& composer install
    echo.
    pause
    exit /b 1
)
goto :start_server

:deps_ok
echo  [OK] Dependencias ja instaladas
echo.

:start_server
:: Inicia servidor
echo  ============================================================
echo    Servidor rodando em:  http://localhost:8666
echo    Pressione Ctrl+C para parar o servidor
echo  ============================================================
echo.

cd /d "%ROOT_DIR%"
php -S 0.0.0.0:8666 router.php

echo.
echo  ============================================================
echo  O servidor foi encerrado.
echo  Se houve erro, verifique as mensagens acima.
echo  ============================================================
echo.
pause
exit /b 0

:: ── Sub-rotinas ────────────────────────────────────────────────

:check_ext
php -m 2>nul | findstr /i "^%~1$" >nul
if %ERRORLEVEL% neq 0 (
    echo  [!!] Extensao %~2 nao habilitada
    echo       Edite %XAMPP_PHP%\php.ini e descomente: extension=%~1
) else (
    echo  [OK] %~2
)
exit /b 0

:install_deps
:: Tenta composer global
where composer >nul 2>&1
if %ERRORLEVEL% equ 0 (
    cd /d "%BACKEND_DIR%"
    call composer install --no-dev --optimize-autoloader
    cd /d "%ROOT_DIR%"
    exit /b 0
)

:: Tenta composer.phar local
if exist "%BACKEND_DIR%\composer.phar" (
    cd /d "%BACKEND_DIR%"
    php composer.phar install --no-dev --optimize-autoloader
    cd /d "%ROOT_DIR%"
    exit /b 0
)

:: Baixa composer.phar automaticamente
echo  [INFO] Baixando Composer automaticamente...
cd /d "%BACKEND_DIR%"
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --quiet
del composer-setup.php 2>nul

if not exist "%BACKEND_DIR%\composer.phar" (
    cd /d "%ROOT_DIR%"
    exit /b 1
)

php composer.phar install --no-dev --optimize-autoloader
cd /d "%ROOT_DIR%"
echo.
echo  [OK] Dependencias instaladas com sucesso!
exit /b 0
