/**
 * ファイル名： window-launcher.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ツールバーのアイコンから専用ウィンドウを1つ開き、既にあれば前面へ出す。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */

import { WINDOW_H, WINDOW_W } from "../domain/constants.js";

/** 同時クリックによる二重起動を防ぐための直列化キュー */
let actionQueue = Promise.resolve();

/**
 * 関数名： openOrFocus
 * 戻り値： Promise<'opened' | 'focused'>（ウィンドウ作成失敗時は WindowOpenFailed を送出）。
 * 引数： windowsApi は chrome.windows 相当、sessionStore は chrome.storage.session 相当。
 * 関数の概要： 専用ウィンドウが無ければ app.html を作成し、あれば URL を渡さず前面化する。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001
 */
export function openOrFocus(windowsApi, sessionStore) {
  const run = actionQueue.then(() => executeOpenOrFocus(windowsApi, sessionStore));
  actionQueue = run.catch(() => {});
  return run;
}

/**
 * 関数名： executeOpenOrFocus
 * 戻り値： Promise<'opened' | 'focused'>。
 * 引数： windowsApi, sessionStore。
 * 関数の概要： 直列化された openOrFocus の実処理を行う。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001
 */
async function executeOpenOrFocus(windowsApi, sessionStore) {
  const stored = await sessionStore.get("windowId");
  const existingId = stored && stored.windowId != null ? stored.windowId : null;

  // 既存 windowId がある場合は生存確認し、生きていれば前面化する。
  if (existingId != null) {
    let alive = false;
    try {
      const found = await windowsApi.get(existingId);
      alive = !!(found && found.id != null);
    } catch {
      alive = false;
    }

    if (!alive) {
      await sessionStore.remove("windowId");
    } else {
      try {
        await windowsApi.update(existingId, { state: "normal", focused: true });
        return "focused";
      } catch {
        await sessionStore.remove("windowId");
      }
    }
  }

  // 専用ウィンドウが存在しない場合は新規作成し、ID を sessionStore へ保存する。
  let created;
  try {
    created = await windowsApi.create({
      url: "app.html",
      type: "popup",
      width: WINDOW_W,
      height: WINDOW_H,
      focused: true,
    });
  } catch {
    throw new Error("WindowOpenFailed");
  }

  if (!created || created.id == null) {
    throw new Error("WindowOpenFailed");
  }

  await sessionStore.set({ windowId: created.id });
  return "opened";
}

/**
 * 関数名： forgetWindow
 * 戻り値： なし（Promise<void>）。
 * 引数： sessionStore は chrome.storage.session 相当、windowId は閉じたウィンドウ ID。
 * 関数の概要： 閉じたウィンドウが専用ウィンドウであれば sessionStore の windowId を削除する。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001, REQ-003
 */
export async function forgetWindow(sessionStore, windowId) {
  const stored = await sessionStore.get("windowId");
  if (stored && stored.windowId === windowId) {
    await sessionStore.remove("windowId");
  }
}

/**
 * 関数名： registerLauncher
 * 戻り値： なし。
 * 引数： chromeApi は chrome 名前空間。
 * 関数の概要： アイコンクリックおよびウィンドウ削除イベントのリスナーを登録する。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001
 */
export function registerLauncher(chromeApi) {
  chromeApi.action.onClicked.addListener(() => {
    openOrFocus(chromeApi.windows, chromeApi.storage.session).catch(() => {});
  });
  chromeApi.windows.onRemoved.addListener((windowId) => {
    forgetWindow(chromeApi.storage.session, windowId);
  });
}

// サービスワーカー起動時に Chrome API が存在すればリスナーを登録する。
const runtimeChrome = globalThis.chrome;
if (
  runtimeChrome
  && runtimeChrome.action
  && runtimeChrome.action.onClicked
  && runtimeChrome.windows
  && runtimeChrome.windows.onRemoved
  && runtimeChrome.storage
  && runtimeChrome.storage.session
) {
  registerLauncher(runtimeChrome);
}
