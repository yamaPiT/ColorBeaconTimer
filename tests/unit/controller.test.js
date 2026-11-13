/**
 * ファイル名： controller.test.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： フレーム制御の遷移、長押し、掛け声の失敗を確認する。
 * 対応機能ID（トレーサビリティ）： UNIT-012, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, TC-019, TC-034, TC-050
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createController } from "../../extension/src/app/controller.js";

function harness(options = {}) {
  let now = 0;
  const jobs = [];
  let seq = 1;
  const clock = { nowMs: () => now };
  const scheduler = {
    set(fn, ms) {
      const id = seq;
      seq += 1;
      jobs.push({ id, fn, due: now + ms, dead: false });
      return id;
    },
    clear(id) {
      const job = jobs.find((item) => item.id === id);
      if (job) {
        job.dead = true;
      }
    },
  };
  const views = [];
  const audio = {
    resumes: 0,
    picons: 0,
    async resume() {
      this.resumes += 1;
    },
    playPicon() {
      this.picons += 1;
    },
    async loadShout() {
      if (options.shout === false) {
        return "ShoutUnavailable";
      }
      return { url: "chrome-extension://test/assets/audio/shout.wav", bytes: new ArrayBuffer(4) };
    },
    async playShout() {
      if (options.playFail) {
        return "ShoutUnavailable";
      }
      const source = { buffer: { duration: 0.3 }, onended: null };
      audio.last = source;
      return source;
    },
  };
  const controller = createController(clock, audio, {
    render(viewModel) {
      views.push(viewModel);
    },
  }, scheduler);

  function flush() {
    for (let guard = 0; guard < 30; guard += 1) {
      const due = jobs.filter((job) => !job.dead && job.due <= now);
      if (due.length === 0) {
        return;
      }
      for (const job of due) {
        job.dead = true;
        job.fn();
      }
    }
  }

  return {
    controller,
    audio,
    views,
    tick() {
      controller.tick();
    },
    at(ms) {
      now = ms;
      flush();
      controller.tick();
    },
    last() {
      return views[views.length - 1];
    },
  };
}

describe("UNIT-012 createController", () => {
  it("クリックが無いオープニングは 2500 ミリ秒で setting になる", async () => {
    // Arrange
    const box = harness();
    await box.controller.ready;
    // Act
    box.at(0);
    const early = box.last().state;
    box.at(2499);
    const before = box.last().state;
    box.at(2500);
    // Assert
    assert.equal(early, "opening");
    assert.equal(before, "opening");
    assert.equal(box.last().state, "setting");
    assert.equal(box.last().displayTime, "3:00");
    assert.equal(box.last().beaconColor, "blue");
    assert.equal(box.last().beaconOpacity, 1);
  });

  it("最初のクリックで setting になり、出撃演出の 2000 ミリ秒は残時間が減らない", async () => {
    // Arrange
    const box = harness();
    await box.controller.ready;
    box.at(0);
    // Act
    box.controller.pointer("down", "stage");
    box.at(10);
    box.controller.pointer("down", "sortie");
    box.at(10);
    const during = box.last();
    box.at(1999);
    const still = box.last();
    box.controller.pointer("down", "plus");
    box.at(1999);
    const ignored = box.last();
    box.at(2010);
    const started = box.last();
    box.at(2500);
    const later = box.last();
    // Assert
    assert.equal(during.state, "sortie");
    assert.equal(during.remainingMs, 180000);
    assert.equal(still.remainingMs, 180000);
    assert.equal(still.displayTime, "3:00");
    assert.equal(ignored.settingMs, 180000);
    assert.equal(ignored.state, "sortie");
    assert.equal(started.state, "countdown");
    assert.ok(later.remainingMs < 180000);
    assert.equal(box.audio.resumes, 1);
  });

  it("TC-019 1000 ミリ秒の＋長押しで adjust が 2 回以上呼ばれ、5:00 を超えない", async () => {
    // Arrange
    const box = harness();
    await box.controller.ready;
    box.at(0);
    box.controller.pointer("down", "stage");
    // Act
    box.controller.pointer("down", "plus");
    box.at(1000);
    box.controller.pointer("up", "plus");
    const setting = box.last().settingMs;
    // Assert
    assert.ok(setting >= 182000);
    assert.ok(setting <= 300000);
  });

  it("TC-050 掛け声を読めないときは残時間 0 で shrink になり、0:00 を出さない", async () => {
    // Arrange
    const box = harness({ shout: false });
    await box.controller.ready;
    box.at(0);
    box.controller.pointer("down", "stage");
    box.at(0);
    for (let count = 0; count < 170; count += 1) {
      box.controller.pointer("down", "minus");
      box.controller.pointer("up", "minus");
    }
    box.at(0);
    assert.equal(box.last().settingMs, 10000);
    box.controller.pointer("down", "sortie");
    // Act
    box.at(2000);
    assert.equal(box.last().state, "countdown");
    box.at(12000);
    // Assert
    assert.equal(box.last().state, "shrink");
    assert.equal(box.last().timeVisible, false);
    assert.equal(box.last().displayTime, "");
    const truncated = box.last().blinkLog.filter((row) => row.truncated);
    assert.ok(truncated.length >= 1);
    assert.ok(truncated.every((row) => row.measuredMs === null && row.intervalMs === 330));
  });

  it("TC-034 0:10 の赤点滅は、打ち切り以外の実測を小さな刻みで 330 ミリ秒前後に保つ", async () => {
    // Arrange
    const box = harness({ shout: false });
    await box.controller.ready;
    box.at(0);
    box.controller.pointer("down", "stage");
    for (let count = 0; count < 170; count += 1) {
      box.controller.pointer("down", "minus");
      box.controller.pointer("up", "minus");
    }
    box.controller.pointer("down", "sortie");
    // Act
    for (let ms = 0; ms <= 12000; ms += 20) {
      box.at(ms);
    }
    const red = box.last().blinkLog.filter((row) => row.phase === "red");
    const finished = red.filter((row) => row.truncated === false);
    const cut = red.filter((row) => row.truncated === true);
    // Assert
    assert.ok(finished.length >= 1);
    assert.ok(finished.every((row) => row.intervalMs === 330));
    assert.ok(finished.every((row) => row.measuredMs >= 230 && row.measuredMs <= 430));
    assert.ok(cut.every((row) => row.measuredMs === null && row.intervalMs === 330));
  });
});
