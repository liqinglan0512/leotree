import { SignInGate, UserButton } from "@/lib/auth/gates";
import { progressOf } from "@/lib/knowledge-tree/progress";
import { setCurrentTree } from "@/lib/knowledge-tree/engine";
import type { Workspace } from "@/lib/knowledge-tree/types";
import { useI18n, type FontSize } from "@/lib/i18n";
import { SignInPanel } from "./sign-in-panel";

const FONTS: FontSize[] = ["sm", "md", "lg", "xl"];

export function SettingsPage({
  ws,
  commit,
  guest,
  onLeaveGuest,
  onOpenTree,
}: {
  ws: Workspace;
  commit: (w: Workspace) => void;
  guest: boolean;
  onLeaveGuest: () => void;
  onOpenTree: (id: string) => void;
}) {
  const { t, locale, setLocale, font, setFont } = useI18n();
  const trees = Object.values(ws.trees);
  return (
    <div className="settings-page">
      <header className="hero compact">
        <div>
          <p className="brand-mark">LEO TREE</p>
          <h1>{t("settings")}</h1>
          <div className="hero-wave" aria-hidden="true" />
        </div>
      </header>

      <section className="settings-block">
        <h3>{t("language")}</h3>
        <div className="seg">
          <button type="button" className={`chip ${locale === "zh" ? "on" : ""}`} onClick={() => setLocale("zh")}>
            {t("chinese")}
          </button>
          <button type="button" className={`chip ${locale === "en" ? "on" : ""}`} onClick={() => setLocale("en")}>
            {t("english")}
          </button>
        </div>
      </section>

      <section className="settings-block">
        <h3>{t("fontSize")}</h3>
        <div className="seg">
          {FONTS.map((f) => (
            <button key={f} type="button" className={`chip ${font === f ? "on" : ""}`} onClick={() => setFont(f)}>
              {t(f === "sm" ? "fontSm" : f === "md" ? "fontMd" : f === "lg" ? "fontLg" : "fontXl")}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <h3>{t("account")}</h3>
        <SignInGate
          fallback={
            <div className="settings-auth">
              {guest ? <p className="brief">{t("guestNow")}</p> : null}
              <SignInPanel />
              {guest ? (
                <button type="button" className="btn" onClick={onLeaveGuest}>
                  {t("leaveGuest")}
                </button>
              ) : null}
            </div>
          }
        >
          <div className="settings-user">
            <p className="brief">{t("signedInAs")}</p>
            <UserButton />
          </div>
        </SignInGate>
      </section>

      <section className="settings-block">
        <h3>{t("myTrees")}</h3>
        {trees.length === 0 ? (
          <p className="empty">{t("noTrees")}</p>
        ) : (
          <ul className="settings-trees">
            {trees.map((tree) => {
              const tot = progressOf(tree.nodes);
              const current = ws.currentTreeId === tree.id;
              return (
                <li key={tree.id}>
                  <button
                    type="button"
                    className={`tree-pick ${current ? "current" : ""}`}
                    onClick={() => {
                      commit(setCurrentTree(ws, tree.id));
                      onOpenTree(tree.id);
                    }}
                  >
                    {tree.title || t("untitled")}
                    <small>
                      {current ? `${t("current")} · ` : ""}
                      {t("nodesCount", { n: tree.nodes.length })} · {tot.pct}%
                    </small>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
