# スキル

CRPC固有・単体ファイル形式のClaude Codeスキルを置く場所。`install.bat` / `install.command` 実行時に `~/.claude/commands/` へ自動コピーされる。

現在このディレクトリは空。saito-la（家族）とも共有している汎用スキル（`transcribe-meeting`・`markdown-export`・`markdown-to-gdocs`）は `vendor/claude-toolkit/skills/` に移設し、`~/.claude/skills/` へディレクトリごとインストールされる（[claude-toolkit](https://github.com/utokyo-crpc/claude-toolkit)を参照）。

## 追加方法

CRPC専用（他組織と共有しない）スキルを追加するには、このディレクトリに `.md` ファイルを置いてコミットする。
メンバーが `git pull` → `install.bat`（または `install.command`）を再実行すると自動インストールされる。

複数組織で使い回せる汎用スキルは、代わりに [claude-toolkit](https://github.com/utokyo-crpc/claude-toolkit) リポジトリ側に追加する。
