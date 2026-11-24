#!/usr/bin/env python3
"""CRPC の Box（東大の ut-crescent）に、box（vendor/claude-toolkit/tools/box）でログインする。

install.py から呼ばれる。ログイン済みなら何もしない。単独でも動く（python box_login.py）。

ログインには、東大の Box に作った CRPC メンバー用のアプリ「box (CRPC members)」（ID 2943417。
ファイルとフォルダの読み書きだけを持ち、管理の権限は無い）の Client ID と Client Secret を使う。
Client ID は公開してよい値なので、ここに書く。Client Secret はこのリポジトリが公開なので書かず、
CRPC のメンバーだけが開ける Box のファイルに置き、ログインのときに貼ってもらう。
Secret だけでは誰の Box にも入れない（ブラウザで本人の Box のログインと許可が要る）。
"""

import subprocess
import sys
from pathlib import Path

ACCOUNT = "utokyo"  # box のアカウント名。月次報告（monthly-report）もこの名前で呼ぶ
CLIENT_ID = "6atmpf94ze5nix9j3he90l04tvkh8jx5"
SECRET_URL = "https://ut-crescent.app.box.com/file/2612821446209"  # Projects/センター共通/AI活用/box-app-client-secret.txt
SCRIPT = Path(__file__).resolve().parent / "vendor" / "claude-toolkit" / "tools" / "box" / "box.py"


def box(*args, **kw):
    return subprocess.run([sys.executable, str(SCRIPT), *args], **kw)


def logged_in() -> str:
    """ログイン済みならログインしているアカウントのメールを、でなければ空を返す。"""
    r = box(ACCOUNT, "whoami", capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        return ""
    import json
    try:
        return json.loads(r.stdout).get("login", "")
    except ValueError:
        return ""


def main() -> None:
    print("── Box ──")
    if not SCRIPT.is_file():
        print("⚠️  vendor/claude-toolkit に box がありません。git submodule update --init --recursive を実行してください")
        return
    who = logged_in()
    if who:
        print(f"✅ Box: {who} でログイン済み")
        return
    if not sys.stdin.isatty():
        print("ℹ️  Box にログインしていません（install をダブルクリックで実行し直すとログインできます）")
        return
    print("Box（東大）にログインします。月次報告を Box に置くのと、Claude が Box のファイルを読むのに使います。")
    print("1. 次のリンクをブラウザで開き、中の1行（Client Secret）をコピーしてください（CRPC のメンバーだけが開けます）")
    print(f"   {SECRET_URL}")
    print("2. 下に貼り付けて Enter を押してください（貼っても文字は表示されません）")
    print("3. ブラウザに Box の画面が開くので、ご自分の東大のアカウントで「Boxへのアクセスを許可」を押してください")
    print()
    rc = box("login", ACCOUNT, "--client-id", CLIENT_ID).returncode
    who = logged_in() if rc == 0 else ""
    if who:
        print(f"✅ Box: {who} でログインしました")
    else:
        print("⚠️  Box にログインできませんでした。あとで install をもう一度実行してください（月次報告は手元に溜めて、ログイン後に置きます）")


if __name__ == "__main__":
    main()
