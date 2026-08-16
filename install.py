#!/usr/bin/env python3
"""CRPC AI環境セットアップ（Windows / Mac 共通）

使い方:
  Windows: ダブルクリック、または python install.py
  Mac:     python3 install.py（または install.command を使用）
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def pip_install(package: str) -> bool:
    """ライブラリを入れる。**失敗しても全体を止めない。**

    Homebrew Python や最近の Linux では PEP 668（externally-managed-environment）で
    system-wide の pip install が拒否される。以前は check_call の例外がそのまま出て
    インストーラごと落ち、スキル配置にすら到達しなかった。文字起こし以外の機能は
    このライブラリに依存しないので、警告に留めて続行する。
    """
    for extra in ([], ["--user"], ["--break-system-packages"]):
        if subprocess.call(
            [sys.executable, "-m", "pip", "install", package, "-q", *extra],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        ) == 0:
            return True
    return False


def save_api_key(api_key: str) -> None:
    config_dir = Path.home() / ".config" / "claude-toolkit"
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "gemini-api-key").write_text(api_key, encoding="utf-8")
    print(f"✅ API キーを {config_dir / 'gemini-api-key'} に保存しました")

    if platform.system() == "Windows":
        subprocess.run(["setx", "GEMINI_API_KEY", api_key], capture_output=True)
        print("✅ 環境変数 GEMINI_API_KEY を設定しました（次回ターミナル起動から有効）")
    else:
        zshrc = Path.home() / ".zshrc"
        lines = []
        if zshrc.exists():
            lines = [l for l in zshrc.read_text().splitlines(keepends=True)
                     if "GEMINI_API_KEY" not in l]
        lines += ["\n", "# Gemini API キー（CRPC音声文字起こし用）\n",
                  f'export GEMINI_API_KEY="{api_key}"\n']
        zshrc.write_text("".join(lines), encoding="utf-8")
        print("✅ API キーを ~/.zshrc に保存しました")


def load_existing_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        for config_dir_name in ("claude-toolkit", "crpc"):  # crpc は旧バージョンとの互換用
            config_file = Path.home() / ".config" / config_dir_name / "gemini-api-key"
            if config_file.exists():
                key = config_file.read_text(encoding="utf-8").strip()
                break
    return key


def main() -> None:
    # 行ごとに掃き出す。既定の stdout はリダイレクト・パイプ経由だとブロック
    # バッファになり、subprocess.call で呼ぶ claude-toolkit/install.py の出力が
    # 先に画面へ出てしまう。結果「claude-toolkit を配置しました」が CRPC の
    # バナーより前に並び、どちらが何をしたのか読み取れない（2026-08-15、
    # 311C4W991 で確認）。子プロセスと順序を揃えるため親側を行バッファにする。
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except AttributeError:  # Python 3.6 以前
        pass

    print("=" * 48)
    print("  CRPC AI環境 セットアップ")
    print("=" * 48)
    print()

    # google-genai（音声文字起こし用。これが無くても他のスキルは動く）
    genai_ok = True
    try:
        import google.genai  # noqa: F401
        print("✅ google-genai: インストール済み")
    except ImportError:
        print("google-genai ライブラリをインストール中...")
        if pip_install("google-genai"):
            print("✅ google-genai インストール完了")
        else:
            genai_ok = False
            print("⚠️  google-genai を入れられませんでした（続行します）")
            print("   /transcribe-meeting だけが使えません。手動で入れる場合:")
            print(f"     {sys.executable} -m pip install --user google-genai")

    # Claude Code スキル
    # 1) CRPC固有（skills/ 直下の単体 .md）→ ~/.claude/commands/  ここで配置する
    # 2) 汎用（vendor/claude-toolkit）→ vendor/claude-toolkit/install.py に委譲する
    #
    # 2 の置き方をここに書かない。同じ配置ロジックを配布先ごとに書き直していた頃は
    # bash・PowerShell・Python で4実装に分裂し、statusLine の扱いが3種類に割れて、
    # 本人環境の設定を2度壊した（2026-08-01）。実装は claude-toolkit 側の1つだけ。
    #
    # 2回目以降の実行でも更新が当たる。上流で増えたスキル・規約は置かれ、廃止された
    # ものは撤去される（install.py が前回の配置を記録していて突き合わせる）。
    print()
    claude_dir = Path.home() / ".claude"
    if claude_dir.is_dir() or shutil.which("claude"):
        commands_dir = claude_dir / "commands"
        commands_dir.mkdir(parents=True, exist_ok=True)
        installed = 0
        local_skills_dir = Path(__file__).parent / "skills"
        if local_skills_dir.is_dir():
            for skill_file in sorted(local_skills_dir.glob("*.md")):
                if skill_file.name == "README.md":
                    continue  # 説明書き。配置すると /README という空コマンドが生える
                shutil.copy2(skill_file, commands_dir / skill_file.name)
                print(f"✅ /{skill_file.stem} スキルをインストールしました")
                installed += 1
        if installed == 0:
            print("ℹ️  CRPC固有のコマンドはありません")

        toolkit_installer = Path(__file__).parent / "vendor" / "claude-toolkit" / "install.py"
        if toolkit_installer.is_file():
            rc = subprocess.call([sys.executable, str(toolkit_installer), "--label", "crpc-tools"])
            if rc == 2:
                print("⚠️  汎用スキルの配置を中止しました（上記の指示に従ってください）")
            elif rc != 0:
                print("⚠️  汎用スキルの配置で一部失敗しました（続行します）")
        else:
            print("⚠️  vendor/claude-toolkit がありません。次を実行してください:")
            print("     git submodule update --init --recursive")
    else:
        print("ℹ️  Claude Code 未インストール: スキルのインストールをスキップ")

    # Gemini API キー
    print()
    if os.environ.get("CRPC_SKIP_API_KEY") == "1" or "--skip-api-key" in sys.argv:
        print("ℹ️  CRPC_SKIP_API_KEY が指定されたため、Gemini API キー設定をスキップしました")
        _finish()
        return
    if not genai_ok:
        # キーの動作確認に google-genai が要る。入っていないなら聞くだけ無駄。
        print("ℹ️  google-genai が無いため Gemini API キーの設定をスキップしました")
        _finish()
        return

    existing_key = load_existing_key()
    if existing_key:
        print("✅ Gemini API キー: 設定済み")
        update = input("キーを更新しますか？ [y/N] ").strip().lower()
        if update != "y":
            _finish()
            return

    print()
    print("Gemini API キーを設定します。")
    print("取得方法は README.md の「Gemini API キー」を参照してください。")
    print()
    api_key = input("API キーを貼り付けてください: ").strip()
    if not api_key:
        print("キーが入力されませんでした。終了します。")
        _finish()
        return

    # キー動作確認
    print()
    print("API キーを確認中...")
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        client.models.generate_content(model="gemini-2.5-flash", contents="OK")
        print("✅ API キー確認完了")
    except Exception as e:
        print(f"【エラー】{e}")
        print()
        print("確認事項:")
        print("  1. キーが正しくコピーされているか")
        print("  2. Generative Language API が有効化されているか")
        print("     （README.md の「Gemini API キー」を参照）")
        _finish()
        return

    save_api_key(api_key)

    print()
    print("=" * 48)
    print("  セットアップ完了！")
    print("=" * 48)
    print()
    print("使い方: Claude Code で /transcribe-meeting を実行")
    _finish()


def _finish() -> None:
    print()
    # ダブルクリック起動でウィンドウが即閉じないよう待つ。パイプ経由・CI など
    # 端末が無い場合は待たない（従来は EOFError で最後にトレースバックが出ていた）。
    #
    # isatty() だけでは足りない。Windows の `cmd /c install.bat` 経由では stdin が
    # すぐ EOF を返すのに isatty() が True になり、ガードを素通りして EOFError で
    # 終了コード1になる（2026-08-15、311C4W991 で2回とも再現）。配置は済んだ後
    # なので実害は無いが、自動実行では失敗と判定される。EOF も併せて受け止める。
    if not sys.stdin.isatty():
        return
    try:
        input("Enterで閉じる...")
    except EOFError:
        print()


if __name__ == "__main__":
    main()
