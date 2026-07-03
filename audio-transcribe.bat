@echo off
chcp 65001 > nul
cd /d "%~dp0"
python audio-transcribe.py --gui
if errorlevel 1 (
    echo.
    echo エラーが発生しました。install.py を実行してセットアップを確認してください。
)
pause
