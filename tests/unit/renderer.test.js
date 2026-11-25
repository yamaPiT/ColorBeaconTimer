/**
 * ファイル名： renderer.test.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： UNIT-010（日英常時併記画面描画・実ビューポート幅640px以上対応レスポンシブレイアウト・EXITボタン制御・説明文検証）の単体テストを実行する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-001, REQ-002, REQ-003, REQ-006, REQ-007, TC-004, TC-006, TC-008, TC-020, TC-056, TC-075, TC-076
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { render } from "../../extension/src/view/renderer.js";
import {
  validateManifestDescription,
  validatePopupViewportWidth,
} from "../system/harness.js";

/**
 * 関数名： createMockDom
 * 戻り値： render() 用のモック DOM 構造。
 * 引数： なし。
 * 関数の概要： Node.js 環境で renderer.js を検証するための軽量 DOM モックを生成する。
 * 対応機能ID（トレーサビリティ）： UNIT-010
 */
function createMockDom() {
  const ops = [];
  const el = () => {
    const attrs = {};
    return {
      hidden: false,
      disabled: false,
      textContent: "",
      className: "",
      style: { transform: "", width: "" },
      dataset: {},
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      getAttribute(k) {
        return attrs[k];
      },
    };
  };
  const canvas = {
    hidden: false,
    width: 700,
    height: 720,
    getContext() {
      return {
        clearRect: (...a) => ops.push(["clearRect", ...a]),
        beginPath: () => ops.push(["beginPath"]),
        arc: (...a) => ops.push(["arc", ...a]),
        fill: () => ops.push(["fill"]),
        fillStyle: "",
      };
    },
  };
  return {
    ops,
    dom: {
      app: el(),
      openingStage: el(),
      openingTitle: el(),
      openingImage: el(),
      openingLamp: el(),
      openingText: el(),
      openingNav: el(),
      btnOpeningBack: el(),
      btnOpeningNext: el(),
      timerUi: el(),
      beacon: el(),
      timeEl: el(),
      controls: el(),
      btnMinus: el(),
      btnStart: el(),
      btnPlus: el(),
      dotsCanvas: canvas,
      btnExit: el(),
    },
  };
}

test("UNIT-010 render", async (t) => {
  await t.test("未知の状態名は UnknownState を返し描画しない", () => {
    // Arrange
    const { dom } = createMockDom();
    // Act
    const res = render({ state: "invalid" }, dom);
    // Assert
    assert.equal(res, "UnknownState");
  });

  await t.test("app.html・app.css・store-listing.txt は 700x720(実ビューポート640px以上) 日英常時併記・言語切替ボタン非存在・スタート / START を満たし、640/639px境界と description 132/133文字境界を判定する (TC-075)", () => {
    // Arrange
    const html = fs.readFileSync(path.resolve("extension/app.html"), "utf8");
    const css = fs.readFileSync(path.resolve("extension/app.css"), "utf8");
    const storeText = fs.readFileSync(path.resolve("extension/store-listing.txt"), "utf8");
    const manifest = JSON.parse(fs.readFileSync(path.resolve("extension/manifest.json"), "utf8"));

    // Act
    const realVerdict = validateManifestDescription(manifest.description);
    const exact132 = "タイマー Countdown timer " + "a".repeat(132 - "タイマー Countdown timer ".length);
    const over133 = exact132 + "b";

    // Assert
    assert.equal(html.includes("opening-progress"), false);
    assert.equal(html.includes('role="progressbar"'), false);
    assert.equal(html.includes('id="opening-title"'), true);
    assert.equal(html.includes('id="opening-nav"'), true);
    assert.equal(html.includes('id="btn-opening-back"'), true);
    assert.equal(html.includes('id="btn-opening-next"'), true);
    assert.equal(html.includes('<button id="btn-exit" type="button" hidden>EXIT</button>'), true);
    assert.equal(html.includes(">スタート / START<"), true);
    assert.equal(html.includes('width="700" height="720"'), true);
    assert.equal(/lang|言語切替/i.test(html.replace('lang="ja"', "")), false);
    assert.equal(html.includes("This software was developed using the DADA (Document-and-Agent-Driven Agile) process."), true);
    assert.equal(css.includes("width: 100%;"), true);
    assert.equal(css.includes("height: 100%;"), true);
    assert.equal(css.includes("overflow: hidden;"), true);
    assert.equal(css.includes("box-sizing: border-box;"), true);
    assert.equal(css.includes("overflow-wrap: break-word;"), true);
    assert.equal(css.includes("z-index: 1;"), true);
    assert.equal(css.includes("#btn-exit"), true);
    assert.equal(css.includes("z-index: 2;"), true);
    assert.ok(/[\u3040-\u30ff\u4e00-\u9faf]/.test(storeText));
    assert.ok(/[A-Za-z]+\s+[A-Za-z]+/.test(storeText));
    assert.equal(validatePopupViewportWidth(640).ok, true);
    assert.equal(validatePopupViewportWidth(639).ok, false);
    assert.equal(realVerdict.ok, true);
    assert.equal(validateManifestDescription(exact132).ok, true);
    assert.equal(validateManifestDescription(over133).ok, false);
  });

  await t.test("setting 状態ではタイマーUIを表示しタイトル・前後ボタン・BGM属性を初期化し、endingDots 状態では Canvas を描画する", () => {
    // Arrange
    const { dom, ops } = createMockDom();
    // Act
    const rSetting = render({
      state: "setting",
      openingStep: "",
      openingSceneIndex: 0,
      openingImageKind: "none",
      openingScale: 1,
      openingBackVisible: false,
      openingNextVisible: false,
      openingBgmTrack: "none",
      openingBgmUrl: "",
      openingBgmLog: [{ action: "stop", trackKey: "none", atMs: 5100, activeCount: 0, loop: false }],
      settingMs: 120000,
      remainingMs: 120000,
      displayTime: "2:00",
      timeVisible: true,
      buttonsVisible: true,
      buttonsDisabled: false,
      beaconColor: "blue",
      beaconLit: true,
      dots: [],
      juwacchiUrl: "",
      blinkLog: [],
      marks: {},
    }, dom);
    // Assert
    assert.equal(rSetting, "ok");
    assert.equal(dom.timerUi.hidden, false);
    assert.equal(dom.dotsCanvas.hidden, true);
    assert.equal(dom.openingTitle.hidden, true);
    assert.equal(dom.openingTitle.textContent, "");
    assert.equal(dom.openingNav.hidden, true);
    assert.equal(dom.btnOpeningBack.hidden, true);
    assert.equal(dom.btnOpeningNext.hidden, true);
    assert.equal(dom.btnStart.disabled, false);
    assert.equal(dom.app.dataset.openingScene, "0");
    assert.equal(dom.app.dataset.openingImage, "none");
    assert.equal(dom.app.dataset.openingBackVisible, "false");
    assert.equal(dom.app.dataset.openingNextVisible, "false");
    assert.equal(dom.app.dataset.openingBgm, "none");
    assert.equal(dom.app.dataset.openingBgmUrl, "");
    assert.equal(dom.app.dataset.exitVisible, "false");
    assert.equal(dom.btnExit.hidden, true);
    assert.equal(dom.btnExit.disabled, true);
    assert.equal(JSON.parse(dom.app.dataset.openingBgmLog).length, 1);

    // Act (endingDots)
    const rDots = render({
      state: "endingDots",
      openingStep: "",
      openingSceneIndex: 0,
      openingImageKind: "none",
      openingScale: 1,
      openingBackVisible: false,
      openingNextVisible: false,
      openingBgmTrack: "none",
      openingBgmUrl: "",
      openingBgmLog: [],
      settingMs: 120000,
      remainingMs: 0,
      displayTime: "0:00",
      timeVisible: false,
      buttonsVisible: false,
      buttonsDisabled: true,
      beaconColor: "off",
      beaconLit: false,
      dots: [{ x: 250, y: 370, radius: 3, color: "#fff" }],
      exitVisible: true,
      juwacchiUrl: "",
      blinkLog: [],
      marks: {},
    }, dom);
    // Assert
    assert.equal(rDots, "ok");
    assert.equal(dom.timerUi.hidden, true);
    assert.equal(dom.timeEl.hidden, true);
    assert.equal(dom.controls.hidden, true);
    assert.equal(dom.btnMinus.hidden, true);
    assert.equal(dom.btnStart.hidden, true);
    assert.equal(dom.btnPlus.hidden, true);
    assert.equal(dom.dotsCanvas.hidden, false);
    assert.equal(dom.openingTitle.hidden, true);
    assert.equal(dom.openingNav.hidden, true);
    assert.equal(dom.btnOpeningBack.hidden, true);
    assert.equal(dom.btnOpeningNext.hidden, true);
    assert.equal(dom.app.dataset.dotsActive, "true");
    assert.equal(dom.app.dataset.exitVisible, "true");
    assert.equal(dom.btnExit.hidden, false);
    assert.equal(dom.btnExit.disabled, false);
    assert.equal(dom.btnExit.textContent, "EXIT");
    assert.ok(ops.some((op) => op[0] === "arc"));
  });

  await t.test("TC-076 endingDots 以外では viewModel.exitVisible が true でも EXIT ボタンを強制非表示・無効化し、btnExit 未指定モックとも互換性を保つ", () => {
    // Arrange
    const { dom } = createMockDom();
    const baseVm = {
      openingStep: "",
      openingSceneIndex: 0,
      openingImageKind: "none",
      openingScale: 1,
      openingBackVisible: false,
      openingNextVisible: false,
      openingBgmTrack: "none",
      openingBgmUrl: "",
      openingBgmLog: [],
      settingMs: 120000,
      remainingMs: 60000,
      displayTime: "1:00",
      timeVisible: true,
      buttonsVisible: true,
      buttonsDisabled: false,
      beaconColor: "blue",
      beaconLit: true,
      dots: [],
      exitVisible: true,
      juwacchiUrl: "",
      blinkLog: [],
      marks: {},
    };

    // Act & Assert
    for (const nonDotsState of ["opening", "setting", "countdown", "endingAudio"]) {
      render({ ...baseVm, state: nonDotsState }, dom);
      assert.equal(dom.btnExit.hidden, true, `${nonDotsState} では hidden=true`);
      assert.equal(dom.btnExit.disabled, true, `${nonDotsState} では disabled=true`);
      assert.equal(dom.app.dataset.exitVisible, "false", `${nonDotsState} では data-exit-visible=false`);
    }

    // btnExit なしの旧モック互換でも例外なく描画できる
    const { dom: legacyDom } = createMockDom();
    delete legacyDom.btnExit;
    assert.equal(render({ ...baseVm, state: "endingDots", exitVisible: true }, legacyDom), "ok");
  });

  await t.test("opening 5シーンでタイトル・新本文・画像・Back/NEXTボタン可視性・BGM観測属性・ランプ拡大を切り替える", () => {
    // Arrange
    const { dom } = createMockDom();
    const baseVm = {
      state: "opening",
      openingScale: 1,
      openingBgmTrack: "none",
      openingBgmUrl: "",
      openingBgmLog: [],
      settingMs: 120000,
      remainingMs: 120000,
      displayTime: "2:00",
      timeVisible: false,
      buttonsVisible: false,
      buttonsDisabled: true,
      beaconColor: "blue",
      beaconLit: true,
      dots: [],
      juwacchiUrl: "",
      blinkLog: [],
      marks: {},
    };

    // Act: scene1 (タイトル非表示, Back 非表示, NEXT 表示, 日英併記, BGM none)
    render({ ...baseVm, openingStep: "scene1", openingSceneIndex: 1, openingImageKind: "none", openingBackVisible: false, openingNextVisible: true }, dom);
    // Assert
    assert.equal(dom.openingTitle.hidden, true);
    assert.equal(dom.openingTitle.textContent, "");
    assert.equal(dom.openingText.hidden, false);
    assert.equal(dom.openingText.textContent, [
      "このソフトウェアは、 DADA（Document-and-Agent-Driven Agile）プロセスで開発しました。",
      "",
      "This software was developed using the DADA (Document-and-Agent-Driven Agile) process.",
    ].join("\n"));
    assert.equal(dom.openingImage.hidden, true);
    assert.equal(dom.openingLamp.hidden, true);
    assert.equal(dom.openingNav.hidden, false);
    assert.equal(dom.btnOpeningBack.hidden, true);
    assert.equal(dom.btnOpeningNext.hidden, false);
    assert.equal(dom.app.dataset.openingScene, "1");
    assert.equal(dom.app.dataset.openingBgm, "none");

    // Act: scene2 (連想ゲーム1 / Association Game 1 コロンなし・日英6行＋空行・fountain・BGM scene2)
    render({
      ...baseVm,
      openingStep: "scene2",
      openingSceneIndex: 2,
      openingImageKind: "fountain",
      openingBackVisible: true,
      openingNextVisible: true,
      openingBgmTrack: "scene2",
      openingBgmUrl: "chrome-extension://id/assets/audio/gymnopedie1.ogg",
      openingBgmLog: [{ action: "play", trackKey: "scene2", atMs: 100, activeCount: 1, loop: true, gain: 1.0 }],
    }, dom);
    // Assert
    assert.equal(dom.openingTitle.hidden, false);
    assert.equal(dom.openingTitle.textContent, "連想ゲーム1 / Association Game 1");
    assert.equal(dom.openingTitle.textContent.includes("："), false);
    assert.equal(dom.openingImage.hidden, false);
    assert.equal(dom.openingImage.getAttribute("src"), "assets/images/fountain-stieglitz.jpg");
    assert.equal(dom.openingText.textContent, [
      "・ダダと言えば、前衛的な芸術運動のダダイズム",
      '・中心人物の一人であるマルセル・デュシャンの代表作は、写真の大量生産の小便器を倒して "R.Mutt"と署名した「泉」。',
      "・流れる曲はダダにも関わったサティの名曲「ジムノペディ第1番」",
      "",
      '• Speaking of "Dada," it brings to mind Dadaism, the avant-garde art movement.',
      '• One of its key figures, Marcel Duchamp, created his iconic work "Fountain" (pictured) by turning a mass-produced urinal on its side and signing it "R.Mutt".',
      '• The music playing is "Gymnopédie No. 1," a masterpiece by Erik Satie, who was also associated with Dada.',
    ].join("\n"));
    assert.equal(dom.btnOpeningBack.hidden, false);
    assert.equal(dom.btnOpeningNext.hidden, false);
    assert.equal(dom.app.dataset.openingBgm, "scene2");
    assert.equal(dom.app.dataset.openingBgmUrl, "chrome-extension://id/assets/audio/gymnopedie1.ogg");

    // Act: scene3 (連想ゲーム2 / Association Game 2 コロンなし・改訂日英・threeFace・BGM scene3)
    render({
      ...baseVm,
      openingStep: "scene3",
      openingSceneIndex: 3,
      openingImageKind: "threeFace",
      openingBackVisible: true,
      openingNextVisible: true,
      openingBgmTrack: "scene3",
      openingBgmUrl: "chrome-extension://id/assets/audio/space-adventure-synth.wav",
    }, dom);
    // Assert
    assert.equal(dom.openingTitle.hidden, false);
    assert.equal(dom.openingTitle.textContent, "連想ゲーム2 / Association Game 2");
    assert.equal(dom.openingTitle.textContent.includes("："), false);
    assert.equal(dom.openingImage.hidden, false);
    assert.equal(dom.openingImage.getAttribute("src"), "assets/images/three-face-dadaism.svg");
    assert.equal(dom.openingText.textContent, [
      "・ダダと言えば、ダダイズムの影響を受けて命名された宇宙怪獣（1967年1月22日放送のTV番組）",
      "・お約束通りにヒーローに倒されたが根強い人気があり、スイス大使館で2016年に開催されたダダイズム100周年パーティーに招待された。",
      "・流れる曲は1970〜80年代レトロフューチャー風の宇宙冒険シンセサイザー音楽",
      "",
      '• Speaking of "Dada," it also brings to mind the space monster named under the influence of Dadaism (a TV show broadcast on January 22, 1967).',
      "• Although defeated by the hero as expected, it remained deeply popular and was invited to the Dadaism 100th Anniversary Party held at the Swiss Embassy in 2016.",
      "• The music playing is 1970s–80s retro-futuristic space-adventure synthesizer music.",
    ].join("\n"));
    assert.equal(dom.app.dataset.openingBgm, "scene3");

    // Act: scene4 (連想ゲーム3 / Association Game 3 コロンなし・日英・画像なし・BGM none)
    render({
      ...baseVm,
      openingStep: "scene4",
      openingSceneIndex: 4,
      openingImageKind: "none",
      openingBackVisible: true,
      openingNextVisible: true,
      openingBgmTrack: "none",
      openingBgmUrl: "",
    }, dom);
    // Assert
    assert.equal(dom.openingTitle.hidden, false);
    assert.equal(dom.openingTitle.textContent, "連想ゲーム3 / Association Game 3");
    assert.equal(dom.openingTitle.textContent.includes("："), false);
    assert.equal(dom.openingImage.hidden, true);
    assert.equal(dom.openingText.textContent, [
      "・ダダを倒したのは、胸にランプが光る、あのヒーロー。",
      "・そして、続くカラービームタイマーのプログラムは、DADA（Document-and-Agent-Driven Agile）プロセスで開発された",
      "",
      "• The one who defeated Dada was that hero with a glowing lamp on his chest.",
      "• And the ColorBeaconTimer program that follows was developed using the DADA (Document-and-Agent-Driven Agile) process.",
    ].join("\n"));
    assert.equal(dom.app.dataset.openingBgm, "none");

    // Act: scene5 (0.6x, タイトル・本文・画像・前後ボタンすべて非表示)
    render({ ...baseVm, openingStep: "scene5", openingSceneIndex: 5, openingImageKind: "blueLamp", openingScale: 0.6, openingBackVisible: false, openingNextVisible: false }, dom);
    // Assert
    assert.equal(dom.openingTitle.hidden, true);
    assert.equal(dom.openingTitle.textContent, "");
    assert.equal(dom.openingImage.hidden, true);
    assert.equal(dom.openingText.hidden, true);
    assert.equal(dom.openingNav.hidden, true);
    assert.equal(dom.btnOpeningBack.hidden, true);
    assert.equal(dom.btnOpeningNext.hidden, true);
    assert.equal(dom.openingLamp.hidden, false);
    assert.equal(dom.openingLamp.style.transform, "scale(0.6)");
  });
});
