# (REV101) テンプレート同期レビュー記録表

【運用ルール】
1. 対象は、DADAプロセスのテンプレート由来ファイルを `ac2bf274b3868c498c4ea9f024ef4542b3178a8f` に合わせた PR #5 である。
2. 指摘の修正は生成担当が行う。本表のレビュー担当は、このファイル以外（成果物、拡張機能、テスト、工程の記録、README、LICENSE）を編集しない。
3. 指摘IDは K001 から付番する。重要度は High / Mid / Low。ステータスは Open / Closed。

## 今回のレビュー（テンプレート同期）

- **レビュー日**: 2026-11-14
- **レビュー担当**: 生成担当とは別のエージェント。このファイル以外は編集していない。`dada_check.py` は `--no-report` で実行し、`docs/process/check_report.md` は書いていない。
- **対象**: ブランチ `cursor/sync-dada-process-template-ebfb`（PR #5、コミット `7e28647`）。比較の基点は `work/2026-11-12`（`e9bb61b`）。
- **テンプレート**: https://github.com/yamaPiT/DADAProcess の `ac2bf274b3868c498c4ea9f024ef4542b3178a8f`。以前の取り込みは `f4cb35cefb444e8ca9ea1ed461b4ab9aa5889fc0`。レビュー担当がこのコミットを取得して比較した。
- **指摘ID**: 本レビューの依頼に従い K001 から付番する。該当する行は無い。
- **総合判定**: **APPROVED**
- **根拠**: 未解消の指摘は 0 件。テンプレートが `f4cb35c` 以降に変えたファイルは、空の REV101 ひな形 3 件と README を除き、`ac2bf27` とバイト一致する。製品固有のパスは、この PR で変わっていない。`node --test` は 33 件成功、`npx playwright test` は 31 件成功。
- **件数**: 0 件（High 0 / Mid 0 / Low 0）。Open は 0 件。Closed は 0 件。

### 1. テンプレート由来ファイルの照合

テンプレートの `f4cb35c..ac2bf27` は 45 パスである。この PR の `git diff --name-status work/2026-11-12...HEAD` は 42 パスである。差は次の 3 件だけで、この PR は触っていない。

- `docs/artifacts/REV101_Design.md`
- `docs/artifacts/REV101_Requirements.md`
- `docs/artifacts/REV101_Test.md`

テンプレート側のこの 3 件は、空の記録表だけが変わっている。差分の行数は、Design が追加 4 と削除 4、Requirements が追加 3 と削除 3、Test が追加 7 と削除 7 である。変わった文は、レビューする主体へレビュアーエージェントを足すこと、指摘分類を `[ASDoQ:特性-副特性]` にすること、ステータスの例へ Closed を足すことである。Design の記入例は D001、D002 から R001、R002 へ、Test の記入例は T001、T002 から R001、R002 へ変わっている。Requirements の記入例は R001、R002 のままである。指摘の本文は、テンプレート側にも入っていない。このリポジトリの 3 ファイルは、Phase 1 から Phase 3 の記入済み記録であり、`f4cb35c` の空ひな形とは既に違う。上書きすると、D001 から D005、R001 から R024、S001 から S005 の記録が消える。残した判断は正しい。取りこぼしにはしない。

45 パスからこの 3 件と README を除いた 41 パスは、次の両方を満たす。

- `work/2026-11-12` の内容が、テンプレート `f4cb35c` の同じパスと git の blob が一致する（この製品が先に手を入れた差分は無い）。
- HEAD の内容が、テンプレート `ac2bf27` の同じパスと blob が一致する（最新化のあと、文の追加や削除は無い）。

README だけは、どちらとも一致しない。`work/2026-11-12` の README は製品の説明書であり、テンプレート `f4cb35c` の README ではない。HEAD も、テンプレート `ac2bf27` の 1773 行の README では置き換えていない。`git diff work/2026-11-12...HEAD -- README.md` の変更は次の 4 か所だけである。

- 同梱キットの版として `ac2bf274b3868c498c4ea9f024ef4542b3178a8f` を書いた。
- キットの表の `.agents/` に `asdoq-reviewer` を書いた。
- キットの表の `tools/` に `asdoq_lint.py` を書いた。
- ライセンス節の第三者著作物 2 項目に、`tools/asdoq_dictionary.json`、`.agents/skills/asdoq-reviewer/`、`tools/style_check.py` を足した。

テンプレート README の `f4cb35c..ac2bf27` は 762 行増、272 行減である。中身は、DADAProcess テンプレート自身の使い方（Antigravity の設定、Gemini Decisions API、`/swarm`、スキルの切り出し）である。製品の README へ全文を移すと、開発状況とクレジットが消える。移していない判断は正しい。キットの存在とライセンスの対象ファイルは、上の 4 か所で追えている。

テンプレートにあり、このリポジトリに無いパスは 0 件である。テンプレートが `f4cb35c` 以降に削除したパスも 0 件である。共有パスのうち、`ac2bf27` とバイトが違うのは 8 件である。README と REV101 の 3 件は上に書いた。残る 4 件は、テンプレートが `f4cb35c` 以降に変えておらず、この PR も変えていない。

- `.gitignore`（違いは Playwright の 3 行だけ。下記）
- `docs/artifacts/TM101_トレーサビリティマトリクス.md`
- `docs/process/impl_progress.md`
- `docs/process/last_phase_summary.md`

### 2. 製品固有のパスが変わっていないこと

`git diff --name-only work/2026-11-12...HEAD` に、次のパスは無い。

- `docs/artifacts/` のうち、この PR より前からある文書（SW105、SWP6、SW205、TM101、REV101_Requirements、REV101_Test、REV101_Design、REV101_Code、BUG101、`docs/artifacts/README.md`）
- `extension/`
- `tests/`
- `package.json`、`package-lock.json`、`playwright.config.js`
- `docs/process/last_phase_summary.md`、`docs/process/impl_progress.md`
- ルートの `AGENTS.md`
- `.gitignore`

README の見出し「開発状況」から「目的」の直前までと、見出し「クレジット」から「開発プロセス」の直前までは、`work/2026-11-12` と HEAD で一致する。クレジット節には、AS17-148-22727、4400×4600、SHA-256 `94d529d4338a5e9a227a5f4cacf332e89c180c5414d185ee7eb0c48a61a5a7e5`、パブリックドメイン（public domain）、「VOICEVOX:四国めたん」が残っている。

`.gitignore` とテンプレート `ac2bf27` の差は、末尾の次の 3 行だけである。テンプレートは `.gitignore` を `f4cb35c` 以降に変えていない。この PR の diff にも `.gitignore` は無い。

```text
# Playwright
node_modules/
test-results/
playwright-report/
```

この PR で変わったパスは、すべてテンプレートにもある。製品だけが持つパスの変更は 0 件である。

### 3. LICENSE、クレジット、禁止名称

HEAD の `LICENSE` は、テンプレート `ac2bf27` の `LICENSE` と SHA-256 が一致する（`4a9eb57c89dd818b6239401b393d48e2fa13303deab9428f3c7e1e2448f64e07`）。`work/2026-11-12` の `LICENSE` は、テンプレート `f4cb35c` と一致していた。今回の差分は、テンプレートの差分そのものである。

- 著作権者は Copyright (c) 2026 YAMAMOTO Masaki (yamaPiT) のままである。
- 追加した表示は、ASDoQ の対象に `tools/asdoq_dictionary.json` と `.agents/skills/asdoq-reviewer/` を足したこと、JP-Humanizer の対象に `tools/style_check.py` を足したこと、参考文献（逆瀬川、IPA の ESPR、Anthropic、IEEE Std 29148-2018）、同梱しない外部パッケージと外部 API の 4 節である。
- MIT の説明文は、対象をワークスペースルール、スキル定義、テンプレート、検証スクリプト一式と書いている。

この文は、地球の写真と掛け声のファイルを MIT だと宣言していない。写真の出典と「VOICEVOX:四国めたん」は、README の見出し「クレジット」に残っている。SW205 の OQ-1 と OQ-2 が指定した置き場は、その節とストア掲載文である。LICENSE に同じ出典本文を足していないことは、その決定と矛盾しない。

禁止名称は、SW105 第1.3節の 4 文字列である。「ウルトラマン」、「Ultraman」、「三面星人ダダ」、「Sanmen Seijin Dada」。英字は大文字と小文字を区別しない。加えて「円谷」を見た。この PR で追加した 10 ファイル（`asdoq-reviewer` の SKILL.md と C1 から C6、`scratch/test_asdoq_reviewer.py`、`tools/asdoq_dictionary.json`、`tools/asdoq_lint.py`）に、この 5 つは無い。`git diff work/2026-11-12...HEAD` の全文にも無い。

### 4. scratch/test_asdoq_reviewer.py の TC-021

`python3 scratch/test_asdoq_reviewer.py` は 15 件中 14 件が成功し、1 件が失敗した。失敗は `test_tc021_export_skillset_readme_env_and_clean_terms` の 473 行目である。README に `https://aistudio.google.com/docs/models/gemini-decision-1` が無い。この時点で止まり、同じメソッドの後半は実行されていない。後半は、同じ URL をあと 3 つ、`16. **モデルの思考レベル`、`17. **Antigravity `/swarm``、スキルセットの切り出しと `agent_def_check.py` である。

この失敗の判断は妥当である。根拠は次のとおり。

- テストファイルはテンプレート `ac2bf27` とバイト一致する。製品向けに期待値を緩めていない。
- テンプレートの README には、上の URL 4 つと、項目 16 と 17 がある。このテストは、テンプレート自身の README を改訂したあとに使う検査である。`scratch/README.md` も、このディレクトリをテンプレートの改訂向けと書いている。
- このリポジトリの README は製品の説明書である。テンプレート版に戻すと、開発状況、機能の説明、地球の写真の出典、「VOICEVOX:四国めたん」が消える。SW105 と SW205 は、出典本文を README のクレジット節に置くと決めている。

失敗を放置する影響は、製品の `npm test` には及ばない。`.github` のワークフローは無く、このファイルを製品のゲートにしていない。影響があるのは、このファイルをまとめて実行したときの終了コードが 1 になることと、473 行目より後ろの検査が、その実行では走らないことである。`.env.example` の 3 つの API キー名と、`.gitignore` の `.env`、`.env.*`、`!.env.example` は、473 行目より前にあり、今回の失敗の前に通過している。

レビュー担当が、473 行目より後ろと同じ検査を、ファイルを変えずに別実行した。4 スキルセットの切り出し、切り出し先の README と `.env.example` の旧表記、`style_check.py` と `office_io.py` の同梱、`agent_def_check.py` の skill と command は、いずれも終了コード 0、High 0 / Mid 0 だった。失敗が隠している切り出しの欠陥は、今回は無い。

対応案は、この PR では採用しない。README をテンプレート版に戻さない。テストファイルをこのリポジトリだけ直すと、次のテンプレート同期で再び分岐する。直すなら DADAProcess 側で、README の URL と項目 16、17 の検査を、切り出しの検査から分ける。このリポジトリでは、`scratch/test_asdoq_reviewer.py` を製品の合否に使わない。

### 5. dada_check の要確認 1 件と asdoq_lint

`python3 tools/dada_check.py all --summary --no-report` の結果は次である。終了コードは 0。

```text
DADA-CHECK: OK | High 0 / Mid 0 / 要確認 1 | 対象: SW105, SW205, SWP6
```

要確認の全文は次である。

```text
- [要確認] docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md: スケルトンのプレースホルダが残っている可能性: （REQ ↔ UNIT）
```

これは誤検知である。`tools/dada_check.py` の `skeleton_placeholders` は、ひな形の本文行から括弧書きを集める。見出し行は集めない。新しい `SW205_skeleton.md` の 125 行目は見出しではなく、`表3：トレーサビリティ表（REQ ↔ UNIT）` である。ここからトークン `（REQ ↔ UNIT）` が出る。照合は文書全文への部分一致である。承認済み SW205 の 726 行目の見出し `### 8.3 トレーサビリティ表（REQ ↔ UNIT）` が、そのトークンを含む。726 行目のあとの表は、REQ-001 から REQ-007 まで UNIT が入っている。空の見本ではない。`dada_check.py` 自体は `f4cb35c` 以降に変わっていない。トークンの供給元が、新しいひな形の表題の行に変わった。

要確認は終了コードを 1 にしない。`.agents/skills/dada-process/SKILL.md` の遷移条件は、`dada_check.py` の終了コードが 0 であることである。この 1 件は、Phase 5 の開始を止めない。SW205 の見出しを、この PR で直す必要は無い。次に `all` を実行しても、同じ 1 件が出る。レビューする人は、上の理由で「問題なし」と判断すればよい。

`python3 tools/asdoq_lint.py --decision1 off --summary` を、承認済みの 3 文書に実行した。終了コードは、High が 1 件以上のとき 1、High が 0 のとき 0 である。

| 文書 | プロファイル | High | Mid | 要確認 | 終了コード |
| :--- | :--- | ---: | ---: | ---: | ---: |
| SW105 | sw105 | 4 | 27 | 25 | 1 |
| SWP6 | swp6 | 0 | 23 | 23 | 0 |
| SW205 | sw205 | 1 | 20 | 24 | 1 |

High の内訳は次のとおり。この PR が文書へ足した文字ではない。

- SW105 の 30 行目、RULE-107。対象外の「通知（OS 通知、バッジ、メール等）」の「等」。実装する対象の列挙が欠けている行ではない。
- SW105 の 315 行目から 317 行目、RULE-702。改版履歴の「TBD-a」などの識別子に、部分文字列 `TBD` が一致している。第7章の表では TBD-a から TBD-i は解決済みである。未決定のまま残している行ではない。
- SW205 の 667 行目、RULE-702。見出し `### 8.2 SWP6のTBD解消` の `TBD`。続く表は、テストフレームワーク以下を確定した内容で埋まっている。

`dada_check.py all` は、この 5 行を High にも Mid にもしていない。新しい辞書の部分一致が、承認済みの識別子と見出しに当たっている。

Mid の大半は、RULE-605（「の」の連続）と RULE-606（「を」の重複）である。SW205 の 117 行目から 130 行目の Mermaid は、ノードが U001 から U012 の 12 個である。`STRUCT-MERMAID-NODES` が Mid で「12 nodes」と出る。新しい上限は 10 個である。この図は、上限が無かったときの承認済み設計である。Mid は `asdoq_lint.py` の終了コードを変えない。

扱いの判断は次のとおり。この PR では、承認済みの SW105、SWP6、SW205 を直さない。Phase 5 は、`.agents/skills/dada-process/SKILL.md` の Phase 5 が、人間の動作評価であり、SWP6 の第5章と第6章を人間が追記する工程ではない、と書いている。遷移の機械条件は `dada_check.py` の終了コードであり、`asdoq_lint.py` の終了コードではない。したがって、上の High と Mid は、Phase 5 の評価そのものを止めない。

報告書の更新についても、この PR は新しい障害を足していない。`python3 tools/dada_check.py report --summary --no-report` は、終了コード 1、High 17、Mid 0、要確認 0 である。内訳は、第6.2節の総合判定と、手動の TC-005、TC-010、TC-011、TC-012、TC-014、TC-028、TC-029、TC-030、TC-035、TC-036、TC-039、TC-041、TC-045、TC-053、TC-057、TC-061 である。SWP6 はこの PR で変わっていない。Phase 4 の REV101_Code が、同じ 17 件を指摘にしなかったときの状態のままである。SWP6 に対する `asdoq_lint.py` は High 0 で終了コード 0 である。バグ修正で Phase 4 に戻り、SWP6 の第5章と第6章だけを更新するとき、`asdoq_lint.py` の High はこの 3 文書のうち SWP6 には出ない。

次に SW105 または SW205 を改訂するループでは、`asdoq_lint.py` が同じ High で終了コード 1 を返す。そのときは、上の 5 行を新しい欠陥として文面を開かない。識別子 `TBD-a`、解決済みの履歴、見出しの語、対象外の「メール等」は、辞書の一致であって未決事項ではない。新しい図を書くときは 10 ノード以下にする。既にある 12 ノードの図は、設計を変える要件が無い限り、この同期のついでに分割しない。

### 6. 自分で実行したテスト

実行 OS は Linux 6.12.113+ x86_64。`python` ではなく `python3`（Python 3.12.3）を使った。Node.js は v22.23.4。

- `node --test tests/unit/*.test.js` は 33 件すべて pass。失敗 0、skip 0。所要は 129 ミリ秒。
- `npx playwright test` は 31 件すべて pass。失敗 0、skip 0。所要は 7.5 分。終了コード 0。ブラウザは Playwright が入れた Chrome for Testing 158.0.8127.18（chromium v1254、linux64）。`playwright.config.js` は channel を指定していない。この設定ファイルは、この PR で変わっていない。
- `python3 scratch/test_asdoq_reviewer.py` は 15 件中 14 件が pass、TC-021 が 1 件失敗。終了コード 1。第4節の判断どおり、製品の欠陥にはしない。

### チェックポイント

| 項目 | 結果 | 根拠 |
| :--- | :--- | :--- |
| テンプレート `ac2bf27` への最新化 | 合格 | 変更 45 パスのうち 41 パスは blob が一致。README は製品の説明を残した差分。空の REV101 3 件は記入済みのため残した |
| 余計な変更と古いキットの残り | 合格 | 41 パスは `f4cb35c` から `ac2bf27` への置換だけ。テンプレートに無い追加と、削除漏れは 0 件 |
| 製品固有のパス | 合格 | `git diff work/2026-11-12...` に、成果物、extension、tests、package.json、playwright.config.js、工程記録、ルート AGENTS.md、.gitignore は無い |
| README の開発状況とクレジット | 合格 | 二つの節は `work/2026-11-12` と一致する |
| LICENSE | 合格 | テンプレートと SHA-256 が一致。著作権者は YAMAMOTO Masaki。VOICEVOX と NASA の出典本文は README のクレジット節のまま |
| 禁止名称と「円谷」 | 合格 | 追加 10 ファイルと、この PR の diff 全文に 0 件 |
| TC-021 を失敗のままにする判断 | 合格 | README をテンプレート版にしない判断は妥当。切り出しの後半は別実行で pass。製品の npm test は対象外 |
| dada_check の要確認 1 件 | 合格（誤検知） | 見出しの `（REQ ↔ UNIT）` が、ひな形の表題と部分一致する。表は埋まっている。終了コード 0 |
| asdoq_lint の High と Mid | 合格（この PR では直さない） | SW105 の High 4 と SW205 の High 1 は、識別子と対象外の「等」と見出しである。SWP6 は High 0。Phase 5 のゲートは dada_check の終了コード |
| node:test と Playwright | 合格 | 33 件と 31 件が pass。失敗 0、skip 0 |

| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容 | 修正提案 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

指摘は 0 件。上の表に行は無い。

レビュー完了: 指摘 0 件（High: 0 / Mid: 0 / Low: 0）。Open は 0 件。
REVIEW: **APPROVED**（根拠: 未解消の指摘 0 件。テンプレート由来の取りこぼしと製品固有ファイルの変更は無く、node:test 33 件と Playwright 31 件は成功）
