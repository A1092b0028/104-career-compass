# 104 職涯羅盤：多人測試站

## 使用

1. 以 ChatGPT 登入，開啟「履歷與搜尋條件」。
2. 上傳 PDF／DOCX／TXT，核對文字，填寫期望職稱、技能、地區等條件並儲存。
3. 在「下載更新助手」取得 ZIP，解壓缩後以 Chrome／Edge 開發人員模式載入資料夾。
4. 回網站重新整理，按「更新 104 職缺」。遇驗證請自行完成後重試。
5. 點職缺前往 104 自行應徵，回網站手動改成已投遞。手机可查看與管理。

## 已實作

- ChatGPT 登入；每次 API 都檢查伺服器提供的穩定使用者 ID，不接受前端指定資料擁有者。
- D1 保存個人設定、職缺、批次與狀態歷史；R2 未啟用。原始履歷檔不送到伺服器。
- 20 MiB 檔案與 100,000 字文字上限；PDF 超過 200 頁或 DOCX 展開超過 40 MiB 時請改貼文字。
- 媒合規則與本機版同一概念；未知欄位不計入可用權重，分數按資料覆蓋率正規化，因此不是固定缺項扣分。
- 同帳戶更新一次最多 50 筆、最多三頁；每次間隔至少 10 秒，同時最多一個批次，四分鐘逾時可重試。
- D1 交易性批次匯入；相同批次重送不重複入庫。手動狀態、備註與應徵歷史不被重抓覆蓋。
- 四個頁籤、伺服器分頁、關鍵字／篩除來源／原因搜尋、帳戶主資料立即刪除。
- 登入保護的更新助手 ZIP；固定信任正式站點，不接受任意網站指令。
- 月／日缺少年份時顯示日期未知，不自行補年份。

## 維護

- 資料表由 `db/schema.ts` 和 Drizzle 遷移管理。已部署遷移不得重寫；新增遷移後重新建置發布。
- 建置：`npm run build`；型別：`node node_modules/typescript/bin/tsc --noEmit`。
- 核心測試：`node scripts/test.mjs`；編譯後 Worker + 獨立暫存 D1：`node scripts/test-http.mjs`。
- 瀏覽器測試：以 `npm run start -- --port 8788` 啟動編譯版，再執行 `node scripts/test-browser.mjs`。测试使用合成帳戶與既有 workspace Playwright runtime，不使用個人瀏覽器設定檔。
- 擴充功能測試：`node scripts/test-extension.mjs`；透過模擬 104 網頁驗證實際 collector／background 程式。
- 本機 mock 登入僅用於 development，正式版由 Sites dispatch 提供登入；不將本機模擬身份的 Header 設定部署到外網。
- 原始本機 SQLite、瀏覽器 Cookie、個人履歷、測試資料、node_modules 和建置快取均不放進部署來源。
- 網域變更時，更新 `lib/extension-package.ts` 內固定網域並重新下載助手；ZIP 不會自行更新。

## 真實試用尚待驗收

