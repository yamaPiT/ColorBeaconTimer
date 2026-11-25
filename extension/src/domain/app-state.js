/**
 * ファイル名： app-state.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 現在の状態と発生イベントから次の画面状態を返す純粋関数を提供する。
 * 対応機能ID（トレーサビリティ）： UNIT-002, REQ-001, REQ-003, REQ-005, REQ-007
 */

/** 状態遷移テーブル */
const TRANSITIONS = Object.freeze({
  opening: Object.freeze({
    OPENING_DONE: "setting",
    SKIP_OPENING: "setting",
  }),
  setting: Object.freeze({
    START: "countdown",
  }),
  countdown: Object.freeze({
    TIMER_ZERO: "endingAudio",
  }),
  endingAudio: Object.freeze({
    AUDIO_DONE: "endingDots",
    AUDIO_UNAVAILABLE: "endingDots",
  }),
  endingDots: Object.freeze({}),
});

/**
 * 関数名： nextState
 * 戻り値： 次の状態文字列（未知・無効イベント時は現在の state をそのまま返す）。
 * 引数： state は現在の状態、event は発生イベント。
 * 関数の概要： 状態遷移テーブルに従い、次の画面状態を純粋に計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-002, REQ-001, REQ-003, REQ-005, REQ-007
 */
export function nextState(state, event) {
  // 現在の状態に対応する遷移先マップを取得する。
  const table = TRANSITIONS[state];
  if (!table) {
    return state;
  }

  // 有効なイベントであれば次の状態を返し、未知・無効イベントは現状維持とする。
  return Object.prototype.hasOwnProperty.call(table, event) ? table[event] : state;
}
