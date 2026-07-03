# Pull Request 送り方ガイド

## 対象

このガイドは `utokyo-crpc/crpc-tools` リポジトリへの改善提案・バグ修正を、GitHub を使って送りたい方を対象とします。Git や GitHub を使ったことがない方でも、以下の手順で完結できます。

---

## 概要

Pull Request（PR）とは、「この変更をリポジトリに取り込んでください」という提案です。メールで差分ファイルを送る代わりに、GitHub 上で変更内容を共有・レビュー・マージできます。

---

## 事前準備

### 1. GitHub アカウントを作る

https://github.com でアカウントを作成します（メールアドレスがあれば無料で作れます）。

### 2. Git をインストールする

**Windows:**
https://git-scm.com/download/win から「Git for Windows」をダウンロードしてインストールします。

**Mac:**
ターミナルで以下を実行します（すでに入っている場合は何も起きません）。

```
git --version
```

入っていない場合は `xcode-select --install` を実行します。

### 3. Git に名前とメールを設定する

コマンドプロンプト（Windows）またはターミナル（Mac）で以下を実行します。

```
git config --global user.name "あなたの名前（例: Kosuke Kashiwabara）"
git config --global user.email "あなたのメールアドレス"
```

---

## 手順

### Step 1: リポジトリをフォークする

GitHub の crpc-tools ページ（https://github.com/utokyo-crpc/crpc-tools）を開き、右上の **Fork** ボタンをクリックします。

これで `あなたのアカウント名/crpc-tools` という自分専用のコピーが作られます。

### Step 2: フォークしたリポジトリをパソコンにクローンする

コマンドプロンプト（Windows）またはターミナル（Mac）で以下を実行します。`YOUR_NAME` は自分の GitHub アカウント名に置き換えてください。

```
git clone https://github.com/YOUR_NAME/crpc-tools.git
cd crpc-tools
```

### Step 3: ブランチを作る

変更作業用のブランチを作ります。ブランチ名は変更内容を短く表したもの（英数字・ハイフン）にします。

```
git checkout -b fix-japanese-filename
```

### Step 4: ファイルを編集する

`crpc-tools` フォルダ内のファイルを直接編集します。メモ帳・VS Code・その他任意のエディタで構いません。

### Step 5: 変更をコミットする

編集したファイルを保存したら、以下を実行します。

```
git add .
git commit -m "日本語ファイル名でのエラーを修正"
```

コミットメッセージは「何を変えたか」を一文で書きます。

### Step 6: フォークにプッシュする

```
git push origin fix-japanese-filename
```

### Step 7: Pull Request を作る

1. GitHub の自分のフォーク（`https://github.com/YOUR_NAME/crpc-tools`）を開きます
2. 「**Compare & pull request**」ボタンが表示されているのでクリックします
3. タイトルと説明を入力します
   - タイトル例：`日本語ファイル名で UnicodeEncodeError が発生する問題を修正`
   - 説明欄：何が問題で、どう直したかを書きます（調査結果・再現方法・確認結果など）
4. 「**Create pull request**」をクリックして送信します

---

## PR の説明欄に書くと良い内容

```
## 問題
〇〇のエラーが△△のときに発生する。

## 原因
□□という処理が××を想定していないため。

## 修正内容
・変更ファイル: audio-transcribe.py
・変更箇所: upload_and_transcribe 関数内の files.upload 呼び出し
・変更内容: パス文字列をファイルオブジェクトに変更

## 動作確認
日本語ファイル名（会議録音テスト.wav）で実行し、正常に文字起こしされることを確認した。
```

---

## 提案後の流れ

1. PR が届くとリポジトリ管理者（齋藤）に通知が届きます
2. 内容を確認してコメント・修正依頼・マージのいずれかが行われます
3. マージされると変更が本体リポジトリに取り込まれます
4. `git pull` を実行したメンバー全員に変更が届きます

---

## よく使うコマンド早見表

| コマンド | 意味 |
|---|---|
| `git clone <URL>` | リポジトリをダウンロード |
| `git checkout -b <名前>` | 新しいブランチを作って移動 |
| `git add .` | 変更ファイルをステージに追加 |
| `git commit -m "メッセージ"` | コミット（変更を記録） |
| `git push origin <ブランチ名>` | GitHub にアップロード |
| `git pull` | 最新版を取得 |

---

## 困ったときは

GitHub Issues（https://github.com/utokyo-crpc/crpc-tools/issues）または齋藤俊樹（CRPC センター長）にご連絡ください。
