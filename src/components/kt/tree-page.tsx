import type { Commit } from "@/lib/knowledge-tree/operations";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderTree, Home, MoreHorizontal, Plus } from "lucide-react";
import { useAsk } from "./confirm";

import { NODE_STATUS_LABEL, NODE_STATUS_MARK } from "@/lib/knowledge-tree/factory";
import { nodeLabel, prioLabel } from "@/lib/knowledge-tree/display";
import { nodeAttachments } from "@/lib/knowledge-tree/files";
import { PrioSeal } from "./prio-seal";
import { NodeFiles } from "./node-files";
import { progressOf } from "@/lib/knowledge-tree/progress";
import {
  ancestorChain,
  childCount,
  childrenOf,
  isRootNode,
  parentIdOf,
  subtreeIds,
  subtreeProgress,
} from "@/lib/knowledge-tree/tree";
import type { KnowledgeNode, KnowledgeTree, Workspace } from "@/lib/knowledge-tree/types";
import { useI18n } from "@/lib/i18n";

function matchesQuery(n: KnowledgeNode, q: string) {
  if (!q) return true;
  return [n.id, n.title, n.hint, n.note].join(" ").toLowerCase().includes(q);
}

function matchesFilters(n: KnowledgeNode, ws: Workspace) {
  if (ws.ui.treeStatus && n.status !== ws.ui.treeStatus) return false;
  if (ws.ui.treePrio !== "" && String(n.priority) !== ws.ui.treePrio) return false;
  return true;
}

export function TreePage({
  ws,
  tree,
  tot,
  commit,
}: {
  ws: Workspace;
  tree: KnowledgeTree;
  tot: { pct: number; done: number; doing: number; todo: number };
  commit: Commit;
}) {
  const ask = useAsk();
  const { t } = useI18n();
  const [pendingDel, setPendingDel] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const q = ws.ui.treeQuery.trim().toLowerCase();
  const focus = tree.nodes.find((n) => n.id === ws.ui.focusNodeId) ?? null;

  useEffect(() => {
    if (!pendingDel) return;
    const t = window.setTimeout(() => setPendingDel(null), 6000);
    return () => window.clearTimeout(t);
  }, [pendingDel]);

  useEffect(() => {
    if (!focus) return;
    document.querySelector(".branch")?.scrollIntoView({ block: "start" });
  }, [focus?.id]);

  const searching = q.length > 0;
  const searchHits = useMemo(() => {
    if (!searching) return [];
    return tree.nodes.filter((n) => matchesQuery(n, q) && matchesFilters(n, ws));
  }, [searching, tree.nodes, q, ws.ui.treeStatus, ws.ui.treePrio]);

  return (
    <>
      {!focus ? (
      <div className="stats">
        <div className="stat"><b>{tot.pct}%</b><span>{t("weighted")}</span></div>
        <div className="stat"><b>{tot.done}</b><span>{t("mastered")}</span></div>
        <div className="stat"><b>{tot.doing}</b><span>{t("learning")}</span></div>
        <div className="stat"><b>{tot.todo}</b><span>{t("notStarted")}</span></div>
      </div>
      ) : null}
      <Crumbs tree={tree} focus={focus} ws={ws} commit={commit} onOpenOutline={() => setOutlineOpen(true)} />
      <div className="tree-work">
        <Outline
          tree={tree}
          ws={ws}
          commit={commit}
          mobileOpen={outlineOpen}
          onClose={() => setOutlineOpen(false)}
        />
        <div className="tree-main">
          <div className="filters">
            <input
              className="search"
              placeholder={t("searchTree")}
              value={ws.ui.treeQuery}
              onChange={(e) => commit("patchUi", { treeQuery: e.target.value })}
            />
            {!focus ? (
              <>
                <div className="filter-row">
                  {([["", t("allStatus")], ["todo", t("stTodo")], ["doing", t("stDoing")], ["done", t("stDone")]] as const).map(([v, l]) => (
                    <button key={v || "all-st"} type="button" className={`chip ${ws.ui.treeStatus === v ? "on" : ""}`} onClick={() => commit("patchUi", { treeStatus: v })}>{l}</button>
                  ))}
                </div>
                <div className="filter-row">
                  {([["", t("allPrio")], ["0", t("p0")], ["1", t("p1")], ["2", t("p2")], ["3", t("p3")]] as const).map(([v, l]) => (
                    <button key={v || "all-p"} type="button" className={`chip ${ws.ui.treePrio === v ? "on" : ""}`} onClick={() => commit("patchUi", { treePrio: v })}>{l}</button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          {searching ? (
            <SearchResults hits={searchHits} tree={tree} ws={ws} commit={commit} pendingDel={pendingDel} setPendingDel={setPendingDel} />
          ) : focus ? (
            <BranchView
              node={focus}
              tree={tree}
              ws={ws}
              commit={commit}
              pendingDel={pendingDel}
              setPendingDel={setPendingDel}
            />
          ) : (
            <RootView
              tree={tree}
              ws={ws}
              commit={commit}
              pendingDel={pendingDel}
              setPendingDel={setPendingDel}
              ask={ask}
            />
          )}
        </div>
      </div>
    </>
  );
}

function Crumbs({
  tree,
  focus,
  ws,
  commit,
  onOpenOutline,
}: {
  tree: KnowledgeTree;
  focus: KnowledgeNode | null;
  ws: Workspace;
  commit: Commit;
  onOpenOutline: () => void;
}) {
  const chain = focus ? ancestorChain(tree.nodes, focus.id) : [];
  const section = focus ? tree.sections.find((s) => s.id === focus.sectionId) : null;
  const goRoot = () => commit("focusNode", null);
  const { t } = useI18n();
  return (
    <nav className="crumbs" aria-label="路径">
      <button type="button" className="crumb-outline" onClick={onOpenOutline} aria-label={t("outline")}>
        <FolderTree size={16} strokeWidth={1.8} />
        {t("outline")}
      </button>
      <button type="button" onClick={goRoot}>
        <Home size={14} strokeWidth={1.8} />
        LEO TREE
      </button>
      <span className="crumb-sep" aria-hidden="true">/</span>
      {focus ? (
        <button type="button" onClick={goRoot}>{tree.title || t("untitled")}</button>
      ) : (
        <span className="here">{tree.title || t("untitled")}</span>
      )}
      {section && focus ? (
        <>
          <span className="crumb-sep" aria-hidden="true">/</span>
          <button type="button" onClick={goRoot}>{section.title}</button>
        </>
      ) : null}
      {chain.map((n, i) => (
        <span key={n.id} className="crumb-node">
          <span className="crumb-sep" aria-hidden="true">/</span>
          {i === chain.length - 1 ? (
            <span className="here">{nodeLabel(n)}</span>
          ) : (
            <button type="button" onClick={() => commit("focusNode", n.id)}>{nodeLabel(n)}</button>
          )}
        </span>
      ))}
    </nav>
  );
}

function Outline({
  tree,
  ws,
  commit,
  mobileOpen,
  onClose,
}: {
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const focus = ws.ui.focusNodeId;
  const { t } = useI18n();
  const path = new Set(focus ? ancestorChain(tree.nodes, focus).map((n) => n.id) : []);
  const sections = tree.sections.slice().sort((a, b) => a.order - b.order);

  function opened(id: string, fallback: boolean) {
    if (ws.ui.outlineOpen[id] !== undefined) return ws.ui.outlineOpen[id];
    return fallback;
  }
  function toggle(id: string, fallback: boolean) {
    commit("patchUi", { outlineOpen: { ...ws.ui.outlineOpen, [id]: !opened(id, fallback) } });
  }
  function pick(id: string | null) {
    commit("focusNode", id);
    onClose();
  }

  function renderNode(n: KnowledgeNode, depth: number) {
    const kids = childrenOf(tree.nodes, n.id);
    const on = opened(n.id, path.has(n.id));
    const current = focus === n.id;
    return (
      <div key={n.id} className="ol-block">
        <div className={`ol-row ${current ? "current" : ""}`} style={{ paddingLeft: 8 + depth * 12 }}>
          {kids.length ? (
            <button type="button" className="ol-twist" aria-label={on ? "收起" : "展开"} onClick={() => toggle(n.id, path.has(n.id))}>
              {on ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="ol-twist ghost" />
          )}
          <button type="button" className="ol-label" onClick={() => pick(n.id)}>
            <span className={`ol-mark ${n.status}`}>{NODE_STATUS_MARK[n.status]}</span>
            <span className="ol-title">{nodeLabel(n)}</span>
            {kids.length ? <span className="ol-count">{kids.length}</span> : null}
          </button>
        </div>
        {on && kids.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  function renderOutline() {
    return (
    <aside className="outline" aria-label={t("outline")}>
      <div className="outline-hd">
        <strong>{t("outline")}</strong>
        <button type="button" className="btn ghost outline-root" onClick={() => pick(null)}>{t("outlineRoot")}</button>
      </div>
      {sections.map((sec) => {
        const roots = childrenOf(
          tree.nodes.filter((n) => n.sectionId === sec.id),
          null,
        );
        const on = opened(`sec:${sec.id}`, true);
        return (
          <div key={sec.id} className="ol-block">
            <div className="ol-row sec" style={{ paddingLeft: 8 }}>
              <button type="button" className="ol-twist" aria-label={on ? "收起分区" : "展开分区"} onClick={() => toggle(`sec:${sec.id}`, true)}>
                {on ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <button type="button" className="ol-label" onClick={() => pick(null)}>
                <span className="ol-title serif">{sec.title}</span>
                <span className="ol-count">{roots.length}</span>
              </button>
            </div>
            {on && roots.map((n) => renderNode(n, 1))}
          </div>
        );
      })}
    </aside>
    );
  }

  return (
    <>
      <div className="outline-desktop">{renderOutline()}</div>
      {mobileOpen ? (
        <div className="modal-back outline-back" onClick={onClose}>
          <div className="outline-sheet" onClick={(e) => e.stopPropagation()}>
            {renderOutline()}
          </div>
        </div>
      ) : null}
    </>
  );
}

function RootView({
  tree,
  ws,
  commit,
  pendingDel,
  setPendingDel,
  ask,
}: {
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  pendingDel: string | null;
  setPendingDel: (id: string | null) => void;
  ask: ReturnType<typeof useAsk>;
}) {
  return (
    <>
      {ws.ui.editing && (
        <div className="hero-actions" style={{ justifyContent: "flex-start", marginBottom: 12 }}>
          <button className="btn" onClick={() => commit("addSection")}>新增分区</button>
        </div>
      )}
      {tree.sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((sec) => {
          const roots = childrenOf(
            tree.nodes.filter((n) => n.sectionId === sec.id),
            null,
          ).filter((n) => matchesFilters(n, ws));
          const allInSec = tree.nodes.filter((n) => n.sectionId === sec.id);
          const p = progressOf(allInSec);
          if (!ws.ui.editing && !roots.length && (ws.ui.treeStatus || ws.ui.treePrio)) return null;
          return (
            <section className="section" key={sec.id}>
              <div className="section-hd">
                <h2>{sec.title}</h2>
                <div className="meta">{p.done}/{allInSec.length} 掌握 · 加权 {p.pct}%</div>
              </div>
              {ws.ui.editing ? (
                <div className="form" style={{ marginBottom: 10 }}>
                  <div className="form-grid">
                    <label>分区名称 <input value={sec.title} onChange={(e) => commit("patchSection", sec.id, { title: e.target.value })} /></label>
                    <label>分区说明 <input value={sec.description} onChange={(e) => commit("patchSection", sec.id, { description: e.target.value })} /></label>
                  </div>
                  <div className="edit-row">
                    <button className="btn" onClick={() => commit("moveSection", sec.id, -1)}>上移</button>
                    <button className="btn" onClick={() => commit("moveSection", sec.id, 1)}>下移</button>
                    <button className="btn danger" onClick={() => {
                      ask({
                        title: `删除分区「${sec.title}」？`,
                        body: "该分区下的全部节点都会一起删除，无法撤销。",
                        onConfirm: () => commit("deleteSection", sec.id),
                      });
                    }}>删除分区</button>
                  </div>
                </div>
              ) : (
                sec.description ? <p className="brief">{sec.description}</p> : null
              )}
              <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
              {roots.map((n) => (
                <NodeCard
                  key={n.id}
                  n={n}
                  tree={tree}
                  ws={ws}
                  commit={commit}
                  pendingDel={pendingDel}
                  setPendingDel={setPendingDel}
                />
              ))}
              <button type="button" className="btn add-child" onClick={() => commit("addNode", sec.id)}>
                <Plus size={15} strokeWidth={1.8} />
                在此分区新增节点
              </button>
            </section>
          );
        })}
    </>
  );
}

function BranchView({
  node,
  tree,
  ws,
  commit,
  pendingDel,
  setPendingDel,
}: {
  node: KnowledgeNode;
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  pendingDel: string | null;
  setPendingDel: (id: string | null) => void;
}) {
  const kids = childrenOf(tree.nodes, node.id).filter((n) => matchesFilters(n, ws));
  const allKids = childrenOf(tree.nodes, node.id);
  const sub = subtreeProgress(tree.nodes, node.id);
  const rel = tree.logs.filter((l) => l.linkedNodeIds.includes(node.id));
  const { t } = useI18n();

  return (
    <section className="branch">
      <article className={`item branch-head p${node.priority} open`}>
        <button
          className={`mark ${node.status}`}
          title={NODE_STATUS_LABEL[node.status]}
          onClick={() => commit("cycleNodeStatus", node.id)}
        >
          {NODE_STATUS_MARK[node.status]}
        </button>
        <div className="item-body">
          <p className="branch-kicker">{t("thisBranch")}</p>
          <h2 className="branch-title">
            <PrioSeal priority={node.priority} />
            <input
              value={node.title}
              onChange={(e) => commit("patchNode", node.id, { title: e.target.value })}
              aria-label={t("name")}
            />
          </h2>
          <input
            className="hint-input"
            value={node.hint}
            placeholder={t("hintEmpty")}
            onChange={(e) => commit("patchNode", node.id, { hint: e.target.value })}
            aria-label={t("intro")}
          />
          <p className="branch-meta">
            {allKids.length} {t("childNodes")} · {sub.done}/{sub.done + sub.doing + sub.todo} {t("masteredShort")} · {sub.pct}%
          </p>
          <div className="filter-row" style={{ marginTop: 8 }}>
            {([0, 1, 2, 3] as const).map((p0) => (
              <button key={p0} type="button" className={`chip ${node.priority === p0 ? "on" : ""}`} onClick={() => commit("patchNode", node.id, { priority: p0 })}>
                {prioLabel(p0)}
              </button>
            ))}
          </div>
        </div>
        <div className="item-side">
          <StructureMenu node={node} tree={tree} ws={ws} commit={commit} pendingDel={pendingDel} setPendingDel={setPendingDel} />
        </div>
        <div className="note">
          <label>
            {t("branchNote")}
            <textarea
              value={node.note}
              placeholder={t("branchNoteHint")}
              onChange={(e) => commit("patchNode", node.id, { note: e.target.value })}
            />
          </label>
          <div className="links">
            {rel.length
              ? <>{t("relatedLogs")}{rel.map((l) => (
                <button key={l.id} type="button" onClick={() => commit("patchUi", { tab: "log", expandedLogs: { ...ws.ui.expandedLogs, [l.id]: true }, scrollLogId: l.id })}>{l.title || t("untitledLog")}</button>
              ))}</>
              : <span>{t("noLinkedLogs")}</span>}
          </div>
          <NodeFiles
            files={nodeAttachments(node)}
            treeId={tree.id} nodeId={node.id}
          />
        </div>
      </article>
      <div className="section-hd" style={{ marginTop: 18 }}>
        <h2>{t("childNodesTitle")}</h2>
        <div className="meta">{t("unlimitedDepth")}</div>
      </div>
      {kids.length ? kids.map((n) => (
        <NodeCard
          key={n.id}
          n={n}
          tree={tree}
          ws={ws}
          commit={commit}
          pendingDel={pendingDel}
          setPendingDel={setPendingDel}
        />
      )) : (
        <p className="empty">{t("noChildren")}</p>
      )}
      <button type="button" className="btn primary add-child" onClick={() => commit("addNode", node.sectionId, node.id)}>
        <Plus size={15} strokeWidth={1.8} />
        {t("addChildHere")}
      </button>
    </section>
  );
}

function SearchResults({
  hits,
  tree,
  ws,
  commit,
  pendingDel,
  setPendingDel,
}: {
  hits: KnowledgeNode[];
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  pendingDel: string | null;
  setPendingDel: (id: string | null) => void;
}) {
  if (!hits.length) return <p className="empty">没有匹配的节点。试试别的词，或清空搜索回到树根。</p>;
  return (
    <section className="section">
      <div className="section-hd">
        <h2>全树搜索</h2>
        <div className="meta">{hits.length} 条</div>
      </div>
      {hits.map((n) => {
        const path = ancestorChain(tree.nodes, n.id).slice(0, -1).map(nodeLabel).join(" / ");
        return (
          <div key={n.id}>
            {path ? <p className="search-path">{path}</p> : null}
            <NodeCard n={n} tree={tree} ws={ws} commit={commit} pendingDel={pendingDel} setPendingDel={setPendingDel} />
          </div>
        );
      })}
    </section>
  );
}

function NodeCard({
  n,
  tree,
  ws,
  commit,
  pendingDel,
  setPendingDel,
}: {
  n: KnowledgeNode;
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  pendingDel: string | null;
  setPendingDel: (id: string | null) => void;
}) {
  const kids = childCount(tree.nodes, n.id);
  const sub = kids ? subtreeProgress(tree.nodes, n.id) : null;
  const enter = () => commit("focusNode", n.id);
  const { t } = useI18n();
  const files = nodeAttachments(n);
  return (
    <article className={`item p${n.priority}`}>
      <button
        className={`mark ${n.status}`}
        title={NODE_STATUS_LABEL[n.status]}
        onClick={() => commit("cycleNodeStatus", n.id)}
      >
        {NODE_STATUS_MARK[n.status]}
      </button>
      <div className="item-body">
        <h3>
          <PrioSeal priority={n.priority} />
          <button type="button" className="node-enter" onClick={enter}>
            {nodeLabel(n)}
          </button>
        </h3>
        {n.hint ? <p className="hint">{n.hint}</p> : null}
        {kids ? <p className="branch-meta">{kids} {t("twigs")} · {sub!.pct}%</p> : <p className="branch-meta faint">{t("canBranch")}</p>}
        {files.length ? <p className="attach-count">{t("attachCount", { n: files.length })}</p> : null}
      </div>
      <div className="item-side">
        <button type="button" className="btn node-enter-btn" onClick={enter}>
          {t("enter")}
          <ChevronRight size={15} strokeWidth={1.8} />
        </button>
        <StructureMenu node={n} tree={tree} ws={ws} commit={commit} pendingDel={pendingDel} setPendingDel={setPendingDel} />
      </div>
    </article>
  );
}

function StructureMenu({
  node,
  tree,
  ws,
  commit,
  pendingDel,
  setPendingDel,
}: {
  node: KnowledgeNode;
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  pendingDel: string | null;
  setPendingDel: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const parent = node.parentId ? tree.nodes.find((n) => n.id === node.parentId) : null;
  const desc = subtreeIds(tree.nodes, node.id).length - 1;
  const armed = pendingDel === node.id;

  return (
    <div className="struct-menu">
      <button
        type="button"
        className="btn ghost struct-toggle"
        aria-label={t("structure")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="struct-sheet" role="menu">
          <p className="struct-kicker">{t("structure")}</p>
          <select
            value={node.sectionId}
            aria-label={t("moveToSection")}
            onChange={(e) => {
              commit("moveNodeToSection", node.id, e.target.value);
              setOpen(false);
            }}
          >
            {tree.sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => commit("moveNode", node.id, -1)}>{t("moveUp")}</button>
          <button type="button" className="btn" onClick={() => commit("moveNode", node.id, 1)}>{t("moveDown")}</button>
          {parent ? (
            <button type="button" className="btn" onClick={() => commit("setNodeParent", node.id, parentIdOf(parent))}>{t("moveUpLevel")}</button>
          ) : null}
          {!isRootNode(node) ? (
            <button type="button" className="btn" onClick={() => commit("setNodeParent", node.id, null)}>{t("promoteRoot")}</button>
          ) : null}
          {armed ? (
            <div className="node-del-arm">
              <button type="button" className="btn ghost" onClick={() => setPendingDel(null)}>{t("cancel")}</button>
              <button
                type="button"
                className="btn danger solid"
                onClick={() => {
                  commit("deleteNode", node.id);
                  setPendingDel(null);
                  setOpen(false);
                }}
              >
                {t("confirmDelete")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn danger"
              onClick={() => setPendingDel(node.id)}
            >
              {t("deleteBranch")}
              {desc > 0 ? ` · ${desc}` : ""}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
