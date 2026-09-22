import { requireChatGPTUser } from '../chatgpt-auth';
import '../compass.css';
export const dynamic='force-dynamic';
export default async function AssistantPage(){
 await requireChatGPTUser('/assistant');
 return <main className="workspace"><header className="masthead"><a className="brand" href="/">104 職涯羅盤</a><a href="/">回到職缺</a></header><section className="intro"><div><p className="eyebrow">CHROME / EDGE · 版本 2.0.0</p><h1>安裝一次，每次更新更方便。</h1><p>在自己的電腦讀取 104 搜尋結果，送回自己的帳戶。</p></div></section><section className="empty-state" style={{textAlign:'left',padding:32}}><a className="download-button" href="/api/extension">下載更新助手 ZIP</a><ol className="instructions"><li>下載並解壓縮 ZIP，將資料夾保存在固定位置。</li><li>Chrome 在網址列輸入 <code>chrome://extensions</code>；Edge 輸入 <code>edge://extensions</code>。</li><li>開啟「開發人員模式」，按「載入未封裝項目」，選擇含有 manifest.json 的資料夾。</li><li>返回職涯羅盤並重新整理，儲存搜尋條件後，按「更新 104 職缺」。</li></ol><p>更新助手僅在本站接收更新指令。版本更新時，重新下載並替換原資料夾內容，再到擴充功能頁按重新載入。</p><p>若出現 104 驗證頁，請自行完成驗證後回本站重新更新。手機可查看與管理，更新需使用桌面 Chrome／Edge。</p><p>非 104 官方整合；助手不讀取密碼或 Cookie，也不會代為應徵。</p></section></main>;
}
