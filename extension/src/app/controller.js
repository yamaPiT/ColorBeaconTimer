/**
 * ファイル名： controller.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 1フレームごとに計算ユニットを呼び、音と描画へ結果を渡す。
 * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */

import { nextState, INITIAL_STATE } from "../domain/app-state.js";
import { openingStep } from "../domain/opening-timeline.js";
import { adjustSetting } from "../domain/setting-time.js";
import { sortieStep } from "../domain/sortie-timeline.js";
import { beaconZone, formatRemaining, remainingMs } from "../domain/remaining-time.js";
import { bluePhase, redIntervalSec } from "../domain/blink-interval.js";
import { earthDiameterPx, mulberry32, starPositions } from "../domain/ending-timeline.js";
import {
  BLUE_PHASE_MS,
  EARTH_POINT_PX,
  HOLD_REPEAT_MS,
  SETTING_INITIAL_MS,
  SETTING_STEP_MS,
} from "../domain/constants.js";

/**
 * 関数名： createController
 * 戻り値： tick、pointer、ready を持つコントローラ。
 * 引数： clock は nowMs。audioPort は音。view は描画。scheduler は set と clear。
 * 関数の概要： 注入された時計で状態を進め、失敗した掛け声は終了演出へ渡す。
 * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */
export function createController(clock, audioPort, view, scheduler) {
  const model = {
    mode: INITIAL_STATE,
    settingMs: SETTING_INITIAL_MS,
    originMs: null,
    phaseStartMs: 0,
    countdownStartMs: 0,
    shrinkStartMs: 0,
    starsStartMs: 0,
    blueStartMs: null,
    blueCycle: -1,
    blueOpen: null,
    blink: null,
    blinkLog: [],
    marks: [],
    holdId: null,
    shoutReady: null,
    shoutUrl: "",
    shoutBytes: null,
    shoutStarted: false,
    shoutDone: false,
    pointMarked: false,
    shownOpening: false,
    shownSetting: false,
  };

  // 起動時に保存ファイルを1回だけ読む。実行のたびに合成しない。
  const ready = Promise.resolve()
    .then(() => audioPort.loadShout())
    .then((loaded) => {
      if (loaded && loaded !== "ShoutUnavailable" && loaded.bytes) {
        model.shoutReady = true;
        model.shoutUrl = String(loaded.url || "");
        model.shoutBytes = loaded.bytes;
        return;
      }
      model.shoutReady = false;
      model.shoutUrl = "";
    })
    .catch(() => {
      model.shoutReady = false;
      model.shoutUrl = "";
    });

  /**
   * 関数名： mark
   * 戻り値： なし。
   * 引数： name は印の名前。
   * 関数の概要： performance.now() の時点を印として残す。
   * 対応機能ID（トレーサビリティ）： UNIT-012
   */
  function mark(name) {
    const stamp = typeof performance !== "undefined" && performance.now
      ? performance.now()
      : clock.nowMs();
    model.marks.push({ name, t: stamp });
  }

  /**
   * 関数名： stopHold
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 長押しの繰り返しを止める。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-002
   */
  function stopHold() {
    if (model.holdId != null) {
      scheduler.clear(model.holdId);
      model.holdId = null;
    }
  }

  /**
   * 関数名： applyDelta
   * 戻り値： なし。
   * 引数： delta は設定時刻へ足すミリ秒。
   * 関数の概要： 設定中だけ設定時刻を1秒変え、範囲外はクランプする。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-002
   */
  function applyDelta(delta) {
    if (model.mode !== "setting") {
      return;
    }
    model.settingMs = adjustSetting(model.settingMs, delta);
  }

  /**
   * 関数名： startHold
   * 戻り値： なし。
   * 引数： delta は繰り返す増減。単位はミリ秒。
   * 関数の概要： 押した時点で1回変え、その後 300 ミリ秒ごとに同じ方向へ変える。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-002
   */
  function startHold(delta) {
    stopHold();
    applyDelta(delta);
    const repeat = () => {
      applyDelta(delta);
      model.holdId = scheduler.set(repeat, HOLD_REPEAT_MS);
    };
    model.holdId = scheduler.set(repeat, HOLD_REPEAT_MS);
  }

  /**
   * 関数名： enter
   * 戻り値： 遷移したかどうか。
   * 引数： event は nextState へ渡すきっかけ。now は現在のミリ秒。
   * 関数の概要： 次の状態が変わったときだけ、その状態の開始時刻と印を付ける。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-003, REQ-005, REQ-007
   */
  function enter(event, now) {
    const next = nextState(model.mode, event);
    if (next === model.mode) {
      return false;
    }
    model.mode = next;
    model.phaseStartMs = now;
    if (next === "setting" && !model.shownSetting) {
      mark("setting-shown");
      model.shownSetting = true;
      stopHold();
    }
    if (next === "sortie") {
      mark("sortie-started");
      stopHold();
      audioPort.resume();
    }
    if (next === "countdown") {
      mark("countdown-started");
      model.countdownStartMs = now;
      model.blink = null;
      model.blueStartMs = null;
      model.blueCycle = -1;
      model.blueOpen = null;
    }
    if (next === "shout") {
      mark("shout-started");
      beginShout();
    }
    if (next === "shrink") {
      mark("shrink-started");
      model.shrinkStartMs = now;
    }
    if (next === "stars") {
      mark("stars-started");
      model.starsStartMs = now;
    }
    return true;
  }

  /**
   * 関数名： beginShout
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 保存ファイルを1回再生し、終了か失敗で縮小へ進める印を付ける。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-005
   */
  function beginShout() {
    if (model.shoutStarted) {
      return;
    }
    model.shoutStarted = true;
    Promise.resolve()
      .then(() => audioPort.playShout(model.shoutBytes, 0))
      .then((source) => {
        if (source === "ShoutUnavailable" || !source) {
          model.shoutDone = true;
          return;
        }
        source.onended = () => {
          model.shoutDone = true;
        };
        if (source.buffer && source.buffer.duration) {
          const durMs = Math.ceil(source.buffer.duration * 1000);
          scheduler.set(() => {
            model.shoutDone = true;
          }, durMs);
        }
      })
      .catch(() => {
        model.shoutDone = true;
      });
  }

  /**
   * 関数名： pushBlink
   * 戻り値： なし。
   * 引数： record は点滅1件。
   * 関数の概要： 完了した点滅を観測用の記録へ追加する。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-004
   */
  function pushBlink(record) {
    model.blinkLog.push(record);
  }

  /**
   * 関数名： closeBlue
   * 戻り値： なし。
   * 引数： now は現在時刻。truncated は残時間 0 で打ち切ったとき true。
   * 関数の概要： 開いている青のフェーズを、実測または打ち切りとして閉じる。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-004
   */
  function closeBlue(now, truncated) {
    if (!model.blueOpen) {
      return;
    }
    const open = model.blueOpen;
    model.blueOpen = null;
    pushBlink({
      startRemainingMs: open.startRemainingMs,
      intervalMs: BLUE_PHASE_MS,
      measuredMs: truncated ? null : Math.round(now - open.startedAt),
      truncated,
      phase: open.phase,
      plannedMs: BLUE_PHASE_MS,
    });
  }

  /**
   * 関数名： openBlue
   * 戻り値： なし。
   * 引数： phase は fade-out または fade-in。remaining は開始時の残時間。now は現在時刻。
   * 関数の概要： 青のフェーズを1件開き、前のフェーズが残っていれば閉じる。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-004
   */
  function openBlue(phase, remaining, now) {
    if (model.blueOpen && model.blueOpen.phase === phase) {
      return;
    }
    closeBlue(now, false);
    model.blueOpen = { phase, startRemainingMs: remaining, startedAt: now };
  }

  /**
   * 関数名： closeRed
   * 戻り値： なし。
   * 引数： now は現在時刻。truncated は打ち切りのとき true。
   * 関数の概要： 開いている赤の点滅を閉じる。打ち切りの実測は残さない。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-004
   */
  function closeRed(now, truncated) {
    if (!model.blink || model.blink.kind !== "red" || model.blink.closed) {
      return;
    }
    model.blink.closed = true;
    pushBlink({
      startRemainingMs: model.blink.startRemainingMs,
      intervalMs: model.blink.intervalMs,
      measuredMs: truncated ? null : Math.round(now - model.blink.startedAt),
      truncated,
      phase: "red",
      plannedMs: model.blink.intervalMs,
    });
  }

  /**
   * 関数名： startRed
   * 戻り値： なし。
   * 引数： remaining は開始時の残時間。now は現在時刻。
   * 関数の概要： その時点の残時間で間隔を計算し、点滅の開始時にピコンを1回鳴らす。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-004
   */
  function startRed(remaining, now) {
    const seconds = redIntervalSec(remaining);
    const intervalMs = Math.round(seconds * 1000);
    model.blink = {
      kind: "red",
      startRemainingMs: remaining,
      intervalMs,
      startedAt: now,
      closed: false,
    };
    audioPort.playPicon();
    mark("blink-started");
  }

  /**
   * 関数名： updateCountdownAudio
   * 戻り値： ビーコンの色名と不透明度。
   * 引数： remaining は残時間。now は現在時刻。
   * 関数の概要： 区分に合わせて青の点灯、青のフェード、赤の点滅とピコンを進める。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-004
   */
  function updateCountdownAudio(remaining, now) {
    const zone = beaconZone(remaining);
    if (zone === "zero") {
      closeBlue(now, true);
      closeRed(now, true);
      return { beaconColor: "off", beaconOpacity: 0 };
    }
    if (zone === "blue-solid") {
      closeBlue(now, false);
      closeRed(now, false);
      model.blueStartMs = null;
      model.blueCycle = -1;
      return { beaconColor: "blue", beaconOpacity: 1 };
    }
    if (zone === "blue-blink") {
      closeRed(now, false);
      if (model.blueStartMs === null) {
        model.blueStartMs = now;
        model.blueCycle = -1;
      }
      const elapsed = Math.max(0, now - model.blueStartMs);
      const cycleLen = BLUE_PHASE_MS * 2;
      const cycle = Math.floor(elapsed / cycleLen);
      const inCycle = elapsed % cycleLen;
      if (cycle !== model.blueCycle) {
        // 周期の境は明るさが最大の時点なので、ピコンはここだけで1回鳴らす。
        model.blueCycle = cycle;
        audioPort.playPicon();
        mark("blink-started");
      }
      const phase = bluePhase(inCycle);
      openBlue(phase.phase, remaining, now);
      return { beaconColor: "blue", beaconOpacity: phase.opacity };
    }

    // 赤へ入った最初の点滅は、入った時点の残時間で間隔を計算する。
    closeBlue(now, false);
    model.blueStartMs = null;
    if (!model.blink || model.blink.kind !== "red" || model.blink.closed) {
      startRed(remaining, now);
    } else if (now - model.blink.startedAt >= model.blink.intervalMs) {
      closeRed(now, false);
      if (remaining > 0) {
        startRed(remaining, now);
      }
    }
    const into = now - model.blink.startedAt;
    const lit = into < model.blink.intervalMs / 2;
    return { beaconColor: "red", beaconOpacity: lit ? 1 : 0 };
  }

  /**
   * 関数名： currentRemaining
   * 戻り値： 残時間。単位はミリ秒。
   * 引数： now は現在時刻。
   * 関数の概要： 出撃前と出撃演出中は設定時刻のままにし、カウントダウン以降だけ減らす。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-003, REQ-004
   */
  function currentRemaining(now) {
    if (model.mode === "countdown") {
      const elapsed = Math.max(0, Math.floor(now - model.countdownStartMs));
      return remainingMs(model.settingMs, elapsed);
    }
    if (model.mode === "shout" || model.mode === "shrink" || model.mode === "stars") {
      return 0;
    }
    return model.settingMs;
  }

  /**
   * 関数名： buildViewModel
   * 戻り値： 描画へ渡す ViewModel。
   * 引数： now は現在時刻。beacon は色と不透明度。
   * 関数の概要： 状態ごとの表示、地球の直径、星の位置、観測用の記録をまとめる。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-003, REQ-004, REQ-005, REQ-007
   */
  function buildViewModel(now, beacon) {
    const remaining = currentRemaining(now);
    let displayTime = "";
    let timeVisible = false;
    let openingName = "";
    let sortieName = "";
    let openingElapsedMs = 0;
    let sortieElapsedMs = 0;
    let earth = 0;
    let stars = [];
    let buttonsVisible = false;
    let beaconColor = beacon.beaconColor;
    let beaconOpacity = beacon.beaconOpacity;

    if (model.mode === "opening") {
      openingElapsedMs = Math.max(0, now - model.phaseStartMs);
      openingName = openingStep(openingElapsedMs);
      if (openingName === "done") {
        openingName = "expand";
      }
      beaconColor = "off";
      beaconOpacity = 0;
    } else if (model.mode === "setting") {
      displayTime = formatRemaining(model.settingMs);
      timeVisible = true;
      buttonsVisible = true;
      beaconColor = "blue";
      beaconOpacity = 1;
    } else if (model.mode === "sortie") {
      displayTime = formatRemaining(model.settingMs);
      timeVisible = true;
      buttonsVisible = true;
      sortieElapsedMs = Math.max(0, now - model.phaseStartMs);
      sortieName = sortieStep(sortieElapsedMs);
      if (sortieName === "done") {
        sortieName = "land";
      }
      beaconColor = "off";
      beaconOpacity = 0;
    } else if (model.mode === "countdown") {
      displayTime = formatRemaining(remaining);
      timeVisible = true;
      buttonsVisible = true;
    } else if (model.mode === "shout") {
      displayTime = "0:00";
      timeVisible = true;
      beaconColor = "off";
      beaconOpacity = 0;
    } else if (model.mode === "shrink") {
      displayTime = "";
      timeVisible = false;
      earth = earthDiameterPx(Math.max(0, now - model.shrinkStartMs));
      beaconColor = "off";
      beaconOpacity = 0;
    } else if (model.mode === "stars") {
      displayTime = "";
      timeVisible = false;
      stars = starPositions(Math.max(0, now - model.starsStartMs), mulberry32(1));
      beaconColor = "off";
      beaconOpacity = 0;
    }

    const blinkLog = model.blinkLog.slice();
    if (model.blink && model.blink.kind === "red" && !model.blink.closed) {
      blinkLog.push({
        startRemainingMs: model.blink.startRemainingMs,
        intervalMs: model.blink.intervalMs,
        measuredMs: null,
        truncated: false,
        phase: "red",
        plannedMs: model.blink.intervalMs,
      });
    }

    return {
      state: model.mode,
      settingMs: model.settingMs,
      remainingMs: remaining,
      displayTime,
      timeVisible,
      beaconColor,
      beaconOpacity,
      openingStep: openingName,
      sortieStep: sortieName,
      openingElapsedMs,
      sortieElapsedMs,
      earthDiameterPx: earth,
      stars,
      buttonsVisible,
      shoutUrl: model.shoutUrl,
      blinkLog,
      marks: model.marks,
    };
  }

  /**
   * 関数名： tick
   * 戻り値： なし。
   * 引数： なし。
   * 関数の概要： 経過ミリ秒で状態を進め、ViewModel を描画へ渡す。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-003, REQ-004, REQ-005, REQ-007
   */
  function tick() {
    const now = clock.nowMs();
    if (model.originMs === null) {
      model.originMs = now;
      model.phaseStartMs = now;
    }
    if (model.mode === "opening" && !model.shownOpening) {
      mark("opening-shown");
      model.shownOpening = true;
    }

    // 時間で進む遷移。ボタンの無視は pointer 側で行い、ここでは経過だけを見る。
    if (model.mode === "opening") {
      enter({ name: "tick", elapsedMs: now - model.phaseStartMs }, now);
    } else if (model.mode === "sortie") {
      enter({ name: "tick", elapsedMs: now - model.phaseStartMs }, now);
    } else if (model.mode === "shout" && model.shoutDone) {
      enter({ name: "shout-ended" }, now);
    }

    let beacon = { beaconColor: "off", beaconOpacity: 0 };
    if (model.mode === "countdown") {
      const remaining = currentRemaining(now);
      if (remaining === 0) {
        // 残時間 0 の打ち切りは、点滅の実測を待たずに次へ進む。
        closeBlue(now, true);
        closeRed(now, true);
        if (model.shoutReady === true) {
          enter({ name: "remaining-zero", canPlay: true }, now);
        } else if (model.shoutReady === false) {
          enter({ name: "remaining-zero", canPlay: false }, now);
        }
      } else {
        beacon = updateCountdownAudio(remaining, now);
      }
    }

    if (model.mode === "shrink" && !model.pointMarked) {
      const diameter = earthDiameterPx(Math.max(0, now - model.shrinkStartMs));
      if (diameter <= EARTH_POINT_PX) {
        mark("point-reached");
        model.pointMarked = true;
      }
    }

    const viewModel = buildViewModel(now, beacon);
    view.render(viewModel);

    // 点のフレームを1枚描いてから、次のフレームで星へ進む。
    if (model.mode === "shrink" && model.pointMarked) {
      enter({ name: "tick", diameterPx: viewModel.earthDiameterPx }, now);
    }
  }

  /**
   * 関数名： pointer
   * 戻り値： なし。
   * 引数： phase は down、up、cancel。targetId は押した要素の id。
   * 関数の概要： オープニングの最初の押下でスキップし、設定中だけ時刻と出撃を受ける。
   * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-002, REQ-003
   */
  function pointer(phase, targetId) {
    const now = clock.nowMs();
    if (model.originMs === null) {
      model.originMs = now;
      model.phaseStartMs = now;
    }
    if (phase === "up" || phase === "cancel") {
      stopHold();
      return;
    }
    if (model.mode === "opening") {
      if (!model.shownOpening) {
        mark("opening-shown");
        model.shownOpening = true;
      }
      enter({ name: "click" }, now);
      return;
    }
    if (model.mode !== "setting") {
      // 出撃演出中とカウントダウン中のボタンは、状態を変えずに捨てる。
      const name = targetId === "plus" || targetId === "minus" || targetId === "sortie"
        ? targetId
        : "ignored";
      enter({ name }, now);
      return;
    }
    if (targetId === "plus") {
      startHold(SETTING_STEP_MS);
      return;
    }
    if (targetId === "minus") {
      startHold(-SETTING_STEP_MS);
      return;
    }
    if (targetId === "sortie") {
      enter({ name: "sortie" }, now);
    }
  }

  return { tick, pointer, ready };
}
