/**
 * ファイル名： shout-player.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 保存済みの掛け声ファイルを1回再生し、読めないときは失敗を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-005, REQ-006
 */

/**
 * 関数名： loadShout
 * 戻り値： 読み込んだデータ、または ShoutUnavailable。
 * 引数： readFile はパッケージ内のバイト列を返す関数。
 * 関数の概要： 実行時に音声を合成せず、渡された読み取りが失敗したら ShoutUnavailable を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-005, REQ-006
 */
export async function loadShout(readFile) {
  try {
    const data = await readFile();
    if (!data || !data.bytes) {
      return "ShoutUnavailable";
    }
    return data;
  } catch (err) {
    return "ShoutUnavailable";
  }
}

/**
 * 関数名： playShout
 * 戻り値： 再生を始めた BufferSource、または ShoutUnavailable。
 * 引数： audioCtx は AudioContext。buffer は保存ファイルのバイト列。whenMs は遅延。単位はミリ秒。
 * 関数の概要： 渡されたバイト列だけを1回再生する。失敗は例外にせず ShoutUnavailable を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-005, REQ-006
 */
export async function playShout(audioCtx, buffer, whenMs) {
  try {
    if (!audioCtx || audioCtx.state === "closed" || !buffer) {
      return "ShoutUnavailable";
    }

    // 既にデコード済みならそのまま使い、バイト列ならこのコンテキストでデコードする。
    const audioBuffer = buffer instanceof AudioBuffer
      ? buffer
      : await audioCtx.decodeAudioData(buffer.slice(0));
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    const when = audioCtx.currentTime + Math.max(0, whenMs || 0) / 1000;
    source.start(when);
    return source;
  } catch (err) {
    return "ShoutUnavailable";
  }
}
