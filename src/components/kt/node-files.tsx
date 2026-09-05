import { useWorkspaceService } from "./data-boundary";
import { useEffect, useRef, useState } from "react";
import { userMessage } from "@/lib/user-messages";
import { Trash2 } from "lucide-react";
import {
  formatSize,
  getBlob,
  type NodeAttachment,
} from "@/lib/knowledge-tree/files";
import { useI18n } from "@/lib/i18n";

const ACCEPT = ".png,.md,.pdf,.docx,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown";

export function NodeFiles({
  files,
  treeId, nodeId,
}: {
  files: NodeAttachment[];
  treeId: string; nodeId: string;
}) {
  const { t } = useI18n();
  const service = useWorkspaceService();
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function onPick(list: FileList | null) {
    if (!list?.length || busy) return;
    setErr(""); setBusy(true);
    const ok = await service.addFiles(treeId,nodeId,Array.from(list));
    if (!ok) {
      const state = service.getSnapshot();
      setErr(state.errorCode === "FILE_TOO_LARGE" ? t("fileTooBig") : state.errorCode === "FILE_UNSUPPORTED" ? t("fileTypeDenied") : `附件未保存：${userMessage(state.errorCode)}`);
    }
    setBusy(false); if(inputRef.current) inputRef.current.value="";
  }
  function remove(id: string) { service.removeFile(treeId,nodeId,id); }

  return (
    <div className="node-files">
      <div
        className={`file-tray ${over ? "over" : ""} ${busy ? "busy" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void onPick(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <span className="file-tray-mark" aria-hidden="true" />
        <span className="file-tray-copy">
          <span className="file-tray-kicker">{t("attachments")}</span>
          <span className="file-tray-cta">{files.length ? t("addMoreFiles") : t("dropFiles")}</span>
        </span>
        {files.length ? (
          <ul className="file-list" onClick={(e) => e.stopPropagation()}>
            {files.map((f) => (
              <FileRow key={f.id} file={f} onRemove={() => void remove(f.id)} />
            ))}
          </ul>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={ACCEPT}
          onChange={(e) => void onPick(e.target.files)}
        />
      </div>
      <p className="file-tray-hint">{t("fileHint")}</p>
      {err ? <p className="file-tray-err">{err}</p> : null}
    </div>
  );
}

function FileRow({ file, onRemove }: { file: NodeAttachment; onRemove: () => void }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    let objectUrl: string | null = null;
    void getBlob(file.id).then((blob) => {
      if (gone || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!gone) setUrl(null); });
    return () => {
      gone = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id]);

  return (
    <li className={`file-row kind-${file.kind}`}>
      {file.kind === "png" && url ? <img src={url} alt="" className="file-thumb" /> : <span className="file-kind">{file.kind}</span>}
      <div>
        {url ? (
          <a href={url} download={file.name} target="_blank" rel="noreferrer">
            {file.name}
          </a>
        ) : (
          <span>{file.name}</span>
        )}
        <small>
          {file.kind.toUpperCase()} · {formatSize(file.size)}
        </small>
      </div>
      <button type="button" className="btn ghost" onClick={onRemove} aria-label={t("delete")}>
        <Trash2 size={14} strokeWidth={1.8} />
      </button>
    </li>
  );
}
