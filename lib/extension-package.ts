import { zipSync, strToU8 } from 'fflate';
import bridge from '../extension/bridge.js?raw';
import background from '../extension/background.js?raw';
import collector from '../extension/collector.js?raw';
export const SITE_ORIGIN='https://career-compass-104.attewfg.chatgpt.site';
export const EXTENSION_VERSION='2.0.0';
export function extensionZip(origin=SITE_ORIGIN) {
  if(![SITE_ORIGIN,'http://localhost:5175'].includes(origin)) throw new Error('Unknown site origin');
  const manifest={manifest_version:3,name:'104 職涯羅盤更新助手',version:EXTENSION_VERSION,description:'讀取公開 104 搜尋卡片並送回你的職涯羅盤帳戶，應徵由本人操作。',permissions:['scripting'],host_permissions:['https://www.104.com.tw/*'],background:{service_worker:'background.js'},content_scripts:[{matches:[origin+'/*'],js:['bridge.js']}],action:{default_title:'請在職涯羅盤網站按更新'}};
  return zipSync({'manifest.json':strToU8(JSON.stringify(manifest,null,2)),'bridge.js':strToU8(bridge),'background.js':strToU8(background),'collector.js':strToU8(collector),'安裝說明.txt':strToU8(`104 職涯羅盤更新助手 ${EXTENSION_VERSION}\n1. 解壓縮此 ZIP，請保留資料夾。\n2. Chrome 開啟 chrome://extensions；Edge 開啟 edge://extensions。\n3. 開啟開發人員模式，選「載入未封裝項目」，選擇剛才解壓縮的資料夾。\n4. 返回 ${origin}，重新整理網頁並按「更新 104 職缺」。\n更新版本：重新下載，解壓縮並替換原資料夾內容，再到擴充功能頁按重新載入。\n此助手不讀取 104 密碼或 Cookie，不代為應徵。手機僅可查看與管理網站資料。`)},{level:6});
}
