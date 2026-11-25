/**
 * ファイル名： blink-interval.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 赤色点滅の点灯時間および消灯時間を残時間から線形計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-006, REQ-004
 */

import {
  RED_FAST_THRESHOLD_MS,
  RED_MAX_PHASE_MS,
  RED_MIN_PHASE_MS,
  ZONE_RED_MS,
} from "./constants.js";

/**
 * 関数名： redPhaseDurationMs
 * 戻り値： 点灯時間（および等しい消灯時間）のミリ秒。remainingMs <= 0 は 0。
 * 引数： remainingMs は周期開始時点の残時間（ミリ秒）。
 * 関数の概要： 1分時点で 1000ms、10秒以下で 100ms となる線形加速点滅の片側時間を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-006, REQ-004
 */
export function redPhaseDurationMs(remainingMs) {
  if (remainingMs <= 0) {
    return 0;
  }

  // 10秒（10000ms）以下は最短 100ms に固定する。
  if (remainingMs <= RED_FAST_THRESHOLD_MS) {
    return RED_MIN_PHASE_MS;
  }

  // 60秒（60000ms）以上は上限 1000ms とする。
  if (remainingMs >= ZONE_RED_MS) {
    return RED_MAX_PHASE_MS;
  }

  // 10秒 < t <= 60秒 の区間は 0.1 + 0.9 * (t - 10) / 50 秒で線形補間する。
  const t = remainingMs / 1000;
  const seconds = 0.1 + 0.9 * ((t - 10) / 50);
  return Math.round(seconds * 1000);
}
