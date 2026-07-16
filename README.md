# CRPC AI環境ツール

随時更新（2026-07-16 時点）

東京大学医学部附属病院 臨床研究推進センター（CRPC）メンバー向けの配布リポジトリ。
Claude Code のスキルと補助ツールを `git pull` で常に最新版に保てる。

## 構成

- **CRPC固有** — セットアップ用インストーラ、CRPC専用Skill（`skills/`）、Claude.ai用プロンプト（`prompts/`）。
- **汎用スキル** — `vendor/claude-toolkit`（submodule）として取り込む。一覧・使い方・依存関係は [claude-toolkit](https://github.com/utokyo-crpc/claude-toolkit) のREADMEを参照（このリポジトリでは再掲しない）。

## セットアップ

### 初回

1. クローン（初回のみ）

   ```
   git clone --recursive https://github.com/utokyo-crpc/crpc-tools.git
   ```

2. インストーラをダブルクリック
   - Mac：`install.command`
   - Windows：`install.bat`

   汎用スキルの取得（submodule）・Python等の確認・Gemini APIキー設定まで自動で行う（`--recursive` を付け忘れても取得される）。

### Gemini API キー

音声文字起こしスキル（`transcribe-meeting`）に使う。インストーラ実行時に貼り付ける。

1. Google AI Studio でキーを発行：https://aistudio.google.com/apikey
2. 「Create API key」→ 表示されたキー（`AIza...`）をコピー
3. インストーラを実行して貼り付け

紛失時は同じページで再生成できる。使用量は Google AI Studio 左メニューの「Usage」で確認できる。

## 更新

```
git pull
git submodule update --init --recursive
```

スキルが追加・更新されたらインストーラ（`install.command` / `install.bat`）を再実行する。

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
