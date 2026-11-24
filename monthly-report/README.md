# AI活用の月次報告

作成日：2026-11-13
改訂日：2026-11-25

## 1. 何をするか

各メンバーの端末で、前月の Claude Code の使い方を Claude が自動でまとめ、Box の `Projects/センター共通/AI活用/月次報告/<YYYY-MM>/<氏名>.md` に置く。報告は CRPC の業務メンバー全員が読める。人事評価には使わない。メンバーの手作業は、初回に install で氏名を入れることだけ。

## 2. 入れ方

crpc-tools を最新にして install.bat（Mac は install.command）を実行する。途中で「月次報告に使う氏名」を聞かれたら、漢字で空白なしに入れる（2回目以降は聞かれない）。これで毎日 10:00 の定期実行が登録される（Windows はタスク スケジューラの「CRPC AI活用 月次報告」、Mac は launchd の `jp.crpc.monthly-report`）。

- 要るもの：Claude Code、Node.js。Box は install が入れる box（`vendor/claude-toolkit/tools/box`、ログインは `box_login.py`）で置く。ログインしていなければ手元に置き、ログインした後の実行でまとめて置く
- 外すとき：`python monthly-report/register.py --off`

## 3. 動き

- 定期実行は毎日動き、前月の報告がまだ無ければ作る。同じ月は1回しか作らない。月初めに端末が起動していなかったときも、次に動いたときに作る
- 定期実行で作るのは 2026年11月分から
- 作り方：`collect.mjs` が `~/.claude/projects` の記録から、前月のプロジェクト（作業フォルダの名前）ごとの時間と依頼の数と、依頼の文の抜粋を集める。それを `prompt.md` の指示と一緒に、ツールを使えない `claude -p` に渡して報告を書かせる。抜粋は書き終えたら消す
- 載せる範囲と書き方の決まりは `prompt.md` が正本
- 手で動かすときは Claude Code で `/monthly-claude-report`（`--status` で状態を見る）
- 設定は `~/.config/crpc/monthly-report.json`、報告と記録（`run.log`）は `~/.config/crpc/monthly-report/`
- 報告を作る処理そのものはセッションの記録を残さない（`--no-session-persistence`）ので、翌月の報告に数えられない

### 3.1 複数の端末を使う人

- 各端末は自分の分を `月次報告/<YYYY-MM>/devices/<氏名>_<端末名>.md` に置く。端末名はその PC のホスト名
- どれかの端末が動いたとき、`devices/` にある同じ氏名の分をすべて読み、`claude -p` で1つにまとめて `月次報告/<YYYY-MM>/<氏名>.md` に置く。まとめ方の指示は `merge-prompt.md`。端末が1台なら、その分がそのまま `<氏名>.md` になる
- 使った日数は端末間の重なりを除いて数える。そのため端末の分の末尾に、載せたプロジェクトだけの集計（日はその月の何日目かのビット、セッション・時間・依頼の数）を HTML のコメントで付けている。依頼の文と日付の一覧は付けない
- `<氏名>.md` の Box の説明欄に、まとめた端末の分の指紋を書く。端末の分が増えたり作り直されたりして指紋が変わったときだけ、まとめ直す。前月の分は毎日確かめるので、後から動いた端末の分も数日のうちに入る
- 試験には環境変数 `CRPC_MONTHLY_HOME`（設定と状態の置き場）・`CRPC_MONTHLY_HOST`（端末名）・`CRPC_MONTHLY_BOX_PARENT`（置き先のフォルダ）を使う

## 4. 設計

なぜこの形にしたか（量は管理画面、中身は各端末、の切り分け）は、齋藤側の設計文書（utokyo の `CRPC/claude-adoption/usage-monthly-report-design.md`）にある。
