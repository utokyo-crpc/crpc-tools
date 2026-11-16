#!/bin/bash
# CRPC AI環境セットアップ（Mac）
# このファイルをダブルクリックして実行してください。
#
# ここは入口だけで、中身は install.py にある（Windows の install.bat と同じ形）。
# ライブラリの導入・スキルの配置・API キーの設定を、ここに bash で書き直さない。
# 2026-08-01 にスキルの配置を install.py（→ vendor/claude-toolkit/install.py）へ一本化した
# とき、このファイルだけが古い実装のまま残った。その結果、ライブラリの確認と導入で別の
# Python を使って google-genai が見えない、statusLine を無条件に上書きする、上流で廃止した
# スキルを撤去しない、API キーを Python のコードに埋め込む、が起きていた（2026-11-16 に解消）。

cd "$(dirname "$0")" || exit 1

pause_and_exit() {
    echo ""
    read -r -p "Enterで閉じる..." _
    exit "$1"
}

# ── 共通スキル集（vendor/claude-toolkit）を取得 ──────────
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
    git submodule update --init --recursive --quiet
fi

# ── Python 確認（無ければ Homebrew で入れる）──────────────
if ! python3 -c 'import sys' >/dev/null 2>&1; then
    echo "Python3 が見つかりません。Homebrew でインストールします..."
    if ! command -v brew >/dev/null 2>&1; then
        echo ""
        echo "【エラー】Homebrew も見つかりません。先に Homebrew をインストールしてください："
        echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        echo ""
        echo "インストール後、このファイルを再度実行してください。"
        pause_and_exit 1
    fi
    brew install python3
    if ! python3 -c 'import sys' >/dev/null 2>&1; then
        echo "【エラー】Python3 のインストールに失敗しました。"
        pause_and_exit 1
    fi
    echo "✅ Python3 インストール完了"
fi

# ── 本体 ─────────────────────────────────────────────
# install.py は、確かめるのと同じ Python（sys.executable -m pip）へライブラリを入れる。
# 正常に終われば install.py 自身が「Enterで閉じる」を出すので、ここで待つのは異常終了のときだけ。
python3 install.py "$@"
rc=$?
if [ "$rc" -ne 0 ]; then
    pause_and_exit "$rc"
fi
