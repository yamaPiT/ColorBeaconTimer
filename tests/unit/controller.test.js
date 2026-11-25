/**
 * ファイル名： controller.test.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： UNIT-011（フレーム制御・BGM同期切替とgain記録・WINDOW_W=700・EXITボタン終了制御）の単体テストを実行する。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007, TC-076
 */

import assert from "node:assert/strict";
import test from "node:test";
import { createController } from "../../extension/src/app/controller.js";
import { WINDOW_H, WINDOW_W } from "../../extension/src/domain/constants.js";

/**
 * 関数名： setupHarness
 * 戻り値： clock, audioCalls, getLastVm, controller, skipToSetting 等。
 * 引数： options（juwacchiOk, bgmOk, bgmAsync 等）。
 * 関数の概要： UNIT-011 検証用のモック環境を生成する。
 * 対応機能ID（トレーサビリティ）： UNIT-011
 */
function setupHarness({ juwacchiOk = true, bgmOk = true, bgmAsync = false, windowPort = undefined, windowPortThrow = false } = {}) {
  let now = 0;
  let lastVm = null;
  let juwacchiEndedCb = null;
  let activeBgmTrack = "none";
  let activeBgmCount = 0;
  let bgmSeq = 0;
  let closeCalls = 0;
  const pendingBgm = [];
  const audioCalls = [];

  const clock = { nowMs: () => now };
  const audioPort = {
    resume() {
      audioCalls.push("resume");
      return Promise.resolve();
    },
    playPicon() {
      audioCalls.push("picon");
      return { ok: true };
    },
    async loadJuwacchi() {
      return juwacchiOk
        ? { ok: true, url: "assets/audio/juwacchi.wav" }
        : { ok: false, error: "JuwacchiUnavailable" };
    },
    playJuwacchi(onEnded) {
      audioCalls.push("juwacchi");
      if (!juwacchiOk) {
        return { ok: false, error: "JuwacchiUnavailable" };
      }
      juwacchiEndedCb = onEnded;
      return { ok: true };
    },
    playOpeningBgm(trackKey) {
      bgmSeq += 1;
      const mySeq = bgmSeq;
      audioCalls.push(["playBgm", trackKey]);
      activeBgmTrack = "none";
      activeBgmCount = 0;

      const finish = () => {
        if (mySeq !== bgmSeq) {
          return { ok: false, cancelled: true };
        }
        if (!bgmOk) {
          activeBgmTrack = "none";
          activeBgmCount = 0;
          return { ok: false, error: "BgmUnavailable" };
        }
        activeBgmTrack = trackKey;
        activeBgmCount = 1;
        return {
          ok: true,
          trackKey,
          gain: trackKey === "scene2" ? 1.0 : 0.18,
          url: trackKey === "scene2"
            ? "assets/audio/gymnopedie1.ogg"
            : "assets/audio/space-adventure-synth.wav",
        };
      };

      if (bgmAsync) {
        return new Promise((resolve) => {
          pendingBgm.push(() => resolve(finish()));
        });
      }
      return Promise.resolve(finish());
    },
    stopOpeningBgm() {
      bgmSeq += 1;
      audioCalls.push("stopBgm");
      activeBgmTrack = "none";
      activeBgmCount = 0;
    },
    getOpeningBgmTrack: () => activeBgmTrack,
    getOpeningBgmCount: () => activeBgmCount,
  };
  const view = {
    render(vm) {
      lastVm = vm;
      return "ok";
    },
  };
  const resolvedWindowPort =
    windowPort !== undefined
      ? windowPort
      : {
          close() {
            closeCalls += 1;
            if (windowPortThrow) {
              throw new Error("CloseFailed");
            }
          },
        };
  const controller = createController(clock, audioPort, view, () => 0.5, resolvedWindowPort);
  return {
    advanceTo(ms) { now = ms; controller.tick(); },
    setNow(ms) { now = ms; },
    triggerJuwacchiEnd() { if (juwacchiEndedCb) juwacchiEndedCb(); },
    flushBgm: async () => {
      while (pendingBgm.length > 0) {
        const fn = pendingBgm.shift();
        fn();
      }
      await new Promise((r) => setImmediate(r));
    },
    skipToSetting() {
      controller.onOpeningNext();
      controller.onOpeningNext();
      controller.onOpeningNext();
      controller.onOpeningNext();
      controller.onClickScreen();
    },
    audioCalls,
    getCloseCalls: () => closeCalls,
    getActiveBgmTrack: () => activeBgmTrack,
    getActiveBgmCount: () => activeBgmCount,
    getLastVm: () => lastVm,
    controller,
  };
}

test("UNIT-011 createController", async (t) => {
  await t.test("オープニング第1〜第4シーンは時間経過および画面クリックで遷移せず、NEXT/Back で手動前後遷移と BGM 切替を行う", async () => {
    // Arrange
    const h = setupHarness();
    h.advanceTo(0);

    // Act & Assert: 第1シーン (Back 非表示, NEXT 表示, 無音, 10秒放置・クリックで非遷移)
    assert.equal(h.getLastVm().state, "opening");
    assert.equal(h.getLastVm().openingStep, "scene1");
    assert.equal(h.getLastVm().openingBackVisible, false);
    assert.equal(h.getLastVm().openingNextVisible, true);
    assert.equal(h.getLastVm().openingBgmTrack, "none");
    assert.equal(h.getLastVm().marks["opening-start"], 0);

    h.advanceTo(10000);
    h.controller.onClickScreen();
    assert.equal(h.getLastVm().state, "opening");
    assert.equal(h.getLastVm().openingStep, "scene1");

    // Act & Assert: NEXT -> 同期 resume() + 第2シーン BGM 再生開始
    h.controller.onOpeningNext();
    assert.ok(h.audioCalls.includes("resume"));
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene2");
    assert.equal(h.getLastVm().openingImageKind, "fountain");
    assert.equal(h.getLastVm().openingBackVisible, true);
    assert.equal(h.getLastVm().openingNextVisible, true);
    assert.equal(h.getLastVm().openingBgmTrack, "scene2");
    assert.equal(h.getLastVm().openingBgmUrl, "assets/audio/gymnopedie1.ogg");
    assert.equal(h.getActiveBgmCount(), 1);
    assert.equal(h.getLastVm().marks["opening-scene2"], 10000);

    h.advanceTo(20000);
    h.controller.onClickScreen();
    assert.equal(h.getLastVm().openingStep, "scene2");

    // Act & Assert: Back -> 第1シーン（BGM 停止） -> NEXT -> 第2シーン（BGM 再開）
    h.controller.onOpeningBack();
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene1");
    assert.equal(h.getLastVm().openingBgmTrack, "none");
    assert.equal(h.getActiveBgmCount(), 0);
    assert.ok(h.getLastVm().marks["opening-bgm-stopped"] >= 20000);

    h.controller.onOpeningNext();
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene2");
    assert.equal(h.getLastVm().openingBgmTrack, "scene2");
    assert.equal(h.getActiveBgmCount(), 1);

    // Act & Assert: 第3シーン（space-adventure-synth）<-> 第2シーン、第4シーン（無音）<-> 第3シーン
    h.controller.onOpeningNext();
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene3");
    assert.equal(h.getLastVm().openingImageKind, "threeFace");
    assert.equal(h.getLastVm().openingBgmTrack, "scene3");
    assert.equal(h.getLastVm().openingBgmUrl, "assets/audio/space-adventure-synth.wav");
    assert.equal(h.getActiveBgmCount(), 1);

    h.advanceTo(30000);
    h.controller.onClickScreen();
    assert.equal(h.getLastVm().openingStep, "scene3");

    h.controller.onOpeningBack();
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene2");
    assert.equal(h.getLastVm().openingBgmTrack, "scene2");

    h.controller.onOpeningNext();
    await h.flushBgm();
    h.controller.onOpeningNext();
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene4");
    assert.equal(h.getLastVm().openingImageKind, "none");
    assert.equal(h.getLastVm().openingBgmTrack, "none");
    assert.equal(h.getActiveBgmCount(), 0);

    h.advanceTo(40000);
    h.controller.onClickScreen();
    assert.equal(h.getLastVm().openingStep, "scene4");

    h.controller.onOpeningBack();
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene3");
    assert.equal(h.getLastVm().openingBgmTrack, "scene3");

    // Assert: openingBgmLog の play / stop すべてに gain が記録されている
    assert.equal(WINDOW_W, 700);
    assert.equal(WINDOW_H, 720);
    const bgmLog = h.getLastVm().openingBgmLog;
    const play2Log = bgmLog.find((e) => e.action === "play" && e.trackKey === "scene2");
    const play3Log = bgmLog.find((e) => e.action === "play" && e.trackKey === "scene3");
    const stopLog = bgmLog.find((e) => e.action === "stop");
    assert.equal(play2Log.gain, 1.0);
    assert.equal(play3Log.gain, 0.18);
    assert.equal(stopLog.gain, 0);
  });

  await t.test("高速連続押下時も古い非同期 BGM 読込を破棄し、最終シーンが無音なら無音を保つ", async () => {
    // Arrange
    const h = setupHarness({ bgmAsync: true });
    h.advanceTo(0);

    // Act: 解決前に scene1 -> scene2 -> scene3 -> scene4 へ連打
    h.controller.onOpeningNext(); // scene2
    h.controller.onOpeningNext(); // scene3
    h.controller.onOpeningNext(); // scene4
    await h.flushBgm();

    // Assert
    assert.equal(h.getLastVm().openingStep, "scene4");
    assert.equal(h.getLastVm().openingBgmTrack, "none");
    assert.equal(h.getActiveBgmTrack(), "none");
    assert.equal(h.getActiveBgmCount(), 0);
  });

  await t.test("BgmUnavailable 発生時は例外を送出せず無音フォールバックで遷移・設定・カウントダウンを継続する", async () => {
    // Arrange
    const h = setupHarness({ bgmOk: false });
    h.advanceTo(0);

    // Act
    h.controller.onOpeningNext(); // scene2 (BgmUnavailable)
    await h.flushBgm();
    assert.equal(h.getLastVm().openingStep, "scene2");
    assert.equal(h.getLastVm().openingBgmTrack, "none");
    assert.ok(h.getLastVm().openingBgmLog.some((e) => e.action === "fallback" && e.error === "BgmUnavailable" && e.gain === 0));

    h.controller.onOpeningNext(); // scene3 (BgmUnavailable)
    await h.flushBgm();
    h.controller.onOpeningNext(); // scene4
    h.controller.onOpeningNext(); // scene5
    h.controller.onClickScreen(); // setting
    h.controller.onAdjust(10000);
    h.controller.onStart();

    // Assert
    assert.equal(h.getLastVm().state, "countdown");
    assert.equal(h.getLastVm().settingMs, 130000);
  });

  await t.test("第5シーンは 5000ms 拡大で自動遷移し、再生中の onClickScreen() で即時スキップと BGM 停止確認を行う", async () => {
    // Arrange (5秒完走)
    const h1 = setupHarness();
    h1.advanceTo(0);
    h1.setNow(1000);
    h1.controller.onOpeningNext(); // scene2
    await h1.flushBgm();
    h1.controller.onOpeningNext(); // scene3
    await h1.flushBgm();
    h1.controller.onOpeningNext(); // scene4
    await h1.flushBgm();
    h1.setNow(2000);
    h1.controller.onOpeningNext(); // scene5 開始

    // Assert: 第5シーン開始時点で前後ボタン非表示・印記録・scale=0・無音
    assert.equal(h1.getLastVm().openingStep, "scene5");
    assert.equal(h1.getLastVm().openingSceneIndex, 5);
    assert.equal(h1.getLastVm().openingImageKind, "blueLamp");
    assert.equal(h1.getLastVm().openingBackVisible, false);
    assert.equal(h1.getLastVm().openingNextVisible, false);
    assert.equal(h1.getLastVm().openingBgmTrack, "none");
    assert.equal(h1.getLastVm().openingScale, 0);
    assert.equal(h1.getLastVm().marks["opening-scene5"], 2000);

    // Act & Assert: 2500ms 経過で scale=0.5、5000ms 経過で setting へ遷移し stopOpeningBgm が呼ばれる
    h1.advanceTo(4500);
    assert.equal(h1.getLastVm().state, "opening");
    assert.equal(h1.getLastVm().openingScale, 0.5);
    const stopCountBeforeDone = h1.audioCalls.filter((c) => c === "stopBgm").length;
    h1.advanceTo(7000);
    assert.equal(h1.getLastVm().state, "setting");
    assert.equal(h1.getLastVm().openingSceneIndex, 0);
    assert.equal(h1.getLastVm().openingBackVisible, false);
    assert.equal(h1.getLastVm().openingNextVisible, false);
    assert.equal(h1.getLastVm().marks["setting-shown"], 7000);
    assert.ok(h1.audioCalls.filter((c) => c === "stopBgm").length > stopCountBeforeDone);

    // Arrange (第5シーン中のスキップ)
    const h2 = setupHarness();
    h2.advanceTo(0);
    h2.controller.onOpeningNext();
    h2.controller.onOpeningNext();
    h2.controller.onOpeningNext();
    h2.setNow(500);
    h2.controller.onOpeningNext();
    h2.advanceTo(1500);
    const stopCountBeforeSkip = h2.audioCalls.filter((c) => c === "stopBgm").length;
    // Act
    h2.controller.onClickScreen();
    // Assert
    assert.equal(h2.getLastVm().state, "setting");
    assert.equal(h2.getLastVm().openingImageKind, "none");
    assert.equal(h2.getLastVm().openingBackVisible, false);
    assert.equal(h2.getLastVm().openingNextVisible, false);
    assert.ok(h2.audioCalls.filter((c) => c === "stopBgm").length > stopCountBeforeSkip);
  });

  await t.test("設定変更、スタート後操作無効、赤色点滅消灯時ピコン音、残時間0でのジュワッチ再生", () => {
    // Arrange
    const h = setupHarness({ juwacchiOk: true });
    h.advanceTo(0);
    h.skipToSetting();
    h.controller.onAdjust(-60000); // 1:00 (60000ms)
    assert.equal(h.getLastVm().settingMs, 60000);

    // Act: start countdown at t=1000
    h.setNow(1000);
    h.controller.onStart();
    assert.equal(h.getLastVm().state, "countdown");
    assert.equal(h.getLastVm().beaconColor, "red");
    assert.equal(h.getLastVm().beaconLit, true);

    // カウントダウン中の adjust / start は無視される
    h.controller.onAdjust(10000);
    assert.equal(h.getLastVm().settingMs, 60000);

    // 1000ms 経過で消灯し、picon が1回鳴る
    h.advanceTo(2000);
    assert.equal(h.getLastVm().beaconLit, false);
    assert.equal(h.audioCalls.filter((c) => c === "picon").length, 1);

    // 残時間 0 到達（t=61000）で endingAudio -> picon + juwacchi
    h.advanceTo(61000);
    assert.equal(h.getLastVm().state, "endingAudio");
    assert.equal(h.getLastVm().beaconLit, false);
    assert.equal(h.audioCalls.filter((c) => c === "picon").length, 2);
    assert.equal(h.audioCalls.filter((c) => c === "juwacchi").length, 1);

    // ジュワッチ終了で endingDots へ遷移し、WINDOW_W=700 の中心 (350, 360) から飛散する
    h.triggerJuwacchiEnd();
    assert.equal(h.getLastVm().state, "endingDots");
    assert.equal(h.getLastVm().dots[0].x, 350);
    assert.equal(h.getLastVm().dots[0].y, 360);
  });

  await t.test("JuwacchiUnavailable 発生時は即座に endingDots へ遷移する", () => {
    // Arrange
    const h = setupHarness({ juwacchiOk: false });
    h.advanceTo(0);
    h.skipToSetting();
    h.controller.onAdjust(-60000);
    h.setNow(100);
    h.controller.onStart();
    // Act
    h.advanceTo(60100);
    // Assert
    assert.equal(h.getLastVm().state, "endingDots");
  });

  await t.test("長押し早送りは 2000ms 後に 200ms 間隔で 10秒ずつ増減し、単押し・キャンセル・スタートを正しく扱う", () => {
    // Arrange
    const h = setupHarness();
    h.advanceTo(0);
    h.skipToSetting();
    assert.equal(h.getLastVm().settingMs, 120000);

    // Act & Assert: 2000ms 未満の短押しは +10000ms の単押しになる
    h.setNow(1000);
    h.controller.onAdjustPressStart(10000);
    h.advanceTo(1500);
    assert.equal(h.getLastVm().settingMs, 120000);
    h.setNow(1800);
    h.controller.onAdjustPressEnd(false);
    assert.equal(h.getLastVm().settingMs, 130000);

    // Act & Assert: 2000ms 以上長押しで 200ms ごとに早送りし、離しても重複加算しない
    h.setNow(2000);
    h.controller.onAdjustPressStart(-10000);
    h.advanceTo(3999);
    assert.equal(h.getLastVm().settingMs, 130000);
    h.advanceTo(4000);
    assert.equal(h.getLastVm().settingMs, 130000);
    h.advanceTo(4200);
    assert.equal(h.getLastVm().settingMs, 120000);
    h.advanceTo(5000);
    assert.equal(h.getLastVm().settingMs, 80000);
    h.setNow(5050);
    h.controller.onAdjustPressEnd(false);
    assert.equal(h.getLastVm().settingMs, 80000);

    // Act & Assert: cancelled = true では単押し分も加算されない
    h.setNow(6000);
    h.controller.onAdjustPressStart(10000);
    h.setNow(6100);
    h.controller.onAdjustPressEnd(true);
    assert.equal(h.getLastVm().settingMs, 80000);

    // Act & Assert: onStart() で長押し状態が停止し、countdown 中の onAdjustPressStart は無視される
    h.setNow(7000);
    h.controller.onAdjustPressStart(10000);
    h.setNow(7100);
    h.controller.onStart();
    assert.equal(h.getLastVm().state, "countdown");
    assert.equal(h.getLastVm().settingMs, 80000);
    h.controller.onAdjustPressStart(10000);
    h.controller.onAdjustPressEnd(false);
    assert.equal(h.getLastVm().settingMs, 80000);
  });

  await t.test("TC-076 viewModel.exitVisible は endingDots のみ true で、onExit() は endingDots 時のみ windowPort.close() と exit-clicked 記録を実行する", () => {
    // Arrange
    const h = setupHarness({ juwacchiOk: true });
    h.advanceTo(0);

    // Assert (opening): exitVisible=false, onExit 無操作
    assert.equal(h.getLastVm().exitVisible, false);
    h.controller.onExit();
    assert.equal(h.getCloseCalls(), 0);
    assert.equal(h.getLastVm().marks["exit-clicked"], undefined);

    // Assert (setting): exitVisible=false, onExit 無操作
    h.skipToSetting();
    assert.equal(h.getLastVm().exitVisible, false);
    h.controller.onExit();
    assert.equal(h.getCloseCalls(), 0);

    // Assert (countdown): exitVisible=false, onExit 無操作
    h.controller.onAdjust(-60000);
    h.setNow(1000);
    h.controller.onStart();
    assert.equal(h.getLastVm().exitVisible, false);
    h.controller.onExit();
    assert.equal(h.getCloseCalls(), 0);

    // Assert (endingAudio): exitVisible=false, onExit 無操作
    h.advanceTo(61000);
    assert.equal(h.getLastVm().state, "endingAudio");
    assert.equal(h.getLastVm().exitVisible, false);
    h.controller.onExit();
    assert.equal(h.getCloseCalls(), 0);

    // Act & Assert (endingDots): exitVisible=true, onExit で BGM 停止・exit-clicked 記録・windowPort.close 呼出・連続押下耐性
    h.setNow(62000);
    h.triggerJuwacchiEnd();
    assert.equal(h.getLastVm().state, "endingDots");
    assert.equal(h.getLastVm().exitVisible, true);

    h.setNow(62500);
    h.controller.onExit();
    h.setNow(62550);
    h.controller.onExit();
    assert.equal(h.getCloseCalls(), 2);
    assert.equal(h.getLastVm().marks["exit-clicked"], 62550);
    assert.equal(h.getLastVm().openingBgmTrack, "none");

    // Assert: windowPort 未指定(null) および close() 例外時もエラーを送出しない
    const hNullPort = setupHarness({ juwacchiOk: false, windowPort: null });
    hNullPort.advanceTo(0);
    hNullPort.skipToSetting();
    hNullPort.controller.onAdjust(-60000);
    hNullPort.setNow(100);
    hNullPort.controller.onStart();
    hNullPort.advanceTo(60100);
    assert.equal(hNullPort.getLastVm().state, "endingDots");
    assert.doesNotThrow(() => hNullPort.controller.onExit());

    const hThrowPort = setupHarness({ juwacchiOk: false, windowPortThrow: true });
    hThrowPort.advanceTo(0);
    hThrowPort.skipToSetting();
    hThrowPort.controller.onAdjust(-60000);
    hThrowPort.setNow(100);
    hThrowPort.controller.onStart();
    hThrowPort.advanceTo(60100);
    assert.doesNotThrow(() => hThrowPort.controller.onExit());
    assert.equal(hThrowPort.getCloseCalls(), 1);
  });
});
