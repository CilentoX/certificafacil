@echo off
echo === CertificaFacil Startup ===
echo.

echo [1/4] Instalando dependencias do Backend...
cd /d c:\laragon\www\certificafacil\backend-node
call npm install

echo.
echo [2/4] Gerando Prisma Client...
call npx prisma generate

echo.
echo [3/4] Sincronizando banco de dados (db push)...
call npx prisma db push --accept-data-loss

echo.
echo [4/4] Instalando dependencias do Frontend...
cd /d c:\laragon\www\certificafacil\frontend-react
call npm install

echo.
echo === Iniciando servidores ===
cd /d c:\laragon\www\certificafacil\backend-node
start "API Backend" cmd /k "npm run dev"

cd /d c:\laragon\www\certificafacil\frontend-react
start "React Frontend" cmd /k "npm run dev"

echo.
echo Pronto! Backend em http://localhost:3000 e Frontend em http://localhost:5173
pause
