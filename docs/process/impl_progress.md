# 実装進捗台帳 (Implementation Progress)

Phase 4 の実装状況を、会話の外に残すための台帳である。

- **対象設計書**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（版数: 4.6、承認済）
- **対象要求・テスト仕様**: `SW105` v4.6 / `SWP6` v4.6
- **最終更新日**: 2026-11-25

## 実装順序の方針

依存先を持たない計算ユニット（`UNIT-002`〜`UNIT-006`, `UNIT-009`）、ウィンドウ起動（`UNIT-001`）、音声ユニット（`UNIT-007`, `UNIT-008`）、描画・アセット（`UNIT-010`）の順に実装し、最後にフレーム制御（`UNIT-011`）で統合する。v4.6 Major 改訂では、全 11ユニット構造を維持したまま、変更のない計算・描画・終了制御ユニットの完了状態を保持し、変更対象ユニット（`UNIT-001` `manifest.json` `"4.6.0"`、`UNIT-008` `juwacchi.wav` 再合成・調整・`juwacchi-player.js` `JUWACCHI_GAIN = 0.17` 実装・`SOURCES.md` 更新）を実装した。あわせて `README.md`・`LICENSE`・`extension/store-listing.txt`・`tests/`（`TC-071`/`TC-072` 境界値更新、`TC-078`/`TC-079` 追加）を v4.6 へ同期し、単体テスト（70項目）、Python テスト（12件）、および総合テスト全 79件（自動 66件・手動 13件）を実施した。

## 進捗表

| UNIT-ID | ユニット名 | 対応要求 | 状態 | 実装ファイル | テスト | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-001 | 専用ウィンドウ起動 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 | 完了 | extension/src/background/window-launcher.js, extension/manifest.json | 4件グリーン | `manifest.json` `"4.6.0"`・126文字日英併記 `description` 維持、tests/unit/audio-window.test.js |
| UNIT-002 | 画面状態遷移 | REQ-001, REQ-003, REQ-005, REQ-007 | 完了 | extension/src/domain/app-state.js | 3件グリーン | tests/unit/domain.test.js（v4.6 変更なし） |
| UNIT-003 | オープニング進行計算 | REQ-001 | 完了 | extension/src/domain/opening-timeline.js | 2件グリーン | tests/unit/domain.test.js（v4.6 変更なし） |
| UNIT-004 | 設定時刻管理 | REQ-002 | 完了 | extension/src/domain/setting-time.js | 2件グリーン | tests/unit/domain.test.js（v4.6 変更なし） |
| UNIT-005 | 残時間と色区分計算 | REQ-004, REQ-005 | 完了 | extension/src/domain/remaining-time.js | 1件グリーン | tests/unit/domain.test.js（TC-030 含む、v4.6 変更なし） |
| UNIT-006 | 赤色点滅周期計算 | REQ-004 | 完了 | extension/src/domain/blink-interval.js | 1件グリーン | tests/unit/domain.test.js（TC-026, TC-027 含む、v4.6 変更なし） |
| UNIT-007 | ピコン音合成 | REQ-004, REQ-005, REQ-006 | 完了 | extension/src/audio/picon-synth.js | 2件グリーン | tests/unit/audio-window.test.js（v4.6 変更なし） |
| UNIT-008 | 同梱音声ファイル再生 | REQ-001, REQ-005, REQ-006 | 完了 | extension/src/audio/juwacchi-player.js, extension/src/audio/opening-bgm-player.js, extension/assets/audio/gymnopedie1.ogg, extension/assets/audio/space-adventure-synth.wav, extension/assets/audio/juwacchi.wav, extension/assets/SOURCES.md | 15件グリーン | `juwacchi.wav`（`VOICEVOX:玄野武宏` ノーマル `speaker=11`・24000Hz/16bit/1ch/0.700s/33,644bytes/SHA-256 `18f16866...`/Peak 0.9500/RMS 0.2180 [-13.23 dBFS]/F0 135.99Hz/`JUWACCHI_GAIN = 0.17`/実効 -28.62 dBFS/BGM差 +0.39dB）再合成・`read_file` 試聴済、`TC-078`/`TC-079` グリーン、tests/unit/audio-window.test.js |
| UNIT-009 | 終了ドット飛散計算 | REQ-007 | 完了 | extension/src/domain/ending-dots.js | 1件グリーン | tests/unit/domain.test.js（v4.6 変更なし） |
| UNIT-010 | 画面描画 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 | 完了 | extension/src/view/renderer.js, extension/app.html, extension/app.css, extension/store-listing.txt | 5件グリーン | `store-listing.txt` v4.6 同期済、tests/unit/renderer.test.js |
| UNIT-011 | フレーム制御 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007 | 完了 | extension/src/app/controller.js, extension/src/app/main.js, extension/src/domain/constants.js | 8件グリーン | tests/unit/controller.test.js（v4.6 変更なし） |

## SWP6テストの実行状況

完了（全 79件 Pass・0 Fail・0 Skipped）。
- 単体テスト (`npm run test:unit`): 70項目 Pass（0 Fail / 0 Skipped、17スイート・70テスト）。
- Python テスト (`python -m unittest discover -s tests -p "test_*.py"`): 12件 Pass（0 Fail / 0 Skipped、1.594s）。
- システム自動テスト (`npm run test:system`): 10ファイルテストケース Pass（8.0m、0 Fail / 0 Skipped、自動 66件 `TC` 網羅、実ビューポート `684×681px` / 外寸 `700×720px`）。
- 手動テスト観測 (`manual_observe_v46.mjs` + `read_file` スクリーンショット視覚確認・音声直接試聴): 手動 13件 Pass（`TC-005`, `TC-007`, `TC-012`, `TC-024`, `TC-025`, `TC-028`, `TC-033`, `TC-040`, `TC-044`, `TC-045`, `TC-050`, `TC-054`, `TC-064`）。
- 配布文書同期（`README.md`, `LICENSE`, `extension/assets/SOURCES.md`, `extension/store-listing.txt`）完了（`documents.test.js` Pass）。

## 中断・再開の記録

- **次にやること**: `style_check.py snapshot`・`dada_verify.py --phase 4`・`dada_check.py report` 終了コード `0` を確認後、`code-reviewer` および `test-reviewer` へ引き継ぐ。
