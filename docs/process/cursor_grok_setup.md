# Cursor と Grok で DADA キットを使う

同梱の DADA キット（v6.1.0、取り込みコミット `ac2bf274`）は Google Antigravity App 向けです。工程、開発文書、`tools/` の点検スクリプトは、Cursor でも同じものを使います。このファイルは、Cursor（エディタとクラウドエージェント）とモデル Grok で動かすときの読み替えです。

ルール本文とスキル定義の正本は `.agents/AGENTS.md` と `.agents/skills/` です。ここには写しません。`.agents/` は書き換えません。

入口はリポジトリ直下の `AGENTS.md` と、常時適用の `.cursor/rules/dada.mdc` です。どちらも正本への参照だけを持ちます。

## 1. Cursor エディタでの起動

1. このリポジトリを Cursor で開きます。
2. チャットのモデルを Grok にします。深さの目安は次節です。
3. Agent の新しいチャットで、次を送ります。

```text
DADAプロセスで開発を開始してください。
```

エージェントは `AGENTS.md` と `.cursor/rules/dada.mdc` から `.agents/AGENTS.md` を読み、`.agents/skills/dada-process/SKILL.md` に進みます。指定がなければ、従来型プログラム、承認ゲート型、実行プロファイル Guided です。

要求の壁打ちから始めるときは、次を足します。

```text
DADAプロセスで開発を開始してください。最初に、要求の壁打ちをするので手伝ってください。
```

完成まで任せるときは、起動文に「DADAプロセス自律型で進めてください」と書きます。書かれていなければ承認ゲート型です。

## 2. 推論の深さ（Antigravity の Thinking Level）

Antigravity の Thinking Level（`low` / `medium` / `high` / `xhigh`）は、Cursor で Grok を選ぶときの推論の深さに読み替えます。スキルはモデル名を固定していません。チャットのモデルを Gemini には切り替えません。

| 作業 | Grok の深さ |
| :--- | :--- |
| 台帳の更新、整形、点検結果の転記 | low または medium |
| 要求の壁打ち、アーキテクチャ設計、反証レビュー | high または xhigh |

`asdoq-reviewer` が「思考レベル切り替え対応モデルでは `high` を推奨」と書いている箇所も、Grok の high 以上に読み替えます。

`gemini-decision-1` はチャット用のモデル名ではありません。`tools/asdoq_lint.py` が、明示したときだけ呼ぶ判定用 API です。呼び出し方は第5節です。

## 3. Antigravity の設定 1〜6

上流の DADAProcess README「Antigravity App の各種設定（1〜6）を他のツールで行う方法」に沿い、このリポジトリでは次のようにします。

| 設定 | Cursor / Grok での扱い |
| :--- | :--- |
| 1. Git、3. Python 3.8 以降と拡張パッケージ | ツール共通です。手順は変えません。クラウドエージェントの実行環境には Git と Python があります。エディタでは、ターミナルで `git --version` と `python --version` が通ることを確認します。日本語の形態素解析を使うときは `pip install janome` です。未導入でも `asdoq_lint.py` は標準ライブラリへフォールバックします。 |
| 2. 自動実行ポリシー | 承認ゲート型は、コマンドの確認を残したままで構いません。自律型で確認を省くときは、Cursor の Agent 設定で Auto-Run を有効にし、許可するコマンドに `python`、`pytest`、`npm test`、作業ブランチ上の `git status` / `git diff` / `git add` / `git commit` を入れます。Antigravity の Security Preset（Turbo Mode）と Artifact Review Policy（Always Proceed）という画面項目はありません。DADA の承認ゲートと自律ゲートは、Auto-Run をオンにしても残します。 |
| 4. Global Rules（基本法） | 名前、日本語、ワークスペースルールの優先は、Cursor の User Rules に書きます。Antigravity の `~/.gemini/config/skills/global/SKILL.md` は使いません。DADA 固有の原則はリポジトリの `.agents/AGENTS.md` にあり、User Rules へは写しません。このリポジトリでは Product Owner をマサと呼びます。 |
| 5. context7 | 任意です。使うときは、Cursor の MCP 設定、または `.cursor/mcp.json` に context7 を登録します。API キーはチャットや Git に書きません。未設定でも DADA の工程は進みます。`context7-mcp` スキルは、接続できないとき「未調査」と書いて打ち切ります。`.gitignore` にある `use-context7-for-docs.md` は Antigravity 向けのローカルルール名です。Cursor 用に作りません。 |
| 6. Gemini Decisions API | ツール共通です。第5節のとおり、プロジェクト直下の `.env.local` に `GEMINI_API_KEY` を書きます。Grok がチャットを担当していても、`tools/asdoq_lint.py` の動きは変わりません。 |

## 4. `.agents/` にある Antigravity 固有の記述

次の表が、正本を改めずに読むときの対応です。左は正本の場所、右は Cursor と Grok での動作です。

| 正本の場所 | 正本に書いてあること | Cursor / Grok では |
| :--- | :--- | :--- |
| `.agents/AGENTS.md` 第3節③ | サブエージェント起動ツール `invoke_subagent` がある Antigravity App / CLI は方式A。Antigravity IDE は、承認ゲート型なら方式B、自律型なら方式C | ツール名 `invoke_subagent` は使いません。Cursor がサブエージェントを起動できるときは方式A（ツール自動）です。起動できないチャットでは、承認ゲート型は方式B（マサが新しいチャットを開く）、自律型は方式C（同一チャットで `docs/process/last_phase_summary.md` を書き、承認済み文書だけを読み直す）です。製品名が曖昧なときは、サブエージェントを起動できるかどうかだけで決めます。 |
| `.agents/skills/context-reset/SKILL.md` の Step 2 と方式A/B/C | 上と同じ三方式。方式Aの起動名は `invoke_subagent` | 方式Aで渡してよいのは、ペルソナスキルのパス、`docs/process/last_phase_summary.md` を読む指示、承認済み文書のパス、出力先、マサが明示した指示の原文です。チャットの要約は渡しません。 |
| `.agents/skills/dada-process/SKILL.md` の「フェーズ実行の方式」 | 環境表が Antigravity App / CLI / IDE だけ | 表の製品名は、上の方式A/B/Cに読み替えます。進行表示の「ツール自動/人間作成」は、サブエージェントを起動できるとき「ツール自動」、できないとき「人間作成」です。 |
| `.agents/skills/asdoq-reviewer/SKILL.md` の `/swarm` | Antigravity の `/swarm`、ワーカーの思考レベル `high`、他ツールでは `invoke_subagent` か特性の順次切り替え | `/swarm` というコマンドはありません。明示がないときは、重点 2〜4 特性を一つのチャットで順に読みます。マサが並列を明示したときだけ、特性ごとにサブエージェントを分けるか、同じチャットで C1〜C6 を順に適用します。深さは Grok の high 以上です。明示なしの並列起動はしません。 |
| `.agents/skills/dada-process/SKILL.md` の共通レビュー手順と Phase 4、`.agents/skills/programmer/SKILL.md` の手順3 | `/swarm` と `workspace:"share"` による並列実装。Cursor 等では 1 ユニットずつ、と既に書いてある | 通常は 1 ユニットずつ実装します。並列の明示があっても `workspace:"share"` は使いません。SW205 上で互いに依存しない UNIT だけをサブエージェントに分け、台帳の更新と統合は生成役が行います。 |
| `.agents/skills/office-document/SKILL.md` | PDF の見た目を Antigravity の `read_file` で確認する | 構造の確認は `python tools/office_io.py inspect --input <PDF> --summary` です。見た目は Cursor のブラウザでその PDF を開いて確認します。ページを画像に書き出した場合は、Cursor の Read でその画像を見ます。 |
| `.agents/skills/programmer/SKILL.md`、`.agents/skills/test-engineer/SKILL.md`、`.agents/skills/architect/SKILL.md` | 「手動」のテストを、AI がブラウザや GUI のツールで実施する | Antigravity の画面操作は使いません。Cursor のブラウザで操作するか、このリポジトリの自動テスト（リポジトリ直下の `npm test`、Playwright）で観測します。期待値と照合できない好みは、これまでどおり Phase 5 に残します。 |
| `.agents/skills/dada-process/SKILL.md` の見出し「標準開発ワークフロー」、`.agents/skills/architect/SKILL.md` の「ワークフロー」 | 工程の名前、および Prompt Chaining などの設計パターン | Antigravity の Workflow 画面やワークフローファイルではありません。工程と設計パターンの説明として、書いたとおりに読みます。リポジトリ内に Antigravity 用のワークフロー定義ファイルはありません。 |
| 上流 README のコツ10（`.agents/` にはスラッシュコマンドの定義が無い） | `/goal`、`/grill-me`、`/swarm` | `/goal` は送りません。承認ゲート型はゲートで止まります。自律型は起動文で指示します。`/grill-me` は「最初に、要求の壁打ちをするので手伝ってください」です。`/swarm` は上の行のとおりです。 |

`gemini-decision-1` と `--decision1` は、`.agents/AGENTS.md` 第2節・第7節、`asdoq-reviewer`、`dada-process` のレビュー手順、`requirements-reviewer`、`test-reviewer`、`architecture-reviewer` に出てきます。どれもチャットモデルの指定ではありません。第5節のまま実行します。

## 5. ツールは共通のまま

`tools/` は変更しません。Cursor からも、これまでと同じコマンドを実行します。`python` が無い環境では `python3` で同じスクリプトを起動します。

- 文書と実装の形式チェック: `python tools/dada_check.py all --summary`
- Phase 4 の報告書チェック: `python tools/dada_check.py report --summary`
- ASDoQ の機械検査: `python tools/asdoq_lint.py --input <対象.md> --profile <sw105|swp6|sw205|general>`
- 日本語の推敲検査: `python tools/style_check.py`
- Office 文書と PDF: `python tools/office_io.py`

`asdoq_lint.py` の `--decision1` の既定は `off` です。オフのときは外部へ通信せず、ローカルの辞書と規則で選別します。マサが `--decision1 on` を明示したときだけ、次の順で `GEMINI_API_KEY` を読みます。

1. 環境変数 `GEMINI_API_KEY`
2. プロジェクト直下の `.env.local`
3. プロジェクト直下の `.env`

`.env.local` と `.env` は Git の管理外です。キーの文字列は、チャット、ログ、成果物に書きません。キーが無くても、既定の `--decision1 off` と Grok による反証レビューで工程は進みます。Grok を使っているからといって、このスクリプトを別の API へつなぎ替えません。

## 6. Cursor クラウドエージェントでの役割

エディタの一つのチャットが作成とレビューを順に行う手順は、スキルに書いてあるとおりです。クラウドエージェントでは、生成とレビューを別のエージェントに分けます。

| 役割 | 誰がやるか | すること |
| :--- | :--- | :--- |
| 生成役 | クラウドエージェント | SW105、SWP6、SW205、ソースコードを書く。レビュー記録の指摘を直すのも生成役 |
| レビュー役 | 別のクラウドエージェント | 指摘を記録するだけ。成果物の本文は直さない |
| 承認とマージ | マサ | 承認ゲートで承認する。プルリクエストをマージする |

レビュー役が書いてよいファイルは、記録表だけです。

- 要求: `docs/artifacts/REV101_Requirements.md`
- 総合テストの計画と報告書: `docs/artifacts/REV101_Test.md`
- 設計: `docs/artifacts/REV101_Design.md`
- ソースコード: `docs/artifacts/BUG101_バグ管理表.md`（`code-reviewer` の記録先。ソースは変更しない）

レビュー役の起動例です。

```text
あなたは DADA のレビュー役です。docs/process/cursor_grok_setup.md に従い、対象文書をレビューしてください。指摘は REV101 または BUG101 に記録するだけにして、成果物は修正しないでください。
```

スキルが「レビューのあと作成スキルへ差し戻して修正する」と書いている箇所は、クラウドでは次のように読みます。レビュー役は記録を書いて止まります。修正は、別の実行の生成役が、記録表を読んで行います。同じエージェントが、レビューの直後に成果物を書き換えません。

生成役は、マサの明示の承認（「承認します」「OK」「次へ進んで」など）があるまで、次のフェーズへ進みません。質問や部分的な同意は承認ではありません。プルリクエストを作るところまでは生成役が行ってよく、マージはマサが行います。エージェントはマージしません。

承認ゲートを通過したあとのリセットは、`context-reset` に従い `docs/process/last_phase_summary.md` を書いたうえで、次フェーズ用の新しいクラウドエージェント（方式A）を起動します。渡す情報は第4節の方式Aと同じです。

## 7. この案内を置いても変えないもの

- `.agents/` のルールとスキル
- `docs/artifacts/` の承認済み文書（SW105、SWP6、SW205、REV101）
- `docs/` の既存のひな形とガイドライン
- `tools/` と `extension/`
