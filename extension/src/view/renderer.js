/**
 * ファイル名： renderer.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： ViewModel に基づき専用ウィンドウの DOM（日英常時併記・EXITボタン）、Canvas、BGM観測属性を含む観測属性を描画する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007
 */

/** 許可された画面状態の一覧 */
const VALID_STATES = new Set([
  "opening",
  "setting",
  "countdown",
  "endingAudio",
  "endingDots",
]);

/** オープニング各シーンのタイトル・日英併記本文・画像設定（SW105 REQ-001 v4.5 準拠） */
const OPENING_SCENES = {
  scene1: {
    title: "",
    text: [
      "このソフトウェアは、 DADA（Document-and-Agent-Driven Agile）プロセスで開発しました。",
      "",
      "This software was developed using the DADA (Document-and-Agent-Driven Agile) process.",
    ].join("\n"),
    textClass: "opening-text-center",
    imageSrc: "",
    imageAlt: "",
  },
  scene2: {
    title: "連想ゲーム1 / Association Game 1",
    text: [
      "・ダダと言えば、前衛的な芸術運動のダダイズム",
      '・中心人物の一人であるマルセル・デュシャンの代表作は、写真の大量生産の小便器を倒して "R.Mutt"と署名した「泉」。',
      "・流れる曲はダダにも関わったサティの名曲「ジムノペディ第1番」",
      "",
      '• Speaking of "Dada," it brings to mind Dadaism, the avant-garde art movement.',
      '• One of its key figures, Marcel Duchamp, created his iconic work "Fountain" (pictured) by turning a mass-produced urinal on its side and signing it "R.Mutt".',
      '• The music playing is "Gymnopédie No. 1," a masterpiece by Erik Satie, who was also associated with Dada.',
    ].join("\n"),
    textClass: "opening-text-list",
    imageSrc: "assets/images/fountain-stieglitz.jpg",
    imageAlt: "マルセル・デュシャン《泉》（アルフレッド・スティーグリッツ撮影） / Marcel Duchamp, Fountain (photographed by Alfred Stieglitz)",
  },
  scene3: {
    title: "連想ゲーム2 / Association Game 2",
    text: [
      "・ダダと言えば、ダダイズムの影響を受けて命名された宇宙怪獣（1967年1月22日放送のTV番組）",
      "・お約束通りにヒーローに倒されたが根強い人気があり、スイス大使館で2016年に開催されたダダイズム100周年パーティーに招待された。",
      "・流れる曲は1970〜80年代レトロフューチャー風の宇宙冒険シンセサイザー音楽",
      "",
      '• Speaking of "Dada," it also brings to mind the space monster named under the influence of Dadaism (a TV show broadcast on January 22, 1967).',
      "• Although defeated by the hero as expected, it remained deeply popular and was invited to the Dadaism 100th Anniversary Party held at the Swiss Embassy in 2016.",
      "• The music playing is 1970s–80s retro-futuristic space-adventure synthesizer music.",
    ].join("\n"),
    textClass: "opening-text-list",
    imageSrc: "assets/images/three-face-dadaism.svg",
    imageAlt: "オリジナルの白黒幾何学模様による三面シルエット風イラスト / Original black-and-white geometric three-face silhouette illustration",
  },
  scene4: {
    title: "連想ゲーム3 / Association Game 3",
    text: [
      "・ダダを倒したのは、胸にランプが光る、あのヒーロー。",
      "・そして、続くカラービームタイマーのプログラムは、DADA（Document-and-Agent-Driven Agile）プロセスで開発された",
      "",
      "• The one who defeated Dada was that hero with a glowing lamp on his chest.",
      "• And the ColorBeaconTimer program that follows was developed using the DADA (Document-and-Agent-Driven Agile) process.",
    ].join("\n"),
    textClass: "opening-text-list",
    imageSrc: "",
    imageAlt: "",
  },
};

/**
 * 関数名： render
 * 戻り値： 'ok' | 'UnknownState'。
 * 引数： viewModel は 1 フレーム分の描画モデル、dom は操作対象の DOM 要素群。
 * 関数の概要： 状態に応じてオープニング5シーン（タイトル・本文・画像・手動前後ボタン・第5シーン拡大）、タイマーUI、終了ドットCanvas、および観測属性を描画する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007
 */
export function render(viewModel, dom) {
  if (!viewModel || !VALID_STATES.has(viewModel.state)) {
    return "UnknownState";
  }

  const {
    app,
    openingStage,
    openingTitle,
    openingImage,
    openingLamp,
    openingText,
    openingNav,
    btnOpeningBack,
    btnOpeningNext,
    timerUi,
    beacon,
    timeEl,
    controls,
    btnMinus,
    btnStart,
    btnPlus,
    dotsCanvas,
    btnExit,
  } = dom;

  const isOpening = viewModel.state === "opening";
  const isEndingDots = viewModel.state === "endingDots";
  const isTimerUi = !isOpening && !isEndingDots;
  const backVisible = isOpening && Boolean(viewModel.openingBackVisible);
  const nextVisible = isOpening && Boolean(viewModel.openingNextVisible);
  const exitVisible = isEndingDots && Boolean(viewModel.exitVisible);

  // 観測属性を #app の dataset へ反映する。
  app.dataset.state = viewModel.state;
  app.dataset.openingStep = isOpening ? (viewModel.openingStep || "") : "";
  app.dataset.openingScene = isOpening ? String(Number(viewModel.openingSceneIndex) || 0) : "0";
  app.dataset.openingImage = isOpening ? (viewModel.openingImageKind || "none") : "none";
  app.dataset.openingScale = String(viewModel.openingScale);
  app.dataset.openingBackVisible = backVisible ? "true" : "false";
  app.dataset.openingNextVisible = nextVisible ? "true" : "false";
  app.dataset.openingBgm = viewModel.openingBgmTrack || "none";
  app.dataset.openingBgmUrl = viewModel.openingBgmUrl || "";
  app.dataset.openingBgmLog = JSON.stringify(viewModel.openingBgmLog || []);
  app.dataset.settingMs = String(Math.round(viewModel.settingMs));
  app.dataset.remainingMs = String(Math.round(viewModel.remainingMs));
  app.dataset.displayTime = viewModel.displayTime;
  app.dataset.beaconColor = viewModel.beaconColor;
  app.dataset.beaconLit = viewModel.beaconLit ? "true" : "false";
  app.dataset.juwacchiUrl = viewModel.juwacchiUrl || "";
  app.dataset.blinkLog = JSON.stringify(viewModel.blinkLog || []);
  app.dataset.marks = JSON.stringify(viewModel.marks || {});
  app.dataset.dotsActive = isEndingDots ? "true" : "false";
  app.dataset.exitVisible = exitVisible ? "true" : "false";

  // 状態別の表示領域を切り替える。
  openingStage.hidden = !isOpening;
  timerUi.hidden = !isTimerUi;
  dotsCanvas.hidden = !isEndingDots;
  if (btnExit) {
    // 終了演出画面（endingDots かつ exitVisible）のみ EXIT ボタンを操作可能に表示する。
    btnExit.hidden = !exitVisible;
    btnExit.disabled = !exitVisible;
    if (exitVisible) {
      btnExit.textContent = "EXIT";
    }
  }

  if (isOpening) {
    hideTimerUiChildren({
      timeEl,
      controls,
      btnMinus,
      btnStart,
      btnPlus,
    });
    renderOpening(viewModel, {
      openingTitle,
      openingImage,
      openingLamp,
      openingText,
      openingNav,
      btnOpeningBack,
      btnOpeningNext,
    });
  } else {
    hideOpeningChildren({
      openingTitle,
      openingImage,
      openingLamp,
      openingText,
      openingNav,
      btnOpeningBack,
      btnOpeningNext,
    });
    if (isTimerUi) {
      renderTimerUi(viewModel, {
        beacon,
        timeEl,
        controls,
        btnMinus,
        btnStart,
        btnPlus,
      });
    } else {
      hideTimerUiChildren({
        timeEl,
        controls,
        btnMinus,
        btnStart,
        btnPlus,
      });
      if (isEndingDots) {
        renderDotsCanvas(viewModel.dots || [], dotsCanvas);
      }
    }
  }

  return "ok";
}

/**
 * 関数名： hideTimerUiChildren
 * 戻り値： なし。
 * 引数： els はタイマーUI内部要素群。
 * 関数の概要： オープニングおよび終了演出（endingDots）への遷移時に時刻表示と設定ボタン群を確実に非表示・無効化する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-001, REQ-007
 */
function hideTimerUiChildren(els) {
  const { timeEl, controls, btnMinus, btnStart, btnPlus } = els;
  if (timeEl) {
    timeEl.hidden = true;
  }
  if (controls) {
    controls.hidden = true;
  }
  if (btnMinus) {
    btnMinus.hidden = true;
    btnMinus.disabled = true;
  }
  if (btnStart) {
    btnStart.hidden = true;
    btnStart.disabled = true;
  }
  if (btnPlus) {
    btnPlus.hidden = true;
    btnPlus.disabled = true;
  }
}

/**
 * 関数名： hideOpeningChildren
 * 戻り値： なし。
 * 引数： els はオープニング内部要素群。
 * 関数の概要： 設定画面や終了演出への遷移時にオープニング要素および前後ボタンを確実に非表示にする。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-001
 */
function hideOpeningChildren(els) {
  const {
    openingTitle,
    openingImage,
    openingLamp,
    openingText,
    openingNav,
    btnOpeningBack,
    btnOpeningNext,
  } = els;
  if (openingTitle) {
    openingTitle.hidden = true;
    openingTitle.textContent = "";
  }
  if (openingImage) {
    openingImage.hidden = true;
  }
  if (openingLamp) {
    openingLamp.hidden = true;
  }
  if (openingText) {
    openingText.hidden = true;
  }
  if (openingNav) {
    openingNav.hidden = true;
  }
  if (btnOpeningBack) {
    btnOpeningBack.hidden = true;
  }
  if (btnOpeningNext) {
    btnOpeningNext.hidden = true;
  }
}

/**
 * 関数名： renderOpening
 * 戻り値： なし。
 * 引数： viewModel とオープニング要素群。
 * 関数の概要： オープニング5シーン（scene1〜scene5）のタイトル・画像・テキスト・Back/NEXTボタン・ランプ拡大率を描画する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-001, REQ-006
 */
function renderOpening(viewModel, els) {
  const {
    openingTitle,
    openingImage,
    openingLamp,
    openingText,
    openingNav,
    btnOpeningBack,
    btnOpeningNext,
  } = els;
  const step = viewModel.openingStep;
  const scale = Math.max(0, Math.min(1, Number(viewModel.openingScale) || 0));
  const scene = OPENING_SCENES[step];
  const backVisible = Boolean(viewModel.openingBackVisible);
  const nextVisible = Boolean(viewModel.openingNextVisible);

  if (scene) {
    // 第1〜第4シーン: タイトル（第2〜第4シーン）、画像（第2・第3シーンのみ）、本文、Back / NEXT ボタンを表示
    if (openingTitle) {
      if (scene.title) {
        openingTitle.hidden = false;
        openingTitle.textContent = scene.title;
      } else {
        openingTitle.hidden = true;
        openingTitle.textContent = "";
      }
    }
    if (openingImage) {
      if (scene.imageSrc) {
        openingImage.hidden = false;
        if (typeof openingImage.setAttribute === "function") {
          if (openingImage.getAttribute("src") !== scene.imageSrc) {
            openingImage.setAttribute("src", scene.imageSrc);
          }
          openingImage.setAttribute("alt", scene.imageAlt);
        } else {
          openingImage.src = scene.imageSrc;
          openingImage.alt = scene.imageAlt;
        }
      } else {
        openingImage.hidden = true;
      }
    }
    if (openingLamp) {
      openingLamp.hidden = true;
    }
    if (openingText) {
      openingText.hidden = false;
      openingText.textContent = scene.text;
      openingText.className = scene.textClass;
    }
    if (openingNav) {
      openingNav.hidden = !(backVisible || nextVisible);
    }
    if (btnOpeningBack) {
      btnOpeningBack.hidden = !backVisible;
    }
    if (btnOpeningNext) {
      btnOpeningNext.hidden = !nextVisible;
    }
  } else if (step === "scene5") {
    // 第5シーン: タイトル・本文・画像・前後ボタンをすべて非表示にし、立体青色ランプを拡大表示
    if (openingTitle) {
      openingTitle.hidden = true;
      openingTitle.textContent = "";
    }
    if (openingImage) {
      openingImage.hidden = true;
    }
    if (openingText) {
      openingText.hidden = true;
      openingText.textContent = "";
    }
    if (openingNav) {
      openingNav.hidden = true;
    }
    if (btnOpeningBack) {
      btnOpeningBack.hidden = true;
    }
    if (btnOpeningNext) {
      btnOpeningNext.hidden = true;
    }
    if (openingLamp) {
      openingLamp.hidden = false;
      openingLamp.style.transform = `scale(${scale})`;
    }
  } else {
    hideOpeningChildren({
      openingTitle,
      openingImage,
      openingLamp,
      openingText,
      openingNav,
      btnOpeningBack,
      btnOpeningNext,
    });
  }
}

/**
 * 関数名： renderTimerUi
 * 戻り値： なし。
 * 引数： viewModel とタイマーUI要素群。
 * 関数の概要： 設定・カウントダウン・音声再生中のランプ、時刻、ボタンを描画する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-002, REQ-003, REQ-004, REQ-005
 */
function renderTimerUi(viewModel, els) {
  const { beacon, timeEl, controls, btnMinus, btnStart, btnPlus } = els;

  // ランプの色と点灯状態クラスを設定する。
  if (!viewModel.beaconLit || viewModel.beaconColor === "off") {
    beacon.className = "beacon-unlit";
  } else if (viewModel.beaconColor === "red") {
    beacon.className = "beacon-red beacon-lit";
  } else {
    beacon.className = "beacon-blue beacon-lit";
  }

  // 残時間とボタン群の表示・無効状態を更新する。
  const showButtons = Boolean(viewModel.buttonsVisible);
  const disableButtons = Boolean(viewModel.buttonsDisabled) || !showButtons;
  timeEl.hidden = !viewModel.timeVisible;
  timeEl.textContent = viewModel.displayTime;

  controls.hidden = !showButtons;
  btnMinus.hidden = !showButtons;
  btnStart.hidden = !showButtons;
  btnPlus.hidden = !showButtons;
  btnMinus.disabled = disableButtons;
  btnStart.disabled = disableButtons;
  btnPlus.disabled = disableButtons;
}

/**
 * 関数名： renderDotsCanvas
 * 戻り値： なし。
 * 引数： dots は描画するドット配列、canvas は #dots-canvas 要素。
 * 関数の概要： 終了演出のランダム飛散ドット群を 2D Canvas に描画する。
 * 対応機能ID（トレーサビリティ）： UNIT-010, REQ-007
 */
function renderDotsCanvas(dots, canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
    ctx.fillStyle = dot.color;
    ctx.fill();
  }
}
