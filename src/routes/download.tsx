import { createFileRoute } from "@tanstack/react-router";
import { usePeachBoot } from "@/components/kt/peach-boot";
import { EssentialInfo, FeedbackEntry } from "@/components/kt/release-info";
export const Route=createFileRoute("/download")({component:DownloadPage});
function DownloadPage() {
  usePeachBoot();
  return <main className="wrap download-page"><header className="hero"><p className="brand-mark">LEO TREE</p><h1>选择你的使用方式</h1><p>同一套知识树体验，从网页版开始。</p></header>
    <div className="edition-grid"><section className="welcome-card"><h2>网页版</h2><p>现在即可使用，无需安装或登录。</p><a className="btn primary" href="/?start=web">立即使用网页版</a></section><section className="welcome-card"><h2>Windows 本地版</h2><p>即将开放</p><p className="brief">.exe 安装包准备好后，会在这里提供下载。</p><button className="btn" disabled>Windows 本地版即将开放</button></section></div>
    <EssentialInfo/><p className="brief">进度是自己标记的节点学习进度；社区目前暂未开放。</p><FeedbackEntry/><a className="btn" href="/">返回首页</a>
  </main>;
}
