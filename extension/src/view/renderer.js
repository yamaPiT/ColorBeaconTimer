/**
 * ファイル名： renderer.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ViewModel を専用ウィンドウの DOM、Canvas、img へ描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-003, REQ-004, REQ-006, REQ-007
 */

const KNOWN_STATES = new Set([
  "opening",
  "setting",
  "sortie",
  "countdown",
  "shout",
  "shrink",
  "stars",
]);

const COLOR = {
  blue: "#1a5cff",
  red: "#ff2a2a",
};

/**
 * 関数名： render
 * 戻り値： 未知の状態名のときは UnknownState。描けたときは undefined。
 * 引数： viewModel は1フレームの値。dom は文書。
 * 関数の概要： 文字は DOM に、演出は Canvas に、地球は img に置く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-003, REQ-004, REQ-006, REQ-007
 */
export function render(viewModel, dom) {
  if (!viewModel || !KNOWN_STATES.has(viewModel.state)) {
    return "UnknownState";
  }
  const root = dom.querySelector("#app");
  if (!root) {
    return "UnknownState";
  }

  // 観測属性は利用者向けの文言ではない。自動テストが毎フレーム読む。
  writeObservation(root, viewModel);

  const signature = dom.querySelector("#signature");
  const time = dom.querySelector("#time");
  const controls = dom.querySelector("#controls");
  const beacon = dom.querySelector("#beacon");
  const earth = dom.querySelector("#earth");
  const canvas = dom.querySelector("#stage");

  // 便器の線画のあいだだけ、署名を出す。年は出さない。
  const showSign = viewModel.openingStep === "toilet" || viewModel.openingStep === "shake";
  signature.textContent = showSign ? "アール・マット" : "";
  signature.hidden = !showSign;

  time.textContent = viewModel.timeVisible ? viewModel.displayTime : "";
  time.hidden = !viewModel.timeVisible;

  controls.hidden = !viewModel.buttonsVisible;

  paintBeacon(beacon, viewModel);
  paintEarth(earth, root, viewModel);
  paintStage(canvas, viewModel);
  return undefined;
}

/**
 * 関数名： writeObservation
 * 戻り値： なし。
 * 引数： root は #app。viewModel は1フレームの値。
 * 関数の概要： ルート要素の data 属性へ、状態、残時間、点滅記録、印を書く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-004, REQ-007
 */
function writeObservation(root, viewModel) {
  root.dataset.state = viewModel.state;
  root.dataset.remainingMs = String(Math.round(viewModel.remainingMs));
  root.dataset.settingMs = String(Math.round(viewModel.settingMs));
  root.dataset.displayTime = viewModel.displayTime;
  root.dataset.timeVisible = viewModel.timeVisible ? "true" : "false";
  root.dataset.beaconColor = viewModel.beaconColor;
  root.dataset.beaconOpacity = String(viewModel.beaconOpacity);
  root.dataset.shoutUrl = viewModel.shoutUrl || "";
  root.dataset.blinkLog = JSON.stringify(viewModel.blinkLog || []);
  root.dataset.marks = JSON.stringify(viewModel.marks || []);
}

/**
 * 関数名： paintBeacon
 * 戻り値： なし。
 * 引数： beacon は円の要素。viewModel は色と不透明度を持つ。
 * 関数の概要： 青と赤のランプを CSS の色と不透明度で出す。消灯のときは隠す。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-004
 */
function paintBeacon(beacon, viewModel) {
  // 消灯の区分だけ要素を外す。青のフェードと赤の後半は、不透明度 0 で残す。
  beacon.hidden = viewModel.beaconColor === "off";
  beacon.style.background = COLOR[viewModel.beaconColor] || "transparent";
  beacon.style.opacity = String(viewModel.beaconOpacity);
}

/**
 * 関数名： paintEarth
 * 戻り値： なし。
 * 引数： earth は img。root は #app。viewModel は直径を持つ。
 * 関数の概要： 縮小中だけ写真を正方形で出し、表示後の矩形を観測属性へ書く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-007
 */
function paintEarth(earth, root, viewModel) {
  const diameter = viewModel.earthDiameterPx;
  if (!diameter || diameter <= 0) {
    earth.hidden = true;
    earth.style.width = "0px";
    earth.style.height = "0px";
    root.dataset.earthDiameterPx = "0";
    return;
  }
  earth.hidden = false;
  earth.style.width = diameter + "px";
  earth.style.height = diameter + "px";
  const rect = earth.getBoundingClientRect();
  const shown = Math.max(rect.width, rect.height);
  root.dataset.earthDiameterPx = String(shown);
}

/**
 * 関数名： paintStage
 * 戻り値： なし。
 * 引数： canvas は #stage。viewModel は演出のステップを持つ。
 * 関数の概要： オープニング、出撃演出、星を Canvas 2D に描く。文字は描かない。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001, REQ-003, REQ-007
 */
function paintStage(canvas, viewModel) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (viewModel.state === "opening") {
    drawOpening(ctx, viewModel.openingStep, viewModel.openingElapsedMs || 0);
    return;
  }
  if (viewModel.state === "sortie") {
    drawSortie(ctx, viewModel.sortieStep, viewModel.sortieElapsedMs || 0);
    return;
  }
  if (viewModel.state === "stars") {
    drawStars(ctx, viewModel.stars || []);
  }
}

/**
 * 関数名： drawOpening
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。step は表示ステップ。elapsed はオープニングの経過。
 * 関数の概要： 便器の線画、3回の揺れ、3つの顔、ランプの拡大を描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
 */
function drawOpening(ctx, step, elapsed) {
  ctx.save();
  if (step === "shake") {
    const local = Math.max(0, elapsed - 700);
    const angle = Math.sin((local / 400) * Math.PI * 2 * 3) * (8 * Math.PI / 180);
    ctx.translate(240, 320);
    ctx.rotate(angle);
    ctx.translate(-240, -320);
    drawToilet(ctx);
  } else if (step === "toilet") {
    drawToilet(ctx);
  } else if (step === "face1") {
    drawFaceLines(ctx);
  } else if (step === "face2") {
    drawFaceCircuit(ctx);
  } else if (step === "face3" || step === "expand") {
    const scale = step === "expand" ? 1 + ((elapsed - 2300) / 200) * 2 : 1;
    drawLamp(ctx, scale);
  }
  ctx.restore();
}

/**
 * 関数名： drawToilet
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。
 * 関数の概要： 便器を連想する単純な線を、座標だけで描く。写真は読まない。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
 */
function drawToilet(ctx) {
  ctx.save();
  ctx.translate(240, 300);
  ctx.strokeStyle = "#e6edf7";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-70, -80);
  ctx.quadraticCurveTo(-96, 30, -46, 96);
  ctx.lineTo(46, 96);
  ctx.quadraticCurveTo(96, 30, 70, -80);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -80, 72, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-24, 96);
  ctx.lineTo(-32, 156);
  ctx.lineTo(32, 156);
  ctx.lineTo(24, 96);
  ctx.stroke();
  ctx.restore();
}

/**
 * 関数名： drawFaceLines
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。
 * 関数の概要： 顔1として、単純な線の人の顔を描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
 */
function drawFaceLines(ctx) {
  ctx.strokeStyle = "#e6edf7";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(240, 250, 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(214, 234, 6, 0, Math.PI * 2);
  ctx.arc(266, 234, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(240, 262, 30, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

/**
 * 関数名： drawFaceCircuit
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。
 * 関数の概要： 顔2として、点と線の模様を描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
 */
function drawFaceCircuit(ctx) {
  const nodes = [
    [170, 190],
    [240, 168],
    [312, 204],
    [198, 276],
    [286, 286],
    [240, 236],
  ];
  ctx.strokeStyle = "#9eb6ff";
  ctx.fillStyle = "#d5e2ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(nodes[0][0], nodes[0][1]);
  for (let index = 1; index < nodes.length; index += 1) {
    ctx.lineTo(nodes[index][0], nodes[index][1]);
  }
  ctx.stroke();
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node[0], node[1], 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 関数名： drawLamp
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。scale は拡大率。
 * 関数の概要： 顔3として、青い丸いランプを描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-001
 */
function drawLamp(ctx, scale) {
  ctx.save();
  ctx.translate(240, 250);
  ctx.scale(scale, scale);
  ctx.fillStyle = COLOR.blue;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 関数名： drawSortie
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。step は映像ステップ。elapsed は出撃演出の経過。
 * 関数の概要： 中心から広がる光、近づく光点、着地を順に描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-003
 */
function drawSortie(ctx, step, elapsed) {
  if (step === "spread") {
    const radius = 20 + (Math.max(0, elapsed) / 700) * 220;
    const gradient = ctx.createRadialGradient(240, 280, 4, 240, 280, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(1, "rgba(26,92,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(240, 280, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (step === "approach") {
    const ratio = Math.min(1, Math.max(0, (elapsed - 700) / 700));
    const y = 70 + ratio * 210;
    const radius = 4 + ratio * 34;
    ctx.fillStyle = "#f4f7ff";
    ctx.beginPath();
    ctx.arc(240, y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = COLOR.blue;
  ctx.beginPath();
  ctx.arc(240, 280, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(240, 280, 74, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * 関数名： drawStars
 * 戻り値： なし。
 * 引数： ctx は 2D コンテキスト。stars は中心からの位置の配列。
 * 関数の概要： 渡された位置に、小さな点を描く。
 * 対応機能ID（トレーサビリティ）： UNIT-011, REQ-007
 */
function drawStars(ctx, stars) {
  ctx.fillStyle = "#f7fbff";
  for (const star of stars) {
    ctx.fillRect(240 + star.x, 320 + star.y, 2, 2);
  }
}
