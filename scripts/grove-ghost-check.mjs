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

const dataTools = page.locator(".data-tools");
const results = [];

try {
  // ---------- Case A: empty grove must not mount tree-scoped data tools ----------
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#leo-boot").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "新建知识树", exact: true }).waitFor();
  assert.equal(await dataTools.count(), 0, "data-tools mounted in empty grove");
  assert.equal(await page.getByText("完整备份 ZIP").count(), 0, "backup button text present");
  assert.equal(await page.getByText(/导入 JSON|恢复 ZIP/).count(), 0, "import/restore text present");
  // grove-level entries stay legal
  await page.getByRole("button", { name: "从模板开始", exact: true }).waitFor();
  await page.screenshot({ path: `${out}/grove-ghost-a-empty.png`, fullPage: true });
  results.push("PASS Case A: empty grove has no ghost data tools");

  // ---------- Case B: create + enter tree, tree tools appear; annual progress; section naming ----------
  await page.getByRole("button", { name: "新建知识树", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
  await page.locator("dialog[open] input").fill("幽灵验收树");
  await page.getByRole("button", { name: "进入知识树", exact: true }).click();
  await page.locator(".brand-home").waitFor();
  assert.equal(await dataTools.count(), 1, "data-tools missing inside tree");
  assert.ok(await dataTools.isVisible(), "data-tools not visible inside tree");

  // annual reading progress: 12 months of the current year
  await page.getByRole("button", { name: "周回顾", exact: true }).click();
  await page.getByText(`${new Date().getFullYear()} 全年阅读进度`, { exact: true }).waitFor();
  assert.equal(await page.locator(".months .month").count(), 12, "annual progress must render 12 months");
  await page.getByText("1月", { exact: true }).waitFor();
  await page.getByText("12月", { exact: true }).waitFor();
  await page.screenshot({ path: `${out}/annual-progress.png`, fullPage: true });

  // partition naming modal from structure editing
  await page.getByRole("button", { name: "知识树", exact: true }).click();
  await page.getByRole("button", { name: "编辑结构", exact: true }).click();
  await page.getByRole("button", { name: "新增分区", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
  await page.locator("dialog[open] input").fill("数值分析");
  await page.getByRole("button", { name: "创建分区", exact: true }).click();
  await page.getByRole("heading", { name: "数值分析", exact: true }).waitFor();

  // zero-section empty state: delete both sections (throwaway tree), CTA must appear without editing mode
  for (let i = 0; i < 2; i += 1) {
    await page.getByRole("button", { name: "删除分区", exact: true }).first().click();
    await page.locator("dialog[open]").getByRole("button", { name: "确认删除", exact: true }).click();
    await page.locator("dialog[open]").waitFor({ state: "detached" });
  }
  await page.getByRole("button", { name: "完成编辑", exact: true }).click();
  await page.getByText("还没有分区。先创建一个分区，再往里添加节点。", { exact: true }).waitFor();
  await page.getByRole("button", { name: "新增分区", exact: true }).click();
  await page.locator("dialog[open] input").fill("实验");
  await page.getByRole("button", { name: "创建分区", exact: true }).click();
  await page.getByRole("heading", { name: "实验", exact: true }).waitFor();
  await page.screenshot({ path: `${out}/grove-ghost-b-tree.png`, fullPage: true });
  results.push("PASS Case B: tree tools, annual progress, section create/rename/empty-state");

  // ---------- Case C: leave tree back to grove, tree tools unmount ----------
  await page.locator(".brand-home").click();
  await page.getByRole("button", { name: "新建知识树", exact: true }).waitFor();
  assert.equal(await dataTools.count(), 0, "data-tools still mounted after leaving tree");
  await page.screenshot({ path: `${out}/grove-ghost-c-back.png`, fullPage: true });
  results.push("PASS Case C: grove after leaving tree has no data tools");

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(" | ")}`);
  console.log(results.join("\n"));
  console.log("GROVE GHOST CHECK: ALL PASS");
} catch (e) {
  console.error(results.join("\n"));
  console.error("GROVE GHOST CHECK: FAIL", e.message);
  await page.screenshot({ path: `${out}/grove-ghost-failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
