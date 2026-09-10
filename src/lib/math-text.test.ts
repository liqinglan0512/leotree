import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMathSegments, hasMath } from "./math-text.ts";

test("plain text has no math", () => {
  assert.deepEqual(parseMathSegments("普通文本 without dollars"), [{ kind: "text", value: "普通文本 without dollars" }]);
  assert.equal(hasMath("普通文本"), false);
});

test("inline formula is extracted", () => {
  assert.deepEqual(parseMathSegments("设 $x^2$ 为平方"), [
    { kind: "text", value: "设 " },
    { kind: "inline", tex: "x^2" },
    { kind: "text", value: " 为平方" },
  ]);
  assert.equal(hasMath("设 $x^2$ 为平方"), true);
});

test("display formula spans newlines", () => {
  assert.deepEqual(parseMathSegments("前文\n$$\nE = mc^2\n$$\n后文"), [
    { kind: "text", value: "前文\n" },
    { kind: "display", tex: "E = mc^2" },
    { kind: "text", value: "\n后文" },
  ]);
});

test("inline formula cannot span lines", () => {
  assert.deepEqual(parseMathSegments("$a\nb$"), [{ kind: "text", value: "$a\nb$" }]);
});

test("unterminated dollar stays literal", () => {
  assert.deepEqual(parseMathSegments("$"), [{ kind: "text", value: "$" }]);
  assert.deepEqual(parseMathSegments("$$"), [{ kind: "text", value: "$$" }]);
  assert.deepEqual(parseMathSegments("$abc"), [{ kind: "text", value: "$abc" }]);
});

test("currency sentence is not mistaken for math", () => {
  assert.deepEqual(parseMathSegments("价格 $5 和 $6 一样"), [{ kind: "text", value: "价格 $5 和 $6 一样" }]);
  assert.equal(hasMath("价格 $5 和 $6 一样"), false);
});

test("formula after a currency dollar still parses", () => {
  assert.deepEqual(parseMathSegments("价格 $5，设 $x^2$ 为平方"), [
    { kind: "text", value: "价格 $5，设 " },
    { kind: "inline", tex: "x^2" },
    { kind: "text", value: " 为平方" },
  ]);
});

test("escaped dollar is literal and not a formula", () => {
  assert.deepEqual(parseMathSegments("花了 \\$5"), [{ kind: "text", value: "花了 $5" }]);
  assert.equal(hasMath("花了 \\$5"), false);
});

test("empty or whitespace-edged formulas are ignored", () => {
  assert.deepEqual(parseMathSegments("a $$ b"), [{ kind: "text", value: "a $$ b" }]);
  assert.deepEqual(parseMathSegments("a $ $ b"), [{ kind: "text", value: "a $ $ b" }]);
  assert.deepEqual(parseMathSegments("$  $"), [{ kind: "text", value: "$  $" }]);
});

test("adjacent formulas parse separately", () => {
  assert.deepEqual(parseMathSegments("$a$$b$"), [
    { kind: "inline", tex: "a" },
    { kind: "inline", tex: "b" },
  ]);
});

test("null or empty input is safe", () => {
  assert.deepEqual(parseMathSegments(""), []);
  assert.equal(hasMath(""), false);
  assert.equal(hasMath(undefined as unknown as string), false);
});
