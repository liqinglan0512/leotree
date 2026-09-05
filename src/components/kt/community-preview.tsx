export function CommunityPreview({ onReturn }: { onReturn: () => void }) {
  return <section className="community-preview" data-community-state="preview">
    <header className="hero"><div><p className="brand-mark">LEO TREE · PREVIEW</p><h1>社区暂未开放</h1><p>当前版本专注于你的本机知识树、实践与复盘。社区浏览、发布和评论尚未开放。</p></div></header>
    <p className="brief">已有本地园子资料会保留，并随完整备份导出。</p>
    <button className="btn primary" onClick={onReturn}>回到我的园子</button>
  </section>;
}
