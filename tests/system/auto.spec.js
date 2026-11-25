/**
 * ファイル名： auto.spec.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： SWP6 v4.5 の自動区分総合テスト（Playwright Chromium 実ポップアップ基準）を実行する。
 * 対応機能ID（トレーサビリティ）： TC-001, TC-002, TC-003, TC-004, TC-006, TC-008, TC-009, TC-010, TC-011, TC-013, TC-014, TC-015, TC-016, TC-017, TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-026, TC-027, TC-029, TC-030, TC-031, TC-032, TC-034, TC-036, TC-037, TC-038, TC-042, TC-043, TC-046, TC-047, TC-048, TC-049, TC-051, TC-052, TC-053, TC-055, TC-056, TC-057, TC-059, TC-060, TC-061, TC-062, TC-063, TC-067, TC-069, TC-071, TC-072, TC-073, TC-074, TC-075, TC-076, TC-077
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  analyzeJuwacchiProsody,
  appPages,
  checkAttributionDocs,
  checkReadmeV44Structure,
  closeApps,
  containsName,
  copyWithCorruptBgmAsset,
  copyWithoutBgmAsset,
  copyWithoutJuwacchi,
  evaluateBgmLoudnessBalance,
  forbiddenEduTerms,
  forbiddenNames,
  launchExtension,
  parseWavMetrics,
  readApp,
  setSettingMs,
  skipOpeningToSetting,
  triggerAction,
  validateJuwacchiProsody,
  validateLoopBoundaryQuality,
  validateManifestDescription,
  validatePopupViewportWidth,
  validatePcmWavQuality,
  waitForApp,
  waitForBgmTrack,
  waitForState,
} from "./harness.js";

const EXT_PATH = path.resolve("extension");
const SW105_PATH = path.resolve("docs/artifacts/SW105_ソフトウェア要求仕様書.md");

/** 縦積み要素が上下に重なっていないことを検証する */
function expectVerticalNonOverlap(upper, lower) {
  expect(upper).not.toBeNull();
  expect(lower).not.toBeNull();
  expect(upper.bottom).toBeLessThanOrEqual(lower.top + 0.5);
}

/** 横並び要素（Back と NEXT 等）が左右に重なっていないことを検証する */
function expectHorizontalNonOverlap(leftRect, rightRect) {
  expect(leftRect).not.toBeNull();
  expect(rightRect).not.toBeNull();
  expect(leftRect.right).toBeLessThanOrEqual(rightRect.left + 0.5);
}

/** 表示要素が実ポップアップウィンドウの見切れ範囲内に収まっていることを検証する */
function expectRectInsideWindow(rect, width, height) {
  expect(rect).not.toBeNull();
  expect(rect.left).toBeGreaterThanOrEqual(-0.5);
  expect(rect.top).toBeGreaterThanOrEqual(-0.5);
  expect(rect.right).toBeLessThanOrEqual(width + 0.5);
  expect(rect.bottom).toBeLessThanOrEqual(height + 0.5);
}

/** 実ポップアップウィンドウの寸法（実ビューポート幅 640px 以上）・スクロールバーなし・文字見切れゼロ・言語切替ボタン非存在を検証する */
function expectWithinWindowAndNoScroll(obs) {
  expect(obs.outerWidth).toBeGreaterThanOrEqual(690);
  expect(obs.outerWidth).toBeLessThanOrEqual(720);
  expect(obs.windowWidth).toBeGreaterThanOrEqual(640);
  expect(obs.windowHeight).toBeGreaterThanOrEqual(660);
  expect(validatePopupViewportWidth(obs.windowWidth).ok).toBe(true);
  expect(obs.scrollWidth).toBeLessThanOrEqual(obs.clientWidth);
  expect(obs.scrollHeight).toBeLessThanOrEqual(obs.clientHeight);
  expect(obs.appScroll.scrollWidth).toBeLessThanOrEqual(obs.appScroll.clientWidth);
  expect(obs.appScroll.scrollHeight).toBeLessThanOrEqual(obs.appScroll.clientHeight);
  if (obs.openingStageScroll) {
    expect(obs.openingStageScroll.scrollWidth).toBeLessThanOrEqual(obs.openingStageScroll.clientWidth);
    expect(obs.openingStageScroll.scrollHeight).toBeLessThanOrEqual(obs.openingStageScroll.clientHeight);
  }
  if (!obs.openingTitleHidden && obs.openingTitleScroll) {
    expect(obs.openingTitleScroll.scrollWidth).toBeLessThanOrEqual(obs.openingTitleScroll.clientWidth);
    expect(obs.openingTitleScroll.scrollHeight).toBeLessThanOrEqual(obs.openingTitleScroll.clientHeight);
  }
  if (!obs.openingTextHidden && obs.openingTextScroll) {
    expect(obs.openingTextScroll.scrollWidth).toBeLessThanOrEqual(obs.openingTextScroll.clientWidth);
    expect(obs.openingTextScroll.scrollHeight).toBeLessThanOrEqual(obs.openingTextScroll.clientHeight);
  }
  expect(obs.hasLangToggleButton).toBe(false);
}

/**
 * 関数名： audioSpyInitScript
 * 戻り値： なし（ブラウザ側の window.__bgmSpy を設定する）。
 * 引数： なし。
 * 関数の概要： 実 Web Audio API の動作を変更せず、createBufferSource / createGain の接続・適用ゲイン・デコード済みバッファ RMS/Peak・AnalyserNode 並列接続・AudioContext.currentTime を受動観測する。
 * 対応機能ID（トレーサビリティ）： TC-059, TC-060, TC-061, TC-069, TC-073
 */
function audioSpyInitScript() {
  const OriginalAC = window.AudioContext || window.webkitAudioContext;
  if (!OriginalAC || window.__bgmSpyInstalled) {
    return;
  }
  window.__bgmSpyInstalled = true;
  const gainNodeSet = new WeakSet();
  const bufferStatsCache = new WeakMap();
  const sourceBuffers = [];

  function computeAudioBufferStats(audioBuffer) {
    if (!audioBuffer) {
      return { rms: 0, peak: 0 };
    }
    if (bufferStatsCache.has(audioBuffer)) {
      return bufferStatsCache.get(audioBuffer);
    }
    const chCount = audioBuffer.numberOfChannels || 1;
    const len = audioBuffer.length || 0;
    let sumSq = 0;
    let totalSamples = 0;
    let peak = 0;
    for (let c = 0; c < chCount; c += 1) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i += 1) {
        const v = data[i];
        const a = Math.abs(v);
        if (a > peak) peak = a;
        sumSq += v * v;
      }
      totalSamples += len;
    }
    const stats = {
      rms: totalSamples > 0 ? Math.sqrt(sumSq / totalSamples) : 0,
      peak,
    };
    bufferStatsCache.set(audioBuffer, stats);
    return stats;
  }

  const spy = {
    liveCount: 0,
    maxLiveCount: 0,
    resumeCount: 0,
    sources: [],
    gains: [],
    activeCtx: null,
    activeAnalyser: null,
    activeEntry: null,
    getSourceStats(index) {
      return computeAudioBufferStats(sourceBuffers[index]);
    },
    sampleLiveAudio() {
      if (!spy.activeCtx || !spy.activeEntry) {
        return null;
      }
      const elapsedCtxSec = spy.activeCtx.currentTime - spy.activeEntry.startedCtxTime;
      let livePeak = 0;
      let liveRms = 0;
      if (spy.activeAnalyser) {
        const arr = new Float32Array(spy.activeAnalyser.fftSize);
        spy.activeAnalyser.getFloatTimeDomainData(arr);
        let sumSq = 0;
        for (let i = 0; i < arr.length; i += 1) {
          const v = Math.abs(arr[i]);
          if (v > livePeak) livePeak = v;
          sumSq += arr[i] * arr[i];
        }
        liveRms = Math.sqrt(sumSq / arr.length);
      }
      return {
        elapsedCtxSec,
        ctxTime: spy.activeCtx.currentTime,
        ctxState: spy.activeCtx.state,
        duration: spy.activeEntry.duration,
        sampleRate: spy.activeEntry.sampleRate,
        channels: spy.activeEntry.channels,
        appliedGain: spy.activeEntry.appliedGain,
        livePeak,
        liveRms,
        liveCount: spy.liveCount,
        loop: spy.activeEntry.loop,
      };
    },
  };
  window.__bgmSpy = spy;

  const origResume = OriginalAC.prototype.resume;
  OriginalAC.prototype.resume = function (...args) {
    spy.resumeCount += 1;
    return origResume.apply(this, args);
  };

  const origCreateGain = OriginalAC.prototype.createGain;
  if (typeof origCreateGain === "function") {
    OriginalAC.prototype.createGain = function (...args) {
      const gNode = origCreateGain.apply(this, args);
      gainNodeSet.add(gNode);
      const gEntry = {
        initialGain: gNode.gain.value,
        disconnected: false,
      };
      const origDisconnect = gNode.disconnect.bind(gNode);
      gNode.disconnect = function (...dArgs) {
        gEntry.disconnected = true;
        return origDisconnect(...dArgs);
      };
      gNode.__spyEntry = gEntry;
      spy.gains.push(gEntry);
      return gNode;
    };
  }

  const origCreateBufferSource = OriginalAC.prototype.createBufferSource;
  OriginalAC.prototype.createBufferSource = function (...args) {
    const ctx = this;
    const node = origCreateBufferSource.apply(this, args);
    let analyser = null;
    if (typeof ctx.createAnalyser === "function") {
      try {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
      } catch {
        analyser = null;
      }
    }

    let connectedGainNode = null;
    const origConnect = node.connect.bind(node);
    node.connect = function (dest, ...rest) {
      if (dest && gainNodeSet.has(dest)) {
        connectedGainNode = dest;
      }
      return origConnect(dest, ...rest);
    };

    const entry = {
      index: -1,
      started: false,
      stopped: false,
      loop: false,
      startArgs: null,
      startedCtxTime: 0,
      duration: 0,
      sampleRate: 0,
      channels: 0,
      appliedGain: 1.0,
      connectedViaGain: false,
    };
    let counted = false;

    const origStart = node.start.bind(node);
    const origStop = node.stop.bind(node);

    node.start = function (...sArgs) {
      entry.started = true;
      entry.loop = Boolean(node.loop);
      entry.startArgs = sArgs;
      entry.startedCtxTime = ctx.currentTime;
      entry.duration = node.buffer ? node.buffer.duration : 0;
      entry.sampleRate = node.buffer ? node.buffer.sampleRate : 0;
      entry.channels = node.buffer ? node.buffer.numberOfChannels : 0;
      entry.index = sourceBuffers.length;
      sourceBuffers.push(node.buffer || null);
      if (connectedGainNode) {
        entry.connectedViaGain = true;
        entry.appliedGain = connectedGainNode.gain.value;
        if (connectedGainNode.__spyEntry) {
          connectedGainNode.__spyEntry.appliedGain = entry.appliedGain;
        }
      }
      if (analyser) {
        try {
          if (connectedGainNode) {
            connectedGainNode.connect(analyser);
          } else {
            origConnect(analyser);
          }
        } catch {
          // モックまたは切断状態では無視する。
        }
      }
      if (!counted && entry.loop) {
        counted = true;
        spy.liveCount += 1;
        if (spy.liveCount > spy.maxLiveCount) {
          spy.maxLiveCount = spy.liveCount;
        }
        spy.activeCtx = ctx;
        spy.activeAnalyser = analyser;
        spy.activeEntry = entry;
      }
      spy.sources.push(entry);
      return origStart(...sArgs);
    };

    node.stop = function (...stArgs) {
      entry.stopped = true;
      if (counted) {
        counted = false;
        spy.liveCount = Math.max(0, spy.liveCount - 1);
      }
      if (spy.activeEntry === entry) {
        spy.activeEntry = null;
        spy.activeAnalyser = null;
      }
      return origStop(...stArgs);
    };

    return node;
  };
}

test("起動制御・第5シーンクリックスキップ・設定操作・再起動初期化 (TC-001〜003, TC-011, TC-013〜020, TC-022〜023)", async () => {
  // Arrange
  const session = await launchExtension(EXT_PATH);
  const { context, extensionId, httpRequests } = session;

  try {
    // TC-002: アイコンクリック以外の操作では専用ウィンドウが開かない
    const p1 = await context.newPage();
    await p1.goto("data:text/html,<input id='addr'/><button id='b'>x</button>");
    await p1.click("#b");
    const p2 = await context.newPage();
    await p2.goto("data:text/html,<title>tab2</title>");
    await p1.fill("#addr", "a");
    expect(appPages(context).length).toBe(0);

    // TC-001: アイコン 1回クリックで専用ウィンドウが 1つ開きオープニング開始
    const prev0 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    let app = await waitForApp(context, prev0);
    let obs = await readApp(app);
    expect(appPages(context).length).toBe(1);
    expect(obs.state).toBe("opening");
    expect(obs.openingStep).toBe("scene1");
    expect(obs.openingBgmTrack).toBe("none");
    expect(obs.exitVisible).toBe(false);
    expect(obs.exitHidden).toBe(true);
    expect(obs.rects.exit).toBeNull();

    // TC-011 & TC-014: 第5シーン開始後 1.0秒時点のクリックで 1.0秒以内に設定画面へ遷移し 2:00 表示
    for (let i = 0; i < 4; i += 1) {
      await app.click("#btn-opening-next");
    }
    await app.waitForFunction(() => {
      const el = document.querySelector("#app");
      return el && el.dataset.openingStep === "scene5";
    }, null, { timeout: 3000 });
    await app.waitForTimeout(1000);
    const clickAt = Date.now();
    await app.mouse.click(280, 360);
    obs = await waitForState(app, "setting", 1000);
    expect(Date.now() - clickAt).toBeLessThanOrEqual(1000);
    expect(obs.displayTime).toBe("2:00");
    expect(obs.settingMs).toBe(120000);
    expect(obs.openingProgressExists).toBe(false);
    expect(obs.openingTitleHidden).toBe(true);
    expect(obs.openingTextHidden).toBe(true);
    expect(obs.openingImageHidden).toBe(true);
    expect(obs.backHidden).toBe(true);
    expect(obs.nextHidden).toBe(true);
    expect(obs.openingBgmTrack).toBe("none");

    // TC-003: 既に開いている状態でアイコンクリックしても増えずオープニングへ戻らない
    await triggerAction(context, extensionId);
    await app.waitForTimeout(200);
    expect(appPages(context).length).toBe(1);
    obs = await readApp(app);
    expect(obs.state).toBe("setting");

    // TC-020 & TC-075: 表示されるボタンは − / スタート / START / ＋ のみ、言語切替・ストップ等なし・非重複
    expect(obs.visibleButtons.map((b) => b.id)).toEqual(["btn-minus", "btn-start", "btn-plus"]);
    expect(obs.visibleButtons.find((b) => b.id === "btn-start")?.text).toBe("スタート / START");
    expect(obs.buttons.some((b) => /stop|pause|reset|ストップ|一時停止|リセット/i.test(`${b.id} ${b.text}`))).toBe(false);
    expect(obs.exitVisible).toBe(false);
    expect(obs.exitHidden).toBe(true);
    expect(obs.rects.exit).toBeNull();
    expectWithinWindowAndNoScroll(obs);
    expectRectInsideWindow(obs.rects.beacon, obs.windowWidth, obs.windowHeight);
    expectRectInsideWindow(obs.rects.time, obs.windowWidth, obs.windowHeight);
    expectRectInsideWindow(obs.rects.minus, obs.windowWidth, obs.windowHeight);
    expectRectInsideWindow(obs.rects.start, obs.windowWidth, obs.windowHeight);
    expectRectInsideWindow(obs.rects.plus, obs.windowWidth, obs.windowHeight);
    expectVerticalNonOverlap(obs.rects.beacon, obs.rects.time);
    expectVerticalNonOverlap(obs.rects.time, obs.rects.minus);
    expectVerticalNonOverlap(obs.rects.time, obs.rects.start);
    expectVerticalNonOverlap(obs.rects.time, obs.rects.plus);
    expectHorizontalNonOverlap(obs.rects.minus, obs.rects.start);
    expectHorizontalNonOverlap(obs.rects.start, obs.rects.plus);

    // TC-015, TC-016, TC-017, TC-018: 10秒単位増減と 1:00〜3:00 クランプ
    await app.click("#btn-plus");
    expect((await readApp(app)).displayTime).toBe("2:10");
    await app.click("#btn-minus");
    expect((await readApp(app)).displayTime).toBe("2:00");
    await app.click("#btn-minus");
    expect((await readApp(app)).displayTime).toBe("1:50");

    await setSettingMs(app, 170000); // 2:50
    await app.click("#btn-plus");
    expect((await readApp(app)).displayTime).toBe("3:00");
    await app.click("#btn-plus");
    expect((await readApp(app)).displayTime).toBe("3:00");

    await setSettingMs(app, 70000); // 1:10
    await app.click("#btn-minus");
    expect((await readApp(app)).displayTime).toBe("1:00");
    await app.click("#btn-minus");
    expect((await readApp(app)).displayTime).toBe("1:00");

    // TC-019: 2:30 に変更後に閉じて再開するとオープニングから 2:00 へ戻る
    await setSettingMs(app, 150000);
    await closeApps(context);
    const prev1 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    app = await waitForApp(context, prev1);
    expect((await readApp(app)).state).toBe("opening");

    // TC-013: BGM 再生中の第2シーン表示中に閉じて再開すると BGM がリセットされ第1シーン（無音）からやり直す
    await app.click("#btn-opening-next");
    obs = await waitForBgmTrack(app, "scene2", 5000);
    expect(obs.openingStep).toBe("scene2");
    expect(obs.openingBgmTrack).toBe("scene2");
    await closeApps(context);
    const prev2 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    app = await waitForApp(context, prev2);
    obs = await readApp(app);
    expect(obs.state).toBe("opening");
    expect(obs.openingStep).toBe("scene1");
    expect(obs.openingBgmTrack).toBe("none");
    expect(obs.exitVisible).toBe(false);
    expect(obs.exitHidden).toBe(true);
    expect(obs.rects.exit).toBeNull();

    // TC-022 & TC-023: カウントダウン中のボタン無効と閉じた後の初期化
    await skipOpeningToSetting(app);
    expect((await readApp(app)).displayTime).toBe("2:00");
    await app.click("#btn-start");
    obs = await waitForState(app, "countdown", 1000);
    expect(obs.visibleButtons.every((b) => b.disabled)).toBe(true);
    await app.click("#btn-plus", { force: true });
    await app.click("#btn-minus", { force: true });
    await app.click("#btn-start", { force: true });
    expect((await readApp(app)).state).toBe("countdown");

    await closeApps(context);
    const prev3 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    app = await waitForApp(context, prev3);
    expect((await readApp(app)).state).toBe("opening");

    expect(httpRequests.length).toBe(0);
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});

test("オープニング 5シーン手動前後遷移・v4.3日英常時併記・非重複・10秒放置・ボタン外クリック非遷移・第5シーン5秒拡大・禁止表現ゼロ (TC-004, TC-006, TC-008〜010, TC-014, TC-037, TC-038, TC-042, TC-047〜049, TC-055〜057, TC-075)", async () => {
  // Arrange
  const session = await launchExtension(EXT_PATH);
  const { context, extensionId, httpRequests } = session;
  const names = forbiddenNames(SW105_PATH);
  const observedTexts = [];

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const app = await waitForApp(context, prev);

    // TC-004 & TC-047 & TC-075: 第1シーン（タイトル非表示・日英併記・Back 非表示・NEXT 表示・処理バー/言語切替なし・10秒放置およびボタン外クリックで非遷移）
    const s1 = await readApp(app);
    expect(s1.openingStep).toBe("scene1");
    expect(s1.openingScene).toBe(1);
    expect(s1.openingTitleHidden).toBe(true);
    expect(s1.openingTextContent).toBe([
      "このソフトウェアは、 DADA（Document-and-Agent-Driven Agile）プロセスで開発しました。",
      "",
      "This software was developed using the DADA (Document-and-Agent-Driven Agile) process.",
    ].join("\n"));
    expect(s1.openingProgressExists).toBe(false);
    expect(s1.backHidden).toBe(true);
    expect(s1.nextHidden).toBe(false);
    expect(s1.nextText).toBe("NEXT");
    expect(s1.exitVisible).toBe(false);
    expect(s1.exitHidden).toBe(true);
    expect(s1.rects.exit).toBeNull();
    expect(s1.openingBgmTrack).toBe("none");
    expectWithinWindowAndNoScroll(s1);
    expectRectInsideWindow(s1.rects.text, s1.windowWidth, s1.windowHeight);
    expectRectInsideWindow(s1.rects.next, s1.windowWidth, s1.windowHeight);
    expectVerticalNonOverlap(s1.rects.text, s1.rects.next);
    observedTexts.push(s1.openingTextContent);

    await app.waitForTimeout(10000);
    await app.mouse.click(20, 20);
    await app.waitForTimeout(200);
    const s1After = await readApp(app);
    expect(s1After.state).toBe("opening");
    expect(s1After.openingStep).toBe("scene1");

    // NEXT 押下で第2シーンへ遷移
    await app.click("#btn-opening-next");
    await waitForBgmTrack(app, "scene2", 2000);

    // TC-006 & TC-048 & TC-075: 第2シーン（《泉》写真・連想ゲーム1 / Association Game 1・日英6行＋空行・非重複・10秒放置＆ボタン外非遷移）
    const s2 = await readApp(app);
    expect(s2.openingStep).toBe("scene2");
    expect(s2.openingScene).toBe(2);
    expect(s2.openingImageKind).toBe("fountain");
    expect(s2.openingImageHidden).toBe(false);
    expect(s2.openingImageSrc).toBe("assets/images/fountain-stieglitz.jpg");
    expect(s2.openingImageComplete).toBe(true);
    expect(s2.openingTitleHidden).toBe(false);
    expect(s2.openingTitleText).toBe("連想ゲーム1 / Association Game 1");
    expect(s2.openingTitleText.includes("：")).toBe(false);
    expect(s2.openingTextContent).toBe([
      "・ダダと言えば、前衛的な芸術運動のダダイズム",
      '・中心人物の一人であるマルセル・デュシャンの代表作は、写真の大量生産の小便器を倒して "R.Mutt"と署名した「泉」。',
      "・流れる曲はダダにも関わったサティの名曲「ジムノペディ第1番」",
      "",
      '• Speaking of "Dada," it brings to mind Dadaism, the avant-garde art movement.',
      '• One of its key figures, Marcel Duchamp, created his iconic work "Fountain" (pictured) by turning a mass-produced urinal on its side and signing it "R.Mutt".',
      '• The music playing is "Gymnopédie No. 1," a masterpiece by Erik Satie, who was also associated with Dada.',
    ].join("\n"));
    expect(s2.openingProgressExists).toBe(false);
    expect(s2.backHidden).toBe(false);
    expect(s2.backText).toBe("Back");
    expect(s2.nextHidden).toBe(false);
    expect(s2.nextText).toBe("NEXT");
    expect(s2.exitVisible).toBe(false);
    expect(s2.exitHidden).toBe(true);
    expect(s2.rects.exit).toBeNull();
    expectWithinWindowAndNoScroll(s2);
    expectRectInsideWindow(s2.rects.title, s2.windowWidth, s2.windowHeight);
    expectRectInsideWindow(s2.rects.image, s2.windowWidth, s2.windowHeight);
    expectRectInsideWindow(s2.rects.text, s2.windowWidth, s2.windowHeight);
    expectRectInsideWindow(s2.rects.back, s2.windowWidth, s2.windowHeight);
    expectRectInsideWindow(s2.rects.next, s2.windowWidth, s2.windowHeight);
    expectVerticalNonOverlap(s2.rects.title, s2.rects.image);
    expectVerticalNonOverlap(s2.rects.image, s2.rects.text);
    expectVerticalNonOverlap(s2.rects.text, s2.rects.nav);
    expectHorizontalNonOverlap(s2.rects.back, s2.rects.next);
    observedTexts.push(s2.openingTitleText, s2.openingTextContent);

    await app.waitForTimeout(10000);
    await app.mouse.click(20, 20);
    await app.waitForTimeout(200);
    expect((await readApp(app)).openingStep).toBe("scene2");

    // Back -> 第1シーンへ戻る → NEXT -> 第2シーン → NEXT -> 第3シーン
    await app.click("#btn-opening-back");
    expect((await readApp(app)).openingStep).toBe("scene1");
    await app.click("#btn-opening-next");
    expect((await readApp(app)).openingStep).toBe("scene2");
    await app.click("#btn-opening-next");
    await waitForBgmTrack(app, "scene3", 2000);

    // TC-008 & TC-055 & TC-075: 第3シーン（三面SVG・連想ゲーム2 / Association Game 2・改訂日英6行＋空行・非重複）
    const s3 = await readApp(app);
    expect(s3.openingStep).toBe("scene3");
    expect(s3.openingScene).toBe(3);
    expect(s3.openingImageKind).toBe("threeFace");
    expect(s3.openingImageHidden).toBe(false);
    expect(s3.openingImageSrc).toBe("assets/images/three-face-dadaism.svg");
    expect(s3.openingImageComplete).toBe(true);
    expect(s3.openingTitleHidden).toBe(false);
    expect(s3.openingTitleText).toBe("連想ゲーム2 / Association Game 2");
    expect(s3.openingTitleText.includes("：")).toBe(false);
    expect(s3.openingTextContent).toBe([
      "・ダダと言えば、ダダイズムの影響を受けて命名された宇宙怪獣（1967年1月22日放送のTV番組）",
      "・お約束通りにヒーローに倒されたが根強い人気があり、スイス大使館で2016年に開催されたダダイズム100周年パーティーに招待された。",
      "・流れる曲は1970〜80年代レトロフューチャー風の宇宙冒険シンセサイザー音楽",
      "",
      '• Speaking of "Dada," it also brings to mind the space monster named under the influence of Dadaism (a TV show broadcast on January 22, 1967).',
      "• Although defeated by the hero as expected, it remained deeply popular and was invited to the Dadaism 100th Anniversary Party held at the Swiss Embassy in 2016.",
      "• The music playing is 1970s–80s retro-futuristic space-adventure synthesizer music.",
    ].join("\n"));
    expect(s3.openingProgressExists).toBe(false);
    expect(s3.backHidden).toBe(false);
    expect(s3.backText).toBe("Back");
    expect(s3.nextHidden).toBe(false);
    expect(s3.nextText).toBe("NEXT");
    expect(s3.exitVisible).toBe(false);
    expect(s3.exitHidden).toBe(true);
    expect(s3.rects.exit).toBeNull();
    expectWithinWindowAndNoScroll(s3);
    expectRectInsideWindow(s3.rects.title, s3.windowWidth, s3.windowHeight);
    expectRectInsideWindow(s3.rects.image, s3.windowWidth, s3.windowHeight);
    expectRectInsideWindow(s3.rects.text, s3.windowWidth, s3.windowHeight);
    expectRectInsideWindow(s3.rects.back, s3.windowWidth, s3.windowHeight);
    expectRectInsideWindow(s3.rects.next, s3.windowWidth, s3.windowHeight);
    expectVerticalNonOverlap(s3.rects.title, s3.rects.image);
    expectVerticalNonOverlap(s3.rects.image, s3.rects.text);
    expectVerticalNonOverlap(s3.rects.text, s3.rects.nav);
    expectHorizontalNonOverlap(s3.rects.back, s3.rects.next);
    observedTexts.push(s3.openingTitleText, s3.openingTextContent);

    const threeFaceSvg = fs.readFileSync(
      path.resolve("extension/assets/images/three-face-dadaism.svg"),
      "utf8"
    );
    expect(threeFaceSvg.toLowerCase()).not.toContain("<text");
    expect(threeFaceSvg.toLowerCase()).not.toContain("@font-face");
    expect(containsName(threeFaceSvg, names)).toEqual([]);

    await app.waitForTimeout(10000);
    await app.mouse.click(20, 20);
    await app.waitForTimeout(200);
    expect((await readApp(app)).openingStep).toBe("scene3");

    // Back -> 第2シーン → NEXT -> 第3シーン → NEXT -> 第4シーン
    await app.click("#btn-opening-back");
    expect((await readApp(app)).openingStep).toBe("scene2");
    await app.click("#btn-opening-next");
    expect((await readApp(app)).openingStep).toBe("scene3");
    await app.click("#btn-opening-next");

    // TC-056 & TC-057 & TC-075: 第4シーン（連想ゲーム3 / Association Game 3・日英4行＋空行・非重複）
    const s4 = await readApp(app);
    expect(s4.openingStep).toBe("scene4");
    expect(s4.openingScene).toBe(4);
    expect(s4.openingImageHidden).toBe(true);
    expect(s4.openingTitleHidden).toBe(false);
    expect(s4.openingTitleText).toBe("連想ゲーム3 / Association Game 3");
    expect(s4.openingTitleText.includes("：")).toBe(false);
    expect(s4.openingTextContent).toBe([
      "・ダダを倒したのは、胸にランプが光る、あのヒーロー。",
      "・そして、続くカラービームタイマーのプログラムは、DADA（Document-and-Agent-Driven Agile）プロセスで開発された",
      "",
      "• The one who defeated Dada was that hero with a glowing lamp on his chest.",
      "• And the ColorBeaconTimer program that follows was developed using the DADA (Document-and-Agent-Driven Agile) process.",
    ].join("\n"));
    expect(s4.openingBgmTrack).toBe("none");
    expect(s4.openingProgressExists).toBe(false);
    expect(s4.backHidden).toBe(false);
    expect(s4.backText).toBe("Back");
    expect(s4.nextHidden).toBe(false);
    expect(s4.nextText).toBe("NEXT");
    expect(s4.exitVisible).toBe(false);
    expect(s4.exitHidden).toBe(true);
    expect(s4.rects.exit).toBeNull();
    expectWithinWindowAndNoScroll(s4);
    expectRectInsideWindow(s4.rects.title, s4.windowWidth, s4.windowHeight);
    expectRectInsideWindow(s4.rects.text, s4.windowWidth, s4.windowHeight);
    expectRectInsideWindow(s4.rects.back, s4.windowWidth, s4.windowHeight);
    expectRectInsideWindow(s4.rects.next, s4.windowWidth, s4.windowHeight);
    expectVerticalNonOverlap(s4.rects.title, s4.rects.text);
    expectVerticalNonOverlap(s4.rects.text, s4.rects.nav);
    expectHorizontalNonOverlap(s4.rects.back, s4.rects.next);
    observedTexts.push(s4.openingTitleText, s4.openingTextContent);

    await app.waitForTimeout(10000);
    await app.mouse.click(20, 20);
    await app.waitForTimeout(200);
    expect((await readApp(app)).openingStep).toBe("scene4");

    // Back -> 第3シーン → NEXT -> 第4シーン → NEXT -> 第5シーン
    await app.click("#btn-opening-back");
    expect((await readApp(app)).openingStep).toBe("scene3");
    await app.click("#btn-opening-next");
    expect((await readApp(app)).openingStep).toBe("scene4");
    await app.click("#btn-opening-next");

    // TC-049 & TC-010 (第5シーン): 開始時点でタイトル・文章・画像・Back・NEXT がすべて非表示、無音、青色ランプ拡大
    const s5Start = await readApp(app);
    expect(s5Start.openingStep).toBe("scene5");
    expect(s5Start.openingScene).toBe(5);
    expect(s5Start.openingImageKind).toBe("blueLamp");
    expect(s5Start.openingTitleHidden).toBe(true);
    expect(s5Start.openingTextHidden).toBe(true);
    expect(s5Start.openingImageHidden).toBe(true);
    expect(s5Start.openingNavHidden).toBe(true);
    expect(s5Start.backHidden).toBe(true);
    expect(s5Start.nextHidden).toBe(true);
    expect(s5Start.exitVisible).toBe(false);
    expect(s5Start.exitHidden).toBe(true);
    expect(s5Start.rects.exit).toBeNull();
    expect(s5Start.openingBgmTrack).toBe("none");
    expectWithinWindowAndNoScroll(s5Start);
    expect(s5Start.openingLampHidden).toBe(false);

    // 第5シーン拡大中（約 2.5秒時点）の立体青色ランプも専用ウィンドウ内に収まる
    await app.waitForTimeout(2500);
    const s5Mid = await readApp(app);
    expect(s5Mid.openingStep).toBe("scene5");
    expectWithinWindowAndNoScroll(s5Mid);
    expectRectInsideWindow(s5Mid.rects.lamp, s5Mid.windowWidth, s5Mid.windowHeight);

    // TC-009: 第5シーン 5.0秒 (±0.2秒) 拡大完走後に設定画面へ遷移
    const settingObs = await waitForState(app, "setting", 6000);
    const m = settingObs.marks;
    observedTexts.push(settingObs.bodyText);

    const d5 = m["setting-shown"] - m["opening-scene5"];
    expect(d5).toBeGreaterThanOrEqual(4800);
    expect(d5).toBeLessThanOrEqual(5200);

    // TC-010 (設定画面) & TC-014 & TC-075: 設定時刻 2:00、スタート / START、Back/NEXT/言語切替なし、BGM 無音、非重複
    expect(settingObs.displayTime).toBe("2:00");
    expect(settingObs.backHidden).toBe(true);
    expect(settingObs.nextHidden).toBe(true);
    expect(settingObs.openingNavHidden).toBe(true);
    expect(settingObs.openingBgmTrack).toBe("none");
    expect(settingObs.visibleButtons.find((b) => b.id === "btn-start")?.text).toBe("スタート / START");
    expectWithinWindowAndNoScroll(settingObs);
    expectRectInsideWindow(settingObs.rects.beacon, settingObs.windowWidth, settingObs.windowHeight);
    expectRectInsideWindow(settingObs.rects.time, settingObs.windowWidth, settingObs.windowHeight);
    expectRectInsideWindow(settingObs.rects.minus, settingObs.windowWidth, settingObs.windowHeight);
    expectRectInsideWindow(settingObs.rects.start, settingObs.windowWidth, settingObs.windowHeight);
    expectRectInsideWindow(settingObs.rects.plus, settingObs.windowWidth, settingObs.windowHeight);
    expectVerticalNonOverlap(settingObs.rects.beacon, settingObs.rects.time);
    expectVerticalNonOverlap(settingObs.rects.time, settingObs.rects.start);
    expectHorizontalNonOverlap(settingObs.rects.minus, settingObs.rects.start);
    expectHorizontalNonOverlap(settingObs.rects.start, settingObs.rects.plus);

    // TC-037, TC-038, TC-042, TC-075: 全シーン日英表示文言・設定画面・manifest・store-listingで禁止名称・公式/公認なし、通信 0件
    const allDisplayed = observedTexts.join("\n");
    expect(containsName(allDisplayed, names)).toEqual([]);
    expect(allDisplayed.includes("公認")).toBe(false);
    expect(allDisplayed.includes("公式")).toBe(false);
    const manifestObj = JSON.parse(fs.readFileSync(path.resolve("extension/manifest.json"), "utf8"));
    const storeText = fs.readFileSync(path.resolve("extension/store-listing.txt"), "utf8");
    expect(manifestObj.version).toBe("4.5.0");
    expect(manifestObj.description.length).toBe(126);
    expect(manifestObj.description).toContain("DADAプロセスを用いたプログラム開発例");
    expect(validateManifestDescription(manifestObj.description, names).ok).toBe(true);
    expect(containsName(storeText, names)).toEqual([]);
    expect(storeText.includes("公認")).toBe(false);
    expect(storeText.includes("公式")).toBe(false);
    expect(storeText.includes("VOICEVOX:玄野武宏")).toBe(true);
    expect(storeText.includes("EXIT")).toBe(true);
    expect(httpRequests.length).toBe(0);
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});

test("オープニング BGM 再生開始・切替・停止遅延・音量バランス・2周以上シームレスループ・WAV品質・連打重複防止・オフライン SHA-256 照合 (TC-042, TC-059〜062, TC-067, TC-069, TC-073)", async () => {
  // Arrange
  const session = await launchExtension(EXT_PATH, {
    initScript: audioSpyInitScript,
  });
  const { context, extensionId, httpRequests } = session;
  const expectedGymSha = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.resolve("extension/assets/audio/gymnopedie1.ogg")))
    .digest("hex");
  const synthDiskBytes = fs.readFileSync(path.resolve("extension/assets/audio/space-adventure-synth.wav"));
  const expectedSynthSha = crypto
    .createHash("sha256")
    .update(synthDiskBytes)
    .digest("hex");

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const app = await waitForApp(context, prev);

    // TC-059: 第1シーン表示中（事前デコード完了後）に NEXT -> 第2シーン『ジムノペディ第1番』0.5秒以内開始・ループ設定・Back 0.2秒以内停止
    await app.waitForTimeout(2800);
    const t12 = await app.evaluate(() => performance.now());
    await app.click("#btn-opening-next");
    const s2Obs = await waitForBgmTrack(app, "scene2", 2000);
    expect(s2Obs.openingBgmUrl).toContain("assets/audio/gymnopedie1.ogg");
    expect(s2Obs.marks["opening-bgm-started"] - t12).toBeLessThanOrEqual(500);

    const spy2 = await app.evaluate(() => window.__bgmSpy);
    expect(spy2.resumeCount).toBeGreaterThanOrEqual(1);
    expect(spy2.liveCount).toBe(1);
    expect(spy2.maxLiveCount).toBe(1);
    const src2Entry = spy2.sources.at(-1);
    expect(src2Entry.loop).toBe(true);
    expect(src2Entry.startArgs[0]).toBe(0);
    expect(src2Entry.duration).toBeGreaterThan(180);
    expect(src2Entry.connectedViaGain).toBe(true);
    expect(src2Entry.appliedGain).toBe(1.0);
    expect(s2Obs.openingBgmLog.at(-1).gain).toBe(1.0);

    // TC-062 (第2シーン): パッケージ同梱ファイルと SHA-256 一致・外部通信 0件
    const bytes2 = await app.evaluate(async (url) => {
      const r = await fetch(url);
      return Array.from(new Uint8Array(await r.arrayBuffer()));
    }, s2Obs.openingBgmUrl);
    const actualSha2 = crypto.createHash("sha256").update(Buffer.from(bytes2)).digest("hex");
    expect(actualSha2).toBe(expectedGymSha);

    const tBack1 = await app.evaluate(() => performance.now());
    await app.click("#btn-opening-back");
    const s1Back = await waitForBgmTrack(app, "none", 1000);
    expect(s1Back.openingStep).toBe("scene1");
    expect(s1Back.marks["opening-bgm-stopped"] - tBack1).toBeLessThanOrEqual(200);
    expect(await app.evaluate(() => window.__bgmSpy.liveCount)).toBe(0);

    // TC-060: 第1→第2→第3→第4→第3(Back)→第2(Back)→第3→第4→第5→設定スキップ
    await app.click("#btn-opening-next");
    await waitForBgmTrack(app, "scene2", 2000);

    const t23 = await app.evaluate(() => performance.now());
    await app.click("#btn-opening-next");
    const s3Obs = await waitForBgmTrack(app, "scene3", 2000);
    expect(s3Obs.openingBgmUrl).toContain("assets/audio/space-adventure-synth.wav");
    expect(s3Obs.marks["opening-bgm-stopped"] - t23).toBeLessThanOrEqual(200);
    expect(s3Obs.marks["opening-bgm-started"] - t23).toBeLessThanOrEqual(500);
    expect(await app.evaluate(() => window.__bgmSpy.liveCount)).toBe(1);
    expect(await app.evaluate(() => window.__bgmSpy.maxLiveCount)).toBe(1);

    // TC-073: 第2・第3シーンのブラウザ実再生 GainNode ゲイン適用・実効 RMS 差 ±3.0 dB 以内・非クリッピングを検証
    const spy3 = await app.evaluate(() => window.__bgmSpy);
    const src3Entry = spy3.sources.at(-1);
    expect(src3Entry.connectedViaGain).toBe(true);
    expect(src3Entry.appliedGain).toBeCloseTo(0.18, 5);
    expect(s3Obs.openingBgmLog.at(-1).gain).toBeCloseTo(0.18, 5);
    const src2Stats = await app.evaluate(
      (idx) => window.__bgmSpy.getSourceStats(idx),
      src2Entry.index
    );
    const src3Stats = await app.evaluate(
      (idx) => window.__bgmSpy.getSourceStats(idx),
      src3Entry.index
    );
    const loudnessVerdict = evaluateBgmLoudnessBalance(
      src2Stats.rms,
      src2Entry.appliedGain,
      src3Stats.rms,
      src3Entry.appliedGain,
      src2Stats.peak,
      src3Stats.peak
    );
    expect(loudnessVerdict.ok).toBe(true);
    expect(loudnessVerdict.absDiffDb).toBeLessThanOrEqual(3.0);
    expect(loudnessVerdict.clipped).toBe(false);

    // TC-062 & TC-067 (第3シーン): space-adventure-synth.wav SHA-256 一致・PCM WAV 品質検証・外部通信 0件
    const bytes3 = await app.evaluate(async (url) => {
      const r = await fetch(url);
      return Array.from(new Uint8Array(await r.arrayBuffer()));
    }, s3Obs.openingBgmUrl);
    const bytes3Buf = Buffer.from(bytes3);
    const actualSha3 = crypto.createHash("sha256").update(bytes3Buf).digest("hex");
    expect(actualSha3).toBe(expectedSynthSha);
    const wavMetrics = parseWavMetrics(bytes3Buf);
    const wavQuality = validatePcmWavQuality(wavMetrics);
    const loopQuality = validateLoopBoundaryQuality(wavMetrics);
    expect(wavQuality.ok).toBe(true);
    expect(loopQuality.ok).toBe(true);
    expect(wavMetrics.sampleRate).toBeGreaterThanOrEqual(44100);
    expect(wavMetrics.bitsPerSample).toBe(16);
    expect(wavMetrics.channels).toBe(2);
    expect(wavMetrics.maxLrDiff).toBeGreaterThan(0);
    expect(wavMetrics.maxNormAmp).toBeGreaterThanOrEqual(0.30);
    expect(wavMetrics.maxNormAmp).toBeLessThanOrEqual(0.95);
    expect(wavMetrics.joinNormDiff).toBeLessThanOrEqual(0.05);
    expect(wavMetrics.boundarySilenceSec).toBeLessThan(0.05);

    // 第3→第4（0.2秒以内停止・無音）
    const t34 = await app.evaluate(() => performance.now());
    await app.click("#btn-opening-next");
    const s4Obs = await waitForBgmTrack(app, "none", 1000);
    expect(s4Obs.openingStep).toBe("scene4");
    expect(s4Obs.marks["opening-bgm-stopped"] - t34).toBeLessThanOrEqual(200);
    expect(await app.evaluate(() => window.__bgmSpy.liveCount)).toBe(0);

    // 第4→第3 (Back: 0.5秒以内再開)
    const t43 = await app.evaluate(() => performance.now());
    await app.click("#btn-opening-back");
    const s3Back = await waitForBgmTrack(app, "scene3", 2000);
    expect(s3Back.openingStep).toBe("scene3");
    expect(s3Back.marks["opening-bgm-started"] - t43).toBeLessThanOrEqual(500);
    expect(await app.evaluate(() => window.__bgmSpy.liveCount)).toBe(1);

    // 第3→第2 (Back: 0.2秒以内停止・0.5秒以内『ジムノペディ第1番』切替)
    const t32 = await app.evaluate(() => performance.now());
    await app.click("#btn-opening-back");
    const s2Back = await waitForBgmTrack(app, "scene2", 2000);
    expect(s2Back.openingStep).toBe("scene2");
    expect(s2Back.marks["opening-bgm-stopped"] - t32).toBeLessThanOrEqual(200);
    expect(s2Back.marks["opening-bgm-started"] - t32).toBeLessThanOrEqual(500);
    expect(await app.evaluate(() => window.__bgmSpy.liveCount)).toBe(1);

    // 第2→第3→第4→第5→クリックスキップ（無音維持）
    await app.click("#btn-opening-next");
    await waitForBgmTrack(app, "scene3", 2000);

    // TC-061 & TC-069: 第3シーンで 2周以上（>= 2 * buffer.duration = 32.0秒）実再生を通過させ、
    // AnalyserNode 並列観測と AudioContext.currentTime 監視で連続ループ・無音ギャップ < 0.05秒・重複 0件を検証する
    const loopSamples = [];
    const startWall = Date.now();
    while (Date.now() - startWall < 42000) {
      const snap = await app.evaluate(() => window.__bgmSpy.sampleLiveAudio());
      if (snap) {
        loopSamples.push(snap);
        if (snap.elapsedCtxSec >= snap.duration * 2.04) {
          break;
        }
      }
      await app.waitForTimeout(1000);
    }
    const spyAfterLoop = await app.evaluate(() => window.__bgmSpy);
    const finalLive = loopSamples.at(-1);
    expect(finalLive).toBeTruthy();
    expect(finalLive.elapsedCtxSec).toBeGreaterThanOrEqual(finalLive.duration * 2);
    expect(finalLive.loop).toBe(true);
    expect(finalLive.liveCount).toBe(1);
    expect(spyAfterLoop.liveCount).toBe(1);
    expect(spyAfterLoop.maxLiveCount).toBe(1);
    expect(spyAfterLoop.sources.at(-1).loop).toBe(true);
    expect(loopSamples.some((s) => s.elapsedCtxSec < s.duration && s.livePeak > 0.005)).toBe(true);
    expect(loopSamples.some((s) => s.elapsedCtxSec >= s.duration && s.elapsedCtxSec < s.duration * 2 && s.livePeak > 0.005)).toBe(true);
    expect(loopSamples.some((s) => s.elapsedCtxSec >= s.duration * 2 && s.livePeak > 0.005)).toBe(true);

    // 0.1秒間隔で連続 6回押下（scene3 -> scene2 -> scene3 -> scene4 -> scene3 -> scene2 -> scene1）
    const rapidActions = [
      "#btn-opening-back",
      "#btn-opening-next",
      "#btn-opening-next",
      "#btn-opening-back",
      "#btn-opening-back",
      "#btn-opening-back",
    ];
    for (let i = 0; i < rapidActions.length; i += 1) {
      await app.click(rapidActions[i]);
      if (i < rapidActions.length - 1) {
        await app.waitForTimeout(100);
      }
    }
    await app.waitForTimeout(500);

    const afterMash = await readApp(app);
    const spyAfterMash = await app.evaluate(() => window.__bgmSpy);
    expect(afterMash.openingStep).toBe("scene1");
    expect(afterMash.openingBgmTrack).toBe("none");
    expect(spyAfterMash.liveCount).toBe(0);
    expect(spyAfterMash.maxLiveCount).toBe(1);
    expect(afterMash.openingBgmLog.every((item) => item.activeCount <= 1)).toBe(true);

    // 第1→第2→第3→第4→第5→スキップで設定画面無音を確認
    await skipOpeningToSetting(app);
    const settingObs = await readApp(app);
    expect(settingObs.state).toBe("setting");
    expect(settingObs.openingBgmTrack).toBe("none");
    expect(await app.evaluate(() => window.__bgmSpy.liveCount)).toBe(0);
    expect(httpRequests.length).toBe(0);
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});

test("異常系：BGM ファイル欠損・破損デコード失敗・音声出力デバイス利用不可時の無音フォールバック継続 (TC-063)", async () => {
  // 3状態それぞれで検証する
  const modes = [
    { name: "missing", setup: (dest) => {
      copyWithoutBgmAsset(EXT_PATH, dest, "gymnopedie1.ogg");
      fs.rmSync(path.join(dest, "assets", "audio", "space-adventure-synth.wav"));
    } },
    { name: "corrupt", setup: (dest) => {
      copyWithCorruptBgmAsset(EXT_PATH, dest, "gymnopedie1.ogg");
      fs.writeFileSync(path.join(dest, "assets", "audio", "space-adventure-synth.wav"), Buffer.from("CORRUPTED"));
    } },
    { name: "no-device", setup: (dest) => {
      fs.cpSync(EXT_PATH, dest, { recursive: true });
    }, initScript: () => {
      window.AudioContext = function () {
        throw new Error("AudioDeviceUnavailable");
      };
      window.webkitAudioContext = window.AudioContext;
    } },
  ];

  for (const mode of modes) {
    const tmpExt = fs.mkdtempSync(path.join(os.tmpdir(), `cbt-bgm-${mode.name}-`));
    mode.setup(tmpExt);
    const session = await launchExtension(tmpExt, {
      initScript: mode.initScript,
    });
    const { context, extensionId, pageErrors } = session;

    try {
      const prev = new Set(appPages(context));
      await triggerAction(context, extensionId);
      const app = await waitForApp(context, prev);

      // 第1 -> 第2 -> 第3 -> Back(第2) -> NEXT(第3) -> NEXT(第4) -> NEXT(第5) -> スキップ
      await app.click("#btn-opening-next");
      await app.waitForTimeout(250);
      expect((await readApp(app)).openingStep).toBe("scene2");
      expect((await readApp(app)).openingBgmTrack).toBe("none");

      await app.click("#btn-opening-next");
      await app.waitForTimeout(250);
      expect((await readApp(app)).openingStep).toBe("scene3");
      expect((await readApp(app)).openingBgmTrack).toBe("none");

      await app.click("#btn-opening-back");
      await app.waitForTimeout(150);
      expect((await readApp(app)).openingStep).toBe("scene2");

      await app.click("#btn-opening-next");
      await app.click("#btn-opening-next");
      expect((await readApp(app)).openingStep).toBe("scene4");

      await app.click("#btn-opening-next");
      expect((await readApp(app)).openingStep).toBe("scene5");
      await app.click("#opening-stage");
      const settingObs = await waitForState(app, "setting", 2000);
      expect(settingObs.displayTime).toBe("2:00");

      await app.click("#btn-plus");
      expect((await readApp(app)).displayTime).toBe("2:10");
      await app.click("#btn-start");
      const cdObs = await waitForState(app, "countdown", 1000);
      expect(cdObs.state).toBe("countdown");
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
      fs.rmSync(session.userDataDir, { recursive: true, force: true });
      fs.rmSync(tmpExt, { recursive: true, force: true });
    }
  }
});

test("1:00 カウントダウン完走・赤点滅・音声同一性・終了演出・第5シーン以降前後ボタン及びBGM非再生 (TC-010, TC-021, TC-026, TC-027, TC-029〜032, TC-034, TC-042, TC-043, TC-046)", async () => {
  // Arrange
  const session = await launchExtension(EXT_PATH);
  const { context, extensionId, httpRequests } = session;

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    let app = await waitForApp(context, prev);
    await skipOpeningToSetting(app);

    // TC-031: 青点灯中に閉じて再開するとオープニングからになる
    await app.click("#btn-start");
    await waitForState(app, "countdown", 1000);
    expect((await readApp(app)).beaconColor).toBe("blue");
    await closeApps(context);

    const prev2 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    app = await waitForApp(context, prev2);
    expect((await readApp(app)).state).toBe("opening");
    await skipOpeningToSetting(app);

    // 1:00 (60000ms) に設定してスタート (TC-029)
    await setSettingMs(app, 60000);
    await app.click("#btn-start");
    const startObs = await waitForState(app, "countdown", 1000);
    expect(startObs.beaconColor).toBe("red");
    // TC-010 & TC-021 & TC-075 (カウントダウン): Back/NEXT/EXIT ボタン非表示・BGM 無音・要素非重複/収まり
    expect(startObs.backHidden).toBe(true);
    expect(startObs.nextHidden).toBe(true);
    expect(startObs.exitVisible).toBe(false);
    expect(startObs.exitHidden).toBe(true);
    expect(startObs.rects.exit).toBeNull();
    expect(startObs.openingBgmTrack).toBe("none");
    expectWithinWindowAndNoScroll(startObs);
    expectRectInsideWindow(startObs.rects.beacon, startObs.windowWidth, startObs.windowHeight);
    expectRectInsideWindow(startObs.rects.time, startObs.windowWidth, startObs.windowHeight);
    expectVerticalNonOverlap(startObs.rects.beacon, startObs.rects.time);

    // Act: 残時間 0 の endingAudio（ピコン・ジュワッチ再生中は EXIT 非表示）を経て endingDots まで待機 (~62秒)
    const audioObs = await waitForState(app, "endingAudio", 65000);
    expect(audioObs.exitVisible).toBe(false);
    expect(audioObs.exitHidden).toBe(true);
    expect(audioObs.rects.exit).toBeNull();
    expect(audioObs.beaconLit).toBe(false);
    expect(audioObs.displayTime).toBe("0:00");

    const dotsObs = await waitForState(app, "endingDots", 10000);

    // Assert: TC-021 / TC-030 表示切り替わり間隔 1.0秒 ±0.2秒
    const tc = dotsObs.marks["time-changes"];
    expect(tc.length).toBeGreaterThanOrEqual(60);
    for (let i = 1; i < tc.length; i += 1) {
      const diff = tc[i] - tc[i - 1];
      expect(diff).toBeGreaterThanOrEqual(800);
      expect(diff).toBeLessThanOrEqual(1200);
    }

    // TC-029: 最初の周期は 1.0秒点灯・1.0秒消灯 (±0.05秒)
    const firstCycle = dotsObs.blinkLog[0];
    expect(firstCycle.plannedPhaseMs).toBe(1000);
    expect(firstCycle.litMs).toBeGreaterThanOrEqual(950);
    expect(firstCycle.litMs).toBeLessThanOrEqual(1050);
    expect(firstCycle.unlitMs).toBeGreaterThanOrEqual(950);
    expect(firstCycle.unlitMs).toBeLessThanOrEqual(1050);

    // TC-026: 35000ms 付近の周期の線形計算値と実測
    const midCycle = dotsObs.blinkLog.find(
      (c) => !c.truncated && c.startRemainingMs <= 36000 && c.startRemainingMs >= 34000
    );
    expect(midCycle).toBeTruthy();
    expect(Math.abs(midCycle.litMs - midCycle.plannedPhaseMs)).toBeLessThanOrEqual(50);
    expect(Math.abs(midCycle.unlitMs - midCycle.plannedPhaseMs)).toBeLessThanOrEqual(50);

    // TC-027: 10000ms 以下の非打ち切り周期は 100ms (±50ms)
    const fastCycles = dotsObs.blinkLog.filter(
      (c) => !c.truncated && c.startRemainingMs <= 10000
    );
    expect(fastCycles.length).toBeGreaterThan(0);
    for (const c of fastCycles) {
      expect(c.plannedPhaseMs).toBe(100);
      expect(c.litMs).toBeGreaterThanOrEqual(50);
      expect(c.litMs).toBeLessThanOrEqual(150);
      expect(c.unlitMs).toBeGreaterThanOrEqual(50);
      expect(c.unlitMs).toBeLessThanOrEqual(150);
    }

    // TC-032 & TC-034 & TC-071: 残時間 0 で endingAudio を経て juwacchi.wav バイト列・プロソディが一致し、通信 0件
    expect(dotsObs.marks["ending-audio-started"]).toBeGreaterThan(0);
    expect(dotsObs.marks["ending-dots-started"] - dotsObs.marks["ending-audio-started"]).toBeGreaterThanOrEqual(800);
    expect(dotsObs.marks["ending-dots-started"] - dotsObs.marks["ending-audio-started"]).toBeLessThanOrEqual(1200);
    expect(dotsObs.juwacchiUrl).toContain("assets/audio/juwacchi.wav");
    const fetchedBytes = await app.evaluate(async (url) => {
      const res = await fetch(url);
      return Array.from(new Uint8Array(await res.arrayBuffer()));
    }, dotsObs.juwacchiUrl);
    const diskBytes = Array.from(
      fs.readFileSync(path.resolve("extension/assets/audio/juwacchi.wav"))
    );
    expect(fetchedBytes).toEqual(diskBytes);
    const juwacchiProsody = validateJuwacchiProsody(Buffer.from(fetchedBytes));
    expect(juwacchiProsody.ok).toBe(true);
    expect(httpRequests.length).toBe(0);

    // TC-043 & TC-010 & TC-075 & TC-076 (終了演出): 既存 UI 消去・ドット演出有効・Back/NEXT ボタン非表示・EXITボタン表示・BGM 無音・スクロールバーなし
    expect(dotsObs.timerUiHidden).toBe(true);
    expect(dotsObs.dotsCanvasHidden).toBe(false);
    expect(dotsObs.dotsActive).toBe(true);
    expect(dotsObs.backHidden).toBe(true);
    expect(dotsObs.nextHidden).toBe(true);
    expect(dotsObs.openingBgmTrack).toBe("none");
    expect(dotsObs.exitVisible).toBe(true);
    expect(dotsObs.exitHidden).toBe(false);
    expect(dotsObs.exitText).toBe("EXIT");
    expect(dotsObs.visibleButtons.map((b) => b.id)).toEqual(["btn-exit"]);
    expectWithinWindowAndNoScroll(dotsObs);
    expectRectInsideWindow(dotsObs.rects.exit, dotsObs.windowWidth, dotsObs.windowHeight);

    // TC-046: 終了演出中に閉じて再開するとオープニングから開始する
    await closeApps(context);
    const prev3 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const reopened = await waitForApp(context, prev3);
    expect((await readApp(reopened)).state).toBe("opening");
    expect((await readApp(reopened)).openingStep).toBe("scene1");
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});

test("ジュワッチ音声欠損時の異常系遷移 (TC-036, TC-043)", async () => {
  // Arrange
  const tmpExt = fs.mkdtempSync(path.join(os.tmpdir(), "cbt-no-wav-"));
  copyWithoutJuwacchi(EXT_PATH, tmpExt);
  const session = await launchExtension(tmpExt);
  const { context, extensionId } = session;

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const app = await waitForApp(context, prev);
    await skipOpeningToSetting(app);
    await setSettingMs(app, 60000);
    await app.click("#btn-start");

    // Act: 音声ファイル欠損のまま残時間 0 に到達し、endingDots へ遷移する
    const dotsObs = await waitForState(app, "endingDots", 70000);

    // Assert
    expect(dotsObs.state).toBe("endingDots");
    expect(dotsObs.timerUiHidden).toBe(true);
    expect(dotsObs.dotsActive).toBe(true);
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
    fs.rmSync(tmpExt, { recursive: true, force: true });
  }
});

test("設定ボタン 2秒長押し早送りと上限・下限固定・ポインタ外移動停止 (TC-051〜053)", async () => {
  // Arrange
  const session = await launchExtension(EXT_PATH);
  const { context, extensionId } = session;

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const app = await waitForApp(context, prev);
    await skipOpeningToSetting(app);

    const plusBox = await app.locator("#btn-plus").boundingBox();
    const minusBox = await app.locator("#btn-minus").boundingBox();
    expect(plusBox).not.toBeNull();
    expect(minusBox).not.toBeNull();

    // TC-051: 1:00 から ＋ボタンを 3.0秒連続押下して離す
    await setSettingMs(app, 60000);
    await app.mouse.move(plusBox.x + plusBox.width / 2, plusBox.y + plusBox.height / 2);
    await app.mouse.down();
    await app.waitForTimeout(1800);
    expect((await readApp(app)).displayTime).toBe("1:00");
    await app.waitForTimeout(1250);
    const after3sObs = await readApp(app);
    expect(after3sObs.settingMs).toBeGreaterThanOrEqual(100000);
    expect(after3sObs.settingMs).toBeLessThanOrEqual(120000);
    await app.mouse.up();
    await app.waitForTimeout(400);
    expect((await readApp(app)).settingMs).toBe(after3sObs.settingMs);

    // TC-052: 3:00 から −ボタンを 5.0秒連続押下し、下限 1:00 固定を確認
    await setSettingMs(app, 180000);
    await app.mouse.move(minusBox.x + minusBox.width / 2, minusBox.y + minusBox.height / 2);
    await app.mouse.down();
    await app.waitForTimeout(1800);
    expect((await readApp(app)).displayTime).toBe("3:00");
    await app.waitForTimeout(3200);
    expect((await readApp(app)).displayTime).toBe("1:00");
    expect((await readApp(app)).settingMs).toBe(60000);
    await app.mouse.up();

    // TC-053: 上限 3:00 の＋長押し、下限 1:00 の−長押し、長押し中のポインタ外移動停止
    await setSettingMs(app, 180000);
    await app.mouse.move(plusBox.x + plusBox.width / 2, plusBox.y + plusBox.height / 2);
    await app.mouse.down();
    await app.waitForTimeout(2500);
    expect((await readApp(app)).displayTime).toBe("3:00");
    await app.mouse.up();

    await setSettingMs(app, 60000);
    await app.mouse.move(minusBox.x + minusBox.width / 2, minusBox.y + minusBox.height / 2);
    await app.mouse.down();
    await app.waitForTimeout(2500);
    expect((await readApp(app)).displayTime).toBe("1:00");
    await app.mouse.up();

    await setSettingMs(app, 60000);
    await app.mouse.move(plusBox.x + plusBox.width / 2, plusBox.y + plusBox.height / 2);
    await app.mouse.down();
    await app.waitForTimeout(2500);
    await app.mouse.move(10, 10);
    const leftObs = await readApp(app);
    await app.waitForTimeout(800);
    expect((await readApp(app)).settingMs).toBe(leftObs.settingMs);
    await app.mouse.up();
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});

test("v4.5 第3シーンシンセBGM/単一成人男性話者ジュワッチ音声プロソディ実測・境界検証・マニフェスト及び配布文書構造整合 (TC-037, TC-071, TC-072, TC-075, TC-077)", async () => {
  // Arrange
  const manifest = JSON.parse(fs.readFileSync(path.resolve("extension/manifest.json"), "utf8"));
  expect(manifest.version).toBe("4.5.0");
  expect(validateManifestDescription(manifest.description).ok).toBe(true);
  expect(manifest.description.length).toBe(126);
  const diskWav = fs.readFileSync(path.resolve("extension/assets/audio/juwacchi.wav"));
  const expectedSha = crypto.createHash("sha256").update(diskWav).digest("hex");
  const eduTerms = forbiddenEduTerms(SW105_PATH);
  const readmeText = fs.readFileSync(path.resolve("README.md"), "utf8");
  const licenseText = fs.readFileSync(path.resolve("LICENSE"), "utf8");
  const sourcesText = fs.readFileSync(path.resolve("extension/assets/SOURCES.md"), "utf8");
  const storeText = fs.readFileSync(path.resolve("extension/store-listing.txt"), "utf8");

  const session = await launchExtension(EXT_PATH);
  const { context, extensionId, httpRequests } = session;

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const app = await waitForApp(context, prev);
    await app.waitForFunction(() => {
      const el = document.querySelector("#app");
      return el && Boolean(el.dataset.juwacchiUrl);
    }, null, { timeout: 5000 });
    const obs = await readApp(app);

    // Act: 拡張機能コンテキスト内から juwacchi.wav を取得して TC-071 解析
    const fetchedBytes = await app.evaluate(async (url) => {
      const r = await fetch(url);
      return Array.from(new Uint8Array(await r.arrayBuffer()));
    }, obs.juwacchiUrl);
    const fetchedBuf = Buffer.from(fetchedBytes);
    const actualSha = crypto.createHash("sha256").update(fetchedBuf).digest("hex");
    const prosody = analyzeJuwacchiProsody(fetchedBuf);
    const verdict = validateJuwacchiProsody(fetchedBuf);

    // Assert (TC-071)
    expect(actualSha).toBe(expectedSha);
    expect(verdict.ok).toBe(true);
    expect(prosody.sampleRate).toBeGreaterThanOrEqual(24000);
    expect(prosody.bitsPerSample).toBe(16);
    expect(prosody.channels).toBe(1);
    expect(prosody.durationSec).toBeGreaterThanOrEqual(0.8);
    expect(prosody.durationSec).toBeLessThanOrEqual(1.2);
    expect(prosody.overallPeak).toBeGreaterThanOrEqual(0.85);
    expect(prosody.overallPeak).toBeLessThanOrEqual(0.99);
    expect(prosody.overallRms).toBeGreaterThanOrEqual(0.18);
    expect(prosody.overallRmsDbfs).toBeGreaterThanOrEqual(-14.9);
    expect(prosody.clipped).toBe(false);
    expect(prosody.voicedF0MedianHz).toBeGreaterThanOrEqual(110);
    expect(prosody.voicedF0MedianHz).toBeLessThanOrEqual(180);
    expect(prosody.firstHalfVoicedF0Count).toBeGreaterThan(0);
    expect(prosody.firstHalfVoicedF0MedianHz).toBeGreaterThanOrEqual(85);
    expect(prosody.firstHalfVoicedF0MedianHz).toBeLessThanOrEqual(200);
    expect(prosody.secondHalfVoicedF0Count).toBeGreaterThan(0);
    expect(prosody.secondHalfVoicedF0MedianHz).toBeGreaterThanOrEqual(85);
    expect(prosody.secondHalfVoicedF0MedianHz).toBeLessThanOrEqual(200);
    expect(prosody.hasFemaleVoiceRange).toBe(false);
    expect(prosody.secondHalfPeakRatio).toBeGreaterThanOrEqual(0.25);
    expect(prosody.secondHalfPeakRatio).toBeLessThanOrEqual(0.85);
    expect(prosody.secondHalfHighBandRms).toBeLessThanOrEqual(prosody.firstHalfFullBandRms);
    expect(httpRequests.length).toBe(0);

    // Assert (TC-072 & TC-075): 境界値合格・不合格判定
    const baseMetrics = {
      validRiffWave: true,
      isPcm: true,
      channels: 1,
      bitsPerSample: 16,
      sampleRate: 24000,
      durationSec: 1.0,
      overallPeak: 0.94,
      overallRms: 0.19,
      overallRmsDbfs: -14.42,
      clipped: false,
      voicedF0Count: 50,
      voicedF0MedianHz: 132,
      firstHalfVoicedF0Count: 35,
      firstHalfVoicedF0MedianHz: 142,
      secondHalfVoicedF0Count: 15,
      secondHalfVoicedF0MedianHz: 110,
      hasFemaleVoiceRange: false,
      secondHalfPeakRatio: 0.70,
      firstHalfFullBandRms: 0.23,
      secondHalfHighBandRms: 0.04,
      secondHalfHighBandToFirstRmsRatio: 0.17,
    };
    expect(validateJuwacchiProsody({ ...baseMetrics, durationSec: 0.8 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, durationSec: 1.2 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, overallPeak: 0.85 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, overallPeak: 0.99 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, overallRms: 0.18 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, voicedF0MedianHz: 110 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, voicedF0MedianHz: 180 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, firstHalfVoicedF0MedianHz: 85 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, firstHalfVoicedF0MedianHz: 200 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfVoicedF0MedianHz: 85 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfVoicedF0MedianHz: 200 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfPeakRatio: 0.25 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfPeakRatio: 0.85 }).ok).toBe(true);
    expect(validateJuwacchiProsody({ ...baseMetrics, durationSec: 0.79 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, durationSec: 1.21 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, overallPeak: 0.84 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, overallPeak: 1.0 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, overallRms: 0.17 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, voicedF0MedianHz: 109 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, voicedF0MedianHz: 181 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, voicedF0MedianHz: 220, hasFemaleVoiceRange: true }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, firstHalfVoicedF0MedianHz: 84 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, firstHalfVoicedF0MedianHz: 201 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfVoicedF0MedianHz: 84 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfVoicedF0MedianHz: 201 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfPeakRatio: 0.24 }).ok).toBe(false);
    expect(validateJuwacchiProsody({ ...baseMetrics, secondHalfPeakRatio: 0.86 }).ok).toBe(false);
    expect(
      validateJuwacchiProsody({
        ...baseMetrics,
        secondHalfHighBandRms: 0.1515,
        firstHalfFullBandRms: 0.15,
        secondHalfHighBandToFirstRmsRatio: 1.01,
      }).ok
    ).toBe(false);

    expect(validatePopupViewportWidth(640).ok).toBe(true);
    expect(validatePopupViewportWidth(639).ok).toBe(false);
    const exact132 = "タイマー Countdown timer " + "a".repeat(132 - "タイマー Countdown timer ".length);
    expect(validateManifestDescription(exact132).ok).toBe(true);
    expect(validateManifestDescription(exact132 + "b").ok).toBe(false);

    // Assert (TC-077): README.md 構造・配布文書・禁止5語句検査
    const hashes = {
      fountain: crypto.createHash("sha256").update(fs.readFileSync(path.resolve("extension/assets/images/fountain-stieglitz.jpg"))).digest("hex"),
      gymnopedie1: crypto.createHash("sha256").update(fs.readFileSync(path.resolve("extension/assets/audio/gymnopedie1.ogg"))).digest("hex"),
      spaceAdventureSynth: crypto.createHash("sha256").update(fs.readFileSync(path.resolve("extension/assets/audio/space-adventure-synth.wav"))).digest("hex"),
      juwacchi: expectedSha,
    };
    expect(checkAttributionDocs(readmeText, licenseText, sourcesText, hashes, storeText).ok).toBe(true);
    expect(checkReadmeV44Structure(readmeText, eduTerms).ok).toBe(true);
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});

test("終了演出画面 EXIT ボタン排他的表示・押下による専用ウィンドウ閉鎖終了・第1シーン再起動 (TC-076)", async () => {
  // Arrange: 音声ファイル欠損複製（直ちに endingDots へ進む経路も用いず、実 juwacchi.wav ありで全状態を観測する）
  const session = await launchExtension(EXT_PATH);
  const { context, extensionId, pageErrors } = session;

  try {
    const prev = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const app = await waitForApp(context, prev);

    // 第1〜第4シーンでは EXIT 非表示
    for (const step of ["scene1", "scene2", "scene3", "scene4"]) {
      const obs = await readApp(app);
      expect(obs.openingStep).toBe(step);
      expect(obs.exitVisible).toBe(false);
      expect(obs.exitHidden).toBe(true);
      expect(obs.rects.exit).toBeNull();
      await app.click("#btn-opening-next");
    }

    // 第5シーンでは EXIT 非表示 -> 画面クリックで設定画面へ
    await app.waitForFunction(() => document.querySelector("#app")?.dataset.openingStep === "scene5", null, { timeout: 3000 });
    const s5Obs = await readApp(app);
    expect(s5Obs.exitVisible).toBe(false);
    expect(s5Obs.exitHidden).toBe(true);
    expect(s5Obs.rects.exit).toBeNull();
    await app.click("#opening-stage");

    // 設定画面（時刻操作中含む）では EXIT 非表示
    const setObs = await waitForState(app, "setting", 2000);
    expect(setObs.exitVisible).toBe(false);
    expect(setObs.exitHidden).toBe(true);
    expect(setObs.rects.exit).toBeNull();
    await setSettingMs(app, 60000); // 1:00
    const setAfterAdj = await readApp(app);
    expect(setAfterAdj.exitVisible).toBe(false);
    expect(setAfterAdj.exitHidden).toBe(true);

    // カウントダウン中・endingAudio 中では EXIT 非表示
    await app.click("#btn-start");
    const cdObs = await waitForState(app, "countdown", 1000);
    expect(cdObs.exitVisible).toBe(false);
    expect(cdObs.exitHidden).toBe(true);
    expect(cdObs.rects.exit).toBeNull();

    const audioObs = await waitForState(app, "endingAudio", 65000);
    expect(audioObs.exitVisible).toBe(false);
    expect(audioObs.exitHidden).toBe(true);
    expect(audioObs.rects.exit).toBeNull();

    // endingDots 到達時のみ EXIT が可視表示・操作可能・見切れ/スクロールなし
    const dotsObs = await waitForState(app, "endingDots", 10000);
    expect(dotsObs.exitVisible).toBe(true);
    expect(dotsObs.exitHidden).toBe(false);
    expect(dotsObs.exitText).toBe("EXIT");
    expect(dotsObs.visibleButtons.map((b) => b.id)).toEqual(["btn-exit"]);
    expectWithinWindowAndNoScroll(dotsObs);
    expectRectInsideWindow(dotsObs.rects.exit, dotsObs.windowWidth, dotsObs.windowHeight);

    // Act: EXIT ボタン押下（連続押下模擬含む）で専用ウィンドウが閉じてエラー 0件
    const closePromise = app.waitForEvent("close", { timeout: 5000 });
    await Promise.allSettled([
      app.click("#btn-exit"),
      app.click("#btn-exit"),
    ]);
    await closePromise;
    await app.waitForTimeout(200).catch(() => {});
    expect(appPages(context).length).toBe(0);
    expect(pageErrors).toEqual([]);

    // Act & Assert: 拡張機能アイコン再クリックでオープニング第1シーンから新規開始
    const prev2 = new Set(appPages(context));
    await triggerAction(context, extensionId);
    const reopened = await waitForApp(context, prev2);
    const reopenedObs = await readApp(reopened);
    expect(appPages(context).length).toBe(1);
    expect(reopenedObs.state).toBe("opening");
    expect(reopenedObs.openingStep).toBe("scene1");
    expect(reopenedObs.exitVisible).toBe(false);
    expect(reopenedObs.exitHidden).toBe(true);
  } finally {
    await context.close();
    fs.rmSync(session.userDataDir, { recursive: true, force: true });
  }
});
