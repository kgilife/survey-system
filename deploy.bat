@echo off
setlocal
echo ==================================================
echo [1/2] Deploying Google Apps Script Backend...
echo ==================================================

set "PY_CMD=python"
if exist "C:\DevTools\Python312\python.exe" (
    set "PY_CMD=C:\DevTools\Python312\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Launcher\py.exe"
)

"%PY_CMD%" "%~dp0backend\deploy_gas.py"
if errorlevel 1 (
    echo.
    echo [WARNING] GAS deployment failed. Please check the error above.
    echo.
) else (
    echo.
    echo [SUCCESS] GAS backend deployed successfully!
    echo.
)

echo ==================================================
echo [2/2] Pushing code to GitHub (GitHub Pages)...
echo ==================================================
set "GITHUB_TOKEN="
git add .
git commit -m "Auto deploy"
git push origin master

echo ==================================================
echo [DONE] Code pushed to GitHub master branch!
echo GitHub Actions will automatically deploy GitHub Pages.
echo ==================================================
pause
