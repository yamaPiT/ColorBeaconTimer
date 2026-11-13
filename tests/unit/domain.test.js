/**
 * ファイル名： domain.test.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 時刻と状態の純粋関数を、node:test で確認する。
 * 対応機能ID（トレーサビリティ）： UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-006, UNIT-007, UNIT-010, TC-033, TC-038
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INITIAL_STATE, nextState } from "../../extension/src/domain/app-state.js";
import { openingStep } from "../../extension/src/domain/opening-timeline.js";
import { adjustSetting } from "../../extension/src/domain/setting-time.js";
import { sortieStep } from "../../extension/src/domain/sortie-timeline.js";
import { beaconZone, formatRemaining, remainingMs } from "../../extension/src/domain/remaining-time.js";
import { bluePhase, redIntervalSec } from "../../extension/src/domain/blink-interval.js";
import { earthDiameterPx, mulberry32, starPositions } from "../../extension/src/domain/ending-timeline.js";

describe("UNIT-002 nextState", () => {
  it("新しいページの初期状態は opening である", () => {
    // Arrange
    const state = INITIAL_STATE;
    // Act
    const ignored = nextState(state, { name: "unknown" });
    // Assert
    assert.equal(state, "opening");
    assert.equal(ignored, "opening");
  });

  it("opening は最初の click または 2500 ミリ秒で setting になる", () => {
    // Arrange
    const early = { name: "tick", elapsedMs: 2499 };
    const done = { name: "tick", elapsedMs: 2500 };
    // Act
    const stays = nextState("opening", early);
    const byTime = nextState("opening", done);
    const byClick = nextState("opening", { name: "click" });
    // Assert
    assert.equal(stays, "opening");
    assert.equal(byTime, "setting");
    assert.equal(byClick, "setting");
  });

  it("setting は sortie で進み、sortie は 2000 ミリ秒で countdown になる", () => {
    // Arrange
    const sortie = { name: "sortie" };
    // Act
    const next = nextState("setting", sortie);
    const stay = nextState("sortie", { name: "tick", elapsedMs: 1999 });
    const done = nextState("sortie", { name: "tick", elapsedMs: 2000 });
    // Assert
    assert.equal(next, "sortie");
    assert.equal(stay, "sortie");
    assert.equal(done, "countdown");
  });

  it("sortie 中のボタンは状態を変えない", () => {
    // Arrange
    const names = ["plus", "minus", "sortie"];
    // Act
    const results = names.map((name) => nextState("sortie", { name }));
    // Assert
    assert.deepEqual(results, ["sortie", "sortie", "sortie"]);
  });

  it("countdown は再生できるとき shout、できないとき shrink になる", () => {
    // Arrange
    const playable = { name: "remaining-zero", canPlay: true };
    const missing = { name: "remaining-zero", canPlay: false };
    // Act
    const shout = nextState("countdown", playable);
    const shrink = nextState("countdown", missing);
    const ignored = nextState("countdown", { name: "plus" });
    // Assert
    assert.equal(shout, "shout");
    assert.equal(shrink, "shrink");
    assert.equal(ignored, "countdown");
  });

  it("shout の終了と失敗は shrink になり、点のあと stars から setting へは戻らない", () => {
    // Arrange
    const ended = { name: "shout-ended" };
    const failed = { name: "shout-failed" };
    // Act
    const fromEnd = nextState("shout", ended);
    const fromFail = nextState("shout", failed);
    const stars = nextState("shrink", { name: "tick", diameterPx: 4 });
    const above = nextState("shrink", { name: "tick", diameterPx: 4.1 });
    const back = nextState("stars", { name: "sortie" });
    // Assert
    assert.equal(fromEnd, "shrink");
    assert.equal(fromFail, "shrink");
    assert.equal(stars, "stars");
    assert.equal(above, "shrink");
    assert.equal(back, "stars");
  });
});

describe("UNIT-003 openingStep", () => {
  it("境界どおりにステップを返す", () => {
    // Arrange
    const samples = [0, 699, 700, 1099, 1100, 1499, 1500, 1899, 1900, 2299, 2300, 2499, 2500, 3000];
    // Act
    const steps = samples.map((ms) => openingStep(ms));
    // Assert
    assert.deepEqual(steps, [
      "toilet", "toilet",
      "shake", "shake",
      "face1", "face1",
      "face2", "face2",
      "face3", "face3",
      "expand", "expand",
      "done", "done",
    ]);
  });
});

describe("UNIT-004 adjustSetting", () => {
  it("初期値の前後と、両端のクランプを返す", () => {
    // Arrange
    const initial = 180000;
    // Act
    const up = adjustSetting(initial, 1000);
    const down = adjustSetting(initial, -1000);
    const min = adjustSetting(10000, -1000);
    const max = adjustSetting(300000, 1000);
    // Assert
    assert.equal(up, 181000);
    assert.equal(down, 179000);
    assert.equal(min, 10000);
    assert.equal(max, 300000);
  });
});

describe("UNIT-005 sortieStep", () => {
  it("広がり、接近、着地、完了の境界を返す", () => {
    // Arrange
    const samples = [0, 699, 700, 1399, 1400, 1999, 2000];
    // Act
    const steps = samples.map((ms) => sortieStep(ms));
    // Assert
    assert.deepEqual(steps, ["spread", "spread", "approach", "approach", "land", "land", "done"]);
  });
});

describe("UNIT-006 remaining と TC-038", () => {
  it("残時間は 0 未満にせず、負の経過は 0 として扱う", () => {
    // Arrange
    const start = 180000;
    // Act
    const normal = remainingMs(start, 1000);
    const negativeElapsed = remainingMs(start, -50);
    const past = remainingMs(start, 200000);
    // Assert
    assert.equal(normal, 179000);
    assert.equal(negativeElapsed, 180000);
    assert.equal(past, 0);
  });

  it("TC-038 1000、1001、119999、60001 と境界の表示を返す", () => {
    // Arrange
    const cases = [
      [1000, "0:01"],
      [1001, "0:02"],
      [119999, "2:00"],
      [120000, "2:00"],
      [120001, "2:01"],
      [60000, "1:00"],
      [60001, "1:01"],
    ];
    // Act
    const actual = cases.map(([ms]) => formatRemaining(ms));
    // Assert
    assert.deepEqual(actual, cases.map(([, text]) => text));
  });

  it("色の区分は残ミリ秒で決まる", () => {
    // Arrange
    const samples = [120001, 120000, 60001, 60000, 0];
    // Act
    const zones = samples.map((ms) => beaconZone(ms));
    // Assert
    assert.deepEqual(zones, ["blue-solid", "blue-blink", "blue-blink", "red-blink", "zero"]);
  });
});

describe("UNIT-007 blink と TC-033", () => {
  it("青の1周期は fade-out 1000 のあと fade-in 1000 である", () => {
    // Arrange
    const points = [0, 500, 999, 1000, 1500, 1999];
    // Act
    const phases = points.map((ms) => bluePhase(ms));
    // Assert
    assert.equal(phases[0].phase, "fade-out");
    assert.equal(phases[0].opacity, 1);
    assert.equal(phases[0].plannedMs, 1000);
    assert.ok(phases[2].opacity < 0.01);
    assert.equal(phases[3].phase, "fade-in");
    assert.equal(phases[3].opacity, 0);
    assert.ok(phases[5].opacity > 0.99);
  });

  it("TC-033 20000 ミリ秒は 20/60 秒、19800 ミリ秒は 0.33 秒である", () => {
    // Arrange
    const at20 = 20000;
    const atFloor = 19800;
    // Act
    const high = redIntervalSec(at20);
    const low = redIntervalSec(atFloor);
    const below = redIntervalSec(10000);
    const minute = redIntervalSec(60000);
    const half = redIntervalSec(30000);
    // Assert
    assert.equal(high, 20 / 60);
    assert.equal(low, 0.33);
    assert.equal(below, 0.33);
    assert.equal(minute, 1);
    assert.equal(half, 0.5);
    assert.ok(Math.abs(high - low) < 0.1);
  });
});

describe("UNIT-010 ending", () => {
  it("直径は 240 から 4 へ減り、5000 ミリ秒以降は 4 のままである", () => {
    // Arrange
    let previous = earthDiameterPx(0);
    // Act
    const atEnd = earthDiameterPx(5000);
    const after = earthDiameterPx(6000);
    // Assert
    assert.equal(previous, 240);
    for (let elapsed = 100; elapsed <= 5000; elapsed += 100) {
      const next = earthDiameterPx(elapsed);
      assert.ok(next < previous, String(elapsed));
      previous = next;
    }
    assert.equal(atEnd, 4);
    assert.equal(after, 4);
    assert.ok(earthDiameterPx(4900) > 4);
  });

  it("星は同じ乱数列なら、経過とともに中心から離れる", () => {
    // Arrange
    const early = starPositions(0, mulberry32(1));
    const later = starPositions(500, mulberry32(1));
    // Act
    const radius = (star) => Math.hypot(star.x, star.y);
    // Assert
    assert.equal(early.length, later.length);
    assert.ok(radius(later[0]) > radius(early[0]));
  });
});
