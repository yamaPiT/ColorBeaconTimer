/**
 * ファイル名： constants.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： SW205 第6節の設計定数を1か所に置く。各ユニットはここを参照する。
 * 対応機能ID（トレーサビリティ）： SW205 第6節
 */

/** オープニングを最後まで再生する長さ。単位はミリ秒。 */
export const OPENING_MS = 2500;

/** 出撃演出の長さ。単位はミリ秒。 */
export const SORTIE_MS = 2000;

/** 青のフェードアウトとフェードイン、それぞれの長さ。単位はミリ秒。 */
export const BLUE_PHASE_MS = 1000;

/** 赤の点滅間隔の下限。単位は秒。 */
export const RED_FLOOR_SEC = 0.33;

/** この値以下かつ赤の境界より大きいとき、青の点滅にする。単位はミリ秒。 */
export const ZONE_BLUE_BLINK_MS = 120000;

/** この値以下のとき、赤の点滅にする。単位はミリ秒。 */
export const ZONE_RED_MS = 60000;

/** 設定時刻の初期値。単位はミリ秒。 */
export const SETTING_INITIAL_MS = 180000;

/** 設定時刻の下限。単位はミリ秒。 */
export const SETTING_MIN_MS = 10000;

/** 設定時刻の上限。単位はミリ秒。 */
export const SETTING_MAX_MS = 300000;

/** 設定時刻の1回の変化量。単位はミリ秒。 */
export const SETTING_STEP_MS = 1000;

/** 長押しの繰り返し間隔。単位はミリ秒。 */
export const HOLD_REPEAT_MS = 300;

/** 地球の縮小にかける時間。単位はミリ秒。 */
export const EARTH_SHRINK_MS = 5000;

/** 地球の縮小開始時の一辺。単位は px。 */
export const EARTH_START_PX = 240;

/** 点とみなす地球の一辺。単位は px。 */
export const EARTH_POINT_PX = 4;

/** 専用ウィンドウの幅。単位は px。 */
export const WINDOW_W = 480;

/** 専用ウィンドウの高さ。単位は px。 */
export const WINDOW_H = 720;

/** ピコン音の周波数。単位は Hz。 */
export const PICON_HZ = 880;

/** ピコン音の長さ。単位はミリ秒。 */
export const PICON_MS = 80;
