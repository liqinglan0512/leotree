import { useState } from "react";
import { progressOf } from "@/lib/knowledge-tree/progress";
import { TEMPLATES } from "@/lib/knowledge-tree/templates";
import type { KnowledgeTree, Workspace } from "@/lib/knowledge-tree/types";
import { useI18n } from "@/lib/i18n";

const ARTS = ["/theme/mei.jpg", "/theme/lan.jpg", "/theme/zhu.jpg", "/theme/ju.jpg", "/theme/gardens/g01.jpg", "/theme/gardens/g05.jpg"];

export function GrovePage({
  ws,
  onOpen,
  onNewBlank,
  onFromTemplate,
  onImport,
}: {
  ws: Workspace;
  onOpen: (id: string) => void;
  onNewBlank: () => void;
  onFromTemplate: (id: string) => void;
  onImport: () => void;
}) {
  const { t } = useI18n();
  const [tplOpen, setTplOpen] = useState(false);
  const trees = Object.values(ws.trees);
  const templates = TEMPLATES.filter((tpl) => tpl.id !== "blank");
  return (
    <div className="grove">
      <div className="flora flora-page" aria-hidden="true" />
      <div className="flora flora-sw" aria-hidden="true" />
      <header className="hero">
        <div>
          <p className="brand-mark">LEO TREE</p>
          <h1 className="serif">{t("myGrove")}</h1>
          <p>{t("groveBrief")}</p>
          <div className="hero-wave" aria-hidden="true" />
        </div>
      </header>
      <div className="hero-actions grove-cta">
        <button type="button" className="btn primary" onClick={onNewBlank}>
          {t("newBlank")}
        </button>
        <button type="button" className="btn" onClick={() => setTplOpen(true)}>
          {t("fromTemplateStart")}
        </button>
        <button type="button" className="btn" onClick={onImport}>
          {t("import")}
        </button>
      </div>
      {trees.length ? (
        <div className="grove-grid">
          {trees.map((tree, i) => (
            <GroveCard key={tree.id} tree={tree} art={ARTS[i % ARTS.length]} current={ws.currentTreeId === tree.id} onOpen={() => onOpen(tree.id)} />
          ))}
        </div>
      ) : (
        <p className="empty">{t("groveEmpty")}</p>
      )}
      {tplOpen ? (
        <div className="modal-back" onClick={() => setTplOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("fromTemplateStart")}</h2>
            <ul className="tpl-list">
              {templates.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    type="button"
                    className="tpl-pick"
                    onClick={() => {
                      onFromTemplate(tpl.id);
                      setTplOpen(false);
                    }}
                  >
                    <strong>{tpl.title}</strong>
                    <small>{tpl.id === "snn-calibration" ? t("snnTemplateBlurb") : tpl.description}</small>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn ghost" onClick={() => setTplOpen(false)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GroveCard({
  tree,
  art,
  current,
  onOpen,
}: {
  tree: KnowledgeTree;
  art: string;
  current: boolean;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const tot = progressOf(tree.nodes);
  return (
    <button type="button" className={`grove-card ${current ? "current" : ""}`} onClick={onOpen}>
      <span className="grove-art" style={{ backgroundImage: `url(${art})` }} />
      <span className="grove-copy">
        <strong>{tree.title || t("untitled")}</strong>
        <small>
          {t("nodesCount", { n: tree.nodes.length })} · {tot.pct}%
        </small>
      </span>
    </button>
  );
}
