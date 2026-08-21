@echo off
chcp 65001 >nul
echo ==================================================
echo [1/2] 正在自動部署 Google Apps Script 後端...
echo ==================================================

set "PY_CMD=python"
where python >nul 2>nul
if errorlevel 1 (
    if exist "C:\DevTools\Python312\python.exe" (
        set "PY_CMD=C:\DevTools\Python312\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" (
        set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Launcher\py.exe"
    )
)

"%PY_CMD%" "%~dp0backend\deploy_gas.py"
if errorlevel 1 (
    echo.
    echo [警告] GAS 部署失敗，請檢查上方錯誤訊息！
    echo.
) else (
    echo.
    echo [成功] GAS 後端部署完成！
    echo.
)

echo ==================================================
echo [2/2] 正在推送前端程式碼至 GitHub (觸發 GitHub Pages)...
echo ==================================================
set "GITHUB_TOKEN="
git add .
git commit -m "Auto deploy"
git push origin master

echo ==================================================
echo [完成] 程式碼已推送至 GitHub master 分支！
echo GitHub Actions 將自動建置並發布前端至 GitHub Pages。
echo ==================================================
pause
