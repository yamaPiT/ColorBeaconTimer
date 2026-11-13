/**
 * ファイル名： documents.test.js
 * バージョン番号： 1.0.0
 * 作成日： 2026-11-13
 * プログラマ名： Phase 4 生成担当
 * ファイルの概要： 設計書の生成記録と、同梱ファイルの出典の置き場を確認する。
 * 対応機能ID（トレーサビリティ）： TC-047, TC-052, TC-056, REQ-005, REQ-006, REQ-007
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

describe("TC-047 SW205 の掛け声記録", () => {
  it("生成、人の声ではないこと、再配布を許す許諾の3点が書いてある", () => {
    // Arrange
    const text = read("docs/artifacts/SW205_ソフトウェアアーキテクチャ設計書.md");
    // Act
    const generated = text.includes("開発時に音声合成で1回だけ生成して保存する");
    const notHuman = text.includes("人の声の録音") && text.includes("使わない");
    const redistributable = text.includes("再配布を許す");
    // Assert
    assert.equal(generated, true);
    assert.equal(notHuman, true);
    assert.equal(redistributable, true);
  });
});

describe("TC-052 と TC-056 出典", () => {
  it("同梱した画像と音声の各ファイルに、SOURCES.md の出典がある", () => {
    // Arrange
    const sources = read("extension/assets/SOURCES.md");
    const media = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (/\.(png|jpg|jpeg|wav|mp3|ogg)$/i.test(entry.name)) {
          media.push(entry.name);
        }
      }
    }
    walk(path.join(root, "extension"));
    // Act
    const missing = media.filter((name) => !sources.includes(name));
    // Assert
    assert.deepEqual(missing, []);
    assert.match(sources, /icon16\.png \| 画像 \| 自作/);
    assert.match(sources, /icon48\.png \| 画像 \| 自作/);
    assert.match(sources, /icon128\.png \| 画像 \| 自作/);
    assert.match(sources, /出典本文は README の見出しクレジット/);
    assert.match(sources, /クレジット本文は README の見出しクレジットとストア掲載文/);
  });

  it("地球の行に、ライセンス名と写真の識別子と URL を書かない", () => {
    // Arrange
    const lines = read("extension/assets/SOURCES.md").split("\n");
    const earth = lines.find((line) => line.includes("earth.jpg"));
    // Act
    const hasId = earth.includes("AS17");
    const hasUrl = /https?:/i.test(earth);
    const hasLicense = earth.includes("public domain") || earth.includes("パブリックドメイン");
    // Assert
    assert.ok(earth);
    assert.equal(hasId, false);
    assert.equal(hasUrl, false);
    assert.equal(hasLicense, false);
  });

  it("TC-056 地球の出典とライセンスは README のクレジット節だけにある", () => {
    // Arrange
    const readme = read("README.md");
    const chunks = readme.split(/^## /m);
    const credits = chunks.find((chunk) => chunk.startsWith("クレジット"));
    const outside = chunks.filter((chunk) => !chunk.startsWith("クレジット")).join("\n");
    // Act
    const hasPhoto = credits.includes("AS17-148-22727");
    const hasLicense = credits.includes("パブリックドメイン") && credits.includes("public domain");
    const leakedPhoto = outside.includes("AS17-148-22727");
    const leakedLicense = outside.includes("パブリックドメイン") || /public domain/i.test(outside);
    // Assert
    assert.ok(credits);
    assert.equal(hasPhoto, true);
    assert.equal(hasLicense, true);
    assert.equal(leakedPhoto, false);
    assert.equal(leakedLicense, false);
  });
});
