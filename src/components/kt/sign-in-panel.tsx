import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n";

function providerLabel(id: string, t: (k: "continueGoogle" | "continueX") => string) {
  if (id.includes("google")) return t("continueGoogle");
  return t("continueX");
}

function toEmail(raw: string, mode: "email" | "phone") {
  const v = raw.trim();
  if (mode === "email") return v;
  const digits = v.replace(/\D/g, "");
  return `${digits}@phone.leotree.app`;
}

export function SignInPanel({
  showGuest,
  onGuest,
}: {
  showGuest?: boolean;
  onGuest?: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [signup, setSignup] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setNote("");
    const email = toEmail(account, tab);
    if (tab === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(t("authInvalidEmail"));
      return;
    }
    if (tab === "phone" && !/^1\d{10}$/.test(account.replace(/\D/g, ""))) {
      setErr(t("authInvalidPhone"));
      return;
    }
    if (password.length < 8) {
      setErr(t("authWeakPassword"));
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: tab === "phone" ? account.replace(/\D/g, "") : email.split("@")[0],
        });
        if (error) throw new Error(error.message || t("authFailed"));
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message || t("authFailed"));
      }
      window.location.assign("/");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("authFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-auth">
      <p className="brief">{t("signInHint")}</p>
      <div className="auth-social">
        {GROK_PROVIDERS.map((p) => (
          <button
            key={p.providerId}
            type="button"
            className="btn primary"
            onClick={() => signIn(p.providerId, { callbackURL: "/" })}
          >
            {providerLabel(p.providerId, t)}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => setNote(t("comingSoonWechat"))}>
          {t("continueWechat")}
        </button>
        <button type="button" className="btn" onClick={() => setNote(t("comingSoonQQ"))}>
          {t("continueQQ")}
        </button>
      </div>
      {note ? <p className="empty">{note}</p> : null}
      {showGuest && onGuest ? (
        <button type="button" className="btn guest-btn" onClick={onGuest}>
          {t("guestContinue")}
        </button>
      ) : null}
      {showGuest ? <p className="brief">{t("guestHint")}</p> : null}
      <p className="auth-or">{t("orAccount")}</p>
      <div className="seg">
        <button type="button" className={`chip ${tab === "email" ? "on" : ""}`} onClick={() => setTab("email")}>
          {t("continueEmail")}
        </button>
        <button type="button" className={`chip ${tab === "phone" ? "on" : ""}`} onClick={() => setTab("phone")}>
          {t("continuePhone")}
        </button>
      </div>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          {tab === "email" ? t("email") : t("phone")}
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete={tab === "email" ? "email" : "tel"}
            inputMode={tab === "phone" ? "tel" : "email"}
            placeholder={tab === "email" ? "you@example.com" : "13800000000"}
          />
        </label>
        <label>
          {t("password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={8}
          />
        </label>
        {err ? <p className="empty">{err}</p> : null}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? "…" : signup ? t("signUpSubmit") : t("signInSubmit")}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setSignup((v) => !v);
            setErr("");
          }}
        >
          {signup ? t("toggleSignIn") : t("toggleSignUp")}
        </button>
      </form>
    </div>
  );
}
