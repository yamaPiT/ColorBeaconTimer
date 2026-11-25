/**
 * ファイル名： opening-timeline.js
 * バージョン番号： 4.0.0
 * 作成日： 2026-11-19
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： オープニング第1〜第4シーンの前後手動遷移、前後ボタン表示可否、画像種別、BGMトラック識別子、および第5シーンのランプ拡大倍率を計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-003, REQ-001
 */

import { OPENING_SCENE5_MS } from "./constants.js";

/** オープニング第1〜第4シーンの静的フレーム定義テーブル */
const STATIC_SCENE_FRAMES = Object.freeze({
  1: Object.freeze({
    step: "scene1",
    sceneIndex: 1,
    scale: 1,
    imageKind: "none",
    bgmTrack: "none",
    showBack: false,
    showNext: true,
  }),
  2: Object.freeze({
    step: "scene2",
    sceneIndex: 2,
    scale: 1,
    imageKind: "fountain",
    bgmTrack: "scene2",
    showBack: true,
    showNext: true,
  }),
  3: Object.freeze({
    step: "scene3",
    sceneIndex: 3,
    scale: 1,
    imageKind: "threeFace",
    bgmTrack: "scene3",
    showBack: true,
    showNext: true,
  }),
  4: Object.freeze({
    step: "scene4",
    sceneIndex: 4,
    scale: 1,
    imageKind: "none",
    bgmTrack: "none",
    showBack: true,
    showNext: true,
  }),
});

/** オープニング完了状態および範囲外シーン用のフレーム定義 */
const DONE_FRAME = Object.freeze({
  step: "done",
  sceneIndex: 0,
  scale: 1,
  imageKind: "none",
  bgmTrack: "none",
  showBack: false,
  showNext: false,
});

/**
 * 関数名： stepOpeningScene
 * 戻り値： 遷移後のシーン番号（範囲外および第5シーン時は sceneIndex をそのまま返す）。
 * 引数： sceneIndex は現在のシーン番号、action は 'next' | 'back'。
 * 関数の概要： 第1〜第4シーンにおける NEXT / Back ボタン押下後のシーン番号を純粋に計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-003, REQ-001
 */
export function stepOpeningScene(sceneIndex, action) {
  // 第1〜第4シーン以外は手動前後遷移を行わず、そのまま返す。
  if (!Number.isInteger(sceneIndex) || sceneIndex < 1 || sceneIndex > 4) {
    return sceneIndex;
  }

  if (action === "next") {
    return sceneIndex + 1;
  }

  if (action === "back") {
    return sceneIndex === 1 ? 1 : sceneIndex - 1;
  }

  return sceneIndex;
}

/**
 * 関数名： openingFrame
 * 戻り値： { step: string, sceneIndex: number, scale: number, imageKind: string, bgmTrack: string, showBack: boolean, showNext: boolean }。
 * 引数： sceneIndex は現在のシーン番号（1〜5）、scene5ElapsedMs は第5シーン開始からの経過ミリ秒。
 * 関数の概要： シーン番号と第5シーン経過ミリ秒から、オープニングの描画状態・BGMトラック識別子・前後ボタン表示可否・拡大率を計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-003, REQ-001
 */
export function openingFrame(sceneIndex, scene5ElapsedMs = 0) {
  // 第1〜第4シーンは静的テーブルから表示状態・BGM識別子・ボタン可視性を返す。
  if (Object.prototype.hasOwnProperty.call(STATIC_SCENE_FRAMES, sceneIndex)) {
    return { ...STATIC_SCENE_FRAMES[sceneIndex] };
  }

  // 第5シーンは 0 <= elapsed < OPENING_SCENE5_MS のあいだ青色ランプを線形拡大し、無音とする。
  if (sceneIndex === 5) {
    const t = Math.max(0, Number(scene5ElapsedMs) || 0);
    if (t < OPENING_SCENE5_MS) {
      return {
        step: "scene5",
        sceneIndex: 5,
        scale: t / OPENING_SCENE5_MS,
        imageKind: "blueLamp",
        bgmTrack: "none",
        showBack: false,
        showNext: false,
      };
    }
    return { ...DONE_FRAME };
  }

  // 1〜5 以外のシーン番号は完了扱いとする。
  return { ...DONE_FRAME };
}
