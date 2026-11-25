/**
 * ファイル名： juwacchi-player.js
 * バージョン番号： 4.6.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： パッケージ内の保存済みジュワッチ音声ファイルを読み込み、GainNode 音量調整付きでオフライン1回再生する。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-005, REQ-006
 */

/** パッケージ内のジュワッチ音声ファイル相対パス */
export const JUWACCHI_ASSET_PATH = "assets/audio/juwacchi.wav";

/**
 * ジュワッチ音声再生ゲイン
 * juwacchi.wav（実測 RMS 0.2180 / -13.23 dBFS）をオープニング第2・第3シーン BGM（実効 -29.01 dBFS）と
 * 同等水準（実効 -28.62 dBFS、差 +0.39 dB、±1.0 dB 以内・非クリッピング）へ揃える線形倍率。
 */
export const JUWACCHI_GAIN = 0.17;

/**
 * 関数名： loadJuwacchi
 * 戻り値： Promise<{ ok: true, buffer: ArrayBuffer, url: string } | { ok: false, error: 'JuwacchiUnavailable' }>。
 * 引数： readFile は音声ファイルを読み込む注入関数。
 * 関数の概要： extension/assets/audio/juwacchi.wav のみを読み込み、失敗時は例外を出さずエラーを返す。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-005, REQ-006
 */
export async function loadJuwacchi(readFile) {
  if (typeof readFile !== "function") {
    return { ok: false, error: "JuwacchiUnavailable" };
  }

  try {
    const result = await readFile(JUWACCHI_ASSET_PATH);
    if (!result || !result.buffer || result.buffer.byteLength === 0) {
      return { ok: false, error: "JuwacchiUnavailable" };
    }
    return {
      ok: true,
      buffer: result.buffer,
      url: result.url || JUWACCHI_ASSET_PATH,
    };
  } catch {
    return { ok: false, error: "JuwacchiUnavailable" };
  }
}

/**
 * 関数名： playJuwacchi
 * 戻り値： { ok: true, gain: number } | { ok: false, error: 'JuwacchiUnavailable' }。
 * 引数： audioCtx は AudioContext、audioBuffer はデコード済み音声バッファ、onEnded は終了時コールバック。
 * 関数の概要： デコード済みジュワッチ音声を GainNode（JUWACCHI_GAIN）経由で 1回再生し、終了時に onEnded を呼び出す。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-005, REQ-006
 */
export function playJuwacchi(audioCtx, audioBuffer, onEnded) {
  // AudioContext・createGain または音声バッファが無効な場合は再生不可を返す。
  if (
    !audioCtx ||
    audioCtx.state === "closed" ||
    !audioBuffer ||
    typeof audioCtx.createGain !== "function"
  ) {
    return { ok: false, error: "JuwacchiUnavailable" };
  }

  try {
    // AudioBufferSourceNode -> GainNode(gain.value = JUWACCHI_GAIN) -> audioCtx.destination の経路で接続する。
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = audioBuffer;
    gainNode.gain.value = JUWACCHI_GAIN;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (typeof onEnded === "function") {
      source.onended = () => {
        onEnded();
      };
    }
    source.start(0);
    return { ok: true, gain: JUWACCHI_GAIN };
  } catch {
    return { ok: false, error: "JuwacchiUnavailable" };
  }
}
