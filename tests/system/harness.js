/**
 * ファイル名： harness.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： Playwright 同梱の Chromium で拡張機能を読み込み（viewport: null で実ポップアップ描画）、EXITボタン計測・音声品質解析・BGM音量バランス判定・v4.5第3シーンシンセBGM/単一男性話者ジュワッチプロソディ解析・実ビューポート境界判定・README/配布文書権利検査を行う。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, ADR-002, ADR-006, ADR-015, ADR-016, TC-067, TC-068, TC-069, TC-070, TC-071, TC-072, TC-073, TC-074, TC-075, TC-076, TC-077
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * 関数名： launchExtension
 * 戻り値： context、worker、extensionId、userDataDir、httpRequests、consoleErrors、pageErrors。
 * 引数： extensionPath は拡張機能ディレクトリの絶対パス、options は initScript 等の任意設定。
 * 関数の概要： --load-extension と Extensions.triggerAction 用の引数で persistent context を開く。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節
 */
export async function launchExtension(extensionPath, options = {}) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbt-profile-"));
  const defaultExe = chromium.executablePath();
  const fallbackExe = path.join(
    process.env.LOCALAPPDATA || "",
    "ms-playwright",
    "chromium-1208",
    "chrome-win64",
    "chrome.exe"
  );
  const executablePath = fs.existsSync(defaultExe)
    ? defaultExe
    : (fs.existsSync(fallbackExe) ? fallbackExe : undefined);
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: false,
    viewport: null,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--enable-unsafe-extension-debugging",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-sync",
      "--disable-default-apps",
      "--disable-client-side-phishing-detection",
      "--no-first-run",
    ],
  });

  if (options.initScript) {
    await context.addInitScript(options.initScript);
  }

  const httpRequests = [];
  const pageErrors = [];
  context.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      httpRequests.push(url);
    }
  });
  context.on("page", (p) => {
    p.on("pageerror", (err) => {
      pageErrors.push(String(err));
    });
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
  }
  const extensionId = new URL(worker.url()).host;
  return { context, worker, extensionId, userDataDir, httpRequests, pageErrors };
}

/**
 * 関数名： triggerAction
 * 戻り値： なし。
 * 引数： context と拡張 ID。
 * 関数の概要： ツールバーの拡張機能アイコンをクリックする。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, REQ-001
 */
export async function triggerAction(context, extensionId) {
  const page = context.pages().find((item) => !item.url().includes("app.html"))
    || await context.newPage();
  if (!page.url().startsWith("data:")) {
    await page.goto("data:text/html,<title>tab</title>");
  }
  await page.bringToFront();
  const browser = context.browser();
  const client = await browser.newBrowserCDPSession();
  const { targetInfos } = await client.send("Target.getTargets", {
    filter: [{ type: "tab" }],
  });
  const tabs = (targetInfos || []).filter((info) => info.type === "tab");
  if (tabs.length === 0) {
    throw new Error("タブターゲットが無い");
  }
  const before = new Set(appPages(context));
  let sent = await clickTabs(client, extensionId, tabs);
  const appeared = await waitForNewApp(context, before, 3000);
  if (appeared || before.size > 0 || (sent > 0 && appPages(context).length > 0)) {
    if (appPages(context).length > before.size || before.size > 0) {
      return;
    }
  }
  sent += await clickTabs(client, extensionId, tabs);
  if (sent === 0) {
    throw new Error("ツールバーのアイコンをクリックできなかった");
  }
}

/**
 * 関数名： clickTabs
 * 戻り値： クリックを送れたタブの数。
 * 引数： client、extensionId、tabs。
 * 関数の概要： タブターゲットへ Extensions.triggerAction を送信する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, REQ-001
 */
async function clickTabs(client, extensionId, tabs) {
  let sent = 0;
  const nonAppTabs = tabs.filter((tab) => !String(tab.url || "").includes("app.html"));
  const candidates = nonAppTabs.length > 0 ? [nonAppTabs[0]] : tabs;
  for (const tab of candidates) {
    try {
      await client.send("Extensions.triggerAction", {
        id: extensionId,
        targetId: tab.targetId,
      });
      sent += 1;
      break;
    } catch {
      // 専用ウィンドウのタブはアクションを受けないためスキップする。
    }
  }
  return sent;
}

/**
 * 関数名： appPages
 * 戻り値： app.html を開いているページの配列。
 * 引数： context。
 * 関数の概要： 専用ウィンドウのページのみを返す。
 * 対応機能ID（トレーサビリティ）： TC-001, REQ-001
 */
export function appPages(context) {
  return context.pages().filter((page) => page.url().includes("app.html"));
}

/**
 * 関数名： waitForNewApp
 * 戻り値： 新しく開いた専用ウィンドウ（タイムアウト時は null）。
 * 引数： context, previous, timeoutMs。
 * 関数の概要： app.html が開き data-state が付与されるまで待機する。
 * 対応機能ID（トレーサビリティ）： TC-001, REQ-001
 */
export async function waitForNewApp(context, previous, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = appPages(context).find((page) => !previous.has(page));
    if (found) {
      await found.waitForSelector("#app[data-state]");
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  return null;
}

/**
 * 関数名： waitForApp
 * 戻り値： 新しく開いた専用ウィンドウ。
 * 引数： context, previous。
 * 関数の概要： 専用ウィンドウが開くまで待機する。
 * 対応機能ID（トレーサビリティ）： TC-001, REQ-001
 */
export async function waitForApp(context, previous) {
  const found = await waitForNewApp(context, previous, 10000);
  if (!found) {
    throw new Error("専用ウィンドウが開かなかった");
  }
  return found;
}

/**
 * 関数名： closeApps
 * 戻り値： なし。
 * 引数： context。
 * 関数の概要： 開いている専用ウィンドウをすべて閉じる。
 * 対応機能ID（トレーサビリティ）： REQ-003
 */
export async function closeApps(context) {
  for (const page of appPages(context)) {
    await page.close();
  }
}

/**
 * 関数名： readApp
 * 戻り値： #app の観測属性と画面状態・要素矩形。
 * 引数： page は専用ウィンドウ。
 * 関数の概要： v4.0 の data-* 属性、BGM状態、時刻表示、ボタン一覧、オープニング要素と矩形等を取得する。
 * 対応機能ID（トレーサビリティ）： SW205 第5節
 */
export async function readApp(page) {
  return page.evaluate(() => {
    const rectOf = (el) => {
      if (!el || el.hidden) {
        return null;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        return null;
      }
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const app = document.querySelector("#app");
    const openingStage = document.querySelector("#opening-stage");
    const timerUi = document.querySelector("#timer-ui");
    const dotsCanvas = document.querySelector("#dots-canvas");
    const openingTitle = document.querySelector("#opening-title");
    const openingImage = document.querySelector("#opening-image");
    const openingLamp = document.querySelector("#opening-lamp");
    const openingText = document.querySelector("#opening-text");
    const openingNav = document.querySelector("#opening-nav");
    const btnOpeningBack = document.querySelector("#btn-opening-back");
    const btnOpeningNext = document.querySelector("#btn-opening-next");
    const progressEl = document.querySelector("#opening-progress") || document.querySelector('[role="progressbar"]');
    const beacon = document.querySelector("#beacon");
    const timeEl = document.querySelector("#time");
    const btnMinus = document.querySelector("#btn-minus");
    const btnStart = document.querySelector("#btn-start");
    const btnPlus = document.querySelector("#btn-plus");
    const btnExit = document.querySelector("#btn-exit");
    const buttons = Array.from(document.querySelectorAll("button")).map((b) => ({
      id: b.id,
      text: b.textContent,
      disabled: b.disabled,
      hidden: b.hidden,
    }));
    const visibleButtons = buttons.filter((b) => !b.hidden);
    const hasLangToggleButton = buttons.some((b) =>
      /lang|language|english|japanese|locale|言語|英語|日本語|切替|切り替え|toggle/i.test(`${b.id} ${b.text}`)
    );
    return {
      state: app.dataset.state,
      openingStep: app.dataset.openingStep || "",
      openingScene: Number(app.dataset.openingScene || "0"),
      openingImageKind: app.dataset.openingImage || "none",
      openingScale: Number(app.dataset.openingScale),
      openingBackVisible: app.dataset.openingBackVisible === "true",
      openingNextVisible: app.dataset.openingNextVisible === "true",
      openingBgmTrack: app.dataset.openingBgm || "none",
      openingBgmUrl: app.dataset.openingBgmUrl || "",
      openingBgmLog: JSON.parse(app.dataset.openingBgmLog || "[]"),
      openingProgressExists: Boolean(progressEl),
      openingTitleHidden: openingTitle ? openingTitle.hidden : true,
      openingTitleText: openingTitle ? openingTitle.textContent : "",
      openingImageHidden: openingImage ? openingImage.hidden : true,
      openingImageSrc: openingImage ? openingImage.getAttribute("src") || "" : "",
      openingImageComplete: openingImage ? openingImage.complete && openingImage.naturalWidth > 0 : false,
      openingLampHidden: openingLamp ? openingLamp.hidden : true,
      openingTextHidden: openingText ? openingText.hidden : true,
      openingTextContent: openingText ? openingText.textContent : "",
      openingNavHidden: openingNav ? openingNav.hidden : true,
      backHidden: btnOpeningBack ? btnOpeningBack.hidden : true,
      backText: btnOpeningBack ? btnOpeningBack.textContent : "",
      nextHidden: btnOpeningNext ? btnOpeningNext.hidden : true,
      nextText: btnOpeningNext ? btnOpeningNext.textContent : "",
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      appScroll: {
        scrollWidth: app.scrollWidth,
        scrollHeight: app.scrollHeight,
        clientWidth: app.clientWidth,
        clientHeight: app.clientHeight,
      },
      openingStageScroll: openingStage ? {
        scrollWidth: openingStage.scrollWidth,
        scrollHeight: openingStage.scrollHeight,
        clientWidth: openingStage.clientWidth,
        clientHeight: openingStage.clientHeight,
      } : null,
      openingTitleScroll: openingTitle ? {
        scrollWidth: openingTitle.scrollWidth,
        scrollHeight: openingTitle.scrollHeight,
        clientWidth: openingTitle.clientWidth,
        clientHeight: openingTitle.clientHeight,
      } : null,
      openingTextScroll: openingText ? {
        scrollWidth: openingText.scrollWidth,
        scrollHeight: openingText.scrollHeight,
        clientWidth: openingText.clientWidth,
        clientHeight: openingText.clientHeight,
      } : null,
      hasLangToggleButton,
      rects: {
        title: rectOf(openingTitle),
        image: rectOf(openingImage),
        lamp: rectOf(openingLamp),
        text: rectOf(openingText),
        nav: rectOf(openingNav),
        back: rectOf(btnOpeningBack),
        next: rectOf(btnOpeningNext),
        beacon: rectOf(beacon),
        time: rectOf(timeEl),
        minus: rectOf(btnMinus),
        start: rectOf(btnStart),
        plus: rectOf(btnPlus),
        exit: rectOf(btnExit),
      },
      settingMs: Number(app.dataset.settingMs),
      remainingMs: Number(app.dataset.remainingMs),
      displayTime: app.dataset.displayTime,
      beaconColor: app.dataset.beaconColor,
      beaconLit: app.dataset.beaconLit === "true",
      juwacchiUrl: app.dataset.juwacchiUrl || "",
      blinkLog: JSON.parse(app.dataset.blinkLog || "[]"),
      marks: JSON.parse(app.dataset.marks || "{}"),
      dotsActive: app.dataset.dotsActive === "true",
      exitVisible: app.dataset.exitVisible === "true",
      exitHidden: btnExit ? btnExit.hidden : true,
      exitText: btnExit ? btnExit.textContent : "",
      timerUiHidden: timerUi ? timerUi.hidden : true,
      dotsCanvasHidden: dotsCanvas ? dotsCanvas.hidden : true,
      timeText: timeEl ? timeEl.textContent : "",
      bodyText: document.body.innerText,
      buttons,
      visibleButtons,
    };
  });
}

/**
 * 関数名： waitForState
 * 戻り値： 指定状態到達後の観測値。
 * 引数： page, state, timeoutMs。
 * 関数の概要： data-state が指定状態になるまで待機して readApp を返す。
 * 対応機能ID（トレーサビリティ）： SW205 第5節
 */
export async function waitForState(page, state, timeoutMs = 10000) {
  await page.waitForFunction(
    (expected) => {
      const app = document.querySelector("#app");
      return app && app.dataset.state === expected;
    },
    state,
    { timeout: timeoutMs }
  );
  return readApp(page);
}

/**
 * 関数名： waitForBgmTrack
 * 戻り値： BGM 状態到達後の観測値。
 * 引数： page, expectedTrack, timeoutMs。
 * 関数の概要： data-opening-bgm が指定トラックになるまで待機して readApp を返す。
 * 対応機能ID（トレーサビリティ）： SW205 第5節, TC-059, TC-060
 */
export async function waitForBgmTrack(page, expectedTrack, timeoutMs = 2000) {
  await page.waitForFunction(
    (track) => {
      const app = document.querySelector("#app");
      return app && app.dataset.openingBgm === track;
    },
    expectedTrack,
    { timeout: timeoutMs }
  );
  return readApp(page);
}

/**
 * 関数名： skipOpeningToSetting
 * 戻り値： 設定画面遷移後の観測値。
 * 引数： page は専用ウィンドウ。
 * 関数の概要： 第1〜第4シーンを NEXT ボタンで進め、第5シーンの画面クリックで設定画面へ遷移する。
 * 対応機能ID（トレーサビリティ）： REQ-001
 */
export async function skipOpeningToSetting(page) {
  for (let i = 0; i < 4; i += 1) {
    await page.click("#btn-opening-next");
  }
  await page.waitForFunction(() => {
    const app = document.querySelector("#app");
    return app && app.dataset.openingStep === "scene5";
  }, null, { timeout: 3000 });
  await page.click("#opening-stage");
  return waitForState(page, "setting", 2000);
}

/**
 * 関数名： setSettingMs
 * 戻り値： なし。
 * 引数： page, targetMs。
 * 関数の概要： ＋・−ボタンをクリックして目標の設定時刻へ合わせる。
 * 対応機能ID（トレーサビリティ）： REQ-002
 */
export async function setSettingMs(page, targetMs) {
  let current = (await readApp(page)).settingMs;
  let guard = 0;
  while (current !== targetMs && guard < 30) {
    await page.click(current > targetMs ? "#btn-minus" : "#btn-plus");
    current = (await readApp(page)).settingMs;
    guard += 1;
  }
  if (current !== targetMs) {
    throw new Error(`設定時刻を ${targetMs} に合わせられなかった: ${current}`);
  }
}

/**
 * 関数名： copyWithoutJuwacchi
 * 戻り値： 複製先のパス。
 * 引数： source, dest。
 * 関数の概要： 拡張機能ディレクトリを複製し、juwacchi.wav だけを削除する。
 * 対応機能ID（トレーサビリティ）： TC-036, ADR-006
 */
export function copyWithoutJuwacchi(source, dest) {
  fs.cpSync(source, dest, { recursive: true });
  const wav = path.join(dest, "assets", "audio", "juwacchi.wav");
  if (fs.existsSync(wav)) {
    fs.rmSync(wav);
  }
  return dest;
}

/**
 * 関数名： copyWithoutBgmAsset
 * 戻り値： 複製先のパス。
 * 引数： source, dest, filename。
 * 関数の概要： 拡張機能ディレクトリを複製し、指定の BGM 音声ファイルだけを削除する。
 * 対応機能ID（トレーサビリティ）： TC-063, ADR-006
 */
export function copyWithoutBgmAsset(source, dest, filename) {
  fs.cpSync(source, dest, { recursive: true });
  const target = path.join(dest, "assets", "audio", filename);
  if (fs.existsSync(target)) {
    fs.rmSync(target);
  }
  return dest;
}

/**
 * 関数名： copyWithCorruptBgmAsset
 * 戻り値： 複製先のパス。
 * 引数： source, dest, filename。
 * 関数の概要： 拡張機能ディレクトリを複製し、指定の BGM 音声ファイルを不正バイト列で上書きする。
 * 対応機能ID（トレーサビリティ）： TC-063, ADR-006
 */
export function copyWithCorruptBgmAsset(source, dest, filename) {
  fs.cpSync(source, dest, { recursive: true });
  const target = path.join(dest, "assets", "audio", filename);
  fs.writeFileSync(target, Buffer.from("CORRUPTED_AUDIO_HEADER_FOR_TEST_ONLY"));
  return dest;
}

/**
 * 関数名： forbiddenNames
 * 戻り値： 禁止名称リストの8文字列。
 * 引数： sw105Path。
 * 関数の概要： SW105 第1.3節の禁止名称リストから8文字列を抽出する。
 * 対応機能ID（トレーサビリティ）： TC-037, TC-058, REQ-006
 */
export function forbiddenNames(sw105Path) {
  const text = fs.readFileSync(sw105Path, "utf8");
  const row = text.split("\n").find((line) => line.startsWith("| 禁止名称リスト |"));
  if (!row) {
    throw new Error("禁止名称リストの行が無い");
  }
  const cell = row.split("|")[2] || "";
  const start = cell.indexOf("作品名は");
  const end = cell.indexOf("英字とローマ字は大文字");
  const slice = cell.slice(start, end);
  const names = [];
  const pattern = /「([^」]+)」/g;
  let found = pattern.exec(slice);
  while (found) {
    names.push(found[1]);
    found = pattern.exec(slice);
  }
  if (names.length !== 8) {
    throw new Error(`禁止名称リストを8件読めなかった: ${names.length}`);
  }
  return names;
}

/**
 * 関数名： forbiddenEduTerms
 * 戻り値： 旧教育用途の禁止5語句。
 * 引数： sw105Path。
 * 関数の概要： SW105 第4.2節 REQ-006 処理（11）から旧教育用途の禁止5語句を抽出する。
 * 対応機能ID（トレーサビリティ）： TC-077, REQ-006
 */
export function forbiddenEduTerms(sw105Path) {
  const text = fs.readFileSync(sw105Path, "utf8");
  const line = text.split("\n").find((ln) => ln.includes("あわせて、文書内に") && ln.includes("を記載しない"));
  if (!line) {
    throw new Error("旧教育用途の禁止5語句の行が無い");
  }
  const start = line.indexOf("あわせて、文書内に");
  const end = line.indexOf("を記載しない", start);
  const slice = line.slice(start, end);
  const terms = [];
  const pattern = /「([^」]+)」/g;
  let found = pattern.exec(slice);
  while (found) {
    terms.push(found[1]);
    found = pattern.exec(slice);
  }
  if (terms.length !== 5) {
    throw new Error(`旧教育用途の禁止5語句を5件読めなかった: ${terms.length}`);
  }
  return terms;
}

/**
 * 関数名： containsName
 * 戻り値： ヒットした名称の配列。
 * 引数： text, names。
 * 関数の概要： 大文字・小文字を区別せず部分一致で禁止名称を検出する。
 * 対応機能ID（トレーサビリティ）： TC-037, TC-058, TC-066, REQ-006
 */
export function containsName(text, names) {
  const lower = String(text).toLowerCase();
  return names.filter((name) => lower.includes(String(name).toLowerCase()));
}

/**
 * 関数名： checkExtensionFilenames
 * 戻り値： 禁止名称にヒットしたファイルパスの配列。
 * 引数： extDir は検査対象ディレクトリ、names は禁止名称リスト。
 * 関数の概要： extension/ 配下の全ファイル名・ディレクトリ名に対して大文字・小文字非区別で禁止名称を検査する。
 * 対応機能ID（トレーサビリティ）： TC-037, TC-066, REQ-006
 */
export function checkExtensionFilenames(extDir, names) {
  const hits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (containsName(entry.name, names).length > 0) {
        hits.push(full);
      }
      if (entry.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(extDir);
  return hits;
}

/**
 * 関数名： checkRequiredAttributionSection
 * 戻り値： なし（missing 配列へ追記する）。
 * 引数： sectionText, prefix, missing, hashes。
 * 関数の概要： クレジットまたはライセンス節内に4分類および第2・第3シーン BGM 必要項目が揃っているかを検査する。
 * 対応機能ID（トレーサビリティ）： TC-041, TC-065, TC-066, REQ-006
 */
function checkRequiredAttributionSection(sectionText, prefix, missing, hashes) {
  const lower = sectionText.toLowerCase();
  if (!sectionText.includes("File:Marcel_Duchamp,_1917,_Fountain,_photograph_by_Alfred_Stieglitz.jpg")) {
    missing.push(`${prefix}:泉ファイル名`);
  }
  if (!sectionText.includes("PD-1923")) {
    missing.push(`${prefix}:PD-1923`);
  }
  if (!sectionText.includes("1946")) {
    missing.push(`${prefix}:1946年没`);
  }
  if (!sectionText.includes("VOICEVOX:玄野武宏")) {
    missing.push(`${prefix}:VOICEVOX:玄野武宏`);
  }
  if (!sectionText.includes("gymnopedie1.ogg")) {
    missing.push(`${prefix}:gymnopedie1.ogg`);
  }
  if (!sectionText.includes("エリック・サティ") && !lower.includes("erik satie")) {
    missing.push(`${prefix}:作曲者`);
  }
  if (!sectionText.includes("Robin Alciatore")) {
    missing.push(`${prefix}:演奏者`);
  }
  if (!sectionText.includes("https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg")) {
    missing.push(`${prefix}:ジムノペディ取得元URL`);
  }
  if (!lower.includes("public domain")) {
    missing.push(`${prefix}:ジムノペディライセンス`);
  }
  if (!sectionText.includes("1925")) {
    missing.push(`${prefix}:1925年作曲者没`);
  }
  if (!sectionText.includes("space-adventure-synth.wav")) {
    missing.push(`${prefix}:space-adventure-synth.wav`);
  }
  if (
    !sectionText.includes("オリジナル") ||
    (!sectionText.includes("複製") && !sectionText.includes("模倣")) ||
    (!sectionText.includes("1970") && !sectionText.includes("レトロフューチャー"))
  ) {
    missing.push(`${prefix}:第3シーンBGM制作方針`);
  }
  if (
    !sectionText.includes("アルペジオベース") ||
    !sectionText.includes("シンセリード") ||
    (!sectionText.includes("シンセパッド") && !sectionText.includes("コード")) ||
    !sectionText.includes("残響")
  ) {
    missing.push(`${prefix}:第3シーンBGM4要素`);
  }
  if (
    (!sectionText.includes("44100") && !sectionText.includes("44.1kHz")) ||
    !sectionText.includes("16bit") ||
    !sectionText.includes("ステレオ") ||
    !sectionText.includes("0.30") ||
    !sectionText.includes("0.95") ||
    !sectionText.includes("0.05")
  ) {
    missing.push(`${prefix}:第3シーンBGM音質仕様`);
  }
  if (!sectionText.includes("MIT License")) {
    missing.push(`${prefix}:MIT License`);
  }
  if (!sectionText.includes("0.18") || (!sectionText.includes("音量") && !sectionText.includes("dB"))) {
    missing.push(`${prefix}:第3シーンBGM音量調整`);
  }
  if (!sectionText.includes("three-face-dadaism.svg")) {
    missing.push(`${prefix}:three-face-dadaism.svg`);
  }
  if (!sectionText.includes("juwacchi.wav")) {
    missing.push(`${prefix}:juwacchi.wav`);
  }
  if (!sectionText.includes("男性") || (!sectionText.includes("一括音声合成") && !sectionText.includes("一括合成"))) {
    missing.push(`${prefix}:juwacchi単一男性話者一括合成方針`);
  }
  if (
    !sectionText.includes("0.17") ||
    !sectionText.includes("0.55") ||
    !sectionText.includes("0.20") ||
    !sectionText.includes("110") ||
    !sectionText.includes("180") ||
    !sectionText.includes("85") ||
    !sectionText.includes("200") ||
    !sectionText.includes("0.25") ||
    !sectionText.includes("0.85")
  ) {
    missing.push(`${prefix}:juwacchi単一男性声定量仕様`);
  }
  if (!sectionText.includes("日英") || !sectionText.includes("言語切替ボタンなし")) {
    missing.push(`${prefix}:日英併記仕様`);
  }
  if (!sectionText.includes("640px")) {
    missing.push(`${prefix}:実ビューポート幅640px仕様`);
  }
  if (!sectionText.includes("EXIT")) {
    missing.push(`${prefix}:EXITボタン仕様`);
  }
  if (hashes.fountain && !lower.includes(hashes.fountain.toLowerCase())) {
    missing.push(`${prefix}:泉SHA-256`);
  }
  if (hashes.gymnopedie1 && !lower.includes(hashes.gymnopedie1.toLowerCase())) {
    missing.push(`${prefix}:ジムノペディSHA-256`);
  }
  if (hashes.spaceAdventureSynth && !lower.includes(hashes.spaceAdventureSynth.toLowerCase())) {
    missing.push(`${prefix}:space-adventure-synthSHA-256`);
  }
  if (hashes.juwacchi && !lower.includes(hashes.juwacchi.toLowerCase())) {
    missing.push(`${prefix}:juwacchiSHA-256`);
  }
}

/**
 * 関数名： checkAttributionDocs
 * 戻り値： { ok: boolean, missing: string[] }。
 * 引数： readmeText, licenseText, sourcesText（任意）, hashes（任意）, storeText（任意）。
 * 関数の概要： README.md（クレジット節・ライセンス節）、LICENSE（Third-Party Notices 節）、SOURCES.md、および store-listing.txt の必須記載と SHA-256 を検証する。
 * 対応機能ID（トレーサビリティ）： TC-041, TC-058, TC-065, TC-066, REQ-006
 */
export function checkAttributionDocs(readmeText, licenseText, sourcesText = null, hashes = {}, storeText = null) {
  const missing = [];
  const readme = String(readmeText || "");
  const license = String(licenseText || "");

  const creditIdx = readme.indexOf("## クレジット");
  const licenseHeadingIdx = readme.search(/^## .*ライセンス・著作権表示/m);

  if (creditIdx < 0) {
    missing.push("README:クレジット見出し");
  } else {
    const nextHeading = readme.indexOf("\n## ", creditIdx + 1);
    const creditSection = nextHeading >= 0 ? readme.slice(creditIdx, nextHeading) : readme.slice(creditIdx);
    checkRequiredAttributionSection(creditSection, "READMEクレジット", missing, hashes);
  }

  if (licenseHeadingIdx < 0) {
    missing.push("README:ライセンス・著作権表示見出し");
  } else {
    const licenseSection = readme.slice(licenseHeadingIdx);
    checkRequiredAttributionSection(licenseSection, "READMEライセンス節", missing, hashes);
  }

  const tpIdx = license.indexOf("Third-Party Notices");
  if (tpIdx < 0) {
    missing.push("LICENSE:Third-Party Notices見出し");
  } else {
    const tpSection = license.slice(tpIdx);
    checkRequiredAttributionSection(tpSection, "LICENSE", missing, hashes);
    if (!tpSection.includes("blue-lamp.svg")) {
      missing.push("LICENSE:blue-lamp.svg");
    }
    if (!tpSection.includes("ADL 1.1") || !tpSection.includes("JP-Humanizer")) {
      missing.push("LICENSE:DADA第三者表記");
    }
    if (!tpSection.includes("DADAプロセスを用いたプログラム開発例")) {
      missing.push("LICENSE:DADA開発例位置づけ");
    }
  }

  if (sourcesText !== null) {
    const src = String(sourcesText || "");
    checkRequiredAttributionSection(src, "SOURCES", missing, hashes);
    if (!src.includes("DADAプロセスを用いたプログラム開発例")) {
      missing.push("SOURCES:DADA開発例位置づけ");
    }
    for (const requiredFile of [
      "icon16.png",
      "icon48.png",
      "icon128.png",
      "fountain-stieglitz.jpg",
      "three-face-dadaism.svg",
      "blue-lamp.svg",
      "gymnopedie1.ogg",
      "space-adventure-synth.wav",
      "juwacchi.wav",
    ]) {
      if (!src.includes(requiredFile)) {
        missing.push(`SOURCES:${requiredFile}`);
      }
    }
  }

  if (storeText !== null) {
    const store = String(storeText || "");
    if (!store.includes("VOICEVOX:玄野武宏")) {
      missing.push("STORE:VOICEVOX:玄野武宏");
    }
    if (!store.includes("EXIT")) {
      missing.push("STORE:EXITボタン仕様");
    }
    if (!store.includes("DADAプロセスを用いたプログラム開発例")) {
      missing.push("STORE:DADA開発例位置づけ");
    }
  }

  return { ok: missing.length === 0, missing };
}

/**
 * 関数名： checkReadmeV44Structure
 * 戻り値： { ok: boolean, reasons: string[] }。
 * 引数： readmeText は README.md 全文、eduTerms は旧教育用途禁止語句一覧（任意）。
 * 関数の概要： README.md における「## 開発状況」節非存在・「機能概要」節簡素化（SW105 参照維持）・クレジット/ライセンス維持・DADA開発例位置づけと2つの特徴・禁止語句非含有を検証する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-077, REQ-006
 */
export function checkReadmeV44Structure(
  readmeText,
  eduTerms = ["教材", "演習教材", "講座", "名古屋大学", "enPiT-Pro"]
) {
  const text = String(readmeText || "").replace(/\r\n/g, "\n");
  const reasons = [];

  if (/^##\s+開発状況\s*$/m.test(text)) {
    reasons.push("HasDevStatusSection");
  }
  if (!text.includes("DADAプロセスを用いたプログラム開発例")) {
    reasons.push("MissingDadaExamplePositioning");
  }
  if (!(text.includes("開発文書") && (text.includes("レビュー") || text.includes("REV101")))) {
    reasons.push("MissingDadaFeature1");
  }
  if (
    !((text.includes("アジャイル") || text.includes("開発 Loop") || text.includes("開発Loop")) &&
      text.includes("要求改訂"))
  ) {
    reasons.push("MissingDadaFeature2");
  }

  const overviewMatch = text.match(/^##\s+機能概要\s*$/m);
  if (!overviewMatch) {
    reasons.push("MissingFeatureOverviewSection");
  } else {
    const startIdx = overviewMatch.index;
    const nextHeading = text.indexOf("\n## ", startIdx + 1);
    const overviewSection = nextHeading >= 0 ? text.slice(startIdx, nextHeading) : text.slice(startIdx);
    if (!overviewSection.includes("docs/artifacts/SW105_ソフトウェア要求仕様書.md")) {
      reasons.push("MissingSw105ReferenceInOverview");
    }
    const forbiddenOverviewTokens = [
      "ダダイズム",
      "マルセル・デュシャン",
      "1967年1月22日放送",
      "胸にランプが光る",
      "This software was developed",
      "0.1 + 0.9",
      "t - 10",
      "±0.2",
      "±0.05",
      "±3.0",
      "24000Hz",
      "44100Hz",
      "44.1kHz",
      "0.85",
      "0.18",
      "0.25",
      "0.20",
      "0.18",
      "12.800",
      "16.000",
      "135",
      "180",
      "110",
      "F0",
      "dBFS",
      "3kHz",
      "8kHz",
    ];
    if (forbiddenOverviewTokens.some((tok) => overviewSection.includes(tok))) {
      reasons.push("OverviewContainsDetailedSpecs");
    }
  }

  if (!/^##\s+クレジット\s*$/m.test(text) || !/^## .*ライセンス・著作権表示/m.test(text)) {
    reasons.push("MissingCreditOrLicenseSection");
  }

  if (Array.isArray(eduTerms) && eduTerms.some((term) => text.includes(term))) {
    reasons.push("ContainsForbiddenEduTerm");
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * 関数名： toBuffer
 * 戻り値： Node.js Buffer。
 * 引数： input は Buffer または ArrayBufferView。
 * 関数の概要： バイナリ入力を Buffer へ正規化する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節
 */
function toBuffer(input) {
  return Buffer.isBuffer(input)
    ? input
    : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

/**
 * 関数名： parseRiffWaveChunks
 * 戻り値： { ok: boolean, buf: Buffer, fmt: object | null, dataOffset: number, dataBytes: number }。
 * 引数： input は WAV の Buffer または Uint8Array。
 * 関数の概要： RIFF/WAVE の fmt チャンクと data チャンク位置を解析する共通ヘルパ。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-067, TC-071
 */
function parseRiffWaveChunks(input) {
  const buf = toBuffer(input);
  if (
    buf.length < 44 ||
    buf.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buf.subarray(8, 12).toString("ascii") !== "WAVE"
  ) {
    return { ok: false, buf, fmt: null, dataOffset: -1, dataBytes: 0 };
  }

  let fmt = null;
  let dataOffset = -1;
  let dataBytes = 0;
  let offset = 12;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buf.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;
    const bodyEnd = Math.min(buf.length, bodyStart + chunkSize);

    if (chunkId === "fmt " && chunkSize >= 16 && bodyStart + 16 <= buf.length) {
      fmt = {
        audioFormat: buf.readUInt16LE(bodyStart),
        channels: buf.readUInt16LE(bodyStart + 2),
        sampleRate: buf.readUInt32LE(bodyStart + 4),
        byteRate: buf.readUInt32LE(bodyStart + 8),
        blockAlign: buf.readUInt16LE(bodyStart + 12),
        bitsPerSample: buf.readUInt16LE(bodyStart + 14),
      };
    } else if (chunkId === "data" && dataOffset < 0) {
      dataOffset = bodyStart;
      dataBytes = Math.max(0, bodyEnd - bodyStart);
    }
    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  return {
    ok: Boolean(fmt && dataOffset >= 0),
    buf,
    fmt,
    dataOffset,
    dataBytes,
  };
}

/**
 * 関数名： parseWavMetrics
 * 戻り値： WAV 形式・サンプルレート・ビット深度・チャンネル数・最大正規化振幅・ステレオ差分・接続点振幅差・境界無音長。
 * 引数： input は WAV ファイルの Buffer または Uint8Array。
 * 関数の概要： RIFF/WAVE の fmt チャンクと data チャンクを解析し、全サンプルの定量音質指標を算出する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-067, TC-068, TC-069, TC-070
 */
export function parseWavMetrics(input) {
  const { ok, buf, fmt, dataOffset, dataBytes } = parseRiffWaveChunks(input);

  if (!ok) {
    return {
      validRiffWave: false,
      isPcm: false,
      audioFormat: fmt ? fmt.audioFormat : 0,
      channels: fmt ? fmt.channels : 0,
      sampleRate: fmt ? fmt.sampleRate : 0,
      bitsPerSample: fmt ? fmt.bitsPerSample : 0,
      byteRate: fmt ? fmt.byteRate : 0,
      blockAlign: fmt ? fmt.blockAlign : 0,
      dataBytes: 0,
      frameCount: 0,
      durationSec: 0,
      maxNormAmp: 0,
      maxLrDiff: 0,
      headNorm: [],
      tailNorm: [],
      joinNormDiff: 0,
      headSilenceSec: 0,
      tailSilenceSec: 0,
      boundarySilenceSec: 0,
      rmsL: 0,
      rmsR: 0,
    };
  }

  const isPcm = fmt.audioFormat === 1;
  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameBytes = fmt.channels * bytesPerSample;
  const frameCount = frameBytes > 0 ? Math.floor(dataBytes / frameBytes) : 0;
  const durationSec = fmt.sampleRate > 0 ? frameCount / fmt.sampleRate : 0;

  let maxNormAmp = 0;
  let maxLrDiff = 0;
  let joinNormDiff = 0;
  let headSilenceFrames = 0;
  let tailSilenceFrames = 0;
  let headNorm = [];
  let tailNorm = [];
  let sumSqL = 0;
  let sumSqR = 0;

  if (frameCount > 0 && (fmt.bitsPerSample === 16 || fmt.bitsPerSample === 8)) {
    const readFrameRaw = (fIdx) => {
      const base = dataOffset + fIdx * frameBytes;
      const vals = [];
      for (let c = 0; c < fmt.channels; c += 1) {
        const pos = base + c * bytesPerSample;
        if (fmt.bitsPerSample === 16) {
          vals.push(buf.readInt16LE(pos));
        } else {
          vals.push(buf.readUInt8(pos) - 128);
        }
      }
      return vals;
    };

    const divisor = fmt.bitsPerSample === 16 ? 32768 : 128;
    const silenceThresh = 0.001;

    let headBroken = false;
    for (let f = 0; f < frameCount; f += 1) {
      const raw = readFrameRaw(f);
      let frameSilent = true;
      for (let c = 0; c < fmt.channels; c += 1) {
        const norm = Math.abs(raw[c]) / divisor;
        if (norm > maxNormAmp) {
          maxNormAmp = norm;
        }
        if (norm >= silenceThresh) {
          frameSilent = false;
        }
      }
      if (fmt.channels >= 2) {
        const diff = Math.abs(raw[0] - raw[1]);
        if (diff > maxLrDiff) {
          maxLrDiff = diff;
        }
        sumSqL += (raw[0] / divisor) ** 2;
        sumSqR += (raw[1] / divisor) ** 2;
      } else if (fmt.channels === 1) {
        sumSqL += (raw[0] / divisor) ** 2;
      }
      if (!headBroken) {
        if (frameSilent) {
          headSilenceFrames += 1;
        } else {
          headBroken = true;
        }
      }
    }

    for (let f = frameCount - 1; f >= 0; f -= 1) {
      const raw = readFrameRaw(f);
      const allSilent = raw.every((v) => Math.abs(v) / divisor < silenceThresh);
      if (allSilent) {
        tailSilenceFrames += 1;
      } else {
        break;
      }
    }

    headNorm = readFrameRaw(0).map((v) => v / divisor);
    tailNorm = readFrameRaw(frameCount - 1).map((v) => v / divisor);
    for (let c = 0; c < fmt.channels; c += 1) {
      const d = Math.abs(tailNorm[c] - headNorm[c]);
      if (d > joinNormDiff) {
        joinNormDiff = d;
      }
    }
  }

  const headSilenceSec = fmt.sampleRate > 0 ? headSilenceFrames / fmt.sampleRate : 0;
  const tailSilenceSec = fmt.sampleRate > 0 ? tailSilenceFrames / fmt.sampleRate : 0;

  return {
    validRiffWave: true,
    isPcm,
    audioFormat: fmt.audioFormat,
    channels: fmt.channels,
    sampleRate: fmt.sampleRate,
    bitsPerSample: fmt.bitsPerSample,
    byteRate: fmt.byteRate,
    blockAlign: fmt.blockAlign,
    dataBytes,
    frameCount,
    durationSec,
    maxNormAmp,
    maxLrDiff,
    headNorm,
    tailNorm,
    joinNormDiff,
    headSilenceSec,
    tailSilenceSec,
    boundarySilenceSec: headSilenceSec + tailSilenceSec,
    rmsL: frameCount > 0 ? Math.sqrt(sumSqL / frameCount) : 0,
    rmsR: frameCount > 0 && fmt.channels >= 2 ? Math.sqrt(sumSqR / frameCount) : 0,
  };
}

/**
 * 関数名： validatePcmWavQuality
 * 戻り値： { ok: boolean, reasons: string[], metrics: object }。
 * 引数： target は WAV Buffer/Uint8Array または parseWavMetrics の結果オブジェクト。
 * 関数の概要： 44.1kHz以上・16bit・ステレオ2ch・左右差分・最大正規化振幅0.30〜0.95・接続点振幅差0.05以下を判定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-067, TC-068
 */
export function validatePcmWavQuality(target) {
  const metrics =
    Buffer.isBuffer(target) || ArrayBuffer.isView(target)
      ? parseWavMetrics(target)
      : target;
  const reasons = [];

  if (!metrics || !metrics.validRiffWave || !metrics.isPcm) {
    reasons.push("NonPcmOrInvalidWav");
  }
  if (!metrics || !(metrics.sampleRate >= 44100)) {
    reasons.push("SampleRateBelow44100");
  }
  if (!metrics || metrics.bitsPerSample !== 16) {
    reasons.push("BitsPerSampleNot16");
  }
  if (!metrics || metrics.channels !== 2) {
    reasons.push("ChannelsNotStereo2");
  }
  if (!metrics || !(metrics.maxLrDiff > 0)) {
    reasons.push("StereoChannelIdentical");
  }
  if (!metrics || !(metrics.maxNormAmp >= 0.30 && metrics.maxNormAmp <= 0.95)) {
    reasons.push("PeakAmplitudeOutOfRange");
  }
  if (!metrics || !(metrics.joinNormDiff <= 0.05)) {
    reasons.push("LoopJoinDiffExceedsLimit");
  }

  return { ok: reasons.length === 0, reasons, metrics };
}

/**
 * 関数名： validateLoopBoundaryQuality
 * 戻り値： { ok: boolean, reasons: string[], boundarySilenceSec: number, joinNormDiff: number }。
 * 引数： target は WAV Buffer/Uint8Array、parseWavMetrics 結果、または { boundarySilenceSec, joinNormDiff }。
 * 関数の概要： シームレスループ境界の無音ギャップ 0.05秒未満および接続点正規化振幅差 0.05以下を判定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-069, TC-070
 */
export function validateLoopBoundaryQuality(target) {
  const metrics =
    Buffer.isBuffer(target) || ArrayBuffer.isView(target)
      ? parseWavMetrics(target)
      : target;
  const boundarySilenceSec = metrics ? metrics.boundarySilenceSec : Number.NaN;
  const joinNormDiff = metrics ? metrics.joinNormDiff : Number.NaN;
  const reasons = [];

  if (!Number.isFinite(boundarySilenceSec) || !(boundarySilenceSec < 0.05)) {
    reasons.push("LoopSilenceGapExceedsLimit");
  }
  if (!Number.isFinite(joinNormDiff) || !(joinNormDiff <= 0.05)) {
    reasons.push("LoopJoinDiffExceedsLimit");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    boundarySilenceSec,
    joinNormDiff,
  };
}

/**
 * 関数名： goertzelPower
 * 戻り値： 指定周波数における正規化スペクトルパワー。
 * 引数： samples は信号配列、start は開始位置、len は窓長、freq は中心周波数、sampleRate はサンプリング周波数。
 * 関数の概要： ハニング窓付き Goertzel 法で単一周波数のパワーを算出する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-071
 */
function goertzelPower(samples, start, len, freq, sampleRate) {
  if (len <= 1 || sampleRate <= 0 || freq >= sampleRate / 2) {
    return 0;
  }
  const k = (freq * len) / sampleRate;
  const omega = (2 * Math.PI * k) / len;
  const coeff = 2 * Math.cos(omega);
  let q1 = 0;
  let q2 = 0;
  for (let i = 0; i < len; i += 1) {
    const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (len - 1));
    const q0 = coeff * q1 - q2 + samples[start + i] * win;
    q2 = q1;
    q1 = q0;
  }
  const power = q1 * q1 + q2 * q2 - q1 * q2 * coeff;
  return power / (len * len + 1e-12);
}

/**
 * 関数名： evaluateJuwacchiLoudnessBalance
 * 戻り値： { ok: boolean, reasons: string[], dbfs2: number, dbfs3: number, dbfsJuwacchi: number, diffVsScene2Db: number, diffVsScene3Db: number, effectivePeakJuwacchi: number, clipped: boolean }。
 * 引数： scene2Rms, scene2Gain, scene3Rms, scene3Gain, juwacchiRms, juwacchiGain, scene2Peak, scene3Peak, juwacchiPeak。
 * 関数の概要： ジュワッチ音声の再生時実効音量（全区間 RMS 基準の dBFS）とオープニング第2・第3シーン BGM との差が ±3.0 dB 以内かつ再生時クリッピング非発生かを判定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-078, TC-079
 */
export function evaluateJuwacchiLoudnessBalance(
  scene2Rms,
  scene2Gain,
  scene3Rms,
  scene3Gain,
  juwacchiRms,
  juwacchiGain,
  scene2Peak = 0.80,
  scene3Peak = 0.85,
  juwacchiPeak = 0.95
) {
  const reasons = [];
  const validInputs =
    Number.isFinite(scene2Rms) && scene2Rms > 0 &&
    Number.isFinite(scene2Gain) && scene2Gain > 0 &&
    Number.isFinite(scene3Rms) && scene3Rms > 0 &&
    Number.isFinite(scene3Gain) && scene3Gain > 0 &&
    Number.isFinite(juwacchiRms) && juwacchiRms > 0 &&
    Number.isFinite(juwacchiGain) && juwacchiGain > 0 &&
    Number.isFinite(scene2Peak) && scene2Peak >= 0 &&
    Number.isFinite(scene3Peak) && scene3Peak >= 0 &&
    Number.isFinite(juwacchiPeak) && juwacchiPeak >= 0;

  if (!validInputs) {
    return {
      ok: false,
      reasons: ["InvalidRmsOrGain"],
      dbfs2: Number.NEGATIVE_INFINITY,
      dbfs3: Number.NEGATIVE_INFINITY,
      dbfsJuwacchi: Number.NEGATIVE_INFINITY,
      diffVsScene2Db: Number.NaN,
      diffVsScene3Db: Number.NaN,
      effectivePeakJuwacchi: Number.NaN,
      clipped: true,
    };
  }

  const dbfs2 = 20 * Math.log10(scene2Rms * scene2Gain);
  const dbfs3 = 20 * Math.log10(scene3Rms * scene3Gain);
  const dbfsJuwacchi = 20 * Math.log10(juwacchiRms * juwacchiGain);
  const diffVsScene2Db = dbfsJuwacchi - dbfs2;
  const diffVsScene3Db = dbfsJuwacchi - dbfs3;
  const effectivePeak2 = scene2Peak * scene2Gain;
  const effectivePeak3 = scene3Peak * scene3Gain;
  const effectivePeakJuwacchi = juwacchiPeak * juwacchiGain;
  const clipped = effectivePeak2 >= 1.0 || effectivePeak3 >= 1.0 || effectivePeakJuwacchi >= 1.0;

  if (!(Math.abs(diffVsScene2Db) <= 3.0 + 1e-6) || !(Math.abs(diffVsScene3Db) <= 3.0 + 1e-6)) {
    reasons.push("LoudnessDiffExceedsLimit");
  }
  if (clipped) {
    reasons.push("PlaybackClippingDetected");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    dbfs2,
    dbfs3,
    dbfsJuwacchi,
    diffVsScene2Db,
    diffVsScene3Db,
    effectivePeakJuwacchi,
    clipped,
  };
}

/**
 * 関数名： evaluateBgmLoudnessBalance
 * 戻り値： { ok: boolean, reasons: string[], dbfs2: number, dbfs3: number, diffDb: number, absDiffDb: number, effectivePeak2: number, effectivePeak3: number, clipped: boolean }。
 * 引数： scene2Rms, scene2Gain, scene3Rms, scene3Gain, scene2Peak（任意）, scene3Peak（任意）。
 * 関数の概要： 第2・第3シーン BGM の再生時実効音量（全区間 RMS 基準の dBFS）差が ±3.0 dB 以内かつ再生時クリッピング非発生かを判定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-073, TC-074
 */
export function evaluateBgmLoudnessBalance(
  scene2Rms,
  scene2Gain,
  scene3Rms,
  scene3Gain,
  scene2Peak = 0.80,
  scene3Peak = 0.85
) {
  const reasons = [];
  const validInputs =
    Number.isFinite(scene2Rms) && scene2Rms > 0 &&
    Number.isFinite(scene2Gain) && scene2Gain > 0 &&
    Number.isFinite(scene3Rms) && scene3Rms > 0 &&
    Number.isFinite(scene3Gain) && scene3Gain > 0 &&
    Number.isFinite(scene2Peak) && scene2Peak >= 0 &&
    Number.isFinite(scene3Peak) && scene3Peak >= 0;

  if (!validInputs) {
    return {
      ok: false,
      reasons: ["InvalidRmsOrGain"],
      dbfs2: Number.NEGATIVE_INFINITY,
      dbfs3: Number.NEGATIVE_INFINITY,
      diffDb: Number.NaN,
      absDiffDb: Number.POSITIVE_INFINITY,
      effectivePeak2: Number.NaN,
      effectivePeak3: Number.NaN,
      clipped: true,
    };
  }

  const effectiveRms2 = scene2Rms * scene2Gain;
  const effectiveRms3 = scene3Rms * scene3Gain;
  const dbfs2 = 20 * Math.log10(effectiveRms2);
  const dbfs3 = 20 * Math.log10(effectiveRms3);
  const diffDb = dbfs3 - dbfs2;
  const absDiffDb = Math.abs(diffDb);
  const effectivePeak2 = scene2Peak * scene2Gain;
  const effectivePeak3 = scene3Peak * scene3Gain;
  const clipped = effectivePeak2 >= 1.0 || effectivePeak3 >= 1.0;

  if (!(absDiffDb <= 3.0 + 1e-6)) {
    reasons.push("LoudnessDiffExceedsLimit");
  }
  if (clipped) {
    reasons.push("PlaybackClippingDetected");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    dbfs2,
    dbfs3,
    diffDb,
    absDiffDb,
    effectivePeak2,
    effectivePeak3,
    clipped,
  };
}

/**
 * 関数名： validateManifestDescription
 * 戻り値： { ok: boolean, reasons: string[], length: number }。
 * 引数： desc は検証対象の説明文、forbiddenList は禁止名称リスト（任意）。
 * 関数の概要： manifest.json の description が日英併記・132文字以内・禁止表現非含有かを判定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-075, REQ-006
 */
export function validateManifestDescription(desc, forbiddenList = []) {
  const reasons = [];
  if (typeof desc !== "string" || desc.trim().length === 0) {
    return { ok: false, reasons: ["EmptyDescription"], length: 0 };
  }
  if (desc.length > 132) {
    reasons.push("DescriptionExceeds132Chars");
  }
  const hasJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(desc);
  const englishWords = (desc.match(/[A-Za-z]{2,}/g) || []).filter(
    (w) => w.toLowerCase() !== "colorbeacontimer"
  );
  if (!hasJapanese || englishWords.length < 2) {
    reasons.push("MissingBilingualText");
  }
  if (
    desc.includes("公認") ||
    desc.includes("公式") ||
    (Array.isArray(forbiddenList) && forbiddenList.length > 0 && containsName(desc, forbiddenList).length > 0)
  ) {
    reasons.push("ContainsForbiddenTerm");
  }
  return { ok: reasons.length === 0, reasons, length: desc.length };
}

/**
 * 関数名： validatePopupViewportWidth
 * 戻り値： { ok: boolean, reasons: string[], width: number }。
 * 引数： width は実ビューポート幅（px）。
 * 関数の概要： 専用ウィンドウの実ビューポート幅が SW105 v4.3.1 要件（640px 以上）を満たすかを判定する。
 * 対応機能ID（トレーサビリティ）： SW105 REQ-001, REQ-003, TC-075
 */
export function validatePopupViewportWidth(width) {
  const reasons = [];
  if (typeof width !== "number" || !Number.isFinite(width) || width < 640) {
    reasons.push("ViewportWidthBelow640");
  }
  return { ok: reasons.length === 0, reasons, width };
}

/**
 * 関数名： estimateFrameF0Autocorr
 * 戻り値： { f0Hz: number, correlation: number }。
 * 引数： samples は信号配列、start は開始インデックス、winLen は窓長、sampleRate はサンプリング周波数。
 * 関数の概要： 正規化自己相関と第1有意ピーク選択によりフレーム基本周波数 F0（65〜380 Hz）を推定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-071, TC-072
 */
function estimateFrameF0Autocorr(samples, start, winLen, sampleRate) {
  const minLag = Math.max(2, Math.floor(sampleRate / 380));
  const maxLag = Math.min(winLen - 3, Math.ceil(sampleRate / 65));
  if (maxLag <= minLag) {
    return { f0Hz: 0, correlation: 0 };
  }

  const corrs = [];
  let globalMax = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let num = 0;
    let e1 = 0;
    let e2 = 0;
    const limit = winLen - lag;
    for (let i = 0; i < limit; i += 1) {
      const a = samples[start + i];
      const b = samples[start + i + lag];
      num += a * b;
      e1 += a * a;
      e2 += b * b;
    }
    const r = num / Math.sqrt(e1 * e2 + 1e-12);
    corrs.push({ lag, r });
    if (r > globalMax) {
      globalMax = r;
    }
  }

  if (globalMax < 0.45) {
    return { f0Hz: 0, correlation: globalMax };
  }

  // オクターブエラー（2*T0 側選択）を防ぐため、0.88 * globalMax 以上の最初の極大ピークを採用する。
  let picked = null;
  for (let i = 1; i < corrs.length - 1; i += 1) {
    const prev = corrs[i - 1].r;
    const cur = corrs[i].r;
    const next = corrs[i + 1].r;
    if (cur >= prev && cur >= next && cur >= 0.88 * globalMax) {
      picked = corrs[i];
      break;
    }
  }
  if (!picked) {
    picked = corrs.reduce((best, item) => (item.r > best.r ? item : best), corrs[0]);
  }
  return {
    f0Hz: picked.lag > 0 ? sampleRate / picked.lag : 0,
    correlation: picked.r,
  };
}

/**
 * 関数名： goertzelBandRms
 * 戻り値： 指定周波数帯域の物理スケール RMS。
 * 引数： samples は信号配列、startIdx, endIdx は対象区間、minHz, maxHz は帯域範囲、sampleRate はサンプリング周波数。
 * 関数の概要： 20ms ハニング窓・DFT ビン間隔の Goertzel 法により指定周波数帯域の RMS を算出する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-071, TC-072
 */
function goertzelBandRms(samples, startIdx, endIdx, minHz, maxHz, sampleRate) {
  const segLen = endIdx - startIdx;
  if (segLen <= 16 || sampleRate <= 0) {
    return 0;
  }
  const winLen = Math.min(segLen, Math.max(64, Math.round(sampleRate * 0.020)));
  const hopLen = Math.max(32, Math.round(sampleRate * 0.010));

  let winEnergySum = 0;
  for (let i = 0; i < winLen; i += 1) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (winLen - 1));
    winEnergySum += w * w;
  }

  const kMin = Math.max(1, Math.ceil((minHz * winLen) / sampleRate));
  const kMax = Math.min(Math.floor(winLen / 2) - 1, Math.floor((maxHz * winLen) / sampleRate));
  if (kMax < kMin || winEnergySum <= 0) {
    return 0;
  }

  const freqs = [];
  for (let k = kMin; k <= kMax; k += 1) {
    freqs.push((k * sampleRate) / winLen);
  }

  let powerSum = 0;
  let winCount = 0;
  for (let pos = startIdx; pos + winLen <= endIdx; pos += hopLen) {
    let bandPower = 0;
    for (const freq of freqs) {
      const pNorm = goertzelPower(samples, pos, winLen, freq, sampleRate);
      // goertzelPower は |X_w[k]|^2 / (winLen^2) を返すため、Parseval 正規化へ変換する。
      bandPower += (2 * pNorm * winLen) / winEnergySum;
    }
    powerSum += bandPower;
    winCount += 1;
  }

  if (winCount === 0) {
    let bandPower = 0;
    for (const freq of freqs) {
      const pNorm = goertzelPower(samples, startIdx, winLen, freq, sampleRate);
      bandPower += (2 * pNorm * winLen) / winEnergySum;
    }
    return Math.sqrt(Math.max(0, bandPower));
  }
  return Math.sqrt(Math.max(0, powerSum / winCount));
}

/**
 * 関数名： analyzeJuwacchiProsody
 * 戻り値： v4.4 単一成人男性話者ジュワッチ音声の形式・総長・全体ピーク・全区間 RMS・全体と前後半各有声 F0 中央値・後半 35% ピーク比・後半 3〜8kHz 帯域 RMS 解析結果。
 * 引数： input は WAV の Buffer または Uint8Array。
 * 関数の概要： 全区間 RMS/dBFS 計測、自己相関による全体および前後半各区間の有声 F0 計測、前半 65% / 後半 35% 振幅比較、および Goertzel 帯域 RMS 解析を実行する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, TC-071, TC-072
 */
export function analyzeJuwacchiProsody(input) {
  const { ok, buf, fmt, dataOffset, dataBytes } = parseRiffWaveChunks(input);
  const empty = {
    validRiffWave: false,
    isPcm: false,
    audioFormat: fmt ? fmt.audioFormat : 0,
    channels: fmt ? fmt.channels : 0,
    sampleRate: fmt ? fmt.sampleRate : 0,
    bitsPerSample: fmt ? fmt.bitsPerSample : 0,
    frameCount: 0,
    durationSec: 0,
    overallPeak: 0,
    overallRms: 0,
    overallRmsDbfs: Number.NEGATIVE_INFINITY,
    clipped: true,
    voicedF0Count: 0,
    voicedF0MedianHz: 0,
    voicedF0MinHz: 0,
    voicedF0MaxHz: 0,
    firstHalfVoicedF0Count: 0,
    firstHalfVoicedF0MedianHz: 0,
    secondHalfVoicedF0Count: 0,
    secondHalfVoicedF0MedianHz: 0,
    hasFemaleVoiceRange: false,
    firstHalfPeak: 0,
    secondHalfPeak: 0,
    secondHalfPeakRatio: 0,
    firstHalfFullBandRms: 0,
    secondHalfHighBandRms: 0,
    secondHalfHighBandToFirstRmsRatio: Number.POSITIVE_INFINITY,
  };

  if (!ok || fmt.audioFormat !== 1 || fmt.channels < 1 || (fmt.bitsPerSample !== 16 && fmt.bitsPerSample !== 8)) {
    return {
      ...empty,
      validRiffWave: ok,
      isPcm: Boolean(fmt && fmt.audioFormat === 1),
      channels: fmt ? fmt.channels : 0,
      sampleRate: fmt ? fmt.sampleRate : 0,
      bitsPerSample: fmt ? fmt.bitsPerSample : 0,
    };
  }

  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameBytes = fmt.channels * bytesPerSample;
  const frameCount = frameBytes > 0 ? Math.floor(dataBytes / frameBytes) : 0;
  const sampleRate = fmt.sampleRate;
  const durationSec = sampleRate > 0 ? frameCount / sampleRate : 0;
  if (frameCount <= 0 || sampleRate <= 0) {
    return {
      ...empty,
      validRiffWave: true,
      isPcm: true,
      channels: fmt.channels,
      sampleRate,
      bitsPerSample: fmt.bitsPerSample,
    };
  }

  const divisor = fmt.bitsPerSample === 16 ? 32768 : 128;
  const mono = new Float64Array(frameCount);
  let overallPeak = 0;
  let overallSumSq = 0;
  let maxAbsInt = 0;

  for (let f = 0; f < frameCount; f += 1) {
    const base = dataOffset + f * frameBytes;
    let sum = 0;
    for (let c = 0; c < fmt.channels; c += 1) {
      const pos = base + c * bytesPerSample;
      const raw = fmt.bitsPerSample === 16 ? buf.readInt16LE(pos) : buf.readUInt8(pos) - 128;
      const absRaw = Math.abs(raw);
      if (absRaw > maxAbsInt) {
        maxAbsInt = absRaw;
      }
      const norm = absRaw / divisor;
      if (norm > overallPeak) {
        overallPeak = norm;
      }
      sum += raw / divisor;
    }
    const sampleVal = sum / fmt.channels;
    mono[f] = sampleVal;
    overallSumSq += sampleVal * sampleVal;
  }

  const overallRms = Math.sqrt(overallSumSq / frameCount);
  const overallRmsDbfs = overallRms > 0 ? 20 * Math.log10(overallRms) : Number.NEGATIVE_INFINITY;
  const clipped = overallPeak > 0.99 || (fmt.bitsPerSample === 16 && maxAbsInt >= 32767);

  // 前半 65% vs 後半 35% 分割点
  const splitIdx = Math.max(1, Math.min(frameCount - 1, Math.round(frameCount * 0.65)));

  // 自己相関による有声区間フレーム F0（30ms 窓・10ms ステップ）
  const f0Win = Math.max(64, Math.round(sampleRate * 0.030));
  const f0Hop = Math.max(32, Math.round(sampleRate * 0.010));
  const f0Values = [];
  const firstHalfF0Values = [];
  const secondHalfF0Values = [];
  for (let s = 0; s + f0Win <= frameCount; s += f0Hop) {
    let sumSq = 0;
    for (let i = 0; i < f0Win; i += 1) {
      sumSq += mono[s + i] * mono[s + i];
    }
    const frameRms = Math.sqrt(sumSq / f0Win);
    if (frameRms < 0.05 * overallPeak || frameRms < 0.005) {
      continue;
    }
    const { f0Hz, correlation } = estimateFrameF0Autocorr(mono, s, f0Win, sampleRate);
    if (correlation >= 0.45 && f0Hz > 0) {
      f0Values.push(f0Hz);
      if (s + f0Win / 2 < splitIdx) {
        firstHalfF0Values.push(f0Hz);
      } else {
        secondHalfF0Values.push(f0Hz);
      }
    }
  }
  const medianOf = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = sorted.length;
    return mid % 2 === 1 ? sorted[(mid - 1) / 2] : 0.5 * (sorted[mid / 2 - 1] + sorted[mid / 2]);
  };
  f0Values.sort((a, b) => a - b);
  const voicedF0Count = f0Values.length;
  const voicedF0MedianHz = medianOf(f0Values);
  const voicedF0MinHz = voicedF0Count > 0 ? f0Values[0] : 0;
  const voicedF0MaxHz = voicedF0Count > 0 ? f0Values[voicedF0Count - 1] : 0;
  const firstHalfVoicedF0Count = firstHalfF0Values.length;
  const firstHalfVoicedF0MedianHz = medianOf(firstHalfF0Values);
  const secondHalfVoicedF0Count = secondHalfF0Values.length;
  const secondHalfVoicedF0MedianHz = medianOf(secondHalfF0Values);
  const hasFemaleVoiceRange = voicedF0MedianHz >= 220;

  // 前半 65% vs 後半 35% ピーク振幅・帯域 RMS
  let firstHalfPeak = 0;
  let firstSumSq = 0;
  for (let i = 0; i < splitIdx; i += 1) {
    const a = Math.abs(mono[i]);
    if (a > firstHalfPeak) firstHalfPeak = a;
    firstSumSq += mono[i] * mono[i];
  }
  const firstHalfFullBandRms = Math.sqrt(firstSumSq / splitIdx);

  let secondHalfPeak = 0;
  for (let i = splitIdx; i < frameCount; i += 1) {
    const a = Math.abs(mono[i]);
    if (a > secondHalfPeak) secondHalfPeak = a;
  }
  const secondHalfPeakRatio = firstHalfPeak > 0 ? secondHalfPeak / firstHalfPeak : 0;

  const secondHalfHighBandRms = goertzelBandRms(mono, splitIdx, frameCount, 3000, 8000, sampleRate);
  const secondHalfHighBandToFirstRmsRatio =
    firstHalfFullBandRms > 0 ? secondHalfHighBandRms / firstHalfFullBandRms : Number.POSITIVE_INFINITY;

  return {
    validRiffWave: true,
    isPcm: true,
    audioFormat: fmt.audioFormat,
    channels: fmt.channels,
    sampleRate,
    bitsPerSample: fmt.bitsPerSample,
    frameCount,
    durationSec,
    overallPeak,
    overallRms,
    overallRmsDbfs,
    clipped,
    voicedF0Count,
    voicedF0MedianHz,
    voicedF0MinHz,
    voicedF0MaxHz,
    firstHalfVoicedF0Count,
    firstHalfVoicedF0MedianHz,
    secondHalfVoicedF0Count,
    secondHalfVoicedF0MedianHz,
    hasFemaleVoiceRange,
    firstHalfPeak,
    secondHalfPeak,
    secondHalfPeakRatio,
    firstHalfFullBandRms,
    secondHalfHighBandRms,
    secondHalfHighBandToFirstRmsRatio,
  };
}

/**
 * 関数名： validateJuwacchiProsody
 * 戻り値： { ok: boolean, reasons: string[], metrics: object }。
 * 引数： target は WAV Buffer/Uint8Array または analyzeJuwacchiProsody 相当のメトリクスオブジェクト。
 * 関数の概要： SW105 v4.4 REQ-005 / SWP6 TC-071〜072 の単一元気成人男性話者ジュワッチ音声定量境界値を厳密判定する。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, REQ-005, TC-071, TC-072
 */
export function validateJuwacchiProsody(target) {
  const isRaw = Buffer.isBuffer(target) || ArrayBuffer.isView(target);
  const metrics = isRaw ? analyzeJuwacchiProsody(target) : target;
  const reasons = [];

  if (!metrics || metrics.validRiffWave === false || metrics.isPcm === false) {
    reasons.push("InvalidWavFormat");
  }
  if (
    !metrics ||
    metrics.channels !== 1 ||
    metrics.bitsPerSample !== 16 ||
    !(metrics.sampleRate >= 24000)
  ) {
    reasons.push("UnexpectedAudioParams");
  }
  if (!metrics || !(metrics.durationSec >= 0.55 && metrics.durationSec <= 0.85)) {
    reasons.push("DurationOutOfRange");
  }
  if (!metrics || metrics.clipped === true || !(metrics.overallPeak >= 0.85 && metrics.overallPeak <= 0.99)) {
    reasons.push("OverallPeakOrClippingInvalid");
  }
  if (!metrics || !(typeof metrics.overallRms === "number" && Number.isFinite(metrics.overallRms) && metrics.overallRms >= 0.20)) {
    reasons.push("OverallRmsTooLow");
  }
  if (
    !metrics ||
    !(metrics.voicedF0MedianHz >= 110 && metrics.voicedF0MedianHz <= 180) ||
    metrics.voicedF0MedianHz >= 220 ||
    metrics.hasFemaleVoiceRange === true
  ) {
    reasons.push("F0OutOfMaleRange");
  }
  const badFirstHalfF0 =
    !metrics ||
    (typeof metrics.firstHalfVoicedF0Count === "number" && metrics.firstHalfVoicedF0Count <= 0) ||
    !(metrics.firstHalfVoicedF0MedianHz >= 85 && metrics.firstHalfVoicedF0MedianHz <= 200);
  const badSecondHalfF0 =
    !metrics ||
    (typeof metrics.secondHalfVoicedF0Count === "number" && metrics.secondHalfVoicedF0Count <= 0) ||
    !(metrics.secondHalfVoicedF0MedianHz >= 85 && metrics.secondHalfVoicedF0MedianHz <= 200);
  if (badFirstHalfF0 || badSecondHalfF0) {
    reasons.push("SegmentF0OutOfMaleRange");
  }
  if (!metrics || !(metrics.secondHalfPeakRatio >= 0.25 && metrics.secondHalfPeakRatio <= 0.85)) {
    reasons.push("SecondHalfPeakRatioOutOfRange");
  }

  let highBandExceeded = false;
  if (
    metrics &&
    typeof metrics.secondHalfHighBandRms === "number" &&
    typeof metrics.firstHalfFullBandRms === "number"
  ) {
    highBandExceeded = !(metrics.secondHalfHighBandRms <= metrics.firstHalfFullBandRms * (1 + 1e-6));
  } else if (metrics && typeof metrics.secondHalfHighBandToFirstRmsRatio === "number") {
    highBandExceeded = !(metrics.secondHalfHighBandToFirstRmsRatio <= 1.0 + 1e-6);
  } else {
    highBandExceeded = true;
  }
  if (highBandExceeded) {
    reasons.push("SecondHalfHighBandTooLoud");
  }

  return { ok: reasons.length === 0, reasons, metrics };
}
