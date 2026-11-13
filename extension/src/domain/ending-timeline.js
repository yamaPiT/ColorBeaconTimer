/**
 * ファイル名： ending-timeline.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 地球の直径と、その後の星の位置を計算する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-006, REQ-007
 */

import { EARTH_POINT_PX, EARTH_SHRINK_MS, EARTH_START_PX } from "./constants.js";

/** 同時に流す星の数。合否の対象外。 */
const STAR_COUNT = 36;

/**
 * 関数名： earthDiameterPx
 * 戻り値： 画面上の地球の一辺。単位は px。
 * 引数： elapsedMs は縮小開始からの経過。単位はミリ秒。
 * 関数の概要： 240 px から 4 px へ、5000 ミリ秒で直線的に減らし、その後は 4 px を返す。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-007
 */
export function earthDiameterPx(elapsedMs) {
  if (elapsedMs <= 0) {
    return EARTH_START_PX;
  }
  if (elapsedMs >= EARTH_SHRINK_MS) {
    return EARTH_POINT_PX;
  }
  const ratio = elapsedMs / EARTH_SHRINK_MS;
  return EARTH_START_PX + (EARTH_POINT_PX - EARTH_START_PX) * ratio;
}

/**
 * 関数名： starPositions
 * 戻り値： 中心からの x と y を持つ配列。単位は px。
 * 引数： elapsedMs は星の流れの開始からの経過。random01 は 0 以上 1 未満を返す関数。
 * 関数の概要： 注入された乱数で角度と速さを決め、経過とともに中心から外へ置く。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-007
 */
export function starPositions(elapsedMs, random01) {
  const stars = [];
  const elapsed = elapsedMs < 0 ? 0 : elapsedMs;
  const seconds = elapsed / 1000;

  // 同じ乱数関数を同じ順で呼べば、角度は固定され、半径だけが進む。
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const angle = random01() * Math.PI * 2;
    const speed = 30 + random01() * 90;
    const born = random01();
    const radius = (born * 80 + speed * seconds) % 340;
    stars.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return stars;
}

/**
 * 関数名： mulberry32
 * 戻り値： 0 以上 1 未満の乱数を返す関数。
 * 引数： seed は再現用の整数。
 * 関数の概要： フレームごとに同じ種から乱数列を作り直し、星の角度を固定する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-007
 */
export function mulberry32(seed) {
  let value = seed >>> 0;
  return function random01() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
