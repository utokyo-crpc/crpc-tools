# スキル

Claude Code 用スキル定義ファイル。`install.bat` / `install.command` 実行時に
`~/.claude/commands/` へ自動コピーされる。

| ファイル | スキル名 | 内容 |
|---------|---------|------|
| `transcribe-meeting.md` | `/transcribe-meeting` | 音声文字起こし（話者名指定・スライド参照対応） |

## 追加方法

新しいスキルを追加するには、このディレクトリに `.md` ファイルを置いてコミットする。
メンバーが `git pull` → `install.bat`（または `install.command`）を再実行すると自動インストールされる。
