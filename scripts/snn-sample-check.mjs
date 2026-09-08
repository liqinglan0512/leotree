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
page.setDefaultTimeout(18000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

try {
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#leo-boot").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "从模板开始", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
  await page.locator(".tpl-pick", { hasText: "SNN" }).click();
  await page.locator("dialog[open] input").first().waitFor();
  await page.getByRole("button", { name: "进入知识树", exact: true }).click();
  await page.locator(".brand-home").waitFor();
  for (const title of ["A · 问题与地图", "B · ANN 校准工具箱", "C · SNN 机制与读出", "D · 指标与实验协议", "E · 时间维校准", "F · 风险、泄漏与纪律"]) {
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
  }
  const nodeCount = await page.locator(".section .item").count();
  assert.ok(nodeCount > 60, `SNN nodes rendered: ${nodeCount}`);
  await page.screenshot({ path: `${out}/snn-sample-loads.png`, fullPage: false });
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(" | ")}`);
  console.log(`SNN SAMPLE CHECK: PASS (${nodeCount} node rows, 6 sections)`);
} catch (e) {
  console.error("SNN SAMPLE CHECK: FAIL", e.message);
  await page.screenshot({ path: `${out}/snn-sample-failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
