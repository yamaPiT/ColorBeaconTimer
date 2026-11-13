/**
 * ファイル名： sortie-timeline.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 出撃演出開始からの経過ミリ秒を、映像ステップへ変換する。
 * 対応機能ID（トレーサビリティ）： UNIT-005, REQ-003
 */

import { SORTIE_MS } from "./constants.js";

/**
 * 関数名： sortieStep
 * 戻り値： spread、approach、land、done のいずれか。
 * 引数： elapsedMs は出撃演出開始からの経過。単位はミリ秒。
 * 関数の概要： 光の広がり、接近、着地、完了の境界を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-005, REQ-003
 */
export function sortieStep(elapsedMs) {
  if (elapsedMs >= SORTIE_MS) {
    return "done";
  }
  if (elapsedMs >= 1400) {
    return "land";
  }
  if (elapsedMs >= 700) {
    return "approach";
  }
  return "spread";
}
