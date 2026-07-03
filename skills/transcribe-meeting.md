# transcribe-meeting

音声ファイル1つから以下の3ファイルを自動生成するスキル。すべて音声ファイルと同じフォルダに出力する。

| ファイル | 内容 |
|---------|------|
| `<stem>_transcript.txt` | 話者名付きトランスクリプト（原文） |
| `<stem>_verbatim.txt` | ケバ取り版（フィラー除去・全内容保持） |
| `<stem>_summary.md` | 凝縮版（重複排除・小見出し付き段落再構成） |

## 使い方

```
/transcribe-meeting
```

引数なしで起動し、対話形式で情報を収集して処理を進める。

## Step 1: 情報収集

以下の情報をユーザーから収集する。

| 項目 | 必須 | 説明 |
|------|------|------|
| 音声ファイルパス | ○ | `.m4a` / `.mp3` / `.wav` 等 |
| 発表者リスト（発表順） | △ | 苗字のみ。例：「川上, 三谷, 鹿毛」。省略時は話者A/B のまま |
| 質問者氏名 | △ | デフォルト: 齋藤。発表者リストを省略した場合は不要 |
| スライドファイル | △ | PDF 推奨。話者推定精度が上がる |

出力先は音声ファイルと同じフォルダに固定（確認不要）。情報が揃ったら確認なしで処理を開始する。

## Step 2: 文字起こし

GEMINI_API_KEY が未設定なら先に `source ~/.zshrc` を実行する。

PPT ファイルが渡された場合は先に PDF 変換を試みる：

```bash
libreoffice --headless --convert-to pdf --outdir /tmp/ <ppt_file>
```

文字起こしを実行する（音声ファイルを丸ごと送信→品質不良時に自動分割）：

```bash
python3 ~/Projects/ai-environment/scripts/audio-transcribe.py \
    <audio_file> --output <stem>_transcript.txt
```

## Step 3: 話者ラベルの整形

Gemini が話者名と発言内容を別行に分けることがある。以下のスクリプトで1行に統合する：

```python
import re
path = '<stem>_transcript.txt'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()
speaker_only = re.compile(r'^(話者[A-Z]|齋藤|川上|三谷|鹿毛|[^\s:]{1,6}):\s*$')
result = []
i = 0
while i < len(lines):
    if speaker_only.match(lines[i]) and i + 1 < len(lines):
        name = lines[i].rstrip()
        content = lines[i + 1].rstrip('\n')
        result.append(f"{name} {content}\n")
        i += 2
    else:
        result.append(lines[i])
        i += 1
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(result)
```

## Step 4: 話者推定・置換

発表者リストが提供された場合のみ実施。省略された場合はこの Step をスキップする。

スライドと文字起こしを読み込み、各チャンク（`## Part N`）の 話者A/B と実際の発表者を対応づける。

推定の手がかり（優先順）：
1. 明示的な呼びかけ — 「○○先生？」のやりとり
2. スライド内容との照合 — 研究テーマ・薬剤名・固有名詞
3. 第三者呼称 — 「三谷先生と一緒に」と言えばその人は三谷ではない
4. 人称・文体 — 「私の研究は」→ 発表者、「どういう病態？」→ 質問者

各パートの対応が決まったら Python で一括置換し、Part ヘッダーと区切りを除去する：

```python
import re
PART_MAPPING = {
    # 例: 1: {'話者A': '齋藤', '話者B': '川上'},
}
path = '<stem>_transcript.txt'
with open(path, encoding='utf-8') as f:
    content = f.read()
parts = re.split(r'(?=## Part \d+)', content)
result = []
for section in parts:
    m = re.match(r'## Part (\d+)', section)
    if m:
        mapping = PART_MAPPING.get(int(m.group(1)), {})
        for speaker, name in mapping.items():
            section = section.replace(f'{speaker}:', f'{name}:')
    result.append(section)
content = ''.join(result)
content = re.sub(r'\n*---\n*', '\n', content)
content = re.sub(r'\n*## Part \d+ — [^\n]+\n*', '\n', content)
content = content.strip() + '\n'
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
```

確信度が低い箇所は `[要確認: 推定 ○○]` と残す。

## Step 5: ケバ取り版の生成

`<stem>_transcript.txt` を読み込み、以下のルールで処理して `<stem>_verbatim.txt` に書き出す。

- 内容の要約や省略は厳禁。すべての事実、意見、情報を漏れなく含める
- 削除してよいもの：フィラー（えー、あのー、そのー、えっと、あの、まあ（文頭の意味のない使用）、なんか（意味のない使用）など）と明らかな言い淀み（同じ語の直後の繰り返し）のみ
- 話者ラベル（`齋藤:` 等）と発言順序は保持する
- 各発言は `話者名: 発言内容` の1行形式を維持する

処理後に Write ツールで `<stem>_verbatim.txt` に書き出す。

## Step 6: 凝縮版の生成

`<stem>_transcript.txt` を読み込み、以下のルールで処理して `<stem>_summary.md` に書き出す。

- 発言の本質（事実、意見、意思決定、背景）を完全に保ちつつ、重複や冗長な表現を排除する
- 具体的な数値、固有名詞、技術的課題、提案内容などの「情報」を省略することは厳禁
- 口語特有の繰り返し、言い直し、無意味な相槌、冗長な説明を削ぎ落とし、事務的で洗練された文章に再構成する
- 断片的な発言を文脈ごとに一貫性のある段落として統合する（発言者が混在してよい）
- 話題の切り替わりごとに `##` レベルの小見出しを付ける
- 話者名は段落冒頭または文中で自然に示す（例：「川上より：...」「齋藤が指摘：...」）
- 意味のない相槌のみの行は削除する

処理後に Write ツールで `<stem>_summary.md` に書き出す。

## Step 7: 完了報告

3ファイルが生成されたことを確認し、以下を報告する：

- 各ファイルのパスと行数
- 話者対応表（Step 4 を実施した場合）
- `[要確認]` マークがある場合はその箇所

```bash
open <stem>_transcript.txt
open <stem>_verbatim.txt
open <stem>_summary.md
```

## セットアップ

```bash
# スキルのインストール（初回のみ）
bash ~/Projects/ai-environment/scripts/link-dotfiles.sh

# Gemini API キーの設定（初回のみ）
open ~/Projects/ai-environment/scripts/gemini-setup.command
```
