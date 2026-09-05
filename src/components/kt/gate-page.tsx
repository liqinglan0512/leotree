import { useI18n } from "@/lib/i18n";
import { SignInPanel } from "./sign-in-panel";

export function GatePage({ onGuest }: { onGuest: () => void }) {
  const { t } = useI18n();
  return (
    <main className="login-page gate-page">
      <div className="login-art" aria-hidden="true" />
      <div className="login-card">
        <p className="brand-mark">LEO TREE</p>
        <h1 className="serif">{t("loginTitle")}</h1>
        <p className="brief">{t("loginBrief")}</p>
        <SignInPanel showGuest onGuest={onGuest} />
      </div>
    </main>
  );
}
