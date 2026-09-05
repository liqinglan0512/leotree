import { useState } from "react";
export type StartChoice = "blank" | "template" | "import" | "web";
const pages=[
  ["园子，收好你的知识", "一个园子里，可以种下多棵不同主题的知识树。", "园子 → 知识树 → 节点"],
  ["一棵树，一个想学的主题", "用分区整理方向，用节点记下一个概念、一份笔记或一次实践。", "从一小枝开始，慢慢长大。"],
  ["从这里种下第一棵树", "先写一点，再回来补充。你不需要一次整理完整。", "选择最适合你的起点。"],
];
export function Welcome({onStart}:{onStart:(choice:StartChoice)=>void}) {
  const [step,setStep]=useState(0);const page=pages[step];
  return <main className="wrap first-minute" data-onboarding="true">
    <header className="hero"><p className="brand-mark">LEO TREE · PUBLIC BETA</p><h1>让知识，在这里生长</h1></header>
    <section className="welcome-card" aria-label="初次使用引导"><p className="welcome-step">{step+1} / 3</p><div aria-live="polite"><h2>{page[0]}</h2><p>{page[1]}</p><p className="welcome-path">{page[2]}</p></div>
      {step<2 ? <div className="hero-actions">{step>0 && <button className="btn" onClick={()=>setStep(step-1)}>上一步</button>}<button className="btn primary" onClick={()=>setStep(step+1)}>下一步</button><button className="btn ghost" onClick={()=>setStep(2)}>跳过介绍</button></div> : <div className="hero-actions"><button className="btn primary" onClick={()=>onStart("blank")}>新建知识树</button><button className="btn" onClick={()=>onStart("template")}>从模板开始</button><button className="btn" onClick={()=>onStart("import")}>导入</button></div>}
    </section>
    <div className="product-entries"><button className="btn" onClick={()=>onStart("web")}>立即使用网页版</button><a className="btn" href="/download">下载本地版</a></div><p className="brief">Windows 本地版即将开放。网页版现在就可以使用，无需登录。</p>
  </main>;
}
