import { useEffect, useId, useRef, type ReactNode } from "react";
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null); const label = useId();
  useEffect(() => {
    const element = dialog.current!; const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); if (previous?.isConnected) previous.focus(); };
  },[]);
  return <dialog ref={dialog} className="native-modal" aria-labelledby={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); event.preventDefault(); onClose(); } }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-body">
      <div className="modal-heading"><h2 id={label}>{title}</h2><button type="button" className="btn" onClick={onClose} aria-label="关闭对话框">关闭</button></div>
      {children}
    </div>
  </dialog>;
}
