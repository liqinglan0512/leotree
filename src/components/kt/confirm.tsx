import { createContext, useContext } from "react";
import { useI18n } from "@/lib/i18n";
import { Modal } from "./modal";

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
    <Modal title={req.title} onClose={onClose}>
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
    </Modal>
  );
}
