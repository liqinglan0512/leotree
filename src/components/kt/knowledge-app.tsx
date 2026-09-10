import type { Commit } from "@/lib/knowledge-tree/operations";
import { DataBoundary, DataTools, useDataActions, useWorkspaceService, downloadData } from "./data-boundary";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CustomFields } from "./custom-fields";
import { MathEditor } from "./math";
import { ConfirmCtx, ConfirmModal, useAsk, type ConfirmRequest } from "./confirm";
import { TreePage } from "./tree-page";
import { Modal } from "./modal";
import { dismissPeachBoot } from "./peach-boot";
import { SettingsPage } from "./settings";
import { InkDock, type ShellTab } from "./dock";
import { CommunityPreview } from "./community-preview";
import { GrovePage } from "./grove";
import { GatePage } from "./gate-page";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { enterGuest, leaveGuest, readGuest } from "@/lib/guest";
import { currentTree } from "@/lib/knowledge-tree/engine";
import { emptyReview, LOG_STATUS_LABEL, NODE_STATUS_MARK } from "@/lib/knowledge-tree/factory";
import {
  exportTree,
  exportWorkspace,
  filenameForTree,
} from "@/lib/knowledge-tree/storage";
import { buildWeekDraft, doneIncrement, yearWindow, progressOf, weekSummary } from "@/lib/knowledge-tree/progress";
import { addDays, fmtDay, weekBounds, weekIdFromDate } from "@/lib/knowledge-tree/dates";
import { getRuntime, getTemplate, TEMPLATES } from "@/lib/knowledge-tree/templates";
import { nodeLabel } from "@/lib/knowledge-tree/display";
import { treeLogFields, treeReviewFields } from "@/lib/knowledge-tree/fields";
import type { KnowledgeTree, LogStatus, PracticeLog, Workspace } from "@/lib/knowledge-tree/types";

import { Welcome, type StartChoice } from "./welcome";
import { NewTreeDialog, TemplateDialog } from "./new-tree-dialog";
import { INTRO_KEY, LOCAL_HINT_KEY, readPreference, writePreference } from "@/lib/ui-preferences";
import { createTreeFromDraft } from "@/lib/create-tree-draft";

const download = downloadData;

function snippet(s: string, n: number) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

export function KnowledgeApp() {
  return (
    <I18nProvider>
      <DataBoundary><KnowledgeShell /></DataBoundary>
    </I18nProvider>
  );
}

function KnowledgeShell() {
  const { t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  const service = useWorkspaceService();
  const { pickImport } = useDataActions();
  const workspaceState = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
  const { workspace: ws } = workspaceState;
  const [introDone,setIntroDone] = useState(() => readPreference(INTRO_KEY) === "done");
  const [creation,setCreation] = useState<{templateId?:string} | null>(null);
  const [templateOpen,setTemplateOpen] = useState(false);
  const [localHint,setLocalHint] = useState(false);
  const initiallyEmpty = useRef(Object.keys(ws.trees).length === 0);
  useEffect(() => {
    if(initiallyEmpty.current && Object.keys(ws.trees).length > 0 && workspaceState.status === "SAVED") {
      initiallyEmpty.current = false;
      if(readPreference(LOCAL_HINT_KEY) !== "shown") {setLocalHint(true);writePreference(LOCAL_HINT_KEY,"shown");}
    }
  },[ws.trees,workspaceState.status]);
  const commit = useMemo(() => service.bind(ws), [service,ws]);
  const [toast, setToast] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameDesc, setRenameDesc] = useState("");
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [guest, setGuest] = useState(() => readGuest());
  const [groveOpen, setGroveOpen] = useState(true);
  const [shell, setShell] = useState<ShellTab>(() => {
    if (typeof window === "undefined") return "mine";
    try {
      const s = window.localStorage.getItem("leo-shell-tab-v1");
      if (s === "mine" || s === "community" || s === "settings") return s;
    } catch {
      /* ignore */
    }
    return "mine";
  });
  const ask = (req: ConfirmRequest) => setConfirmReq(req);
  useEffect(() => {
    if(new URLSearchParams(window.location.search).get("start") === "web") {
      writePreference(INTRO_KEY,"done");setIntroDone(true);enterGuest();setGuest(true);
      setShell("mine");setGroveOpen(true);writePreference("leo-shell-tab-v1","mine");
    }
  },[]);
  function startUsing(choice:StartChoice) {
    writePreference(INTRO_KEY,"done");setIntroDone(true);enterGuest();setGuest(true);changeShell("mine");
    if(choice === "blank")setCreation({});
    if(choice === "template")setTemplateOpen(true);
    if(choice === "import")pickImport();
  }

  useEffect(() => {
    if (!isPending) dismissPeachBoot();
  }, [isPending]);

  useEffect(() => {
    if (user) {
      leaveGuest();
      setGuest(false);
    }
  }, [user]);

  function changeShell(next: ShellTab) {
    setShell(next);
    try {
      window.localStorage.setItem("leo-shell-tab-v1", next);
    } catch {
      /* ignore */
    }
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  }

  const tree = currentTree(ws);
  const tpl = getTemplate(tree?.templateId);

  function openGrove() {
    setGroveOpen(true);
  }
  function openTree(id: string) {
    commit("setCurrentTree", id);
    setGroveOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ws.ui.switcherOpen) {
        commit("patchUi", { switcherOpen: false });
        return;
      }
      if (ws.ui.focusNodeId) commit("focusParent");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ws, commit]);

  if (isPending) return null;

  if (!user && !guest && !introDone && !Object.keys(ws.trees).length) return <Welcome onStart={startUsing}/>;

  if (!user && !guest) {
    return (
      <GatePage
        onGuest={() => {
          enterGuest();
          setGuest(true);
        }}
      />
    );
  }

  const creationUi = <>
    {creation && <NewTreeDialog templateId={creation.templateId} onClose={()=>setCreation(null)} onEnter={(title,description)=>{
      if(createTreeFromDraft(service,title,description,creation.templateId)) {setCreation(null);setGroveOpen(false);}
    }}/>}
    {templateOpen && <TemplateDialog onClose={()=>setTemplateOpen(false)} onPick={id=>{setTemplateOpen(false);setCreation({templateId:id});}}/>}
    {localHint && <aside className="local-first-reminder" role="status"><p>知识保存在当前浏览器，建议定期完整备份。</p><button className="btn" onClick={()=>setLocalHint(false)}>知道了</button></aside>}
  </>;
  const chrome = (
    <>
      <InkDock tab={shell} onChange={changeShell} />
      {creationUi}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <ConfirmModal req={confirmReq} onClose={() => setConfirmReq(null)} />
    </>
  );

  if (shell === "community" || shell === "settings") {
    return (
      <ConfirmCtx.Provider value={ask}>
        <div className="wrap shell-wrap">
          {shell === "community" ? (
            <CommunityPreview onReturn={() => changeShell("mine")} />
          ) : (
            <SettingsPage
              ws={ws}
              commit={commit}
              guest={guest}
              onLeaveGuest={() => {
                leaveGuest();
                setGuest(false);
              }}
              onOpenTree={() => {
                setGroveOpen(false);
                changeShell("mine");
              }}
            />
          )}
        </div>
        {chrome}
      </ConfirmCtx.Provider>
    );
  }

  if (groveOpen || !tree) {
    return (
      <ConfirmCtx.Provider value={ask}>
        <div className="wrap landing">
          <GrovePage
            ws={ws}
            onOpen={openTree}
            onNewBlank={() => setCreation({})}
            onFromTemplate={(id) => setCreation({templateId:id})}
            onImport={() => pickImport()}
          />
        </div>
        {chrome}
      </ConfirmCtx.Provider>
    );
  }

  const tot = progressOf(tree.nodes);
  const weekId = ws.ui.weekId || weekIdFromDate();

  return (
    <ConfirmCtx.Provider value={ask}>
    <div className="wrap">
      <header className={`hero ${ws.ui.focusNodeId ? "compact" : ""}`}>
        <div>
          <button type="button" className="brand-mark brand-home" onClick={openGrove}>
            LEO TREE
          </button>
          <h1>{tree.title || t("untitled")}</h1>
          {tree.description ? <p>{tree.description}</p> : null}
          <div className="hero-wave" aria-hidden="true" />
          <button className="tree-switch" onClick={() => commit("patchUi", { switcherOpen: true })}>
            {t("switchTree")} ▾
          </button>
        </div>
        <div className="hero-actions">
          <button
            className={`btn ${ws.ui.editing ? "on" : ""}`}
            onClick={() => commit("patchUi", { editing: !ws.ui.editing, tab: "tree" })}
          >
            {ws.ui.editing ? t("doneEdit") : t("editStructure")}
          </button>
          <button className="btn" onClick={() => download(filenameForTree(tree.title), exportTree(ws, tree.id))}>
            {t("exportTree")}
          </button>
          <button className="btn" onClick={() => download("knowledge-tree-workspace.json", exportWorkspace(ws))}>
            {t("exportAll")}
          </button>
          <button className="btn" onClick={() => pickImport()}>
            {t("import")}
          </button>
          <button
            className="btn danger"
            onClick={() => {
              ask({
                title: t("clearProgressTitle"),
                body: t("clearProgressBody"),
                confirmLabel: t("clearProgressOk"),
                onConfirm: () => {
                  commit("resetCurrentTreeProgress");
                  flash(t("cleared"));
                },
              });
            }}
          >
            {t("clearProgress")}
          </button>
        </div>
      </header>
      <nav className="tabs" aria-label={t("knowledgeTree")}>
        {(["tree", "week", "log"] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${ws.ui.tab === tab ? "on" : ""}`}
            onClick={() => commit("patchUi", { tab, editing: tab === "tree" ? ws.ui.editing : false })}
          >
            {tab === "tree" ? t("tabTree") : tab === "week" ? t("tabWeek") : t("tabLog")}
          </button>
        ))}
      </nav>
      {ws.ui.tab === "tree" && <TreePage ws={ws} tree={tree} tot={tot} commit={commit} />}
      {ws.ui.tab === "week" && <WeekPage ws={ws} tree={tree} weekId={weekId} commit={commit} flash={flash} />}
      {ws.ui.tab === "log" && <LogPage ws={ws} tree={tree} commit={commit} flash={flash} />}
      <p className="foot">
        {t("foot")}
        {tpl && tpl.id !== "blank" ? ` · ${t("template")} ${tpl.title}` : ""}
      </p>
      {ws.ui.switcherOpen && (
        <Switcher
          ws={ws}
          commit={commit}
          onImport={pickImport}
          onCreate={(templateId)=>{commit("patchUi",{switcherOpen:false});setCreation({templateId});}}
          onClose={() => commit("patchUi", { switcherOpen: false })}
          onRename={(id) => {
            const t = ws.trees[id];
            setRenameId(id);
            setRenameTitle(t?.title ?? "");
            setRenameDesc(t?.description ?? "");
          }}
        />
      )}
      {renameId && (
        <Modal title={t("renameTree")} onClose={() => setRenameId(null)}>
            <div className="form">
              <label>{t("name")} <input value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} /></label>
              <label>{t("intro")} <textarea value={renameDesc} onChange={(e) => setRenameDesc(e.target.value)} /></label>
              <button className="btn primary" onClick={() => { commit("renameTree", renameId, renameTitle, renameDesc); setRenameId(null); }}>
                {t("save")}
              </button>
            </div>
        </Modal>
      )}
      <DataTools />
      {creationUi}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <ConfirmModal req={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
    <InkDock tab={shell} onChange={changeShell} />
    </ConfirmCtx.Provider>
  );
}

function Switcher({
  ws,
  commit,
  onImport,
  onCreate,
  onClose,
  onRename,
}: {
  ws: Workspace;
  commit: Commit;
  onImport: () => void;
  onCreate: (templateId?:string) => void;
  onClose: () => void;
  onRename: (id: string) => void;
}) {
  const ask = useAsk();
  const { t } = useI18n();
  return (
    <Modal title={t("myTreesTitle")} onClose={onClose}>
        {Object.values(ws.trees).map((tr) => (
          <div key={tr.id} className="tree-row">
            <button
              className={`tree-pick ${ws.currentTreeId === tr.id ? "current" : ""}`}
              onClick={() => commit("setCurrentTree", tr.id)}
            >
              {tr.title}
              <small>{tr.description || t("noIntro")} · {t("nodesCount", { n: tr.nodes.length })}</small>
            </button>
            <div className="hero-actions">
              <button className="btn ghost" onClick={() => onRename(tr.id)}>{t("rename")}</button>
              <button className="btn ghost" onClick={() => commit("duplicateTree", tr.id)}>{t("duplicate")}</button>
              <button
                className="btn danger"
                onClick={() => {
                  ask({
                    title: t("deleteTreeTitle", { title: tr.title }),
                    body: t("deleteTreeBody"),
                    onConfirm: () => commit("deleteTree", tr.id),
                  });
                }}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        ))}
        <div className="hero-actions" style={{ marginTop: 14, justifyContent: "flex-start" }}>
          <button className="btn primary" onClick={() => onCreate()}>{t("newBlankShort")}</button>
          {TEMPLATES.filter((tpl) => tpl.id !== "blank").map((tpl) => (
            <button key={tpl.id} className="btn" onClick={() => onCreate(tpl.id)}>
              {t("fromTemplate", { title: tpl.title })}
            </button>
          ))}
          <button className="btn" onClick={onImport}>{t("importJson")}</button>
        </div>

    </Modal>
  );
}

function WeekPage({
  ws,
  tree,
  weekId,
  commit,
  flash,
}: {
  ws: Workspace;
  tree: KnowledgeTree;
  weekId: string;
  commit: Commit;
  flash: (s: string) => void;
}) {
  const { start, isFuture, isCurrent } = weekBounds(weekId);
  const endShow = addDays(start, 6);
  const sum = weekSummary(tree, weekId);
  const r = tree.reviews[weekId] ?? emptyReview(weekId);
  const runtime = getRuntime(tree.templateId);
  const leakHint = runtime.reviewRiskHint?.(sum.weekLogs) ?? "";
  const reviewFields = treeReviewFields(tree);
  const months = yearWindow();
  const ask = useAsk();
  const { t } = useI18n();
  const list = (title: string, rows: ReactNode[], empty: string) => (
    <div className="list">
      <h2>{title}</h2>
      {rows.length ? rows : <p className="empty">{empty}</p>}
    </div>
  );
  return (
    <>
      <div className="week-nav">
        <button className="btn" onClick={() => commit("shiftWeek", -1)}>{t("prevWeek")}</button>
        <strong>{fmtDay(start)} ～ {fmtDay(endShow)}{isCurrent ? ` · ${t("thisWeek")}` : isFuture ? ` · ${t("future")}` : ""}</strong>
        <button className="btn" onClick={() => commit("shiftWeek", 1)}>{t("nextWeek")}</button>
      </div>
      <div className="summary">
        <div className="stat"><b>{sum.historyKnown ? sum.newlyDone.length : "记录不足"}</b><span>{t("newlyDone")}</span></div>
        <div className="stat"><b>{sum.historyKnown ? sum.newlyDoing.length : "记录不足"}</b><span>{t("newlyDoing")}</span></div>
        <div className="stat"><b>{sum.stalled.length}</b><span>当前滞留</span></div>
        <div className="stat"><b>{sum.weekLogs.length}</b><span>{t("weekLogs")}</span></div>
      </div>
      <p className="brief">所选周的状态事件保留当时名称与优先级；同一节点当周重复标记只计一次。{!sum.historyKnown && "该周历史不完整，下方只列已知记录，不能视为总量。"} 实践按创建时间归周，内容显示当前版本。</p>
      {sum.unknownDoing ? <p className="empty">{t("unknownDoing", { n: sum.unknownDoing })}</p> : null}
      {isFuture ? <p className="empty">{t("futureEmpty")}</p> : null}
      {list(t("weekMastered"), sum.newlyDone.map((n) => <button className="row" key={n.id} disabled={!n.exists} onClick={() => commit("focusNode",n.id)}><span>{nodeLabel(n)}</span><small>{n.exists ? `P${n.priority} · 返回节点` : "节点已删除 · 保留历史"}</small></button>), t("weekMasteredEmpty"))}
      <h2 className="current-diagnostics">当前诊断 · 今天</h2>
      <p className="brief">下面的滞留与 P0 清单反映当前状态，不是所选周的历史快照。</p>
      {list("当前滞留超过 14 天", sum.stalled.map(({ node, days }) => <button className="row" key={node.id} onClick={() => commit("focusNode",node.id)}><span>{nodeLabel(node)}</span><small>{Math.floor(days)} 天 · 返回节点</small></button>), t("stalledEmpty"))}
      {list(t("p0focus"), sum.p0focus.map((n) => <button className="row" key={n.id} onClick={() => commit("focusNode",n.id)}><span>{nodeLabel(n)}</span><small>{NODE_STATUS_MARK[n.status]} {t(n.status === "todo" ? "statusTodo" : n.status === "doing" ? "statusDoing" : "statusDone")}</small></button>), t("p0focusEmpty"))}
      {list(t("weekPractice"), sum.weekLogs.map((e) => (
        <button className="row" key={e.id} onClick={() => commit("patchUi", { tab: "log", logQuery: "", logStatus: "", expandedLogs: { ...ws.ui.expandedLogs, [e.id]: true }, scrollLogId: e.id })}>
          <span>{e.title || t("untitledLog")}</span><small>{e.date} · {LOG_STATUS_LABEL[e.status]}</small>
        </button>
      )), t("weekPracticeEmpty"))}
      {leakHint ? <div className="warn-banner">{leakHint}</div> : null}
      <section className="card" style={{ padding: 16, margin: "18px 0" }}>
        <div className="section-hd">
          <h2>{t("weekReview")}</h2>
          <button
            className="btn"
            onClick={() => {
              const has = [r.focus, r.stuck, r.nextMain, r.nextP2, r.risk, r.summary].some((x) => String(x || "").trim());
              const fill = () => {
                commit("patchReview", weekId, { summary: buildWeekDraft(tree, weekId, leakHint) });
                flash(t("draftFilled"));
              };
              if (!has) {
                fill();
                return;
              }
              ask({
                title: "覆盖「可编辑周总结」？",
                body: "已有手写内容会被草稿替换。上方字段不会改。",
                confirmLabel: "覆盖",
                onConfirm: fill,
              });
            }}
          >
            生成本周草稿
          </button>
        </div>
        <div className="form">
          <label>本周真正推进的一件事 <input value={r.focus} onChange={(e) => commit("patchReview", weekId, { focus: e.target.value })} /></label>
          <label>卡住的地方 <textarea value={r.stuck} onChange={(e) => commit("patchReview", weekId, { stuck: e.target.value })} /></label>
          <div className="form-grid">
            <label>下周只允许的 1 个主问题 <input value={r.nextMain} onChange={(e) => commit("patchReview", weekId, { nextMain: e.target.value })} /></label>
            <label>下周只允许的 1 个探索项（可空） <input value={r.nextP2} onChange={(e) => commit("patchReview", weekId, { nextP2: e.target.value })} /></label>
          </div>
          <label>本周发现的错误 / 风险 / 需要复查的地方 <textarea value={r.risk} onChange={(e) => commit("patchReview", weekId, { risk: e.target.value })} /></label>
          {reviewFields.length ? (
            <CustomFields
              defs={reviewFields}
              values={r.custom}
              onChange={(id, value) => commit("patchReview", weekId, { custom: { [id]: value } })}
            />
          ) : null}
          <label>可编辑周总结 <textarea value={r.summary} onChange={(e) => commit("patchReview", weekId, { summary: e.target.value })} /></label>
        </div>
      </section>
      <section>
        <h2 className="serif" style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>{months[0].y} 全年阅读进度</h2>
        <p className="brief">按自然年统计各月可确认的首次标为掌握数量，复学或重复标记不重复计数；无记录月份计 0。历史不完整或首次时间无法确认时显示“未知”。</p>
        <div className="months">
          {months.map((m) => (
            <div className="month" key={m.key}><span>{m.label}</span><b>{doneIncrement(tree, m.y, m.m) ?? "记录不足"}</b></div>
          ))}
        </div>
      </section>
    </>
  );
}

function LogPage({
  ws,
  tree,
  commit,
  flash,
}: {
  ws: Workspace;
  tree: KnowledgeTree;
  commit: Commit;
  flash: (s: string) => void;
}) {
  const runtime = getRuntime(tree.templateId);
  const list = tree.logs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const vis = list.filter((exp) => {
    if (ws.ui.logStatus && exp.status !== ws.ui.logStatus) return false;
    const q = ws.ui.logQuery.trim().toLowerCase();
    if (!q) return true;
    return [exp.title, exp.hypothesis, exp.question, exp.conclusion, (exp.tags || []).join(" ")].join(" ").toLowerCase().includes(q);
  });
  const weekId = ws.ui.weekId || weekIdFromDate();
  const review = tree.reviews[weekId] ?? emptyReview(weekId);

  useEffect(() => {
    if (!ws.ui.scrollLogId) return;
    document.getElementById(`log-${ws.ui.scrollLogId}`)?.scrollIntoView({ block: "start" });
    commit("patchUi", { scrollLogId: "" });
  }, [ws.ui.scrollLogId, commit, ws]);

  return (
    <>
      <div className="hero-actions" style={{ marginBottom: 12, justifyContent: "flex-start" }}>
        <button className="btn primary" onClick={() => commit("addLog")}>新建记录</button>
        <button
          className="btn"
          onClick={() => {
            const q = (review.nextMain || review.focus || "").trim();
            if (!q) { flash("本周还没有填写主问题或推进的一事，先去周回顾写一句。"); return; }
            commit("addLog", { title: q.slice(0, 80), hypothesis: q, question: q });
            flash("已生成草稿");
          }}
        >
          从本周主问题生成草稿
        </button>
      </div>
      <div className="filters">
        <input className="search" placeholder="搜索标题 / 假设 / 结论" value={ws.ui.logQuery} onChange={(e) => commit("patchUi", { logQuery: e.target.value })} />
        {([["", "全部状态"], ["idea", "构思"], ["running", "进行中"], ["done", "完成"], ["dropped", "放弃"]] as const).map(([v, l]) => (
          <button key={v} className={`chip ${ws.ui.logStatus === v ? "on" : ""}`} onClick={() => commit("patchUi", { logStatus: v as "" | LogStatus })}>{l}</button>
        ))}
      </div>
      {vis.length ? vis.map((exp) => (
        <LogCard key={exp.id} exp={exp} tree={tree} ws={ws} commit={commit} hasRisk={runtime.logHasRisk?.(exp) ?? false} />
      )) : <p className="empty">还没有实践记录。从一条可检验的问题开始，或从本周主问题生成草稿。</p>}
    </>
  );
}

function LogCard({
  exp,
  tree,
  ws,
  commit,
  hasRisk,
}: {
  exp: PracticeLog;
  tree: KnowledgeTree;
  ws: Workspace;
  commit: Commit;
  hasRisk: boolean;
}) {
  const open = !!ws.ui.expandedLogs[exp.id];
  const logFields = treeLogFields(tree);
  const [linkQ, setLinkQ] = useState("");
  const ask = useAsk();
  const metricDefs = logFields.filter((f) => f.group === "指标" && f.type === "text");
  const metrics = metricDefs
    .map((f) => [f.label, exp.custom[f.id]] as const)
    .filter(([, v]) => v !== "" && v != null);
  const linkItems = useMemo(
    () => tree.nodes.filter((n) => !linkQ.trim() || `${n.id} ${n.title}`.toLowerCase().includes(linkQ.trim().toLowerCase())),
    [tree.nodes, linkQ],
  );
  return (
    <article className={`exp ${hasRisk ? "warn" : ""}`} id={`log-${exp.id}`}>
      <div className="exp-hd" onClick={() => commit("patchUi", { expandedLogs: { ...ws.ui.expandedLogs, [exp.id]: !open } })}>
        <div>
          <h3>{exp.title || "未命名记录"}</h3>
          <div className="meta">{exp.date} · {LOG_STATUS_LABEL[exp.status]}{hasRisk ? " · 风险未确认" : ""}</div>
          <div className="hint">{snippet(exp.hypothesis || exp.question, 40) || "尚未填写假设"}</div>
          {metricDefs.length ? (
            <div className="metrics">{metrics.length ? metrics.map(([k, v]) => `${k} ${v}`).join(" · ") : "关键指标未填"}</div>
          ) : null}
        </div>
        <span className="prio">{open ? "收起" : "展开"}</span>
      </div>
      {open && (
        <div className="form" style={{ marginTop: 12 }}>
          <div className="form-grid">
            <label>标题 <input value={exp.title} onChange={(e) => commit("patchLog", exp.id, { title: e.target.value })} /></label>
            <label>日期 <input type="date" value={exp.date} onChange={(e) => commit("patchLog", exp.id, { date: e.target.value })} /></label>
          </div>
          <label>状态
            <select value={exp.status} onChange={(e) => commit("patchLog", exp.id, { status: e.target.value as LogStatus })}>
              {Object.entries(LOG_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <MathEditor variant="compact" label="问题 / 目标" value={exp.question} onChange={(question) => commit("patchLog", exp.id, { question })} />
          <MathEditor variant="compact" label="假设 / 预期" value={exp.hypothesis} onChange={(hypothesis) => commit("patchLog", exp.id, { hypothesis })} />
          <MathEditor variant="compact" label="过程 / 证据" value={exp.process} onChange={(process) => commit("patchLog", exp.id, { process })} />
          <MathEditor variant="compact" label="结论" value={exp.conclusion} onChange={(conclusion) => commit("patchLog", exp.id, { conclusion })} />
          {logFields.length ? (
            <CustomFields
              defs={logFields}
              values={exp.custom}
              onChange={(id, value) => commit("patchLog", exp.id, { custom: { [id]: value } })}
            />
          ) : null}
          <div className="links practice-return">{exp.linkedNodeIds.map(id => { const n = tree.nodes.find(x => x.id === id); return n ? <button className="btn" key={id} onClick={() => commit("focusNode",id)}>返回节点：{nodeLabel(n)}</button> : null; })}</div>
          <div className="field">
            关联知识节点
            <input type="text" placeholder="搜索 id / 名称" value={linkQ} onChange={(e) => setLinkQ(e.target.value)} />
            <div className="link-list">
              {linkItems.map((n) => (
                <label key={n.id}>
                  <input
                    type="checkbox"
                    checked={exp.linkedNodeIds.includes(n.id)}
                    onChange={(e) => {
                      const set = new Set(exp.linkedNodeIds);
                      if (e.target.checked) set.add(n.id);
                      else set.delete(n.id);
                      commit("patchLog", exp.id, { linkedNodeIds: Array.from(set) });
                    }}
                  />
                  <span>{nodeLabel(n)}</span>
                </label>
              ))}
            </div>
          </div>
          <label>标签（逗号分隔） <input value={(exp.tags || []).join(", ")} onChange={(e) => commit("patchLog", exp.id, { tags: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })} /></label>
          <label>附件说明 <input value={exp.attachmentNote} onChange={(e) => commit("patchLog", exp.id, { attachmentNote: e.target.value })} /></label>
          <div>
            <button className="btn danger" onClick={() => {
              ask({
                title: `删除实践日志「${exp.title || "未命名记录"}」？`,
                body: "此操作无法撤销。",
                onConfirm: () => commit("deleteLog", exp.id),
              });
            }}>删除</button>
          </div>
        </div>
      )}
    </article>
  );
}
