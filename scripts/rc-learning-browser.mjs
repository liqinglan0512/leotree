import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { emptyWorkspace } from "../src/lib/knowledge-tree/factory.ts";
import { createBlankTree, addNode, patchNode } from "../src/lib/knowledge-tree/engine.ts";
import { ACTIVE_KEY, encodeRecord } from "../src/lib/knowledge-tree/storage.ts";

const debug=process.env.RC_DEBUG === "1";
const origin=process.env.RC_URL ?? "http://localhost:8080";
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const out="release-evidence", results=[];
async function geometry(p) { return p.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft,pageLeft:visualViewport.pageLeft,offsetTop:visualViewport.offsetTop},root:document.documentElement.getBoundingClientRect().toJSON(),body:document.body.getBoundingClientRect().toJSON(),active:document.activeElement.outerHTML.slice(0,300), clicks:window._rcClicks,offenders:[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(-8).map(e=>({tag:e.tagName,cls:e.className,rect:e.getBoundingClientRect().toJSON()}))})); }
fs.mkdirSync(`${out}/screenshots`,{recursive:true});
let ws=createBlankTree(emptyWorkspace(),"学习闭环验收树");
const treeId=ws.currentTreeId, sectionId=ws.trees[treeId].sections[0].id;
let parent=null;
const longTitle="检索靶点：膜电位与概率校准——从可检验问题走向可复现证据。".repeat(3)+" LongUnbrokenTitle"+"X".repeat(70);
for(let depth=1;depth<=20;depth++) {
  ws=addNode(ws,sectionId,parent);parent=ws.ui.focusNodeId;
  ws=patchNode(ws,parent,{title:depth===20?longTitle:`第 ${depth} 层知识分支`});
}
const nodeId=parent;
for(let i=0;i<100;i++) {ws=addNode(ws,sectionId,nodeId);ws=patchNode(ws,ws.ui.focusNodeId,{title:`子节点 ${String(i+1).padStart(3,"0")}：实验与证据`});}
const browser=await chromium.launch({channel:"chrome",headless:true});
const saved=p=>p.locator('[data-save-state="SAVED"]').waitFor();
const stored=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)).workspace,ACTIVE_KEY);
async function noOverflow(p) {const size=await p.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,inner:innerWidth}));assert.ok(size.scroll<=p.viewportSize().width+1 && size.inner<=p.viewportSize().width+1,JSON.stringify(size));}
async function screenshot(p,name) {await p.locator("#leo-boot").waitFor({state:"hidden"});await p.screenshot({path:`${out}/screenshots/lt1-${name}.png`});}
async function enter(p) {await p.locator(".grove-card").click();await p.locator("input.search").fill("检索靶点");await p.locator(".node-enter").click();await p.getByLabel("本枝记录",{exact:true}).waitFor();}
async function visible(p,l) {await l.scrollIntoViewIfNeeded();const box=await l.boundingBox();const size=p.viewportSize();assert.ok(box && box.x>=0 && box.x+box.width<=size.width+1 && box.y>=0 && box.y+box.height<=size.height+1,JSON.stringify({box,size}));}
async function context(width,height,font="md") {
  const c=await browser.newContext({viewport:{width,height},isMobile:width<800,hasTouch:width<800,deviceScaleFactor:1});
  await c.addInitScript(({key,raw,font})=>{if(!localStorage.getItem("_rc_seed_loaded")){localStorage.setItem(key,raw);localStorage.setItem("leo-tree-guest-v1","1");localStorage.setItem("leo-tree-prefs-v1",JSON.stringify({locale:"zh",font}));localStorage.setItem("_rc_seed_loaded","1");}}, {key:ACTIVE_KEY,raw:encodeRecord(ws,1),font});
  return c;
}
async function run(name,width,height,font,fn) {
  const start=Date.now(),c=await context(width,height,font),p=await c.newPage(),errors=[],steps=[];
  await p.addInitScript(()=>{window._rcClicks=[];document.addEventListener("click",e=>{window._rcClicks.push(e.target.outerHTML.slice(0,180));window._rcClicks=window._rcClicks.slice(-5);},true);});
  p.setDefaultTimeout(18000);p.on("pageerror",e=>errors.push(e.message));
  const step=label=>{steps.push(label);console.log(name,label);};
  try {await p.goto(origin,{waitUntil:"networkidle"});await fn(p,step);assert.deepEqual(errors,[]);results.push({name,status:"PASS",width,height,font,steps,durationMs:Date.now()-start});}
  catch(e){results.push({name,status:"FAIL",width,height,font,steps,error:e.stack,pageErrors:errors,geometry:await geometry(p)});console.error("FAIL",name,e.message);await screenshot(p,`failure-${width}-${font}-${stamp}`).catch(()=>{});}
  finally{await c.close();fs.writeFileSync(`${out}/lt1-browser-${stamp}.json`,JSON.stringify({origin,browser:browser.version(),scope:"Real desktop Chrome; mobile viewport, touch and keyboard-occupied viewport simulation. No physical phone.",fixture:{depth:20,children:100,longTitleCharacters:longTitle.length},results},null,2));}
}
try {
for(const [width,height] of (debug ? [[390,844],[430,932]] : [[390,844],[430,932],[1280,900]])) await run(`Learning loop ${width}`,width,height,"md",async(p,step)=>{
  const templateTrigger=p.locator(".grove-cta .btn").nth(1);await templateTrigger.click();await p.locator("dialog[open]").waitFor();await p.keyboard.press("Escape");assert.equal(await templateTrigger.evaluate(e=>e===document.activeElement),true);
  await p.locator(".grove-card")[width<800 ? "tap" : "click"]();await p.locator("input.search").fill("检索靶点");
  const path=await p.locator(".search-path").innerText();assert.ok(path.includes("学习闭环验收树") && path.includes("第 1 层") && path.includes("第 19 层"));
  await p.locator(".node-enter")[width<800 ? "tap" : "click"]();assert.equal(await p.locator("input.search").inputValue(),"");
  assert.equal(await p.locator(".branch-title-text").innerText(),longTitle);await noOverflow(p);step("Search full path opens readable 20-level detail and clears overlay");
  await p.locator(".filters").getByRole("button",{name:"✓ 掌握",exact:true}).click();
  assert.equal(await p.locator(".active-filters").isVisible(),true);await p.getByText("有子节点，但当前筛选无匹配。",{exact:true}).waitFor();
  await p.getByRole("button",{name:"清除筛选",exact:true}).click();assert.equal(await p.locator(".branch > .item:not(.branch-head)").count(),100);step("Visible filters distinguish hidden children from empty children");
  await p.getByLabel("本枝记录",{exact:true}).fill(`手机 ${width}：问题、证据与下一步。`);
  await p.locator(".branch-head > .mark")[width<800 ? "tap" : "click"]();await p.locator(".branch-head > .mark")[width<800 ? "tap" : "click"]();await saved(p);
  assert.equal((await stored(p)).trees[treeId].nodes.find(n=>n.id===nodeId).status,"done");
  await p.getByRole("button",{name:"记录一次实践",exact:true}).click();
  await p.locator(".exp").getByLabel(/^问题 \/ 目标/).fill("这次练习能否重复得到同一个结果？");
  await p.locator(".exp").getByLabel(/^结论/).fill("保留过程与证据，结论通过复核。");
  await p.locator(".exp select").first().selectOption("done");await saved(p);
  const log=(await stored(p)).trees[treeId].logs[0];assert.deepEqual(log.linkedNodeIds,[nodeId]);assert.equal(log.status,"done");
  await noOverflow(p);
  if(debug)console.log("before return",await geometry(p));
  await p.locator(".practice-return button")[width<800 ? "tap" : "click"]();await p.getByLabel("本枝记录",{exact:true}).waitFor();step("Node → note → state → linked practice → evidence → node");
  await p.getByRole("button",{name:"周回顾",exact:true}).click();
  await p.getByRole("button",{name:"生成本周草稿",exact:true}).click();await saved(p);
  assert.match(await p.getByLabel(/^可编辑周总结/).inputValue(),/所选周标为掌握 1/);
  const historical=p.locator(".list").filter({has:p.getByRole("heading",{name:"本周新掌握",exact:true})});
  // The historical list keeps event-time titles; current diagnostics are labelled separately.
  const row=p.locator(".list button.row").filter({hasText:"返回节点"}).first();await row[width<800 ? "tap" : "click"]();
  assert.equal(await p.locator(".branch-title-text").innerText(),longTitle);step("Review draft contains recorded facts and returns to source node");
  void historical;
  await p.getByRole("button",{name:"目录",exact:true}).click();const dialog=p.locator("dialog[open]");await dialog.waitFor();
  const indent=await dialog.locator(".ol-row.current").evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft));assert.ok(indent<=68);
  await p.keyboard.press("Tab");assert.equal(await p.evaluate(()=>!!document.activeElement.closest("dialog")),true);
  await p.keyboard.press("Shift+Tab");assert.equal(await p.evaluate(()=>!!document.activeElement.closest("dialog")),true);
  await p.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});assert.equal(await p.getByRole("button",{name:"目录",exact:true}).evaluate(e=>e===document.activeElement),true);step("20-level outline has bounded indentation; dialog traps and restores focus");
  await p.getByRole("button",{name:"编辑节点",exact:true}).click();
  const toggle=p.locator(".branch-head .struct-toggle");await toggle.click();await visible(p,p.locator(".struct-sheet"));
  await screenshot(p,`${width}-structure`);await p.keyboard.press("Escape");assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
  await p.getByRole("button",{name:"完成编辑",exact:true}).click();
  await p.locator(".crumb-full summary").click();await noOverflow(p);assert.equal(await p.locator(".crumb-full li").count(),20);await p.locator(".crumb-full summary").click();
  await p.getByRole("button",{name:"编辑节点",exact:true}).click();
  await noOverflow(p);
  if(debug)console.log("before last menu",await geometry(p));
  await p.locator(".branch > .item:not(.branch-head)").last().locator(".struct-toggle").click();await visible(p,p.locator(".struct-sheet"));
  const orderBefore=(await stored(p)).trees[treeId].nodes.filter(n=>n.parentId===nodeId).sort((a,b)=>a.order-b.order);
  await p.locator(".struct-sheet").getByRole("button",{name:"上移",exact:true}).click();await saved(p);
  assert.equal((await stored(p)).trees[treeId].nodes.find(n=>n.id===orderBefore.at(-1).id).order,98);
  await p.keyboard.press("Escape");step("Structure menus at head and list end remain inside viewport; move changes sibling order");
  await p.locator(".filters").getByRole("button",{name:"✓ 掌握",exact:true}).click();
  await p.getByRole("button",{name:"在此枝下新增节点",exact:true}).click();await saved(p);
  assert.equal(await p.getByLabel("名称",{exact:true}).inputValue(),"未命名节点");assert.equal(await p.locator(".active-filters").count(),0);
  const newest=(await stored(p)).trees[treeId].nodes.at(-1);assert.equal(newest.parentId,nodeId);assert.equal(newest.order,100);step("New child remains visible under prior filters and has contiguous sibling order");
  await p.getByRole("button",{name:"完成编辑",exact:true}).click();
  await p.getByLabel("本枝记录",{exact:true}).fill("输入时保留草稿");
  if(width<800){await p.setViewportSize({width,height:400});await p.getByLabel("本枝记录",{exact:true}).press("End");await visible(p,p.getByLabel("本枝记录",{exact:true}));assert.equal(await p.locator(".ink-dock").isVisible(),false);await screenshot(p,`${width}-keyboard-simulated`);await p.setViewportSize({width,height});}
  await p.getByLabel("本枝记录",{exact:true}).blur();await saved(p);step("Text input survives keyboard-occupied viewport simulation");
  await p.reload({waitUntil:"networkidle"});await p.locator(".grove-card").click();await p.locator("input.search").fill("检索靶点");await p.locator(".node-enter").click();
  assert.equal(await p.getByLabel("本枝记录",{exact:true}).inputValue(),`手机 ${width}：问题、证据与下一步。`);
  await p.locator(".branch-head").scrollIntoViewIfNeeded();await screenshot(p,`${width}-learning-detail`);await noOverflow(p);step("Reload preserves completed learning loop");
  await p.getByRole("button",{name:/切换知识树/}).click();
  await p.locator("dialog[open] .tree-row").first().getByRole("button",{name:"改名",exact:true}).click();
  const rename=p.locator("dialog[open]").last();await rename.getByLabel(/^名称/).fill("取消的重命名");await p.keyboard.press("Escape");
  assert.equal((await stored(p)).trees[treeId].title,"学习闭环验收树");
  await p.locator("dialog[open] .tree-row").first().getByRole("button",{name:"删除",exact:true}).click();
  assert.equal(await p.locator("dialog[open]").count(),2);await p.keyboard.press("Escape");
  assert.ok((await stored(p)).trees[treeId]);await p.mouse.click(2,2);await p.locator("dialog[open]").waitFor({state:"hidden"});
  step("Template, switcher, rename and delete dialogs close without committing cancellation");
});
for(const [width,height] of (debug ? [] : [[390,844],[430,932]])) await run(`Large font and landscape ${width}`,width,height,"xl",async(p,step)=>{
  await enter(p);await noOverflow(p);await p.locator(".branch-title-text").scrollIntoViewIfNeeded();await screenshot(p,`${width}-font-xl`);
  const targets=await p.locator(".branch-head > .mark, .branch-actions .btn, .filters .chip, .ink-mod").evaluateAll(es=>es.map(e=>({label:e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  assert.ok(targets.every(t=>t.width>=43 && t.height>=43),JSON.stringify(targets));step("Maximum product font displays unbroken long titles and 44px primary targets");
  await p.setViewportSize({width:height,height:width});await noOverflow(p);
  await p.getByRole("button",{name:/切换知识树/}).click();await p.locator("dialog[open]").waitFor();await visible(p,p.getByRole("button",{name:"关闭对话框",exact:true}));
  await screenshot(p,`${width}-landscape-dialog`);await p.getByRole("button",{name:"关闭对话框",exact:true}).click();step("Landscape dialog close action is visible and works");
});
} finally {await browser.close();}
console.log(JSON.stringify({pass:results.filter(r=>r.status==="PASS").length,fail:results.filter(r=>r.status==="FAIL").length,evidence:`${out}/lt1-browser-${stamp}.json`}));
if(results.some(r=>r.status!=="PASS"))process.exitCode=1;
