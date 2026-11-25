/**
 * ファイル名： remaining-time.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 残時間の計算、切り上げ分:秒の整形、ランプ色区分の判定を行う。
 * 対応機能ID（トレーサビリティ）： UNIT-005, REQ-004, REQ-005
 */

import { ZONE_RED_MS } from "./constants.js";

/**
 * 関数名： remainingMs
 * 戻り値： 残時間（0 以上のミリ秒）。
 * 引数： startMs は開始時の設定時刻（ミリ秒）、elapsedMs は経過時間（ミリ秒）。
 * 関数の概要： 開始時刻から経過時間を差し引き、0 未満にならない残時間を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-005, REQ-004, REQ-005
 */
export function remainingMs(startMs, elapsedMs) {
  // 負の経過時間は 0 とみなし、残時間の下限を 0 に固定する。
  const elapsed = Math.max(0, elapsedMs);
  return Math.max(0, startMs - elapsed);
}

/**
 * 関数名： formatRemaining
 * 戻り値： 分:秒 形式の文字列（例: "1:01", "0:00"）。
 * 引数： ms は残時間（ミリ秒）。
 * 関数の概要： 残ミリ秒を 1000 で割った切り上げ秒数を 分:秒 文字列へ変換する。
 * 対応機能ID（トレーサビリティ）： UNIT-005, REQ-004, REQ-005
 */
export function formatRemaining(ms) {
  if (ms <= 0) {
    return "0:00";
  }

  // 1000 で割り切れる場合は商の整数秒、端数がある場合は切り上げる。
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * 関数名： beaconZone
 * 戻り値： 'blue-solid' | 'red-blink' | 'off'。
 * 引数： ms は残時間（ミリ秒）。
 * 関数の概要： 残時間に応じたカラービーコンの色・点滅区分を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-005, REQ-004, REQ-005
 */
export function beaconZone(ms) {
  // 60000ミリ秒より長い場合は青色点灯、60000以下かつ0超は赤色点滅、0以下は消灯。
  if (ms > ZONE_RED_MS) {
    return "blue-solid";
  }
  if (ms > 0) {
    return "red-blink";
  }
  return "off";
}
