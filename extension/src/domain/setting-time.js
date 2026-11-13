/**
 * ファイル名： setting-time.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 設定時刻を1秒単位で増減し、範囲の外へ出さない。
 * 対応機能ID（トレーサビリティ）： UNIT-004, REQ-002
 */

import { SETTING_MAX_MS, SETTING_MIN_MS } from "./constants.js";

/**
 * 関数名： adjustSetting
 * 戻り値： 下限と上限のあいだへ収めた設定時刻。単位はミリ秒。
 * 引数： currentMs は現在の設定時刻。deltaMs は足す値で、減らすときは負。
 * 関数の概要： 加算したあと、10秒未満と5分超過を端の値に止める。
 * 対応機能ID（トレーサビリティ）： UNIT-004, REQ-002
 */
export function adjustSetting(currentMs, deltaMs) {
  const next = currentMs + deltaMs;
  if (next < SETTING_MIN_MS) {
    return SETTING_MIN_MS;
  }
  if (next > SETTING_MAX_MS) {
    return SETTING_MAX_MS;
  }
  return next;
}
