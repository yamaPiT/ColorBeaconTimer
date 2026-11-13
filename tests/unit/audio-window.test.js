/**
 * ファイル名： audio-window.test.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ピコン、掛け声、専用ウィンドウの起動を確認する。
 * 対応機能ID（トレーサビリティ）： UNIT-001, UNIT-008, UNIT-009, REQ-001, REQ-005
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playPicon } from "../../extension/src/audio/picon-synth.js";
import { loadShout, playShout } from "../../extension/src/audio/shout-player.js";
import { forgetWindow, openOrFocus, registerLauncher } from "../../extension/src/background/window-launcher.js";

function fakeAudio() {
  const oscillators = [];
  return {
    state: "running",
    currentTime: 1,
    destination: {},
    oscillators,
    createOscillator() {
      const osc = {
        type: "",
        frequency: { value: 0 },
        connect() {},
        start(when) { osc.started = when; },
        stop(when) { osc.stopped = when; },
      };
      oscillators.push(osc);
      return osc;
    },
    createGain() {
      return { gain: { value: 1 }, connect() {} };
    },
  };
}

function fakeChrome() {
  const windows = new Map();
  let seq = 1;
  const calls = [];
  const session = {};
  const clicked = [];
  const removed = [];
  const api = {
    calls,
    windowsMap: windows,
    action: {
      onClicked: { addListener(fn) { clicked.push(fn); } },
    },
    windows: {
      async get(id) {
        calls.push(["get", id]);
        if (!windows.has(id)) {
          throw new Error("missing");
        }
        return windows.get(id);
      },
      async create(options) {
        calls.push(["create", options]);
        if (api.failCreate) {
          throw new Error("create failed");
        }
        const win = { id: seq, ...options };
        seq += 1;
        windows.set(win.id, win);
        return win;
      },
      async update(id, options) {
        calls.push(["update", id, options]);
        if (api.failUpdate) {
          throw new Error("update failed");
        }
        if (!windows.has(id)) {
          throw new Error("missing");
        }
        Object.assign(windows.get(id), options);
        return windows.get(id);
      },
      onRemoved: { addListener(fn) { removed.push(fn); } },
    },
    storage: {
      session: {
        async get(key) {
          return { [key]: session[key] };
        },
        async set(values) {
          Object.assign(session, values);
        },
        async remove(key) {
          delete session[key];
        },
      },
    },
    clicked,
    removed,
    session,
  };
  return api;
}

describe("UNIT-008 playPicon", () => {
  it("正弦波 880 Hz を 80 ミリ秒鳴らす", () => {
    // Arrange
    const audio = fakeAudio();
    // Act
    const result = playPicon(audio, 0);
    // Assert
    assert.equal(result, undefined);
    assert.equal(audio.oscillators.length, 1);
    assert.equal(audio.oscillators[0].type, "sine");
    assert.equal(audio.oscillators[0].frequency.value, 880);
    assert.ok(Math.abs((audio.oscillators[0].stopped - audio.oscillators[0].started) - 0.08) < 1e-9);
  });

  it("閉じたコンテキストでは AudioUnavailable を返す", () => {
    // Arrange
    const audio = fakeAudio();
    audio.state = "closed";
    // Act
    const result = playPicon(audio, 0);
    // Assert
    assert.equal(result, "AudioUnavailable");
    assert.equal(audio.oscillators.length, 0);
  });
});

describe("UNIT-009 loadShout と playShout", () => {
  it("読み取り失敗は ShoutUnavailable で、例外は外へ出ない", async () => {
    // Arrange
    const readFile = async () => {
      throw new Error("missing");
    };
    // Act
    const result = await loadShout(readFile);
    // Assert
    assert.equal(result, "ShoutUnavailable");
  });

  it("空の読み取りと、閉じたコンテキストの再生は ShoutUnavailable である", async () => {
    // Arrange
    const empty = await loadShout(async () => null);
    const audio = fakeAudio();
    audio.state = "closed";
    // Act
    const played = await playShout(audio, new ArrayBuffer(8), 0);
    // Assert
    assert.equal(empty, "ShoutUnavailable");
    assert.equal(played, "ShoutUnavailable");
  });
});

describe("UNIT-001 openOrFocus", () => {
  it("窓が無いときは app.html を1つ作り、2回目は URL を渡さず前面へ出す", async () => {
    // Arrange
    const chromeApi = fakeChrome();
    // Act
    const first = await openOrFocus(chromeApi.windows, chromeApi.storage.session);
    const second = await openOrFocus(chromeApi.windows, chromeApi.storage.session);
    // Assert
    assert.equal(first, "opened");
    assert.equal(second, "focused");
    assert.equal(chromeApi.windowsMap.size, 1);
    const created = chromeApi.calls.find((call) => call[0] === "create")[1];
    assert.equal(created.url, "app.html");
    assert.equal(created.type, "popup");
    assert.equal(created.width, 480);
    assert.equal(created.height, 720);
    assert.equal(created.focused, true);
    const updated = chromeApi.calls.find((call) => call[0] === "update");
    assert.equal(updated[2].state, "normal");
    assert.equal(updated[2].focused, true);
    assert.equal(Object.hasOwn(updated[2], "url"), false);
  });

  it("update が失敗したときは鍵を消して作り直す", async () => {
    // Arrange
    const chromeApi = fakeChrome();
    await openOrFocus(chromeApi.windows, chromeApi.storage.session);
    chromeApi.failUpdate = true;
    // Act
    const again = await openOrFocus(chromeApi.windows, chromeApi.storage.session);
    // Assert
    assert.equal(again, "opened");
    assert.equal(chromeApi.windowsMap.size, 2);
  });

  it("create が失敗したときは WindowOpenFailed を返す", async () => {
    // Arrange
    const chromeApi = fakeChrome();
    chromeApi.failCreate = true;
    // Act
    const result = await openOrFocus(chromeApi.windows, chromeApi.storage.session);
    // Assert
    assert.equal(result, "WindowOpenFailed");
  });

  it("onClicked と onRemoved を登録し、閉じた窓の id を消す", async () => {
    // Arrange
    const chromeApi = fakeChrome();
    registerLauncher(chromeApi);
    await chromeApi.clicked[0]();
    const id = chromeApi.session.windowId;
    // Act
    await chromeApi.removed[0](id);
    // Assert
    assert.equal(chromeApi.clicked.length, 1);
    assert.equal(chromeApi.removed.length, 1);
    assert.equal(chromeApi.session.windowId, undefined);
    await forgetWindow(chromeApi.storage.session, 999);
    assert.equal(chromeApi.session.windowId, undefined);
  });
});
