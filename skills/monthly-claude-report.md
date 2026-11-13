---
description: AI活用の月次報告（この端末の Claude Code の使い方を月1回まとめ、Box の Projects/センター共通/AI活用/月次報告 に置く）を、手で作り直す・置き直す・状態を見る。「月次報告を作って」「月次報告の状態を見て」「月次報告が Box に置けていない」と言われたときに使う。ふだんは定期実行が自動で行うので呼ばなくてよい。
argument-hint: "[--status | --month YYYY-MM [--force] | --no-upload]"
---

# monthly-claude-report

AI活用の月次報告は、crpc-tools の install.bat（Mac は install.command）が登録した定期実行が、毎日 10:00 に前月の分を確かめて自動で作り、Box に置く。このコマンドは、その同じ処理を手で動かすためのもの。仕組みと載せる範囲は crpc-tools の `monthly-report/README.md`。

1. 設定ファイル `~/.config/crpc/monthly-report.json` の `repo`（crpc-tools の場所）を読む。無ければ「install.bat（Mac は install.command）をもう一度実行してください」と伝えて終える
2. `node "<repo>/monthly-report/run.mjs" $ARGUMENTS` を実行する。引数が無ければ前月の分を作り（作ってあれば作らない）、まだ置いていない報告を Box に置く
   - `--status`：設定と、作った・置いた月の一覧
   - `--month YYYY-MM --force`：その月を作り直して置き直す
   - `--no-upload`：作るだけで Box に置かない
3. 出力の最後の数行を、そのまま日本語で要約して伝える。作った報告のパスを示し、中身を見たいと言われたら Read で開く

報告の中身を手で直したいときは、`~/.config/crpc/monthly-report/reports/<YYYY-MM>/<氏名>.md` を直してから、`node "<repo>/monthly-report/run.mjs" --month <YYYY-MM>` ではなく、Box の同じファイルに新しい版として上げる（`box files:upload <パス> --parent-id <月のフォルダID> --overwrite`）。
