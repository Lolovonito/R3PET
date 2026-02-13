@echo off
echo ==========================================
echo      R3PET - Generador de APK Android
echo ==========================================
echo.

REM 1. Verificar Node.js
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no esta en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b
)

echo [1/5] Instalando dependencias del proyecto...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar dependencias.
    pause
    exit /b
)

echo [2/5] Instalando soporte para Android...
call npm install @capacitor/core @capacitor/cli @capacitor/android
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar Capacitor.
    pause
    exit /b
)

echo [3/5] Construyendo la aplicacion Web (React)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo en la construccion web.
    pause
    exit /b
)

echo [4/5] Creando proyecto nativo Android...
if exist android (
    echo La carpeta android ya existe, sincronizando...
    call npx cap sync android
) else (
    echo Inicializando plataforma Android...
    call npx cap add android
)

echo [5/5] Preparado para compilar APK.
echo.
echo ========================================================
echo LISTO! El proyecto Android se ha generado correctamente.
echo.
echo Opcion A: Abrir en Android Studio (Recomendado)
echo    Ejecuta: npx cap open android
echo.
echo Opcion B: Compilar APK directamente desde linea de comandos
echo    Ve a la carpeta 'android' y ejecuta: gradlew assembleDebug
echo ========================================================
pause
