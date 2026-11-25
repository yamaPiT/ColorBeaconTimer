/**
 * ファイル名： constants.js
 * バージョン番号： 4.3.1
 * 作成日： 2026-11-21
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ColorBeaconTimer v4.3.1 の設計定数を一元管理する（実ビューポート幅 640px 以上確保のため WINDOW_W=700）。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */

/** オープニング第5シーンの長さ（立体青色ランプ拡大、ミリ秒） */
export const OPENING_SCENE5_MS = 5000;

/** 設定時刻の初期値（2:00、ミリ秒） */
export const SETTING_INITIAL_MS = 120000;

/** 設定時刻の下限（1:00、ミリ秒） */
export const SETTING_MIN_MS = 60000;

/** 設定時刻の上限（3:00、ミリ秒） */
export const SETTING_MAX_MS = 180000;

/** 設定時刻の増減単位（10秒、ミリ秒） */
export const SETTING_STEP_MS = 10000;

/** 設定ボタン長押し早送り開始までの待機時間（2秒、ミリ秒） */
export const LONG_PRESS_DELAY_MS = 2000;

/** 設定ボタン長押し早送りの連続増減間隔（0.2秒、ミリ秒） */
export const LONG_PRESS_INTERVAL_MS = 200;

/** 赤色点滅へ切り替わる残時間境界（1:00、ミリ秒） */
export const ZONE_RED_MS = 60000;

/** 赤色点滅が最短固定になる残時間境界（10秒、ミリ秒） */
export const RED_FAST_THRESHOLD_MS = 10000;

/** 赤色点滅の最短点灯・消灯時間（0.1秒、ミリ秒） */
export const RED_MIN_PHASE_MS = 100;

/** 赤色点滅の1分時点点灯・消灯時間（1.0秒、ミリ秒） */
export const RED_MAX_PHASE_MS = 1000;

/** 専用ウィンドウの幅（px、Windows 11 Chrome ポップアップ実ビューポート幅 640px 以上を確保） */
export const WINDOW_W = 700;

/** 専用ウィンドウの高さ（px） */
export const WINDOW_H = 720;

/** オリジナル合成ピコン音の周波数（Hz） */
export const PICON_HZ = 880;

/** オリジナル合成ピコン音の長さ（ミリ秒） */
export const PICON_MS = 80;

/** 終了演出で中央から飛散するドット数（個） */
export const ENDING_DOT_COUNT = 64;
