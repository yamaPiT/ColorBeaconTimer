/**
 * ファイル名： main.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 専用ウィンドウのページを起動し、時計と音声をコントローラへ渡す。
 * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-004, REQ-005, REQ-006
 */

import { createController } from "./controller.js";
import { render } from "../view/renderer.js";
import { playPicon } from "../audio/picon-synth.js";
import { loadShout, playShout } from "../audio/shout-player.js";

/**
 * 関数名： createAudioPort
 * 戻り値： resume、playPicon、loadShout、playShout を持つ音声ポート。
 * 引数： なし。
 * 関数の概要： ページ内の AudioContext でピコンを合成し、パッケージ内の掛け声だけを再生する。
 * 対応機能ID（トレーサビリティ）： UNIT-012, UNIT-008, UNIT-009, REQ-004, REQ-005, REQ-006
 */
function createAudioPort() {
  let ctx = null;

  // ブラウザが音声を拒むときは、音を出さずに失敗を返す。
  function context() {
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    if (!ctx) {
      ctx = new Ctor();
    }
    return ctx;
  }

  return {
    /**
     * 関数名： resume
     * 戻り値： Promise。
     * 引数： なし。
     * 関数の概要： 出撃の操作で音声コンテキストを動かす。
     * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-003, REQ-005
     */
    async resume() {
      const audioCtx = context();
      if (!audioCtx || audioCtx.state === "running") {
        return;
      }
      try {
        await audioCtx.resume();
      } catch (err) {
        // 出撃の遷移は、音声の解禁に失敗しても止めない。
      }
    },

    /**
     * 関数名： playPicon
     * 戻り値： AudioUnavailable、または undefined。
     * 引数： なし。
     * 関数の概要： 正弦波のピコンを1回鳴らす。
     * 対応機能ID（トレーサビリティ）： UNIT-008, REQ-004
     */
    playPicon() {
      const audioCtx = context();
      if (!audioCtx) {
        return "AudioUnavailable";
      }
      return playPicon(audioCtx, 0);
    },

    /**
     * 関数名： loadShout
     * 戻り値： パッケージ内のバイト列、または ShoutUnavailable。
     * 引数： なし。
     * 関数の概要： 拡張機能内の shout.wav だけを読む。外部の URL は開かない。
     * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-005, REQ-006
     */
    loadShout() {
      const url = chrome.runtime.getURL("assets/audio/shout.wav");
      return loadShout(async () => {
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }
        return { url, bytes: await response.arrayBuffer() };
      });
    },

    /**
     * 関数名： playShout
     * 戻り値： 再生元、または ShoutUnavailable。
     * 引数： buffer は保存ファイルのバイト列。whenMs は遅延。
     * 関数の概要： 読み込んだバイト列を1回再生する。
     * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-005
     */
    playShout(buffer, whenMs) {
      const audioCtx = context();
      if (!audioCtx) {
        return Promise.resolve("ShoutUnavailable");
      }
      return playShout(audioCtx, buffer, whenMs || 0);
    },
  };
}

/**
 * 関数名： boot
 * 戻り値： なし。
 * 引数： なし。
 * 関数の概要： performance.now と setTimeout を渡し、フレームごとにコントローラを呼ぶ。
 * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001
 */
function boot() {
  const clock = {
    nowMs() {
      return performance.now();
    },
  };
  const scheduler = {
    set(fn, ms) {
      return setTimeout(fn, ms);
    },
    clear(id) {
      clearTimeout(id);
    },
  };
  const view = {
    render(viewModel) {
      return render(viewModel, document);
    },
  };
  const controller = createController(clock, createAudioPort(), view, scheduler);

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    const id = target && target.id ? target.id : "stage";
    controller.pointer("down", id);
  }, true);
  document.addEventListener("pointerup", () => {
    controller.pointer("up", "");
  }, true);
  document.addEventListener("pointercancel", () => {
    controller.pointer("cancel", "");
  }, true);

  const frame = () => {
    controller.tick();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
