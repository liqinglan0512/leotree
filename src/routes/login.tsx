import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { SignInPanel } from "@/components/kt/sign-in-panel";
import { usePeachBoot } from "@/components/kt/peach-boot";
import { enterGuest } from "@/lib/guest";

export const Route = createFileRoute("/login")({ component: LoginRoute });

function LoginRoute() {
  return (
    <I18nProvider>
      <Login />
    </I18nProvider>
  );
}

function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  usePeachBoot();
  return (
    <main className="login-page">
      <div className="login-art" aria-hidden="true" />
      <div className="login-card">
        <p className="brand-mark">LEO TREE</p>
        <h1 className="serif">{t("loginTitle")}</h1>
        <p className="brief">{t("loginBrief")}</p>
        {authEnabled ? (
          <SignInPanel
            showGuest
            onGuest={() => {
              enterGuest();
              void navigate({ to: "/" });
            }}
          />
        ) : (
          <p className="empty">{t("signInHint")}</p>
        )}
        <Link to="/" className="btn" style={{ textAlign: "center", textDecoration: "none" }}>
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
