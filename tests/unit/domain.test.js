/**
 * ファイル名： domain.test.js
 * バージョン番号： 4.0.0
 * 作成日： 2026-11-19
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 純粋計算ユニット（UNIT-002〜006, UNIT-009）の単体テストを実行する。
 * 対応機能ID（トレーサビリティ）： UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-006, UNIT-009, TC-026, TC-027, TC-030
 */

import assert from "node:assert/strict";
import test from "node:test";
import { nextState } from "../../extension/src/domain/app-state.js";
import { redPhaseDurationMs } from "../../extension/src/domain/blink-interval.js";
import { SETTING_INITIAL_MS } from "../../extension/src/domain/constants.js";
import { createDotField, dotPositions } from "../../extension/src/domain/ending-dots.js";
import {
  openingFrame,
  stepOpeningScene,
} from "../../extension/src/domain/opening-timeline.js";
import {
  beaconZone,
  formatRemaining,
  remainingMs,
} from "../../extension/src/domain/remaining-time.js";
import {
  adjustSetting,
  longPressRepeatSteps,
} from "../../extension/src/domain/setting-time.js";

test("UNIT-002 nextState", async (t) => {
  await t.test("opening は OPENING_DONE と SKIP_OPENING で setting へ遷移する", () => {
    // Arrange
    const state = "opening";
    // Act
    const doneNext = nextState(state, "OPENING_DONE");
    const skipNext = nextState(state, "SKIP_OPENING");
    const unknownNext = nextState(state, "START");
    // Assert
    assert.equal(doneNext, "setting");
    assert.equal(skipNext, "setting");
    assert.equal(unknownNext, "opening");
  });

  await t.test("setting は START で countdown へ遷移し、countdown 中は ADJUST と START を無視する", () => {
    // Arrange
    const s1 = nextState("setting", "START");
    // Act
    const afterAdjust = nextState(s1, "ADJUST");
    const afterStart = nextState(s1, "START");
    const afterZero = nextState(s1, "TIMER_ZERO");
    // Assert
    assert.equal(s1, "countdown");
    assert.equal(afterAdjust, "countdown");
    assert.equal(afterStart, "countdown");
    assert.equal(afterZero, "endingAudio");
  });

  await t.test("endingAudio は AUDIO_DONE / AUDIO_UNAVAILABLE で endingDots へ遷移し、endingDots からは戻らない", () => {
    // Arrange
    const state = "endingAudio";
    // Act
    const doneDots = nextState(state, "AUDIO_DONE");
    const unavailDots = nextState(state, "AUDIO_UNAVAILABLE");
    const stay1 = nextState("endingDots", "OPENING_DONE");
    const stay2 = nextState("endingDots", "START");
    // Assert
    assert.equal(doneDots, "endingDots");
    assert.equal(unavailDots, "endingDots");
    assert.equal(stay1, "endingDots");
    assert.equal(stay2, "endingDots");
  });
});

test("UNIT-003 stepOpeningScene / openingFrame", async (t) => {
  await t.test("stepOpeningScene は第1〜第4シーンの next/back 遷移と範囲外保持を正しく返す", () => {
    // Arrange & Act & Assert
    assert.equal(stepOpeningScene(1, "next"), 2);
    assert.equal(stepOpeningScene(1, "back"), 1);
    assert.equal(stepOpeningScene(2, "next"), 3);
    assert.equal(stepOpeningScene(2, "back"), 1);
    assert.equal(stepOpeningScene(3, "next"), 4);
    assert.equal(stepOpeningScene(3, "back"), 2);
    assert.equal(stepOpeningScene(4, "next"), 5);
    assert.equal(stepOpeningScene(4, "back"), 3);
    assert.equal(stepOpeningScene(5, "next"), 5);
    assert.equal(stepOpeningScene(5, "back"), 5);
    assert.equal(stepOpeningScene(0, "next"), 0);
    assert.equal(stepOpeningScene(6, "back"), 6);
  });

  await t.test("openingFrame は第1〜第5シーンのボタン表示可否・画像種別・bgmTrack・第5シーン5秒拡大率・範囲外を返す", () => {
    // Arrange & Act & Assert
    assert.deepEqual(openingFrame(1, 9999), {
      step: "scene1",
      sceneIndex: 1,
      scale: 1,
      imageKind: "none",
      bgmTrack: "none",
      showBack: false,
      showNext: true,
    });
    assert.deepEqual(openingFrame(2, 0), {
      step: "scene2",
      sceneIndex: 2,
      scale: 1,
      imageKind: "fountain",
      bgmTrack: "scene2",
      showBack: true,
      showNext: true,
    });
    assert.deepEqual(openingFrame(3, 0), {
      step: "scene3",
      sceneIndex: 3,
      scale: 1,
      imageKind: "threeFace",
      bgmTrack: "scene3",
      showBack: true,
      showNext: true,
    });
    assert.deepEqual(openingFrame(4, 0), {
      step: "scene4",
      sceneIndex: 4,
      scale: 1,
      imageKind: "none",
      bgmTrack: "none",
      showBack: true,
      showNext: true,
    });
    assert.deepEqual(openingFrame(5, -100), {
      step: "scene5",
      sceneIndex: 5,
      scale: 0,
      imageKind: "blueLamp",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
    assert.deepEqual(openingFrame(5, 0), {
      step: "scene5",
      sceneIndex: 5,
      scale: 0,
      imageKind: "blueLamp",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
    assert.deepEqual(openingFrame(5, 2500), {
      step: "scene5",
      sceneIndex: 5,
      scale: 0.5,
      imageKind: "blueLamp",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
    assert.deepEqual(openingFrame(5, 4999), {
      step: "scene5",
      sceneIndex: 5,
      scale: 4999 / 5000,
      imageKind: "blueLamp",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
    assert.deepEqual(openingFrame(5, 5000), {
      step: "done",
      sceneIndex: 0,
      scale: 1,
      imageKind: "none",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
    assert.deepEqual(openingFrame(0, 0), {
      step: "done",
      sceneIndex: 0,
      scale: 1,
      imageKind: "none",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
    assert.deepEqual(openingFrame(6, 0), {
      step: "done",
      sceneIndex: 0,
      scale: 1,
      imageKind: "none",
      bgmTrack: "none",
      showBack: false,
      showNext: false,
    });
  });
});

test("UNIT-004 adjustSetting", async (t) => {
  await t.test("初期値 120000、10000ms 単位の増減、60000〜180000 のクランプを行う", () => {
    // Arrange
    assert.equal(SETTING_INITIAL_MS, 120000);
    // Act
    const up = adjustSetting(120000, 10000);
    const down = adjustSetting(120000, -10000);
    const minClamp = adjustSetting(60000, -10000);
    const maxClamp = adjustSetting(180000, 10000);
    // Assert
    assert.equal(up, 130000);
    assert.equal(down, 110000);
    assert.equal(minClamp, 60000);
    assert.equal(maxClamp, 180000);
  });

  await t.test("longPressRepeatSteps は 2000ms 経過後から 200ms ごとに追加ステップ数を返す", () => {
    // Arrange & Act & Assert
    assert.equal(longPressRepeatSteps(0, 0), 0);
    assert.equal(longPressRepeatSteps(1999, 0), 0);
    assert.equal(longPressRepeatSteps(2000, 0), 0);
    assert.equal(longPressRepeatSteps(2199, 0), 0);
    assert.equal(longPressRepeatSteps(2200, 0), 1);
    assert.equal(longPressRepeatSteps(2200, 1), 0);
    assert.equal(longPressRepeatSteps(3000, 0), 5);
    assert.equal(longPressRepeatSteps(3000, 3), 2);
  });
});

test("UNIT-005 remainingMs / formatRemaining / beaconZone (TC-030)", async (t) => {
  await t.test("TC-030 残時間と切り上げ表示文字列・色区分を境界値どおりに計算する", () => {
    // Arrange & Act & Assert
    assert.equal(remainingMs(120000, -500), 120000);
    assert.equal(remainingMs(120000, 130000), 0);

    assert.equal(formatRemaining(60001), "1:01");
    assert.equal(formatRemaining(60000), "1:00");
    assert.equal(formatRemaining(1001), "0:02");
    assert.equal(formatRemaining(1000), "0:01");
    assert.equal(formatRemaining(0), "0:00");

    assert.equal(beaconZone(60001), "blue-solid");
    assert.equal(beaconZone(60000), "red-blink");
    assert.equal(beaconZone(1), "red-blink");
    assert.equal(beaconZone(0), "off");
  });
});

test("UNIT-006 redPhaseDurationMs (TC-026, TC-027)", async (t) => {
  await t.test("TC-026 / TC-027 線形加速点滅の点灯・消灯時間を正しく返す", () => {
    // Arrange & Act & Assert
    assert.equal(redPhaseDurationMs(60000), 1000);
    assert.equal(redPhaseDurationMs(35000), 550);
    assert.equal(redPhaseDurationMs(10000), 100);
    assert.equal(redPhaseDurationMs(5000), 100);
    assert.equal(redPhaseDurationMs(0), 0);
  });
});

test("UNIT-009 endingDots", async (t) => {
  await t.test("360度全周囲方向のドットが生成され、時間経過で中央から外へ移動し再飛散する", () => {
    // Arrange
    let seed = 0;
    const seq = [0.0, 0.25, 0.5, 0.75, 0.1, 0.9, 0.3, 0.6];
    const rng = () => {
      const v = seq[seed % seq.length];
      seed += 1;
      return v;
    };
    const dots = createDotField(4, rng);
    // Act
    const p0 = dotPositions(dots, 0, 240, 360, 480, 720);
    const p1 = dotPositions(dots, 500, 240, 360, 480, 720);
    const pLate = dotPositions(dots, 60000, 240, 360, 480, 720);
    // Assert
    assert.equal(dots.length, 4);
    for (const d of dots) {
      assert.ok(d.angle >= 0 && d.angle < Math.PI * 2);
      assert.ok(d.speed > 0);
    }
    assert.equal(p0[0].x, 240);
    assert.equal(p0[0].y, 360);
    const dist1 = Math.hypot(p1[0].x - 240, p1[0].y - 360);
    assert.ok(dist1 > 0);
    assert.equal(pLate.length, 4);
    for (const pt of pLate) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
    }
  });
});
