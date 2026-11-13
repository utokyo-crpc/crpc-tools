#!/usr/bin/env python3
"""AI活用の月次報告の定期実行を登録する（Windows はタスク スケジューラ、Mac は launchd）。

install.py と install.command から呼ばれる。何度実行しても同じ状態になる。

  python register.py            氏名を聞き（初回だけ）、設定を書き、毎日 10:00 の定期実行を登録する
  python register.py --off      定期実行を外す（設定と報告は残す）

定期実行は毎日動くが、run.mjs が同じ月の報告を1回しか作らない。月初めに端末が起動していなかったときも、
次に動いたときに前月の分を作る。
"""

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONF_DIR = Path.home() / ".config" / "crpc"
CONF = CONF_DIR / "monthly-report.json"
TASK = "CRPC AI活用 月次報告"
LABEL = "jp.crpc.monthly-report"


def which(*names):
    for n in names:
        p = shutil.which(n)
        if p:
            return p
    return ""


def npm_root():
    npm = which("npm.cmd", "npm") if platform.system() == "Windows" else which("npm")
    if not npm:
        return ""
    try:
        return subprocess.run([npm, "root", "-g"], capture_output=True, text=True, timeout=60).stdout.strip()
    except Exception:
        return ""


def box_config():
    root = npm_root()
    run = Path(root) / "@box" / "cli" / "bin" / "run" if root else None
    if run and run.is_file():
        return {"run": str(run)}
    cmd = which("box.cmd", "box") if platform.system() == "Windows" else which("box")
    return {"cmd": cmd} if cmd else {}


def load():
    try:
        return json.loads(CONF.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save(conf):
    CONF_DIR.mkdir(parents=True, exist_ok=True)
    CONF.write_text(json.dumps(conf, ensure_ascii=False, indent=2), encoding="utf-8")


def register_windows(node):
    # 日本語のタスク名・引数は PowerShell のスクリプトをファイルに書いてから渡す（引数で渡すと崩れる）
    ps1 = CONF_DIR / "register-monthly-report.ps1"
    script = f"""
$action = New-ScheduledTaskAction -Execute '{node}' -Argument '"{HERE / "run.mjs"}"' -WorkingDirectory '{HERE}'
$trigger = New-ScheduledTaskTrigger -Daily -At 10:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName '{TASK}' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
"""
    ps1.write_text(script, encoding="utf-8-sig")
    shell = which("pwsh", "powershell")
    r = subprocess.run([shell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1)], capture_output=True, text=True)
    ps1.unlink(missing_ok=True)
    return r.returncode == 0, (r.stderr or r.stdout).strip()


def unregister_windows():
    ps1 = CONF_DIR / "unregister-monthly-report.ps1"
    ps1.write_text(f"Unregister-ScheduledTask -TaskName '{TASK}' -Confirm:$false -ErrorAction SilentlyContinue\n", encoding="utf-8-sig")
    subprocess.run([which("pwsh", "powershell"), "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1)], capture_output=True)
    ps1.unlink(missing_ok=True)


def plist_path():
    return Path.home() / "Library" / "LaunchAgents" / f"{LABEL}.plist"


def register_mac(node):
    path_env = os.pathsep.join(dict.fromkeys(
        [str(Path(node).parent), str(Path(load().get("claude") or "/usr/local/bin/claude").parent),
         "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]))
    log = CONF_DIR / "monthly-report" / "launchd.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>{LABEL}</string>
  <key>ProgramArguments</key><array><string>{node}</string><string>{HERE / "run.mjs"}</string></array>
  <key>WorkingDirectory</key><string>{HERE}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>{path_env}</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>{log}</string>
  <key>StandardErrorPath</key><string>{log}</string>
</dict></plist>
"""
    p = plist_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    uid = os.getuid()
    subprocess.run(["launchctl", "bootout", f"gui/{uid}/{LABEL}"], capture_output=True)
    p.write_text(plist, encoding="utf-8")
    r = subprocess.run(["launchctl", "bootstrap", f"gui/{uid}", str(p)], capture_output=True, text=True)
    return r.returncode == 0, r.stderr.strip()


def unregister_mac():
    subprocess.run(["launchctl", "bootout", f"gui/{os.getuid()}/{LABEL}"], capture_output=True)
    plist_path().unlink(missing_ok=True)


def main():
    system = platform.system()
    if "--off" in sys.argv:
        unregister_windows() if system == "Windows" else unregister_mac()
        print("✅ AI活用の月次報告の定期実行を外しました")
        return

    print("── AI活用の月次報告 ──")
    claude = which("claude.exe", "claude.cmd", "claude") if system == "Windows" else which("claude")
    if not claude:
        local = Path.home() / ".local" / "bin" / ("claude.exe" if system == "Windows" else "claude")
        claude = str(local) if local.exists() else ""
    node = which("node.exe", "node") if system == "Windows" else which("node")
    if not claude or not node:
        print("ℹ️  Claude Code か Node.js が見つからないので、月次報告の定期実行は登録しません")
        return

    conf = load()
    if not conf.get("name"):
        if not sys.stdin.isatty():
            print("ℹ️  氏名を聞けないので、月次報告の定期実行は登録しません（install をダブルクリックで実行し直してください）")
            return
        try:
            name = input("月次報告に使う氏名を漢字で入力してください（例：齋藤俊樹。空白なし）: ").strip().replace(" ", "").replace("　", "")
        except EOFError:
            name = ""
        if not name:
            print("ℹ️  氏名が空なので、月次報告の定期実行は登録しません")
            return
        conf["name"] = name
    conf.update({"claude": claude, "node": node, "box": box_config(), "repo": str(HERE.parent)})
    save(conf)

    ok, err = register_windows(node) if system == "Windows" else register_mac(node)
    if ok:
        print(f"✅ 毎日 10:00 に前月の報告が済んでいるかを確かめ、無ければ作って Box に置きます（氏名：{conf['name']}）")
        if not conf["box"]:
            print("   Box CLI が見つからないため、報告は手元（~/.config/crpc/monthly-report/reports）に置きます")
    else:
        print(f"⚠️  定期実行を登録できませんでした：{err[:300]}")


if __name__ == "__main__":
    main()
