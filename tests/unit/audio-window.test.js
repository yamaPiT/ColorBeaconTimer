/**
 * ファイル名： audio-window.test.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： UNIT-001（専用ウィンドウ起動・manifest 4.5.0）、UNIT-007（ピコン音）、UNIT-008（v4.5第3シーンシンセBGM/単一男性話者ジュワッチプロソディ・BGMゲイン制御・音量バランス・PCM WAV音質・ループ境界）の単体テストを実行する。
 * 対応機能ID（トレーサビリティ）： UNIT-001, UNIT-007, UNIT-008, REQ-001, REQ-005, REQ-006, TC-067, TC-068, TC-070, TC-071, TC-072, TC-074, TC-075, TC-077
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  analyzeJuwacchiProsody,
  evaluateBgmLoudnessBalance,
  evaluateJuwacchiLoudnessBalance,
  parseWavMetrics,
  validateJuwacchiProsody,
  validateLoopBoundaryQuality,
  validatePcmWavQuality,
} from "../system/harness.js";
import {
  forgetWindow,
  openOrFocus,
  registerLauncher,
} from "../../extension/src/background/window-launcher.js";
import { WINDOW_H, WINDOW_W } from "../../extension/src/domain/constants.js";
import { playPicon } from "../../extension/src/audio/picon-synth.js";
import {
  JUWACCHI_GAIN,
  loadJuwacchi,
  playJuwacchi,
} from "../../extension/src/audio/juwacchi-player.js";
import {
  createOpeningBgmPlayer,
  loadOpeningBgm,
  OPENING_BGM_ASSETS,
  OPENING_BGM_GAINS,
} from "../../extension/src/audio/opening-bgm-player.js";

test("UNIT-001 openOrFocus", async (t) => {
  await t.test("新規作成で opened、既存ありで URL なしの focused を返す", async () => {
    // Arrange
    let stored = {};
    const calls = [];
    const sessionStore = {
      async get() { return stored; },
      async set(val) { stored = { ...stored, ...val }; },
      async remove(key) { delete stored[key]; },
    };
    const windowsApi = {
      async create(opts) {
        calls.push(["create", opts]);
        return { id: 101 };
      },
      async get(id) {
        calls.push(["get", id]);
        return { id };
      },
      async update(id, opts) {
        calls.push(["update", id, opts]);
        return { id };
      },
    };
    // Act
    const r1 = await openOrFocus(windowsApi, sessionStore);
    const r2 = await openOrFocus(windowsApi, sessionStore);
    // Assert
    assert.equal(r1, "opened");
    assert.equal(r2, "focused");
    assert.equal(calls[0][0], "create");
    assert.equal(calls[0][1].width, WINDOW_W);
    assert.equal(calls[0][1].height, WINDOW_H);
    assert.equal(calls[2][0], "update");
    assert.equal("url" in calls[2][2], false);
  });

  await t.test("manifest.json は version 4.6.0 と 132文字以内の日英併記・DADA開発例 description を持つ (UNIT-001, TC-075, TC-077)", () => {
    // Arrange
    const manifest = JSON.parse(fs.readFileSync(path.resolve("extension/manifest.json"), "utf8"));
    // Act & Assert
    assert.equal(manifest.version, "4.6.0");
    assert.equal(
      manifest.description,
      "ColorBeaconTimer（DADAプロセスを用いたプログラム開発例）: 残時間に応じ色・点滅・音が変わるタイマー / Timer changing color, blink & sound (DADA development example)."
    );
    assert.equal(manifest.description.length, 126);
    assert.ok(manifest.description.length <= 132, `length=${manifest.description.length}`);
  });

  await t.test("ウィンドウ作成失敗時は WindowOpenFailed を送出する", async () => {
    // Arrange
    const sessionStore = {
      async get() { return {}; },
      async set() {},
      async remove() {},
    };
    const windowsApi = {
      async create() { throw new Error("boom"); },
    };
    // Act & Assert
    await assert.rejects(
      () => openOrFocus(windowsApi, sessionStore),
      /WindowOpenFailed/
    );
  });

  await t.test("onRemoved で sessionStore の windowId を削除する", async () => {
    // Arrange
    let stored = { windowId: 55 };
    const sessionStore = {
      async get() { return stored; },
      async set(v) { stored = v; },
      async remove(k) { delete stored[k]; },
    };
    let onRemovedHandler = null;
    const chromeApi = {
      action: { onClicked: { addListener() {} } },
      windows: { onRemoved: { addListener(fn) { onRemovedHandler = fn; } } },
      storage: { session: sessionStore },
    };
    // Act
    registerLauncher(chromeApi);
    await onRemovedHandler(55);
    // Assert
    assert.equal(stored.windowId, undefined);
    await forgetWindow(sessionStore, 99);
  });
});

test("UNIT-007 playPicon", async (t) => {
  await t.test("880Hz 正弦波を 80ms 再生する", () => {
    // Arrange
    const events = [];
    const ctx = {
      state: "running",
      currentTime: 1,
      destination: {},
      createOscillator() {
        return {
          type: "",
          frequency: { setValueAtTime(hz, s) { events.push(["freq", hz, s]); } },
          connect() {},
          start(s) { events.push(["start", s]); },
          stop(e) { events.push(["stop", e]); },
        };
      },
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
        };
      },
    };
    // Act
    const res = playPicon(ctx, 1.5);
    // Assert
    assert.deepEqual(res, { ok: true });
    assert.deepEqual(events[0], ["freq", 880, 1.5]);
    assert.deepEqual(events[1], ["start", 1.5]);
    assert.ok(Math.abs(events[2][1] - 1.58) < 1e-6);
  });

  await t.test("未定義または closed の AudioContext では AudioUnavailable を返す", () => {
    // Arrange & Act
    const r1 = playPicon(null, 0);
    const r2 = playPicon({ state: "closed" }, 0);
    // Assert
    assert.deepEqual(r1, { ok: false, error: "AudioUnavailable" });
    assert.deepEqual(r2, { ok: false, error: "AudioUnavailable" });
  });
});

test("UNIT-008 loadJuwacchi / playJuwacchi", async (t) => {
  await t.test("juwacchi.wav 読込成功と失敗（JuwacchiUnavailable）を正しく扱う", async () => {
    // Arrange
    const buf = new ArrayBuffer(16);
    // Act
    const okRes = await loadJuwacchi(async (p) => {
      assert.equal(p, "assets/audio/juwacchi.wav");
      return { buffer: buf, url: "chrome-extension://id/assets/audio/juwacchi.wav" };
    });
    const failRes = await loadJuwacchi(async () => {
      throw new Error("missing");
    });
    // Assert
    assert.equal(okRes.ok, true);
    assert.equal(okRes.buffer, buf);
    assert.deepEqual(failRes, { ok: false, error: "JuwacchiUnavailable" });
  });

  await t.test("playJuwacchi は GainNode(JUWACCHI_GAIN) 経由で接続し再生終了時に onEnded を呼び、失敗時は JuwacchiUnavailable を返す", () => {
    // Arrange
    let ended = false;
    let capturedSource = null;
    let capturedGain = null;
    const ctx = {
      state: "running",
      destination: { kind: "dest" },
      createBufferSource() {
        capturedSource = {
          buffer: null,
          onended: null,
          connectedTo: null,
          connect(dest) { this.connectedTo = dest; },
          start() {},
        };
        return capturedSource;
      },
      createGain() {
        capturedGain = {
          gain: { value: 1 },
          connectedTo: null,
          connect(dest) { this.connectedTo = dest; },
        };
        return capturedGain;
      },
    };
    // Act
    const okPlay = playJuwacchi(ctx, { duration: 0.7 }, () => { ended = true; });
    capturedSource.onended();
    const badPlay = playJuwacchi({ state: "closed" }, { duration: 0.7 }, () => {});
    const noGainPlay = playJuwacchi({ state: "running", createBufferSource: () => ({}) }, { duration: 0.7 }, () => {});
    // Assert
    assert.equal(JUWACCHI_GAIN, 0.17);
    assert.deepEqual(okPlay, { ok: true, gain: JUWACCHI_GAIN });
    assert.equal(capturedSource.connectedTo, capturedGain);
    assert.equal(capturedGain.connectedTo, ctx.destination);
    assert.equal(capturedGain.gain.value, JUWACCHI_GAIN);
    assert.equal(ended, true);
    assert.deepEqual(badPlay, { ok: false, error: "JuwacchiUnavailable" });
    assert.deepEqual(noGainPlay, { ok: false, error: "JuwacchiUnavailable" });
  });

  await t.test("同梱 juwacchi.wav の実音声長が 0.55〜0.85秒（目標 0.70秒）である", () => {
    // Arrange
    const buf = fs.readFileSync(path.resolve("extension/assets/audio/juwacchi.wav"));
    // Act
    const sampleRate = buf.readUInt32LE(24);
    const byteRate = buf.readUInt32LE(28);
    const dataSize = buf.readUInt32LE(40);
    const durationSec = dataSize / byteRate;
    // Assert
    assert.equal(sampleRate, 24000);
    assert.ok(durationSec >= 0.55 && durationSec <= 0.85, `durationSec=${durationSec}`);
  });
});

test("UNIT-008 loadOpeningBgm / createOpeningBgmPlayer", async (t) => {
  await t.test("OPENING_BGM_ASSETS / OPENING_BGM_GAINS と loadOpeningBgm は同梱相対パス・ゲイン定義を公開し異常時は BgmUnavailable を返す", async () => {
    // Arrange
    assert.deepEqual(OPENING_BGM_ASSETS, {
      scene2: "assets/audio/gymnopedie1.ogg",
      scene3: "assets/audio/space-adventure-synth.wav",
    });
    assert.deepEqual(OPENING_BGM_GAINS, {
      scene2: 1.0,
      scene3: 0.18,
    });
    assert.equal(Object.isFrozen(OPENING_BGM_GAINS), true);
    const dummyBuf = new ArrayBuffer(32);

    // Act
    const ok2 = await loadOpeningBgm("scene2", async (p) => {
      assert.equal(p, "assets/audio/gymnopedie1.ogg");
      return { buffer: dummyBuf, url: "chrome-extension://id/assets/audio/gymnopedie1.ogg" };
    });
    const ok3 = await loadOpeningBgm("scene3", async (p) => {
      assert.equal(p, "assets/audio/space-adventure-synth.wav");
      return { buffer: dummyBuf, url: "chrome-extension://id/assets/audio/space-adventure-synth.wav" };
    });
    const badTrack = await loadOpeningBgm("scene1", async () => ({ buffer: dummyBuf }));
    const emptyBuf = await loadOpeningBgm("scene2", async () => ({ buffer: new ArrayBuffer(0) }));
    const throwRead = await loadOpeningBgm("scene3", async () => {
      throw new Error("missing");
    });

    // Assert
    assert.equal(ok2.ok, true);
    assert.equal(ok2.trackKey, "scene2");
    assert.equal(ok3.ok, true);
    assert.equal(ok3.trackKey, "scene3");
    assert.deepEqual(badTrack, { ok: false, error: "BgmUnavailable" });
    assert.deepEqual(emptyBuf, { ok: false, error: "BgmUnavailable" });
    assert.deepEqual(throwRead, { ok: false, error: "BgmUnavailable" });
  });

  await t.test("playLoop は GainNode(OPENING_BGM_GAINS[trackKey]) 経由で接続し、stop で source と gain の両方を停止・切断する", async () => {
    // Arrange
    const sources = [];
    const gains = [];
    const ctx = {
      state: "running",
      destination: { kind: "dest" },
      createBufferSource() {
        const src = {
          buffer: null,
          loop: false,
          startedAt: null,
          stoppedAt: null,
          disconnected: false,
          connectedTo: null,
          connect(dest) { this.connectedTo = dest; },
          start(when) { this.startedAt = when; },
          stop(when) { this.stoppedAt = when; },
          disconnect() { this.disconnected = true; },
        };
        sources.push(src);
        return src;
      },
      createGain() {
        const g = {
          gain: { value: 1 },
          disconnected: false,
          connectedTo: null,
          connect(dest) { this.connectedTo = dest; },
          disconnect() { this.disconnected = true; },
        };
        gains.push(g);
        return g;
      },
    };
    const player = createOpeningBgmPlayer(
      () => ctx,
      async (trackKey) => ({
        ok: true,
        audioBuffer: { trackKey },
        url: `chrome-extension://id/${OPENING_BGM_ASSETS[trackKey]}`,
      })
    );

    // Act: scene2 再生 -> scene3 切替 -> stop
    const r2 = await player.playLoop("scene2");
    assert.equal(r2.ok, true);
    assert.equal(r2.gain, 1.0);
    assert.equal(player.getActiveTrack(), "scene2");
    assert.equal(player.getActiveCount(), 1);
    assert.equal(sources[0].loop, true);
    assert.equal(sources[0].startedAt, 0);
    assert.equal(sources[0].connectedTo, gains[0]);
    assert.equal(gains[0].connectedTo, ctx.destination);
    assert.equal(gains[0].gain.value, 1.0);

    const r3 = await player.playLoop("scene3");
    assert.equal(r3.ok, true);
    assert.equal(r3.gain, 0.18);
    assert.equal(sources[0].stoppedAt, 0);
    assert.equal(sources[0].disconnected, true);
    assert.equal(gains[0].disconnected, true);
    assert.equal(player.getActiveTrack(), "scene3");
    assert.equal(player.getActiveCount(), 1);
    assert.equal(sources[1].loop, true);
    assert.equal(sources[1].startedAt, 0);
    assert.equal(sources[1].connectedTo, gains[1]);
    assert.equal(gains[1].connectedTo, ctx.destination);
    assert.equal(gains[1].gain.value, 0.18);

    player.stop();
    // Assert
    assert.equal(sources[1].stoppedAt, 0);
    assert.equal(sources[1].disconnected, true);
    assert.equal(gains[1].disconnected, true);
    assert.equal(player.getActiveTrack(), "none");
    assert.equal(player.getActiveCount(), 0);
  });

  await t.test("高速連打時に requestId 世代管理で旧要求をキャンセルし、同時再生数を常に 1 以下に保つ", async () => {
    // Arrange
    const resolvers = [];
    const sources = [];
    const gains = [];
    const ctx = {
      state: "running",
      destination: {},
      createBufferSource() {
        const src = {
          buffer: null,
          loop: false,
          connect() {},
          start() {},
          stop() {},
          disconnect() {},
        };
        sources.push(src);
        return src;
      },
      createGain() {
        const g = {
          gain: { value: 1 },
          connect() {},
          disconnect() {},
        };
        gains.push(g);
        return g;
      },
    };
    const player = createOpeningBgmPlayer(
      () => ctx,
      (trackKey) => new Promise((resolve) => {
        resolvers.push({ trackKey, resolve });
      })
    );

    // Act: 連続で scene2 -> scene3 -> scene2 を呼び、逆順で解決する
    const p1 = player.playLoop("scene2");
    const p2 = player.playLoop("scene3");
    const p3 = player.playLoop("scene2");

    resolvers[2].resolve({ ok: true, audioBuffer: { id: 3 }, url: "url3" });
    resolvers[1].resolve({ ok: true, audioBuffer: { id: 2 }, url: "url2" });
    resolvers[0].resolve({ ok: true, audioBuffer: { id: 1 }, url: "url1" });

    const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

    // Assert: 最後の要求だけが再生され、古い2件は cancelled: true
    assert.deepEqual(res1, { ok: false, cancelled: true });
    assert.deepEqual(res2, { ok: false, cancelled: true });
    assert.equal(res3.ok, true);
    assert.equal(res3.gain, 1.0);
    assert.equal(sources.length, 1);
    assert.equal(gains.length, 1);
    assert.equal(player.getActiveTrack(), "scene2");
    assert.equal(player.getActiveCount(), 1);

    // Act: 読込中に stop() が呼ばれた場合も再生されない
    const p4 = player.playLoop("scene3");
    player.stop();
    resolvers[3].resolve({ ok: true, audioBuffer: { id: 4 }, url: "url4" });
    const res4 = await p4;
    assert.deepEqual(res4, { ok: false, cancelled: true });
    assert.equal(sources.length, 1);
    assert.equal(player.getActiveTrack(), "none");
    assert.equal(player.getActiveCount(), 0);
  });

  await t.test("AudioContext 不可・createGain不可・デコード失敗・未知トラックでは例外を出さず BgmUnavailable と無音状態を保つ", async () => {
    // Arrange
    const closedPlayer = createOpeningBgmPlayer(
      () => ({ state: "closed" }),
      async () => ({ ok: true, audioBuffer: {} })
    );
    const throwingCtxPlayer = createOpeningBgmPlayer(
      () => { throw new Error("no device"); },
      async () => ({ ok: true, audioBuffer: {} })
    );
    const noGainPlayer = createOpeningBgmPlayer(
      () => ({ state: "running", destination: {}, createBufferSource() { return {}; } }),
      async () => ({ ok: true, audioBuffer: {} })
    );
    const decodeFailPlayer = createOpeningBgmPlayer(
      () => ({
        state: "running",
        destination: {},
        createBufferSource() { return {}; },
        createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; },
      }),
      async () => ({ ok: false, error: "BgmUnavailable" })
    );

    // Act
    const rClosed = await closedPlayer.playLoop("scene2");
    const rThrow = await throwingCtxPlayer.playLoop("scene3");
    const rNoGain = await noGainPlayer.playLoop("scene3");
    const rFail = await decodeFailPlayer.playLoop("scene2");
    const rUnknown = await decodeFailPlayer.playLoop("scene1");

    // Assert
    assert.deepEqual(rClosed, { ok: false, error: "BgmUnavailable" });
    assert.deepEqual(rThrow, { ok: false, error: "BgmUnavailable" });
    assert.deepEqual(rNoGain, { ok: false, error: "BgmUnavailable" });
    assert.deepEqual(rFail, { ok: false, error: "BgmUnavailable" });
    assert.deepEqual(rUnknown, { ok: false, error: "BgmUnavailable" });
    assert.equal(noGainPlayer.getActiveTrack(), "none");
    assert.equal(noGainPlayer.getActiveCount(), 0);
    assert.equal(decodeFailPlayer.getActiveTrack(), "none");
    assert.equal(decodeFailPlayer.getActiveCount(), 0);
  });

  await t.test("TC-074 境界値・異常系：BGM 実効音量バランス判定ロジックの ±3.0 dB 境界・境界外側・クリッピングを正確に判定する", () => {
    // Arrange
    const baseRms2 = 0.03544; // ~ -29.01 dBFS
    const rmsAtPlus3 = baseRms2 * Math.pow(10, 3.0 / 20);
    const rmsAtMinus3 = baseRms2 * Math.pow(10, -3.0 / 20);
    const rmsAtPlus31 = baseRms2 * Math.pow(10, 3.1 / 20);
    const rmsAtMinus31 = baseRms2 * Math.pow(10, -3.1 / 20);

    // 実設計値検証: scene2 (-29.01 dBFS, gain 1.0) vs scene3 (-14.12 dBFS, gain 0.18)
    const rms2Real = Math.pow(10, -29.01 / 20);
    const rms3Real = Math.pow(10, -14.12 / 20);

    // Act & Assert
    const designVerdict = evaluateBgmLoudnessBalance(rms2Real, 1.0, rms3Real, 0.18, 0.88, 0.85);
    assert.equal(designVerdict.ok, true);
    assert.ok(designVerdict.absDiffDb <= 3.0, `absDiffDb=${designVerdict.absDiffDb}`);

    const passPlus3 = evaluateBgmLoudnessBalance(baseRms2, 1.0, rmsAtPlus3, 1.0, 0.8, 0.8);
    const passMinus3 = evaluateBgmLoudnessBalance(baseRms2, 1.0, rmsAtMinus3, 1.0, 0.8, 0.8);
    assert.equal(passPlus3.ok, true);
    assert.equal(passMinus3.ok, true);

    const failPlus31 = evaluateBgmLoudnessBalance(baseRms2, 1.0, rmsAtPlus31, 1.0, 0.8, 0.8);
    const failMinus31 = evaluateBgmLoudnessBalance(baseRms2, 1.0, rmsAtMinus31, 1.0, 0.8, 0.8);
    assert.equal(failPlus31.ok, false);
    assert.ok(failPlus31.reasons.includes("LoudnessDiffExceedsLimit"));
    assert.equal(failMinus31.ok, false);
    assert.ok(failMinus31.reasons.includes("LoudnessDiffExceedsLimit"));

    const failClip = evaluateBgmLoudnessBalance(baseRms2, 1.0, baseRms2, 1.0, 0.8, 1.0);
    assert.equal(failClip.ok, false);
    assert.equal(failClip.clipped, true);
    assert.ok(failClip.reasons.includes("PlaybackClippingDetected"));
  });

  await t.test("TC-067 同梱 gymnopedie1.ogg (OggS) と space-adventure-synth.wav (44.1kHz以上 16bit ステレオ PCM WAV・振幅0.30〜0.95・接続点差0.05以下・無音ギャップ0.05秒未満) の形式と品質が正しい", () => {
    // Arrange
    const oggBuf = fs.readFileSync(path.resolve("extension/assets/audio/gymnopedie1.ogg"));
    const wavBuf = fs.readFileSync(path.resolve("extension/assets/audio/space-adventure-synth.wav"));

    // Act
    const oggMagic = oggBuf.subarray(0, 4).toString("ascii");
    const metrics = parseWavMetrics(wavBuf);
    const quality = validatePcmWavQuality(metrics);
    const loopQuality = validateLoopBoundaryQuality(metrics);

    // Assert
    assert.equal(oggMagic, "OggS");
    assert.ok(oggBuf.length > 100000);
    assert.equal(metrics.validRiffWave, true);
    assert.equal(metrics.isPcm, true);
    assert.equal(metrics.audioFormat, 1);
    assert.ok(metrics.sampleRate >= 44100, `sampleRate=${metrics.sampleRate}`);
    assert.equal(metrics.bitsPerSample, 16);
    assert.equal(metrics.channels, 2);
    assert.ok(metrics.durationSec >= 8 && metrics.durationSec <= 16, `durationSec=${metrics.durationSec}`);
    assert.ok(metrics.maxLrDiff > 0, `maxLrDiff=${metrics.maxLrDiff}`);
    assert.ok(metrics.maxNormAmp >= 0.30 && metrics.maxNormAmp <= 0.95, `maxNormAmp=${metrics.maxNormAmp}`);
    assert.ok(metrics.joinNormDiff <= 0.05, `joinNormDiff=${metrics.joinNormDiff}`);
    assert.ok(metrics.boundarySilenceSec < 0.05, `boundarySilenceSec=${metrics.boundarySilenceSec}`);
    assert.equal(quality.ok, true, `reasons=${quality.reasons.join(",")}`);
    assert.equal(loopQuality.ok, true, `reasons=${loopQuality.reasons.join(",")}`);
  });

  await t.test("TC-068 境界値・異常系：PCM WAV 音質および接続点振幅差の境界合格・境界不合格を正確に判定する", () => {
    // Arrange: 合成 WAV バッファ生成ヘルパ
    const buildTestWav = ({
      audioFormat = 1,
      sampleRate = 44100,
      bitsPerSample = 16,
      channels = 2,
      frames = 100,
      peakInt = 16384,
      tailInt = 0,
      headInt = 0,
      identicalLR = false,
    } = {}) => {
      const bytesPerSample = bitsPerSample / 8;
      const blockAlign = channels * bytesPerSample;
      const dataBytes = frames * blockAlign;
      const buf = Buffer.alloc(44 + dataBytes);
      buf.write("RIFF", 0, "ascii");
      buf.writeUInt32LE(36 + dataBytes, 4);
      buf.write("WAVE", 8, "ascii");
      buf.write("fmt ", 12, "ascii");
      buf.writeUInt32LE(16, 16);
      buf.writeUInt16LE(audioFormat, 20);
      buf.writeUInt16LE(channels, 22);
      buf.writeUInt32LE(sampleRate, 24);
      buf.writeUInt32LE(sampleRate * blockAlign, 28);
      buf.writeUInt16LE(blockAlign, 32);
      buf.writeUInt16LE(bitsPerSample, 34);
      buf.write("data", 36, "ascii");
      buf.writeUInt32LE(dataBytes, 40);

      for (let f = 0; f < frames; f += 1) {
        for (let c = 0; c < channels; c += 1) {
          const pos = 44 + (f * channels + c) * bytesPerSample;
          let val = 4000;
          if (f === 0) val = headInt;
          else if (f === frames - 1) val = tailInt;
          else if (f === Math.floor(frames / 2)) val = peakInt;
          else val = Math.round(4000 * Math.sin(f * 0.2 + (identicalLR ? 0 : c * 1.1)));
          if (bitsPerSample === 16) {
            buf.writeInt16LE(Math.max(-32768, Math.min(32767, val)), pos);
          } else {
            buf.writeUInt8(Math.max(0, Math.min(255, 128 + Math.round(val / 256))), pos);
          }
        }
      }
      return buf;
    };

    // 境界合格サンプル (44100Hz, 16bit, 2ch, maxNorm 0.30 と 0.95, joinDiff 0.05)
    const validLowPeak = buildTestWav({ peakInt: 9831, headInt: 0, tailInt: 1638 }); // ~0.30002, join ~0.04999
    const validHighPeak = buildTestWav({ peakInt: 31129, headInt: 0, tailInt: 1638 }); // ~0.94998, join ~0.04999
    const exactBoundaryLow = validatePcmWavQuality({
      validRiffWave: true, isPcm: true, audioFormat: 1, sampleRate: 44100, bitsPerSample: 16, channels: 2,
      maxLrDiff: 500, maxNormAmp: 0.30, joinNormDiff: 0.05,
    });
    const exactBoundaryHigh = validatePcmWavQuality({
      validRiffWave: true, isPcm: true, audioFormat: 1, sampleRate: 44100, bitsPerSample: 16, channels: 2,
      maxLrDiff: 500, maxNormAmp: 0.95, joinNormDiff: 0.05,
    });

    // 境界不合格サンプル (44099Hz, 8bit, 1ch, 0.29, 0.96, joinDiff 0.06, 非PCM)
    const badRate = buildTestWav({ sampleRate: 44099 });
    const badBits = buildTestWav({ bitsPerSample: 8 });
    const badMono = buildTestWav({ channels: 1 });
    const badPeakLow = buildTestWav({ peakInt: 9502 }); // ~0.28998 < 0.30
    const badPeakHigh = buildTestWav({ peakInt: 31458 }); // ~0.96002 > 0.95
    const badJoin = buildTestWav({ headInt: 0, tailInt: 1967 }); // ~0.06003 > 0.05
    const badNonPcm = buildTestWav({ audioFormat: 3 });

    // Act & Assert
    assert.equal(validatePcmWavQuality(validLowPeak).ok, true);
    assert.equal(validatePcmWavQuality(validHighPeak).ok, true);
    assert.equal(exactBoundaryLow.ok, true);
    assert.equal(exactBoundaryHigh.ok, true);

    assert.equal(validatePcmWavQuality(badRate).ok, false);
    assert.ok(validatePcmWavQuality(badRate).reasons.includes("SampleRateBelow44100"));

    assert.equal(validatePcmWavQuality(badBits).ok, false);
    assert.ok(validatePcmWavQuality(badBits).reasons.includes("BitsPerSampleNot16"));

    assert.equal(validatePcmWavQuality(badMono).ok, false);
    assert.ok(validatePcmWavQuality(badMono).reasons.includes("ChannelsNotStereo2"));

    assert.equal(validatePcmWavQuality(badPeakLow).ok, false);
    assert.ok(validatePcmWavQuality(badPeakLow).reasons.includes("PeakAmplitudeOutOfRange"));

    assert.equal(validatePcmWavQuality(badPeakHigh).ok, false);
    assert.ok(validatePcmWavQuality(badPeakHigh).reasons.includes("PeakAmplitudeOutOfRange"));

    assert.equal(validatePcmWavQuality(badJoin).ok, false);
    assert.ok(validatePcmWavQuality(badJoin).reasons.includes("LoopJoinDiffExceedsLimit"));

    assert.equal(validatePcmWavQuality(badNonPcm).ok, false);
    assert.ok(validatePcmWavQuality(badNonPcm).reasons.includes("NonPcmOrInvalidWav"));

    assert.equal(validatePcmWavQuality({
      validRiffWave: true, isPcm: true, audioFormat: 1, sampleRate: 44100, bitsPerSample: 16, channels: 2,
      maxLrDiff: 500, maxNormAmp: 0.29, joinNormDiff: 0.05,
    }).ok, false);
    assert.equal(validatePcmWavQuality({
      validRiffWave: true, isPcm: true, audioFormat: 1, sampleRate: 44100, bitsPerSample: 16, channels: 2,
      maxLrDiff: 500, maxNormAmp: 0.96, joinNormDiff: 0.05,
    }).ok, false);
    assert.equal(validatePcmWavQuality({
      validRiffWave: true, isPcm: true, audioFormat: 1, sampleRate: 44100, bitsPerSample: 16, channels: 2,
      maxLrDiff: 500, maxNormAmp: 0.50, joinNormDiff: 0.06,
    }).ok, false);
  });

  await t.test("TC-070 境界値・異常系：ループ境界無音ギャップ（0.049秒 vs 0.050秒）と接続点振幅差（0.05 vs 0.06）を正確に判定する", () => {
    // Arrange
    const passBoundary = validateLoopBoundaryQuality({ boundarySilenceSec: 0.049, joinNormDiff: 0.05 });
    const failSilence = validateLoopBoundaryQuality({ boundarySilenceSec: 0.050, joinNormDiff: 0.05 });
    const failJoin = validateLoopBoundaryQuality({ boundarySilenceSec: 0.049, joinNormDiff: 0.06 });

    // 実合成 WAV による無音ギャップ境界検証 (44100Hz: 2160フレーム=0.04898s < 0.05s, 2205フレーム=0.050s >= 0.05s)
    const makeSilenceBoundaryWav = (tailSilenceFrames) => {
      const sr = 44100;
      const totalFrames = 4410;
      const buf = Buffer.alloc(44 + totalFrames * 4);
      buf.write("RIFF", 0, "ascii");
      buf.writeUInt32LE(36 + totalFrames * 4, 4);
      buf.write("WAVE", 8, "ascii");
      buf.write("fmt ", 12, "ascii");
      buf.writeUInt32LE(16, 16);
      buf.writeUInt16LE(1, 20);
      buf.writeUInt16LE(2, 22);
      buf.writeUInt32LE(sr, 24);
      buf.writeUInt32LE(sr * 4, 28);
      buf.writeUInt16LE(4, 32);
      buf.writeUInt16LE(16, 34);
      buf.write("data", 36, "ascii");
      buf.writeUInt32LE(totalFrames * 4, 40);
      for (let f = 0; f < totalFrames - tailSilenceFrames; f += 1) {
        buf.writeInt16LE(1000, 44 + f * 4);
        buf.writeInt16LE(-1000, 44 + f * 4 + 2);
      }
      return buf;
    };

    const wavPass = validateLoopBoundaryQuality(makeSilenceBoundaryWav(2160));
    const wavFail = validateLoopBoundaryQuality(makeSilenceBoundaryWav(2205));

    // Act & Assert
    assert.equal(passBoundary.ok, true);
    assert.equal(failSilence.ok, false);
    assert.ok(failSilence.reasons.includes("LoopSilenceGapExceedsLimit"));
    assert.equal(failJoin.ok, false);
    assert.ok(failJoin.reasons.includes("LoopJoinDiffExceedsLimit"));
    assert.equal(wavPass.ok, true, `boundarySilenceSec=${wavPass.boundarySilenceSec}`);
    assert.equal(wavFail.ok, false, `boundarySilenceSec=${wavFail.boundarySilenceSec}`);
  });

  await t.test("TC-071 同梱 juwacchi.wav の PCM形式・発音時間(0.55〜0.85秒)・全体ピーク(0.85〜0.99)・全区間RMS(0.20以上)・全体F0中央値(110〜180Hz)・前後半各区間F0中央値(85〜200Hz)・後半35%ピーク比(0.25〜0.85)・後半3〜8kHz帯域RMS抑止が全要件を満たす", () => {
    // Arrange
    const wavBuf = fs.readFileSync(path.resolve("extension/assets/audio/juwacchi.wav"));

    // Act
    const metrics = analyzeJuwacchiProsody(wavBuf);
    const verdict = validateJuwacchiProsody(wavBuf);

    // Assert
    assert.equal(metrics.validRiffWave, true);
    assert.equal(metrics.isPcm, true);
    assert.equal(metrics.sampleRate, 24000);
    assert.equal(metrics.bitsPerSample, 16);
    assert.equal(metrics.channels, 1);
    assert.ok(metrics.durationSec >= 0.55 && metrics.durationSec <= 0.85, `durationSec=${metrics.durationSec}`);
    assert.ok(metrics.overallPeak >= 0.85 && metrics.overallPeak <= 0.99, `overallPeak=${metrics.overallPeak}`);
    assert.ok(metrics.overallRms >= 0.20, `overallRms=${metrics.overallRms}`);
    assert.ok(metrics.overallRmsDbfs >= -14.0, `overallRmsDbfs=${metrics.overallRmsDbfs}`);
    assert.equal(metrics.clipped, false);
    assert.ok(metrics.voicedF0MedianHz >= 110 && metrics.voicedF0MedianHz <= 180, `F0=${metrics.voicedF0MedianHz}`);
    assert.ok(metrics.firstHalfVoicedF0Count > 0, "firstHalfVoicedF0Count>0");
    assert.ok(metrics.firstHalfVoicedF0MedianHz >= 85 && metrics.firstHalfVoicedF0MedianHz <= 200, `firstF0=${metrics.firstHalfVoicedF0MedianHz}`);
    assert.ok(metrics.secondHalfVoicedF0Count > 0, "secondHalfVoicedF0Count>0");
    assert.ok(metrics.secondHalfVoicedF0MedianHz >= 85 && metrics.secondHalfVoicedF0MedianHz <= 200, `secondF0=${metrics.secondHalfVoicedF0MedianHz}`);
    assert.equal(metrics.hasFemaleVoiceRange, false);
    assert.ok(metrics.secondHalfPeakRatio >= 0.25 && metrics.secondHalfPeakRatio <= 0.85, `ratio=${metrics.secondHalfPeakRatio}`);
    assert.ok(metrics.secondHalfHighBandRms <= metrics.firstHalfFullBandRms, `high=${metrics.secondHalfHighBandRms}, first=${metrics.firstHalfFullBandRms}`);
    assert.equal(verdict.ok, true, `reasons=${verdict.reasons.join(",")}`);
  });

  await t.test("TC-072 境界値・異常系：v4.6 単一成人男性話者ジュワッチ音声定量検証の境界合格・境界不合格および実合成異常WAVを正確に判定する", () => {
    // Arrange: 基準合格メトリクス
    const baseValid = {
      validRiffWave: true,
      isPcm: true,
      channels: 1,
      bitsPerSample: 16,
      sampleRate: 24000,
      durationSec: 0.70,
      overallPeak: 0.95,
      overallRms: 0.22,
      overallRmsDbfs: -13.15,
      clipped: false,
      voicedF0Count: 36,
      voicedF0MedianHz: 136,
      firstHalfVoicedF0Count: 27,
      firstHalfVoicedF0MedianHz: 142,
      secondHalfVoicedF0Count: 9,
      secondHalfVoicedF0MedianHz: 110,
      hasFemaleVoiceRange: false,
      secondHalfPeakRatio: 0.54,
      firstHalfFullBandRms: 0.26,
      secondHalfHighBandRms: 0.03,
      secondHalfHighBandToFirstRmsRatio: 0.11,
    };

    const passBoundaryCases = [
      { ...baseValid, durationSec: 0.55 },
      { ...baseValid, durationSec: 0.85 },
      { ...baseValid, overallPeak: 0.85 },
      { ...baseValid, overallPeak: 0.99 },
      { ...baseValid, overallRms: 0.20 },
      { ...baseValid, voicedF0MedianHz: 110 },
      { ...baseValid, voicedF0MedianHz: 180 },
      { ...baseValid, firstHalfVoicedF0MedianHz: 85 },
      { ...baseValid, firstHalfVoicedF0MedianHz: 200 },
      { ...baseValid, secondHalfVoicedF0MedianHz: 85 },
      { ...baseValid, secondHalfVoicedF0MedianHz: 200 },
      { ...baseValid, secondHalfPeakRatio: 0.25 },
      { ...baseValid, secondHalfPeakRatio: 0.85 },
      { ...baseValid, secondHalfHighBandRms: 0.15, firstHalfFullBandRms: 0.15, secondHalfHighBandToFirstRmsRatio: 1.00 },
    ];

    const failBoundaryCases = [
      [{ ...baseValid, validRiffWave: false }, "InvalidWavFormat"],
      [{ ...baseValid, isPcm: false }, "InvalidWavFormat"],
      [{ ...baseValid, sampleRate: 23999 }, "UnexpectedAudioParams"],
      [{ ...baseValid, bitsPerSample: 8 }, "UnexpectedAudioParams"],
      [{ ...baseValid, channels: 2 }, "UnexpectedAudioParams"],
      [{ ...baseValid, durationSec: 0.54 }, "DurationOutOfRange"],
      [{ ...baseValid, durationSec: 0.86 }, "DurationOutOfRange"],
      [{ ...baseValid, overallPeak: 0.84 }, "OverallPeakOrClippingInvalid"],
      [{ ...baseValid, overallPeak: 1.00 }, "OverallPeakOrClippingInvalid"],
      [{ ...baseValid, clipped: true }, "OverallPeakOrClippingInvalid"],
      [{ ...baseValid, overallRms: 0.19 }, "OverallRmsTooLow"],
      [{ ...baseValid, voicedF0MedianHz: 109 }, "F0OutOfMaleRange"],
      [{ ...baseValid, voicedF0MedianHz: 181 }, "F0OutOfMaleRange"],
      [{ ...baseValid, voicedF0MedianHz: 220, hasFemaleVoiceRange: true }, "F0OutOfMaleRange"],
      [{ ...baseValid, firstHalfVoicedF0MedianHz: 84 }, "SegmentF0OutOfMaleRange"],
      [{ ...baseValid, firstHalfVoicedF0MedianHz: 201 }, "SegmentF0OutOfMaleRange"],
      [{ ...baseValid, secondHalfVoicedF0MedianHz: 84 }, "SegmentF0OutOfMaleRange"],
      [{ ...baseValid, secondHalfVoicedF0MedianHz: 201 }, "SegmentF0OutOfMaleRange"],
      [{ ...baseValid, secondHalfVoicedF0Count: 0 }, "SegmentF0OutOfMaleRange"],
      [{ ...baseValid, secondHalfPeakRatio: 0.24 }, "SecondHalfPeakRatioOutOfRange"],
      [{ ...baseValid, secondHalfPeakRatio: 0.86 }, "SecondHalfPeakRatioOutOfRange"],
      [{ ...baseValid, secondHalfHighBandRms: 0.1515, firstHalfFullBandRms: 0.15, secondHalfHighBandToFirstRmsRatio: 1.01 }, "SecondHalfHighBandTooLoud"],
    ];

    // 実合成モノラル WAV 生成ヘルパ
    const buildMonoWav = ({ sampleRate = 24000, bitsPerSample = 16, channels = 1, audioFormat = 1, durationSec = 0.70 }, fn) => {
      const frames = Math.round(sampleRate * durationSec);
      const bytesPerSample = bitsPerSample / 8;
      const blockAlign = channels * bytesPerSample;
      const dataBytes = frames * blockAlign;
      const buf = Buffer.alloc(44 + dataBytes);
      buf.write("RIFF", 0, "ascii");
      buf.writeUInt32LE(36 + dataBytes, 4);
      buf.write("WAVE", 8, "ascii");
      buf.write("fmt ", 12, "ascii");
      buf.writeUInt32LE(16, 16);
      buf.writeUInt16LE(audioFormat, 20);
      buf.writeUInt16LE(channels, 22);
      buf.writeUInt32LE(sampleRate, 24);
      buf.writeUInt32LE(sampleRate * blockAlign, 28);
      buf.writeUInt16LE(blockAlign, 32);
      buf.writeUInt16LE(bitsPerSample, 34);
      buf.write("data", 36, "ascii");
      buf.writeUInt32LE(dataBytes, 40);
      for (let i = 0; i < frames; i += 1) {
        const s = fn(i, sampleRate);
        for (let c = 0; c < channels; c += 1) {
          const pos = 44 + (i * channels + c) * bytesPerSample;
          if (bitsPerSample === 16) {
            const val = Math.max(-32768, Math.min(32767, Math.round(s * 32768)));
            buf.writeInt16LE(val, pos);
          } else {
            const val = Math.max(0, Math.min(255, 128 + Math.round(s * 128)));
            buf.writeUInt8(val, pos);
          }
        }
      }
      return buf;
    };

    const validMaleSynth = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      return t < 0.455 ? 0.90 * Math.sin(2 * Math.PI * 155 * t) : 0.50 * Math.sin(2 * Math.PI * 150 * t);
    });
    const femaleF0Wav = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      return t < 0.455 ? 0.90 * Math.sin(2 * Math.PI * 240 * t) : 0.50 * Math.sin(2 * Math.PI * 240 * t);
    });
    const segmentF0FailWav = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      return t < 0.455 ? 0.90 * Math.sin(2 * Math.PI * 145 * t) : 0.50 * Math.sin(2 * Math.PI * 240 * t);
    });
    const lowRmsWav = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      if (t < 0.03) return 0.90 * Math.sin(2 * Math.PI * 155 * t);
      if (t < 0.455) return 0.12 * Math.sin(2 * Math.PI * 155 * t);
      if (t < 0.485) return 0.45 * Math.sin(2 * Math.PI * 150 * t);
      return 0.0;
    });
    const lowPeakRatioWav = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      return t < 0.455 ? 0.90 * Math.sin(2 * Math.PI * 155 * t) : 0.18 * Math.sin(2 * Math.PI * 150 * t);
    });
    const highBandLoudWav = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      if (t < 0.07) return 0.90 * Math.sin(2 * Math.PI * 155 * t);
      if (t < 0.455) return 0.10 * Math.sin(2 * Math.PI * 155 * t);
      return 0.60 * Math.sin(2 * Math.PI * 5000 * t);
    });
    const clippedWav = buildMonoWav({}, (i, sr) => {
      const t = i / sr;
      return t < 0.455 ? 0.99997 * Math.sin(2 * Math.PI * 155 * t) : 0.55 * Math.sin(2 * Math.PI * 150 * t);
    });
    const badRateWav = buildMonoWav({ sampleRate: 23999 }, (i, sr) => 0.90 * Math.sin(2 * Math.PI * 155 * (i / sr)));
    const shortWav = buildMonoWav({ durationSec: 0.54 }, (i, sr) => 0.90 * Math.sin(2 * Math.PI * 155 * (i / sr)));

    // Act & Assert
    for (const c of passBoundaryCases) {
      const r = validateJuwacchiProsody(c);
      assert.equal(r.ok, true, `Expected pass for ${JSON.stringify(c)}, got ${r.reasons.join(",")}`);
    }
    for (const [c, expectedReason] of failBoundaryCases) {
      const r = validateJuwacchiProsody(c);
      assert.equal(r.ok, false, `Expected fail (${expectedReason})`);
      assert.ok(r.reasons.includes(expectedReason), `Expected ${expectedReason}, got ${r.reasons.join(",")}`);
    }

    assert.equal(validateJuwacchiProsody(validMaleSynth).ok, true);
    const rFemale = validateJuwacchiProsody(femaleF0Wav);
    assert.equal(rFemale.ok, false);
    assert.ok(rFemale.reasons.includes("F0OutOfMaleRange"));

    const rSegF0 = validateJuwacchiProsody(segmentF0FailWav);
    assert.equal(rSegF0.ok, false);
    assert.ok(rSegF0.reasons.includes("SegmentF0OutOfMaleRange"));

    const rLowRms = validateJuwacchiProsody(lowRmsWav);
    assert.equal(rLowRms.ok, false);
    assert.ok(rLowRms.reasons.includes("OverallRmsTooLow"));

    const rLowPeak = validateJuwacchiProsody(lowPeakRatioWav);
    assert.equal(rLowPeak.ok, false);
    assert.ok(rLowPeak.reasons.includes("SecondHalfPeakRatioOutOfRange"));

    const rHighLoud = validateJuwacchiProsody(highBandLoudWav);
    assert.equal(rHighLoud.ok, false);
    assert.ok(rHighLoud.reasons.includes("SecondHalfHighBandTooLoud"));

    const rClip = validateJuwacchiProsody(clippedWav);
    assert.equal(rClip.ok, false);
    assert.ok(rClip.reasons.includes("OverallPeakOrClippingInvalid"));

    const rRate = validateJuwacchiProsody(badRateWav);
    assert.equal(rRate.ok, false);
    assert.ok(rRate.reasons.includes("UnexpectedAudioParams"));

    const rShort = validateJuwacchiProsody(shortWav);
    assert.equal(rShort.ok, false);
    assert.ok(rShort.reasons.includes("DurationOutOfRange"));
  });

  await t.test("TC-078 同梱 juwacchi.wav と JUWACCHI_GAIN の再生時実効音量が第2・第3シーン BGM と ±3.0 dB 以内かつ非クリッピングである", () => {
    // Arrange
    const wavBuf = fs.readFileSync(path.resolve("extension/assets/audio/juwacchi.wav"));
    const metrics = analyzeJuwacchiProsody(wavBuf);
    // 第2シーン gymnopedie1.ogg 実測 RMS 0.03544 (-29.01 dBFS), 第3シーン space-adventure-synth.wav 実測 RMS 0.1969 (gain=0.18 -> -29.01 dBFS)
    const scene2Rms = 0.03544;
    const scene3Rms = 0.1969;

    // Act
    const verdict = evaluateJuwacchiLoudnessBalance(
      scene2Rms,
      OPENING_BGM_GAINS.scene2,
      scene3Rms,
      OPENING_BGM_GAINS.scene3,
      metrics.overallRms,
      JUWACCHI_GAIN,
      0.80,
      0.85,
      metrics.overallPeak
    );

    // Assert
    assert.equal(verdict.ok, true, `reasons=${verdict.reasons.join(",")}`);
    assert.ok(Math.abs(verdict.diffVsScene2Db) <= 3.0, `diffVsScene2Db=${verdict.diffVsScene2Db}`);
    assert.ok(Math.abs(verdict.diffVsScene3Db) <= 3.0, `diffVsScene3Db=${verdict.diffVsScene3Db}`);
    assert.equal(verdict.clipped, false);
  });

  await t.test("TC-079 境界値・異常系：ジュワッチ再生時実効音量バランス判定の許容境界（±3.0 dB）・境界外側（±3.1 dB）・クリッピングを正確に判定する", () => {
    // Arrange
    const baseRms = 0.03544; // -29.01 dBFS
    const rmsPlus30 = baseRms * Math.pow(10, 3.0 / 20);
    const rmsMinus30 = baseRms * Math.pow(10, -3.0 / 20);
    const rmsPlus31 = baseRms * Math.pow(10, 3.1 / 20);
    const rmsMinus31 = baseRms * Math.pow(10, -3.1 / 20);

    // Act
    const passPlus30 = evaluateJuwacchiLoudnessBalance(baseRms, 1.0, baseRms, 1.0, rmsPlus30, 1.0, 0.80, 0.80, 0.95);
    const passMinus30 = evaluateJuwacchiLoudnessBalance(baseRms, 1.0, baseRms, 1.0, rmsMinus30, 1.0, 0.80, 0.80, 0.95);
    const failPlus31 = evaluateJuwacchiLoudnessBalance(baseRms, 1.0, baseRms, 1.0, rmsPlus31, 1.0, 0.80, 0.80, 0.95);
    const failMinus31 = evaluateJuwacchiLoudnessBalance(baseRms, 1.0, baseRms, 1.0, rmsMinus31, 1.0, 0.80, 0.80, 0.95);
    const failClip = evaluateJuwacchiLoudnessBalance(baseRms, 1.0, baseRms, 1.0, baseRms, 1.0, 0.80, 0.80, 1.00);

    // Assert
    assert.equal(passPlus30.ok, true);
    assert.equal(passMinus30.ok, true);
    assert.equal(failPlus31.ok, false);
    assert.ok(failPlus31.reasons.includes("LoudnessDiffExceedsLimit"));
    assert.equal(failMinus31.ok, false);
    assert.ok(failMinus31.reasons.includes("LoudnessDiffExceedsLimit"));
    assert.equal(failClip.ok, false);
    assert.ok(failClip.reasons.includes("PlaybackClippingDetected"));
  });
});
