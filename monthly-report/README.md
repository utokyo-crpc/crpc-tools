# AI活用の月次報告

作成日：2026-11-13
改訂日：2026-11-13

## 1. 何をするか

各メンバーの端末で、前月の Claude Code の使い方を Claude が自動でまとめ、Box の `Projects/センター共通/AI活用/月次報告/<YYYY-MM>/<氏名>.md` に置く。報告は CRPC の業務メンバー全員が読める。人事評価には使わない。メンバーの手作業は、初回に install で氏名を入れることだけ。

## 2. 入れ方

crpc-tools を最新にして install.bat（Mac は install.command）を実行する。途中で「月次報告に使う氏名」を聞かれたら、漢字で空白なしに入れる（2回目以降は聞かれない）。これで毎日 10:00 の定期実行が登録される（Windows はタスク スケジューラの「CRPC AI活用 月次報告」、Mac は launchd の `jp.crpc.monthly-report`）。

- 要るもの：Claude Code、Node.js。Box CLI（`box login` 済み）があれば Box に置き、無ければ手元に置いて、入れた後の実行でまとめて置く
- 外すとき：`python monthly-report/register.py --off`

## 3. 動き

- 定期実行は毎日動き、前月の報告がまだ無ければ作る。同じ月は1回しか作らない。月初めに端末が起動していなかったときも、次に動いたときに作る
- 定期実行で作るのは 2026年11月分から
- 作り方：`collect.mjs` が `~/.claude/projects` の記録から、前月のプロジェクト（作業フォルダの名前）ごとの時間と依頼の数と、依頼の文の抜粋を集める。それを `prompt.md` の指示と一緒に、ツールを使えない `claude -p` に渡して報告を書かせる。抜粋は書き終えたら消す
- 載せる範囲と書き方の決まりは `prompt.md` が正本
- 手で動かすときは Claude Code で `/monthly-claude-report`（`--status` で状態を見る）
- 設定は `~/.config/crpc/monthly-report.json`、報告と記録（`run.log`）は `~/.config/crpc/monthly-report/`
- 報告を作る処理そのものはセッションの記録を残さない（`--no-session-persistence`）ので、翌月の報告に数えられない

## 4. 設計

なぜこの形にしたか（量は管理画面、中身は各端末、の切り分け）は、齋藤側の設計文書（utokyo の `CRPC/claude-adoption/usage-monthly-report-design.md`）にある。
