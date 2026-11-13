/**
 * ファイル名： opening-timeline.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： オープニング開始からの経過ミリ秒を、表示ステップへ変換する。
 * 対応機能ID（トレーサビリティ）： UNIT-003, REQ-001
 */

import { OPENING_MS } from "./constants.js";

/**
 * 関数名： openingStep
 * 戻り値： toilet、shake、face1、face2、face3、expand、done のいずれか。
 * 引数： elapsedMs はオープニング開始からの経過。単位はミリ秒。
 * 関数の概要： 便器、揺れ、3つの顔、拡大、完了の境界を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-003, REQ-001
 */
export function openingStep(elapsedMs) {
  // 規定時間に達したら、クリックが無くても完了とする。
  if (elapsedMs >= OPENING_MS) {
    return "done";
  }
  if (elapsedMs >= 2300) {
    return "expand";
  }
  if (elapsedMs >= 1900) {
    return "face3";
  }
  if (elapsedMs >= 1500) {
    return "face2";
  }
  if (elapsedMs >= 1100) {
    return "face1";
  }
  if (elapsedMs >= 700) {
    return "shake";
  }
  return "toilet";
}
