/**
 * ファイル名： picon-synth.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： Web Audio API の正弦波発振によりオリジナルのピコン音を1回再生する。
 * 対応機能ID（トレーサビリティ）： UNIT-007, REQ-004, REQ-005, REQ-006
 */

import { PICON_HZ, PICON_MS } from "../domain/constants.js";

/**
 * 関数名： playPicon
 * 戻り値： { ok: boolean, error?: 'AudioUnavailable' }。
 * 引数： audioCtx は Web Audio API の AudioContext、startSec は開始時刻（秒）。
 * 関数の概要： 正弦波（880Hz, 80ms）を合成再生する。AudioContext 無効時は例外を送出せずエラーを返す。
 * 対応機能ID（トレーサビリティ）： UNIT-007, REQ-004, REQ-005, REQ-006
 */
export function playPicon(audioCtx, startSec) {
  // AudioContext が未定義または closed 状態の場合は再生不可として返す。
  if (!audioCtx || audioCtx.state === "closed") {
    return { ok: false, error: "AudioUnavailable" };
  }

  try {
    const start = typeof startSec === "number" ? startSec : audioCtx.currentTime;
    const durationSec = PICON_MS / 1000;

    // 発振器とエンベロープ用ゲインノードを生成して接続する。
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(PICON_HZ, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start(start);
    oscillator.stop(start + durationSec);
    return { ok: true };
  } catch {
    return { ok: false, error: "AudioUnavailable" };
  }
}
