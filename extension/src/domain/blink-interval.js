/**
 * ファイル名： blink-interval.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 青のフェードと、赤の点滅間隔を計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-007, REQ-004
 */

import { BLUE_PHASE_MS, RED_FLOOR_SEC } from "./constants.js";

/**
 * 関数名： bluePhase
 * 戻り値： phase、opacity、plannedMs、offsetMs を持つオブジェクト。
 * 引数： elapsedInCycleMs は周期の先頭からの経過。単位はミリ秒。
 * 関数の概要： 1000 ミリ秒のフェードアウトのあと、1000 ミリ秒のフェードインを返す。
 * 対応機能ID（トレーサビリティ）： UNIT-007, REQ-004
 */
export function bluePhase(elapsedInCycleMs) {
  const cycle = BLUE_PHASE_MS * 2;
  let local = elapsedInCycleMs % cycle;
  if (local < 0) {
    local += cycle;
  }

  // 前半は明るさ 1 から 0 へ、後半は 0 から 1 へ、経過に比例して変える。
  if (local < BLUE_PHASE_MS) {
    return {
      phase: "fade-out",
      opacity: 1 - local / BLUE_PHASE_MS,
      plannedMs: BLUE_PHASE_MS,
      offsetMs: local,
    };
  }
  const into = local - BLUE_PHASE_MS;
  return {
    phase: "fade-in",
    opacity: into / BLUE_PHASE_MS,
    plannedMs: BLUE_PHASE_MS,
    offsetMs: into,
  };
}

/**
 * 関数名： redIntervalSec
 * 戻り値： その点滅の間隔。単位は秒。
 * 引数： remaining は点滅を始める時点の残時間。単位はミリ秒。
 * 関数の概要： max(残時間[秒] / 60, 0.33) を返す。呼んだ側が点滅の終わりまで保持する。
 * 対応機能ID（トレーサビリティ）： UNIT-007, REQ-004
 */
export function redIntervalSec(remaining) {
  const seconds = remaining / 1000;
  const raw = seconds / 60;
  return raw < RED_FLOOR_SEC ? RED_FLOOR_SEC : raw;
}
