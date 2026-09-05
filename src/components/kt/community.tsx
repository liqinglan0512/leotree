import { useEffect, useMemo, useRef, useState } from "react";
import {
  GARDEN_COVERS,
  addGardenComment,
  createGarden,
  gardenBlurb,
  gardenTitle,
  plantIntoGarden,
  type Garden,
  type GardenState,
  type Planted,
} from "@/lib/garden-store";
import { CoverDraft } from "@/lib/knowledge-tree/cover-draft";
import { GardenArt } from "./garden-art";
import { useI18n } from "@/lib/i18n";
import { progressOf } from "@/lib/knowledge-tree/progress";
import { nodeLabel } from "@/lib/knowledge-tree/display";
import type { KnowledgeTree } from "@/lib/knowledge-tree/types";

function matches(hay: string, q: string) {
  return hay.toLowerCase().includes(q.trim().toLowerCase());
}

export function CommunityPage({
  gardens,
  setGardens,
  myTrees,
  displayName,
  onAdopt,
}: {
  gardens: GardenState;
  setGardens: (s: GardenState) => void;
  myTrees: KnowledgeTree[];
  displayName: string;
  onAdopt: (tree: KnowledgeTree) => void;
}) {
  const { t, locale } = useI18n();
  const en = locale === "en";
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [plantedId, setPlantedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [planting, setPlanting] = useState(false);

  const garden = gardens.gardens.find((g) => g.id === openId) ?? null;
  const planted = gardens.planted.find((p) => p.id === plantedId) ?? null;

  const list = useMemo(() => {
    const query = q.trim();
    if (!query) return gardens.gardens;
    return gardens.gardens.filter((g) =>
      matches(`${gardenTitle(g, en)} ${gardenBlurb(g, en)} ${g.owner}`, query),
    );
  }, [gardens.gardens, q, en]);

  if (planted && garden) {
    return (
      <PlantedView
        garden={garden}
        planted={planted}
        onBack={() => setPlantedId(null)}
        onAdopt={() => onAdopt(planted.snapshot)}
      />
    );
  }

  if (garden) {
    return (
      <GardenView
        garden={garden}
        gardens={gardens}
        q={q}
        setQ={setQ}
        displayName={displayName}
        onBack={() => {
          setOpenId(null);
          setQ("");
        }}
        onOpenPlanted={(id) => setPlantedId(id)}
        onComment={(body) => setGardens(addGardenComment(gardens, { gardenId: garden.id, author: displayName, body }))}
        onWantPlant={() => setPlanting(true)}
        planting={planting}
        myTrees={myTrees}
        onPlant={(tree) => {
          setGardens(plantIntoGarden(gardens, { gardenId: garden.id, ownerName: displayName, tree }));
          setPlanting(false);
        }}
        onCancelPlant={() => setPlanting(false)}
      />
    );
  }

  return (
    <div className="community-page">
      <header className="hero">
        <div>
          <p className="brand-mark">LEO TREE</p>
          <h1>{t("communityTitle")}</h1>
          <p>{t("communityBrief")}</p>
          <div className="hero-wave" aria-hidden="true" />
        </div>
      </header>
      <div className="garden-toolbar">
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchGardens")}
        />
        <button type="button" className="btn primary" onClick={() => setCreating(true)}>
          {t("plantMine")}
        </button>
      </div>
      <div className="garden-grid">
        {list.length ? (
          list.map((g) => {
            const n = gardens.planted.filter((p) => p.gardenId === g.id).length;
            return (
              <article key={g.id} className="garden-card">
                <button type="button" className="garden-art-btn" onClick={() => setOpenId(g.id)}>
                  <GardenArt art={g.art} className="garden-art" />
                </button>
                <div className="garden-body">
                  <h2>{gardenTitle(g, en)}</h2>
                  <p className="garden-author">{g.owner}</p>
                  <p>{gardenBlurb(g, en)}</p>
                  <p className="garden-meta">{t("treesInGarden", { n })}</p>
                  <button type="button" className="btn primary" onClick={() => setOpenId(g.id)}>
                    {t("enterGarden")}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty">{t("noGardenHits")}</p>
        )}
      </div>
      {creating ? (
        <CreateGardenModal
          owner={displayName}
          onClose={() => setCreating(false)}
          onCreate={(title, blurb, art) => {
            const { state, garden: g } = createGarden(gardens, { title, blurb, art, owner: displayName });
            setGardens(state);
            setCreating(false);
            setOpenId(g.id);
          }}
        />
      ) : null}
    </div>
  );
}

function CreateGardenModal({
  owner,
  onClose,
  onCreate,
}: {
  owner: string;
  onClose: () => void;
  onCreate: (title: string, blurb: string, art: string) => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [art, setArt] = useState(GARDEN_COVERS[4]);
  const [err, setErr] = useState("");
  const [draft] = useState(() => new CoverDraft());
  const [busy,setBusy] = useState(false);
  const previewUrl = useRef<string | null>(null);
  useEffect(() => () => { draft.cancel(); if(previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, [draft]);
  async function onPng(file: File | undefined) {
    if (!file) return;
    setErr("");
    try {
      const blob = await draft.select(file); if (!blob) return;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(blob); setArt(previewUrl.current);
    } catch(e) { setErr(String(e)); }
  }
  async function create() {
    setBusy(true);setErr("");
    try { if (art.startsWith("blob:")) await draft.save(ref => onCreate(title,blurb,ref)); else onCreate(title,blurb,art); }
    catch(e) { setErr(`封面未保存：${String(e)}`); }
    finally { setBusy(false); }
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("createGarden")}</h2>
        <p className="brief">{t("createGardenHint", { name: owner })}</p>
        <div className="form">
          <label>
            {t("gardenName")}
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            {t("intro")}
            <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} />
          </label>
          <p className="file-tray-kicker">{t("pickCover")}</p>
          <div className="cover-pick">
            {GARDEN_COVERS.map((src) => (
              <button
                key={src}
                type="button"
                className={`cover-swatch ${art === src ? "on" : ""}`}
                style={{ backgroundImage: `url(${src})` }}
                onClick={() => setArt(src)}
                aria-label={src}
              />
            ))}
          </div>
          <div
            className={`file-tray cover-tray ${art.startsWith("blob:") ? "on" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onPng(e.dataTransfer.files[0]);
            }}
            role="button"
            tabIndex={0}
          >
            <span className="file-tray-mark" aria-hidden="true" />
            {art.startsWith("blob:") ? <GardenArt art={art} className="cover-preview" /> : null}
            <span className="file-tray-copy">
              <span className="file-tray-kicker">{t("uploadCover")}</span>
              <span className="file-tray-cta">{t("dropCover")}</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".png,image/png"
              onChange={(e) => void onPng(e.target.files?.[0])}
            />
          </div>
          <p className="file-tray-hint">{t("coverPngHint")}</p>
          {err ? <p className="file-tray-err">{err}</p> : null}
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void create()}>
              {t("createGarden")}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              {t("cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GardenView({
  garden,
  gardens,
  q,
  setQ,
  displayName,
  onBack,
  onOpenPlanted,
  onComment,
  onWantPlant,
  planting,
  myTrees,
  onPlant,
  onCancelPlant,
}: {
  garden: Garden;
  gardens: GardenState;
  q: string;
  setQ: (s: string) => void;
  displayName: string;
  onBack: () => void;
  onOpenPlanted: (id: string) => void;
  onComment: (body: string) => void;
  onWantPlant: () => void;
  planting: boolean;
  myTrees: KnowledgeTree[];
  onPlant: (tree: KnowledgeTree) => void;
  onCancelPlant: () => void;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState("");
  const planted = gardens.planted.filter((p) => p.gardenId === garden.id);
  const shown = planted.filter((p) => !q.trim() || matches(`${p.title} ${p.ownerName} ${p.snapshot.description}`, q));
  const comments = gardens.comments.filter((c) => c.gardenId === garden.id);
  return (
    <div className="garden-inside">
      <div className="garden-hero">
        <GardenArt art={garden.art} className="garden-hero-art" />
        <div className="garden-hero-veil">
          <button type="button" className="btn ghost" onClick={onBack}>
            ← {t("navCommunity")}
          </button>
          <h1 className="serif">{gardenTitle(garden, locale === "en")}</h1>
          <p>{gardenBlurb(garden, locale === "en")}</p>
        </div>
      </div>
      <div className="garden-toolbar">
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlanted")} />
        <button type="button" className="btn primary" onClick={onWantPlant}>
          {t("plantMine")}
        </button>
      </div>
      {shown.length ? (
        <div className="stele-grid">
          {shown.map((p) => (
            <button key={p.id} type="button" className="stele" onClick={() => onOpenPlanted(p.id)}>
              <span className="stele-kicker">{p.ownerName}</span>
              <strong>{p.title}</strong>
              <small>{t("nodesCount", { n: p.snapshot.nodes.length })}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty">{t("emptyGarden")}</p>
      )}
      <section className="comment-board">
        <h2>{t("comments")}</h2>
        {comments.length ? (
          comments.map((c) => (
            <article key={c.id} className="comment">
              <strong>{c.author}</strong>
              <p>{c.body}</p>
            </article>
          ))
        ) : (
          <p className="empty">{t("noComments")}</p>
        )}
        <form
          className="comment-form"
          onSubmit={(e) => {
            e.preventDefault();
            onComment(draft);
            setDraft("");
          }}
        >
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("writeComment", { name: displayName })} />
          <button type="submit" className="btn primary">
            {t("postComment")}
          </button>
        </form>
      </section>
      {planting ? (
        <div className="modal-back" onClick={onCancelPlant}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("plantMine")}</h2>
            {myTrees.length ? (
              <ul className="settings-trees">
                {myTrees.map((tree) => (
                  <li key={tree.id}>
                    <button type="button" className="tree-pick" onClick={() => onPlant(tree)}>
                      {tree.title || t("untitled")}
                      <small>{t("nodesCount", { n: tree.nodes.length })}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">{t("plantNeedTree")}</p>
            )}
            <button type="button" className="btn ghost" onClick={onCancelPlant}>
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlantedView({
  garden,
  planted,
  onBack,
  onAdopt,
}: {
  garden: Garden;
  planted: Planted;
  onBack: () => void;
  onAdopt: () => void;
}) {
  const { t, locale } = useI18n();
  const tot = progressOf(planted.snapshot.nodes);
  const tree = planted.snapshot;
  const bySec = tree.sections;
  return (
    <div className="planted-view">
      <button type="button" className="btn ghost" onClick={onBack}>
        ← {gardenTitle(garden, locale === "en")}
      </button>
      <header className="hero">
        <div>
          <p className="brand-mark">{planted.ownerName}</p>
          <h1>{planted.title}</h1>
          <p>{tree.description || t("emptyPlantedHint")}</p>
          <div className="hero-wave" aria-hidden="true" />
        </div>
      </header>
      <div className="stats">
        <div className="stat">
          <b>{tot.pct}%</b>
          <span>{t("weighted")}</span>
        </div>
        <div className="stat">
          <b>{tree.nodes.length}</b>
          <span>{t("nodesCount", { n: tree.nodes.length }).replace(/^\d+\s*/, "")}</span>
        </div>
      </div>
      {bySec.map((sec) => {
        const nodes = tree.nodes.filter((n) => n.sectionId === sec.id && !n.parentId);
        return (
          <section key={sec.id} className="section">
            <div className="section-hd">
              <h2>{sec.title}</h2>
            </div>
            {sec.description ? <p className="brief">{sec.description}</p> : null}
            {nodes.length ? (
              nodes.map((n) => (
                <div key={n.id} className="row">
                  <span>{nodeLabel(n)}</span>
                  <small>{n.status}</small>
                </div>
              ))
            ) : (
              <p className="empty">{t("emptyPlantedHint")}</p>
            )}
          </section>
        );
      })}
      <button type="button" className="btn primary" onClick={onAdopt}>
        {t("plantTree")}
      </button>
    </div>
  );
}
