# 驗收紀錄（2026-09-23）

## 已通過

- TypeScript：`node node_modules/typescript/bin/tsc --noEmit`。
- 正式編譯：`npm run build`，Worker 與前端資產成功生成。
- 核心：`node scripts/test.mjs`，6 組測試全部通過，涵蓋評分、欄位驗證、兩帳戶隔離、50 筆／前 10 名、重複匯入、人工狀態與備註、批次交易回復、刪帳與空結果。
- API：`node scripts/test-http.mjs`，以實際編譯 Worker 與獨立 Miniflare D1 測試未登入拒絕、跨來源拒絕、擁有者注入拒絕、跨帳戶 ID 拒絕、50 筆、歷史紀錄、受保護 ZIP 及刪除資料。
- 瀏覽器：`node scripts/test-browser.mjs`，使用 Edge 獨立 headless context，測試 PDF、DOCX、TXT、超過 20 MiB 拒絕、確認文字儲存／重載、手動投遞、備註、歷史分頁與 390px 手機無水平溢出。
- 助手：`node scripts/test-extension.mjs`，執行真實 background／collector 腳本並以合成 104 HTML 測試三頁／50 筆、日期未知、驗證頁停止、空結果、非法來源拒絕及合法 sender.url 缺少 Tab.url 的訊息。
- 錯誤恢復：`node scripts/test-recovery.mjs`，首個 profile 請求模擬 503，再按「重新讀取」可開啟設定；先確認舊實作失敗，再修正通過。
- WebMCP：以注入的相容 registry 驗證工具名稱、有效／無效輸入及資料讀回；未驗證原生瀏覽器 WebMCP 實作。

## 限制與尚待真人驗收

- 未將合成頁測試視為真實 104 讀取成功率。90% 目標須以熟人測試的實際批次統計；104 驗證與 DOM 改版會影響結果。
- 未自動登入兩個真實 ChatGPT 帳戶。帳戶隔離已在伺服器與資料庫層以合成身份驗證，真人跨裝置登入仍需試用者確認。
- ZIP 內容與執行腳本已驗證，但未在使用者既有瀏覽器中安裝擴充功能。
- 低優先限制：操作詳情目前只顯示最近 100 筆歷史；極快速切換兩筆詳情時，歷史回應可能短暫顯示前筆結果。紀錄保存與帳戶隔離不受影響。
- Windows 的 Sites build helper 遇 npm.cmd 路徑錯誤，改用相同專案 `npm run build` 成功產生輸出；發布沿用已驗證輸出。
- Wrangler 開發代理在錯誤來源探測後出現重載干擾；正式 Worker 直接在獨立 Miniflare 執行相同驗收全部通過，未把代理錯誤當作通過。
