/**
 * ファイル名： picon-synth.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ピコン音を、注入された AudioContext の正弦波で1回鳴らす。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-004, REQ-006
 */

import { PICON_HZ, PICON_MS } from "../domain/constants.js";

/**
 * 関数名： playPicon
 * 戻り値： 音声コンテキストが閉じているときは AudioUnavailable。鳴らせたときは undefined。
 * 引数： audioCtx は注入された AudioContext。startMs は現在時刻からの遅延。単位はミリ秒。
 * 関数の概要： 880 Hz の正弦波を 80 ミリ秒鳴らす。音声ファイルは読まない。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-004, REQ-006
 */
export function playPicon(audioCtx, startMs) {
  if (!audioCtx || audioCtx.state === "closed") {
    return "AudioUnavailable";
  }

  // 正弦波を短く出す。人の声の録音も、外部の音声ファイルも使わない。
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = PICON_HZ;
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const when = audioCtx.currentTime + Math.max(0, startMs || 0) / 1000;
  osc.start(when);
  osc.stop(when + PICON_MS / 1000);
  return undefined;
}
