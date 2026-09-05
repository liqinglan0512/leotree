import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { useAuthCapabilities } from "@/lib/auth/capabilities";
import { useI18n } from "@/lib/i18n";

export function SignInPanel({ showGuest, onGuest }: { showGuest?: boolean; onGuest?: () => void }) {
  const { t }=useI18n();
  const capability=useAuthCapabilities();
  const [signup,setSignup]=useState(false),[account,setAccount]=useState(""),[password,setPassword]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); if(!capability.emailPassword)return;
    setError(""); const email=account.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError(t("authInvalidEmail"));return;}
    if(password.length<8){setError(t("authWeakPassword"));return;}
    setBusy(true);
    try {
      const result=signup ? await authClient.signUp.email({email,password,name:email.split("@")[0]}) : await authClient.signIn.email({email,password});
      if(result.error)throw new Error(result.error.message || t("authFailed"));
      window.location.assign("/");
    } catch(e){setError(e instanceof Error ? e.message : t("authFailed"));} finally{setBusy(false);}
  }
  return <div className="settings-auth">
    <p className="brief">本机空间属于当前浏览器，不按账号隔离。登录不会上传、同步或转移知识；同一浏览器切换账号仍会看到同一份本机数据。</p>
    {showGuest && onGuest && <button type="button" className="btn primary guest-btn" onClick={onGuest}>打开本机空间（无需登录）</button>}
    {capability.pending ? <p className="brief">正在检查账号服务…</p> : !capability.emailPassword ? <p className="brief" data-auth-availability="unavailable">{capability.unavailable ? "账号服务暂不可用，本机空间仍可使用。" : "此环境未开放账号登录。"}</p> :
      <form className="auth-form" onSubmit={submit} data-auth-availability="email">
        <p className="brief">邮箱与密码登录。当前不提供邮箱验证或密码找回；账号不能用来找回本机知识，请保留完整备份。</p>
        <label>{t("email")}<input type="email" autoComplete="email" required value={account} onChange={e=>setAccount(e.target.value)} /></label>
        <label>{t("password")}<input type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {error && <p role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "…" : signup ? t("signUpSubmit") : t("signInSubmit")}</button>
        <button className="btn ghost" type="button" onClick={()=>{setSignup(!signup);setError("");}}>{signup ? t("toggleSignIn") : t("toggleSignUp")}</button>
      </form>}
  </div>;
}
