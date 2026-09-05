import { createContext, useContext } from "react";
import { useI18n } from "@/lib/i18n";

export type ConfirmRequest = {
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export const ConfirmCtx = createContext<(req: ConfirmRequest) => void>(() => {});

export function useAsk() {
  return useContext(ConfirmCtx);
}

export function ConfirmModal({ req, onClose }: { req: ConfirmRequest | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!req) return null;
  return (
    <div
      className="modal-back"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title">{req.title}</h2>
        {req.body ? <p className="brief">{req.body}</p> : null}
        <div className="hero-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn danger solid"
            onClick={() => {
              req.onConfirm();
              onClose();
            }}
          >
            {req.confirmLabel || t("confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
