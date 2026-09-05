import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright";

const stamp=new Date().toISOString().replace(/[:.]/g,"-"), results=[], servers=new Set();
const out="release-evidence", base=Number(process.env.RC_TEST_PORT_BASE ?? 8082);
const serverRoot=resolve(process.env.RC_SERVER_ROOT || ".output");
const accountOrigin=`http://localhost:${base}`, localOrigin=`http://localhost:${base+1}`;
fs.mkdirSync(`${out}/runtime`,{recursive:true});fs.mkdirSync(`${out}/screenshots`,{recursive:true});
const dbPath=resolve(`${out}/runtime/account-db-${stamp}`), profile=resolve(`${out}/profiles/account-${stamp}`);
const secret=randomBytes(32).toString("hex"), password=randomBytes(18).toString("hex");
const emailA=`rc-a-${Date.now()}@example.test`,emailB=`rc-b-${Date.now()}@example.test`;
const key="leo-tree-workspace-v1"; let context,p;
const save=()=>fs.writeFileSync(`${out}/rc-production-${stamp}.json`,JSON.stringify({build:resolve(serverRoot,"nitro.json"),node:process.version,scope:"Built Node server; local loopback; synthetic email identities; isolated persistent Chrome profile",results},null,2));
function pass(name,extra={}) {results.push({name,status:"PASS",...extra});console.log("PASS",name);save();}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function available(port) {await new Promise((ok,no)=>{const s=createServer();s.once("error",no);s.listen(port,"127.0.0.1",()=>s.close(ok));});}
async function start(port,configured) {
  await available(port);
  const log=fs.openSync(`${out}/runtime/production-${port}-${stamp}-${Date.now()}.log`,"a");
  const env={...process.env,HOST:"127.0.0.1",PORT:String(port),NITRO_PORT:String(port),DATABASE_URL:"",VITE_AUTH_ENABLED:"true",LEOTREE_EMAIL_AUTH:configured?"true":"false",LEOTREE_PGLITE_PATH:configured?dbPath:"",BETTER_AUTH_URL:`http://localhost:${port}`,BETTER_AUTH_SECRET:secret};
  const child=spawn(process.execPath,[resolve(serverRoot,"server/index.mjs")],{env,cwd:serverRoot,stdio:["ignore",log,log],windowsHide:true});
  fs.closeSync(log);servers.add(child);child.on("exit",()=>servers.delete(child));
  let capabilities;
  for(let i=0;i<200;i++) {
    if(child.exitCode!==null)throw new Error(`Production server exited ${child.exitCode}; see private runtime log`);
    try {const r=await fetch(`http://localhost:${port}/api/auth/capabilities`);if(r.ok){capabilities=await r.json();break;}} catch { /* Wait for this owned child to listen. */ }
    await sleep(100);
  }
  assert.ok(capabilities,"Production server did not become ready");assert.equal(capabilities.emailPassword,configured);
  return child;
}
async function stop(child) {if(child.exitCode!==null)return;await new Promise(resolve=>{child.once("exit",resolve);child.kill();});}
async function browser() {const c=await chromium.launchPersistentContext(profile,{channel:"chrome",headless:true,viewport:{width:1280,height:900}});const page=c.pages()[0] ?? await c.newPage();page.setDefaultTimeout(15000);return {c,page};}
const saved=page=>page.locator('[data-save-state="SAVED"]').waitFor();
const raw=page=>page.evaluate(k=>localStorage.getItem(k),key);
async function fileText(page,id) {return page.evaluate(id=>new Promise((ok,no)=>{const req=indexedDB.open("leo-tree-files-v1",1);req.onsuccess=()=>{const db=req.result;const q=db.transaction("blobs").objectStore("blobs").get(id);q.onsuccess=async()=>{const value=q.result ? await q.result.text() : null;db.close();ok(value);};q.onerror=()=>no(q.error);};req.onerror=()=>no(req.error);}),id);}
async function screenshot(page,name) {await page.locator("#leo-boot").waitFor({state:"hidden"});await page.screenshot({path:`${out}/screenshots/rc-${name}.png`,fullPage:true});}
async function account(page,email,signup=false,pass=password) {
  await page.locator('[data-auth-availability="email"]').waitFor();
  if(signup)await page.getByRole("button",{name:"没有账号？注册",exact:true}).click();
  await page.locator('.auth-form input[type=email]').fill(email);await page.locator('.auth-form input[type=password]').fill(pass);
  await page.locator('.auth-form button[type=submit]').click();
}
async function settings(page) {
  if(await page.locator(".ink-dock").count())await page.locator(".ink-dock").getByRole("button",{name:"设置",exact:true}).click();
}
async function regression(script,name,url) {
  const file=`${out}/production-${name}-${stamp}.txt`,log=fs.openSync(file,"w");
  const child=spawn(process.execPath,["--experimental-strip-types",script],{env:{...process.env,RC_URL:url},stdio:["ignore",log,log],windowsHide:true});fs.closeSync(log);
  const code=await new Promise(resolve=>child.once("exit",resolve));
  assert.equal(code,0,`Production ${name} failed; see ${file}`);pass(`Production ${name} regressions`,{log:file});
}
try {
  const localServer=await start(base+1,false);
  const b=await chromium.launch({channel:"chrome",headless:true});context=await b.newContext({viewport:{width:430,height:932},hasTouch:true,isMobile:true});p=await context.newPage();p.setDefaultTimeout(15000);
  await p.goto(localOrigin,{waitUntil:"networkidle"});await p.getByRole("button",{name:"立即使用网页版",exact:true}).click();await settings(p);await p.locator('[data-auth-availability="unavailable"]').waitFor();
  assert.equal(await p.locator(".auth-form").count(),0);assert.equal(await p.locator(".auth-social").count(),0);
  await settings(p);assert.equal(await p.locator(".public-guide details").count(),9);assert.match(await p.locator(".settings-page").innerText(),/不按账号隔离/);
  await screenshot(p,"public-data-guide");
  await p.locator(".ink-dock").getByRole("button",{name:"社区",exact:true}).tap();await p.locator('[data-community-state="preview"]').waitFor();
  assert.equal(await p.locator(".community-preview input,.community-preview textarea,.community-preview form").count(),0);
  assert.equal(await p.locator(".community-preview button").count(),1);await screenshot(p,"community-preview");
  const before=await raw(p);await p.goto(`${localOrigin}/snn-calibration-knowledge-tree.html`,{waitUntil:"networkidle"});
  await p.waitForURL(`${localOrigin}/`);assert.equal(await raw(p),before);
  await p.goto(`${localOrigin}/login`,{waitUntil:"networkidle"});await p.locator('[data-auth-availability="unavailable"]').waitFor();assert.equal(await p.locator(".auth-form").count(),0);
  pass("F09/F14: default local mode hides unconfigured auth and mock community; legacy URL redirects without a domain write",{browser:b.version()});
  await context.close();await b.close();context=null;p=null;

  let accountServer=await start(base,true);
  ({c:context,page:p}=await browser());await p.goto(accountOrigin,{waitUntil:"networkidle"});
  await p.getByRole("button",{name:"立即使用网页版",exact:true}).click();
  await p.getByRole("button",{name:"新建知识树",exact:true}).click();await p.getByRole("button",{name:"进入知识树",exact:true}).click();await saved(p);
  await p.getByRole("button",{name:"在此分区新增节点",exact:true}).click();await p.getByLabel("名称",{exact:true}).fill("跨会话保存证据");
  await p.getByLabel("本枝记录",{exact:true}).fill("退出、切换账号和重启后仍然存在。");
  await p.locator('.node-files input[type=file]').setInputFiles({name:"restart.md",mimeType:"text/markdown",buffer:Buffer.from("Durable bytes across accounts and restart")});
  await p.waitForFunction(k=>{
    const record=JSON.parse(localStorage.getItem(k) || "null");
    const tree=Object.values(record?.workspace?.trees ?? {})[0];
    return tree?.nodes?.[0]?.attachments?.length===1;
  },key);await saved(p);
  const knowledge=await raw(p),tree=Object.values(JSON.parse(knowledge).workspace.trees)[0],attachment=tree.nodes[0].attachments[0].id;
  assert.equal(tree.nodes[0].title,"跨会话保存证据");
  assert.equal(tree.nodes[0].note,"退出、切换账号和重启后仍然存在。");
  await settings(p);await account(p,emailA,true);await p.getByRole("button",{name:"退出登录",exact:true}).waitFor();
  assert.equal(await raw(p),knowledge);pass("Configured email registration succeeds without moving or rewriting local knowledge");
  await screenshot(p,"configured-account");
  await p.getByRole("button",{name:"退出登录",exact:true}).click();await p.getByRole("button",{name:"立即使用网页版",exact:true}).waitFor();assert.equal(await raw(p),knowledge);
  await account(p,emailA,false,"Wrong-password-for-regression");await p.locator('.auth-form [role=alert]').waitFor();assert.equal(await raw(p),knowledge);
  await account(p,emailA);await p.getByRole("button",{name:"退出登录",exact:true}).waitFor();assert.equal(await raw(p),knowledge);
  await p.getByRole("button",{name:"退出登录",exact:true}).click();await p.getByRole("button",{name:"立即使用网页版",exact:true}).waitFor();
  await account(p,emailB,true);await p.getByRole("button",{name:"退出登录",exact:true}).waitFor();assert.equal(await raw(p),knowledge);
  pass("F09: logout, rejected password, relogin and second account all preserve the same local space");
  await context.close();context=null;p=null;await stop(accountServer);
  accountServer=await start(base,true);
  ({c:context,page:p}=await browser());await p.goto(accountOrigin,{waitUntil:"networkidle"});await p.getByRole("button",{name:"退出登录",exact:true}).waitFor();assert.equal(await raw(p),knowledge);
  await p.getByRole("button",{name:"退出登录",exact:true}).click();await p.getByRole("button",{name:"立即使用网页版",exact:true}).waitFor();
  await account(p,emailB);await p.getByRole("button",{name:"退出登录",exact:true}).waitFor();assert.equal(await raw(p),knowledge);
  const bytes=await fileText(p,attachment);assert.equal(bytes,"Durable bytes across accounts and restart");
  pass("Actual Chrome and production-server restart retain account credentials, local knowledge and IndexedDB bytes",{workspaceSha256:createHash("sha256").update(knowledge).digest("hex"),attachmentSha256:createHash("sha256").update(bytes).digest("hex")});
  await screenshot(p,"after-restart");await context.close();context=null;p=null;await stop(accountServer);
  await regression("scripts/rc-data-browser.mjs","data",localOrigin);
  await regression("scripts/rc-learning-browser.mjs","learning",localOrigin);
  await stop(localServer);
} catch(error) {results.push({name:"Production acceptance",status:"FAIL",error:error.stack});console.error(error.message);if(p)await screenshot(p,`production-failure-${stamp}`).catch(()=>{});process.exitCode=1;}
finally {if(context)await context.close();for(const child of [...servers])await stop(child);save();}
console.log(JSON.stringify({pass:results.filter(r=>r.status==="PASS").length,fail:results.filter(r=>r.status==="FAIL").length,evidence:`${out}/rc-production-${stamp}.json`}));
