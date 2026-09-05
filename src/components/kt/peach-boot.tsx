import { useEffect } from "react";

const BOOT_CSS = `
#leo-boot{
  position:fixed;inset:0;z-index:60;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:clamp(14px,3vh,28px);
  padding:18px 16px 28px;
  background-color:#eee3c4;
  background-image:url("/theme/paper.jpg");
  background-repeat:repeat;
  background-size:520px;
  --p:0;
  transition:opacity .55s ease, visibility .55s ease;
}
#leo-boot.out{opacity:0;visibility:hidden;pointer-events:none}
#leo-boot .leo-cover{
  display:block;
  width:min(100vw - 28px, calc((100dvh - 120px) * 0.75));
  height:auto;
  max-height:calc(100dvh - 120px);
  object-fit:contain;
}
#leo-boot .leo-ink-bar{
  position:relative;
  width:min(360px, 84vw);
  height:46px;
  flex-shrink:0;
  overflow:hidden;
  background-color:#e7dcc0;
  box-shadow:inset 0 0 0 1px rgba(58,51,40,.22);
}
#leo-boot .leo-ink-dry,
#leo-boot .leo-ink-wet{
  position:absolute;inset:0;
  background:url("/theme/shan-shui.jpg") center / cover no-repeat;
}
#leo-boot .leo-ink-dry{
  filter:grayscale(.35) contrast(.85);
  opacity:.32;
}
#leo-boot .leo-ink-wet{
  clip-path:inset(0 calc((1 - var(--p)) * 100%) 0 0);
}
#leo-boot .leo-ink-water{
  position:absolute;left:0;width:28%;bottom:22%;
  height:7px;
  background:linear-gradient(90deg, transparent, rgba(110,128,132,.4), transparent);
  mix-blend-mode:multiply;
  opacity:.55;
  transform:translateX(calc(var(--p) * 280% - 30%));
}
#leo-boot .leo-ink-caps{
  position:absolute;inset:0;
  pointer-events:none;
  background:
    linear-gradient(90deg, rgba(58,51,40,.18), transparent 12px, transparent calc(100% - 12px), rgba(58,51,40,.18)),
    linear-gradient(180deg, rgba(58,51,40,.12), transparent 8px, transparent calc(100% - 8px), rgba(58,51,40,.16));
}
@media (prefers-reduced-motion:reduce){
  #leo-boot .leo-ink-water{opacity:.3;transform:none}
}
`;

export const BOOT_TICK_JS = `(function(){
  var p=0, last=0;
  window.__LEO_BOOT_GO=function(){window.__LEO_BOOT_READY=1};
  function tick(now){
    var el=document.getElementById("leo-boot");
    if(!el || el.classList.contains("out")) return;
    if(!last) last=now;
    var dt=Math.min(48, now-last); last=now;
    var ready=!!window.__LEO_BOOT_READY;
    var cap=ready?1:0.86;
    var decay=ready?0.86:0.975;
    p+=(cap-p)*(1-Math.pow(decay, dt/16.67));
    el.style.setProperty("--p", (p<0.001?0:p).toFixed(4));
    if(ready && p>=0.992){
      el.classList.add("out");
      setTimeout(function(){el.setAttribute("hidden","");}, 560);
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();`;

export function PeachBoot() {
  return (
    <div id="leo-boot" aria-hidden="true" suppressHydrationWarning>
      <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
      <img className="leo-cover" src="/theme/boot-cover.jpg" alt="" />
      <div className="leo-ink-bar">
        <div className="leo-ink-dry" />
        <div className="leo-ink-wet" />
        <div className="leo-ink-water" />
        <div className="leo-ink-caps" />
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __LEO_BOOT_AT?: number;
    __LEO_BOOT_READY?: number;
    __LEO_BOOT_GO?: () => void;
  }
}

export function dismissPeachBoot() {
  if (typeof window === "undefined") return;
  window.__LEO_BOOT_READY = 1;
  if (typeof window.__LEO_BOOT_GO === "function") window.__LEO_BOOT_GO();
}

export function usePeachBoot() {
  useEffect(() => {
    dismissPeachBoot();
  }, []);
}
