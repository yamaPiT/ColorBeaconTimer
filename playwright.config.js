/**
 * ファイル名： playwright.config.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 自動テストの実行設定。ブラウザは Playwright 同梱の Chromium。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節
 */

export default {
  testDir: "./tests/system",
  timeout: 240000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
};
