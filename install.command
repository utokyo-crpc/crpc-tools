#!/bin/bash
# CRPC AI環境セットアップ
# このファイルをダブルクリックして実行してください

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo "  CRPC AI環境 セットアップ"
echo "================================================"
echo ""

# ── Python 確認 ──────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "Python3 が見つかりません。Homebrew でインストールします..."
    if ! command -v brew &>/dev/null; then
        echo ""
        echo "【エラー】Homebrew も見つかりません。先に Homebrew をインストールしてください："
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo ""
        echo "インストール後、このファイルを再度実行してください。"
        read -p "Enterで閉じる..."
        exit 1
    fi
    brew install python3
    if ! command -v python3 &>/dev/null; then
        echo "【エラー】Python3 のインストールに失敗しました。"
        read -p "Enterで閉じる..."
        exit 1
    fi
    echo "✅ Python3 インストール完了"
fi

# ── google-genai ─────────────────────────────────────
if ! python3 -c "import google.genai" 2>/dev/null; then
    echo "google-genai ライブラリをインストール中..."
    /opt/homebrew/bin/pip3 install google-genai --break-system-packages -q 2>/dev/null \
        || pip3 install google-genai -q
    echo "✅ google-genai インストール完了"
else
    echo "✅ google-genai: インストール済み"
fi

# ── Claude Code スキル ────────────────────────────────
echo ""
if [ -d ~/.claude/commands ]; then
    cp "$SCRIPT_DIR/transcribe-meeting.md" ~/.claude/commands/
    echo "✅ /transcribe-meeting スキルをインストールしました"
else
    echo "ℹ️  Claude Code 未インストール: /transcribe-meeting スキルはスキップ"
fi

# ── Gemini API キー ───────────────────────────────────
echo ""
source ~/.zshrc 2>/dev/null

if [ -n "$GEMINI_API_KEY" ]; then
    echo "✅ Gemini API キー: 設定済み"
    read -p "キーを更新しますか？ [y/N] " UPDATE
    if [[ "$UPDATE" != "y" && "$UPDATE" != "Y" ]]; then
        echo ""
        echo "================================================"
        echo "  セットアップ完了"
        echo "================================================"
        echo ""
        echo "使い方: audio-transcribe.command をダブルクリック"
        echo ""
        read -p "Enterで閉じる..."
        exit 0
    fi
fi

echo ""
echo "Gemini API キーを設定します。"
echo "取得方法は audio-transcribe-setup.md（このフォルダの1つ上）を参照してください。"
echo ""
echo "API キーを貼り付けてください："
read -r API_KEY

if [ -z "$API_KEY" ]; then
    echo "キーが入力されませんでした。終了します。"
    read -p "Enterで閉じる..."
    exit 1
fi

# ── キー動作確認 ─────────────────────────────────────
echo ""
echo "API キーを確認中..."
RESULT=$(python3 -c "
from google import genai
try:
    client = genai.Client(api_key='$API_KEY')
    r = client.models.generate_content(model='gemini-2.5-flash', contents='OK')
    print('OK')
except Exception as e:
    print('ERROR:' + str(e)[:100])
" 2>&1)

if [[ "$RESULT" != "OK" ]]; then
    echo ""
    echo "【エラー】API キーの確認に失敗しました："
    echo "$RESULT"
    echo ""
    echo "1. キーが正しくコピーされているか確認してください"
    echo "2. Generative Language API が有効化されているか確認してください"
    echo "   （audio-transcribe-setup.md の Step 4 を参照）"
    read -p "Enterで終了..."
    exit 1
fi

# ── ~/.zshrc に保存 ───────────────────────────────────
ZSHRC="$HOME/.zshrc"
grep -v "GEMINI_API_KEY" "$ZSHRC" > /tmp/zshrc_tmp 2>/dev/null || touch /tmp/zshrc_tmp
cat /tmp/zshrc_tmp > "$ZSHRC"
echo "" >> "$ZSHRC"
echo "# Gemini API キー（CRPC音声文字起こし用）" >> "$ZSHRC"
echo "export GEMINI_API_KEY=\"$API_KEY\"" >> "$ZSHRC"

echo ""
echo "================================================"
echo "  セットアップ完了！"
echo "================================================"
echo ""
echo "使い方: audio-transcribe.command をダブルクリック"
echo ""
read -p "Enterで閉じる..."
