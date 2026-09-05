const messages: Record<string,string> = {
  SAVE_FAILED:"这次修改还没保存。内容仍留在本页，请重试，或先下载草稿再离开。",
  QUOTA_EXCEEDED:"当前浏览器的可用空间不足。请先下载草稿和附件，再释放设备空间后重试。",
  STORAGE_ERROR:"暂时无法读写当前浏览器的存储。请先保留草稿，并检查网站的存储权限。",
  COORDINATION_UNAVAILABLE:"当前浏览器或打开方式不支持安全保存。请使用最新版浏览器打开 HTTPS 网站；已有草稿可以先下载。",
  CLEANUP_DEFERRED:"知识已经保存，旧附件的清理暂未完成。你可以继续使用，稍后重试清理。",
  CONFLICT:"其他页面已修改了这份内容。你的草稿仍在，请先下载保留，再读取最新内容核对。",
  RECOVERY_REQUIRED:"暂时无法打开这份知识。原始内容没有被替换，请先保留一份，再选择恢复副本。",
  PARSE_ERROR:"这份数据暂时读不出来，可能不完整。原始内容仍然保留。",
  UNSUPPORTED_VERSION:"这份数据来自暂不支持的版本。请保留原件，使用对应版本打开或导入兼容的备份。",
  SCHEMA_INVALID:"这份文件缺少必要的知识内容，暂时不能使用。请检查是否选对了导出文件。",
  RELATION_INVALID:"这份数据的节点关系不完整，暂时不能安全打开。请保留原件，尝试另一份完整备份。",
  CONFIRMATION_REQUIRED:"恢复前需要明确选择采用导入内容。请先查看差异，再勾选确认。",
  ATTACHMENTS_REQUIRED:"这份 JSON 没有携带附件文件。请使用完整 ZIP，或明确选择只导入知识内容。",
  FILE_MISSING:"有附件暂时无法读取。请保留当前内容，尝试原设备上的完整备份。",
  FILE_UNSUPPORTED:"暂不支持这个文件。请使用 PNG、Markdown、PDF 或 DOCX。",
  FILE_TOO_LARGE:"这个附件超过 10MB，请缩小文件后重试。",
};
export function userMessage(code: string | null | undefined): string {
  return messages[code ?? ""] ?? "这次操作暂未完成。已有知识仍保留，请先下载需要保留的草稿，再重试。";
}
export function errorMessage(error: unknown): string {
  if(error instanceof SyntaxError) return userMessage("PARSE_ERROR");
  return userMessage(error && typeof error === "object" && "code" in error ? String(error.code) : null);
}
export const conflictLabels: Record<string,string> = {"same-tree":"同一棵树","same-node":"同一个节点",newer:"导入内容较新或不同",older:"导入内容较旧",structure:"结构不同",attachment:"附件不同"};
