#!/usr/bin/env python3
"""CRPC AI環境セットアップ（Windows / Mac 共通）

使い方:
  Windows: ダブルクリック、または python install.py
  Mac:     python3 install.py（または install.command を使用）
"""

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def pip_install(package: str) -> None:
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", package, "-q"],
        stdout=subprocess.DEVNULL,
    )


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
    print("=" * 48)
    print("  CRPC AI環境 セットアップ")
    print("=" * 48)
    print()

    # google-genai
    try:
        import google.genai  # noqa: F401
        print("✅ google-genai: インストール済み")
    except ImportError:
        print("google-genai ライブラリをインストール中...")
        pip_install("google-genai")
        print("✅ google-genai インストール完了")

    # Claude Code スキル
    # 1) skills/ 直下の.md（CRPC固有・単体ファイル形式）→ ~/.claude/commands/
    # 2) vendor/claude-toolkit/skills/*/（saito-la共通・scripts同梱形式）→ ~/.claude/skills/<name>/ へディレクトリごとコピー
    #    （symlinkはWindowsで権限が必要になるため使わず、copytreeで実体をコピーする）
    print()
    claude_dir = Path.home() / ".claude"
    commands_dir = claude_dir / "commands"
    if commands_dir.is_dir():
        installed = 0
        local_skills_dir = Path(__file__).parent / "skills"
        if local_skills_dir.is_dir():
            for skill_file in sorted(local_skills_dir.glob("*.md")):
                shutil.copy2(skill_file, commands_dir / skill_file.name)
                print(f"✅ /{skill_file.stem} スキルをインストールしました")
                installed += 1

        toolkit_skills_dir = Path(__file__).parent / "vendor" / "claude-toolkit" / "skills"
        skills_dest_dir = claude_dir / "skills"
        if toolkit_skills_dir.is_dir():
            skills_dest_dir.mkdir(parents=True, exist_ok=True)
            for skill_dir in sorted(toolkit_skills_dir.iterdir()):
                if not (skill_dir / "SKILL.md").is_file():
                    continue
                dest = skills_dest_dir / skill_dir.name
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(skill_dir, dest, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
                print(f"✅ {skill_dir.name} スキルをインストールしました（claude-toolkit共通）")
                installed += 1
        if installed == 0:
            print("ℹ️  インストールするスキルはありません")

        # ステータスライン（vendor/claude-toolkit/tools/statusline/statusline.py）
        statusline_src = Path(__file__).parent / "vendor" / "claude-toolkit" / "tools" / "statusline" / "statusline.py"
        if statusline_src.is_file():
            statusline_dest = claude_dir / "statusline.py"
            shutil.copy2(statusline_src, statusline_dest)
            if platform.system() != "Windows":
                statusline_dest.chmod(0o755)
            settings_path = claude_dir / "settings.json"
            try:
                settings = json.loads(settings_path.read_text(encoding="utf-8"))
            except (FileNotFoundError, json.JSONDecodeError):
                settings = {}
            py_cmd = "python" if platform.system() == "Windows" else "python3"
            settings["statusLine"] = {"type": "command", "command": f"{py_cmd} ~/.claude/statusline.py"}
            settings_path.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
            print("✅ ステータスラインをインストールしました（claude-toolkit共通）")
    else:
        print("ℹ️  Claude Code 未インストール: スキルのインストールをスキップ")

    # Gemini API キー
    print()
    existing_key = load_existing_key()
    if existing_key:
        print("✅ Gemini API キー: 設定済み")
        update = input("キーを更新しますか？ [y/N] ").strip().lower()
        if update != "y":
            _finish()
            return

    print()
    print("Gemini API キーを設定します。")
    print("取得方法は README.md の「Gemini API キーの取得」を参照してください。")
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
        print("     （README.md の「Gemini API キーの取得」を参照）")
        _finish()
        return

    save_api_key(api_key)

    print()
    print("=" * 48)
    print("  セットアップ完了！")
    print("=" * 48)
    print()
    if platform.system() == "Windows":
        print("使い方: audio-transcribe.bat をダブルクリック")
    else:
        print("使い方: audio-transcribe.command をダブルクリック")
    _finish()


def _finish() -> None:
    print()
    input("Enterで閉じる...")


if __name__ == "__main__":
    main()
