@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on your PATH.
  echo         Install Node.js 20 or newer from https://nodejs.org and try again.
  goto :fail
)

if not exist "node_modules" (
  echo [SETUP] Dependencies are missing. Running setup.bat first...
  call setup.bat
  if errorlevel 1 goto :fail
)

if not exist ".env" (
  echo [WARN] No .env file found. Running setup.bat to create it...
  call setup.bat
  if errorlevel 1 goto :fail
)

echo ============================================
echo   Learning Studio - Starting
echo ============================================
echo.
echo   Studio:   http://localhost:3000/studio
echo   Settings: http://localhost:3000/settings
echo.
echo   Press Ctrl+C in this window to stop the server.
echo.

call npm run dev
goto :end

:fail
echo.
echo [ERROR] Could not start the studio. See the messages above.
endlocal
exit /b 1

:end
endlocal
exit /b 0
