# CRPC AI環境ツール

随時更新（2026-07-03 時点）

東京大学医学部附属病院 臨床研究推進センター（CRPC）メンバー向けのAIツール・スキル一式。
`git pull` で常に最新版に更新できる。

## 収録ツール

| ツール | 内容 |
|--------|------|
| 音声文字起こし | 会議録音から議事録3種（原文・ケバ取り・要約）を自動生成 |

## セットアップ

### Windows

1. このリポジトリをクローン（初回のみ）

   ```
   git clone https://github.com/utokyo-crpc/crpc-tools.git
   ```

2. `install.bat` をダブルクリック

   Python のインストール確認・Gemini API キー設定まで自動で行う。

### Mac

1. このリポジトリをクローン（初回のみ）

   ```
   git clone https://github.com/utokyo-crpc/crpc-tools.git
   ```

2. `install.command` をダブルクリック

   Python・Homebrew のインストール確認・Gemini API キー設定まで自動で行う。

## 更新

```
git pull
```

スキルが追加・更新された場合は `install.bat`（Windows）または `install.command`（Mac）を再実行する。

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
python audio-transcribe.py 録音.m4a
python audio-transcribe.py 録音.m4a --gui     # ダイアログで選択
python audio-transcribe.py 録音.m4a --split   # 最初から分割モード
```

### Claude Code スキル

`/transcribe-meeting` — 対話形式で話者名指定・スライド参照ができる高精度版。
セットアップ時に自動インストールされる。

## ディレクトリ構成

```
crpc-tools/
├── install.bat              # セットアップ（Windows）
├── install.command          # セットアップ（Mac）
├── install.py               # セットアップ本体
├── audio-transcribe.bat     # 音声文字起こし（Windows）
├── audio-transcribe.command # 音声文字起こし（Mac）
├── audio-transcribe.py      # スクリプト本体
├── skills/                  # Claude Code スキル
│   └── transcribe-meeting.md
└── prompts/                 # Claude.ai 用プロンプト
    └── README.md
```

## トークン使用量の確認

Gemini API の使用量は Google AI Studio で確認できる。
https://aistudio.google.com/

左メニューの「Usage」から月間使用量・無料枠の残量を確認できる。

## 問い合わせ

齋藤俊樹（CRPC センター長）または GitHub Issues
