@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================
echo   CRPC AI環境 セットアップ
echo ================================================
echo.

:: Python確認（python / py どちらでも可）
set PYTHON=
python --version > nul 2>&1
if not errorlevel 1 ( set PYTHON=python & goto :python_ok )
py --version > nul 2>&1
if not errorlevel 1 ( set PYTHON=py & goto :python_ok )

:: Python未インストール → winget でインストール
echo Python が見つかりません。インストールします...
echo.
winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo.
    echo 【エラー】自動インストールに失敗しました。
    echo 以下から手動でインストールし、このファイルを再度実行してください。
    echo.
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
echo.
echo Python をインストールしました。
echo このウィンドウを閉じて install.bat を再度実行してください。
pause
exit /b 0

:python_ok
echo Python: 確認済み
echo.
%PYTHON% install.py
