import { PROGRESS_CONTRACT, USER_GUIDE } from "@/lib/product-contract";
export function PublicGuide() {
  return <section className="settings-block public-guide"><h3>使用与数据说明</h3>{USER_GUIDE.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>;
}
export function ProgressDisclosure() {
  return <details className="progress-disclosure"><summary>进度如何计算</summary><p>{PROGRESS_CONTRACT}</p></details>;
}
