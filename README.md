# ColorBeaconTimer

残り時間に応じて青く光り、赤く線形加速点滅し、終了時に音声とランダムドット飛散で知らせるオリジナルのカウントダウンタイマーです。Google Chrome 拡張機能（Manifest V3）として開発しています。

## 目的

本ソフトウェアは、AIエージェントと協同する **DADAプロセスを用いたプログラム開発例** です（教育用途の公開物ではありません）。本開発では、DADA（Document-and-Agent-Driven Agile）プロセスの次の 2つの特徴を発揮しています。

1. **開発文書の作成とレビューが行われている**: 要求仕様書（`SW105`）、総合テスト仕様書・報告書（`SWP6`）、アーキテクチャ設計書（`SW205`）を作成し、工程ごとのレビュー記録表（`REV101_Requirements.md`・`REV101_Test.md`・`REV101_Design.md`・`REV101_Code.md`）および機械チェックによる自己校正レビューを通じて品質を検証しています。
2. **アジャイル的にプログラムの要求改訂を頻繁に行っている**: Phase 5 の評価を起点とした開発 Loop（v1.0 → v2.0 → v2.1 → v2.2 → v3.0 → v3.1 → v3.2 → v4.0 → v4.1 → v4.2 → v4.3 → v4.3.1 → v4.4 → v4.5）を回し、継続的な要求仕様の改訂と実装・検証を進めています。

## 機能概要

ColorBeaconTimer は、専用ウィンドウ（`700×720px`、Windows 11 上の Chrome ポップアップ実表示領域で実ビューポート幅 `640px` 以上）上で動作する日英常時併記（言語切替ボタンなし）のタイマーです。主な流れは次のとおりです。

- **オープニング（5シーン構成）**: 第1〜第4シーンは `Back` / `NEXT` ボタンで手動遷移し（第2・第3シーンで BGM をオフライン再生・切替）、第5シーンで立体青色ランプを拡大したあとに設定画面へ進みます（クリックでスキップ可能）。
- **時刻設定とカウントダウン**: ＋ / − ボタン（単押しおよび長押し早送り）で設定時刻を選び、スタートボタン（`スタート / START`）でカウントダウンを開始します。残時間 1分超は青色点灯、1分以下は赤色の加速点滅と消灯時「ピコン」音で知らせます。
- **終了処理と `EXIT` ボタン**: 残時間 0 でランプ消灯・「ピコン」音・成人男性声「ジュワッチ」音声再生のあと、中央からドットが 360度放射状に飛散する終了演出画面と `EXIT` ボタンを表示します。`EXIT` ボタン押下またはウィンドウ閉鎖で終了します。

各シーンの表示文言・点滅計算式・許容誤差・音声仕様などの詳細仕様は、[`docs/artifacts/SW105_ソフトウェア要求仕様書.md`](docs/artifacts/SW105_ソフトウェア要求仕様書.md) を参照してください。

## 著作権・商標についての方針

本ソフトウェアはオリジナル作品であり、いかなる権利者とも関係がありません。権利者の名称、ロゴ、画像、音源、音声は使用しません。専用ウィンドウのすべての表示および拡張機能説明文では、言語切替ボタンを設けず日本語と英語を常時併記します。

- オープニング第2シーンの《泉》写真は、1917年 *The Blind Man* No.2 掲載のパブリックドメイン写真（`PD-1923`、1946年撮影者没により日米ともに著作権消滅）を使用しています。
- オープニング第2シーンの BGM『ジムノペディ第1番』は、作曲者エリック・サティ（1888年発表・1925年没）により戦時加算を含めても日米ともに楽曲著作権が消滅しており、Wikimedia Commons のパブリックドメイン録音（Robin Alciatore 演奏 / Musopen 提供）をパッケージに同梱してオフライン再生します。
- オープニング第3シーンの白黒幾何学模様・三面シルエット風イラスト（`three-face-dadaism.svg`）、立体青色ランプ（`blue-lamp.svg`）、拡張機能アイコン（`extension/icons/*`）は開発チームによるオリジナル SVG / 画像です。
- オープニング第3シーンの BGM オリジナル・宇宙冒険SF映画風シンセサイザー楽曲（`space-adventure-synth.wav`）は、既存の宇宙冒険SF映画・特撮番組・電子音楽作品のテーマ曲や劇伴における主旋律・編曲は一切複製・引用・模倣しない 100% オリジナル楽曲（1970〜80年代レトロフューチャー寄りのシンセウェーブ／電子音楽）です。推進力のあるシンセサイザー・アルペジオベース、印象的なアナログ風シンセリード、浮遊感と広がりのあるアナログ風シンセパッド／コード、および循環畳み込みによるステレオ空間残響（ディレイ／リバーブ）の 4要素を Python 標準ライブラリの非人声シンセサイザー合成（44.1kHz［44100Hz］・16bit・ステレオ 2チャンネル非圧縮 PCM WAV）で生成し、再生時に `GainNode` ゲイン `0.18` を適用して第2シーン『ジムノペディ第1番』と同等水準の音量（実効音量差 ±3.0 dB 以内、実測 -0.00 dB）でオフラインかつシームレスループ再生します（人の声の録音や第三者による無断録音は使用しません）。
- 「ピコン」は Web Audio API で合成したオリジナル電子音（880Hz 正弦波）です。
- 終了時の「ジュワッチ」音声は、単一の元気な成人男性話者（`VOICEVOX:玄野武宏`、スタイル `ノーマル`［`speaker=11`］）による一括音声合成取得と Python 標準ライブラリのみでの無音境界調整（WSOLA 時間長整合含む）・穏やかなダイナミック整音・線形ピーク正規化で 1回生成して保存したファイル（`extension/assets/audio/juwacchi.wav`、24000Hz・16bit・モノラル PCM WAV、総長 1.000秒）をオフライン再生します（女性話者ピッチ下げ変換・別音源合成結合［継ぎ接ぎ］・人の声の録音・公式音声・実行時再合成・外部通信は使用せず、再配布許諾規約に基づきクレジット表記を保持しています）。

## クレジット

- **表示・ウィンドウ・終了ボタン仕様（日英常時併記・実ビューポート幅 640px 以上・`EXIT` ボタン）**:
  - 言語切替ボタンなし、専用ウィンドウ `700×720px`（Windows 11 上の Chrome ポップアップ実表示領域で実ビューポート幅 `640px` 以上を確保し、見切れ・スクロールなし）・全画面・`extension/manifest.json`・`extension/store-listing.txt` で日本語と英語を常時併記
  - 終了演出画面（ドット飛散状態）に `EXIT` ボタン（ラベル「`EXIT`」）を表示し、押下により専用ウィンドウを閉じてプログラムを終了
- **オープニング第2シーン《泉》写真**（`extension/assets/images/fountain-stieglitz.jpg`）:
  - Wikimedia Commons: `File:Marcel_Duchamp,_1917,_Fountain,_photograph_by_Alfred_Stieglitz.jpg`（アルフレッド・スティーグリッツ撮影、1917年 *The Blind Man* No.2 掲載）
  - 取得元: `https://commons.wikimedia.org/wiki/File:Marcel_Duchamp,_1917,_Fountain,_photograph_by_Alfred_Stieglitz.jpg`（画像ファイル: `https://upload.wikimedia.org/wikipedia/commons/d/dd/Marcel_Duchamp%2C_1917%2C_Fountain%2C_photograph_by_Alfred_Stieglitz.jpg`）
  - ライセンス・著作権消滅根拠: `PD-1923` パブリックドメイン。1917年米国公表かつ撮影者 Alfred Stieglitz が 1946年没のため、日米ともに写真著作権は消滅しています。
  - 同梱ファイル情報: サイズ `2,293,812` バイト、寸法 `1416×1849`、SHA-256 `9359e96a3cbe5b1a9de199a4ebf60d3dc6ae632dbcf57f7e70f88ff36b188604`
- **オープニング第2シーン BGM『ジムノペディ第1番』**（`extension/assets/audio/gymnopedie1.ogg`）:
  - 作曲者: エリック・サティ（Erik Satie、1888年発表、1925年作曲者没）
  - 演奏者: Robin Alciatore（Musopen 提供）
  - 取得元 URL: `https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg`（音声ファイル: `https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg`）
  - ライセンス・著作権消滅根拠: Public Domain（録音公開ライセンス: Public Domain / 楽曲: 1888年発表かつ 1925年作曲者没により、戦時加算を含めても日本および米国の双方で著作権消滅済み）
  - 同梱ファイル情報: `extension/assets/audio/gymnopedie1.ogg`、サイズ `3,696,351` バイト、SHA-256 `419e37656856224227086df32d6d481a00a738961e08fca9f6147e472beea53e`
- **オープニング第3シーンイラスト**（`extension/assets/images/three-face-dadaism.svg`）:
  - 開発チーム自作の白黒幾何学模様・三面シルエット風オリジナル SVG イラスト（MIT License）
- **オープニング第3シーン BGM オリジナル・宇宙冒険SF映画風シンセサイザー楽曲**（`extension/assets/audio/space-adventure-synth.wav`）:
  - 制作方針・構成要素: 開発チーム自作の 100% オリジナル楽曲（1970〜80年代レトロフューチャー寄りのシンセウェーブ／電子音楽。既存の宇宙冒険SF映画・特撮番組・電子音楽作品のテーマ曲や劇伴における主旋律・編曲は一切複製・引用・模倣しない。人の声の録音や第三者による無断録音ではない）。推進力のあるシンセサイザー・アルペジオベース、印象的なアナログ風シンセリード、浮遊感と広がりのあるアナログ風シンセパッド／コード、および循環畳み込みによるステレオ空間残響（ディレイ／リバーブ）の 4要素で構成
  - 音質仕様・音量調整: Python 標準ライブラリによる非人声シンセサイザー合成 PCM WAV（44.1kHz［44100Hz］・16bit・ステレオ 2チャンネル、長さ 16.000秒［120 BPM・4/4拍子・8小節］、最大正規化振幅 0.8500［0.30 以上 0.95 以下・非クリッピング］、全区間 RMS 0.1969 / `-14.12 dBFS`、ループ境界無音ギャップ 0.0000秒［0.05秒未満］、接続点正規化振幅差 0.0034［0.05 以下］）。再生時は第2シーン『ジムノペディ第1番』（実測 `-29.01 dBFS`、ゲイン `1.0`）との実効音量差を ±3.0 dB 以内（実測 `-0.00 dB`）の同等水準に保つため `GainNode` ゲイン `0.18`（`-14.89 dB`、実効 `-29.01 dBFS`、音割れなし）を適用（WAV ファイル自体の振幅・SHA-256 は維持）
  - ライセンス: MIT License
  - 同梱ファイル情報: `extension/assets/audio/space-adventure-synth.wav`、サイズ `2,822,444` バイト、SHA-256 `5e84a43d7becd93480bddf14919927da88daebadc69222ce6aecbfb644f4b93b`
- **終了時「ジュワッチ」音声**（`extension/assets/audio/juwacchi.wav`）:
  - クレジット表記: `VOICEVOX:玄野武宏`（VirVox Project 管理、スタイル `ノーマル`［`speaker=11`］採用／第一候補 `喜び`［`speaker=39`］は有声 F0 が女性声域閾値超過のため代替候補を採用）
  - 生成方針・出典: VOICEVOX 公開合成 API で単一の元気な成人男性話者（`VOICEVOX:玄野武宏`）に発話文「ジュワッチ！」を一括音声合成取得し、Python 標準ライブラリのみで無音境界調整（WSOLA 時間長整合含む）・穏やかなダイナミック整音・線形ピーク `0.94` 正規化を実施して 1回生成・保存（女性話者ピッチ下げ変換・別音源合成結合［継ぎ接ぎ］・人の声の録音・公式音声・実行時再合成・外部通信は一切不使用。VOICEVOX および VirVox Project 利用規約に基づきクレジット表記により商用・非商用再配布可能。Phase 5 での手元 `.wav` 差し替えにも対応可能）
  - 音質・定量仕様: 24000Hz・16bit・モノラル非圧縮 PCM WAV、総長 1.000秒（基準 `0.80〜1.20` 秒）、全体ピーク正規化振幅 0.9400（基準 `0.85〜0.99`・非クリッピング）、全区間 RMS 0.1908 / `-14.39 dBFS`（基準 `0.18` 以上 / `-14.9 dBFS` 以上）、全体有声区間 F0 中央値 `131.9 Hz`（基準 `110〜180 Hz`、女性声域 `220 Hz` 以上不使用）、前半 65% 有声区間 F0 中央値 `142.4 Hz`・後半 35% 有声区間 F0 中央値 `109.1 Hz`（各区間基準 `85〜200 Hz`、声質断絶なし）、後半 35% ピーク比 0.6981（基準 `0.25〜0.85`）、後半 `3kHz〜8kHz` 高域帯域 RMS は前半全帯域 RMS 以下（`0.0412 <= 0.2281`、実測比 `0.1807`）
  - 同梱ファイル情報: `extension/assets/audio/juwacchi.wav`、サイズ `48,044` バイト、SHA-256 `2cc9fa63a0ab77ea1d926cb00f1204ed3c8b271bafc52acf9e0c513cce1d2d43`

## インストールとテスト方法

### Chrome 拡張機能の読み込み
1. Google Chrome で `chrome://extensions` を開きます。
2. 右上の「デベロッパーモード」を有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」から本リポジトリの `extension/` フォルダを指定します。
4. ツールバーの ColorBeaconTimer アイコンをクリックして専用ウィンドウを起動します。

### 自動テストの実行
リポジトリ直下で以下を実行します（要 Node.js / Playwright）。
```bash
npm test
```
- `npm run test:unit`: 単体テスト（`node --test tests/unit/*.test.js`）
- `npm run test:system`: Playwright によるシステムテスト（`tests/system/*.spec.js`）

## 開発プロセス（DADAプロセス）

本リポジトリは [DADA（Document-and-Agent-Driven Agile）プロセス](https://github.com/yamaPiT/DADAProcess)（v7.0.0、取り込みコミット `6cc5081a`）を用いたプログラム開発例です。要求定義・総合テスト仕様・設計・実装の全工程で開発文書（`docs/artifacts/`）を唯一の情報源（Single Source of Truth）として維持し、工程ごとのレビュー記録表（`REV101_*`）と機械チェック（`tools/dada_verify.py` / `tools/dada_check.py` / `tools/asdoq_lint.py` / `tools/style_check.py`）による自己校正レビュー、ならびに Phase 5 評価を起点とした開発 Loop による頻繁な要求改訂を実践しています。

### リポジトリ内のプロセス資産構成

| パス | 役割 |
| :--- | :--- |
| [`AGENTS.md`](AGENTS.md) / [`.agents/AGENTS.md`](.agents/AGENTS.md) | ワークスペースルール（DADAプロセスの4原則・ID体系・Phase 0判定・自律ゲート基準） |
| [`.agents/skills/`](.agents/skills/) | 工程別のペルソナスキル（`dada-process`, `requirements-engineer`, `test-engineer`, `architect`, `programmer`, 各種レビュアー, `asdoq-reviewer`, `JP-Humanizer` 等） |
| [`docs/artifacts/`](docs/artifacts/) | 開発成果物（`SW105` 要求仕様書、`SWP6` 総合テスト仕様書・報告書、`SW205` アーキテクチャ設計書、各種レビュー記録 `REV101_*`、バグ管理表 `BUG101`） |
| [`docs/process/`](docs/process/) | フェーズ移行サマリー（`last_phase_summary.md`）、実装進捗台帳（`impl_progress.md`）、自律遷移ログ（`autoloop_log.md`） |
| [`docs/guidelines/`](docs/guidelines/) / [`docs/templates/`](docs/templates/) | ASDoQ文書品質モデル関連基準・執筆ルール・環境/定義指針（`antigravity_adapter.md` / `agent_def_phase_addon.md` 等）・各種ひな形 |
| [`tools/`](tools/) | 決定論的点検・変換ツール（`dada_verify.py`, `dada_benchmark.py`, `dada_check.py`, `asdoq_lint.py`, `style_check.py`, `office_io.py`, `export_skillset.py` 等） |
| [`extension/`](extension/) / [`tests/`](tests/) | ColorBeaconTimer Chrome 拡張機能本体および単体・システムテスト |

### 工程（Phase 0〜5）
1. **Phase 0 ルーティング**: 開発対象・実行モード（承認ゲート型 / 自律型）・変更スケールを判定する。
2. **Phase 1 要求定義**: ソフトウェア要求仕様書（`SW105`）を作成・改訂する。
3. **Phase 2 総合テスト仕様策定**: 設計に先立ち、総合テスト仕様書（`SWP6`）の計画を作成する。
4. **Phase 3 アーキテクチャ設計**: ソフトウェアアーキテクチャ設計書（`SW205`）を作成する。
5. **Phase 4 実装・デバッグ・総合テスト報告**: ユニット実装・単体テスト・総合テストを実施し、`SWP6` の報告書を締結する。
6. **Phase 5 人間による評価と要求見直し**: 動作を評価し、必要なら開発Loopとして Phase 1 へ戻る。

<a id="ライセンス"></a>
## 📄 ライセンス・著作権表示 (License & Attributions)

ColorBeaconTimer 本体（DADAプロセスを用いたプログラム開発例）および本リポジトリに同梱している DADAプロセス一式（ワークスペースルール・スキル定義・テンプレート・検証スクリプト）は [MIT License](LICENSE)（`Copyright (c) 2026 YAMAMOTO Masaki (yamaPiT)`）の下で公開されています。商用・非商用を問わず、無償かつ自由に利用・複製・改変・再配布できます。

### 同梱している第三者著作物・素材および参考文献の著作権表示

本リポジトリが収録または翻案・改変して同梱している第三者著作物および素材については、それぞれの原著作者の著作権表示およびライセンス条項が適用されます。再配布や派生著作物の作成にあたっては、[LICENSE](LICENSE) および以下の表示を保持してください。

1. **ColorBeaconTimer 同梱素材および表示仕様**:
   - 《泉》写真（`extension/assets/images/fountain-stieglitz.jpg`）: Wikimedia Commons `File:Marcel_Duchamp,_1917,_Fountain,_photograph_by_Alfred_Stieglitz.jpg`（アルフレッド・スティーグリッツ撮影、1917年 *The Blind Man* No.2 掲載、`PD-1923` パブリックドメイン、1946年撮影者没により日米ともに写真著作権消滅、1416×1849、2,293,812 バイト、SHA-256 `9359e96a3cbe5b1a9de199a4ebf60d3dc6ae632dbcf57f7e70f88ff36b188604`）。
   - 第2シーン BGM『ジムノペディ第1番』（`extension/assets/audio/gymnopedie1.ogg`）: 作曲者 エリック・サティ（Erik Satie、1888年発表、1925年作曲者没により戦時加算を含めても日米ともに楽曲著作権消滅済み）、演奏者 Robin Alciatore（Musopen 提供）、取得元 URL `https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg`、ライセンス Public Domain、サイズ 3,696,351 バイト、SHA-256 `419e37656856224227086df32d6d481a00a738961e08fca9f6147e472beea53e`。
   - 第3シーン BGM オリジナル・宇宙冒険SF映画風シンセサイザー楽曲（`extension/assets/audio/space-adventure-synth.wav`）: 開発チーム自作の 100% オリジナル楽曲（1970〜80年代レトロフューチャー寄りのシンセウェーブ／電子音楽。既存の宇宙冒険SF映画・特撮番組・電子音楽作品のテーマ曲や劇伴における主旋律・編曲は一切複製・引用・模倣しない。人の声の録音や第三者による無断録音ではない）。推進力のあるシンセサイザー・アルペジオベース、印象的なアナログ風シンセリード、浮遊感と広がりのあるアナログ風シンセパッド／コード、および循環畳み込みによるステレオ空間残響（ディレイ／リバーブ）の 4要素を Python 標準ライブラリの非人声シンセサイザー合成で生成（44.1kHz［44100Hz］・16bit・ステレオ 2チャンネル PCM WAV、長さ 16.000秒［120 BPM・4/4拍子・8小節］、最大正規化振幅 0.8500［0.30〜0.95］、全区間 RMS 0.1969 / `-14.12 dBFS`、ループ境界無音ギャップ 0.0000秒［0.05秒未満］、接続点正規化振幅差 0.0034［0.05 以下］）。再生時は第2シーン『ジムノペディ第1番』（実測 `-29.01 dBFS`、ゲイン `1.0`）との実効音量差を ±3.0 dB 以内（実測 `-0.00 dB`）の同等水準に保つため `GainNode` ゲイン `0.18`（`-14.89 dB`、実効 `-29.01 dBFS`、音割れなし）を適用（WAV ファイル自体の振幅・SHA-256 維持）。MIT License、サイズ 2,822,444 バイト、SHA-256 `5e84a43d7becd93480bddf14919927da88daebadc69222ce6aecbfb644f4b93b`。
   - 自作 SVG・アイコン（`extension/assets/images/three-face-dadaism.svg`, `extension/assets/images/blue-lamp.svg`, `extension/icons/*`）: 開発チーム自作のオリジナル制作物（MIT License）。
   - 終了時「ジュワッチ」音声（`extension/assets/audio/juwacchi.wav`）: クレジット表記 `VOICEVOX:玄野武宏`（VirVox Project 管理、スタイル `ノーマル`［`speaker=11`］）。単一の元気な成人男性話者による「ジュワッチ！」一括音声合成取得と Python 標準ライブラリのみでの無音境界調整（WSOLA 時間長整合含む）・穏やかなダイナミック整音・線形ピーク `0.94` 正規化で 1回生成（女性話者ピッチ下げ変換・別音源合成結合［継ぎ接ぎ］・人の声の録音・公式音声・実行時再合成・外部通信は一切不使用。24000Hz・16bit・モノラル非圧縮 PCM WAV、総長 1.000秒［`0.80〜1.20` 秒］、全体ピーク正規化振幅 0.9400［`0.85〜0.99`・非クリッピング］、全区間 RMS 0.1908 / `-14.39 dBFS`［`0.18` 以上 / `-14.9 dBFS` 以上］、全体有声 F0 中央値 `131.9 Hz`［`110〜180 Hz`］、前半 65% 有声 F0 中央値 `142.4 Hz`・後半 35% 有声 F0 中央値 `109.1 Hz`［各 `85〜200 Hz`］、後半 35% ピーク比 0.6981［`0.25〜0.85`］、後半 `3kHz〜8kHz` 帯域 RMS 0.0412［前半全帯域 RMS 0.2281 以下、比 0.1807］、サイズ 48,044 バイト、SHA-256 `2cc9fa63a0ab77ea1d926cb00f1204ed3c8b271bafc52acf9e0c513cce1d2d43`、VOICEVOX・VirVox Project 利用規約準拠、Phase 5 差し替え対応可）。
   - 日英常時併記・実ビューポート幅 640px 以上・`EXIT` ボタン仕様: 言語切替ボタンなし、専用ウィンドウ `700×720px`（Windows 11 Chrome ポップアップ実表示領域で実ビューポート幅 `640px` 以上を確保し、全画面・`extension/manifest.json`・`extension/store-listing.txt` で日本語と英語を常時併記）、終了演出画面に `EXIT` ボタン（押下で専用ウィンドウ閉鎖・プログラム終了）を表示。
2. **ASDoQ システム開発文書品質モデル関連文書および派生定義（ASDoQドキュメントライセンス ADL 1.1）**:
   - `docs/guidelines/asdoq_model_markdown.md`、`asdoq_checklist.md`、`asdoq_writing_rules.md`、`tools/asdoq_dictionary.json`、および `.agents/skills/asdoq-reviewer/` は、システム開発文書品質研究会（ASDoQ）の『システム開発文書品質モデル Ver. 2.0a』（© システム開発文書品質研究会）を基に、DADAProcess プロジェクトが一部改訂・翻案した派生著作物です（[ADL 1.1](https://asdoq.jp/licence/ADL-1.1.pdf) / [研究会規則](https://asdoq.jp/rule.html)）。
3. **日本語推敲スキル `JP-Humanizer`（原著作物『yomiyasu』・MIT License）**:
   - `.agents/skills/JP-Humanizer/` および `tools/style_check.py` は、大賀愛一郎氏（`nanaism` / ALGO ARTIS Inc.）の [『yomiyasu』](https://github.com/nanaism/yomiyasu)（MIT License、`Copyright (c) 2026 Aiichiro Oga (nanaism)`、[解説記事](https://zenn.dev/algoartis/articles/0b1c731881b25c)）を参考に、ASDoQ基準と決定論的検証を追加して再構築した派生スキルです（ライセンス全文は [`.agents/skills/JP-Humanizer/LICENSE.md`](.agents/skills/JP-Humanizer/LICENSE.md)）。
4. **参考文献**:
   - 逆瀬川 (`@gyakuse`) [『生成AI以前と以後でエンジニアの文章はどう変わったのか: Qiitaの7万記事を数えてみた話』](https://nyosegawa.com/posts/qiita-writing-before-after-ai/)
   - 情報処理推進機構（IPA）[『ESPR Ver.2.0：【改訂版】 組込みソフトウェア向け開発プロセスガイド』](https://www.ipa.go.jp/archive/publish/secbooks20071119.html)
   - Anthropic [『Building Effective Agents』](https://www.anthropic.com/research/building-effective-agents)
   - IEEE Std 29148-2018（`docs/templates/IEEE29148_2018_SRS.md` は独自記述の日本語ひな形であり規格本文の転載ではありません）
5. **外部オプションパッケージおよび外部API（同梱なし）**:
   - `tools/*.py` は Python 標準ライブラリのみで基本動作し、任意導入の外部パッケージ（`janome` 等）や Node/Playwright 依存パッケージ、任意設定の外部サービス（Google Gemini Decisions API、`context7` MCP 等）には各提供元のライセンスおよび利用規約が適用されます。
