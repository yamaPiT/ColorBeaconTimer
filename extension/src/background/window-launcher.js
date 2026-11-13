/**
 * ファイル名： window-launcher.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ツールバーのアイコンから専用ウィンドウを1つ開き、既にあれば前面へ出す。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007
 */

import { WINDOW_H, WINDOW_W } from "../domain/constants.js";

/**
 * 関数名： openOrFocus
 * 戻り値： opened、focused、または WindowOpenFailed。
 * 引数： windowsApi は chrome.windows 相当。sessionStore は chrome.storage.session 相当。
 * 関数の概要： ウィンドウが無ければ app.html を作り、あれば URL を変えずに前面へ出す。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001
 */
export async function openOrFocus(windowsApi, sessionStore) {
  const stored = await sessionStore.get("windowId");
  const existingId = stored && stored.windowId != null ? stored.windowId : null;

  // 残っている id の窓が無い、または前面化に失敗したときは、鍵を消して作り直す。
  if (existingId != null) {
    let alive = false;
    try {
      const found = await windowsApi.get(existingId);
      alive = !!(found && found.id != null);
    } catch (err) {
      alive = false;
    }
    if (!alive) {
      await sessionStore.remove("windowId");
    } else {
      try {
        await windowsApi.update(existingId, { state: "normal", focused: true });
        return "focused";
      } catch (err) {
        await sessionStore.remove("windowId");
      }
    }
  }

  try {
    const created = await windowsApi.create({
      url: "app.html",
      type: "popup",
      width: WINDOW_W,
      height: WINDOW_H,
      focused: true,
    });
    if (!created || created.id == null) {
      return "WindowOpenFailed";
    }
    await sessionStore.set({ windowId: created.id });
    return "opened";
  } catch (err) {
    return "WindowOpenFailed";
  }
}

/**
 * 関数名： forgetWindow
 * 戻り値： なし。
 * 引数： sessionStore は session 領域。windowId は閉じた窓の id。
 * 関数の概要： 閉じた窓が専用ウィンドウなら、session の windowId を消す。
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
 * 関数の概要： アイコンのクリックと、窓を閉じた通知を登録する。
 * 対応機能ID（トレーサビリティ）： UNIT-001, REQ-001
 */
export function registerLauncher(chromeApi) {
  chromeApi.action.onClicked.addListener(() => {
    openOrFocus(chromeApi.windows, chromeApi.storage.session);
  });
  chromeApi.windows.onRemoved.addListener((windowId) => {
    forgetWindow(chromeApi.storage.session, windowId);
  });
}

// サービスワーカーの最初の評価で、クリックと閉じる通知を登録する。
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
