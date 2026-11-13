/**
 * ファイル名： app-state.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 現在の画面状態とイベントから、次の状態を1つ返す。
 * 対応機能ID（トレーサビリティ）： UNIT-002, REQ-001, REQ-003, REQ-005, REQ-007
 */

import { EARTH_POINT_PX, OPENING_MS, SORTIE_MS } from "./constants.js";

/** 新しいページの初期状態。 */
export const INITIAL_STATE = "opening";

/**
 * 関数名： nextState
 * 戻り値： 次の状態名。未知のイベントでは現在の状態名。
 * 引数： state は現在の状態名。event は name を持つオブジェクト。
 * 関数の概要： オープニング、出撃、カウントダウン、掛け声、終了演出の遷移を決める。
 * 対応機能ID（トレーサビリティ）： UNIT-002, REQ-001, REQ-003, REQ-005, REQ-007
 */
export function nextState(state, event) {
  // 形が違うイベントは状態を変えない。
  if (!event || typeof event.name !== "string") {
    return state;
  }

  // オープニングは最初のクリック、または規定時間の経過で設定へ進む。
  if (state === "opening") {
    if (event.name === "click") {
      return "setting";
    }
    if (event.name === "tick" && event.elapsedMs >= OPENING_MS) {
      return "setting";
    }
    return state;
  }

  // 設定中だけ出撃ボタンを受け付ける。
  if (state === "setting") {
    if (event.name === "sortie") {
      return "sortie";
    }
    return state;
  }

  // 出撃演出中のボタンは捨て、規定時間でカウントダウンへ進む。
  if (state === "sortie") {
    if (event.name === "tick" && event.elapsedMs >= SORTIE_MS) {
      return "countdown";
    }
    return state;
  }

  // 残時間 0 のとき、再生できるなら掛け声、できないなら縮小へ進む。
  if (state === "countdown") {
    if (event.name === "remaining-zero") {
      return event.canPlay ? "shout" : "shrink";
    }
    return state;
  }

  // 掛け声の終了と失敗は、どちらも縮小へ進む。
  if (state === "shout") {
    if (event.name === "shout-ended" || event.name === "shout-failed") {
      return "shrink";
    }
    return state;
  }

  // 直径が点の大きさ以下になったら星へ進む。設定へは戻さない。
  if (state === "shrink") {
    if (event.name === "tick" && event.diameterPx <= EARTH_POINT_PX) {
      return "stars";
    }
    return state;
  }

  return state;
}
