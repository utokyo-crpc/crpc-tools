#!/bin/bash
# 音声文字起こしスクリプト
# このファイルをダブルクリックして実行してください

cd "$(dirname "$0")"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo "  音声文字起こし（Gemini）"
echo "================================================"
echo ""

# APIキー確認
if [ -z "$GEMINI_API_KEY" ]; then
    source ~/.zshrc 2>/dev/null
fi
if [ -z "$GEMINI_API_KEY" ]; then
    echo "【エラー】Gemini API キーが設定されていません。"
    echo "先に install.command を実行してください。"
    read -p "Enterで閉じる..."
    exit 1
fi

# 音声ファイルをFinderで選択
AUDIO_FILE=$(osascript -e '
tell application "Finder"
    activate
end tell
POSIX path of (choose file with prompt "文字起こしする音声ファイルを選択してください" of type {"public.audio", "com.apple.m4a-audio", "public.mp3", "com.microsoft.waveform-audio"})')

if [ -z "$AUDIO_FILE" ]; then
    echo "ファイルが選択されませんでした。終了します。"
    exit 0
fi

echo "選択ファイル: $(basename "$AUDIO_FILE")"

# 出力先をFinderで選択
OUTPUT_DIR=$(osascript -e '
POSIX path of (choose folder with prompt "文字起こし結果の保存先フォルダを選択してください")')

if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="$(dirname "$AUDIO_FILE")"
fi

STEM=$(basename "$AUDIO_FILE" | sed 's/\.[^.]*$//')
TRANSCRIPT="${OUTPUT_DIR}${STEM}_transcript.txt"

# 文字起こし（単一ファイルで送信→品質不良なら自動分割）
echo ""
echo "Gemini で文字起こし中（しばらくお待ちください）..."
echo "※ まず音声ファイル丸ごとで送信します。品質が悪ければ自動で分割モードに切り替わります。"
GEMINI_API_KEY="$GEMINI_API_KEY" python3 "$SCRIPT_DIR/vendor/claude-toolkit/skills/transcribe-meeting/scripts/audio-transcribe.py" \
    "$AUDIO_FILE" --output "$TRANSCRIPT"

if [ $? -ne 0 ]; then
    echo "【エラー】文字起こしに失敗しました。"
    read -p "Enterで閉じる..."
    exit 1
fi

echo ""
echo "================================================"
echo "  完了！"
echo "================================================"
echo ""
echo "文字起こし結果: $TRANSCRIPT"
echo ""

# 結果をFinderで開く
open "$TRANSCRIPT"
read -p "Enterで閉じる..."
