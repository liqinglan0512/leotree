import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const origin=process.env.RC_URL || "http://localhost:8084";
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const out="release-evidence",results=[];fs.mkdirSync(`${out}/screenshots`,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const key="leo-tree-workspace-v1",backupKey="leo-tree-last-full-backup-v1";
const raw=p=>p.evaluate(k=>localStorage.getItem(k),key);
const saved=p=>p.locator('[data-save-state="SAVED"]').waitFor();
const screenshot=async(p,name)=>{await p.locator("#leo-boot").waitFor({state:"hidden"});await p.screenshot({path:`${out}/screenshots/beta-${name}.png`,fullPage:true});};
async function run(name,width,fn) {
  const context=await browser.newContext({viewport:{width,height:width<600?844:900},hasTouch:width<600,isMobile:width<600,acceptDownloads:true});
  const p=await context.newPage();p.setDefaultTimeout(15000);const errors=[];p.on("pageerror",e=>errors.push(e.message));
  try {await fn(p,context);assert.deepEqual(errors,[]);results.push({name,status:"PASS",width});console.log("PASS",name);}
  catch(e){results.push({name,status:"FAIL",error:e.stack,errors});console.error("FAIL",name,e.message);await screenshot(p,`failure-${stamp}-${width}`).catch(()=>{});}
  finally {await context.close();fs.writeFileSync(`${out}/beta-browser-${stamp}.json`,JSON.stringify({origin,browser:browser.version(),scope:"Real Chrome; touch/viewport/input on mobile sizes; not a new physical-device claim",results},null,2));}
}
for(const width of [390,430,1280])await run(`First minute, creation drafts and backup reminder ${width}`,width,async p=>{
  await p.goto(origin,{waitUntil:"networkidle"});await p.locator('[data-onboarding="true"]').waitFor();
  assert.equal(await raw(p),null);await screenshot(p,`${width}-welcome`);
  await p.getByRole("button",{name:"下一步",exact:true}).click();await p.getByRole("button",{name:"下一步",exact:true}).click();
  for(const name of ["新建知识树","从模板开始","导入"])assert.equal(await p.getByRole("button",{name,exact:true}).count(),1);
  await p.getByRole("button",{name:"新建知识树",exact:true}).click();await p.locator(".new-tree-form").waitFor();
  assert.equal(await raw(p),null);await p.getByLabel("树的名字",{exact:true}).fill("取消的树");
  await p.getByRole("button",{name:"退出",exact:true}).click();assert.equal(await raw(p),null);
  await p.getByRole("button",{name:"新建知识树",exact:true}).click();await p.keyboard.press("Escape");assert.equal(await raw(p),null);
  await p.getByRole("button",{name:"新建知识树",exact:true}).click();await screenshot(p,`${width}-creation-card`);
  await p.getByRole("button",{name:"进入知识树",exact:true}).click();await saved(p);await p.locator(".local-first-reminder").waitFor();
  let ws=JSON.parse(await raw(p)).workspace;let tree=Object.values(ws.trees)[0];assert.equal(tree.title,"未命名");assert.equal(tree.description,"");
  await p.getByRole("button",{name:"知道了",exact:true}).click();
  await p.locator(".brand-home").click();await p.getByRole("button",{name:"新建知识树",exact:true}).click();
  await p.getByLabel("树的名字",{exact:true}).fill("中文知识树");await p.getByLabel("树的简介（可不填）",{exact:true}).fill("记录中文学习与实践。");
  await p.getByRole("button",{name:"进入知识树",exact:true}).click();await saved(p);
  ws=JSON.parse(await raw(p)).workspace;tree=ws.trees[ws.currentTreeId];assert.equal(tree.title,"中文知识树");assert.equal(tree.description,"记录中文学习与实践。");
  assert.equal(await p.locator(".local-first-reminder").count(),0);
  await p.locator(".ink-dock").getByRole("button",{name:"设置",exact:true}).click();
  assert.equal(await p.locator(".essential-info li").count(),4);assert.equal(await p.locator(".public-guide details").count(),9);
  assert.match(await p.locator('[data-backup-recency]').innerText(),/从未/);
  const download=p.waitForEvent("download");await p.getByRole("button",{name:"完整备份 ZIP",exact:true}).click();const file=await download;assert.equal(await file.failure(),null);
  await p.waitForFunction(k=>!!localStorage.getItem(k),backupKey);assert.match(await p.locator('[data-backup-recency]').innerText(),/今天/);
  const at=await p.evaluate(k=>localStorage.getItem(k),backupKey);const knowledge=await raw(p);
  await p.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=b=>{if(b.type==="application/zip")throw new Error("simulated download setup failure");return original(b);};});
  await p.getByRole("button",{name:"完整备份 ZIP",exact:true}).click();await p.locator('.save-notice [role="alert"]').waitFor();
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),backupKey),at);assert.equal(await raw(p),knowledge);
  await p.reload({waitUntil:"networkidle"});assert.match(await p.locator('[data-backup-recency]').innerText(),/今天/);assert.equal(await p.locator('[data-onboarding]').count(),0);
  await p.getByRole("button",{name:"反馈问题",exact:true}).click();assert.match(await p.locator('dialog[open]').innerText(),/暂不会发送/);await p.keyboard.press("Escape");
  await screenshot(p,`${width}-settings`);
  await p.getByRole("link",{name:"下载本地版",exact:true}).click();await p.getByRole("heading",{name:"选择你的使用方式"}).waitFor();
  assert.equal(await p.getByRole("button",{name:"Windows 本地版即将开放"}).isDisabled(),true);assert.equal(await p.locator(".essential-info li").count(),4);
  assert.equal(await p.locator('a[href$=".exe"]').count(),0);assert.equal(await raw(p),knowledge);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await screenshot(p,`${width}-download`);
  await p.getByRole("link",{name:"立即使用网页版",exact:true}).click();await p.locator(".grove").waitFor();assert.equal(await raw(p),knowledge);
});
await run("Template and import start without premature writes",430,async p=>{
  await p.goto(origin,{waitUntil:"networkidle"});await p.getByRole("button",{name:"跳过介绍"}).click();await p.getByRole("button",{name:"从模板开始",exact:true}).click();
  await p.locator('dialog[open] .tpl-pick').first().click();await p.locator(".new-tree-form").waitFor();assert.equal(await raw(p),null);
  await p.getByRole("button",{name:"进入知识树"}).click();await saved(p);assert.ok(Object.values(JSON.parse(await raw(p)).workspace.trees)[0].nodes.length>0);
  await p.getByRole("button",{name:"知道了"}).click();const before=await raw(p);
  const chooser=p.waitForEvent("filechooser");await p.getByRole("button",{name:"导入 JSON / 恢复 ZIP"}).click();
  await (await chooser).setFiles({name:"tree.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(JSON.parse(before).workspace))});
  await p.getByRole("heading",{name:"导入预览"}).waitFor();await p.keyboard.press("Escape");assert.equal(await raw(p),before);
});
await run("Recovery explains the problem without raw status codes",390,async(p,c)=>{
  await c.addInitScript(k=>localStorage.setItem(k,"{ broken original"),key);await p.goto(origin,{waitUntil:"networkidle"});
  await p.locator('.recovery-panel [data-error-code="PARSE_ERROR"]').waitFor();assert.equal(await raw(p),"{ broken original");
  assert.doesNotMatch(await p.locator("body").innerText(),/PARSE_ERROR|RECOVERY_REQUIRED|SyntaxError/);await screenshot(p,"recovery-copy");
});
await browser.close();const failed=results.filter(r=>r.status==="FAIL").length;console.log(JSON.stringify({pass:results.length-failed,fail:failed,evidence:`${out}/beta-browser-${stamp}.json`}));if(failed)process.exitCode=1;
