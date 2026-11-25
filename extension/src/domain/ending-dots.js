/**
 * ファイル名： ending-dots.js
 * バージョン番号： 2.0.0
 * 作成日： 2026-11-16
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 画面中央から360度全周囲方向へ飛散する終了演出ドットの生成と座標計算を行う。
 * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-007
 */

/**
 * 関数名： createDotField
 * 戻り値： Dot[]（角度・速度・半径・色の配列）。
 * 引数： count は生成するドット数、random01 は 0 以上 1 未満の乱数を返す関数。
 * 関数の概要： 注入された乱数関数を用いて360度全周囲方向の初期ドット群を生成する。
 * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-007
 */
export function createDotField(count, random01) {
  const rng = typeof random01 === "function" ? random01 : Math.random;
  const dots = [];

  for (let i = 0; i < count; i += 1) {
    // 角度は 0 以上 2π 未満、速度は正の値（px/秒）を割り当てる。
    const angle = rng() * Math.PI * 2;
    const speed = 140 + rng() * 260;
    const radius = 2 + rng() * 3.5;
    const hue = Math.floor(rng() * 360);
    dots.push({
      angle,
      speed,
      radius,
      color: `hsl(${hue}, 90%, 75%)`,
    });
  }

  return dots;
}

/**
 * 関数名： dotPositions
 * 戻り値： DotPoint[]（x, y, radius, color の配列）。
 * 引数： dots はドット配列、elapsedMs は演出開始からの経過ミリ秒、centerX/centerY は中心座標、width/height は描画領域サイズ。
 * 関数の概要： 経過時刻に応じた各ドットの座標を計算し、領域外に出たドットは中央から再飛散させる。
 * 対応機能ID（トレーサビリティ）： UNIT-009, REQ-007
 */
export function dotPositions(dots, elapsedMs, centerX, centerY, width, height) {
  const tSec = Math.max(0, Number(elapsedMs) || 0) / 1000;
  // 描画領域の対角線半長より少し大きい距離で中央へ折り返し、再飛散を継続する。
  const maxDistance = Math.hypot(width, height) * 0.55 + 16;

  return dots.map((dot) => {
    const rawDistance = dot.speed * tSec;
    const distance = maxDistance > 0 ? rawDistance % maxDistance : 0;
    return {
      x: centerX + Math.cos(dot.angle) * distance,
      y: centerY + Math.sin(dot.angle) * distance,
      radius: dot.radius,
      color: dot.color,
    };
  });
}
