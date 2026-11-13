/**
 * ファイル名： remaining-time.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 残時間、分:秒の表示、色の区分を計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-006, REQ-004, REQ-005
 */

import { ZONE_BLUE_BLINK_MS, ZONE_RED_MS } from "./constants.js";

/**
 * 関数名： remainingMs
 * 戻り値： 0 以上の残時間。単位はミリ秒。
 * 引数： startMs は開始時の長さ。elapsedMs は開始からの経過。
 * 関数の概要： 開始値から経過を引き、負の経過は 0 として、結果も 0 未満にしない。
 * 対応機能ID（トレーサビリティ）： UNIT-006, REQ-004
 */
export function remainingMs(startMs, elapsedMs) {
  const elapsed = elapsedMs < 0 ? 0 : elapsedMs;
  const left = startMs - elapsed;
  return left < 0 ? 0 : left;
}

/**
 * 関数名： formatRemaining
 * 戻り値： 分:秒の文字列。秒は2桁。
 * 引数： ms は残時間。単位はミリ秒。
 * 関数の概要： 1000 の倍数はその秒を出し、それ以外は小数点以下を切り上げた秒を出す。
 * 対応機能ID（トレーサビリティ）： UNIT-006, REQ-004, REQ-005
 */
export function formatRemaining(ms) {
  const safe = ms < 0 ? 0 : ms;
  const seconds = safe % 1000 === 0 ? safe / 1000 : Math.ceil(safe / 1000);
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return minute + ":" + String(second).padStart(2, "0");
}

/**
 * 関数名： beaconZone
 * 戻り値： blue-solid、blue-blink、red-blink、zero のいずれか。
 * 引数： ms は残時間。単位はミリ秒。
 * 関数の概要： 表示上の秒ではなく、残時間のミリ秒で色の区分を決める。
 * 対応機能ID（トレーサビリティ）： UNIT-006, REQ-004, REQ-005
 */
export function beaconZone(ms) {
  if (ms <= 0) {
    return "zero";
  }
  if (ms <= ZONE_RED_MS) {
    return "red-blink";
  }
  if (ms <= ZONE_BLUE_BLINK_MS) {
    return "blue-blink";
  }
  return "blue-solid";
}
