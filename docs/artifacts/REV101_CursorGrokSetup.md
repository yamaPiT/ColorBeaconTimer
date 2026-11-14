# (REV101) Cursor / Grok 読み替えレビュー記録表

【運用ルール】
1. 対象は、DADA キットを Cursor（エディタとクラウドエージェント）と Grok で使う案内を足した PR #6 である。
2. 指摘の修正は生成役が行う。本表のレビュー役は、このファイル以外を編集しない。成果物の本文は直さない。プルリクエストは新規に作らず、マージしない。
3. 指摘IDは G001 から付番する。重要度は High / Mid / Low。ステータスは Open / Closed。

## 今回のレビュー（Cursor / Grok 読み替え）

- **レビュー日**: 2026-11-14
- **レビュー担当**: 生成役とは別のエージェント。このファイル以外は編集していない。`dada_check.py` は `--no-report` で実行し、`docs/process/check_report.md` は書いていない。
- **対象**: ブランチ `cursor/dada-cursor-grok-setup-03f4`（PR #6、コミット `e11b774`）。比較の基点は `work/2026-11-12`（`562c91c`）。
- **正本**: https://github.com/yamaPiT/DADAProcess の README「他のツールで使う」。タグ `v6.1.0` のコミットは `ac2bf274b3868c498c4ea9f024ef4542b3178a8f` で、案内の版表記と一致する。Cursor の実行モードは https://cursor.com/docs/agent/security/run-modes を 2026-11-14 に読んだ。
- **指摘ID**: 本レビューの依頼に従い、既存の REV101 と同じ表で G001 から付番する。
- **総合判定**: **修正要**
- **根拠**: Open が 2 件（いずれも Mid）。High は 0 件。入口ファイルは正本への参照だけで、ルールとスキルの丸写しは無い。`.agents/`、`tools/`、`extension/`、承認済み文書は `work/2026-11-12` との差分に無い。禁止名称は追加差分に無い。直す必要があるのは、エディタに無い「Auto-Run」という設定名と、クラウドの生成役が自律型でも毎フェーズ承認を待つ文である。
- **件数**: 2 件（High 0 / Mid 2 / Low 0）。Open は 2 件。Closed は 0 件。

### 1. 上流の「他のツールで使う」との対応

上流は、ルールとスキルの本文をコピーせず、リポジトリ直下の案内から `.agents/AGENTS.md` と `.agents/skills/` を参照する、と書いている。Cursor の常時適用は、直下の `AGENTS.md` または `.cursor/rules/*.mdc` である。

この PR の `git diff --name-status work/2026-11-12...HEAD` は次の 3 パスだけである。

- `A` `.cursor/rules/dada.mdc`（11 行。正本のパスと、読み替えガイドのパスだけ）
- `M` `AGENTS.md`（読み替えガイドへのリンク 1 行と、既存文書を案内のために消さない旨の 1 文）
- `A` `docs/process/cursor_grok_setup.md`

`.agents/AGENTS.md` の本文、各 `SKILL.md`、`tools/` のスクリプトは、この差分に無い。`dada.mdc` は、開発依頼のときに `dada-process` を読むこと、Office 文書だけ・推敲だけ・ASDoQ の文書レビューだけは全工程を起動しないこと、を短く繰り返している。これは常時適用の入口として上流が求めている範囲であり、特別法の条文の複製ではない。

### 2. Antigravity 固有の記述と、Cursor / Grok での読み替え

`.agents/AGENTS.md`、`.agents/skills/` 配下の `SKILL.md` 17 件、`asdoq-reviewer` の C1 から C6 を検索した。Antigravity の製品名、`invoke_subagent`、`/swarm`、`workspace:"share"`、PDF の `read_file`、Thinking Level、`gemini-decision-1` は、案内の第2節から第5節の表に対応がある。

次は、案内の読み替えで足りている。

- 方式A/B/C は、サブエージェントを起動できるかで決める。Cursor に `invoke_subagent` は無い。渡してよい 5 点は `context-reset` の方式Aと一致する。
- `/swarm` は送らない。明示が無いときのレビューは、重点 2〜4 特性を順に読む。明示が無い並列起動はしない。
- `gemini-decision-1` はチャットのモデルではない。`tools/asdoq_lint.py` の `--decision1` の既定は `off`。キーの優先順は、環境変数、`.env.local`、`.env` である。スクリプトの `_resolve_gemini_api_key` と同じ順である。Grok のチャットへつなぎ替えない、と書いてある。
- Grok 4.7 の努力度 `low` / `medium` / `high` / `xhigh` は、Cursor のモデル説明にある。案内の第2節の対応表は、この 4 段と一致する。
- User Rules は Cursor のユーザー共通ルールとして残っている。`.cursor/mcp.json` はプロジェクトの MCP 設定として残っている。`use-context7-for-docs.md` は `.gitignore` にある。
- PDF の見た目は、構造を `office_io.py inspect` で見て、画像にしたページを Read で見る、と書いてある。Cursor の Read が読む画像は jpeg、png、gif、webp である。
- このリポジトリの `npm test` は `package.json` にあり、単体テストと Playwright である。
- タグ `v6.1.0` はコミット `ac2bf274` を指す。

G001 は、第3節の自動実行だけが、2026-11-14 時点の Cursor に無い名前を手順にしている。

### 3. 生成役、レビュー役、承認とマージ

第6節の表は、次のとおり書いている。この切り分けは依頼どおりである。

- 生成役が SW105、SWP6、SW205、ソースを書き、指摘の修正も生成役が行う。
- レビュー役は別のクラウドエージェントで、記録だけを書き、成果物の本文は直さない。
- 承認ゲートの承認と、プルリクエストのマージはマサが行う。エージェントはマージしない。

レビュー役の記録先は、`.agents/AGENTS.md` 第5節と同じである。要求は `REV101_Requirements.md`、総合テストは `REV101_Test.md`、設計は `REV101_Design.md`、コードレビューは `BUG101_バグ管理表.md` である。`code-reviewer` の記録先は BUG101 であり、案内はこれと一致する。

G002 は、表の直後の段落が、この切り分けを承認ゲート型以外にまで広げている箇所である。

### 4. 保護したパス

`git diff --name-only work/2026-11-12...HEAD` に、次は無い。

- `.agents/`
- `tools/`
- `extension/`
- `docs/artifacts/SW105_ソフトウェア要求仕様書.md`
- `docs/artifacts/SWP6_ソフトウェア総合テスト仕様書・報告書.md`
- `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`
- 既存の `REV101_Requirements.md`、`REV101_Test.md`、`REV101_Design.md`、`REV101_Code.md`、`REV101_TemplateSync.md`

追加と変更は、第1節の 3 パスだけである。

### 5. 禁止名称

SW105 第1.3節の禁止名称 4 文字列と、「円谷」「公認」「公式」を、`git diff work/2026-11-12...HEAD` の全文で探した。該当は 0 件である。SW105 自体はこの PR で変わっていない。

### 6. 機械チェック

実行は `python3`（この環境に `python` コマンドは無い）。`dada_check.py` は `--no-report` を付けた。

`python3 tools/dada_check.py all --summary --no-report` の終了コードは 0。

```text
DADA-CHECK: OK | High 0 / Mid 0 / 要確認 1 | 対象: SW105, SW205, SWP6
```

要確認 1 件は、SW205 の見出し「8.3 トレーサビリティ表（REQ ↔ UNIT）」である。ひな形の表題から出たトークン `（REQ ↔ UNIT）` が、見出しに部分一致している。見出しのあとの表は、REQ-001 から REQ-007 まで UNIT が入っている。この PR は SW205 を変更していない。要確認は終了コードを 1 にしない。指摘にはしない。

`python3 tools/asdoq_lint.py --input <ファイル> --profile general --decision1 off --summary` の結果は次である。High が 1 件以上のとき終了コードは 1 である。外部 API は呼んでいない。

| ファイル | High | Mid | 要確認 | 終了コード |
| :--- | ---: | ---: | ---: | ---: |
| `docs/process/cursor_grok_setup.md` | 3 | 0 | 2 | 1 |
| `AGENTS.md` | 2 | 0 | 0 | 1 |
| `.cursor/rules/dada.mdc` | 0 | 0 | 0 | 0 |

High は、いずれも RULE-107（「等」「など」）または RULE-108（「それ」）である。指摘の行には上げない。理由は次のとおり。

- 案内の 64 行目の「等」は、正本が Cursor などを順次実装の例にしている、という引用である。読み替えの動作は、そのセルで 1 ユニットずつ、と閉じている。
- 案内の 67 行目の「など」は、設計パターンの説明が Workflow 画面ではない、という注意の中にある。同じセルは、書いてある工程とパターンをそのまま読む、と閉じている。
- 案内の 115 行目の「など」は、`.agents/AGENTS.md` 第7節の承認の例（「承認します」「OK」「次へ進んで」）を写している。この行の欠陥は語の「など」ではなく、実行モードを分けていないことである。G002 で扱う。
- 直下 `AGENTS.md` の 13 行目の「など」は、この PR の差分に無い。第2節への参照であり、対象の列挙は `.agents/AGENTS.md` 第2節にある。
- 直下 `AGENTS.md` の 21 行目の「それ」は、直前に並べた `.agents/`、既存の `docs/`、`tools/` を指す。差分前の文も同じ指示語だった。

要確認 2 件も指摘にしない。3 行目は括弧で「エディタとクラウドエージェント」が Cursor に係り、Grok は別のモデルだと読める。60 行目の丸付き数字は、正本の節番号「第3節③」の引用である。番号を `(1)` に変えると、正本の見出しと一致しなくなる。

### 指摘にしなかったこと

- 直下 `AGENTS.md` の最終行は、既存の `docs/` と `tools/` を「Antigravity 向けの正本」と呼ぶ。上流は、開発文書と点検ツールはツールが違っても共通で、変わるのはルールとスキルの読み込み先だけ、と書く。案内の冒頭も、工程と `tools/` は Cursor でも同じ、と書く。最終行の「向け」は出自の説明で、続く文の意味は、案内を足すためにその 3 つを消さない、である。操作としては上流の「変えない」と一致する。文言の揺れだけでは指摘にしない。
- `docs/process/README.md` の動作モードは、Antigravity App / CLI の名が残っている。`docs/examples/prompts_usage.md` は `/grill-me` を送る例が残っている。どちらもこの PR の差分に無く、正本を書き換えない対象である。案内の第4節は、製品名を方式A/B/Cに読み替えること、`/grill-me` を壁打ちの起動文に読み替えることを、すでに書いている。
- 第6節 117 行目の「新しいクラウドエージェント（方式A）」は、同じ段落が方式Aで渡す情報を第4節と同じ 5 点に限っている。Cursor のクラウドエージェントは、実行の中でサブエージェントを起動できる。別のトップレベル実行を人が開く手順とは、この 5 点の制限で区別できる。役割の表と、レビュー役が記録のあと止まる文は、別エージェントにする運用として足りている。
- 第4節は、並列の明示があったとき、依存しない UNIT をサブエージェントに分ける、と書く。正本の `programmer` は、`/swarm` が無い Cursor では 1 ユニットずつ、と書く。上流の「他のツールで使う」は、他ツールではそのツールのサブエージェントか、順次実行で同じ工程を行う、と書く。明示が無いときの既定が 1 ユニットずつであることは、案内と正本で一致する。

### チェックポイント

| 項目 | 結果 | 根拠 |
| :--- | :--- | :--- |
| 案内が参照だけで、ルールとスキルを写していない | 合格 | 差分は 3 パス。`dada.mdc` は入口の 11 行 |
| `.agents/` の Antigravity 固有箇所 | 不合格（G001） | 方式、`/swarm`、PDF、`gemini-decision-1`、Grok の 4 段は対応する。自動実行の設定名だけが現行の画面に無い |
| 生成役とレビュー役の分離、マージはマサ | 不合格（G002） | 表と、レビュー役が記録だけで止まる文は足りている。115 行目が自律型の事前委譲を消している |
| `.agents/`、`tools/`、`extension/`、承認済み文書 | 合格 | `work/2026-11-12...HEAD` にこれらのパスは無い |
| 禁止名称、円谷、公認、公式 | 合格 | 差分の全文に 0 件 |
| `dada_check.py all` | 合格 | 終了コード 0。要確認 1 件は既存の見出しの誤検知 |
| 新規案内の `asdoq_lint.py` | 合格（指摘にしない） | High 3 は RULE-107。閉じた引用と、G002 の行である。`dada.mdc` は High 0 |

| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容 | 修正提案 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| G001 | 2026-11-14 | Mid | `docs/process/cursor_grok_setup.md` 第3節の表、設定 2（49 行目） | 【重要度: Mid】【ASDoQ: 4. 理解容易性（非曖昧性）】自律型で確認を省く手順が、「Cursor の Agent 設定で Auto-Run を有効にし、許可するコマンドに入れる」となっている。2026-11-14 に Cursor の Run Modes（https://cursor.com/docs/agent/security/run-modes）を読んだ。デスクトップの場所は Settings > Agents > Approvals & Execution で、モードは Auto-review、Allowlist、Run Everything の 3 つである。このページに Auto-Run という設定名は無い。Cursor 3.5（2026-05-22）で Ask Every Time は廃止され、新しい利用者は選べない。同じページは、Cloud Agents do not use Run Modes であり、クラウドエージェントは専用マシンで動き、操作のたびに承認を求めない、と書く。49 行目はエディタとクラウドを分けていない。許可リストはコマンドの前方一致であり、「作業ブランチ上の」という条件はリストの項目にならない。`permissions.json` のキー名 `autoRun` は、Auto-review の分類器へ渡す文面であり、Allowlist と Run Everything では効かない。このキーを Auto-Run の代わりに有効化しても、Antigravity の Turbo Mode と同じ動きにはならない。DADA の承認ゲートと自律ゲートを Auto-Run のあとにも残す、という後半は、工程の関門とコマンド確認が別である、という上流の注意と一致する。Antigravity の Security Preset（Turbo Mode）と Artifact Review Policy（Always Proceed）が Cursor に無い、と断っている部分も事実である。 | 49 行目を、エディタとクラウドで分ける。エディタでコマンド確認を残すときは、Approvals & Execution を Allowlist にし、許可リストを空にする（Cursor 3.5 以降の、以前の Ask Every Time に相当する）。自律型で確認を省くときは、同じ画面の Allowlist に、`python`、`python3`、`pytest`、`npm test`、`git status`、`git diff`、`git add`、`git commit` を入れる。すべてを確認なしにするなら Run Everything と書く。作業ブランチは、この設定を変える前に切る手順として、許可リストとは別の文にする。クラウドエージェントには Run Modes が無いので、Auto-Run も Allowlist も探さない、と書く。DADA の承認ゲートと自律ゲートは、どちらの実行場所でも残す文を維持する。`autoRun` キーは、確認を省くスイッチとして書かない。 |  | Open |
| G002 | 2026-11-14 | Mid | `docs/process/cursor_grok_setup.md` 第6節 115 行目。同節の表（96 行目から 98 行目）は、この指摘の対象外 | 【重要度: Mid】【ASDoQ: 3. 整合性（無矛盾性）】115 行目は、生成役がマサの明示の承認（「承認します」「OK」「次へ進んで」）があるまで次のフェーズへ進まない、と実行モードを付けずに書く。同じ案内の第1節は、起動文に「DADAプロセス自律型で進めてください」とあるときだけ自律型で、無いときは承認ゲート型、と書く。`.agents/AGENTS.md` 第10.2節は、その起動文を Phase 1〜4 の承認の事前委譲とし、毎フェーズの新しい「承認します」を待たない。第10.3節の 6 条件を満たすとき、自律ゲートで遷移する。115 行目をクラウドの生成役がそのまま実行すると、第1節で起動した自律型が、毎フェーズ停止する。96 行目から 98 行目の表は、承認ゲートでの承認とマージをマサに限っており、この表自体は分離の依頼と一致する。プルリクエストの作成までを生成役が行い、マージはマサが行う、という 115 行目の後半も、モードに関係なく維持できる。質問と部分的な同意を承認とみなさない定義は、承認ゲート型では第7節どおりである。 | 115 行目の「明示の承認があるまで進まない」を、承認ゲート型に限る。自律型は、起動文を Phase 1〜4 の事前委譲とし、`.agents/AGENTS.md` 第10.3節の自律ゲートで進む、と書く。質問と部分的な同意を承認とみなさない文は、承認ゲート型の判断として残す。マージをエージェントが行わない文は、承認ゲート型と自律型の両方に残す。117 行目は承認ゲート通過後の方式Aだけを書いている。自律ゲートの通過後も `context-reset` を行うことは、正本の義務のまま残し、115 行目の修正で消さない。 |  | Open |

レビュー完了: 指摘 2 件（High: 0 / Mid: 2 / Low: 0）。Open は 2 件。
REVIEW: **修正要**（根拠: G001 は現行の Cursor に無い Auto-Run を手順にしている。G002 はクラウドの自律型を毎フェーズの承認待ちにしている。High は 0 件）
