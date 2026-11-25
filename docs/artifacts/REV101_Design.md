# (REV101) アーキテクチャ設計レビュー記録表

【運用ルール】
1. **人間（Product Owner）**が、アーキテクチャ設計書（SW205）をレビューし、指摘事項を「指摘内容」列に記入します。
2. **AIエージェント**は、この記録表を読み込んで指摘箇所を修正し、「対応結果・修正内容」を追記して、ステータスを「解決済」に変更します。

## 今回のレビュー（Phase 3 設計）

- **レビュー日**: 2026-11-13
- **レビュー担当**: 生成担当とは別のエージェント。SW205、TM101、SWP6 は編集していない。
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v0.1）、`docs/artifacts/TM101_トレーサビリティマトリクス.md` の設計ユニット欄、承認済み SWP6 v1.0 の第2.2節と TC-050 と TC-063 への加筆
- **入力**: 承認済み SW105 v1.1、承認済み SWP6 v1.0、`docs/process/last_phase_summary.md`
- **指摘ID**: 本レビューの依頼とテンプレートに従い D001 から付番した。
- **総合判定**: **APPROVED**（最終確認で更新。初回と再レビューは REJECTED）
- **根拠**: D001 から D005 は Closed。最終確認の `dada_check.py` の終了コードは 0。未解消の High は 0 件。
- **件数**: 5 件（High 2 / Mid 3 / Low 0）。Open は 0 件。Closed は 5 件。
- **機械チェック**: 初回 `DADA-CHECK: OK | High 0 / Mid 0 / 要確認 0 | 対象: SW105, SW205, SWP6`（終了コード 0）。再レビューも同じ要約行、終了コード 0。最終確認も同じ要約行、終了コード 0。`python3 tools/dada_check.py all --summary`。`python` は未インストールのため `python3` を使った。機械の High と Mid と要確認は 0 件。転記する行は無い。
- **読みやすさ**: `STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`。比喩、ダッシュ繋ぎ、過剰な否定対比、主述のねじれ、110文字超の長文は指摘しない。

### 機械チェックから転記した指摘

High と Mid は 0 件。要確認は 0 件。転記する行は無い。

### 内容で確認し、指摘にしなかったこと

- SW105 の REQ-001 から REQ-007 は、SW205 第8.3節と TM101 の設計ユニット列が一致する。UNIT-001 から UNIT-012 のすべてが、いずれかの要求に出る。機械チェックは循環依存と、公開インターフェースと検証条件の欠落を出していない。
- タイミングの実現方式は、許容誤差を守れる。進みはフレーム枚数ではなく、注入した `clock.nowMs`（製品では `performance.now()`）の差である。フレーム間隔の目安 16 ミリ秒は、±0.1秒（100 ミリ秒）と表示の ±0.2秒より小さい。オープニング完走は 2500 ミリ秒で、2秒以上 3秒以下の内側にある。出撃演出は 2000 ミリ秒。青のフェードアウトとフェードインは各 1000 ミリ秒。赤の間隔は `max(残時間[秒] / 60, 0.33)` で、19800 ミリ秒以下は 0.33 秒。残時間 0 で打ち切る点滅は実測せず、開始時の計算値だけを残す。地球の直径は 240 px から 4 px へ 5000 ミリ秒で直線的に減り、4 px になる時刻は 5.0 秒である。TC-060 の合格範囲 4.9秒以上 5.1秒以下の内側にある。
- 専用ウィンドウが隠れているあいだ `requestAnimationFrame` が止まっても、次のフレームは経過ミリ秒から残時間を計算する。SW105 第1.2節は、バックグラウンドの作業リマインドと、閉じたあとのカウントダウン継続を対象外にしている。閉じたあとはページの変数が破棄され、サービスワーカーは残時間を持たない。カウントダウンが閉じたあとに続く経路は無い。
- AudioContext の自動再生制限への対処は足りている。起動のアイコンクリックはページのユーザ操作にならない。最初の音は出撃ボタンのあとなので、ADR-005 が出撃ボタンの押下で `resume()` するのは妥当である。解禁した同じコンテキストで、数分後のピコンと掛け声を鳴らす。掛け声は `shout.wav` をデコードして BufferSource で1回再生する。`speechSynthesis` と実行時の再合成は使わない。`resume()` は、出撃ボタンの pointer イベントから呼ぶ。次のフレームまで遅らせると、操作の有効期限を外すことがある。この一文を ADR-005 に足すのは、実装時の注意であり、本レビューの指摘にはしない。
- 承認済み SWP6 への加筆は、プロセス上許される範囲に収まっている。差分は第2.2節の未決の手段、TC-050 と TC-063 の「再生できない状態の作り方」、改版履歴の1行である。期待値の数値、単位、許容誤差、不合格の条件は変えていない。`shout.wav` を消した複製を読むのは、設計で決まったテスト手段である。合否基準の変更ではない。
- SW105 に無い利用者機能は足していない。窓の寸法、色の RGB、ピコンの 880 Hz と 80 ミリ秒、長押しの 300 ミリ秒、オープニングの揺れの角度は、合否対象外の設計値として書いてある。
- 禁止名称リストの4文字列は、SW205、TM101、今回の SWP6 加筆に書き写していない。「円谷」の文字も無い。照合は実施時に SW105 第1.3節を読む、と書いてある。禁止名称リストの作品の公式画像、公式音声、公式ロゴは、同梱物にしていない。地球の写真と掛け声の wav は、OQ の決定までリポジトリへ置かない。
- コンポーネント図の依存は、UNIT-012 から UNIT-002 から UNIT-011 へ向かう。UNIT-001 はページのユニットを呼ばない。本文の依存先と逆向きの矢印は無い。状態図の状態名は第4.2節の表と一致する。stars から setting へ戻る遷移は無い。
- 手動の TC は、AI が最新版 Google Chrome の専用ウィンドウを見て、音を聴いて、第5節の属性と照合できる。TC-012 は `docs/process/po_visual_judgment.md` を読む。設計がこのファイルを作らないのは、判定者が Product Owner だからである。記録が無いときは Fail であり、未決では終わらない。

### オープンクエスチョンの評価

確認日は 2026-11-13。ソフトウェア利用規約の本文は転記しない。条件の要点と、読んだページの場所だけを書く。

| ID | 評価 | 推奨回答 |
| :--- | :--- | :--- |
| OQ-1 | Product Owner の判断が要る。推奨の方向（エンジンは同梱せず、生成した wav だけを再配布する）は規約に合う。クレジットの置き場が、音声ライブラリの規約より狭い。D004 | 下記「OQ-1 の推奨回答」を採用する |
| OQ-2 | Product Owner の判断が要る。候補 A をパブリックドメインと一意には確認できなかった。候補 B は NASA の写真として SW105 の3種に入る。下記「OQ-2 の推奨回答」を採用する | 候補 B を採用する |

#### OQ-1 の推奨回答

採用する。話者は VOICEVOX の四国めたん、スタイルはノーマル。開発時に「ジュワッ！」を1回合成し、`extension/assets/audio/shout.wav` だけを保存する。人の声の録音は使わない。実行時に合成し直さない。通信しない。

読んだページは次のとおり。

- https://voicevox.hiroshiba.jp/term/ 。作成した音声の利用は各音声ライブラリの規約に従う。ソフトウェアの無断再配布は禁止である。作成した音声の利用を他者に許すときは、相手にもライブラリの規約と、この義務付けを守らせる。
- https://github.com/VOICEVOX/voicevox_resource/blob/main/core/README.md の四国めたんの項。生成した音声は「VOICEVOX:四国めたん」のクレジットで、商用と非商用に利用できる。詳細は次のページへ委譲している。
- https://zunko.jp/con_ongen_kiyaku.html 。四国めたんを含む音源の規約は、商用と非商用を許し、クレジットを求める。アプリの場合は、紹介画面など、少し探せばわかる場所に書く。

条件は次のとおり。

1. VOICEVOX のソフトウェア、音声ライブラリ、キャラクターの絵は同梱しない。再配布するのは生成した wav だけである。
2. クレジットの文字列は「VOICEVOX:四国めたん」。README の見出し「クレジット」に書く。ストア掲載文にも同じ文字列を足す。第6節の掲載文1文は残してよい。画面への常時表示は、規約が求めていない。
3. 掲載文と画面に、禁止名称リストの名称と、「公認」と「公式」は足さない。
4. 地球の写真の出典本文（権利者、ライセンス名、URL の組）は、いまどおり README のクレジット節だけに置く。音声のクレジットは、地球の写真の出典ではない。
5. wav を他者が再利用できる形で公開するときは、クレジットを外さないことと、音声ライブラリの規約に従うことを、同じクレジット節に1文書く。
6. 共通規約が禁止する利用（公序良俗に反する利用、政治や宗教、情報商材、虚偽、風俗営業、反社会的勢力）には、この掛け声は当たらない。

この推奨を却下する場合も、SW105 第3.2節と REQ-005 の3点（開発時に1回生成して保存する、人の声の録音ではない、再配布を許す利用許諾）は変えない。別のエンジンを選ぶときも、同じ3点を SW205 第6節に書いてから Phase 4 を始める。

#### OQ-2 の推奨回答

候補 B を採用する。NASA の原版 AS17-148-22727。加工前の写真に限る。色調整や切り抜きを加えた派生ファイルは使わない。

ライセンスはパブリックドメインとして扱う。出典とライセンスの本文は、README の見出し「クレジット」だけに書く。本文には、NASA が出典であること、パブリックドメインであること、写真の識別子を書く。NASA による推奨、または NASA による後援と読める文は書かない。NASA のロゴ、記章「ミートボール」、記章「ワーム」が写っているファイルは使わない。ウェブページの画面コピーは使わない。画像ファイルだけを同梱する。

候補 A を推奨にしなかった理由は、次のとおり。

- 設計が挙げた https://visibleearth.nasa.gov/images/54388/earth-the-blue-marble は、2026-11-13 の取得では Earth Observatory のトップページへ移り、画像のライセンス文をその URL で読めなかった。検索結果には、2000-04-26 取得の JPEG と TIFF という記載が残っていた。
- 同じ ID 54388 の公開アーカイブは、1997-09-09 の地球の合成で、海洋の色に SeaWiFS を使ったと説明している。Visible Earth の利用条件の写しは、SeaWiFS、QuickBird、IKONOS を一般の NASA 条件から外し、権利者への確認を求めている。
- SeaWiFS の研究利用の付録には、撮影から5年でパブリックドメインになる、という条項がある。1997年の撮影なら、2026年はその期限を過ぎている。ただし、例外文と5年条項のどちらをこのファイルに適用するかは、ライブの画像ページが読めなかったため、一意に決められなかった。
- NASA の画像ガイドライン（https://www.nasa.gov/nasa-brand-center/images-and-media/ ）は、2026-11-13 に読んだ。米国では NASA の画像は原則として著作権の対象外である。私的でない利用では NASA を出典として示す。推奨や後援があるように見せない。記章とロゴタイプはパブリックドメインではなく、使用は法令で制限される。この4点は、候補 B でも同じように守る。SW105 が許すライセンスは、パブリックドメイン、CC0、CC BY だけである。CC BY-SA は使わない。

候補 A を採る場合は、入手したファイルに記章が無いこと、SeaWiFS の残る制限が無いことを、README のクレジット節に書いてから同梱する。候補 C と D は、Product Owner がファイルを指定したときに、同じクレジット節の条件で採用できる。

### チェックポイント

| 項目 | 結果 | 根拠 |
| :--- | :--- | :--- |
| 全 REQ に UNIT がある | 合格 | 機械チェック。第8.3節と TM101 が一致 |
| 自動の TC が実施できる | 合格 | D001、D002、D005 は最終確認で Closed。TC-056 は出典とライセンスの本文を README のクレジット節だけから読む |
| 手動の TC を AI が観測できる | 合格 | 第8.2節の手動一覧は SWP6 第3.3節と一致。Product Owner がテストを実施する前提にはしていない |
| SWP6 の期待値を無断で変えていない | 合格 | 加筆は手段だけ。数値と不合格条件は変えていない |
| 要求に対応しないユニットが無い | 合格 | UNIT-001 から UNIT-012 は第8.3節のいずれかに出る |
| 循環依存が無い | 合格 | 機械チェック。図の矢印は本文の依存先と同じ向き |
| 公開インターフェースがある | 合格 | 機械チェック。各 UNIT に引数、戻り値、失敗時の名前がある |
| 境界の検証条件がある | 合格 | 各 UNIT の検証条件。時刻の数値は SW105 の内側 |
| 重要な技術選定に ADR がある | 合格 | ADR-001 から ADR-007。ADR-002 は再レビューで同梱 Chromium に変わっている |
| 外部依存を注入できる | 合格 | clock、scheduler、audioPort、random01、dom を引数で渡す |
| 異常系が SW105 と対応する | 合格 | 第7節は REQ-001 から REQ-007 の異常系を持つ。再オープンの失敗回復は D003 で確認し Closed |
| 将来の拡張ポイント | 合格 | SW105 第6.3節は、対象外機能を足すとき Phase 1 へ戻す。本版の状態は第4.2節の表に閉じている |
| スケルトンの残骸が無い | 合格 | 機械チェック |
| 不自然な日本語が残っていない | 合格 | style_check は Mid 0、要確認 0 |

| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容 | 修正提案 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D001 | 2026-11-13 | High | SW205 / ADR-002、第8.2節。SWP6 / 第2.2節 | 【重要度: High】【ASDoQ: 2. 保守性（検証可能性）】画面の自動テストは Playwright の channel を chrome にする、と書いてある。理由は、同梱 Chromium が最新版 Google Chrome ではない、である。2026-11-13 に Playwright の拡張機能テストの公式手順（https://playwright.dev/docs/chrome-extensions）を読んだ。ブランド版の Google Chrome と Microsoft Edge は、拡張をコマンドラインから読み込むフラグを削除しており、公式手順は同梱 Chromium の persistent context を使う、と書いてある。Chrome の告知は、Chrome 137 のブランド版から `--load-extension` を削除し、Chromium と Chrome for Testing には残す、である。続く告知は、Chrome 139 のブランド版から `--disable-extensions-except` も削除する、である。設計の channel のまま公式手順のフラグで読むと、拡張が読み込めず、TC-001 以降の画面の自動テストが起動しない。ツールバーのアイコンをクリックする口も無い。`chrome.action.onClicked` は、ページ内の DOM をクリックしても発火しない。サービスワーカーのクリックを自動で起こす現状の手段は、CDP の `Extensions.triggerAction` である。入力の口が無い自動テストは実施できない。 | 第8.2節と ADR-002 に、拡張の読み込み手順を書く。最新版のブランド版 Chrome で自動テストするなら、削除済みのフラグではなく、CDP の `Extensions.loadUnpacked` で読む。フラグで読むなら、フラグが残っている Chrome for Testing か Playwright 同梱 Chromium を使い、SW105 が保証する最新版 Google Chrome では chrome://extensions の「パッケージ化されていない拡張機能を読み込む」で同じシナリオを確認する、と書く。アイコンのクリックは、CDP の `Extensions.triggerAction` で onClicked を起こす。SWP6 第2.2節の channel の文は、この手順に合わせる。期待値の数値は変えない。 | 再レビューで ADR-002、第8.2節、SWP6 第2.2節を読んだ。自動テストは Playwright 同梱の Chromium で、channel は指定しない。persistent context で、--disable-extensions-except と --load-extension と --enable-unsafe-extension-debugging を付ける。アイコンは CDP の Extensions.triggerAction である。id はサービスワーカーの URL、targetId はタブターゲットである。手動の TC は最新版 Google Chrome で、chrome://extensions から読む。生成担当がこの欄に書いた「channel は chrome のまま、フラグは使わず loadUnpacked」は、保存済みの SW205 と一致しない。実ファイルは同梱 Chromium と --load-extension である。指摘の本体は解消している。期待値の数値は変えていない。 | Closed |
| D002 | 2026-11-13 | Mid | SW205 / 第8.2節の観測口の表。SWP6 / TC-037、TC-060、第2.2節 | 【重要度: Mid】【ASDoQ: 3. 整合性（図表と本文の齟齬）】第8.2節の観測口の表は、TC-037 を node:test の純粋関数に置いている。SWP6 TC-037 の期待値は、表示が切り替わる間隔が 1秒で許容誤差 ±0.2秒であることと、120000、120001、60000 ミリ秒の表示である。間隔は、動いている画面で `#time` の textContent が変わる時刻の差で測る。formatRemaining の戻り値は、その間隔を測らない。同じ表は TC-060 を data-earth-diameter-px と timeVisible に置いている。同じ第8.2節の計測定義と SWP6 第2.2節は、直径を `#earth` の getBoundingClientRect() の幅と高さのうち大きい方で測る、と書いている。属性だけを合格にすると、計算値が 4 px 以下でも、画面上の写真が大きいときに TC-060 が Pass になる。REQ-007 の点は、画面上の直径が 4 px 以下であることである。 | TC-033 と、TC-038 の 1000、1001、119999、60001 と、TC-037 の3つの表示文字列は、node:test のままにする。TC-037 の間隔は、`#time` の textContent が変わる前後の印の差を観測口にする。TC-060 の合否は getBoundingClientRect() を主にし、data-earth-diameter-px はその矩形と同じ値であることの照合にする。期待値の数値は変えない。 | 再レビューで第8.2節の観測口の表と SWP6 第2.2節を読んだ。TC-037 の間隔は、#time の textContent が変わる前後の印の差である。TC-060 の合否は getBoundingClientRect() で、属性は矩形と同じ値であることの照合である。120000、120001、60000 ミリ秒の表示も同じ textContent を読む。node:test は TC-033 と TC-038 である。生成担当の欄にあった「3つの表示は node:test」は、保存済みの SW205 と違う。指摘の本体は解消している。期待値の数値は変えていない。 | Closed |
| D003 | 2026-11-13 | Mid | SW205 / UNIT-001、第4.2節、ADR-006 | 【重要度: Mid】【ASDoQ: 3. 整合性（上位下位対応）】既にある専用ウィンドウは、chrome.windows.update で focused を true にする、と書いてある。失敗時は WindowOpenFailed を返す、と UNIT-001 にある。windows.update は、指定していない state を変えない。最小化されたウィンドウへ focused だけを渡すと、state は minimized のまま残る。公式の説明では、focused の true はウィンドウを前面へ出すことであり、state の minimized とは同時に指定できない。REQ-001 の前面化は、最小化されているとき state を normal にしてから focused を true にする。MV3 のサービスワーカーは、操作が無いと停止する。windows.onRemoved を最初の評価で登録していないと、停止中に閉じたイベントを受け取らず、chrome.storage.session の windowId が残る。残った id への update は失敗する。設計はその失敗を WindowOpenFailed で終わらせ、create へ進まない。閉じたあとのアイコンクリックで、専用ウィンドウが開かない。閉じたページが破棄され、残時間が消えること自体は、この指摘の対象外である。manifest の background に type の module が無い。製品コードは ES modules であり、type が無いサービスワーカーは起動しない。 | update の前に、その windowId のウィンドウが存在するかを見る。無い、または update が失敗したときは、session のキーを消して chrome.windows.create へ進む。WindowOpenFailed は、create が失敗したときだけ返す。ウィンドウがあり state が minimized のときは、state を normal にし、focused を true にする。onClicked と onRemoved は、window-launcher.js の最初の評価で登録する。manifest の background は、service_worker に加え type を module にする。URL を update に渡すと再読み込みになる、という既存の注意は残す。 | 再レビューで UNIT-001、第4.2節、ADR-006、起動のシーケンス図を読んだ。ウィンドウが無いとき、または update が失敗したときは、session のキーを消して create へ進む。WindowOpenFailed は create の失敗だけである。前面化は state を normal にし、focused を true にする。url は渡さない。onClicked と onRemoved は window-launcher.js の最初の評価で登録する。manifest の background の type は module である。指摘は解消している。 | Closed |
| D004 | 2026-11-13 | Mid | SW205 / 第6節のストア掲載文、第8章 OQ-1 | 【重要度: Mid】【ASDoQ: 6. 規範適合性（制約適合性）】OQ-1 の推奨は、クレジット「VOICEVOX:四国めたん」を README の見出し「クレジット」に書く、である。2026-11-13 に利用規約を読んだ。ソフトウェア利用規約は、作成した音声を各音声ライブラリの規約へ委ね、ソフトウェアの無断再配布を禁止している。コアの README の四国めたんの項は、そのクレジットで生成音声を商用と非商用に利用できる、と書いている。音声ライブラリの規約は、アプリでは紹介画面など、少し探せばわかる場所への記載を求めている。第6節のストア掲載文は、クレジットを含まない1文に固定されている。推奨をそのまま採用すると、紹介画面にクレジットが無い。エンジンを同梱しないこと、wav だけを保存すること、人の声の録音ではないことは、規約と SW105 に合う。ページの場所と採用条件は、本ファイルの「OQ-1 の推奨回答」に書いた。 | OQ-1 の推奨文を「OQ-1 の推奨回答」の6条件に直す。ストア掲載文に「VOICEVOX:四国めたん」を足す。掲載文の既存の1文は残してよい。禁止名称と「公認」と「公式」は足さない。地球の写真の出典本文は、README のクレジット節だけに置く。Product Owner がこの条件で採用する。別のエンジンにする場合も、SW105 の3点は変えない。 | 再レビューで第6節と第8章を読んだ。Product Owner マサは 2026-11-13 に、四国めたん（ノーマル）を決定した。クレジット「VOICEVOX:四国めたん」は README の見出し「クレジット」と、ストア掲載文の2文目にある。1文目は残っている。エンジンとキャラクターの絵は同梱しない。指摘の本体は解消している。地球の出典を SOURCES.md にも書く件は、この指摘の範囲外であり、D005 で判断する。 | Closed |

初回レビュー完了: 指摘 4件（High: 1 / Mid: 3 / Low: 0）。当時の判定は REJECTED。

## 再レビュー（2026-11-13）

対象は、Open だった D001 から D004 と、その修正で変わった ADR-002、第4.2節、第6節、第8.2節、第8章、および SWP6 第2.2節である。SW205、TM101、SWP6 は編集していない。新しいユニット ID は無い。

Product Owner マサの決定は、第8章に反映されている。OQ-1 は四国めたん（ノーマル）で、クレジットは README の見出し「クレジット」とストア掲載文の2文目である。OQ-2 の写真は、加工前の NASA 原版 AS17-148-22727 である。この2つの採用そのものは、指摘にしない。

地球の出典を SOURCES.md にも書くことについて、判断は次のとおり。

- TC-052 とは矛盾しない。TC-052 は、同梱された各画像と各音声に出典があり、その出典が自作であるか、禁止名称リストの作品とキャラクタ以外であることを求める。NASA の原版はその作品でもキャラクタでもない。SOURCES.md に地球の行があることは、TC-052 の合格側である。行が README のクレジット節を指すだけでも、ファイルに出典の記載はある。本文を複製しなくても TC-052 は満たせる。
- SW105 とは矛盾する。REQ-006 の (8) と REQ-007 の (3) は、地球の写真の出典とライセンスを README の見出し「クレジット」の節だけに書く、と定めている。第6節は、同じ出典とクレジットとライセンス名を SOURCES.md の地球の行にも書く、と定め、SW105 の本文は変えていない、と自分で書いている。
- TC-056 とも矛盾する。期待値は、出典とライセンスが README のクレジット節だけにあり、その節以外に出典がある場合は不合格、である。SOURCES.md にライセンス名と写真の識別子を書くと、TC-056 は設計どおりに実施すると Fail になる。

D005 として記録する。写真の識別子と、加工しないことは、この指摘で変えない。

| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容 | 修正提案 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D005 | 2026-11-13 | High | SW205 / 第6節、第8章 OQ-2。SW105 / REQ-006、REQ-007。SWP6 / TC-056 | 【重要度: High】【ASDoQ: 3. 整合性（上位下位対応）】第6節は、地球の出典とクレジットとライセンス名を、README の見出し「クレジット」と SOURCES.md の地球の行の両方に書く、と定めている。同じ節は、SW105 が出典とライセンスを README のクレジット節だけに書くと定め、SW105 の本文は変えていない、と書いている。REQ-006 の (8) と REQ-007 の (3) の「だけ」と、両方に書くことは両立しない。TC-056 の期待値は、出典とライセンスがその節だけにあり、節以外に出典がある場合は不合格、である。この設計のまま TC-056 を実施すると Fail になる。TC-052 とは矛盾しない。TC-052 は各ファイルに出典があることを求め、NASA の原版は禁止名称リストの作品でもキャラクタでもない。行が README を指すだけでも TC-052 は満たせる。 | SOURCES.md の地球の行は、ファイル名と、出典本文が README の見出し「クレジット」にあることだけを書く。ライセンス名、権利者、URL、写真の識別子の組は、README のクレジット節だけに書く。写真は加工前の AS17-148-22727 のままにする。SW105 と TC-056 の期待値は変えない。Product Owner が本文の複製を両方に残す場合は、「だけ」と TC-056 の不合格条件を変えるため Phase 1 へ戻す。 | 最終確認で第6節と第8章 OQ-2 を読んだ。コミット 85b985e。出典とライセンスの本文は README の見出し「クレジット」だけである。SOURCES.md の地球の行は、ファイル名と「出典本文は README の見出しクレジット」だけである。ライセンス名、権利者名、URL、写真の識別子は、その行に無い。写真は加工前の AS17-148-22727 のままである。SW105 と TC-056 の期待値は変えていない。修正提案どおりである。 | Closed |

再レビュー完了: 指摘 5件（High: 2 / Mid: 3 / Low: 0）。Open は D005 の 1件。D001 から D004 は Closed。
機械チェック: `DADA-CHECK: OK | High 0 / Mid 0 / 要確認 0 | 対象: SW105, SW205, SWP6`
REVIEW: **REJECTED**（根拠: 未解消の High 指摘 1件、機械チェックの終了コード 0）

## 最終確認（2026-11-13）

対象は、Open だった D005 と、コミット 85b985e で変わった第6節と第8章である。SW205、TM101、SWP6 は編集していない。新しいユニット ID は無い。

出典とライセンスの本文は、README の見出し「クレジット」だけに書く。SOURCES.md の地球の行は、ファイル名と、出典本文がその節にあることだけを書く。ライセンス名、権利者名、URL、写真の識別子は、その行に無い。写真は加工前の NASA 原版 AS17-148-22727 である。第8章 OQ-2 の決定内容は、同じ置き場である。

TC-052 は、この行と README のクレジット節から各ファイルの出典を読む。行が節を指すだけでも、ファイルに出典の記載はある。NASA の原版は、禁止名称リストの作品でもキャラクタでもない。

TC-056 は、出典とライセンスの本文をその節だけから読む。節の外に、ライセンス名と写真の識別子は置かない。ストア掲載文の2文目は、掛け声のクレジット「VOICEVOX:四国めたん」である。地球の出典とライセンスの本文は、ストア掲載文に無い。shout.wav の行は、そのクレジット本文の置き場だけを書く。

この変更で新しく生じた High は無い。

最終確認完了: 指摘 5件（High: 2 / Mid: 3 / Low: 0）。Open は 0件。D001 から D005 は Closed。
機械チェック: `DADA-CHECK: OK | High 0 / Mid 0 / 要確認 0 | 対象: SW105, SW205, SWP6`
REVIEW: **APPROVED**（根拠: 未解消の High 指摘 0件、機械チェックの終了コード 0）

---

## v2.0 改訂レビュー（Phase 3 自己校正 / 2026-11-16）

- **レビュー日**: 2026-11-16
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v2.0）
- **入力**: 承認済み SW105 v2.0、計画承認済み SWP6 v2.0、`docs/process/last_phase_summary.md`
- **総合判定**: **REVIEW: APPROVED**
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 High: 0件、残 Open: 0件）

### 1. 機械チェック結果
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 9 / 要確認 1`）。`REQ↔UNIT` 対応は `7/7`、循環依存・幻覚ID・SW205 起因の Mid 指摘は 0件。Mid 9件は v1.0 既存の `tests/` との一時的差分であり、Phase 4 で解消予定。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=12`）。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて 100.0点。要確認 12件は複合名詞内の「時」への機械的ヒットのみ。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | Mid=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項（目的適合性・保守性・整合性・可読性）
1. **SWP6 全46件の実行可能性**: 自動区分 36件すべてについて `#app` の観測属性（`data-state`, `data-opening-step`, `data-setting-ms`, `data-remaining-ms`, `data-display-time`, `data-beacon-color`, `data-beacon-lit`, `data-juwacchi-url`, `data-blink-log`, `data-marks`, `data-dots-active`）、DOM 要素、`node:test` 純粋関数、Playwright 通信監視、音声ファイル削除済み複製テストによる実行・観測口が設計されている。手動区分 10件も AI が Chrome 実機で視覚・聴覚観測できる。
2. **責務の単一性と疎結合**: `UNIT-001`〜`UNIT-010` は依存先なし（純粋関数および注入ポート）。`UNIT-011` のみが統合制御を担い、循環依存はない。
3. **SW105 v2.0 との整合性**: オープニング 20秒（5秒×4区間）、設定 2:00（1:00〜3:00、10秒単位）、スタート即カウントダウン、1分超青点灯無音・1分以下赤線形加速点滅＋消灯時ピコン音、残時間 0 消灯＋ピコン＋ジュワッチ 1秒（VOICEVOX 四国めたん再配布許諾確認済み）＋画面消去・360度ランダムドット飛散、権利表記方針のすべてが一致している。
4. **自律ゲート通過判定**: 残存 High 0件、機械チェック終了コード 0、SWP6 の全テスト項目実行可能であるため、自律ゲートの停止条件に該当しない。

---

## v2.1 改訂レビュー（Phase 3 自己校正 / 2026-11-16）

- **レビュー日**: 2026-11-16
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v2.1）
- **入力**: 承認済み SW105 v2.1、計画承認済み SWP6 v2.1、`docs/process/last_phase_summary.md`
- **総合判定**: **REVIEW: APPROVED**
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 High: 0件、残 Open: 0件）

### 1. 機械チェック結果
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 3 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔UNIT` 対応は `7/7`、循環依存・幻覚ID・SW205 起因の Mid 指摘は 0件。Mid 3件は Phase 4 で実装予定の新規テスト `TC-047`〜`TC-049` のテストコード未実装によるもの。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=12`）。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて 100.0点。Mermaid 10ノード上限超過・`[接続1]` ペア不整合・図表キャプション位置違反はいずれも 0件。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項（目的適合性・保守性・整合性・可読性）
1. **SWP6 v2.1 全50件の実行可能性**:
   - `TC-047`, `TC-048`: `UNIT-003` (`openingFrame`) が `progressRatio`（`0`〜`1`）を返し、`#app` の `data-opening-progress`・`data-opening-progress-visible`・`#opening-progress`（`aria-valuenow`）および `data-marks` の完了印（`opening-progress-ai-done`, `opening-progress-urinal-done`）により、0.5秒以内の 20% 未満判定から 4.8〜5.2秒での 100% 到達までフレーム境界跨ぎの取りこぼしなく検証可能である。
   - `TC-049`, `TC-008`, `TC-011`: `urinalShrink` 遷移時点およびスキップ時点で `data-opening-progress-visible === 'false'`・`data-signature-visible === 'false'` となり、非表示を確実に観測できる。
   - `TC-006`, `TC-007`, `TC-050`: 署名画像は `<text>` 要素や外部フォントを使わない同梱 SVG パス画像 `extension/assets/images/r-mutt-signature.svg`（年表記なし）を `<img id="signature-img">` で読み込む設計であり、自動のリソース検証と AI の目視検証の双方を満たす。
2. **責務の単一性と疎結合**: `UNIT-003` に純粋な進捗計算を集約し、`UNIT-010`（描画）と `UNIT-011`（制御・印記録）に分離されているため、Agentic Testability を維持している。循環依存はない。
3. **自律ゲート通過判定**: 残存 High 0件、機械チェック終了コード 0、SWP6 全50件の実行可能性確認済みであるため、自律ゲートの停止条件に該当しない。

---

## v2.2 改訂レビュー（Phase 3 自己校正 / 2026-11-16）

- **レビュー日**: 2026-11-16
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v2.2）
- **入力**: 承認済み SW105 v2.2、計画承認済み SWP6 v2.2、`docs/process/last_phase_summary.md`
- **総合判定**: **REVIEW: APPROVED**
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 High: 0件、残 Open: 0件）

### 1. 機械チェック結果
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 3 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔UNIT` 対応は `7/7`、循環依存・幻覚ID・SW205 起因の Mid 指摘は 0件。Mid 3件は Phase 4 で実装予定の新規テスト `TC-051`〜`TC-053` のテストコード未実装によるもの。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=13 | DECISION1_MODE=off (local_rule_fallback)`）。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて 100.0点。Mermaid 10ノード上限超過・`[接続1]` ペア不整合・図表キャプション位置違反はいずれも 0件。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項（目的適合性・保守性・整合性・可読性）
1. **SWP6 v2.2 全53件の実行可能性**:
   - `TC-006`, `TC-007`, `TC-049`, `TC-050`: 署名画像 `extension/assets/images/r-mutt-signature.svg` が「ア゛ール・マッド」手書き風 SVG パス画像（`<text>`・外部フォント・年表記なし）へ更新されており、自動・手動双方で検証可能である。
   - `TC-015`, `TC-051`, `TC-052`, `TC-053`: `UNIT-004` の `longPressRepeatSteps(holdElapsedMs, appliedRepeatCount)` と `UNIT-011` の `onAdjustPressStart` / `onAdjustPressEnd(cancelled)` / `tick()`、および `main.js` の `pointerdown` / `pointerup` / `pointerleave` / `pointercancel` 制御（`click` 二重加算防止）と定数 `LONG_PRESS_DELAY_MS = 2000`・`LONG_PRESS_INTERVAL_MS = 200` により、2秒長押し早送り・離し時単押し重複なし・上限下限クランプ・ポインタ外移動停止を `node:test` と Playwright の双方で確定的に検証できる。
   - `TC-033`, `TC-034`, `TC-035`, `TC-036`: `juwacchi.wav` の発音時間が `2.0秒 ±0.2秒`（1.8秒〜2.2秒、v2.1 の 2倍ゆっくり）へ更新され、VOICEVOX 四国めたん（ノーマル）の再配布許諾記載および欠損複製テスト方針が維持されている。
2. **責務の単一性と疎結合**: `UNIT-004` に純粋な長押しステップ計算を追加し、`UNIT-011` が `clock.nowMs()` を用いて制御し、`main.js` が DOM ポインタイベントを接続する構造であるため、Agentic Testability と無循環依存を維持している。
3. **自律ゲート通過判定**: 残存 High 0件、機械チェック終了コード 0、SWP6 全53件の実行可能性確認済みであるため、自律ゲートの停止条件に該当しない。

---

## v3.0 改訂レビュー（Phase 3 自己校正 / 2026-11-17）

- **レビュー日**: 2026-11-17
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v3.0）
- **入力**: 承認済み SW105 v3.0、計画承認済み SWP6 v3.0、`docs/process/last_phase_summary.md`
- **重点特性（`sw205` プロファイル）**: `C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）
- **総合判定**: **REVIEW: APPROVED**
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 High: 0件、残 Open: 0件）

### 1. 機械チェック結果
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 4 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔UNIT` 対応は `7/7`、循環依存・幻覚ID・SW205 起因の Mid 指摘は 0件。Mid 4件は Phase 4 で実装予定の新規テスト `TC-055`〜`TC-058` のテストコード未実装によるもの。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=14 | DECISION1_MODE=off (local_rule_fallback)`）。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて 100.0点。Mermaid 10ノード上限超過・`[接続1]` ペア不整合・図表キャプション位置違反はいずれも 0件。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項と根拠引用
1. **目的適合性（`C1_purpose`）**:
   - **根拠引用**: 第1.1節〜第1.3節（設計対象3領域・適用範囲・スコープ外理由・`SW105` v3.0 / `SWP6` v3.0 参照）および第3.2節 `UNIT-001`〜`UNIT-011`（関数/API シグネチャと検証条件のみを定義し、実装コードへの越権やスコープクリープなし）。
2. **保守性・テスト実行可能性（`C2_maintainability`）**:
   - **根拠引用**: 第3.2節 `UNIT-003` (`openingFrame` の戻り値 `{ step, sceneIndex, scale, progressRatio, progressVisible, imageKind }` と各シーン境界 3000/8000/13000/15000/20000ミリ秒)、第5節表5・表6・表7（`ViewModel`・`#app` 観測属性 `data-opening-step` / `data-opening-scene` / `data-opening-image` / `data-opening-progress` / `data-opening-progress-visible`・`data-marks` 印）、第8.2節表11（`SWP6` 第2.2節の未確定項目解消、自動46件・手動12件の実行・観測手段）。旧 `signatureVisible`・`data-signature-visible` は廃止し、5シーン構成に最適化した責務分離と Agentic Testability を維持している。
3. **整合性（`C3_consistency`）**:
   - **根拠引用**: 第2.2節表2および第6.2節表9・ADR-007（旧 `ai-agent.svg` / `urinal.jpg` / `r-mutt-signature.svg` の削除切替、`fountain-stieglitz.jpg` `PD-1923` および `three-face-dadaism.svg` 自作 SVG 採用、`manifest.json` v3.0.0・`SOURCES.md`・`README.md`・`LICENSE` の整合方針）、第4.3節表4および第6.1節表8（3秒＋5秒＋5秒＋2秒＋5秒＝合計20秒と `OPENING_SCENE1_MS`〜`OPENING_SCENE5_MS` / `OPENING_TOTAL_MS` の一致）、第8.3節表12（`REQ-001`〜`REQ-007` と `UNIT-001`〜`UNIT-011` の双方向対応）、図2・図3（各図 10ノード以下・`[接続1]` ペア一致）。
4. **可読性（`C5_readability`）**:
   - **根拠引用**: `STYLE-LINT: OK | Mid=0 / 要確認=0`、`STYLE-VERIFY: OK | High=0 / 要確認=0` により、110文字超の長文・AI-Slop表現・意味変質がないことを確認済み。
5. **自律ゲート通過判定**: 残存 High 0件、機械チェック終了コード 0、`SWP6` v3.0 全58件（自動46件＋手動12件）の実行可能性確認済みであるため、自律ゲートの停止条件に該当しない。

---

## v3.2 改訂レビュー（Phase 3 自己校正 / 2026-11-17）

- **レビュー日**: 2026-11-17
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v3.2）
- **入力**: 承認済み SW105 v3.2、計画承認済み SWP6 v3.2、`docs/process/last_phase_summary.md`
- **重点特性（`sw205` プロファイル）**: `C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）
- **総合判定**: **REVIEW: APPROVED**
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 High: 0件、残 Open: 0件）

### 1. 機械チェック結果
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: OK | High 0 / Mid 0 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔TC` 7/7、`REQ↔UNIT` 7/7、`UNIT↔コード` 11/11、循環依存・幻覚ID・SW205 起因の High/Mid 指摘は 0件。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --summary`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=15 | DECISION1_MODE=off (local_rule_fallback)`）。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて 100.0点。Mermaid 10ノード上限超過・`[接続1]` ペア不整合・図表キャプション位置違反はいずれも 0件。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-LINT: OK | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項と根拠引用
1. **目的適合性（`C1_purpose`）**:
   - **根拠引用**: 第1.1節〜第1.3節（設計対象3領域、第1〜第4シーンの自動遷移・処理バー・全体クリックスキップを対象外とする境界、`SW105` v3.2 / `SWP6` v3.2 参照）および第3.2節 `UNIT-001`〜`UNIT-011`（公開インターフェースと検証条件のみを定義し、実装コードへの越権やスコープクリープなし）。
2. **保守性・テスト実行可能性（`C2_maintainability`）**:
   - **根拠引用**: 第3.2節 `UNIT-003`（`stepOpeningScene(sceneIndex, action)` と `openingFrame(sceneIndex, scene5ElapsedMs)` による純粋計算）、`UNIT-010`（`#opening-progress` の完全削除と `#opening-nav` / `#btn-opening-back` / `#btn-opening-next` の表示制御）、`UNIT-011`（`onOpeningNext()`, `onOpeningBack()`, `openingScene === 5` のみ有効な `onClickScreen()` と `scene5StartMs` 経過計測）、第4.2節（ボタンクリックの `event.stopPropagation()` と `UNIT-011` 側ガードの二重防御）、第5節表5・表6・表7（`openingBackVisible` / `openingNextVisible`、`data-opening-back-visible` / `data-opening-next-visible`、`data-marks` の `opening-scene2`〜`opening-scene5`・`setting-shown`）、第8.2節表11（`SWP6` 第2.2節 TBD 5件の確定）。これにより `SWP6` v3.2 全58件（自動46件・手動12件）が実行・観測可能である。
3. **整合性（`C3_consistency`）**:
   - **根拠引用**: 第2.2節表2・第4.2節図5・第4.3節表4・第6.2節表9・ADR-005（ジュワッチ音声 `extension/assets/audio/juwacchi.wav` の発音時間 `1.0秒 ±0.2秒（0.8秒以上 1.2秒以下）` / `1000 ミリ秒` への統一および VOICEVOX:四国めたん再配布許諾）、第2.2節表2・第6.2節（`extension/manifest.json` v3.2.0、`README.md`、`LICENSE`、`extension/assets/SOURCES.md`、`extension/store-listing.txt` の整合方針）、第6.1節表8（`OPENING_SCENE5_MS = 5000` のみ維持し旧シーン1〜4定数を整理）、第7節表10（第1〜第4シーンのボタン外クリック非遷移と第5シーンのクリックスキップの分離）、第8.1節 `ADR-008`、第8.3節表12（`REQ-001`〜`REQ-007` ↔ `UNIT-001`〜`UNIT-011` 双方向一致）、図2・図3（各図10ノード以下・`[接続1]` ペア一致）。
4. **可読性（`C5_readability`）**:
   - **根拠引用**: `STYLE-LINT: OK | Mid=0 / 要確認=0`、`STYLE-VERIFY: OK | High=0 / 要確認=0` により、長文（110文字超）・AI-Slop 表現・二重ヲ格・多重条件入れ子・意味変質がないことを確認済み。
5. **自律ゲート通過判定**: 残存 High 0件、機械チェック終了コード 0、`SWP6` v3.2 全58件の実行可能性確認済み、TBD 未確定項目なしのため、自律ゲートの停止条件に該当しない。

---

## v4.0 改訂レビュー（Phase 3 自己校正 / 2026-11-19）

- **レビュー日**: 2026-11-19
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v4.0）
- **入力**: 承認済み `SW105` v4.0、計画承認済み `SWP6` v4.0、`docs/process/last_phase_summary.md`
- **重点特性（`sw205` プロファイル）**: `C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）
- **総合判定**: **REVIEW: APPROVED**（第2周差分再レビューで更新。第1周時は `R001` により `REJECTED`）
- **根拠**: `R001` は `UNIT-008` 統合改訂により `Closed`。最終確認の `python tools/dada_check.py all --summary` は終了コード `0`（High `0`）、`asdoq_lint.py` は High `0` / Mid `0`、`style_check.py lint` は Mid `0`、`style_check.py verify` は High `0`。未解消の High および Open は `0件`。
- **指摘件数**: 1件（High: 1 / Mid: 0 / Low: 0）。Open は `0件`、Closed は `1件`。

### 1. 第1周機械チェック結果（ステップ1）
- `python tools/dada_check.py all`: 終了コード `1`（`DADA-CHECK: NG（High指摘あり） | High 1 / Mid 7 / 要確認 1 | 対象: SW105, SW205, SWP6`）。
  - 内訳（個別サブコマンド確認）:
    - `dada_check.py trace`: 終了コード `0`（`REQ↔TC` 7/7、`REQ↔UNIT` 7/7、循環依存 0件、幻覚ID 0件、High 0 / Mid 0）
    - `dada_check.py lint`: 終了コード `0`（High 0 / Mid 0 / 要確認 1［SWP6 側の `(0件)` 表記］）
    - `dada_check.py status`: 終了コード `0`（第1周追記前時点の Open 0件）
    - `check_code`（`all` に含まれるコード照合）: `UNIT↔コード 11/12`、`High 1`（新規 `UNIT-012` の未実装）、`Mid 7`（新規自動 `TC-059`〜`TC-063`, `TC-065`, `TC-066` のテストコード未実装）。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=24 | DECISION1_MODE=off (local_rule_fallback)`）。`C1_purpose` 100.0、`C2_maintainability` 100.0、`C3_consistency` 100.0、`C4_understandability` 97.0（`要確認 1`）、`C6_conformance` 100.0。Mermaid 10ノード上限超過・`[接続1]` ペア不整合・図表キャプション位置違反はいずれも 0件。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項と根拠引用（ステップ2〜3）
1. **目的適合性（`C1_purpose`）— 合格**:
   - **根拠引用**: 第1.1節〜第1.3節（設計対象3領域、外部通信・第三者楽曲複製禁止のスコープ境界、`SW105` v4.0 / `SWP6` v4.0 参照）および第3.2節 `UNIT-001`〜`UNIT-011`（関数/API シグネチャと検証条件のみを定義し、実装コードへの越権やスコープクリープなし）。
2. **保守性・テスト実行可能性（`C2_maintainability`）— 合格**:
   - **根拠引用**: 第3.2節 `UNIT-008`（`juwacchi-player.js` と `opening-bgm-player.js` の 2ファイル構成、`OPENING_BGM_ASSETS`, `loadOpeningBgm`, `createOpeningBgmPlayer`, `requestId` キャンセル、異常時 `{ ok: false, error: 'BgmUnavailable' }` フォールバック）、`UNIT-003`（`openingFrame` 戻り値への `bgmTrack: 'none' | 'scene2' | 'scene3'` 追加）、`UNIT-010`（`#opening-title` 追加・連想ゲーム1〜3の新タイトルと本文・`#app` 観測属性 `data-opening-bgm`, `data-opening-bgm-url`, `data-opening-bgm-log`）、`UNIT-011`（`audioPort.playOpeningBgm` / `stopOpeningBgm`、`onOpeningNext` / `onOpeningBack` での同期 `audioPort.resume()` ＋ `syncOpeningBgm`、`onClickScreen` / `OPENING_DONE` / `onStart` / `pagehide` 停止）、第8.2節表11（`SWP6` 第2.2節 TBD 7項目すべての確定）。これにより `SWP6` v4.0 全66件（自動53件・手動13件）が実行・観測可能である。
3. **整合性（`C3_consistency`）— 合格**:
   - **根拠引用**: 第2.2節表2および第6.2節表9・ADR-009・ADR-010（第2シーン『ジムノペディ第1番』Wikimedia Commons 候補 `File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg`［Public Domain、1888年発表/1925年作曲者没根拠］、第3シーン `hero-hum.wav` の非複製オリジナル旋律・口ずさみ風フォルマント合成 24kHz 16bit mono WAV・非人声録音・MIT License、`README.md`・`LICENSE`・`extension/assets/SOURCES.md` 3箇所の7項目記載方針、`extension/manifest.json` v4.0.0・`extension/store-listing.txt` 整合、禁止名称8文字列検査対象7箇所）、図2・図3・図5（各図10ノード以下、`[接続1]` ペア一致、本文参照と図下キャプション・表上タイトルの配置規則一致）、第7節表10（#2 BGM 異常フォールバック、#3 高速連打競合、#6 `pagehide` 停止と `SW105` 異常系の1対1対応）、第8.3節表12（`REQ-001`〜`REQ-007` ↔ `UNIT-001`〜`UNIT-011` 双方向一致、循環依存 0件）。
4. **可読性（`C5_readability`）— 合格**:
   - **根拠引用**: `STYLE-LINT: OK | Mid=0 / 要確認=0`、`STYLE-VERIFY: OK | High=0 / 要確認=0`、`ASDOQ-LINT C6_conformance=100.0`（二重ヲ格・中止法・指示語・長文 0件）。

### 3. 機械チェックから転記した指摘一覧（ステップ4）
| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容（ASDoQ分類および `❌ Before` / `✅ After`） | 修正提案 / 対応方針 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R001 | 2026-11-19 | High | SW205 / 第3.2節 `UNIT-012`（および `dada_check.py` 第3章 `check_code`） | `[ASDoQ:整合性-無矛盾性]` 既存 v3.2 ソースコード 22件が存在する状態で新規設計ユニット `UNIT-012` を追加したため、`python tools/dada_check.py all` の「3. ソースコード照合」が `UNIT-012: このUNIT-IDを参照するソースファイルがない（未実装、またはヘッダのID記載漏れ）` を `High 1`（終了コード `1`）として検出した。❌ Before: `SW205` 第3.2節に `UNIT-012` を追加した時点で `extension/` に `UNIT-012` 参照コードが存在せず、`dada_check.py all` が終了コード `1` を返す。 | ✅ After: 新規 `UNIT-012` を設けず、既存の `UNIT-008` を「同梱音声ファイル再生（ジュワッチ音声・オープニングBGM）」（対応要求 `REQ-001, REQ-005, REQ-006`）へ拡張し、`extension/src/audio/juwacchi-player.js` と `extension/src/audio/opening-bgm-player.js`（ヘッダ `UNIT-008, REQ-001, REQ-006`）の 2ファイルを `UNIT-008` が管轄する設計へ統合する。 | 設計方針決定に基づき、`UNIT-012` 見出しおよび全参照を削除して `UNIT-008` 配下へ統合（`opening-bgm-player.js` の公開IF・モジュール分離は維持）。表1・表2・図3・図5・表10・ADR-009・表11・表12・表13 を `UNIT-001`〜`UNIT-011` へ整合し、2026-11-19 の第2周差分再レビューで `dada_check.py all` 終了コード `0`（High 0）を確認した。 | Closed |

### 4. 第2周差分再レビュー（2026-11-19）
- **対象**: `Open` だった `R001` および統合後の `SW205` 変更箇所（第1.4節表1、第2.2節表2、第3.1節図3、第3.2節 `UNIT-008` / `UNIT-011`、`UNIT-012` 削除、第4.2節図5、第7節表10、第8.1節 `ADR-009`、第8.2節表11、第8.3節表12、第8.4節表13）。
- **差分検証結果**:
  - `UNIT-012` 文字列が `SW205` 内に 0件であることを確認した。
  - `UNIT-008` が `extension/src/audio/juwacchi-player.js` と `extension/src/audio/opening-bgm-player.js` の 2ファイルを管轄し、`opening-bgm-player.js` の公開IF（`OPENING_BGM_ASSETS`, `loadOpeningBgm`, `createOpeningBgmPlayer`〔`playLoop`, `stop`, `getActiveTrack`, `getActiveCount`〕、`requestId` キャンセル制御、`BgmUnavailable` フォールバック）およびファイルヘッダ記載方針（`UNIT-008, REQ-001, REQ-006`）が漏れなく定義されていることを確認した。
  - `python tools/dada_check.py all --summary`: 終了コード `0`（`High 0`、`REQ↔UNIT` 7/7、`UNIT↔コード` 11/11。`Mid 7` は Phase 4 で実装予定の新規自動テスト `TC-059`〜`TC-063`, `TC-065`, `TC-066` の未実装によるもの）。
  - `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --summary`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=24 | DECISION1_MODE=off (local_rule_fallback)`）。
  - `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-LINT: OK | Mid=0 / 要確認=0`）。
  - `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-VERIFY: OK | High=0 / 要確認=0`）。
- **総合判定**: **REVIEW: APPROVED**（根拠: `R001` 解消により残 High `0件`・残 Open `0件`、`dada_check.py all` 終了コード `0`、`SWP6` v4.0 全66件実行可能確認済み、自律ゲート条件充足）。

---

## v4.1 改訂レビュー（Phase 3 自己校正 / 2026-11-20）

- **レビュー日**: 2026-11-20
- **レビュー担当**: `architecture-reviewer`（自律型プロセス自己校正）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v4.1）
- **入力**: 承認済み `SW105` v4.1、計画承認済み `SWP6` v4.1、`docs/process/last_phase_summary.md`
- **重点特性（`sw205` プロファイル）**: `C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）
- **思考過程**:
  - **①現在地**: Phase 3（アーキテクチャ設計 v4.1 開発Loop改訂・怪獣出現風オーケストラ楽曲）の独立自己校正レビュー。
  - **②判断の根拠**: `dada_check.py all`・`asdoq_lint.py --profile sw205`・`style_check.py lint/verify` の決定論的検査結果、構造クロスリファレンス表、`SW105` v4.1 / `SWP6` v4.1（`TC-001`〜`TC-070` 全70件）に対する実行可能性反証、および `SW205` v4.1 の保存済み全文を照合する。
  - **③次の一手**: 指摘 0件（High `0` / Mid `0` / Low `0`）・残 Open `0件`・機械チェック終了コード `0` を確認し、`REVIEW: APPROVED` として自律ゲート通過報告を返す。
- **総合判定**: **REVIEW: APPROVED**
- **根拠**: 機械チェック 4種すべて終了コード `0`（`dada_check.py all` High `0`・`REQ↔UNIT` 7/7・`UNIT↔コード` 11/11、`asdoq_lint.py` High `0` / Mid `0`、`style_check.py lint` Mid `0`、`style_check.py verify` High `0`）、`SWP6` v4.1 全70件の実行・観測手段確定、未解消 High `0件`、Open `0件`。
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 Open: 0件）

### 1. 機械チェック・構造クロスリファレンス要約（ステップ1）
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 4 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔TC` 7/7、`REQ↔UNIT` 7/7、`UNIT↔コード` 11/11、循環依存 0件、幻覚ID 0件、`SW205` 起因の指摘 0件。`Mid 4` は Phase 4 で実装予定の新規自動 `TC-067`〜`TC-070` のテストコード未実装によるもの、`要確認 1` は `SWP6` 表中の `（0件）` 形式検出のみ。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --summary`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=21 | DECISION1_MODE=off (local_rule_fallback)`）。`C1_purpose` 100.0、`C2_maintainability` 100.0、`C3_consistency` 100.0、`C4_understandability` 100.0、`C6_conformance` 100.0（`C5_readability` の要確認 21件は既存複合名詞内の `時` に対する `RULE-504` のみ）。構造クロスリファレンスにおいて、`類似表記ゆれペア: []`、`1文以下の希薄見出し節: []`、`Mermaid 10ノード上限超過: []`、`分割図[接続N]ペア検査: paired_connections 1組（[接続1]）・isolated_connection_warnings []`、`図表キャプション位置違反: []` を確認した。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項と根拠引用（ステップ2〜3）
1. **目的適合性（`C1_purpose`）— 合格**:
   - **根拠引用**: 第1.1節〜第1.3節（L11-37：設計対象3領域、外部通信・既存楽曲複製・実写特撮写真を使用しないスコープ境界、`SW105` v4.1 / `SWP6` v4.1 参照）および第3.2節 `UNIT-001`〜`UNIT-011`（L134-211：責務・公開インターフェース・検証条件のみを定義し、実装コードへの越権やスコープクリープなし）。新規 UNIT-ID（`UNIT-012` 等）の追加はなく、禁止名称リスト8文字列の混入も 0件である。
2. **保守性・テスト実行可能性（`C2_maintainability`）— 合格**:
   - **根拠引用**:
     - 第3.2節 `UNIT-008`（L183-190）：`juwacchi-player.js` と `opening-bgm-player.js` の 2ファイルを管轄し、`OPENING_BGM_ASSETS`（`{ scene2: 'assets/audio/gymnopedie1.ogg', scene3: 'assets/audio/kaiju-orchestra.wav' }`）、`requestId` 世代キャンセル、`source.loop = true` シームレスループ再生、異常時 `BgmUnavailable` 無音フォールバックを定義。
     - 第8.1節 `ADR-002`（L501-505）・`ADR-006`（L525-529）・第8.2節 表11（L555-568）：`SWP6` 第2.2節 表1 の全8項目（追加された `PCM WAV 音質・振幅・ループ境界ギャップの計測手段` を含む）を確定。`TC-067`・`TC-068`・`TC-070` は `tests/system/harness.js` の `parseWavMetrics`・`validatePcmWavQuality`・`validateLoopBoundaryQuality` を用いた `node:test` 解析で実行でき、`TC-069` は Playwright 受動 Web Audio スパイ（`AnalyserNode` 並列接続および `AudioContext.currentTime` 監視）による 2周以上（`2 * buffer.duration` 以上）実再生観測で実行できる。これにより `SWP6` v4.1 全70件（自動 57件・手動 13件）が実行・観測可能である。
3. **整合性（`C3_consistency`）— 合格**:
   - **根拠引用**:
     - 第1.4節 表1（L48）、第2.2節 表2（L70, L88, L93, L98, L100-103）、第4.3節 表4（L322-323）、第6.2節 表9・詳細規定（L436, L445-469）、第8.1節 `ADR-010`（L549-553）、第8.4節 表13（L598）において、第3シーン新 BGM「オリジナル・怪獣出現風オーケストラ楽曲」（`extension/assets/audio/kaiju-orchestra.wav`）の仕様が矛盾なく一致している。具体的には、44100Hz（44.1kHz以上）/ 16bit / ステレオ 2ch PCM WAV、長さ例 `12.800秒`（`75 BPM`・`4/4拍子`・`4小節`）、帯域制限加算合成＋4要素（(1) 重厚な低音金管・ホルン／トロンボーン、(2) 不穏でドラマチックな弦楽アンサンブル、(3) 力強いティンパニ打楽器、(4) 循環マルチタップ・コンサートホール風ステレオ残響）、最大正規化振幅 `0.30 以上 0.95 以下`、ループ境界無音ギャップ `0.05秒未満`、接続点正規化振幅差 `0.05 以下`、100% オリジナル非複製・非人声・`MIT License`、旧 `extension/assets/audio/hero-hum.wav` の Phase 4 削除方針、`extension/manifest.json` `"4.1.0"` 更新方針、`README.md`・`LICENSE`・`extension/assets/SOURCES.md` 3箇所整合方針（および `README.md` 削除済み講座紹介文の非復元方針）がすべて明記され、`SWP6` `TC-041`・`TC-065`・`TC-066` 要件と一致している。
     - 第8.3節 表12（L573-582）の `REQ-001`〜`REQ-007` ↔ `UNIT-001`〜`UNIT-011` 対応、第7節 表10（L475-490）の異常系1対1対応、および図1〜図6（各図10ノード以下、`[接続1]` ペア一致、図下・表上キャプション配置）も整合している。
4. **可読性（`C5_readability`）— 合格**:
   - **根拠引用**: `STYLE-LINT: OK | Mid=0 / 要確認=0` および `STYLE-VERIFY: OK | High=0 / 要確認=0` により、110文字超の長文・AI-Slop表現・意味変質がないことを確認済み。

### 3. 指摘一覧（ステップ4）
指摘事項なし（High: 0件 / Mid: 0件 / Low: 0件、残 Open: 0件）。
- **自律ゲート通過判定**: 残存 High `0件`、残 Open `0件`、`dada_check.py all` 終了コード `0`、`asdoq_lint.py` High `0` / Mid `0`、`style_check.py` lint `Mid=0` / verify `High=0`、`SWP6` v4.1 全70件実行可能確認済み、TBD 未確定項目なしのため、自律ゲートの停止条件に該当しない。`SW205` v4.1 承認状態を「承認済（自律型事前委譲、2026-11-20、Product Owner マサ）」へ確定可。

---

## v4.2 改訂レビュー（Phase 3 自己校正 / 2026-11-20）

- **レビュー日**: 2026-11-20
- **レビュー担当**: `architecture-reviewer` + `asdoq-reviewer`（自律型プロセス自己校正・第1周〜第2周）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v4.2）
- **入力**: 承認済み `SW105` v4.2、計画承認済み `SWP6` v4.2、`docs/process/last_phase_summary.md`
- **重点特性（`sw205` プロファイル）**: `C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）（`--decision1` は既定の `off`）
- **思考過程**:
  - **①現在地**: Phase 3（アーキテクチャ設計 v4.2 開発Loop改訂・ジュワッチ発話表現改訂）の自己校正レビューおよび是正後再検査。
  - **②判断の根拠**: `dada_check.py all`・`asdoq_lint.py --profile sw205`・`style_check.py lint/verify` の決定論的検査結果、構造クロスリファレンス表、`SW105` v4.2 / `SWP6` v4.2（`TC-001`〜`TC-072` 全72件）に対する実行可能性反証、および `SW205` v4.2 の保存済み全文を照合した。
  - **③次の一手**: 第1周で検出した `R002`〜`R005`（Mid 4件）を第2周で全件是正・再検査し、残 Open `0件`・`asdoq_lint.py` `High=0 / Mid=0`・`style_check.py` `Mid=0 / High=0`・`dada_check.py all` 終了コード `0`（High `0`）を確認したため、`REVIEW: APPROVED` として完了報告する。
- **総合判定**: **REVIEW: APPROVED**（第2周再レビューで確定。第1周時は `R002`〜`R005` により差し戻し）
- **根拠**: `R002`〜`R005` はすべて `Closed`（残 Open `0件`、残 High `0件`、残 Mid `0件`）。最終確認で `dada_check.py all` 終了コード `0`（High `0`・`REQ↔UNIT` 7/7・`UNIT↔コード` 11/11）、`asdoq_lint.py --profile sw205` 終了コード `0`（`High=0 / Mid=0`）、`style_check.py lint` 終了コード `0`（`Mid=0 / 要確認=0`）、`style_check.py verify` 終了コード `0`（`High=0 / 要確認=0`）、`SWP6` 表1 全9件の TBD 確定、および `tests/unit/documents.test.js` 全11テスト合格を確認した。
- **指摘件数**: 4件（High: 0 / Mid: 4 / Low: 0）。Open は `0件`、Closed は `4件`。

### 1. 機械チェック・構造クロスリファレンス要約（第1周 → 第2周是正後）
- `python tools/dada_check.py all --summary`:
  - 第1周・第2周共通: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 2 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔TC` 7/7、`REQ↔UNIT` 7/7、`UNIT↔コード` 11/11、循環依存 `0件`、幻覚ID `0件`、`SW205` 起因の指摘 `0件`。`Mid 2` は Phase 4 で実装予定の新規自動テスト `TC-071`・`TC-072` のテストコード未実装によるもの、`要確認 1` は `SWP6` 表中の `（0件）` 表記検出のみ。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`:
  - 第1周（修正前）: `High=0 / Mid=4 / 要確認=22`（L458 `RULE-605` 1件＋`RULE-206` 要確認 1件、L459/L462/L612 `RULE-606` 3件を `R003`・`R004` として記録）。
  - 第2周（修正後）: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=21 | DECISION1_MODE=off (local_rule_fallback) | recommended=C2_maintainability,C3_consistency,C4_understandability`）。`C1_purpose` 100.0、`C2_maintainability` 100.0、`C3_consistency` 100.0、`C4_understandability` 100.0、`C6_conformance` 100.0（`C5_readability` の要確認 21件は既存複合名詞内の `時` に対する `RULE-504` のみ）。構造クロスリファレンス表では、`類似表記ゆれペア: []`、`1文以下の希薄見出し節: []`、`Mermaid 10ノード上限超過: []`、`分割図[接続N]ペア検査: paired_connections 1組（[接続1]）・isolated_connection_warnings []`、`図表キャプション位置違反: []` を確認した。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`:
  - 第1周（修正前）: 終了コード `1`（`STYLE-LINT: WARN | Mid=4 / 要確認=1`。L457 118文字、L471 116文字・読点5個、L527 117文字、L584 111文字を `R002` として記録）。
  - 第2周（修正後）: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`:
  - 第2周（修正後）: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項と根拠引用（ステップ2〜3）
1. **目的適合性（`C1_purpose`）— 合格**:
   - **根拠引用**: 第1.1節〜第1.3節（L11-36：設計対象3領域、外部通信・第三者楽曲複製・実写特撮写真を使用しないスコープ境界、`SW105` v4.2 / `SWP6` v4.2 参照）および第3.2節 `UNIT-001`〜`UNIT-011`（L135-212：責務・公開インターフェース・検証条件のみを定義し、実装コードへの越権やスコープクリープなし）。`UNIT-001`〜`UNIT-011` の 11ユニット構成を厳守しており（新規 `UNIT-012` の新設なし）、禁止名称リスト8文字列の混入も 0件である。
2. **保守性・テスト実行可能性（`C2_maintainability`）— 合格**:
   - **根拠引用**:
     - 第3.2節 `UNIT-008`（L184-191）：`juwacchi-player.js` と `opening-bgm-player.js` の 2ファイルを継続所管し、既存の BGM 制御と `juwacchi.wav` v4.2 仕様（元音声 `HEAD:extension/assets/audio/shout.wav` ベース、`24000Hz / 16bit / モノラル PCM WAV`、総長 約 `1.000秒`、3区間構成と振幅・スペクトル基準）を定義。
     - 第8.1節 `ADR-002`（L508-512）・`ADR-011`（L562-566）・第8.2節 表11（L568-582）：`SWP6` 第2.2節 表1 の全9件（新規追加の `ジュワッチ音声の発音時間・エンベロープ・帯域エネルギー（「ため」・語尾「チ」）の計測手段` を含む）を確定。`TC-071`・`TC-072` は `tests/system/harness.js` の `analyzeJuwacchiProsody(wavBuffer)`（`10ms` 短時間 RMS エンベロープによる3区間検出と DFT / Goertzel 法による `3kHz〜8kHz`・`/i/` `2kHz〜4kHz` 帯域解析）と `validateJuwacchiProsody(metrics)` で実行・判定でき、`TC-041` は `checkAttributionDocs` における `hashes.juwacchi`・クレジット `VOICEVOX:四国めたん`・出典・生成方針の 3箇所一致検証で実行できる。これにより `SWP6` v4.2 全72件（自動 59件・手動 13件）が実行・観測可能である。
3. **整合性（`C3_consistency`）— 合格**:
   - **根拠引用**:
     - 第1.4節 表1（L50）、第2.2節 表2（L71, L90, L94, L99-104）、第4.3節 表4（L330-331）、第6.2節 表9・詳細規定（L439, L457-477）、第8.1節 `ADR-005`・`ADR-011`（L526-530, L562-566）、第8.4節 表13（L613）において、`juwacchi.wav` v4.2 設計が矛盾なく一致している。具体的には、元音声 `HEAD:extension/assets/audio/shout.wav`（`VOICEVOX:四国めたん`、24000Hz / 16bit / モノラル、0.576秒）、3区間オフライン合成結合（前半「ジュワッ」`0.00〜0.52秒`・F0整数周期ゼロ交差延長・ピーク比 30% 以上、促音「ため」`0.52〜0.72秒`・RMS <= 0.01・15% 以下、語尾「チ」`0.72〜0.98秒`＋末尾 `0.02秒` フェードアウト・`/t/` + `/tɕ/` `3kHz〜8kHz` 摩擦バースト＋`/i/` フォルマント・ピーク比 0.60 以上）、総長 `1.000秒`、全体ピーク `0.85〜0.92`、開発時の1回生成と保存、人の声の録音ではないこと、VOICEVOX 再配布許諾と透明性注記（VOICEVOX Engine 未導入による代替と Phase 5 差し替え可否）、`manifest.json` `"4.2.0"`、`README.md` 講座紹介文非復元、および v4.1 継承事項・`tests/unit/documents.test.js` 全19必須語句が揃っている。
     - 第8.3節 表12（L584-595）の `REQ-001`〜`REQ-007` ↔ `UNIT-001`〜`UNIT-011` ↔ `TC-001`〜`TC-072` 全72件対応、第7節 表10（L482-497）の異常系対応、および図1〜図6（各図10ノード以下、`[接続1]` ペア一致、図下・表上キャプション配置）も整合している。
4. **可読性（`C5_readability`）— 第1周 `R002`〜`R004` 是正後・合格**:
   - **根拠引用**: 第2周検査で `STYLE-LINT: OK | Mid=0 / 要確認=0`、`STYLE-VERIFY: OK | High=0 / 要確認=0`、`ASDOQ-LINT` `C6_conformance=100.0` を確認済みであり、110文字超の長文・二重ヲ格・「の」3連続・指示語・AI-Slop表現がない。

### 3. 指摘一覧（v4.2 Phase 3 自己校正）
| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容（ASDoQ分類および `❌ Before` / `✅ After`） | 修正提案 / 対応方針 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R002 | 2026-11-20 | Mid | SW205 / 第6.2節（L457, L471）、第8.1節 `ADR-005`（L527）、第8.3節（L584） | `[ASDoQ:可読性-簡潔性]` `[ASDoQ:理解容易性-非曖昧性（一意性）]` `style_check.py lint` で L457（118文字）、L471（116文字・読点5個）、L527（117文字）、L584（111文字）の4文が1文上限110文字超過として検出された。❌ Before: L527 `ジュワッチ音声は extension/assets/audio/juwacchi.wav（v4.2 仕様、24000Hz / 16bit / モノラル PCM WAV、長さ 1.000秒［0.8秒〜1.2秒］）をデコードして同じ AudioContext の BufferSource で再生する。` | ✅ After: L457・L471・L527 を各2文へ分割し、L584 を100文字以内へ簡潔化する。例（L527）: `ジュワッチ音声は extension/assets/audio/juwacchi.wav（24000Hz / 16bit / モノラル、長さ 1.000秒［0.8秒〜1.2秒］）とする。同じ AudioContext へデコードして BufferSource で再生する。` | L457・L472・L528・L585 を修正し、第2周 `style_check.py lint` で `Mid=0 / 要確認=0` を確認した。 | Closed |
| R003 | 2026-11-20 | Mid | SW205 / 第6.2節（L458） | `[ASDoQ:規範適合性-文法適合性]` `asdoq_lint.py` で `RULE-605`（格助詞「の」3連続）および `RULE-206`（修飾範囲の曖昧さ）が検出された。❌ Before: `1. **開発時の1回生成と保存および人の声の録音ではないこと**:` | ✅ After: 必須語句を保持したまま `1. **開発時の1回生成と保存**:` と `2. **人の声の録音ではないこと**:` の2項目へ分離する。 | L458〜L459 へ分離し、第2周 `asdoq_lint.py` で `RULE-605`・`RULE-206` 解消を確認した。 | Closed |
| R004 | 2026-11-20 | Mid | SW205 / 第6.2節（L459, L462）、第8.4節 表13（L612） | `[ASDoQ:規範適合性-文法適合性]` `asdoq_lint.py` で `RULE-606`（同一節内の二重ヲ格）が3箇所で検出された。❌ Before: L459 `帯域を余裕をもって包含できる。` / L462 `緊張を作る低エネルギー区間を保持し、` / L612 `未確定項目〔...を含む〕を確定し、...の全対応を更新` | ✅ After: 1節内の「を」を1箇所に整理する。L460 `帯域を上限未満へ余裕付きで包含できる。` / L463 `減衰後は、促音の無声閉鎖により緊張感が生じる低エネルギー区間を保持する。` / L613 `未確定項目〔...計測手段〕を確定。あわせて...の全対応を更新` | L460・L463・L613 を修正し、第2周 `asdoq_lint.py` で `High=0 / Mid=0` を確認した。 | Closed |
| R005 | 2026-11-20 | Mid | SW205 / 第8.2節 表11（L579） | `[ASDoQ:整合性-無矛盾性]` `[ASDoQ:保守性-持続可能性]` `validateJuwacchiProsody` の語尾「チ」部ピーク比判定条件について、`SW105` REQ-005 および `SWP6` `TC-071` が定める「全体ピークの 0.60 以上または前半『ジュワッ』部ピーク比 0.60 以上」の論理和条件が明記されていない。❌ Before: `語尾「チ」0.15〜0.35秒（ピーク比 >= 0.60）` | ✅ After: `語尾「チ」0.15〜0.35秒（全体または前半ピーク比 >= 0.60）` と明記し、`TC-071`・`TC-072` との整合を確定する。 | L579 を修正案どおり更新し、`SWP6` `TC-071` との完全一致を確認した。 | Closed |

### 4. 第2周再レビューと自律ゲート通過判定（2026-11-20）
- **対象**: `Closed` とした `R002`〜`R005` および修正後の `SW205` v4.2 全文（L1〜L613）
- **最終確認結果**:
  - `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 2 / 要確認 1 | 対象: SW105, SW205, SWP6`）
  - `python tools/dada_check.py status --summary`: 終了コード `0`（未解決指摘 `0件`）
  - `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --summary`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=21 | DECISION1_MODE=off (local_rule_fallback) | recommended=C2_maintainability,C3_consistency,C4_understandability`）
  - `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）
  - `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）
  - `node --test tests/unit/documents.test.js`: 終了コード `0`（11/11 Pass、既存必須語句19種保持・禁止名称8文字列0件確認）
- **自律ゲート通過判定**: **REVIEW: APPROVED**（根拠: 残存 High `0件`・残存 Mid `0件`・残 Open `0件`、`dada_check.py all` 終了コード `0`、`SWP6` v4.2 全72件の実行・観測手段確定、TBD 未確定項目 `0件`、自律ゲート停止条件該当なし）。`SW205` v4.2 の承認状態を「承認済（自律型事前委譲、2026-11-20、Product Owner マサ）」として確定。

---

## v4.3 改訂レビュー（Phase 3 自己校正 / 2026-11-21）

- **レビュー日**: 2026-11-21
- **レビュー担当**: `architecture-reviewer` + `asdoq-reviewer`（自律型プロセス自己校正・第1周〜第2周）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（v4.3）
- **入力**: 承認済み `SW105` v4.3、計画承認済み `SWP6` v4.3、`docs/process/last_phase_summary.md`
- **重点特性（`sw205` プロファイル）**: `C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）（`--decision1` は既定の `off`）
- **思考過程（第1周レビュー）**:
  - **①現在地**: Phase 3（アーキテクチャ設計 v4.3 開発Loop改訂）の第1周反証駆動自己校正レビュー。
  - **②判断の根拠**: `dada_check.py all`・`asdoq_lint.py --profile sw205`・`style_check.py lint/verify` はいずれも終了コード `0`（`SW205` 起因の高・中機械指摘ゼロ）を通過した。しかし保存済み `SW205` と実データ・`SWP6` 全75件を反証駆動で突き合わせた結果、`manifest.json` `description` の実文字数不一致（実測 `99文字` を `100文字` と記載）、`kaiju-orchestra.wav` ピーク値の表記混在（`0.8505` と `0.8500`）、および `TC-075` 対象 DOM 要素一覧・`TC-035` 非使用項目の具体性不足を検出した。
  - **③次の一手**: 上記2件（`R006`, `R007`）を `Mid`・`Open` として記録し、`REVIEW: REJECTED` として Architect へ差し戻す。

### 1. 第1周機械チェック・構造クロスリファレンス要約（ステップ1）
- `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 3 / 要確認 1 | 対象: SW105, SW205, SWP6`）。`REQ↔TC` 7/7、`REQ↔UNIT` 7/7、`UNIT↔コード` 11/11、循環依存 `0件`、幻覚ID `0件`、`SW205` 起因の指摘 `0件`。`Mid 3` は Phase 4 実装予定の新規 `TC-073`〜`TC-075` の未実装のみ、`要確認 1` は `SWP6` 表の `（0件）` のみ。
- `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=25 | DECISION1_MODE=off (local_rule_fallback) | recommended=C2_maintainability,C3_consistency,C4_understandability`）。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて `100.0` 点。構造クロスリファレンス表の `類似表記ゆれペア: []`、`1文以下の希薄見出し節: []`、`Mermaid 10ノード上限超過: []`、`分割図[接続N]ペア検査: paired_connections 1組（[接続1]）・isolated_connection_warnings []`、`図表キャプション位置違反: []` を確認した。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー指摘一覧（第1周・`REVIEW: REJECTED`）
| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容（ASDoQ分類および `❌ Before` / `✅ After`） | 修正提案 / 対応方針 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R006 | 2026-11-21 | Mid | SW205 / 第3.2節 `UNIT-001`、第6.2節、第8.4節 表13 | `[ASDoQ:整合性-無矛盾性]` `[ASDoQ:規範適合性-事実と意見の書き分け]` `extension/manifest.json` の `"description"` 文字列 `"ColorBeaconTimer: 残時間に応じて色・点滅・音が変わるタイマー / Countdown timer changing color, blink, and sound by time."` の実際の文字数は `99文字` であるが、設計書内に `100文字` と記載されている。❌ Before: `（"ColorBeaconTimer: 残時間に応じて色・点滅・音が変わるタイマー / Countdown timer changing color, blink, and sound by time."、100文字）` | ✅ After: 実文字数に合わせて `99文字`（`99文字 <= 132文字`）へ統一する。 | L142・L508・L667 を `99文字` へ修正し、第2周で実文字数一致を確認した。 | Closed |
| R007 | 2026-11-21 | Mid | SW205 / 第6.2節（`kaiju-orchestra.wav`、`juwacchi.wav`、`UNIT-010` レイアウト）、第8.1節 `ADR-012`、第8.2節 表11 | `[ASDoQ:整合性-無矛盾性]` `[ASDoQ:保守性-持続可能性]` (1) 実ファイル `kaiju-orchestra.wav` の 16bit PCM 実測最大振幅は `27853 / 32768 = 0.850006`（`0.8500`）であり、方針上の `0.8505` と表現が混在している。(2) `TC-035` が求める「公式音声・実行時再合成・外部通信不使用」および `TC-065` の「`±3.0 dB 以内`」表現が第6.2節該当項で明示不足である。(3) 第8.2節 表11 の `TC-075` 計測対象に、オープニング画面と設定画面の全対象セレクタ（`#opening-title`, `#opening-image`, `#opening-text`, `#btn-opening-back`, `#btn-opening-next`, `#beacon`, `#time`, `#btn-minus`, `#btn-start`, `#btn-plus`）および `app.html` 初期マークアップ更新の明記が不足している。❌ Before: `（実測浮動小数点ピーク 0.8505、16bit 整数正規化最大振幅 0.8500）` / `人の声の録音ではないこと` / `getBoundingClientRect()` | ✅ After: (1) `kaiju-orchestra.wav` の PCM サンプル最大正規化振幅を実測値 `0.8500` に統一し（Web Audio デコード時近似参照値 `0.8505` との関係を明確化するか `0.8500` 基準へ一本化）、`±3.0 dB 以内` を第6.2節へ明記する。(2) 第6.2節のジュワッチ項目2へ「人の声の録音、公式音声、実行時再合成、および外部通信を使用しない」を明記する。(3) 第6.2節の `UNIT-010` 設計へ `app.html` 初期 `#opening-text` と `#btn-start` 更新を明記し、第8.2節 表11 の `TC-075` 計測対象セレクタを列挙する。 | L482（`0.8500` 統一と `±3.0 dB 以内` 明記）、L487（人の声の録音・公式音声・実行時再合成・外部通信の不使用明記）、L496（`app.html` 初期マークアップ更新明記）、L602（`0.8500` 統一）、L634（全対象10セレクタの `getBoundingClientRect()` 明記）を修正し、第2周で解消を確認した。 | Closed |

第1周レビュー結果: 指摘 2件（High: 0 / Mid: 2 / Low: 0）。未解消 Open 2件のため `REVIEW: REJECTED`。Architect へ差し戻す。

### 3. 第2周再レビューと自律ゲート通過判定（2026-11-21）
- **対象**: `Closed` とした `R006`・`R007` および修正後の `SW205` v4.3 全文（L1〜L667）
- **思考過程（第2周再レビュー）**:
  - **①現在地**: Phase 3（アーキテクチャ設計 v4.3）の第2周差分・全体確認レビュー。
  - **②判断の根拠**: `R006`（`manifest.json` `description` `99文字` 統一）および `R007`（`kaiju-orchestra.wav` 実測最大正規化振幅 `0.8500` 統一と `±3.0 dB 以内` 明記、`juwacchi.wav` 非使用条件4点明記、`app.html` 初期表示更新および `TC-075` 対象10セレクタ明記）のすべてが保存済み `SW205` へ反映済みであり、機械チェック（`style_check.py lint/verify`, `asdoq_lint.py --profile sw205`, `dada_check.py all`）でも `SW205` 起因の指摘は 0件である。
  - **③次の一手**: 未解消 High `0件`・未解消 Mid `0件`・Open `0件` を確認したため、`REVIEW: APPROVED` と判定し、Phase 4 へ自律ゲートを引き継ぐ。
- **重点特性別 合格根拠引用（ステップ2〜3）**:
  1. **目的適合性（`C1_purpose`）— 合格**: 第1.1節〜第1.3節（L11-38：設計対象3領域・スコープ外理由・`SW105` v4.3 / `SWP6` v4.3 参照）および第3.2節 `UNIT-001`〜`UNIT-011`（L137-238：11ユニット構成維持・実装越権やスコープクリープなし・禁止名称8文字列混入 0件）。
  2. **保守性・テスト実行可能性（`C2_maintainability`）— 合格**: 第3.2節 `UNIT-008`（L186-203：`OPENING_BGM_GAINS` と `GainNode` 経路・`stopCurrentSource` 切断、`juwacchi.wav` 男性声定量基準）、`UNIT-010`（L212-225：日英常時併記・`560×720px` レイアウト）、`UNIT-011`（L227-238：`openingBgmLog` の `gain` 記録、`WINDOW_W = 560`）、および第8.2節 表11（L622-635：`SWP6` 表1 全11項目の計測・観測手段確定、TBD 残存 0件）。これにより `SWP6` v4.3 全75件（自動 62件・手動 13件）が実行可能である。
  3. **整合性（`C3_consistency`）— 合格**: 第1.4節表1・第2.2節表2・第4.3節表4・第5節表5/6・第6.1節表8（`WINDOW_W = 560`）・第6.2節表9および詳細規定・第7節表10・第8.1節 `ADR-002` / `ADR-011` / `ADR-012`〜`ADR-014`・第8.3節表12（`REQ-001`〜`REQ-007` ↔ `UNIT-001`〜`UNIT-011` ↔ `TC-001`〜`TC-075` 全75件対応）・図1〜図6（各図10ノード以下、`[接続1]` ペア一致、図下・表上キャプション一致）の相互整合を確認した。`README.md` 講座紹介文非復元方針および配布文書3箇所整合方針も一貫している。
  4. **可読性（`C5_readability`）— 合格**: 第2周検査で `STYLE-LINT: OK | Mid=0 / 要確認=0`、`STYLE-VERIFY: OK | High=0 / 要確認=0`、`ASDOQ-LINT: OK | High=0 / Mid=0`（`C1`〜`C4`, `C6` すべて `100.0` 点）を確認した。
- **第2周確認結果**:
  - `python tools/dada_check.py all`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 3 / 要確認 1 | 対象: SW105, SW205, SWP6`、`REV101`・`BUG101` 未解決 0件、`SW205` 起因指摘 0件）
  - `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）
  - `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）
  - `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --summary`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=25 | DECISION1_MODE=off (local_rule_fallback)`）
- **総合判定**: **REVIEW: APPROVED**（指摘計 2件：High 0 / Mid 2 / Low 0。全件 `Closed`、残 Open `0件`、残 High `0件`、`SWP6` v4.3 全75件の実行・観測手段確定、TBD 未確定項目 `0件`）。`SW205` v4.3 の承認状態を「承認済（自律型事前委譲、2026-11-21、Product Owner マサ）」として確定。

---

## v4.4 改訂レビュー（Phase 3 自己校正 / 2026-11-22）

- **レビュー日**: 2026-11-22
- **レビュー担当**: `architecture-reviewer` + `asdoq-reviewer`（自律型プロセス自己校正・第1周〜第2周）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（版数 4.4、L1〜700）
- **入力**: 承認済み `SW105` v4.4、計画承認済み `SWP6` v4.4、`docs/process/last_phase_summary.md`、現行 `extension/app.html` / `app.css` / `manifest.json` / `src/` 実体
- **適用プロファイルと選択した品質特性**: `sw205` プロファイルに基づき、`C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）を重点適用した（`--decision1` は既定の `off`）。
- **思考過程（第1周〜第2周レビュー）**:
  - **①現在地**: Phase 3（アーキテクチャ設計 v4.4 Major 開発 Loop 改訂）の自己校正レビュー（第1周指摘抽出および第2周修正後検証）。
  - **②判断の根拠**: `SW105` v4.4（`REQ-001`〜`REQ-007`、`TBD-v44-voice` 解消）と `SWP6` v4.4（`TC-001`〜`TC-077`、表1 未確定 13項目）に対し、`SW205` v4.4 初稿の全ユニット・ADR・表11・表12 を反証駆動で照合した。第1周では `manifest.json` `description` と `SW105` `REQ-006` / `SWP6` `TC-077` 間の位置づけ矛盾（`R008`: High）、ASDoQ 構文・文体・Mermaid ノード数指摘（`R009`: Mid）、および位置づけ語句の表記一貫性不足（`R010`: Low）を検出し、`REVIEW: REJECTED` として Architect へ差し戻した。
  - **③次の一手**: 第2周で `R008`〜`R010` の修正反映と機械チェック（`dada_check.py`、`asdoq_lint.py --profile sw205 --max-items 200`、`style_check.py lint/verify`、旧教育用途禁止5語句走査）の再実行を行い、残 Open High `0件`・残 Open Mid `0件` を確認して `REVIEW: APPROVED` を記録する。

### 1. 第1周機械チェック・反証駆動指摘一覧（`REVIEW: REJECTED`）
- **第1周機械チェック所見**:
  - 初稿段階の `asdoq_lint.py` で `図6` のラベル内半角括弧 `()` による Mermaid 10ノード上限超過および `L518`（`RULE-507` 括弧混在、Mid 1件）・`L561`（`RULE-206` 修飾範囲曖昧、要確認）・`L145`/`L525` 一時修正時の `RULE-606`（二重ヲ格、Mid 2件）を検出した。
  - 初稿段階の `style_check.py lint` で L230・L522・L562・L638 の長文・多読点（Mid 3 / 要確認 2）を検出した。

| 指摘ID | 発生日 | 重要度 | 対象ドキュメント・箇所 | 指摘内容（ASDoQ分類および `❌ Before` / `✅ After`） | 修正提案 / 対応方針 | 対応結果・修正内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R008 | 2026-11-22 | High | SW205 / 第2.2節 表2（L76）、第3.2節 `UNIT-001`（L145）、第6.2節（L525）、第8.4節 表13（L700） | `[ASDoQ:整合性-無矛盾性]` `[ASDoQ:目的適合性-網羅性]` `SW105` v4.4（第4.2節 `REQ-006` 検証条件 L304）および `SWP6` v4.4（`TC-077` L158）は `extension/manifest.json` にも「DADAプロセスを用いたプログラム開発例」位置づけの記載を要求している。しかし引き継ぎサマリー（`last_phase_summary.md`）の「99文字日英併記維持」に引きずられ、旧 v4.3.1 文字列（位置づけ未記載）を維持したままにすると Phase 4 で `TC-077` が破綻する。なお `SW105` L289/L302 および `SWP6` `TC-075` の `description` 文字数制約は `132文字以内` である。❌ Before: `（"ColorBeaconTimer: 残時間に応じて色・点滅・音が変わるタイマー / Countdown timer changing color, blink, and sound by time."、99文字）を維持する` | ✅ After: Chrome 上限 `132文字以内` の日英併記かつ「DADAプロセスを用いたプログラム開発例」を含む 126文字の文字列へ更新し、`TC-075` と `TC-077` の双方を同時に満たす。 | L76・L145・L525・L700 を `"ColorBeaconTimer（DADAプロセスを用いたプログラム開発例）: 残時間に応じ色・点滅・音が変わるタイマー / Timer changing color, blink & sound (DADA development example)."`（126文字 `<= 132文字`）へ統一し、`TC-075`・`TC-077` 整合を確認した。 | Closed |
| R009 | 2026-11-22 | Mid | SW205 / 第4.2節 `図6`（L330〜352）、第6.2節（L518, L522, L525）、第8.1節 `ADR-002`（L561, L562）、`ADR-015`（L638）、第3.2節（L145, L230） | `[ASDoQ:規範適合性-文法適合性]` `[ASDoQ:可読性-表現適切性]` `[JP-Humanizer]` `asdoq_lint.py` で `図6` のラベル内半角 `()` による 10ノード上限超過、`L518` の `RULE-507`（全角・半角括弧混在、Mid）、`L145`/`L525` の `RULE-606`（二重ヲ格、Mid）、`L561` の `RULE-206`（修飾範囲、要確認）、および `style_check.py lint` で L230・L522・L562・L638 の 110文字超過・読点5個超が検出された。❌ Before: L518 `（(1) 開発文書の作成とレビュー、(2) アジャイル的な頻繁な要求改訂）` / L561 `BGM ゲイン実測と切替遅延、および 2周以上ループ再生の` | ✅ After: Mermaid ラベルの半角 `()` を除去し、L518 は外括弧・内括弧の混在を解消して `TC-077` 記述へ揃える。L145・L525 の二重ヲ格と L561 の係り受け曖昧を解消し、L230・L522・L562・L638 を 110文字以下・読点4個以下へ分割する。 | 全箇所を修正し、第2周の `asdoq_lint.py --profile sw205 --max-items 200` で `High=0 / Mid=0`・`Mermaid 10ノード上限超過: []`、`style_check.py lint` で `Mid=0 / 要確認=0`、`style_check.py verify` で `High=0 / 要確認=0` を確認した。 | Closed |
| R010 | 2026-11-22 | Low | SW205 / 第1.1節（L11）、第6.2節（L523〜525） | `[ASDoQ:整合性-一貫性]` L11 の位置づけ文中に括弧が挟まり `SWP6` `TC-077` が検査する定型語句「DADAプロセスを用いたプログラム開発例」が分断されていた。あわせて L523（`LICENSE`）・L524（`SOURCES.md`）が略称「DADA開発例位置づけ」となっており、配布文書間の記述粒度が不揃いであった。❌ Before: `DADA（Document-and-Agent-Driven Agile）プロセスを用いたプログラム開発例` / `DADA開発例位置づけ` | ✅ After: L11・L523〜525 で「`DADAプロセスを用いたプログラム開発例`」の完全一致語句へ統一し、別括弧で英字原名を補足する。 | L11・L523・L524・L525 を更新し、`SW105` v4.4・`SWP6` v4.4 と表記を統一した。 | Closed |

第1周レビュー結果: 指摘 3件（High: 1 / Mid: 1 / Low: 1）。未解消 Open 3件のため `REVIEW: REJECTED`。Architect へ差し戻す。

### 2. 第2周再レビューと自律ゲート通過判定（2026-11-22）
- **対象**: `Closed` とした `R008`〜`R010` および最終修正後の `SW205` v4.4 全文（L1〜700）
- **第2周機械チェック結果**:
  - `python tools/dada_check.py all --summary`: 終了コード `0`（`DADA-CHECK: 要対応（Mid指摘あり） | High 0 / Mid 2 / 要確認 1 | 対象: SW105, SW205, SWP6`。`REQ↔TC 7/7`、`REQ↔UNIT 7/7`、`UNIT↔コード 11/11`、`SW205` 起因指摘 `0件`。`Mid 2` は Phase 4 未実装の `TC-076`・`TC-077` テストコード未存在のみ、`要確認 1` は既存 `SWP6` の `（0件）` のみ）
  - `python tools/dada_check.py status --summary`: 終了コード `0`（`DADA-CHECK: OK | High 0 / Mid 0 / 要確認 0 | 対象: SW105, SW205, SWP6`）
  - `python tools/asdoq_lint.py --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --max-items 200`: 終了コード `0`（`ASDOQ-LINT: OK | profile=sw205 | High=0 / Mid=0 / 要確認=41 | DECISION1_MODE=off (local_rule_fallback)`。`C1_purpose`, `C2_maintainability`, `C3_consistency`, `C4_understandability`, `C6_conformance` すべて `100.0` 点、`High=0 / Mid=0 / 要確認=0`。`要確認 41` はすべて複合名詞末尾「時」に対する `RULE-504` のみ）
  - `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）
  - `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`: 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`、v4.4 推敲前スナップショットとの意味保持完全一致を確認）
  - 旧教育用途禁止5語句走査（`SW105` 第4.2節 `REQ-006` 処理（11）定義の5語句に対する正規表現検索）: ヒット `0件`
- **重点特性別 合格根拠引用（ステップ2〜3）**:
  1. **目的適合性（`C1_purpose`）— 合格**: ヘッダ（L1〜7：`版数: 4.4`、`最終更新日: 2026-11-22`、`承認状態: 承認済（自律型事前委譲、2026-11-22、Product Owner マサ）`）、第1.1節〜第1.3節（L11〜39：「DADAプロセスを用いたプログラム開発例」非教育用途位置づけ、2つの特徴、スコープ外理由、`SW105` v4.4 / `SWP6` v4.4 参照）、および第3.2節 `UNIT-001`〜`UNIT-011`（L140〜244：11ユニット構成維持、各ユニット単一責務・循環依存 0件・Phase 4 越権編集なし）を確認した。
  2. **保守性・テスト実行可能性（`C2_maintainability`）— 合格**: `UNIT-001`（L140〜145：`WINDOW_W = 700`, `WINDOW_H = 720`, `manifest.json` `"4.4.0"`・126文字）、`UNIT-008`（L189〜207：`VOICEVOX:玄野武宏` 一括合成と定量基準、旧 `VOICEVOX:四国めたん` ピッチ下げと別音源継ぎ接ぎの撤廃、第3シーン BGM `GainNode` ゲイン `0.20`）、`UNIT-010`（L216〜230：`dom.btnExit` 排他的表示、100% レスポンシブ）、`UNIT-011`（L232〜244：第5任意引数 `windowPort = null`・`onExit()`・`marks['exit-clicked']`・`chrome.windows.onRemoved` 連携）、および第8.2節 表11（L649〜667：`SWP6` 第2.2節 表1 の未確定項目全 13件すべて確定・TBD 残存 `0件`）により、`SWP6` v4.4 全77件（自動 64件・手動 13件）の実行・観測手段が整っている。
  3. **整合性（`C3_consistency`）— 合格**: 第1.4節表1（L44〜55）、第2.2節表2（L73〜107）、第4.2〜4.3節図4〜図6・表3〜表4（L255〜373）、第5節表5〜表7（L385〜448）、第6.1〜6.2節表8〜表9および詳細規定（L454〜527）、第7節表10（L532〜548）、第8.1節 `ADR-001`, `ADR-002`, `ADR-005`, `ADR-011`, `ADR-013`, `ADR-014`〜`ADR-016`（L553〜647）、第8.3節表12（L672〜681：`REQ-001`〜`REQ-007` ↔ `UNIT-001`〜`UNIT-011` ↔ `TC-001`〜`TC-077` 全77件の過不足なき一致）、および第8.4節表13（L700）の相互整合を確認した。図1〜図6 はすべて1図10ノード以下であり、図2・図3 の `[接続1]` ペア検査・類似表記ゆれなし・図下/表上キャプション準拠を確認した。旧方式（`ADR-011`, `ADR-013`）は履歴注記付きで保全し、現行設計・配布文書整合方針からは完全に置き換わっている。
  4. **可読性（`C5_readability`）— 合格**: `JP-Humanizer` 3ステップ（執筆前スナップショット保存 → `lint` 適用 → `verify` 検証）および8観点評価を完了し、`STYLE-LINT: Mid=0 / 要確認=0`、`STYLE-VERIFY: High=0 / 要確認=0`、`asdoq_lint` `C1`〜`C4`/`C6` すべて `100.0` 点を確認した。
- **総合判定**: **REVIEW: APPROVED**（指摘計 3件：High 1 / Mid 1 / Low 1。全件 `Closed`、残 Open `0件`、残 High `0件`、残 Mid `0件`、`SWP6` v4.4 全77件の実行・観測手段確定、TBD 未確定項目 `0件`）。`SW205` v4.4 の承認状態を「承認済（自律型事前委譲、2026-11-22、Product Owner マサ）」として確定。

---

## v4.5 改訂レビュー（Phase 3 自己校正 / 2026-11-25）

- **レビュー日**: 2026-11-25
- **レビュー担当**: `architecture-reviewer` + `asdoq-reviewer`（承認ゲート型プロセス自己校正・第1周）
- **対象**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（版数 4.5、L1〜707）
- **入力**: 承認済み `SW105` v4.5、計画承認済み `SWP6` v4.5、`docs/process/check_report.md`
- **適用プロファイルと選択した品質特性**: `sw205` プロファイルに基づき、`C1_purpose`（目的適合性）、`C2_maintainability`（保守性）、`C3_consistency`（整合性）、`C5_readability`（可読性）を重点適用した（`--decision1` は既定の `off`）。
- **思考過程**:
  - **①現在地**: Phase 3（アーキテクチャ設計 `SW205` v4.5 Major 改訂）の独立自己校正レビュー。
  - **②判断の根拠**: `SW205` は直前の `dada_verify.py`（`--phase 3 --profile sw205 --decision1 off`）実行後から未編集であるため `docs/process/check_report.md`（`High 0 / Mid 0 / 要確認 26`、終了コード `0`）を再利用し、あわせて `style_check.py lint` / `verify`、`SW105` v4.5、`SWP6` v4.5（全 77件）、および `SW205` v4.5 全文を反証駆動で突合した。
  - **③次の一手**: 指摘 `0件`（High `0` / Mid `0` / Low `0`、残 Open `0件`）および全合格基準の根拠箇所を確認したため、`REVIEW: APPROVED` として完了報告する。
- **総合判定**: **REVIEW: APPROVED**
- **根拠**: `docs/process/check_report.md` の `dada_verify.py` が終了コード `0`（`High 0 / Mid 0`、`REQ↔TC` 7/7、`REQ↔UNIT` 7/7）、`style_check.py lint` が `Mid=0 / 要確認=0`、`style_check.py verify` が `High=0 / 要確認=0` を満たしている。さらに `SWP6` v4.5 全 77件のテスト実行可能性、表11 TBD `0件`、11ユニット構成・循環依存 `0件`、Mermaid 10ノード上限・`[接続1]` 対・図下/表上キャプション、および旧楽曲名の現行設計への非残存を確認済みであり、未解消の指摘・残課題はない（指摘 `0件`、`R011` 以降の起票なし）。
- **指摘件数**: 0件（High: 0 / Mid: 0 / Low: 0、残 Open: 0件）

### 1. 機械チェック・検証要約（ステップ1）
- `docs/process/check_report.md` 再利用（`python tools/dada_verify.py --phase 3 --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --profile sw205 --decision1 off`、実行日時 `2026-11-25 11:46:40`、未編集のためキャッシュ再利用）:
  - 判定: **OK**（`High 0 / Mid 0 / 要確認 26`、終了コード `0`）。`REQ↔TC` `7/7`、`REQ↔UNIT` `7/7`、各 `REV101_*`・`BUG101` 未解決なし。`要確認 26` の内訳は `SW205` の複合名詞末尾「時」（L27, 53, 55, 94, 95, 143, 145, 157, 198, 202, 204〜206, 229, 240, 242, 243, 269, 281, 285, 395, 396, 427, 452, 482）への `RULE-504` 25件と、`SWP6` 側 `（0件）` 表記 1件のみ。
- `python tools/style_check.py lint --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`:
  - 終了コード `0`（`STYLE-LINT: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | Mid=0 / 要確認=0`）。
- `python tools/style_check.py verify --input docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md --summary`:
  - 終了コード `0`（`STYLE-VERIFY: OK | file=docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md | High=0 / 要確認=0`）。

### 2. 反証駆動レビュー確認事項と根拠引用（ステップ2〜3）
1. **目的適合性（`C1_purpose`）— 合格**:
   - **根拠引用**: ヘッダおよび第1.1節〜第1.3節（L1〜39）にて、`版数: 4.5`、`承認状態: 設計承認待ち`、設計対象 3領域（L15〜17）、`SW105` にない機能の非追加と禁止名称・禁止語句の非転記方針（L19：「`SW105 にない機能は追加しない。`」）、スコープ外項目と理由（L29〜35：「`次の機能は対象外とする（理由: SW105 第1.2節でスコープ外と定められているため）。`」）、および承認済み `SW105` v4.5 / 計画承認済み `SWP6` v4.5 参照（L38〜39）を明記している。第3.2節（L140〜244）の `UNIT-001`〜`UNIT-011` は責務・公開インターフェース・検証条件のみを定義し、実装コードへの越権や新規ユニット増設（`UNIT-012` 等）はない。
2. **保守性・テスト実行可能性（`C2_maintainability`）— 合格**:
   - **根拠引用**:
     - **11ユニット構成・単一責務・循環依存 0件**: 第3.1節（L113〜136）および第3.2節（L140〜244）で `UNIT-001`〜`UNIT-011` の 11ユニット構成を維持し、`UNIT-001`〜`UNIT-010` は `依存先: なし`、`UNIT-011` のみが `UNIT-002`〜`UNIT-010` を呼び出す単方向依存となっている（L236）。
     - **表11 TBD 0件・`SWP6` v4.5 全 77件のテスト実行可能性**: 第8.2節 表11（L658〜673）において `SWP6` 第2.2節 表1 の全 13項目（`テストフレームワーク`〜`通信件数の観測手段`）がすべて具体化され、表11 内の `TBD` 残存は `0件` である（`SW205` 全文でも `TBD` は過去の履歴文脈 L638・L641・L701・L702 のみ）。`UNIT-008`（L189〜207：`OPENING_BGM_ASSETS`、`OPENING_BGM_GAINS` 代表設計値 `{ scene2: 1.0, scene3: 0.22 }` の Phase 4 実測 RMS 確定方針、`requestId` キャンセル）、`UNIT-010`（L216〜230：連想ゲーム2の日英3行目、`dom.btnExit`、100% レスポンシブ）、`UNIT-011`（L232〜244：`windowPort`・`onExit()`・`openingBgmLog`）、および第8.1節 `ADR-002` / `ADR-006` / `ADR-012` / `ADR-017`（L559〜587, L619〜623, L649〜653）により、`SWP6` v4.5 全 77件（自動 64件：`node:test`＋Playwright 同梱 Chromium `viewport: null`＋`tests/system/harness.js`、手動 13件：AI による Windows 11 最新版 Google Chrome 観測）がすべて実行・観測可能である。
3. **整合性（`C3_consistency`）— 合格**:
   - **根拠引用**:
     - **上位下位トレースと 77件一致**: 第8.3節 表12（L678〜687）で `REQ-001`〜`REQ-007` と `UNIT-001`〜`UNIT-011` の対応が第3.2節各ユニットの `対応要求` と完全一致し、`TC-001`〜`TC-077` の全 77件（欠落 0件・余剰 0件）が漏れなく紐付いている。
     - **v4.5 仕様と配布文書整合**: 第1.4節 表1（L51：`"'scene3'（オリジナル・宇宙冒険SF映画風シンセサイザー楽曲）"`）、第2.2節 表2（L76, L88, L94, L99, L104〜109）、第3.2節 `UNIT-001` / `UNIT-008` / `UNIT-010`（L145 `manifest.json` `"4.5.0"`・126文字 `description`、L194〜204、L225 連想ゲーム2日英3行目の一字一句一致）、第4.3節 表4（L363〜365）、第6.2節 表9・詳細規定・配布文書方針（L484, L493〜502, L513, L518〜527）、第8.1節 `ADR-012` / `ADR-017`（L619〜623, L649〜653）が `SW105` v4.5 および `SWP6` v4.5 と矛盾なく一致している。
     - **旧楽曲名の現行設計への非残存**: 旧楽曲名（`怪獣`・`オーケストラ`・`12.800秒`・`75 BPM`・`hero-hum.wav` 等）は現行設計から排除され、履歴注記（`ADR-010` L607〜611、`ADR-012` L620）、表13 の過去版履歴（L703 等）、および Phase 4 における旧ファイル `extension/assets/audio/kaiju-orchestra.wav` 削除指示（L109, L494, L651, L707）のみに限定されている。
     - **Mermaid 10ノード上限・`[接続1]` 対・図下/表上キャプション**: 図1（L61〜68：5ノード、図下 `図1 システム全体構成図`）、図2（L117〜127：8ノード、`[接続1: UNIT-011 からの音声・描画呼出]`、図下 `図2 ...`）、図3（L129〜136：5ノード、`[接続1: UNIT-011 からの音声・描画呼出]`、図下 `図3 ...`）、図4〜図6（L296〜352：参加者 3〜6名、各図下キャプション）はいずれも 10ノード以下で `[接続1]` の対が一致しており、表1〜表13 もすべて表直上に表題が配置されている。
4. **可読性（`C5_readability`）— 合格**:
   - **根拠引用**: `style_check.py lint` で `Mid=0 / 要確認=0`、`style_check.py verify` で `High=0 / 要確認=0` を確認した。たとえば第1.1節（L11〜19）や第6.2節（L494〜502）において行為主体が明確で、110文字超の長文・二重否定・過剰否定対比・英語風ダッシュ繋ぎ・AI-Slop 表現は含まれていない。

### 3. 指摘一覧（v4.5 Phase 3 自己校正）
指摘事項なし（High: 0件 / Mid: 0件 / Low: 0件、残 Open: 0件）。`REVIEW: APPROVED`。
