# DADAプロセス（Cursor 向け案内）

このファイルは入口だけです。ルール本文とスキル定義はコピーせず、次の正本を読んで従います。

- ルール: [`.agents/AGENTS.md`](.agents/AGENTS.md)
- スキル: [`.agents/skills/`](.agents/skills/) 配下の各 `SKILL.md`
- Antigravity 固有機能の読み替え（Cursor / Grok）: [`docs/process/cursor_grok_setup.md`](docs/process/cursor_grok_setup.md)

## 常時適用

ソフトウェアの新規開発、機能追加、修正、バグ対応を受けたら、作業の前に `.agents/AGENTS.md` を読み、そこに書かれた DADA プロセスをこのワークスペースの特別法として厳守する。工程の起動は `.agents/skills/dada-process/SKILL.md` を読んでから行う。

Office 文書の編集だけ、または日本語の推敲だけなど、開発工程を伴わない依頼は、`.agents/AGENTS.md` 第1節に従い、DADA の全工程を起動しない。

## スキル

`.agents/skills/` をそのまま使う。定義を `.cursor/` や別ディレクトリへ複製しない。使う直前に、該当する `SKILL.md` を読んでその手順に従う。

## 既存資産

`.agents/`、`docs/` の既存文書、`tools/` は Antigravity 向けの正本である。この案内を置くために、それらの内容を変更したり削除したりしない。Cursor と Grok 向けの読み替えは `docs/process/cursor_grok_setup.md` に書く。
