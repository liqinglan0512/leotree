import { useState } from "react";
import { APP_VERSION } from "@/lib/product-contract";
import { BACKUP_TIME_KEY, backupAge, usePreference } from "@/lib/ui-preferences";
import { Modal } from "./modal";
export function EssentialInfo() {
  return <section className="settings-block essential-info"><h3>开始前，记住这四件事</h3><ul>
    <li><strong>知识留在当前浏览器。</strong>换设备或清除网站数据前，请下载完整备份。</li>
    <li><strong>登录不等于云同步。</strong>同一浏览器换账号，仍是同一个本机空间。</li>
    <li><strong>要带走附件，请用完整 ZIP。</strong>JSON 只有知识与附件说明；完整备份可以恢复实际文件。</li>
    <li><strong>副本独立，重置不删笔记。</strong>复制树会复制附件；重置学习状态保留知识、实践与历史。</li>
  </ul></section>;
}
export function BackupRecency() {
  const at=usePreference(BACKUP_TIME_KEY);
  return <section className="settings-block backup-recency"><h3>备份提醒</h3><p data-backup-recency="true">上次完整备份：<strong>{backupAge(at)}</strong></p><p className="brief">这里记录成功生成并开始下载的时间。请确认 ZIP 已保存在设备上；JSON 导出和救援文件不计入。</p></section>;
}
export function FeedbackEntry() {
  const [open,setOpen]=useState(false),[copied,setCopied]=useState("");
  const configured=String(import.meta.env.VITE_FEEDBACK_URL ?? "");
  let url="";try {const parsed=new URL(configured);if(parsed.protocol==="https:")url=parsed.href;}catch { /* Link is intentionally deferred until supplied. */ }
  if(url)return <a className="btn" href={url} target="_blank" rel="noreferrer">反馈问题</a>;
  return <><button className="btn" onClick={()=>setOpen(true)}>反馈问题</button>{open && <Modal title="反馈问题" onClose={()=>setOpen(false)}><p>反馈渠道正在准备。遇到问题时，可以先记下操作步骤，稍后通过邀请你使用的渠道告诉我们。</p><p className="brief">此处暂不会发送任何内容。请不要发送密码或私人知识。</p><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(`Leo Tree ${APP_VERSION}\n问题描述：\n操作步骤：\n预期结果：\n实际结果：`);setCopied("已复制，可以粘贴后补充。");}catch{setCopied("未能复制，请手动记下操作步骤。");}}}>复制反馈提纲</button><p role="status">{copied}</p></Modal>}</>;
}
