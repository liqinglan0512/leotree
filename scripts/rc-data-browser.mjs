import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { addNode,createBlankTree,patchNode,setCurrentTree } from "../src/lib/knowledge-tree/engine.ts";
import { emptyWorkspace } from "../src/lib/knowledge-tree/factory.ts";
import { ACTIVE_KEY,encodeRecord } from "../src/lib/knowledge-tree/storage.ts";
const origin=process.env.RC_URL ?? "http://localhost:8080";
const out="release-evidence"; fs.mkdirSync(`${out}/screenshots`,{recursive:true}); fs.mkdirSync(`${out}/downloads`,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,"-"); const results=[];
const browser=await chromium.launch({channel:"chrome",headless:true});
let ws=addNode(createBlankTree(emptyWorkspace(),"Audit tree"),"sec-1");
const treeId=ws.currentTreeId; const nodeId=ws.trees[treeId].nodes[0].id;
ws=patchNode(ws,nodeId,{title:"Evidence node",note:"original note"});
ws=createBlankTree(ws,"Second tree"); const secondId=ws.currentTreeId; ws=setCurrentTree(ws,treeId);
const seed={ [ACTIVE_KEY]:encodeRecord(ws,1) };
async function context(data=seed) {
  const c=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  await c.addInitScript(data=>{if(!localStorage.getItem("_rc_seed_loaded")){ for(const [k,v] of Object.entries(data))localStorage.setItem(k,v);localStorage.setItem("leo-tree-guest-v1","1");localStorage.setItem("_rc_seed_loaded","1");}},data);
  return c;
}
async function pageIn(c) {const p=await c.newPage();p.setDefaultTimeout(15000);await p.goto(origin,{waitUntil:"networkidle"});return p;}
async function saved(p) {await p.locator('[data-save-state="SAVED"]').waitFor();}
async function stored(p) {return p.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACTIVE_KEY);}
async function openTree(p,title="Audit tree") {await p.locator(".grove-card").filter({hasText:title}).click();}
async function openNode(p) {await p.locator(".node-enter").filter({hasText:"Evidence node"}).click();await p.getByLabel(/本枝记录/).waitFor();}
async function inputFile(p,name,bytes) {await p.locator('input[type=file][accept*=".zip"]').setInputFiles({name,mimeType:name.endsWith(".zip")?"application/zip":"application/json",buffer:Buffer.from(bytes)});}
async function blobText(p,id) {return p.evaluate(id=>new Promise((resolve,reject)=>{const r=indexedDB.open("leo-tree-files-v1",1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction("blobs","readonly");const q=tx.objectStore("blobs").get(id);q.onsuccess=async()=>{const text=q.result?await q.result.text():null;db.close();resolve(text);};q.onerror=()=>reject(q.error);};r.onerror=()=>reject(r.error);}),id);}
async function run(name,fn) {
  const start=Date.now(); let c;
  try {c=await context();await fn(c);results.push({name,status:"PASS",durationMs:Date.now()-start});console.log("PASS",name);}
  catch(e){results.push({name,status:"FAIL",durationMs:Date.now()-start,error:e.stack});console.error("FAIL",name,e.message);if(c?.pages()[0])await c.pages()[0].screenshot({path:`${out}/screenshots/failure-${results.length}-${stamp}.png`,fullPage:true}).catch(()=>{});}
  finally{if(c)await c.close();fs.writeFileSync(`${out}/lt0-browser-${stamp}.json`,JSON.stringify({origin,browser:browser.version(),results},null,2));}
}
try {
await run("Empty profile creates, writes and reloads durable knowledge",async c=>{
  await c.close();c=await context({});try{
    const p=await pageIn(c);await p.getByRole("button",{name:"新建知识树",exact:true}).click();await saved(p);
    await p.getByRole("button",{name:"在此分区新增节点"}).click();await p.locator(".node-enter").click();
    await p.getByLabel(/本枝记录/).fill("今天写下的知识，明天还在。");await saved(p);
    const before=await stored(p);await p.reload({waitUntil:"networkidle"});await p.locator(".grove-card").click();await p.locator(".node-enter").click();
    assert.equal(await p.getByLabel(/本枝记录/).inputValue(),"今天写下的知识，明天还在。");assert.deepEqual((await stored(p)).workspace,before.workspace);
  }finally{await c.close();}
});
await run("Existing v3 loads without source writes and preserves migration source",async c=>{
  await c.close();const raw=JSON.stringify(ws);c=await context({"knowledge-tree-workspace-v3":raw});try{
    const p=await pageIn(c);await openTree(p);assert.equal(await p.evaluate(()=>localStorage.getItem("leo-tree-workspace-v1")),null);
    await openNode(p);await p.getByLabel(/本枝记录/).fill("migrated note");await saved(p);
    assert.equal(await p.evaluate(()=>localStorage.getItem("knowledge-tree-workspace-v3")),raw);assert.equal((await stored(p)).workspace.trees[treeId].nodes[0].note,"migrated note");
  }finally{await c.close();}
});
await run("Legacy v2 custom node and SNN template survive migration",async c=>{
  await c.close();const raw=JSON.stringify({schemaVersion:2,tree:{A01:{note:"legacy A01",status:"done"},Z99:{note:"custom Z99",status:"todo"}}});c=await context({"snn-calib-knowledge-tree-v2":raw});try{
    const p=await pageIn(c);await openTree(p,"SNN");await p.locator(".node-enter").filter({hasText:"A01"}).click();assert.equal(await p.getByLabel(/本枝记录/).inputValue(),"legacy A01");
    await p.getByLabel(/本枝记录/).fill("legacy edited");await saved(p);
    const tree=Object.values((await stored(p)).workspace.trees)[0];assert.equal(tree.nodes.find(n=>n.id==="Z99").note,"custom Z99");assert.equal(await p.evaluate(()=>localStorage.getItem("snn-calib-knowledge-tree-v2")),raw);
  }finally{await c.close();}
});
await run("Corrupt source recovery downloads exact raw and requires validated confirmation",async c=>{
  await c.close();const raw="{ unique broken payload";c=await context({[ACTIVE_KEY]:raw,"knowledge-tree-workspace-v3":JSON.stringify(ws)});try{
    const p=await pageIn(c);assert.equal(await p.locator(".recovery-panel strong").innerText(),"PARSE_ERROR");
    const download=p.waitForEvent("download");await p.getByRole("button",{name:"下载原始数据"}).click();const file=await download;await file.saveAs(`${out}/downloads/recovery-original.txt`);assert.equal(fs.readFileSync(`${out}/downloads/recovery-original.txt`,"utf8"),raw);
    await p.getByRole("button",{name:/预览 knowledge-tree-workspace-v3/}).click();assert.equal(await p.getByRole("button",{name:"确认启用恢复副本"}).isDisabled(),true);
    assert.equal(await p.evaluate(k=>localStorage.getItem(k),ACTIVE_KEY),raw);
    await p.getByRole("checkbox").check();await p.getByRole("button",{name:"确认启用恢复副本"}).click();await saved(p);
    assert.equal((await stored(p)).workspace.trees[treeId].nodes[0].note,"original note");
    assert.equal(await p.evaluate(raw=>Object.keys(localStorage).some(k=>k.startsWith("leo-tree-recovery-source-")&&JSON.parse(localStorage.getItem(k)).raw===raw),raw),true);
    await p.screenshot({path:`${out}/screenshots/lt0-recovered.png`,fullPage:true});
  }finally{await c.close();}
});
await run("Real two-tab concurrent fields and UI-only search/tab cannot erase domain",async c=>{
  const a=await pageIn(c);const b=await pageIn(c);await openTree(a);await openNode(a);await openTree(b);await openNode(b);
  await Promise.all([a.getByLabel(/本枝记录/).fill("A concurrent note"),b.getByLabel("名称",{exact:true}).fill("B concurrent title")]);await Promise.all([saved(a),saved(b)]);
  const t=(await stored(a)).workspace.trees[treeId];assert.equal(t.nodes[0].note,"A concurrent note");assert.equal(t.nodes[0].title,"B concurrent title");
  await b.getByRole("button",{name:"实践日志",exact:true}).click();
  await a.getByRole("button",{name:/切换知识树/}).click();await a.getByRole("button",{name:"+ 新建空白",exact:true}).click();await saved(a);
  await b.getByRole("button",{name:"知识树",exact:true}).click();await b.locator("input.search").fill("search only");
  assert.equal(Object.keys((await stored(b)).workspace.trees).length,3);
});
await run("Upload + note + tree switch keeps target identity and committed note",async c=>{
  const p=await pageIn(c);await openTree(p);await openNode(p);
  await p.evaluate(()=>{const original=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=async function(){if(this.size===8)await new Promise(r=>setTimeout(r,1200));return original.call(this);};});
  await p.locator(".node-files input[type=file]").setInputFiles({name:"proof.md",mimeType:"text/markdown",buffer:Buffer.from("uploaded evidence")});
  await p.getByLabel(/本枝记录/).fill("note during upload");
  await p.getByRole("button",{name:/切换知识树/}).click();await p.locator(".tree-pick").filter({hasText:"Second tree"}).click();
  await p.waitForFunction(({key,treeId})=>JSON.parse(localStorage.getItem(key)).workspace.trees[treeId].nodes[0].attachments.length===1,{key:ACTIVE_KEY,treeId});await saved(p);
  const t=(await stored(p)).workspace.trees[treeId];assert.equal(t.nodes[0].note,"note during upload");assert.equal(await blobText(p,t.nodes[0].attachments[0].id),"uploaded evidence");assert.equal(await p.locator("h1").innerText(),"Second tree");
});
await run("UI copy has independent attachment IDs and deleting copy preserves original",async c=>{
  const p=await pageIn(c);await openTree(p);await openNode(p);
  await p.locator(".node-files input[type=file]").setInputFiles({name:"copy.md",mimeType:"text/markdown",buffer:Buffer.from("independent proof")});await p.waitForFunction(({key,treeId})=>JSON.parse(localStorage.getItem(key)).workspace.trees[treeId].nodes[0].attachments.length===1,{key:ACTIVE_KEY,treeId});await saved(p);
  const original=(await stored(p)).workspace.trees[treeId].nodes[0].attachments[0].id;
  await p.getByRole("button",{name:/切换知识树/}).click();await p.locator(".tree-row").filter({hasText:"Audit tree"}).getByRole("button",{name:"复制",exact:true}).click();
  await p.locator(".tree-pick").filter({hasText:"Audit tree 副本"}).click();await saved(p);await openNode(p);
  const copied=Object.values((await stored(p)).workspace.trees).find(t=>t.title==="Audit tree 副本");const copyFile=copied.nodes[0].attachments[0].id;assert.notEqual(copyFile,original);
  await p.locator(".file-row").getByRole("button",{name:"删除",exact:true}).click();await saved(p);assert.equal(await blobText(p,original),"independent proof");
});
await run("Import preview commits only after confirmation and default creates new ID",async c=>{
  const p=await pageIn(c);const old=structuredClone(ws.trees[treeId]);old.nodes[0].note="older backup";old.nodes[0].updatedAt="2020-01-01T00:00:00Z";
  await inputFile(p,"old.json",JSON.stringify({schemaVersion:3,tree:old}));await p.getByRole("button",{name:"确认导入",exact:true}).waitFor();
  assert.equal(Object.keys((await stored(p)).workspace.trees).length,2);
  await p.screenshot({path:`${out}/screenshots/lt0-import-preview.png` }).catch(()=>{});
  await p.getByRole("button",{name:"确认导入",exact:true}).click();await saved(p);
  const trees=(await stored(p)).workspace.trees;assert.equal(Object.keys(trees).length,3);assert.equal(trees[treeId].nodes[0].note,"original note");
});
await run("Quota failure exposes rescue export and retains draft, retry succeeds",async c=>{
  const p=await pageIn(c);await openTree(p);await openNode(p);
  await p.evaluate(()=>{window._originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith("leo-tree-workspace"))throw new DOMException("full","QuotaExceededError");return window._originalSet.call(this,k,v);};});
  await p.getByLabel(/本枝记录/).fill("rescue browser note");await p.locator('[data-save-state="SAVE_FAILED"]').waitFor();
  assert.equal((await stored(p)).workspace.trees[treeId].nodes[0].note,"original note");assert.equal(await p.getByLabel(/本枝记录/).inputValue(),"rescue browser note");
  const download=p.waitForEvent("download");await p.getByRole("button",{name:"导出草稿 JSON",exact:true}).click();const file=await download;await file.saveAs(`${out}/downloads/rescue-browser.json`);assert.equal(JSON.parse(fs.readFileSync(`${out}/downloads/rescue-browser.json`)).trees[treeId].nodes[0].note,"rescue browser note");
  await p.screenshot({path:`${out}/screenshots/lt0-save-failed.png`,fullPage:true});
  await p.evaluate(()=>{Storage.prototype.setItem=window._originalSet;});await p.getByRole("button",{name:"重试保存",exact:true}).click();await saved(p);assert.equal((await stored(p)).workspace.trees[treeId].nodes[0].note,"rescue browser note");
});
await run("Browser ZIP download restores exact notes and real IndexedDB bytes into empty profile",async c=>{
  const p=await pageIn(c);await openTree(p);await openNode(p);await p.locator(".node-files input[type=file]").setInputFiles({name:"backup.md",mimeType:"text/markdown",buffer:Buffer.from("backup bytes SHA256")});
  await p.waitForFunction(({key,treeId})=>JSON.parse(localStorage.getItem(key)).workspace.trees[treeId].nodes[0].attachments.length===1,{key:ACTIVE_KEY,treeId});await saved(p);
  const before=(await stored(p)).workspace;const download=p.waitForEvent("download");await p.getByRole("button",{name:"完整备份 ZIP",exact:true}).click();const file=await download;const path=`${out}/downloads/LeoTree-backup.zip`;await file.saveAs(path);
  const target=await context({});try{const q=await pageIn(target);await inputFile(q,"LeoTree-backup.zip",fs.readFileSync(path));await q.getByRole("button",{name:"确认完整恢复",exact:true}).waitFor();assert.equal(await q.getByRole("button",{name:"确认完整恢复",exact:true}).isDisabled(),true);await q.getByRole("checkbox").check();await q.getByRole("button",{name:"确认完整恢复",exact:true}).click();await saved(q);
    const after=(await stored(q)).workspace;assert.deepEqual(after.trees,before.trees);const id=after.trees[treeId].nodes[0].attachments[0].id;assert.equal(await blobText(q,id),"backup bytes SHA256");await q.screenshot({path:`${out}/screenshots/lt0-restored-empty-profile.png`,fullPage:true});
  }finally{await target.close();}
});
} finally {await browser.close();}
const fail=results.filter(r=>r.status!=="PASS");console.log(JSON.stringify({pass:results.length-fail.length,fail:fail.length,evidence:`${out}/lt0-browser-${stamp}.json`}));process.exitCode=fail.length?1:0;
