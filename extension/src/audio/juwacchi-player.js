/**
 * ファイル名： juwacchi-player.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： パッケージ内の保存済みジュワッチ音声ファイルを読み込み、オフラインで1回再生する。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-005, REQ-006
 */

/** パッケージ内のジュワッチ音声ファイル相対パス */
export const JUWACCHI_ASSET_PATH = "assets/audio/juwacchi.wav";

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
 * 戻り値： { ok: boolean, error?: 'JuwacchiUnavailable' }。
 * 引数： audioCtx は AudioContext、audioBuffer はデコード済み音声バッファ、onEnded は終了時コールバック。
 * 関数の概要： デコード済みジュワッチ音声を1回再生し、終了時に onEnded を呼び出す。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-005, REQ-006
 */
export function playJuwacchi(audioCtx, audioBuffer, onEnded) {
  // AudioContext または音声バッファが無効な場合は再生不可を返す。
  if (!audioCtx || audioCtx.state === "closed" || !audioBuffer) {
    return { ok: false, error: "JuwacchiUnavailable" };
  }

  try {
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    if (typeof onEnded === "function") {
      source.onended = () => {
        onEnded();
      };
    }
    source.start(0);
    return { ok: true };
  } catch {
    return { ok: false, error: "JuwacchiUnavailable" };
  }
}
