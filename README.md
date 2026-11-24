# CRPC AI環境ツール

作成日：2026-07-03
改訂日：2026-11-25

東京大学医学部附属病院 臨床研究推進センター（CRPC）メンバー向けの配布リポジトリ。
Claude Code のスキルと補助ツールを `git pull` で常に最新版に保てる。

## 構成

- **CRPC固有** — セットアップ用インストーラ、CRPC専用Skill（`skills/`）、Claude.ai用プロンプト（`prompts/`）。
- **汎用スキル** — `vendor/claude-toolkit`（submodule）として取り込む。一覧・使い方・依存関係は [claude-toolkit](https://github.com/utokyo-crpc/claude-toolkit) のREADMEを参照（このリポジトリでは再掲しない）。

## セットアップ

### 初回

1. 置きたいフォルダへ移ってからクローンする（初回のみ）。`crpc-tools` というフォルダがその中にできる。例は、ホームの `Projects` に置く場合

   ```
   mkdir -p ~/Projects
   cd ~/Projects
   git clone --recursive https://github.com/utokyo-crpc/crpc-tools.git
   ```

2. インストーラを動かす
   - Mac：Finder で `install.command` をダブルクリックする。ターミナルから動かすときは、`crpc-tools` のフォルダで `./install.command` と打つ（先頭の `./` が要る。`install.command` だけでは「command not found」になる）
   - Windows：エクスプローラーで `install.bat` をダブルクリックする

   汎用スキルの取得（submodule）・Python等の確認・Box（東大）へのログイン・Gemini APIキー設定まで自動で行う（`--recursive` を付け忘れても取得される）。Box のログインでは、画面に出るリンクを開いて中の1行をコピーし、貼り付けてから、ブラウザでご自分の東大のアカウントで許可する（`box_login.py`）。Box CLI（`box` コマンド）を入れていた人は、同じ名前で衝突するので外す（`npm uninstall -g @box/cli`）

### 個人の PC に入れる場合

Claude Code の設定と会話の記録は、PC のユーザーごとに `~/.claude`（Windows は `%USERPROFILE%\.claude`）に置かれる。個人の用途でも Claude Code を使っている PC にそのまま入れると、CRPC 用のスキル・設定と個人の会話の記録が同じ場所に混ざる。個人の PC に入れるときは、CRPC の仕事用に PC のユーザーを別に作り、そのユーザーでクローンとインストールを行う。

### Gemini API キー

音声文字起こしスキル（`transcribe-meeting`）に使う。無料枠内で利用でき、クレジットカード登録は不要。

1. ブラウザで https://aistudio.google.com/api-keys を開き、g.ecc アカウントでログイン
2. 「**Create API key**」→ ダイアログで既存プロジェクトは選ばず必ず「**+ Create project**」を選択（既存プロジェクトを使うと課金・権限設定が混在するおそれがある）
3. 表示されたキー（`AQ.` で始まる文字列）をコピー
4. **g.ecc（Workspace）アカウントでは追加で API 有効化が必要**：キー一覧のプロジェクトID（例 `gen-lang-client-...`）を控え、`https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=<プロジェクトID>` を開いて「Enable」をクリック（「Manage」と表示されていれば有効化済みなので不要）
5. インストーラ（`install.command`／`install.bat`）を実行し、貼り付ける。後から設定・更新したい場合はインストーラを再実行すればよい

紛失時は同じページで再生成できる。使用量は Google AI Studio 左メニューの「Usage」で確認できる。

## 更新

```
git pull
git submodule update --init --recursive
```

そのあとインストーラ（`install.command` / `install.bat`）を再実行する。何度実行しても問題ない。上流で追加されたスキル・規約は配置され、**廃止されたものは端末から撤去される**。自分で書き換えたファイルは残す。

## Claude の自動メモリ

Claude Code は、作業の中で知ったこと（各自の好みや注意点）を自動でメモに残し、次のセッションで読み込む（auto memory）。メモは端末ごとのフォルダ（`~/.claude/projects/<作業フォルダ>/memory/`）にあり、ほかの端末とは同期されず、ほかの人からも見えない。

- 既定のまま使ってよい。1台の PC で使う人にとっては、Claude が各自の好みを覚える手軽な手段になる
- CRPC で共通の規則は、このリポジトリで配るものを正とし、メモには頼らない
- 複数の端末を使う人や、自分の `CLAUDE.md` を git で管理している人は、止めてもよい。メモが端末ごとに食い違い、git で管理する指示と同じことを二重に持ちやすいためである。止めるには `~/.claude/settings.json`（Windows は `%USERPROFILE%\.claude\settings.json`）に `"autoMemoryEnabled": false` を足す。止めてもメモのファイルは消えないので、残したい中身は自分の `CLAUDE.md` などへ移しておく

## ディレクトリ構成

```
crpc-tools/
├── install.command / install.bat / install.py   # セットアップ
├── skills/                # CRPC専用Skill（追加方法は skills/README.md）
├── prompts/               # Claude.ai 用プロンプト（追加方法は prompts/README.md）
└── vendor/claude-toolkit/ # 汎用スキル集（submodule。詳細は claude-toolkit）
```

## 問い合わせ

齋藤俊樹（CRPC センター長）または GitHub Issues
