import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { WorkspaceService } from "@/lib/knowledge-tree/service";
import { exportWorkspace, recoveryCandidates } from "@/lib/knowledge-tree/storage";
import { emptyWorkspace } from "@/lib/knowledge-tree/factory";
import { previewImport, type ImportMode, type ImportPreview } from "@/lib/knowledge-tree/import";
import { createBackup, previewBackupRestore, type BackupPreview } from "@/lib/knowledge-tree/backup";
import type { Workspace } from "@/lib/knowledge-tree/types";
import { Modal } from "./modal";
import { BACKUP_TIME_KEY, writePreference } from "@/lib/ui-preferences";
import { userMessage, errorMessage, conflictLabels } from "@/lib/user-messages";
import { dismissPeachBoot } from "./peach-boot";

export function downloadData(name: string, data: string | Uint8Array, type = "application/json") {
  const blob = new Blob([typeof data === "string" ? data : new Uint8Array(data)],{type});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
type Context = { service: WorkspaceService; openImport: (raw: unknown) => void; pickImport: () => void; backup: () => void; };
const DataContext = createContext<Context | null>(null);
export function useDataActions() { const value = useContext(DataContext); if (!value) throw new Error("Missing data boundary"); return value; }
export function useWorkspaceService() { return useDataActions().service; }
export function DataBoundary({children}: {children: ReactNode}) {
  const [service] = useState(()=>new WorkspaceService());
  const state = useSyncExternalStore(service.subscribe,service.getSnapshot,service.getSnapshot);
  const [raw,setRaw] = useState<unknown>(null); const [zip,setZip] = useState<Uint8Array | null>(null);
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(()=>service.start(),[service]);
  useEffect(()=>{ if(state.recovery) dismissPeachBoot(); },[state.recovery]);
  async function backup(rescue=false) {
    setBusy(true); setError("");
    try {
      downloadData(rescue ? "LeoTree-rescue.zip" : "LeoTree-backup.zip",await createBackup(service,rescue),"application/zip");
      if(!rescue && !writePreference(BACKUP_TIME_KEY,new Date().toISOString())) setError("备份已开始下载，但未能记住备份时间。请确认文件已保存。");
    }
    catch(e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const value: Context = {service,openImport:setRaw,pickImport:()=>fileRef.current?.click(),backup:()=>{void backup();}};
  return <DataContext.Provider value={value}>
    <div className={`save-notice state-${state.status.toLowerCase()}`} role="status" aria-live="polite" data-save-state={state.status}>
      <span>{state.status === "SAVED" ? "已保存到本机" : state.status === "SAVING" ? "正在保存… 离开前请等待完成" : state.status === "RECOVERY_REQUIRED" ? "需要恢复：原始数据已保留" : "保存需要处理：本页草稿仍保留"}</span>
      {!["SAVED","SAVING"].includes(state.status) && <>
        <span>{userMessage(state.errorCode)}</span><details className="error-details"><summary>查看排查信息</summary><pre>{state.errorCode} · {state.message}</pre></details>
        <button className="btn" onClick={()=>void service.retry()}>重试保存</button>
        <button className="btn" onClick={()=>downloadData("LeoTree-rescue.json",exportWorkspace(state.workspace))}>导出草稿 JSON</button>
        <button className="btn" disabled={busy} onClick={()=>void backup(true)}>救援 ZIP（含可读取附件）</button>
        {!state.recovery && <button className="btn danger" onClick={()=>{ if(window.confirm("放弃本页未保存的修改并读取本机最新版本？请先导出需要保留的草稿。")) void service.discardDraft(true); }}>放弃草稿并重载</button>}
      </>}
      {busy && <span>正在准备文件…</span>}{error && <span role="alert">{error}</span>}
    </div>
    {state.recovery ? <RecoveryPanel service={service}/> : children}
    <input ref={fileRef} hidden type="file" accept=".json,.zip,application/json,application/zip" onChange={async event=>{
      const file=event.target.files?.[0]; event.target.value=""; if(!file)return;
      setError(""); try { if(file.name.toLowerCase().endsWith(".zip")) setZip(new Uint8Array(await file.arrayBuffer())); else setRaw(JSON.parse(await file.text())); } catch(e) { setError(`导入未写入任何内容：${errorMessage(e)}`); }
    }}/>
    {raw !== null && <ImportDialog raw={raw} onClose={()=>setRaw(null)}/>}
    {zip && <RestoreDialog zip={zip} onClose={()=>setZip(null)}/>}
  </DataContext.Provider>;
}
export function DataTools() {
  const actions=useDataActions();
  return <div className="data-tools"><button className="btn" onClick={actions.backup}>完整备份 ZIP</button><button className="btn" onClick={actions.pickImport}>导入 JSON / 恢复 ZIP</button><small>JSON 不包含附件字节；完整备份请使用 ZIP。</small></div>;
}
function RecoveryPanel({service}:{service:WorkspaceService}) {
  const source=service.getSnapshot().recovery!;
  const [candidate,setCandidate]=useState<Workspace | null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const candidates=recoveryCandidates(service.adapter);
  return <main className="wrap recovery-panel"><h1>先保全知识，再恢复使用</h1>
    <p data-error-code={source.code}>{userMessage(source.code)}</p><details className="error-details"><summary>查看排查信息</summary><pre>{source.code} · {source.message}</pre></details>
    <button className="btn" disabled={source.raw===null} onClick={()=>downloadData("LeoTree-original-source.txt",source.raw!,"text/plain")}>下载原始数据</button>
    <h2>生成恢复副本</h2><p>选择候选内容后会显示预览。只有明确确认，副本才会成为当前知识空间；异常原文另存保留。</p>
    {candidates.map(c=><button className="btn" key={c.key} data-recovery-source={c.key} onClick={()=>{setCandidate(c.workspace!);setConfirmed(false);}}>预览：{c.key.includes("last-good") ? "上次成功保存的副本" : c.key.includes("v3") ? "旧版知识空间" : "早期知识空间"}（{Object.keys(c.workspace!.trees).length} 棵树）</button>)}
    <button className="btn" disabled={source.code==="STORAGE_ERROR"} onClick={()=>{setCandidate(emptyWorkspace());setConfirmed(false);}}>创建空白安全副本</button>
    {candidate && <section><h2>已验证的候选副本</h2><WorkspaceSummary workspace={candidate}/><label className="check-line"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我确认启用此副本，保留异常原文</label><button className="btn primary" disabled={!confirmed} onClick={()=>void service.recover(candidate,true)}>确认启用恢复副本</button></section>}
  </main>;
}
function WorkspaceSummary({workspace}:{workspace:Workspace}) {
  return <ul>{Object.values(workspace.trees).map(t=><li key={t.id}>{t.title} · {t.sections.length} 个分区 · {t.nodes.length} 个节点 · {t.logs.length} 条实践 · {Object.keys(t.reviews).length} 次回顾</li>)}</ul>;
}
function ImportDialog({raw,onClose}:{raw:unknown;onClose:()=>void}) {
  const service=useWorkspaceService(); const [mode,setMode]=useState<ImportMode>("new");
  const [preferIncoming,setPreferIncoming]=useState(false); const [omitAttachments,setOmitAttachments]=useState(false);
  const [preview,setPreview]=useState<ImportPreview | null>(null); const [error,setError]=useState(""); const [saving,setSaving]=useState(false);
  useEffect(()=>{ let gone=false; setPreview(null);setError("");
    void previewImport(service,raw,mode,{preferIncoming,omitAttachments}).then(p=>{if(!gone)setPreview(p);}).catch(e=>{if(!gone)setError(errorMessage(e));});
    return ()=>{gone=true;};
  },[service,raw,mode,preferIncoming,omitAttachments]);
  return <Modal title="导入预览" onClose={onClose}><div className="form">
    <label>导入方式<select value={mode} onChange={e=>{setMode(e.target.value as ImportMode);setPreferIncoming(false);}}><option value="new">作为新知识树导入（默认，独立副本）</option><option value="restore">恢复现有知识树（匹配 Tree ID）</option><option value="merge">合并到现有知识树（匹配 Tree ID）</option></select></label>
    {mode!=="new" && <label className="check-line"><input type="checkbox" checked={preferIncoming} onChange={e=>setPreferIncoming(e.target.checked)}/>冲突时明确采用导入内容，包括较旧的笔记、结构和学习记录{mode==="merge"?"；不勾选则保留本机冲突内容":"（恢复必须勾选）"}</label>}
    <label className="check-line"><input type="checkbox" checked={omitAttachments} onChange={e=>setOmitAttachments(e.target.checked)}/>仅导入知识内容，明确不导入附件。JSON 未携带的字节无法凭空恢复。</label>
    {error && <p role="alert">未写入任何内容：{error}</p>}
    {preview && <><WorkspaceSummary workspace={preview.workspace}/><p>本次略过 {preview.omittedAttachments} 个附件；复制 {preview.files.length} 个附件。确认前不会写入。</p>
      <details open={mode!=="new"}><summary>身份、时间、结构与附件冲突（{preview.conflicts.length}）</summary><ul>{preview.conflicts.map((c,i)=><li key={i}><strong>{conflictLabels[c.kind]}</strong> {c.nodeId} — {c.detail}</li>)}</ul></details>
      <details><summary>查看将导入的完整内容</summary><pre className="data-preview">{exportWorkspace(preview.workspace)}</pre></details>
      <button className="btn primary" disabled={saving} onClick={async()=>{setSaving(true);if(await service.acceptPreview(preview,true))onClose();else setError(userMessage(service.getSnapshot().errorCode));setSaving(false);}}>确认导入</button></>}
  </div></Modal>;
}
function RestoreDialog({zip,onClose}:{zip:Uint8Array;onClose:()=>void}) {
  const service=useWorkspaceService();const [preview,setPreview]=useState<BackupPreview | null>(null);const [error,setError]=useState("");const [confirmed,setConfirmed]=useState(false);const [saving,setSaving]=useState(false);
  useEffect(()=>{let gone=false;void previewBackupRestore(service,zip).then(p=>{if(!gone)setPreview(p);}).catch(e=>{if(!gone)setError(errorMessage(e));});return()=>{gone=true;};},[service,zip]);
  return <Modal title="完整备份恢复预览" onClose={onClose}>{error && <p role="alert">未写入任何内容：{error}</p>}{preview && <>
    <p>备份版本 {preview.manifest.backupVersion} · {preview.manifest.createdAt} · {preview.files.length} 个附件的 SHA-256 已验证。</p><WorkspaceSummary workspace={preview.workspace}/>
    <p>恢复将用上述完整内容替换当前知识空间；当前已保存版本会保留为恢复候选。建议先下载当前空间的完整备份。</p>
    <label className="check-line"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我确认恢复这份完整备份并替换当前知识空间</label>
    <button className="btn primary" disabled={!confirmed || saving} onClick={async()=>{setSaving(true);if(await service.acceptPreview(preview,true))onClose();else setError(userMessage(service.getSnapshot().errorCode));setSaving(false);}}>确认完整恢复</button>
  </>}</Modal>;
}
