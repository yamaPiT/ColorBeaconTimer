/**
 * ファイル名： auto.spec.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： SWP6 の自動テストのうち、画面と時刻と通信を Playwright 同梱の Chromium で確認する。
 * 対応機能ID（トレーサビリティ）： TC-001, TC-002, TC-003, TC-004, TC-006, TC-007, TC-008, TC-009, TC-013, TC-015, TC-016, TC-017, TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, TC-025, TC-026, TC-027, TC-031, TC-032, TC-034, TC-037, TC-040, TC-042, TC-043, TC-044, TC-046, TC-048, TC-049, TC-050, TC-051, TC-054, TC-055, TC-058, TC-059, TC-060, TC-062, TC-063, TC-064, TC-065
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  appPages,
  containsName,
  copyWithoutShout,
  forbiddenNames,
  hold,
  launchExtension,
  markStamp,
  press,
  readApp,
  setSettingMs,
  triggerAction,
  waitForApp,
  waitForState,
} from "./harness.js";

const root = path.resolve(import.meta.dirname, "../..");
const extensionPath = path.join(root, "extension");
const sw105Path = path.join(root, "docs/artifacts/SW105_ソフトウェア要求仕様書.md");
const names = forbiddenNames(sw105Path);
const kounin = String.fromCharCode(0x516c, 0x8a8d);
const koushiki = String.fromCharCode(0x516c, 0x5f0f);
const vendor = String.fromCharCode(0x5186, 0x8c37);

/**
 * 関数名： openByIcon
 * 戻り値： 新しく開いた専用ウィンドウ。
 * 引数： launched は launchExtension の戻り値。
 * 関数の概要： ツールバーのアイコンを1回押し、app.html を待つ。
 * 対応機能ID（トレーサビリティ）： TC-001, REQ-001
 */
async function openByIcon(launched) {
  const previous = new Set(launched.context.pages());
  await triggerAction(launched.context, launched.extensionId);
  return waitForApp(launched.context, previous);
}

/**
 * 関数名： withExtension
 * 戻り値： コールバックの戻り値。
 * 引数： dir は拡張機能ディレクトリ。fn は context を使う関数。
 * 関数の概要： 拡張機能を読み、終わったらブラウザを閉じる。
 * 対応機能ID（トレーサビリティ）： SW205 第8.2節
 */
async function withExtension(dir, fn) {
  const launched = await launchExtension(dir);
  try {
    return await fn(launched);
  } finally {
    await launched.context.close();
  }
}

/**
 * 関数名： skipOpening
 * 戻り値： 設定画面の観測。
 * 引数： page は専用ウィンドウ。
 * 関数の概要： オープニング中の1回のクリックで設定画面へ進める。
 * 対応機能ID（トレーサビリティ）： TC-006, REQ-001
 */
async function skipOpening(page) {
  await press(page, "#stage");
  return waitForState(page, "setting");
}

/**
 * 関数名： textOfTree
 * 戻り値： テキストファイルを連結した文字列。
 * 引数： dir は走査するディレクトリ。
 * 関数の概要： 拡張機能のソースと掲載文を、禁止語の照合用に読む。
 * 対応機能ID（トレーサビリティ）： TC-055, REQ-006
 */
function textOfTree(dir) {
  let buf = "";
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      buf += textOfTree(full);
      continue;
    }
    if (/\.(js|html|css|json|md|txt)$/i.test(entry.name)) {
      buf += fs.readFileSync(full, "utf8");
      buf += "\n";
    }
  }
  return buf;
}

/**
 * 関数名： fileNames
 * 戻り値： ファイル名の配列。
 * 引数： dir は走査するディレクトリ。
 * 関数の概要： node_modules と .git を除き、リポジトリのファイル名を集める。
 * 対応機能ID（トレーサビリティ）： TC-051, REQ-006
 */
function fileNames(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    found.push(entry.name);
    if (entry.isDirectory()) {
      found.push(...fileNames(path.join(dir, entry.name)));
    }
  }
  return found;
}

test("TC-001 アイコンで専用ウィンドウが1つ開く", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    // Act
    const page = await openByIcon(launched);
    // Assert
    expect(appPages(launched.context)).toHaveLength(1);
    expect(page.url()).toContain("app.html");
  });
});

test("TC-065 ページのクリックと新しいタブとアドレスバーでは専用ウィンドウが開かない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = launched.context.pages().find((item) => !item.url().includes("app.html"))
      || await launched.context.newPage();
    await page.goto("data:text/html,<title>tab</title>");
    // Act
    await page.locator("body").click();
    await page.keyboard.press("Control+t");
    await page.keyboard.press("Control+l");
    await page.keyboard.type("a");
    await page.waitForTimeout(300);
    // Assert
    expect(appPages(launched.context)).toHaveLength(0);
  });
});

test("TC-003 最初の画面はオープニングである", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    // Act
    const page = await openByIcon(launched);
    const view = await readApp(page);
    // Assert
    expect(view.state).toBe("opening");
  });
});

test("TC-004 クリックしないオープニングは2秒以上3秒以下で設定画面になる", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    // Act
    const view = await waitForState(page, "setting", 5000);
    const elapsed = markStamp(view.marks, "setting-shown") - markStamp(view.marks, "opening-shown");
    // Assert
    expect(elapsed).toBeGreaterThanOrEqual(2000);
    expect(elapsed).toBeLessThanOrEqual(3000);
  });
});

test("TC-007 クリックしないとオープニングは最後まで再生される", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    // Act
    const view = await waitForState(page, "setting", 5000);
    const elapsed = markStamp(view.marks, "setting-shown") - markStamp(view.marks, "opening-shown");
    // Assert
    expect(view.state).toBe("setting");
    expect(elapsed).toBeGreaterThanOrEqual(2000);
    expect(elapsed).toBeLessThanOrEqual(3000);
  });
});

test("TC-006 便器の線画のクリックで設定画面になり、3秒未満である", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await page.waitForFunction(() => document.querySelector("#signature").innerText.length > 0);
    // Act
    const view = await skipOpening(page);
    const elapsed = markStamp(view.marks, "setting-shown") - markStamp(view.marks, "opening-shown");
    // Assert
    expect(view.state).toBe("setting");
    expect(elapsed).toBeLessThan(3000);
  });
});

test("TC-008 便器の線画に出る文字はアール・マットだけで、年は無い", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    // Act
    await page.waitForFunction(() => document.body.innerText.includes("アール・マット"));
    const view = await readApp(page);
    // Assert
    expect(view.state).toBe("opening");
    expect(view.bodyText.trim()).toBe("アール・マット");
    expect(view.bodyText.includes("年")).toBe(false);
    expect(/\d{4}/.test(view.bodyText)).toBe(false);
  });
});

test("TC-009 オープニングの画面文字に禁止名称は無い", async () => {
  // Arrange
  const seen = [];
  await withExtension(extensionPath, async (launched) => {
    const full = await openByIcon(launched);
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      seen.push((await readApp(full)).bodyText);
      if ((await readApp(full)).state === "setting") {
        break;
      }
      await full.waitForTimeout(40);
    }
  });
  await withExtension(extensionPath, async (launched) => {
    const skipped = await openByIcon(launched);
    await skipOpening(skipped);
    seen.push((await readApp(skipped)).bodyText);
  });
  // Act
  const hit = containsName(seen.join("\n"), names);
  // Assert
  expect(hit).toEqual([]);
});

test("TC-002 開いている専用ウィンドウは前面に出る。新しい窓とオープニングは始まらない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    const before = await readApp(page);
    const openingMarks = before.marks.filter((mark) => mark.name === "opening-shown");
    // Act
    await triggerAction(launched.context, launched.extensionId);
    await page.waitForTimeout(400);
    const after = await readApp(page);
    const focused = await page.evaluate(async () => {
      const win = await chrome.windows.getCurrent();
      return win.focused;
    });
    // Assert
    expect(appPages(launched.context)).toHaveLength(1);
    expect(after.state).toBe("setting");
    expect(after.marks.filter((mark) => mark.name === "opening-shown")).toEqual(openingMarks);
    expect(focused).toBe(true);
  });
});

test("TC-013 オープニング中に閉じると、開き直したときは最初から始まる", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await page.waitForFunction(() => {
      const app = document.querySelector("#app");
      return app.dataset.state === "opening" && document.querySelector("#signature").innerText === "";
    });
    // Act
    await page.close();
    const again = await openByIcon(launched);
    await again.waitForFunction(() => document.body.innerText.includes("アール・マット"));
    const view = await readApp(again);
    // Assert
    expect(view.state).toBe("opening");
    expect(view.signature).toBe("アール・マット");
  });
});

test("TC-015 完走でもスキップでも設定時刻は3:00である", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const full = await openByIcon(launched);
    // Act
    const done = await waitForState(full, "setting", 5000);
    // Assert
    expect(done.displayTime).toBe("3:00");
    expect(done.settingMs).toBe(180000);
  });
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    const skipped = await skipOpening(page);
    expect(skipped.displayTime).toBe("3:00");
    expect(skipped.settingMs).toBe(180000);
  });
});

test("TC-016 ＋の1回は3:01、−の1回は2:59である", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    // Act
    await press(page, "#plus");
    await page.waitForTimeout(50);
    const plus = await readApp(page);
    await page.close();
    const again = await openByIcon(launched);
    await skipOpening(again);
    await press(again, "#minus");
    await again.waitForTimeout(50);
    const minus = await readApp(again);
    // Assert
    expect(plus.displayTime).toBe("3:01");
    expect(minus.displayTime).toBe("2:59");
  });
});

test("TC-017 0:10と5:00では1回押しでも範囲を出ない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const low = await openByIcon(launched);
    await skipOpening(low);
    await setSettingMs(low, 10000);
    // Act
    await press(low, "#minus");
    await low.waitForTimeout(50);
    const stayedLow = await readApp(low);
    await low.close();
    const high = await openByIcon(launched);
    await skipOpening(high);
    await setSettingMs(high, 300000);
    await press(high, "#plus");
    await high.waitForTimeout(50);
    const stayedHigh = await readApp(high);
    // Assert
    expect(stayedLow.displayTime).toBe("0:10");
    expect(stayedHigh.displayTime).toBe("5:00");
  });
});

test("TC-018 端の長押しでも0:10と5:00を超えない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const low = await openByIcon(launched);
    await skipOpening(low);
    await setSettingMs(low, 10000);
    // Act
    await hold(low, "#minus", 1100);
    const stayedLow = await readApp(low);
    await low.close();
    const high = await openByIcon(launched);
    await skipOpening(high);
    await setSettingMs(high, 300000);
    await hold(high, "#plus", 1100);
    const stayedHigh = await readApp(high);
    // Assert
    expect(stayedLow.displayTime).toBe("0:10");
    expect(stayedHigh.displayTime).toBe("5:00");
  });
});

test("TC-019 1秒以上の＋長押しは2回以上増え、5:00を超えない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    // Act
    await hold(page, "#plus", 1100);
    const view = await readApp(page);
    // Assert
    expect(view.settingMs).toBeGreaterThanOrEqual(182000);
    expect(view.settingMs).toBeLessThanOrEqual(300000);
  });
});

test("TC-020 0:11は0:10になり、4:59は5:00になる", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const low = await openByIcon(launched);
    await skipOpening(low);
    await setSettingMs(low, 11000);
    // Act
    await press(low, "#minus");
    await low.waitForTimeout(50);
    const down = await readApp(low);
    await low.close();
    const high = await openByIcon(launched);
    await skipOpening(high);
    await setSettingMs(high, 299000);
    await press(high, "#plus");
    await high.waitForTimeout(50);
    const up = await readApp(high);
    // Assert
    expect(down.displayTime).toBe("0:10");
    expect(down.settingMs).toBe(10000);
    expect(up.displayTime).toBe("5:00");
    expect(up.settingMs).toBe(300000);
  });
});

test("TC-021 閉じると変えた設定時刻は残らず、3:00から始まる", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await press(page, "#plus");
    // Act
    await page.close();
    const again = await openByIcon(launched);
    const view = await skipOpening(again);
    // Assert
    expect(view.state).toBe("setting");
    expect(view.settingMs).toBe(180000);
    expect(view.displayTime).toBe("3:00");
  });
});

test("TC-025 出撃ボタンの文字はジュワッチ！である", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    // Act
    const view = await readApp(page);
    // Assert
    expect(view.sortie).toBe("ジュワッチ！");
    expect(view.sortie).not.toBe("ジュワッ！");
  });
});

test("TC-022 出撃演出は2秒で、そのあいだ残時間は3:00のままである", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    const samples = [];
    // Act
    await press(page, "#sortie");
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const view = await readApp(page);
      samples.push(view);
      if (view.state === "countdown") {
        break;
      }
      await page.waitForTimeout(40);
    }
    const during = samples.filter((view) => view.state === "sortie");
    const started = samples.find((view) => view.state === "countdown");
    const elapsed = markStamp(started.marks, "countdown-started") - markStamp(started.marks, "sortie-started");
    // Assert
    expect(during.length).toBeGreaterThan(0);
    expect(during.every((view) => view.displayTime === "3:00" && view.remainingMs === 180000)).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(elapsed).toBeLessThanOrEqual(2100);
    expect(started.remainingMs).toBeLessThanOrEqual(180000);
    expect(started.remainingMs).toBeGreaterThan(178000);
  });
});

test("TC-023 出撃演出中のボタンは無視され、残時間は1:30から減る", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await setSettingMs(page, 90000);
    // Act
    await page.evaluate(() => {
      const pressId = (elementId) => {
        document.querySelector(elementId).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      };
      pressId("#sortie");
      pressId("#plus");
      pressId("#minus");
      pressId("#sortie");
    });
    const started = await waitForState(page, "countdown", 4000);
    const elapsed = markStamp(started.marks, "countdown-started") - markStamp(started.marks, "sortie-started");
    await page.waitForTimeout(300);
    const later = await readApp(page);
    // Assert
    expect(started.settingMs).toBe(90000);
    expect(started.displayTime).toBe("1:30");
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(elapsed).toBeLessThanOrEqual(2100);
    expect(later.state).toBe("countdown");
    expect(later.settingMs).toBe(90000);
    expect(later.remainingMs).toBeLessThan(started.remainingMs);
  });
});

test("TC-024 一時停止とリセットの操作子は無い", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await press(page, "#sortie");
    // Act
    const view = await waitForState(page, "countdown", 4000);
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button, input, a")).map((element) => element.textContent);
    });
    // Assert
    expect(view.state).toBe("countdown");
    expect(labels.join("\n").includes("一時停止")).toBe(false);
    expect(labels.join("\n").includes("リセット")).toBe(false);
  });
});

test("TC-026 出撃演出中とカウントダウン中に閉じると、起動から始まる", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const sortiePage = await openByIcon(launched);
    await skipOpening(sortiePage);
    await press(sortiePage, "#sortie");
    await waitForState(sortiePage, "sortie", 2000);
    // Act
    await sortiePage.close();
    const afterSortie = await openByIcon(launched);
    const sortieRestart = await readApp(afterSortie);
    await afterSortie.close();
    const countPage = await openByIcon(launched);
    await skipOpening(countPage);
    await press(countPage, "#sortie");
    await waitForState(countPage, "countdown", 4000);
    await countPage.close();
    const afterCount = await openByIcon(launched);
    const countRestart = await readApp(afterCount);
    // Assert
    expect(sortieRestart.state).toBe("opening");
    expect(countRestart.state).toBe("opening");
  });
});

test("TC-027 カウントダウン中の出撃ボタンは2本目を始めない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await press(page, "#sortie");
    const started = await waitForState(page, "countdown", 4000);
    // Act
    await press(page, "#sortie");
    await page.waitForTimeout(400);
    const later = await readApp(page);
    // Assert
    expect(later.state).toBe("countdown");
    expect(later.settingMs).toBe(started.settingMs);
    expect(later.remainingMs).toBeLessThan(started.remainingMs);
    expect(later.marks.filter((mark) => mark.name === "countdown-started")).toHaveLength(1);
  });
});

test("TC-064 カウントダウン中の＋と−は残時間を止めない", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await press(page, "#sortie");
    const started = await waitForState(page, "countdown", 4000);
    // Act
    await press(page, "#plus");
    await press(page, "#minus");
    await page.waitForTimeout(400);
    const later = await readApp(page);
    // Assert
    expect(later.state).toBe("countdown");
    expect(later.settingMs).toBe(started.settingMs);
    expect(later.remainingMs).toBeLessThan(started.remainingMs);
  });
});

test("TC-044 色と点滅を残時間と別に選ぶ操作子は無い", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await press(page, "#sortie");
    await waitForState(page, "countdown", 4000);
    // Act
    const controls = await page.evaluate(() => {
      return {
        selects: document.querySelectorAll("select, input").length,
        buttons: Array.from(document.querySelectorAll("button")).map((button) => button.id),
      };
    });
    // Assert
    expect(controls.selects).toBe(0);
    expect(controls.buttons).toEqual(["minus", "sortie", "plus"]);
  });
});

test("TC-043 点滅中に閉じると、開き直したときはオープニングから始まる", async () => {
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await setSettingMs(page, 90000);
    await press(page, "#sortie");
    await waitForState(page, "countdown", 4000);
    await page.waitForFunction(() => document.querySelector("#app").dataset.beaconColor === "blue");
    // Act
    await page.close();
    const again = await openByIcon(launched);
    const view = await readApp(again);
    // Assert
    expect(view.state).toBe("opening");
  });
});

test("TC-031 TC-032 TC-034 TC-040 赤の点滅間隔は開始時の式に対して0.1秒以内である", async () => {
  test.setTimeout(120000);
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await setSettingMs(page, 60000);
    // Act
    await press(page, "#sortie");
    await waitForState(page, "countdown", 4000);
    await page.waitForFunction(() => {
      const log = JSON.parse(document.querySelector("#app").dataset.blinkLog || "[]");
      return log.some((item) => item.phase === "red" && item.measuredMs == null && item.truncated === false);
    });
    const openBlink = (await readApp(page)).blinkLog.find((item) => item.phase === "red" && item.measuredMs == null);
    await page.waitForFunction(() => {
      const app = document.querySelector("#app");
      return app.dataset.state === "shrink" || app.dataset.state === "shout" || app.dataset.state === "stars";
    }, null, { timeout: 90000 });
    const view = await readApp(page);
    const reds = view.blinkLog.filter((item) => item.phase === "red");
    const finished = reds.filter((item) => item.truncated === false && item.measuredMs != null);
    const truncated = reds.filter((item) => item.truncated === true);
    const atMinute = finished.find((item) => item.startRemainingMs >= 59000);
    const atHalf = finished.find((item) => item.startRemainingMs <= 31000 && item.startRemainingMs >= 29000);
    const floor = finished.filter((item) => item.startRemainingMs <= 19800);
    const floorCut = truncated.filter((item) => item.startRemainingMs <= 19800);
    // Assert
    expect(atMinute).toBeTruthy();
    expect(atMinute.intervalMs).toBeGreaterThanOrEqual(900);
    expect(atMinute.intervalMs).toBeLessThanOrEqual(1100);
    expect(atMinute.measuredMs).toBeGreaterThanOrEqual(900);
    expect(atMinute.measuredMs).toBeLessThanOrEqual(1100);
    expect(openBlink.intervalMs).toBe(atMinute.intervalMs);
    expect(atHalf).toBeTruthy();
    expect(atHalf.measuredMs).toBeGreaterThanOrEqual(400);
    expect(atHalf.measuredMs).toBeLessThanOrEqual(600);
    expect(Math.abs(atMinute.intervalMs - atHalf.intervalMs)).toBeGreaterThan(200);
    expect(floor.length).toBeGreaterThan(0);
    for (const item of floor) {
      expect(item.intervalMs).toBe(330);
      expect(item.measuredMs).toBeGreaterThanOrEqual(230);
      expect(item.measuredMs).toBeLessThanOrEqual(430);
    }
    for (const item of floorCut) {
      expect(item.intervalMs).toBe(330);
      expect(item.measuredMs).toBeNull();
    }
    for (const item of finished) {
      const planned = Math.round(Math.max(item.startRemainingMs / 1000 / 60, 0.33) * 1000);
      expect(item.intervalMs).toBe(planned);
      expect(Math.abs(item.measuredMs - planned)).toBeLessThanOrEqual(100);
    }
  });
});

test("TC-037 表示は約1秒ごとに1秒減り、境界の表示は2:01と2:00と1:00である", async () => {
  test.setTimeout(220000);
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    // Act
    await press(page, "#sortie");
    await waitForState(page, "countdown", 4000);
    const samples = await page.evaluate(() => {
      return new Promise((resolve) => {
        const found = [];
        const changes = [];
        let last = null;
        const timer = setInterval(() => {
          const app = document.querySelector("#app");
          const display = document.querySelector("#time").textContent;
          const remaining = Number(app.dataset.remainingMs);
          const state = app.dataset.state;
          if (state === "countdown" && display !== last) {
            changes.push({ display, remaining, t: performance.now() });
            last = display;
          }
          if (state === "countdown") {
            found.push({ display, remaining });
          }
          if (state === "countdown" && remaining <= 59000 && changes.some((item) => item.display === "1:00")) {
            clearInterval(timer);
            resolve({ found, changes });
          }
        }, 16);
      });
    });
    const gaps = [];
    for (let i = 1; i < samples.changes.length; i += 1) {
      gaps.push(samples.changes[i].t - samples.changes[i - 1].t);
    }
    const around = (low, high) => samples.found.filter((item) => item.remaining > low && item.remaining <= high);
    // Assert
    expect(gaps.length).toBeGreaterThan(50);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(800);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(1200);
    expect(around(120000, 121000).length).toBeGreaterThan(0);
    expect(around(120000, 121000).every((item) => item.display === "2:01")).toBe(true);
    expect(around(119000, 120000).every((item) => item.display === "2:00")).toBe(true);
    expect(around(59000, 60000).every((item) => item.display === "1:00")).toBe(true);
    expect(samples.found.some((item) => item.remaining === 120000) || around(119000, 120000).length > 0).toBe(true);
    expect(samples.found.some((item) => item.remaining === 120001) || around(120000, 121000).length > 0).toBe(true);
    expect(samples.found.some((item) => item.remaining === 60000) || around(59000, 60000).length > 0).toBe(true);
  });
});

test("TC-042 TC-046 TC-048 TC-049 TC-051 TC-054 TC-055 TC-058 TC-059 TC-060 掛け声のあと地球が点になる", async () => {
  test.setTimeout(90000);
  // Arrange
  const texts = [];
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    const collect = async () => {
      texts.push((await readApp(page)).bodyText);
    };
    await collect();
    await skipOpening(page);
    await setSettingMs(page, 10000);
    // Act
    await press(page, "#sortie");
    await waitForState(page, "countdown", 4000);
    const firstOpen = await page.waitForFunction(() => {
      const log = JSON.parse(document.querySelector("#app").dataset.blinkLog || "[]");
      return log.find((item) => item.phase === "red") || null;
    });
    const firstBlink = await firstOpen.jsonValue();
    await page.waitForFunction(() => {
      const log = JSON.parse(document.querySelector("#app").dataset.blinkLog || "[]");
      return log.some((item) => item.phase === "red" && item.measuredMs != null);
    });
    const measured = (await readApp(page)).blinkLog.find((item) => item.phase === "red" && item.measuredMs != null);
    await page.evaluate(() => {
      const snaps = [];
      const step = () => {
        const app = document.querySelector("#app");
        const earth = document.querySelector("#earth");
        const rect = earth.getBoundingClientRect();
        const marks = JSON.parse(app.dataset.marks || "[]");
        const shrink = marks.find((mark) => mark.name === "shrink-started");
        snaps.push({
          state: app.dataset.state,
          timeText: document.querySelector("#time").innerText,
          timeVisible: app.dataset.timeVisible,
          earthRect: Math.max(rect.width, rect.height),
          earthAttr: Number(app.dataset.earthDiameterPx),
          elapsed: shrink ? performance.now() - shrink.t : null,
          shoutUrl: app.dataset.shoutUrl || "",
          bodyText: document.body.innerText,
        });
        const seenStars = snaps.filter((item) => item.state === "stars").length;
        if (seenStars < 2) {
          requestAnimationFrame(step);
        }
      };
      window.__cbtSnaps = snaps;
      requestAnimationFrame(step);
    });
    await page.waitForFunction(() => {
      const snaps = window.__cbtSnaps || [];
      return snaps.filter((item) => item.state === "stars").length >= 2;
    }, null, { timeout: 30000 });
    const snaps = await page.evaluate(() => window.__cbtSnaps);
    for (const snap of snaps) {
      texts.push(snap.bodyText);
    }
    const shoutSeen = snaps.find((snap) => snap.state === "shout") || null;
    const shrinkSamples = snaps.filter((snap) => snap.state === "shrink");
    const stars = await readApp(page);
    const bytes = await page.evaluate(async (url) => {
      const response = await fetch(url);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    }, shoutSeen ? shoutSeen.shoutUrl : "");
    const fileBytes = Array.from(fs.readFileSync(path.join(extensionPath, "assets/audio/shout.wav")));
    const httpDuring = launched.httpRequests.slice();
    // Assert
    expect(firstBlink.startRemainingMs).toBeLessThanOrEqual(10000);
    expect(firstBlink.intervalMs).toBe(330);
    expect(measured.intervalMs).toBe(330);
    expect(measured.measuredMs).toBeGreaterThanOrEqual(230);
    expect(measured.measuredMs).toBeLessThanOrEqual(430);
    expect(shoutSeen).toBeTruthy();
    expect(shoutSeen.timeText).toBe("0:00");
    expect(shoutSeen.timeVisible).toBe("true");
    expect(bytes).toEqual(fileBytes);
    expect(httpDuring).toEqual([]);
    expect(shrinkSamples.length).toBeGreaterThan(2);
    expect(shrinkSamples.every((snap) => snap.timeText === "" && snap.timeVisible === "false")).toBe(true);
    expect(stars.state).toBe("stars");
    expect(stars.timeText).toBe("");
    expect(stars.marks.some((mark) => mark.name === "stars-started")).toBe(true);
    const early = shrinkSamples.filter((snap) => snap.elapsed < 4900);
    const point = shrinkSamples.find((snap) => snap.earthRect <= 4);
    expect(early.every((snap) => snap.earthRect > 4)).toBe(true);
    expect(point).toBeTruthy();
    expect(point.elapsed).toBeGreaterThanOrEqual(4900);
    expect(point.elapsed).toBeLessThanOrEqual(5100);
    for (let i = 1; i < shrinkSamples.length; i += 1) {
      expect(shrinkSamples[i].earthRect).toBeLessThanOrEqual(shrinkSamples[i - 1].earthRect + 0.05);
    }
    for (const snap of shrinkSamples) {
      expect(Math.abs(snap.earthAttr - snap.earthRect)).toBeLessThan(0.05);
    }
  });
  const store = fs.readFileSync(path.join(extensionPath, "store-listing.txt"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf8"));
  const screen = texts.join("\n");
  const corpus = [screen, store, manifest.name, manifest.description].join("\n");
  expect(containsName(corpus, names)).toEqual([]);
  expect(containsName(fileNames(root).join("\n"), names)).toEqual([]);
  expect(corpus.includes(kounin)).toBe(false);
  expect(corpus.includes(koushiki)).toBe(false);
  expect(textOfTree(extensionPath).includes(kounin)).toBe(false);
  expect(textOfTree(extensionPath).includes(koushiki)).toBe(false);
  expect(textOfTree(extensionPath).includes(vendor)).toBe(false);
  expect(fs.readFileSync(path.join(root, "README.md"), "utf8").includes(kounin)).toBe(false);
  expect(fs.readFileSync(path.join(root, "README.md"), "utf8").includes(koushiki)).toBe(false);
});

test("TC-050 TC-063 掛け声ファイルが無いときは0:00を出さず終了演出へ進む", async () => {
  test.setTimeout(60000);
  // Arrange
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "cbt-noshout-"));
  copyWithoutShout(extensionPath, dest);
  await withExtension(dest, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await setSettingMs(page, 10000);
    // Act
    await press(page, "#sortie");
    const samples = [];
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const view = await readApp(page);
      samples.push(view);
      if (view.state === "stars") {
        break;
      }
      await page.waitForTimeout(40);
    }
    const shrink = samples.find((view) => view.state === "shrink");
    const stars = samples.find((view) => view.state === "stars");
    // Assert
    expect(samples.some((view) => view.state === "shout")).toBe(false);
    expect(samples.some((view) => view.timeText === "0:00")).toBe(false);
    expect(shrink).toBeTruthy();
    expect(shrink.timeVisible).toBe("false");
    expect(shrink.timeText).toBe("");
    expect(stars).toBeTruthy();
    expect(stars.state).toBe("stars");
  });
});

test("TC-062 星の流れの途中で閉じると、開き直したときはオープニングから始まる", async () => {
  test.setTimeout(60000);
  // Arrange
  await withExtension(extensionPath, async (launched) => {
    const page = await openByIcon(launched);
    await skipOpening(page);
    await setSettingMs(page, 10000);
    await press(page, "#sortie");
    await waitForState(page, "stars", 30000);
    // Act
    await page.close();
    const again = await openByIcon(launched);
    const view = await readApp(again);
    // Assert
    expect(view.state).toBe("opening");
    expect(view.marks.some((mark) => mark.name === "stars-started")).toBe(false);
  });
});
