/**
 * ファイル名： setting-time.js
 * バージョン番号： 2.2.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 設定時刻を 10000 ミリ秒単位で増減してクランプし、長押し早送りステップ数を計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-004, REQ-002
 */

import {
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_INTERVAL_MS,
  SETTING_MAX_MS,
  SETTING_MIN_MS,
} from "./constants.js";

/**
 * 関数名： adjustSetting
 * 戻り値： クランプ後の設定時刻（ミリ秒）。
 * 引数： currentMs は現在の設定時刻（ミリ秒）、deltaMs は増減量（ミリ秒）。
 * 関数の概要： 設定時刻を増減し、下限 60000 ミリ秒・上限 180000 ミリ秒の範囲に収める。
 * 対応機能ID（トレーサビリティ）： UNIT-004, REQ-002
 */
export function adjustSetting(currentMs, deltaMs) {
  // 増減後の値を下限と上限でクランプする。
  const next = currentMs + deltaMs;
  return Math.min(SETTING_MAX_MS, Math.max(SETTING_MIN_MS, next));
}

/**
 * 関数名： longPressRepeatSteps
 * 戻り値： 追加すべき早送り増減ステップ数（0 以上の整数）。
 * 引数： holdElapsedMs は押下開始からの経過時間（ミリ秒）、appliedRepeatCount は既に適用済みの早送り回数。
 * 関数の概要： 2000 ミリ秒経過後から 200 ミリ秒ごとに追加すべき増減ステップ数を算出する。
 * 対応機能ID（トレーサビリティ）： UNIT-004, REQ-002
 */
export function longPressRepeatSteps(holdElapsedMs, appliedRepeatCount) {
  // 開始待機時間未満は早送りステップを発生させない。
  if (!Number.isFinite(holdElapsedMs) || holdElapsedMs < LONG_PRESS_DELAY_MS) {
    return 0;
  }
  // 2000ms 経過時点から 200ms ごとの累積到達回数と適用済み回数の差分を返す。
  const totalRepeats = Math.floor((holdElapsedMs - LONG_PRESS_DELAY_MS) / LONG_PRESS_INTERVAL_MS);
  const applied = Number.isFinite(appliedRepeatCount) ? Math.max(0, appliedRepeatCount) : 0;
  return Math.max(0, totalRepeats - applied);
}
