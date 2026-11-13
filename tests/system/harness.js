/**
 * ファイル名： harness.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： Playwright 同梱の Chromium で拡張機能を読み、アイコンのクリックを起こす。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, ADR-002
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * 関数名： launchExtension
 * 戻り値： context、service worker、拡張 ID。
 * 引数： extensionPath は拡張機能ディレクトリの絶対パス。
 * 関数の概要： --load-extension と Extensions.triggerAction 用の引数で persistent context を開く。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節
 */
export async function launchExtension(extensionPath) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbt-profile-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 480, height: 720 },
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
  const httpRequests = [];
  context.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      httpRequests.push(url);
    }
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
  }
  const extensionId = new URL(worker.url()).host;
  return { context, worker, extensionId, userDataDir, httpRequests };
}

/**
 * 関数名： triggerAction
 * 戻り値： なし。
 * 引数： context と拡張 ID。
 * 関数の概要： 起動後のタブを targetId にして、ツールバーのアイコンをクリックする。
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
  if (appeared || before.size > 0 || sent > 0 && appPages(context).length > 0) {
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
 * 引数： client はブラウザの CDP。extensionId は拡張 ID。tabs はタブターゲット。
 * 関数の概要： 専用ウィンドウのタブはアクションを受けないので、失敗したタブは飛ばす。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節, REQ-001
 */
async function clickTabs(client, extensionId, tabs) {
  let sent = 0;
  for (const tab of tabs) {
    try {
      await client.send("Extensions.triggerAction", {
        id: extensionId,
        targetId: tab.targetId,
      });
      sent += 1;
    } catch (err) {
      // 専用ウィンドウのタブは、ツールバーのアクションを受けない。
    }
  }
  return sent;
}

/**
 * 関数名： appPages
 * 戻り値： app.html を開いているページの配列。
 * 引数： context。
 * 関数の概要： 専用ウィンドウのページだけを集める。
 * 対応機能ID（トレーサビリティ）： TC-001, REQ-001
 */
export function appPages(context) {
  return context.pages().filter((page) => page.url().includes("app.html"));
}

/**
 * 関数名： waitForApp
 * 戻り値： 新しく開いた専用ウィンドウ。
 * 引数： context と、クリック前のページ集合。
 * 関数の概要： app.html が現れるまで待つ。
 * 対応機能ID（トレーサビリティ）： TC-001, REQ-001
 */
export async function waitForNewApp(context, previous, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = appPages(context).find((page) => !previous.has(page));
    if (found) {
      // 最初の描画で data-state が付くまで待つ。要素だけの瞬間は読まない。
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
 * 引数： context と、クリック前のページ集合。
 * 関数の概要： app.html が現れるまで待つ。
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
 * 関数の概要： 開いている専用ウィンドウを閉じる。
 * 対応機能ID（トレーサビリティ）： REQ-003
 */
export async function closeApps(context) {
  for (const page of appPages(context)) {
    await page.close();
  }
}

/**
 * 関数名： readApp
 * 戻り値： 観測属性と画面の文字。
 * 引数： page は専用ウィンドウ。
 * 関数の概要： data 属性、時刻、署名、ボタン文字、地球の矩形を読む。
 * 対応機能ID（トレーサビリティ）： SW205 第5節
 */
export async function readApp(page) {
  return page.evaluate(() => {
    const app = document.querySelector("#app");
    const earth = document.querySelector("#earth");
    const rect = earth.getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll("button")).map((button) => button.textContent);
    return {
      state: app.dataset.state,
      remainingMs: Number(app.dataset.remainingMs),
      settingMs: Number(app.dataset.settingMs),
      displayTime: app.dataset.displayTime,
      timeVisible: app.dataset.timeVisible,
      beaconColor: app.dataset.beaconColor,
      beaconOpacity: Number(app.dataset.beaconOpacity),
      shoutUrl: app.dataset.shoutUrl || "",
      earthAttr: Number(app.dataset.earthDiameterPx),
      earthRect: Math.max(rect.width, rect.height),
      blinkLog: JSON.parse(app.dataset.blinkLog || "[]"),
      marks: JSON.parse(app.dataset.marks || "[]"),
      timeText: document.querySelector("#time").innerText,
      signature: document.querySelector("#signature").innerText,
      sortie: document.querySelector("#sortie").textContent,
      bodyText: document.body.innerText,
      buttons,
    };
  });
}

/**
 * 関数名： markStamp
 * 戻り値： 印の時刻。無いときは null。
 * 引数： marks は印の配列。name は印の名前。
 * 関数の概要： 最初に付いた印の performance.now() を返す。
 * 対応機能ID（トレーサビリティ）： SW205 第5節
 */
export function markStamp(marks, name) {
  const found = marks.find((mark) => mark.name === name);
  return found ? found.t : null;
}

/**
 * 関数名： waitForState
 * 戻り値： その状態の観測。
 * 引数： page と状態名と待ち時間。
 * 関数の概要： data-state が指定の状態になるまで読む。
 * 対応機能ID（トレーサビリティ）： SW205 第5節
 */
export async function waitForState(page, state, timeoutMs = 10000) {
  await page.waitForFunction((expected) => {
    const app = document.querySelector("#app");
    return app && app.dataset.state === expected;
  }, state, { timeout: timeoutMs });
  return readApp(page);
}

/**
 * 関数名： press
 * 戻り値： なし。
 * 引数： page と要素の id。
 * 関数の概要： pointerdown と pointerup を1回送る。長押しにはしない。
 * 対応機能ID（トレーサビリティ）： REQ-002
 */
export async function press(page, id) {
  await page.evaluate((elementId) => {
    const element = document.querySelector(elementId);
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  }, id);
}

/**
 * 関数名： hold
 * 戻り値： なし。
 * 引数： page、要素の id、押している時間。
 * 関数の概要： pointerdown のあと、指定ミリ秒だけ離さない。
 * 対応機能ID（トレーサビリティ）： TC-018, TC-019, REQ-002
 */
export async function hold(page, id, ms) {
  await page.evaluate((elementId) => {
    document.querySelector(elementId).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  }, id);
  await page.waitForTimeout(ms);
  await page.evaluate(() => {
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

/**
 * 関数名： setSettingMs
 * 戻り値： なし。
 * 引数： page と目標の設定ミリ秒。
 * 関数の概要： 設定画面で、＋と−を1回ずつ押して目標の設定時刻へ合わせる。
 * 対応機能ID（トレーサビリティ）： REQ-002
 */
export async function setSettingMs(page, targetMs) {
  const reached = await page.evaluate(async (target) => {
    const read = () => Number(document.querySelector("#app").dataset.settingMs);
    const pressId = (elementId) => {
      document.querySelector(elementId).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    };
    const frame = () => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    let guard = 0;
    while (read() !== target && guard < 400) {
      pressId(read() > target ? "#minus" : "#plus");
      guard += 1;
      await frame();
    }
    return read();
  }, targetMs);
  if (reached !== targetMs) {
    throw new Error("設定時刻を合わせられなかった: " + reached);
  }
}

/**
 * 関数名： copyWithoutShout
 * 戻り値： 複製先のパス。
 * 引数： source は拡張機能ディレクトリ。dest は複製先。
 * 関数の概要： 拡張機能を複製し、掛け声ファイルだけを除く。
 * 対応機能ID（トレーサビリティ）： TC-050, TC-063
 */
export function copyWithoutShout(source, dest) {
  fs.cpSync(source, dest, { recursive: true });
  const wav = path.join(dest, "assets", "audio", "shout.wav");
  if (fs.existsSync(wav)) {
    fs.rmSync(wav);
  }
  return dest;
}

/**
 * 関数名： forbiddenNames
 * 戻り値： 禁止名称リストの4文字列。
 * 引数： sw105Path は SW105 のパス。
 * 関数の概要： 第1.3節の禁止名称リストのセルから、作品名とキャラクタ名の4文字列を読む。
 * 対応機能ID（トレーサビリティ）： TC-009, TC-051, TC-055, REQ-006
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
  if (names.length !== 4) {
    throw new Error("禁止名称リストを4件読めなかった");
  }
  return names;
}

/**
 * 関数名： containsName
 * 戻り値： ヒットした名称の配列。
 * 引数： text は照合する文字。names は禁止名称。
 * 関数の概要： 部分一致で探す。英字とローマ字は大文字と小文字を区別しない。
 * 対応機能ID（トレーサビリティ）： TC-009, TC-051, TC-055
 */
export function containsName(text, names) {
  const lower = String(text).toLowerCase();
  return names.filter((name) => lower.includes(String(name).toLowerCase()));
}
