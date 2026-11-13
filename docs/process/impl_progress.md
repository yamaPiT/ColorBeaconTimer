# 実装進捗台帳 (Implementation Progress)

Phase 4 の実装状況を、会話の外に残すための台帳である。

- **対象設計書**: `docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md`（版数: 1.0）
- **最終更新日**: 2026-11-13

## 実装順序の方針

依存先を持たない計算ユニットから実装し、その後に描画、音声、フレーム制御、専用ウィンドウの順で結んだ。

## 進捗表

| UNIT-ID | ユニット名 | 対応要求 | 状態 | 実装ファイル | テスト | 備考 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-001 | 専用ウィンドウの起動 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007 | 完了 | extension/src/background/window-launcher.js | 4件グリーン | tests/unit/audio-window.test.js |
| UNIT-002 | 画面状態の遷移 | REQ-001, REQ-003, REQ-005, REQ-007 | 完了 | extension/src/domain/app-state.js | 6件グリーン | tests/unit/domain.test.js |
| UNIT-003 | オープニングの時刻表 | REQ-001 | 完了 | extension/src/domain/opening-timeline.js | 1件グリーン | tests/unit/domain.test.js |
| UNIT-004 | 設定時刻 | REQ-002 | 完了 | extension/src/domain/setting-time.js | 1件グリーン | tests/unit/domain.test.js |
| UNIT-005 | 出撃演出の時刻表 | REQ-003 | 完了 | extension/src/domain/sortie-timeline.js | 1件グリーン | tests/unit/domain.test.js |
| UNIT-006 | 残時間と表示と色区分 | REQ-004, REQ-005 | 完了 | extension/src/domain/remaining-time.js | 3件グリーン | TC-038 を含む |
| UNIT-007 | 点滅間隔 | REQ-004 | 完了 | extension/src/domain/blink-interval.js | 2件グリーン | TC-033 を含む |
| UNIT-008 | ピコン音 | REQ-004, REQ-006 | 完了 | extension/src/audio/picon-synth.js | 2件グリーン | tests/unit/audio-window.test.js |
| UNIT-009 | 掛け声の再生 | REQ-005, REQ-006 | 完了 | extension/src/audio/shout-player.js | 2件グリーン | tests/unit/audio-window.test.js |
| UNIT-010 | 終了演出の計算 | REQ-006, REQ-007 | 完了 | extension/src/domain/ending-timeline.js | 2件グリーン | tests/unit/domain.test.js |
| UNIT-011 | 描画 | REQ-001, REQ-003, REQ-004, REQ-006, REQ-007 | 完了 | extension/src/view/renderer.js | システムテストで確認 | 単独の node:test は無い |
| UNIT-012 | フレーム制御 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007 | 完了 | extension/src/app/controller.js, extension/src/app/main.js | 5件グリーン | tests/unit/controller.test.js。TC-019 と TC-034 と TC-050 を含む |

## SWP6テストの実行状況

自動の TC は、node:test と Playwright 同梱の Chromium で実施した。
手動の TC は、Phase 5 でマサが実施するまで未実施のままである。
結果の本文は SWP6 第5章に書く。

| TC-ID | 実行区分 | 実行結果 | 備考 |
| :--- | :--- | :--- | :--- |
| TC-001 | 自動 | Pass | tests/system/auto.spec.js |
| TC-002 | 自動 | Pass | tests/system/auto.spec.js |
| TC-003 | 自動 | Pass | tests/system/auto.spec.js |
| TC-004 | 自動 | Pass | tests/system/auto.spec.js |
| TC-005 | 手動 | 未実施（Phase 5 でマサが実施） | 顔の見た目 |
| TC-006 | 自動 | Pass | tests/system/auto.spec.js |
| TC-007 | 自動 | Pass | tests/system/auto.spec.js |
| TC-008 | 自動 | Pass | tests/system/auto.spec.js |
| TC-009 | 自動 | Pass | tests/system/auto.spec.js |
| TC-010 | 手動 | 未実施（Phase 5 でマサが実施） | 白黒の縦縞 |
| TC-011 | 手動 | 未実施（Phase 5 でマサが実施） | 設定画面の色と音 |
| TC-012 | 手動 | 未実施（Phase 5 でマサが実施） | マサの目視記録 |
| TC-013 | 自動 | Pass | tests/system/auto.spec.js |
| TC-014 | 手動 | 未実施（Phase 5 でマサが実施） | 便器の線画のあとの三面 |
| TC-015 | 自動 | Pass | tests/system/auto.spec.js |
| TC-016 | 自動 | Pass | tests/system/auto.spec.js |
| TC-017 | 自動 | Pass | tests/system/auto.spec.js |
| TC-018 | 自動 | Pass | tests/system/auto.spec.js |
| TC-019 | 自動 | Pass | tests/unit/controller.test.js と tests/system/auto.spec.js |
| TC-020 | 自動 | Pass | tests/system/auto.spec.js |
| TC-021 | 自動 | Pass | tests/system/auto.spec.js |
| TC-022 | 自動 | Pass | tests/system/auto.spec.js |
| TC-023 | 自動 | Pass | tests/system/auto.spec.js |
| TC-024 | 自動 | Pass | tests/system/auto.spec.js |
| TC-025 | 自動 | Pass | tests/system/auto.spec.js |
| TC-026 | 自動 | Pass | tests/system/auto.spec.js |
| TC-027 | 自動 | Pass | tests/system/auto.spec.js |
| TC-028 | 手動 | 未実施（Phase 5 でマサが実施） | 出撃演出の映像 |
| TC-029 | 手動 | 未実施（Phase 5 でマサが実施） | 青の点灯 |
| TC-030 | 手動 | 未実施（Phase 5 でマサが実施） | 青の点滅 |
| TC-031 | 自動 | Pass | tests/system/auto.spec.js |
| TC-032 | 自動 | Pass | tests/system/auto.spec.js |
| TC-033 | 自動 | Pass | tests/unit/domain.test.js |
| TC-034 | 自動 | Pass | tests/unit/controller.test.js と tests/system/auto.spec.js |
| TC-035 | 手動 | 未実施（Phase 5 でマサが実施） | 1:30 の見た目と音 |
| TC-036 | 手動 | 未実施（Phase 5 でマサが実施） | 0:30 の見た目と音 |
| TC-037 | 自動 | Pass | tests/system/auto.spec.js |
| TC-038 | 自動 | Pass | tests/unit/domain.test.js |
| TC-039 | 手動 | 未実施（Phase 5 でマサが実施） | 境界時刻の色名 |
| TC-040 | 自動 | Pass | tests/system/auto.spec.js |
| TC-041 | 手動 | 未実施（Phase 5 でマサが実施） | 2:00 と 1:00 の見た目 |
| TC-042 | 自動 | Pass | tests/system/auto.spec.js |
| TC-043 | 自動 | Pass | tests/system/auto.spec.js |
| TC-044 | 自動 | Pass | tests/system/auto.spec.js |
| TC-045 | 手動 | 未実施（Phase 5 でマサが実施） | 掛け声を聴く |
| TC-046 | 自動 | Pass | tests/system/auto.spec.js |
| TC-047 | 自動 | Pass | tests/unit/documents.test.js |
| TC-048 | 自動 | Pass | tests/system/auto.spec.js |
| TC-049 | 自動 | Pass | tests/system/auto.spec.js |
| TC-050 | 自動 | Pass | tests/unit/controller.test.js と tests/system/auto.spec.js |
| TC-051 | 自動 | Pass | tests/system/auto.spec.js |
| TC-052 | 自動 | Pass | tests/unit/documents.test.js |
| TC-053 | 手動 | 未実施（Phase 5 でマサが実施） | ピコン音を聴く |
| TC-054 | 自動 | Pass | tests/system/auto.spec.js |
| TC-055 | 自動 | Pass | tests/system/auto.spec.js |
| TC-056 | 自動 | Pass | tests/unit/documents.test.js |
| TC-057 | 手動 | 未実施（Phase 5 でマサが実施） | NASA の記章とロゴ |
| TC-058 | 自動 | Pass | tests/system/auto.spec.js |
| TC-059 | 自動 | Pass | tests/system/auto.spec.js |
| TC-060 | 自動 | Pass | tests/system/auto.spec.js |
| TC-061 | 手動 | 未実施（Phase 5 でマサが実施） | 星の流れ |
| TC-062 | 自動 | Pass | tests/system/auto.spec.js |
| TC-063 | 自動 | Pass | tests/system/auto.spec.js |
| TC-064 | 自動 | Pass | tests/system/auto.spec.js |
| TC-065 | 自動 | Pass | tests/system/auto.spec.js |

## 中断・再開の記録

- **次にやること**: 無し。自動テストは Pass。手動の 16 件は Phase 5 でマサが実施する。
