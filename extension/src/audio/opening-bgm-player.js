/**
 * ファイル名： opening-bgm-player.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： オープニング第2・第3シーン BGM の読込・GainNode音量調整ループ再生・即時停止・requestId キャンセル制御を行う。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-001, REQ-006
 */

/** オープニング BGM トラックごとのパッケージ内相対パス定義 */
export const OPENING_BGM_ASSETS = Object.freeze({
  scene2: "assets/audio/gymnopedie1.ogg",
  scene3: "assets/audio/space-adventure-synth.wav",
});

/** オープニング BGM トラックごとの再生ゲイン（scene3 は実測 RMS -14.12 dBFS に対し第2シーン -29.01 dBFS と同等水準へ合わせる線形倍率） */
export const OPENING_BGM_GAINS = Object.freeze({
  scene2: 1.0,
  scene3: 0.18,
});

/**
 * 関数名： loadOpeningBgm
 * 戻り値： Promise<{ ok: true, trackKey: 'scene2' | 'scene3', buffer: ArrayBuffer, url: string } | { ok: false, error: 'BgmUnavailable' }>。
 * 引数： trackKey は 'scene2' | 'scene3'、readFile は拡張機能内の音声ファイルを読み込む注入関数。
 * 関数の概要： パッケージ同梱の BGM ファイルのみを読み込み、失敗時は例外を送出せず BgmUnavailable を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-001, REQ-006
 */
export async function loadOpeningBgm(trackKey, readFile) {
  if (!Object.prototype.hasOwnProperty.call(OPENING_BGM_ASSETS, trackKey)) {
    return { ok: false, error: "BgmUnavailable" };
  }
  if (typeof readFile !== "function") {
    return { ok: false, error: "BgmUnavailable" };
  }

  const assetPath = OPENING_BGM_ASSETS[trackKey];
  try {
    const result = await readFile(assetPath);
    if (!result || !result.buffer || result.buffer.byteLength === 0) {
      return { ok: false, error: "BgmUnavailable" };
    }
    return {
      ok: true,
      trackKey,
      buffer: result.buffer,
      url: result.url || assetPath,
    };
  } catch {
    return { ok: false, error: "BgmUnavailable" };
  }
}

/**
 * 関数名： createOpeningBgmPlayer
 * 戻り値： { playLoop, stop, getActiveTrack, getActiveCount }。
 * 引数： getAudioCtx は AudioContext 取得関数、loadBufferFn は trackKey と AudioContext からデコード済み AudioBuffer を返す非同期関数。
 * 関数の概要： requestId 世代管理により高速連打キャンセル・即時停止・無音フォールバックを保証する BGM プレイヤーを生成する。
 * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-001, REQ-006
 */
export function createOpeningBgmPlayer(getAudioCtx, loadBufferFn) {
  /** 非同期読込完了時の世代照合に用いる単調増加リクエストID */
  let requestId = 0;

  /** 現在再生中の AudioBufferSourceNode 参照 */
  let activeSource = null;

  /** 現在再生中の音量調整用 GainNode 参照 */
  let activeGain = null;

  /** 現在再生中の BGM トラック識別子 */
  let activeTrack = "none";

  /** 現在同時に再生中の BGM 数（常に 0 または 1） */
  let activeCount = 0;

  /**
   * 関数名： stopCurrentSource
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 再生中の AudioBufferSourceNode と GainNode を即座に停止・切断し、再生状態を無音へ戻す。
   * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-001
   */
  function stopCurrentSource() {
    if (activeSource) {
      const sourceToStop = activeSource;
      activeSource = null;
      try {
        sourceToStop.onended = null;
      } catch {
        // 終了コールバック解除時の例外は無視する。
      }
      try {
        sourceToStop.stop(0);
      } catch {
        // 既に停止済みのノードに対する stop 例外は無視する。
      }
      try {
        sourceToStop.disconnect();
      } catch {
        // 切断済みノードに対する disconnect 例外は無視する。
      }
    }
    if (activeGain) {
      const gainToDisconnect = activeGain;
      activeGain = null;
      try {
        gainToDisconnect.disconnect();
      } catch {
        // 切断済みゲインノードに対する disconnect 例外は無視する。
      }
    }
    activeTrack = "none";
    activeCount = 0;
  }

  /**
   * 関数名： stop
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： リクエスト世代を更新して進行中の非同期読込をキャンセルし、再生中の BGM を即座に停止する。
   * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-001
   */
  function stop() {
    requestId += 1;
    stopCurrentSource();
  }

  /**
   * 関数名： playLoop
   * 戻り値： Promise<{ ok: boolean, trackKey?: string, url?: string, gain?: number, cancelled?: boolean, error?: 'BgmUnavailable' }>。
   * 引数： trackKey は 'scene2' | 'scene3'。
   * 関数の概要： 旧 BGM を即時停止したうえで対象トラックを読み込み、最新リクエストであれば先頭からループ再生する。
   * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-001, REQ-006
   */
  async function playLoop(trackKey) {
    requestId += 1;
    const myRequestId = requestId;
    stopCurrentSource();

    if (!Object.prototype.hasOwnProperty.call(OPENING_BGM_ASSETS, trackKey)) {
      return { ok: false, error: "BgmUnavailable" };
    }
    if (typeof getAudioCtx !== "function" || typeof loadBufferFn !== "function") {
      return { ok: false, error: "BgmUnavailable" };
    }

    let audioCtx = null;
    try {
      audioCtx = getAudioCtx();
    } catch {
      return { ok: false, error: "BgmUnavailable" };
    }

    if (!audioCtx || audioCtx.state === "closed") {
      return { ok: false, error: "BgmUnavailable" };
    }

    let loaded = null;
    try {
      loaded = await loadBufferFn(trackKey, audioCtx);
    } catch {
      loaded = null;
    }

    // 非同期の読込・デコード完了までに新しい再生または停止要求が来た場合は再生を破棄する。
    if (myRequestId !== requestId) {
      return { ok: false, cancelled: true };
    }

    if (
      !loaded ||
      !loaded.ok ||
      !loaded.audioBuffer ||
      audioCtx.state === "closed"
    ) {
      stopCurrentSource();
      return { ok: false, error: "BgmUnavailable" };
    }

    try {
      const gainValue = OPENING_BGM_GAINS[trackKey];
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      source.buffer = loaded.audioBuffer;
      source.loop = true;
      gainNode.gain.value = gainValue;
      // AudioBufferSourceNode -> GainNode -> audioCtx.destination の経路で接続する。
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start(0);

      activeSource = source;
      activeGain = gainNode;
      activeTrack = trackKey;
      activeCount = 1;

      return {
        ok: true,
        trackKey,
        url: loaded.url || OPENING_BGM_ASSETS[trackKey],
        gain: gainValue,
      };
    } catch {
      stopCurrentSource();
      return { ok: false, error: "BgmUnavailable" };
    }
  }

  return {
    playLoop,
    stop,
    getActiveTrack: () => activeTrack,
    getActiveCount: () => activeCount,
  };
}
