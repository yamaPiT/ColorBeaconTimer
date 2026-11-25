/**
 * ファイル名： main.js
 * バージョン番号： 4.4.0
 * 作成日： 2026-11-22
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 専用ウィンドウのエントリポイント。実環境の時刻・音声（BGM含む）・DOM・windowPort を注入し、第1シーン中に BGM を事前デコードして EXIT ボタン終了および pagehide 時に停止する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */

import { SETTING_STEP_MS } from "../domain/constants.js";
import { playPicon } from "../audio/picon-synth.js";
import { loadJuwacchi, playJuwacchi } from "../audio/juwacchi-player.js";
import {
  createOpeningBgmPlayer,
  loadOpeningBgm,
} from "../audio/opening-bgm-player.js";
import { render } from "../view/renderer.js";
import { createController } from "./controller.js";

/** DOM 要素参照オブジェクト */
const dom = {
  app: document.querySelector("#app"),
  openingStage: document.querySelector("#opening-stage"),
  openingTitle: document.querySelector("#opening-title"),
  openingImage: document.querySelector("#opening-image"),
  openingLamp: document.querySelector("#opening-lamp"),
  openingText: document.querySelector("#opening-text"),
  openingNav: document.querySelector("#opening-nav"),
  btnOpeningBack: document.querySelector("#btn-opening-back"),
  btnOpeningNext: document.querySelector("#btn-opening-next"),
  timerUi: document.querySelector("#timer-ui"),
  beacon: document.querySelector("#beacon"),
  timeEl: document.querySelector("#time"),
  controls: document.querySelector("#controls"),
  btnMinus: document.querySelector("#btn-minus"),
  btnStart: document.querySelector("#btn-start"),
  btnPlus: document.querySelector("#btn-plus"),
  dotsCanvas: document.querySelector("#dots-canvas"),
  btnExit: document.querySelector("#btn-exit"),
};

/** 共有 AudioContext、デコード済みジュワッチ音声、およびデコード済み BGM キャッシュ */
let audioCtx = null;
let decodedJuwacchiBuffer = null;
const decodedBgmBuffers = new Map();
const inflightBgmDecodes = new Map();

/**
 * 関数名： ensureAudioContext
 * 戻り値： AudioContext | null。
 * 引数： なし。
 * 関数の概要： 必要に応じて AudioContext を安全に生成して返す。デバイス利用不可時は null を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-004, REQ-005
 */
function ensureAudioContext() {
  if (!audioCtx && typeof AudioContext !== "undefined") {
    try {
      audioCtx = new AudioContext();
    } catch {
      audioCtx = null;
    }
  }
  return audioCtx;
}

/**
 * 関数名： readExtensionAsset
 * 戻り値： Promise<{ buffer: ArrayBuffer, url: string }>。
 * 引数： assetPath は拡張機能内の相対パス。
 * 関数の概要： パッケージ同梱の音声ファイルを chrome.runtime.getURL 経由でオフライン取得する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-005, REQ-006
 */
async function readExtensionAsset(assetPath) {
  const url =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL(assetPath)
      : assetPath;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("FetchFailed");
  }
  const buffer = await response.arrayBuffer();
  return { buffer, url };
}

/**
 * 関数名： decodeBgmTrack
 * 戻り値： Promise<{ ok: true, audioBuffer: AudioBuffer, url: string } | { ok: false, error: 'BgmUnavailable' }>。
 * 引数： trackKey は 'scene2' | 'scene3'、ctx は AudioContext。
 * 関数の概要： BGM 音声の読込とデコードを進行中 Promise 単位で共有し、成功時のみページ内キャッシュへ保存する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-006
 */
function decodeBgmTrack(trackKey, ctx) {
  if (decodedBgmBuffers.has(trackKey)) {
    const cached = decodedBgmBuffers.get(trackKey);
    return Promise.resolve({ ok: true, audioBuffer: cached.audioBuffer, url: cached.url });
  }
  if (inflightBgmDecodes.has(trackKey)) {
    return inflightBgmDecodes.get(trackKey);
  }

  const job = (async () => {
    const loaded = await loadOpeningBgm(trackKey, readExtensionAsset);
    if (!loaded.ok) {
      return loaded;
    }
    try {
      const audioBuffer = await ctx.decodeAudioData(loaded.buffer.slice(0));
      decodedBgmBuffers.set(trackKey, { audioBuffer, url: loaded.url });
      return { ok: true, audioBuffer, url: loaded.url };
    } catch {
      return { ok: false, error: "BgmUnavailable" };
    }
  })().finally(() => {
    inflightBgmDecodes.delete(trackKey);
  });

  inflightBgmDecodes.set(trackKey, job);
  return job;
}

/** オープニング第2・第3シーン用の BGM プレイヤー */
const openingBgmPlayer = createOpeningBgmPlayer(
  ensureAudioContext,
  (trackKey, ctx) => decodeBgmTrack(trackKey, ctx)
);

/** 実環境用の時刻ポート */
const clock = {
  nowMs: () => performance.now(),
};

/** 実環境用の音声ポート */
const audioPort = {
  async resume() {
    const ctx = ensureAudioContext();
    if (ctx && ctx.state !== "closed") {
      try {
        await ctx.resume();
      } catch {
        // デバイス利用不可時は例外を出さず継続する。
      }
    }
  },
  playPicon() {
    const ctx = ensureAudioContext();
    return playPicon(ctx, ctx ? ctx.currentTime : 0);
  },
  async loadJuwacchi() {
    const loaded = await loadJuwacchi(readExtensionAsset);
    if (!loaded.ok) {
      return loaded;
    }

    const ctx = ensureAudioContext();
    if (ctx) {
      try {
        decodedJuwacchiBuffer = await ctx.decodeAudioData(loaded.buffer.slice(0));
      } catch {
        decodedJuwacchiBuffer = null;
        return { ok: false, error: "JuwacchiUnavailable" };
      }
    }
    return { ok: true, url: loaded.url };
  },
  playJuwacchi(onEnded) {
    const ctx = ensureAudioContext();
    return playJuwacchi(ctx, decodedJuwacchiBuffer, onEnded);
  },
  playOpeningBgm(trackKey) {
    return openingBgmPlayer.playLoop(trackKey);
  },
  stopOpeningBgm() {
    openingBgmPlayer.stop();
  },
  getOpeningBgmTrack() {
    return openingBgmPlayer.getActiveTrack();
  },
  getOpeningBgmCount() {
    return openingBgmPlayer.getActiveCount();
  },
};

/** 実環境用の描画ポート */
const view = {
  render(viewModel) {
    return render(viewModel, dom);
  },
};

// 第1シーン表示中に第2シーン用 BGM を最優先で先行デコードし、完了後に第3シーン用 BGM を事前デコードする。
const startupCtx = ensureAudioContext();
if (startupCtx) {
  decodeBgmTrack("scene2", startupCtx)
    .catch(() => {})
    .then(() => decodeBgmTrack("scene3", startupCtx).catch(() => {}));
}

/** 実環境用の専用ウィンドウ操作ポート */
const windowPort = {
  close() {
    window.close();
  },
};

/** コントローラ生成 */
const controller = createController(clock, audioPort, view, Math.random, windowPort);

// UI イベントをコントローラへ接続する。
dom.btnOpeningNext.addEventListener("click", (event) => {
  event.stopPropagation();
  controller.onOpeningNext();
});

dom.btnOpeningBack.addEventListener("click", (event) => {
  event.stopPropagation();
  controller.onOpeningBack();
});

dom.openingStage.addEventListener("click", () => {
  controller.onClickScreen();
});

// 専用ウィンドウを閉じる際に再生中の BGM を即時停止する。
window.addEventListener("pagehide", () => {
  audioPort.stopOpeningBgm();
});

/**
 * 関数名： bindAdjustButton
 * 戻り値： なし。
 * 引数： button はボタン DOM 要素、deltaMs は 1 ステップあたりの増減ミリ秒。
 * 関数の概要： 単押しおよび 2秒長押し早送り用のポインタイベントを登録する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-002
 */
function bindAdjustButton(button, deltaMs) {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    controller.onAdjustPressStart(deltaMs);
  });
  button.addEventListener("pointerup", () => {
    controller.onAdjustPressEnd(false);
  });
  button.addEventListener("pointerleave", () => {
    controller.onAdjustPressEnd(true);
  });
  button.addEventListener("pointercancel", () => {
    controller.onAdjustPressEnd(true);
  });
}

bindAdjustButton(dom.btnMinus, -SETTING_STEP_MS);
bindAdjustButton(dom.btnPlus, SETTING_STEP_MS);

dom.btnStart.addEventListener("click", () => {
  controller.onStart();
});

if (dom.btnExit) {
  dom.btnExit.addEventListener("click", (event) => {
    event.stopPropagation();
    controller.onExit();
  });
}

// requestAnimationFrame ループを開始する。
function frameLoop() {
  controller.tick();
  requestAnimationFrame(frameLoop);
}

controller.tick();
requestAnimationFrame(frameLoop);
