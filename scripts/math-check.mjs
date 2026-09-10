import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const origin = process.env.RC_URL ?? "http://localhost:8080";
const out = "release-evidence/screenshots";
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem("leo-tree-guest-v1", "1");
  localStorage.setItem("leo-tree-prefs-v1", JSON.stringify({ locale: "zh", font: "md" }));
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const results = [];

try {
  // ---------- setup: fresh tree ----------
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#leo-boot").waitFor({ state: "hidden", timeout: 30000 });
  await page.getByRole("button", { name: "新建知识树", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
  await page.locator("dialog[open] input").fill("公式验收树");
  await page.getByRole("button", { name: "进入知识树", exact: true }).click();
  await page.locator(".brand-home").waitFor();

  // ---------- first node: addNode auto-focuses it into the branch view ----------
  await page.getByRole("button", { name: "在此分区新增节点", exact: true }).click();
  await page.locator(".branch-head").waitFor();

  // ---------- note editor: type LaTeX, live preview renders ----------
  const noteTa = page.locator(".note textarea");
  await noteTa.waitFor();
  await noteTa.fill("膜电位按 $V_m = V_{rest}$ 演化；阈值条件为 $$\\frac{dV}{dt} = -\\frac{V - V_{rest}}{\\tau}$$");
  await page.locator(".note .math-preview").waitFor();
  await page.locator(".math-preview .katex").first().waitFor({ timeout: 15000 });
  const katexCount = await page.locator(".math-preview .katex").count();
  assert.ok(katexCount >= 2, `expected >=2 rendered formulas in preview, got ${katexCount}`);
  assert.equal(await page.locator(".math-preview .math-bad").count(), 0, "preview reported a broken formula");
  await page.screenshot({ path: `${out}/math-note-editor.png`, fullPage: true });
  results.push(`PASS note editor live preview renders ${katexCount} formulas`);

  // ---------- palette: click 分数 inserts at caret ----------
  await noteTa.click(); // caret at end
  await page.locator(".math-toolbar .math-chip", { hasText: "分数" }).click();
  const noteValue = await noteTa.inputValue();
  assert.ok(noteValue.includes("\\frac{a}{b}"), `fraction snippet not inserted: ${noteValue.slice(-40)}`);
  // selection should cover the placeholder "a"
  const sel = await noteTa.evaluate((ta) => [ta.selectionStart, ta.selectionEnd]);
  assert.equal(noteValue.slice(sel[0], sel[1]), "a", `placeholder not selected: ${JSON.stringify(sel)}`);
  results.push("PASS palette chip inserts \\frac{a}{b} with placeholder selected");

  // ---------- 更多 popover: categories exist ----------
  await page.locator(".math-toolbar .math-more").click();
  await page.locator(".math-sheet").waitFor();
  const cats = await page.locator(".math-sheet .math-cat").allInnerTexts();
  assert.ok(cats.length >= 4, `expected >=4 palette categories, got ${cats.length}`);
  await noteTa.click({ position: { x: 20, y: 10 } }); // dismiss popover via outside pointer-down
  await page.locator(".math-sheet").waitFor({ state: "detached" });
  results.push(`PASS more-symbol popover shows ${cats.length} categories`);

  // ---------- display rendering: hint with inline math (already in edit mode) ----------
  const hintTa = page.locator("textarea.hint-input");
  await hintTa.fill("能量守恒 $E = mc^2$");
  await page.getByRole("button", { name: "完成编辑", exact: true }).click();
  await page.locator(".branch-head .hint .katex").first().waitFor({ timeout: 15000 });
  results.push("PASS hint renders inline math in read mode");

  // ---------- reload: formulas persist and re-render ----------
  await page.waitForTimeout(1500); // let the 300ms save debounce flush to storage
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#leo-boot").waitFor({ state: "hidden", timeout: 30000 });
  // reload lands on the grove — reopen the tree and the node
  await page.getByText("公式验收树").first().click();
  await page.locator(".brand-home").waitFor();
  await page.locator(".item .node-enter").first().click();
  await page.locator(".branch-head").waitFor();
  await page.locator(".note .math-preview .katex").first().waitFor({ timeout: 15000 });
  await page.locator(".branch-head .hint .katex").first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${out}/math-after-reload.png`, fullPage: true });
  results.push("PASS formulas survive reload and re-render");

  // ---------- practice log: compact editor ----------
  await page.getByRole("button", { name: "记录一次实践", exact: true }).click();
  await page.locator(".exp .math-pop-trigger").first().waitFor();
  const logTa = page.locator(".exp .math-field textarea").first();
  await logTa.fill("验证 $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$");
  await page.locator(".exp .math-preview .katex").first().waitFor({ timeout: 15000 });
  // compact popover opens and inserts
  await page.locator(".exp .math-pop-trigger").first().click();
  await page.locator(".math-sheet").waitFor();
  await page.locator(".math-sheet .math-chip", { hasText: "根号" }).click();
  const logValue = await logTa.inputValue();
  assert.ok(logValue.includes("\\sqrt{x}"), `sqrt snippet not inserted into log field`);
  await page.screenshot({ path: `${out}/math-log-editor.png`, fullPage: true });
  results.push("PASS practice log compact editor + palette + preview");

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("; ")}`);
  console.log(results.join("\n"));
  console.log(`MATH CHECK: PASS (${results.length} cases)`);
} catch (e) {
  console.error(results.join("\n"));
  console.error("MATH CHECK: FAIL -", e.message);
  await page.screenshot({ path: `${out}/math-check-fail.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
