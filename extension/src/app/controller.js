/**
 * ファイル名： controller.js
 * バージョン番号： 4.4.0
 * 作成日： 2026-11-22
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 1フレームごとの状態遷移、オープニング手動前後遷移・BGM同期制御（gain記録含む）・第5シーン拡大制御、長押し早送り、点滅周期、音声再生、EXIT終了制御、描画を統合制御する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */

import {
  ENDING_DOT_COUNT,
  LONG_PRESS_DELAY_MS,
  SETTING_INITIAL_MS,
  WINDOW_H,
  WINDOW_W,
} from "../domain/constants.js";
import { nextState } from "../domain/app-state.js";
import { openingFrame, stepOpeningScene } from "../domain/opening-timeline.js";
import { adjustSetting, longPressRepeatSteps } from "../domain/setting-time.js";
import {
  beaconZone,
  formatRemaining,
  remainingMs,
} from "../domain/remaining-time.js";
import { redPhaseDurationMs } from "../domain/blink-interval.js";
import { createDotField, dotPositions } from "../domain/ending-dots.js";

/** オープニング以外の状態で使用する既定のオープニング情報 */
const IDLE_OPENING_INFO = {
  step: "",
  sceneIndex: 0,
  scale: 1,
  imageKind: "none",
  bgmTrack: "none",
  showBack: false,
  showNext: false,
};

/**
 * 関数名： createController
 * 戻り値： { onOpeningNext, onOpeningBack, onClickScreen, onAdjust, onAdjustPressStart, onAdjustPressEnd, onStart, onExit, tick, setJuwacchiUrl }。
 * 引数： clock（nowMs()）、audioPort（resume, playPicon, loadJuwacchi, playJuwacchi, playOpeningBgm, stopOpeningBgm）、view（render）、random01（乱数関数）、windowPort（任意の専用ウィンドウ操作ポート { close }）。
 * 関数の概要： 専用ウィンドウのフレーム制御コントローラを生成する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */
export function createController(clock, audioPort, view, random01, windowPort = null) {
  let state = "opening";
  let openingScene = 1;
  let scene5StartMs = null;
  let settingMs = SETTING_INITIAL_MS;
  let countdownStartMs = 0;
  let endingDotsStartMs = 0;
  let lastDisplayTime = formatRemaining(settingMs);
  let juwacchiUrl = "";
  let blinkCycle = null;
  let activePress = null;

  /** オープニング BGM の現在再生状態・URL・非同期世代管理 */
  let openingBgmTrack = "none";
  let openingBgmUrl = "";
  let pendingBgmTrack = "none";
  let bgmGeneration = 0;
  const openingBgmLog = [];

  /** 赤色点滅の周期記録配列 */
  const blinkLog = [];

  /** 計測用の印（performance.now() 記録） */
  const marks = {
    "time-changes": [],
  };

  /** 終了演出用ドット群 */
  const dotField = createDotField(ENDING_DOT_COUNT, random01);

  // 起動時にジュワッチ音声のプリロードを開始する。
  if (audioPort && typeof audioPort.loadJuwacchi === "function") {
    Promise.resolve(audioPort.loadJuwacchi())
      .then((res) => {
        if (res && res.ok && res.url) {
          juwacchiUrl = res.url;
        }
      })
      .catch(() => {});
  }

  /**
   * 関数名： buildViewModelAndRender
   * 戻り値： なし。
   * 引数： now は現在時刻（ミリ秒）、openingInfo はオープニング計算結果、remMs は残時間、beaconColor はランプ色、beaconLit は点灯状態。
   * 関数の概要： ViewModel を組み立てて view.render へ渡す。
   * 対応機能ID（トレーサビリティ）： UNIT-011
   */
  function buildViewModelAndRender(now, openingInfo, remMs, beaconColor, beaconLit) {
    const isOpening = state === "opening";
    const isSetting = state === "setting";
    const isEndingDots = state === "endingDots";
    const dots = isEndingDots
      ? dotPositions(
          dotField,
          now - endingDotsStartMs,
          WINDOW_W / 2,
          WINDOW_H / 2,
          WINDOW_W,
          WINDOW_H
        )
      : [];

    const viewModel = {
      state,
      openingStep: isOpening ? openingInfo.step : "",
      openingSceneIndex: isOpening ? (openingInfo.sceneIndex ?? 0) : 0,
      openingImageKind: isOpening ? (openingInfo.imageKind ?? "none") : "none",
      openingScale: isOpening ? openingInfo.scale : 1,
      openingBackVisible: isOpening ? Boolean(openingInfo.showBack) : false,
      openingNextVisible: isOpening ? Boolean(openingInfo.showNext) : false,
      openingBgmTrack,
      openingBgmUrl,
      openingBgmLog,
      settingMs,
      remainingMs: remMs,
      displayTime: isSetting
        ? formatRemaining(settingMs)
        : formatRemaining(remMs),
      timeVisible: !isOpening && !isEndingDots,
      buttonsVisible: !isOpening && !isEndingDots,
      buttonsDisabled: !isSetting,
      beaconColor,
      beaconLit,
      dots,
      exitVisible: isEndingDots,
      juwacchiUrl,
      blinkLog,
      marks,
    };

    view.render(viewModel);
  }

  /**
   * 関数名： resumeAudioSync
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： ユーザージェスチャ内で同期的に audioPort.resume() を呼び出し、失敗時も例外を送出しない。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-004, REQ-005
   */
  function resumeAudioSync() {
    if (!audioPort || typeof audioPort.resume !== "function") {
      return;
    }
    try {
      Promise.resolve(audioPort.resume()).catch(() => {});
    } catch {
      // 音声デバイス不可時は無音フォールバックとして継続する。
    }
  }

  /**
   * 関数名： renderCurrentSnapshot
   * 戻り値： なし。
   * 引数： now は現在時刻（ミリ秒）。
   * 関数の概要： 非同期 BGM 読込完了時に現在の画面状態に応じた最新 ViewModel を再描画する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
   */
  function renderCurrentSnapshot(now) {
    if (state === "opening") {
      const scene5Elapsed =
        openingScene === 5 && scene5StartMs != null ? now - scene5StartMs : 0;
      const info = openingFrame(openingScene, scene5Elapsed);
      buildViewModelAndRender(now, info, settingMs, "blue", true);
    } else if (state === "setting") {
      buildViewModelAndRender(now, IDLE_OPENING_INFO, settingMs, "blue", true);
    }
  }

  /**
   * 関数名： syncOpeningBgm
   * 戻り値： なし。
   * 引数： bgmTrack は遷移先シーンの BGM 識別子（'none' | 'scene2' | 'scene3'）、now は操作時刻（ミリ秒）。
   * 関数の概要： 旧シーンの BGM を即座に停止したうえで、対象トラックが scene2 / scene3 ならループ再生を開始する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
   */
  function syncOpeningBgm(bgmTrack, now) {
    bgmGeneration += 1;
    const myGen = bgmGeneration;
    const prevTrack = openingBgmTrack;
    const prevPending = pendingBgmTrack;

    // 遷移前の BGM を即座に停止する。
    if (audioPort && typeof audioPort.stopOpeningBgm === "function") {
      try {
        audioPort.stopOpeningBgm();
      } catch {
        // 停止時例外は無視し、無音状態へ戻す。
      }
    }

    openingBgmTrack = "none";
    openingBgmUrl = "";
    pendingBgmTrack = "none";

    if (prevTrack !== "none" || prevPending !== "none") {
      const stoppedAt = clock.nowMs();
      const stoppedTrack = prevTrack !== "none" ? prevTrack : prevPending;
      marks["opening-bgm-stopped"] = stoppedAt;
      openingBgmLog.push({
        action: "stop",
        trackKey: stoppedTrack,
        atMs: stoppedAt,
        activeCount: 0,
        loop: false,
        gain: 0,
      });
    }

    if (bgmTrack !== "scene2" && bgmTrack !== "scene3") {
      return;
    }

    if (!audioPort || typeof audioPort.playOpeningBgm !== "function") {
      openingBgmLog.push({
        action: "fallback",
        trackKey: bgmTrack,
        atMs: now,
        activeCount: 0,
        loop: false,
        gain: 0,
        error: "BgmUnavailable",
      });
      return;
    }

    pendingBgmTrack = bgmTrack;
    let playPromise;
    try {
      playPromise = Promise.resolve(audioPort.playOpeningBgm(bgmTrack));
    } catch {
      pendingBgmTrack = "none";
      openingBgmTrack = "none";
      openingBgmUrl = "";
      const errAt = clock.nowMs();
      openingBgmLog.push({
        action: "fallback",
        trackKey: bgmTrack,
        atMs: errAt,
        activeCount: 0,
        loop: false,
        gain: 0,
        error: "BgmUnavailable",
      });
      return;
    }

    playPromise
      .then((res) => {
        if (myGen !== bgmGeneration) {
          return;
        }
        pendingBgmTrack = "none";

        // 読込完了時点で opening 以外、または別トラックのシーンへ移動していた場合は即時停止する。
        const currentTrack =
          state === "opening" ? openingFrame(openingScene, 0).bgmTrack : "none";
        if (state !== "opening" || currentTrack !== bgmTrack) {
          if (audioPort && typeof audioPort.stopOpeningBgm === "function") {
            try {
              audioPort.stopOpeningBgm();
            } catch {
              // 停止時例外は無視する。
            }
          }
          openingBgmTrack = "none";
          openingBgmUrl = "";
          return;
        }

        const doneAt = clock.nowMs();
        const count =
          typeof audioPort.getOpeningBgmCount === "function"
            ? audioPort.getOpeningBgmCount()
            : res && res.ok
              ? 1
              : 0;

        if (res && res.ok) {
          openingBgmTrack = bgmTrack;
          openingBgmUrl = res.url || "";
          marks["opening-bgm-started"] = doneAt;
          openingBgmLog.push({
            action: "play",
            trackKey: bgmTrack,
            atMs: doneAt,
            activeCount: count,
            loop: true,
            gain: typeof res.gain === "number" ? res.gain : 1.0,
          });
          renderCurrentSnapshot(doneAt);
        } else if (res && res.cancelled) {
          // 既に新しい遷移でキャンセル済みのため記録しない。
        } else {
          openingBgmTrack = "none";
          openingBgmUrl = "";
          openingBgmLog.push({
            action: "fallback",
            trackKey: bgmTrack,
            atMs: doneAt,
            activeCount: count,
            loop: false,
            gain: 0,
            error: (res && res.error) || "BgmUnavailable",
          });
          renderCurrentSnapshot(doneAt);
        }
      })
      .catch(() => {
        if (myGen !== bgmGeneration) {
          return;
        }
        pendingBgmTrack = "none";
        openingBgmTrack = "none";
        openingBgmUrl = "";
        const errAt = clock.nowMs();
        openingBgmLog.push({
          action: "fallback",
          trackKey: bgmTrack,
          atMs: errAt,
          activeCount: 0,
          loop: false,
          gain: 0,
          error: "BgmUnavailable",
        });
        renderCurrentSnapshot(errAt);
      });
  }

  /**
   * 関数名： enterEndingDots
   * 戻り値： なし。
   * 引数： now は現在時刻（ミリ秒）、event は 'AUDIO_DONE' または 'AUDIO_UNAVAILABLE'。
   * 関数の概要： 終了ドット演出状態へ遷移し、開始印を記録して描画する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-005, REQ-007
   */
  function enterEndingDots(now, event) {
    if (state !== "endingAudio") {
      return;
    }
    state = nextState(state, event);
    endingDotsStartMs = now;
    marks["ending-dots-started"] = now;
    buildViewModelAndRender(now, IDLE_OPENING_INFO, 0, "off", false);
  }

  /**
   * 関数名： tick
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 1フレーム分の状態更新・点滅制御・音声起動・描画を実行する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-003, REQ-004, REQ-005, REQ-007
   */
  function tick() {
    const now = clock.nowMs();

    if (state === "opening") {
      const scene5Elapsed =
        openingScene === 5 && scene5StartMs != null ? now - scene5StartMs : 0;
      const info = openingFrame(openingScene, scene5Elapsed);

      if (info.step === "scene1" && marks["opening-start"] == null) {
        marks["opening-start"] = now;
      } else if (info.step === "done") {
        syncOpeningBgm("none", now);
        state = nextState(state, "OPENING_DONE");
        marks["setting-shown"] = now;
        buildViewModelAndRender(now, IDLE_OPENING_INFO, settingMs, "blue", true);
        return;
      }

      buildViewModelAndRender(now, info, settingMs, "blue", true);
      return;
    }

    if (state === "setting") {
      if (activePress) {
        const elapsed = now - activePress.startMs;
        const steps = longPressRepeatSteps(elapsed, activePress.appliedRepeatCount);
        if (steps > 0) {
          settingMs = adjustSetting(settingMs, activePress.deltaMs * steps);
          activePress.appliedRepeatCount += steps;
          lastDisplayTime = formatRemaining(settingMs);
        }
      }
      buildViewModelAndRender(now, IDLE_OPENING_INFO, settingMs, "blue", true);
      return;
    }

    if (state === "countdown") {
      const rem = remainingMs(settingMs, now - countdownStartMs);
      const disp = formatRemaining(rem);
      if (disp !== lastDisplayTime) {
        lastDisplayTime = disp;
        marks["time-changes"].push(now);
      }

      // 残時間 0 到達時は点滅を打ち切り、ピコン音とジュワッチ音声を再生する。
      if (rem <= 0) {
        if (blinkCycle) {
          const cycleElapsed = now - blinkCycle.startMs;
          blinkLog.push({
            startRemainingMs: blinkCycle.startRemainingMs,
            plannedPhaseMs: blinkCycle.phaseMs,
            litMs: Math.min(blinkCycle.phaseMs, cycleElapsed),
            unlitMs: Math.max(0, cycleElapsed - blinkCycle.phaseMs),
            truncated: true,
          });
          blinkCycle = null;
        }

        state = nextState(state, "TIMER_ZERO");
        marks["ending-audio-started"] = now;
        buildViewModelAndRender(now, IDLE_OPENING_INFO, 0, "off", false);

        if (audioPort && typeof audioPort.playPicon === "function") {
          audioPort.playPicon();
        }

        if (audioPort && typeof audioPort.playJuwacchi === "function") {
          const res = audioPort.playJuwacchi(() => {
            enterEndingDots(clock.nowMs(), "AUDIO_DONE");
          });
          if (!res || !res.ok) {
            enterEndingDots(clock.nowMs(), "AUDIO_UNAVAILABLE");
          }
        } else {
          enterEndingDots(clock.nowMs(), "AUDIO_UNAVAILABLE");
        }
        return;
      }

      const zone = beaconZone(rem);
      if (zone === "blue-solid") {
        buildViewModelAndRender(now, IDLE_OPENING_INFO, rem, "blue", true);
        return;
      }

      // 赤色点滅区間の周期制御を行う。
      if (!blinkCycle) {
        blinkCycle = {
          startMs: now,
          startRemainingMs: rem,
          phaseMs: redPhaseDurationMs(rem),
          piconPlayed: false,
        };
      }

      let cycleElapsed = now - blinkCycle.startMs;
      if (cycleElapsed >= blinkCycle.phaseMs * 2) {
        blinkLog.push({
          startRemainingMs: blinkCycle.startRemainingMs,
          plannedPhaseMs: blinkCycle.phaseMs,
          litMs: blinkCycle.phaseMs,
          unlitMs: cycleElapsed - blinkCycle.phaseMs,
          truncated: false,
        });
        blinkCycle = {
          startMs: now,
          startRemainingMs: rem,
          phaseMs: redPhaseDurationMs(rem),
          piconPlayed: false,
        };
        cycleElapsed = 0;
      }

      let beaconLit = true;
      let shouldPlayPicon = false;
      if (cycleElapsed >= blinkCycle.phaseMs) {
        beaconLit = false;
        if (!blinkCycle.piconPlayed) {
          blinkCycle.piconPlayed = true;
          shouldPlayPicon = true;
        }
      }

      buildViewModelAndRender(now, IDLE_OPENING_INFO, rem, "red", beaconLit);
      if (shouldPlayPicon && audioPort && typeof audioPort.playPicon === "function") {
        audioPort.playPicon();
      }
      return;
    }

    if (state === "endingAudio") {
      buildViewModelAndRender(now, IDLE_OPENING_INFO, 0, "off", false);
      return;
    }

    // endingDots 状態
    buildViewModelAndRender(now, IDLE_OPENING_INFO, 0, "off", false);
  }

  /**
   * 関数名： onOpeningNext
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 同期的に音声再生許可を有効化したうえで次シーンへ進み、BGM 切替と第5シーン拡大計測を開始する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
   */
  function onOpeningNext() {
    if (state !== "opening") {
      return;
    }
    // ユーザージェスチャ有効期間内に同期で AudioContext.resume() を実行する。
    resumeAudioSync();

    const nextScene = stepOpeningScene(openingScene, "next");
    if (nextScene === openingScene) {
      return;
    }
    openingScene = nextScene;
    const now = clock.nowMs();

    if (openingScene === 2 && marks["opening-scene2"] == null) {
      marks["opening-scene2"] = now;
    } else if (openingScene === 3 && marks["opening-scene3"] == null) {
      marks["opening-scene3"] = now;
    } else if (openingScene === 4 && marks["opening-scene4"] == null) {
      marks["opening-scene4"] = now;
    } else if (openingScene === 5) {
      scene5StartMs = now;
      if (marks["opening-scene5"] == null) {
        marks["opening-scene5"] = now;
      }
    }

    const info = openingFrame(openingScene, 0);
    syncOpeningBgm(info.bgmTrack, now);
    buildViewModelAndRender(now, info, settingMs, "blue", true);
  }

  /**
   * 関数名： onOpeningBack
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 同期的に音声再生許可を有効化したうえで前シーンへ戻り、BGM を切り替える。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
   */
  function onOpeningBack() {
    if (state !== "opening") {
      return;
    }
    resumeAudioSync();

    const prevScene = stepOpeningScene(openingScene, "back");
    if (prevScene === openingScene) {
      return;
    }
    openingScene = prevScene;
    const now = clock.nowMs();
    const info = openingFrame(openingScene, 0);
    syncOpeningBgm(info.bgmTrack, now);
    buildViewModelAndRender(now, info, settingMs, "blue", true);
  }

  /**
   * 関数名： onClickScreen
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： オープニング第5シーン再生中の画面クリックのみを受け付け、BGM 停止を維持して即座に設定画面へスキップする。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
   */
  function onClickScreen() {
    if (state !== "opening" || openingScene !== 5) {
      return;
    }
    const now = clock.nowMs();
    syncOpeningBgm("none", now);
    state = nextState(state, "SKIP_OPENING");
    marks["setting-shown"] = now;
    buildViewModelAndRender(now, IDLE_OPENING_INFO, settingMs, "blue", true);
  }

  /**
   * 関数名： onAdjust
   * 戻り値： なし。
   * 引数： deltaMs は増減するミリ秒。
   * 関数の概要： 設定画面での時刻増減を受け付ける。カウントダウン中以降は無視する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-002, REQ-003
   */
  function onAdjust(deltaMs) {
    if (state !== "setting") {
      return;
    }
    settingMs = adjustSetting(settingMs, deltaMs);
    lastDisplayTime = formatRemaining(settingMs);
    buildViewModelAndRender(clock.nowMs(), IDLE_OPENING_INFO, settingMs, "blue", true);
  }

  /**
   * 関数名： onAdjustPressStart
   * 戻り値： なし。
   * 引数： deltaMs は 1 ステップあたりの増減ミリ秒。
   * 関数の概要： ＋/−ボタン押下開始を受け付け、長押し早送りの計測を開始する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-002
   */
  function onAdjustPressStart(deltaMs) {
    if (state !== "setting") {
      return;
    }
    activePress = {
      deltaMs,
      startMs: clock.nowMs(),
      appliedRepeatCount: 0,
    };
  }

  /**
   * 関数名： onAdjustPressEnd
   * 戻り値： なし。
   * 引数： cancelled はポインタ外移動やキャンセルによる中断かどうか（既定値 false）。
   * 関数の概要： ＋/−ボタンの押下終了を受け付け、2秒未満かつ早送り未発動のときのみ単押しを適用する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-002
   */
  function onAdjustPressEnd(cancelled = false) {
    if (!activePress) {
      return;
    }
    const press = activePress;
    activePress = null;
    if (state !== "setting" || cancelled) {
      return;
    }
    const elapsed = clock.nowMs() - press.startMs;
    if (elapsed < LONG_PRESS_DELAY_MS && press.appliedRepeatCount === 0) {
      onAdjust(press.deltaMs);
    }
  }

  /**
   * 関数名： onStart
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： スタートボタン押下を受け付け、BGM 停止と AudioContext 有効化を行いカウントダウンを開始する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-003, REQ-004, REQ-005
   */
  function onStart() {
    if (state !== "setting") {
      return;
    }
    activePress = null;
    const now = clock.nowMs();
    syncOpeningBgm("none", now);
    resumeAudioSync();
    state = nextState(state, "START");
    countdownStartMs = now;
    lastDisplayTime = formatRemaining(settingMs);
    marks["countdown-started"] = now;
    marks["time-changes"] = [now];
    blinkCycle = null;

    const zone = beaconZone(settingMs);
    const initialColor = zone === "red-blink" ? "red" : "blue";
    if (zone === "red-blink") {
      blinkCycle = {
        startMs: now,
        startRemainingMs: settingMs,
        phaseMs: redPhaseDurationMs(settingMs),
        piconPlayed: false,
      };
    }
    buildViewModelAndRender(now, IDLE_OPENING_INFO, settingMs, initialColor, true);
  }

  /**
   * 関数名： onExit
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 終了演出状態（endingDots）において EXIT ボタン押下を受け付け、無音確認・終了印記録・最新描画・専用ウィンドウ閉鎖を実行する。
   * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-007
   */
  function onExit() {
    if (state !== "endingDots") {
      return;
    }
    const now = clock.nowMs();
    syncOpeningBgm("none", now);
    marks["exit-clicked"] = now;
    buildViewModelAndRender(now, IDLE_OPENING_INFO, 0, "off", false);
    if (windowPort && typeof windowPort.close === "function") {
      try {
        windowPort.close();
      } catch {
        // ウィンドウ操作ポート例外時もエラーを送出せず正常終了状態を保つ。
      }
    }
  }

  return {
    onOpeningNext,
    onOpeningBack,
    onClickScreen,
    onAdjust,
    onAdjustPressStart,
    onAdjustPressEnd,
    onStart,
    onExit,
    tick,
    setJuwacchiUrl(url) {
      juwacchiUrl = url || "";
    },
  };
}
