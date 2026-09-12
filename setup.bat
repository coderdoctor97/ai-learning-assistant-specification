@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Learning Studio - Setup
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on your PATH.
  echo         Install Node.js 20 or newer from https://nodejs.org and try again.
  goto :fail
)

for /f "delims=" %%v in ('node --version') do set NODE_VERSION=%%v
echo [OK] Node.js %NODE_VERSION%
echo.

if not exist ".env" (
  echo [SETUP] No .env file found. Creating one for optional provider keys...
  (
    echo # The studio stores its data in a local SQLite file - no database setup needed.
    echo.
    echo # Optional provider / retrieval keys. Fill in the ones you use.
    echo # OPENAI_API_KEY=
    echo # OPENROUTER_API_KEY=
    echo # ANTHROPIC_API_KEY=
    echo # XAI_API_KEY=
    echo # TAVILY_API_KEY=
    echo # BRAVE_API_KEY=
  ) > ".env"
  echo [OK] Created .env - edit it if you use environment-based keys.
) else (
  echo [OK] .env already exists - leaving it untouched.
)
echo.

echo [SETUP] Installing dependencies...
call npm install
if errorlevel 1 goto :fail
echo.

echo ============================================
echo   Setup complete. Run start.bat to launch.
echo   Your data is stored in the .data folder.
echo ============================================
goto :end

:fail
echo.
echo [ERROR] Setup failed. Fix the issue above and run setup.bat again.
endlocal
exit /b 1

:end
endlocal
exit /b 0
