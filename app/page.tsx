import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
import Dashboard from './dashboard';
import './compass.css';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) return <main className="login"><p className="eyebrow">104 職涯羅盤 · 熟人測試版</p><h1>為下一份工作<br/>整理好方向。</h1><p>以 ChatGPT 登入，保存你的履歷文字、專屬推薦與應徵進度。每個帳戶擁有各自的資料。</p><a className="login-button" href={chatGPTSignInPath('/')} target="_top">使用 ChatGPT 登入</a><p>電腦 Chrome／Edge 搭配更新助手讀取職缺；手機可查看與管理。</p><p>非 104 官方整合。應徵由你在 104 自行送出。</p></main>;
  return <Dashboard name={user.displayName}/>;
}
