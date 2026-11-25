/**
 * ファイル名： documents.test.js
 * バージョン番号： 4.5.0
 * 作成日： 2026-11-25
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： SW205/README/LICENSE/SOURCES/store-listing に関する v4.5 文書・アセット整合性、DADA開発例位置づけと特徴2点、README簡素化、旧教育用途禁止5語句非混入、および検査境界テストを実行する。
 * 対応機能ID（トレーサビリティ）： REQ-005, REQ-006, TC-035, TC-037, TC-038, TC-039, TC-041, TC-058, TC-065, TC-066, TC-075, TC-077
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkAttributionDocs,
  checkExtensionFilenames,
  checkReadmeV44Structure,
  containsName,
  forbiddenEduTerms,
  forbiddenNames,
  validateManifestDescription,
} from "../system/harness.js";

const SW105_PATH = path.resolve("docs/artifacts/SW105_ソフトウェア要求仕様書.md");
const SWP6_PATH = path.resolve("docs/artifacts/SWP6_ソフトウェア総合テスト仕様書・報告書.md");
const SW205_PATH = path.resolve("docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md");
const README_PATH = path.resolve("README.md");
const LICENSE_PATH = path.resolve("LICENSE");
const SOURCES_PATH = path.resolve("extension/assets/SOURCES.md");
const STORE_PATH = path.resolve("extension/store-listing.txt");
const MANIFEST_PATH = path.resolve("extension/manifest.json");

/**
 * 関数名： sha256Of
 * 戻り値： hex 文字列。
 * 引数： relPath はリポジトリ相対パス。
 * 関数の概要： 対象ファイルの SHA-256 ダイジェストを算出する。
 * 対応機能ID（トレーサビリティ）： TC-041, TC-065, TC-066
 */
function sha256Of(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.resolve(relPath))).digest("hex");
}

test("TC-035 SW205 のジュワッチ音声記録", async (t) => {
  await t.test("単一成人男性話者（VOICEVOX:玄野武宏）一括合成方針、女性話者変換・別音源継ぎ接ぎ・人声不使用、再配布許諾確認、クレジット表記が SW205 および配布文書4箇所に明記されている", () => {
    // Arrange
    const sw205 = fs.readFileSync(SW205_PATH, "utf8");
    const readme = fs.readFileSync(README_PATH, "utf8");
    const license = fs.readFileSync(LICENSE_PATH, "utf8");
    const sources = fs.readFileSync(SOURCES_PATH, "utf8");
    const store = fs.readFileSync(STORE_PATH, "utf8");

    // Act & Assert
    assert.ok(sw205.includes("開発時の1回一括生成と保存"));
    assert.ok(sw205.includes("VOICEVOX:玄野武宏"));
    assert.ok(sw205.includes("一括音声合成"));
    assert.ok(sw205.includes("女性話者によるピッチ下げ変換、後半「チ」の別音源合成結合（継ぎ接ぎ）、および人の声の録音は一切使用しない"));
    assert.ok(sw205.includes("公式音声、実行時再合成、および外部通信も一切使用しない"));
    assert.ok(sw205.includes("商用・非商用ともアプリ組込再配布が可能"));
    assert.ok(sw205.includes("Phase 5"));
    for (const doc of [readme, license, sources, store]) {
      assert.ok(doc.includes("VOICEVOX:玄野武宏"));
    }
  });
});

test("TC-037 / TC-038 / TC-075 禁止名称リスト8文字列・公式/公認の非含有・日英併記", async (t) => {
  await t.test("拡張機能名・manifest(4.5.0 / 126文字日英)・ストア掲載文・ファイル名・README/LICENSEに禁止名称および公式・公認・旧話者表記が含まれない", () => {
    // Arrange
    const names = forbiddenNames(SW105_PATH);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    const storeText = fs.readFileSync(STORE_PATH, "utf8");
    const readmeText = fs.readFileSync(README_PATH, "utf8");
    const licenseText = fs.readFileSync(LICENSE_PATH, "utf8");
    const sourcesText = fs.readFileSync(SOURCES_PATH, "utf8");

    // Act
    const filenameHits = checkExtensionFilenames(path.resolve("extension"), names);
    const descVerdict = validateManifestDescription(manifest.description, names);

    // Assert
    assert.equal(names.length, 8);
    assert.equal(manifest.version, "4.5.0");
    assert.equal(descVerdict.ok, true, `reasons=${descVerdict.reasons.join(",")}`);
    assert.equal(manifest.description.length, 126);
    assert.deepEqual(containsName(manifest.name, names), []);
    assert.deepEqual(containsName(JSON.stringify(manifest), names), []);
    assert.deepEqual(containsName(storeText, names), []);
    assert.deepEqual(containsName(readmeText, names), []);
    assert.deepEqual(containsName(licenseText, names), []);
    assert.deepEqual(containsName(sourcesText, names), []);
    assert.deepEqual(filenameHits, []);
    assert.equal(storeText.includes("公認"), false);
    assert.equal(storeText.includes("公式"), false);
    assert.equal(manifest.description.includes("公認"), false);
    assert.equal(manifest.description.includes("公式"), false);
    assert.ok(/[\u3040-\u30ff\u4e00-\u9faf]/.test(storeText));
    assert.ok(/[A-Za-z]+\s+[A-Za-z]+/.test(storeText));
    for (const doc of [readmeText, licenseText, sourcesText, storeText, JSON.stringify(manifest)]) {
      assert.equal(doc.includes("VOICEVOX:四国めたん"), false);
      assert.equal(doc.includes("TD-PSOLA"), false);
      assert.equal(doc.includes("フォルマント合成結合"), false);
      assert.equal(doc.includes("hero-hum.wav"), false);
      assert.equal(doc.includes("kaiju-orchestra.wav"), false);
    }
  });
});

test("TC-039 / TC-041 / TC-065 同梱アセット出典と README / LICENSE / SOURCES / store-listing クレジット・BGM 要件", async (t) => {
  await t.test("TC-039 同梱画像・音声ファイルがすべて SOURCES.md に記録され旧アセットが削除されている", () => {
    // Arrange
    const sourcesText = fs.readFileSync(SOURCES_PATH, "utf8");
    const imageFiles = fs.readdirSync(path.resolve("extension/assets/images"));
    const audioFiles = fs.readdirSync(path.resolve("extension/assets/audio"));
    const assetFiles = [
      ...fs.readdirSync(path.resolve("extension/icons")),
      ...imageFiles,
      ...audioFiles,
    ];

    // Act & Assert
    for (const file of assetFiles) {
      assert.ok(sourcesText.includes(file), `SOURCES.md に ${file} の記載があること`);
    }
    assert.equal(imageFiles.includes("ai-agent.svg"), false);
    assert.equal(imageFiles.includes("urinal.jpg"), false);
    assert.equal(imageFiles.includes("r-mutt-signature.svg"), false);
    assert.equal(imageFiles.includes("fountain-stieglitz.jpg"), true);
    assert.equal(imageFiles.includes("three-face-dadaism.svg"), true);
    assert.equal(audioFiles.includes("gymnopedie1.ogg"), true);
    assert.equal(audioFiles.includes("hero-hum.wav"), false);
    assert.equal(audioFiles.includes("kaiju-orchestra.wav"), false);
    assert.equal(audioFiles.includes("space-adventure-synth.wav"), true);
    assert.equal(audioFiles.includes("juwacchi.wav"), true);
  });

  await t.test("TC-041 / TC-065 SW205 の設計記述および README.md・LICENSE・SOURCES.md・store-listing の記載と SHA-256 が完全一致する", () => {
    // Arrange
    const sw205 = fs.readFileSync(SW205_PATH, "utf8");
    const readme = fs.readFileSync(README_PATH, "utf8");
    const license = fs.readFileSync(LICENSE_PATH, "utf8");
    const sources = fs.readFileSync(SOURCES_PATH, "utf8");
    const store = fs.readFileSync(STORE_PATH, "utf8");
    const hashes = {
      fountain: sha256Of("extension/assets/images/fountain-stieglitz.jpg"),
      gymnopedie1: sha256Of("extension/assets/audio/gymnopedie1.ogg"),
      spaceAdventureSynth: sha256Of("extension/assets/audio/space-adventure-synth.wav"),
      juwacchi: sha256Of("extension/assets/audio/juwacchi.wav"),
    };

    // Act
    const checkResult = checkAttributionDocs(readme, license, sources, hashes, store);

    // Assert: SW205 v4.5 要件記載と配布文書整合
    assert.ok(sw205.includes("1970〜80年代レトロフューチャー寄りの宇宙冒険SF映画風シンセウェーブ／電子音楽による 100% オリジナル楽曲"));
    assert.ok(sw205.includes("人の声による録音および第三者による無断録音も使用しない"));
    assert.ok(sw205.includes("シンセサイザー・アルペジオベース"));
    assert.ok(sw205.includes("アナログ風シンセリード"));
    assert.ok(sw205.includes("アナログ風シンセパッド／コード"));
    assert.ok(sw205.includes("ステレオ空間残響"));
    assert.ok(sw205.includes("44100Hz"));
    assert.ok(sw205.includes("16bit"));
    assert.ok(sw205.includes("ステレオ"));
    assert.ok(sw205.includes("0.30 以上 0.95 以下"));
    assert.ok(sw205.includes("0.05秒未満"));
    assert.ok(sw205.includes("0.05 以下"));
    assert.ok(sw205.includes("MIT License"));
    assert.ok(sw205.includes("OPENING_BGM_GAINS"));
    assert.ok(sw205.includes("±3.0 dB"));
    assert.ok(sw205.includes("日英常時併記"));
    assert.ok(sw205.includes("レスポンシブレイアウト設計"));
    assert.ok(sw205.includes("ADR-016"));
    assert.ok(sw205.includes("EXIT"));
    assert.ok(sw205.includes("VOICEVOX:玄野武宏"));
    assert.ok(sw205.includes("DADAプロセスを用いたプログラム開発例"));
    assert.ok(sw205.includes("File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg"));
    assert.equal(checkResult.ok, true, `欠落項目: ${checkResult.missing.join(", ")}`);
  });
});

test("TC-058 / TC-066 禁止名称8文字列の大文字小文字非区別検出・ファイル名対象拡張・〜風非誤検知・SHA-256/SOURCES/EXIT欠落検出", async (t) => {
  await t.test("TC-058 / TC-066 8文字列の大文字・小文字混在サンプルを検出し、三面シルエット風・オリジナル・宇宙冒険SF映画風シンセサイザー楽曲を誤検出しない", () => {
    // Arrange
    const names = forbiddenNames(SW105_PATH);
    const mixedSamples = [
      "テスト用ウルトラマン表記",
      "uLtRaMaN test",
      "表示内の三面星人ダダ",
      "表示内の三面怪人ダダ",
      "sAnMeN sEiJiN dAdA",
      "SANMEN KAIJIN DADA",
      "技のスペシウム光線テスト",
      "sPeCiUm rAy",
    ];
    const safeSamples = [
      "オリジナルの白黒幾何学模様による三面シルエット風イラスト",
      "オリジナル・宇宙冒険SF映画風シンセサイザー楽曲",
    ];

    // Act & Assert
    assert.equal(names.length, 8);
    for (const sample of mixedSamples) {
      assert.ok(containsName(sample, names).length >= 1, `検出されるべき: ${sample}`);
    }
    for (const safe of safeSamples) {
      assert.deepEqual(containsName(safe, names), []);
    }
  });

  await t.test("TC-066 extension/ 配下ファイル名サンプルへの禁止名称混入（大文字小文字混在）を検出する", () => {
    // Arrange
    const names = forbiddenNames(SW105_PATH);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbt-fn-test-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "uLtRaMaN-theme.ogg"), "dummy");
      // Act
      const hits = checkExtensionFilenames(tmpDir, names);
      // Assert
      assert.equal(hits.length, 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  await t.test("TC-058 / TC-066 README.md・LICENSE・SOURCES.md・store-listing の必須記載欠落および SHA-256 不一致を違反として検出する", () => {
    // Arrange
    const realReadme = fs.readFileSync(README_PATH, "utf8");
    const realLicense = fs.readFileSync(LICENSE_PATH, "utf8");
    const realSources = fs.readFileSync(SOURCES_PATH, "utf8");
    const realStore = fs.readFileSync(STORE_PATH, "utf8");
    const hashes = {
      fountain: sha256Of("extension/assets/images/fountain-stieglitz.jpg"),
      gymnopedie1: sha256Of("extension/assets/audio/gymnopedie1.ogg"),
      spaceAdventureSynth: sha256Of("extension/assets/audio/space-adventure-synth.wav"),
      juwacchi: sha256Of("extension/assets/audio/juwacchi.wav"),
    };

    const missingCreditReadme = realReadme.replace(/PD-1923/g, "UNSPECIFIED");
    const missingVoiceLicense = realLicense.replace(/VOICEVOX:玄野武宏/g, "");
    const missing1925Sources = realSources.replace(/1925/g, "2000");
    const missingSynthSources = realSources.replace(/space-adventure-synth\.wav/g, "removed-track.wav");
    const missingSynthPolicy = realReadme.replace(/複製・模倣|複製・引用・模倣/g, "省略");
    const missingBilingual = realSources.replace(/言語切替ボタンなし/g, "切替なし");
    const missingMaleVoice = realLicense.replace(/一括音声合成/g, "NONE").replace(/一括合成/g, "NONE");
    const missingViewport640 = realSources.replace(/640px/g, "500px");
    const missingQuantSpec = realLicense.replace(/0\.18/g, "0.10");
    const missingExitSpec = realSources.replace(/EXIT/g, "CLOSE");
    const missingStoreCredit = realStore.replace(/VOICEVOX:玄野武宏/g, "");
    const badHashes = {
      ...hashes,
      gymnopedie1: "0".repeat(64),
      spaceAdventureSynth: "f".repeat(64),
      juwacchi: "a".repeat(64),
    };

    // Act
    const r1 = checkAttributionDocs(missingCreditReadme, realLicense, realSources, hashes, realStore);
    const r2 = checkAttributionDocs(realReadme, missingVoiceLicense, realSources, hashes, realStore);
    const r3 = checkAttributionDocs(realReadme, realLicense, missing1925Sources, hashes, realStore);
    const r4 = checkAttributionDocs(realReadme, realLicense, missingSynthSources, hashes, realStore);
    const r5 = checkAttributionDocs(missingSynthPolicy, realLicense, realSources, hashes, realStore);
    const r6 = checkAttributionDocs(realReadme, realLicense, realSources, badHashes, realStore);
    const r7 = checkAttributionDocs(realReadme, realLicense, missingBilingual, hashes, realStore);
    const r8 = checkAttributionDocs(realReadme, missingMaleVoice, realSources, hashes, realStore);
    const r9 = checkAttributionDocs(realReadme, realLicense, missingViewport640, hashes, realStore);
    const r10 = checkAttributionDocs(realReadme, missingQuantSpec, realSources, hashes, realStore);
    const r11 = checkAttributionDocs(realReadme, realLicense, missingExitSpec, hashes, realStore);
    const r12 = checkAttributionDocs(realReadme, realLicense, realSources, hashes, missingStoreCredit);

    // Assert
    for (const r of [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12]) {
      assert.equal(r.ok, false);
    }
    assert.ok(r2.missing.some((m) => m.includes("VOICEVOX:玄野武宏")));
    assert.ok(r6.missing.some((m) => m.includes("ジムノペディSHA-256")));
    assert.ok(r6.missing.some((m) => m.includes("space-adventure-synthSHA-256")));
    assert.ok(r6.missing.some((m) => m.includes("juwacchiSHA-256")));
    assert.ok(r7.missing.some((m) => m.includes("日英併記仕様")));
    assert.ok(r8.missing.some((m) => m.includes("juwacchi単一男性話者一括合成方針")));
    assert.ok(r9.missing.some((m) => m.includes("実ビューポート幅640px仕様")));
    assert.ok(r10.missing.some((m) => m.includes("juwacchi単一男性声定量仕様")));
    assert.ok(r11.missing.some((m) => m.includes("EXITボタン仕様")));
    assert.ok(r12.missing.some((m) => m.includes("STORE:VOICEVOX:玄野武宏")));
  });
});

test("TC-077 DADA開発例位置づけ・2つの特徴・README簡素化・開発状況削除・旧教育用途禁止5語句非混入と違反検出", async (t) => {
  await t.test("配布文書と開発文書が DADAプロセスを用いたプログラム開発例・2つの特徴を満たし、旧教育用途禁止5語句を含まない", () => {
    // Arrange
    const eduTerms = forbiddenEduTerms(SW105_PATH);
    const sw105 = fs.readFileSync(SW105_PATH, "utf8");
    const swp6 = fs.readFileSync(SWP6_PATH, "utf8");
    const sw205 = fs.readFileSync(SW205_PATH, "utf8");
    const readme = fs.readFileSync(README_PATH, "utf8");
    const license = fs.readFileSync(LICENSE_PATH, "utf8");
    const sources = fs.readFileSync(SOURCES_PATH, "utf8");
    const store = fs.readFileSync(STORE_PATH, "utf8");
    const manifestRaw = fs.readFileSync(MANIFEST_PATH, "utf8");

    // Act
    const readmeCheck = checkReadmeV44Structure(readme, eduTerms);

    // Assert
    assert.equal(eduTerms.length, 5);
    assert.equal(readmeCheck.ok, true, `reasons=${readmeCheck.reasons.join(",")}`);

    for (const [name, content] of [
      ["README.md", readme],
      ["LICENSE", license],
      ["SOURCES.md", sources],
      ["manifest.json", manifestRaw],
      ["store-listing.txt", store],
      ["SWP6", swp6],
      ["SW205", sw205],
    ]) {
      assert.ok(content.includes("DADAプロセスを用いたプログラム開発例"), `${name} に位置づけがあること`);
      for (const term of eduTerms) {
        assert.equal(content.includes(term), false, `${name} に禁止語「${term}」が含まれないこと`);
      }
    }

    for (const [name, content] of [
      ["README.md", readme],
      ["SW105", sw105],
      ["SWP6", swp6],
      ["SW205", sw205],
    ]) {
      assert.ok(content.includes("開発文書") && content.includes("REV101"), `${name} に特徴1があること`);
      assert.ok(content.includes("アジャイル") && content.includes("要求改訂"), `${name} に特徴2があること`);
    }

    // SW105 は第1.1節（教材ではない）および REQ-006 規定箇所以外に禁止5語句が存在しない
    const sw105Lines = sw105.replace(/\r\n/g, "\n").split("\n");
    for (let i = 0; i < sw105Lines.length; i += 1) {
      const lineNo = i + 1;
      const line = sw105Lines[i];
      const hits = eduTerms.filter((term) => line.includes(term));
      if (hits.length > 0) {
        const allowed =
          (line.includes("教材ではない") && hits.every((t) => t === "教材")) ||
          line.includes("を記載しない") ||
          line.includes("が記載されていないこと");
        assert.equal(allowed, true, `SW105:${lineNo} の想定外箇所に禁止5語句: ${hits.join(",")}`);
      }
    }
  });

  await t.test("違反サンプル（開発状況節残存・位置づけ欠落・特徴欠落・SW105参照欠落・機能概要詳細数値残存・禁止5語句混入）を不合格として検出する", () => {
    // Arrange
    const eduTerms = forbiddenEduTerms(SW105_PATH);
    const realReadme = fs.readFileSync(README_PATH, "utf8");

    const sampleDevStatus = realReadme.replace("## 目的", "## 開発状況\n\n実装完了。\n\n## 目的");
    const sampleNoPos = realReadme.replace(/DADAプロセスを用いたプログラム開発例/g, "開発プログラム");
    const sampleNoFeat1 = realReadme.replace(/開発文書/g, "書類").replace(/REV101/g, "CHECK");
    const sampleNoFeat2 = realReadme.replace(/要求改訂/g, "更新");
    const sampleNoSw105Ref = realReadme.replace(/docs\/artifacts\/SW105_ソフトウェア要求仕様書\.md/g, "docs/none.md");
    const sampleDetailedOverview = realReadme.replace(
      "## 著作権・商標についての方針",
      "点滅計算式は 0.1 + 0.9 * (t - 10) / 50 で許容誤差 ±0.05、F0 110〜180 Hz。\n\n## 著作権・商標についての方針"
    );
    const sampleEduTerm = realReadme + "\nこれは名古屋大学の演習教材です。\n";

    // Act & Assert
    assert.ok(checkReadmeV44Structure(sampleDevStatus, eduTerms).reasons.includes("HasDevStatusSection"));
    assert.ok(checkReadmeV44Structure(sampleNoPos, eduTerms).reasons.includes("MissingDadaExamplePositioning"));
    assert.ok(checkReadmeV44Structure(sampleNoFeat1, eduTerms).reasons.includes("MissingDadaFeature1"));
    assert.ok(checkReadmeV44Structure(sampleNoFeat2, eduTerms).reasons.includes("MissingDadaFeature2"));
    assert.ok(checkReadmeV44Structure(sampleNoSw105Ref, eduTerms).reasons.includes("MissingSw105ReferenceInOverview"));
    assert.ok(checkReadmeV44Structure(sampleDetailedOverview, eduTerms).reasons.includes("OverviewContainsDetailedSpecs"));
    assert.ok(checkReadmeV44Structure(sampleEduTerm, eduTerms).reasons.includes("ContainsForbiddenEduTerm"));
  });
});
