# CRPC AI環境ツール

随時更新（2026-07-16 時点）

東京大学医学部附属病院 臨床研究推進センター（CRPC）メンバー向けのAIツール・スキル一式。
`git pull` で常に最新版に更新できる。

音声文字起こし等の汎用スキルは [claude-toolkit](https://github.com/utokyo-crpc/claude-toolkit)（`vendor/claude-toolkit`、saito-la家族とも共有）から取り込んでいる。

## 収録ツール

| ツール | 内容 |
|--------|------|
| 音声文字起こし | 会議録音から議事録3種（原文・ケバ取り・要約）を自動生成 |
| markdown-export（Claude Codeスキル） | markdown → Word(.docx) / PDF 変換 |
| markdown-to-gdocs（Claude Codeスキル） | markdown/docx → Google Docs アップロード＋体裁適用（要・自分のGoogle Cloud OAuthセットアップ、上級者向け） |
| mcp-setup（Claude Codeスキル） | Claude CodeへのMCPサーバー接続・セットアップ手順を案内 |
| format-prompt（Claude Codeスキル） | 粗いプロンプトを7ブロックの型に整形 |
| interest-profile（Claude Codeスキル） | 会話履歴からユーザーの興味プロファイルを生成・更新 |
| meishi-rename（Claude Codeスキル） | 名刺スキャンPDFのファイル名をOCR結果から整形 |
| person-research（Claude Codeスキル） | 人物調査URLからレジストリを横断調査し根拠付きレポートを作成 |
| ステータスライン | Claude Codeのターミナル下部に使用状況（コンテキスト・レート制限・作業フォルダ・アカウント）を表示 |
| schedule-reply（Claude Codeスキル） | 日程調整メール(tonton/調整さん)にGoogleカレンダーの空きで自動回答（要・個別セットアップ、上級者向け） |

## セットアップ

### Windows

1. このリポジトリをクローン（初回のみ）

   ```
   git clone --recursive https://github.com/utokyo-crpc/crpc-tools.git
   ```

2. `install.bat` をダブルクリック

   共通スキルの取得（submodule）・Python のインストール確認・Gemini API キー設定まで自動で行う（`--recursive` を付け忘れても自動で取得される）。

### Mac

1. このリポジトリをクローン（初回のみ）

   ```
   git clone --recursive https://github.com/utokyo-crpc/crpc-tools.git
   ```

2. `install.command` をダブルクリック

   共通スキルの取得（submodule）・Python・Homebrew のインストール確認・Gemini API キー設定まで自動で行う（`--recursive` を付け忘れても自動で取得される）。

## 更新

```
git pull
git submodule update --init --recursive
```

スキルが追加・更新された場合は `install.bat`（Windows）または `install.command`（Mac）を再実行する（submoduleの取得もあわせて行われる）。

## Gemini API キーの取得

1. Google アカウントで Google AI Studio にアクセス
   https://aistudio.google.com/apikey

2. 「Create API key」をクリック

3. 表示されたキー（`AIza...`）をコピー

4. `install.bat`（または `install.command`）を実行してキーを貼り付ける

キーを紛失した場合は同じページで再生成できる。

## ツールの使い方

### 音声文字起こし

**Windows:** `audio-transcribe.bat` をダブルクリック

**Mac:** `audio-transcribe.command` をダブルクリック

ファイル選択ダイアログが開くので、録音ファイル（`.m4a` / `.mp3` / `.wav`）を選択する。
完了すると同じフォルダに3ファイルが生成される。

| ファイル | 内容 |
|---------|------|
| `*_transcript.txt` | 話者名付きトランスクリプト（原文） |
| `*_verbatim.txt` | ケバ取り版（フィラー除去・全内容保持） |
| `*_summary.md` | 要約版（重複排除・小見出し付き） |

**コマンドライン（任意）:**

```bash
SCRIPT=vendor/claude-toolkit/skills/transcribe-meeting/scripts/audio-transcribe.py
python3 $SCRIPT 録音.m4a
python3 $SCRIPT 録音.m4a --gui     # ダイアログで選択
python3 $SCRIPT 録音.m4a --split   # 最初から分割モード
```

### Claude Code スキル

`/transcribe-meeting` — 対話形式で話者名指定・スライド参照ができる高精度版。
セットアップ時に自動インストールされる（`~/.claude/skills/transcribe-meeting/`）。

### 日程調整メール自動回答

上級者向け。Google Calendar/Gmailへの書き込み・自動送信を伴うため `install.bat`/`install.command` では
SKILL.md自体のコピーのみ行われる。導入する場合は `vendor/claude-toolkit/skills/schedule-reply/scripts/README.md`
に沿って自分の `config.json`（氏名・除外条件・認証情報）を作成してから使う。

## ディレクトリ構成

```
crpc-tools/
├── install.bat              # セットアップ（Windows）
├── install.command          # セットアップ（Mac）
├── install.py               # セットアップ本体
├── audio-transcribe.bat     # 音声文字起こし（Windows）
├── audio-transcribe.command # 音声文字起こし（Mac）
├── skills/                  # CRPC固有スキル（現在は空。追加方法は skills/README.md）
├── vendor/claude-toolkit/   # saito-laとも共有する汎用ツール集（submodule）
│   ├── skills/
│   │   ├── markdown-export/
│   │   ├── markdown-to-gdocs/
│   │   ├── transcribe-meeting/   # 音声文字起こし本体はここ
│   │   ├── mcp-setup/
│   │   ├── format-prompt/
│   │   ├── interest-profile/
│   │   ├── meishi-rename/
│   │   ├── person-research/
│   │   └── schedule-reply/       # 日程調整メール自動回答（要・個別セットアップ、上級者向け）
│   └── tools/statusline/         # ステータスライン本体はここ
└── prompts/                 # Claude.ai 用プロンプト
    └── README.md
```

## トークン使用量の確認

Gemini API の使用量は Google AI Studio で確認できる。
https://aistudio.google.com/

左メニューの「Usage」から月間使用量・無料枠の残量を確認できる。

## 問い合わせ

齋藤俊樹（CRPC センター長）または GitHub Issues
