# 104 職涯羅盤

104 職涯羅盤是一個求職管理工具，用來整理 104 職缺、依照個人履歷與搜尋條件計算匹配分數，並記錄職缺閱讀、篩除與已投遞狀態。

此專案不是 104 官方整合。職缺資料由使用者透過桌面瀏覽器更新助手讀取，實際應徵仍需回到 104 網站自行操作。

## 功能特色

- 使用 ChatGPT 登入，每位使用者擁有獨立資料。
- 可設定履歷文字、期望職稱、技能、地區、排除關鍵字、年資與最低薪資。
- 支援上傳 PDF、DOCX、TXT 履歷並解析文字。
- 透過 Chrome / Edge 更新助手讀取 104 職缺。
- 依照條件計算職缺匹配分數與命中原因。
- 自動篩除明顯不符合條件的職缺，並保留篩除原因。
- 支援職缺狀態管理：未讀取、已讀、已投遞、篩除。
- 提供最新職缺、未讀取與已讀、歷史應徵紀錄、篩除內容四個頁籤。
- 可搜尋職稱、公司、備註與篩除原因。
- 可刪除帳戶主資料。

## 使用流程

1. 開啟網站並使用 ChatGPT 登入。
2. 進入「履歷與搜尋條件」。
3. 上傳或貼上履歷文字，填寫期望職稱、技能、地區等條件。
4. 下載更新助手 ZIP。
5. 將 ZIP 解壓縮後，在 Chrome / Edge 以開發人員模式載入擴充功能資料夾。
6. 回到網站按下「更新 104 職缺」。
7. 如遇 104 驗證，需在 104 頁面自行完成後再重試。
8. 在網站查看推薦、篩除原因與應徵狀態。
9. 點擊職缺前往 104 查看完整內容並自行投遞。

手機可查看與管理資料；更新 104 職缺需使用已安裝更新助手的桌面 Chrome / Edge。

## 技術架構

- Framework：Next.js / Vinext
- Runtime：Cloudflare Workers
- Database：Cloudflare D1
- ORM：Drizzle ORM
- UI：React、Tailwind CSS、shadcn/ui 類型元件
- Auth：ChatGPT Sign-In / Sites identity headers
- Extension：Chrome / Edge extension
- Validation：Zod
- Resume parsing：PDF、DOCX、TXT 文字解析

## 專案結構

```txt
app/                 網站頁面、Dashboard、API route
app/api/             後端 API 入口
app/assistant/       更新助手下載頁面
components/          UI 元件
db/                  D1 / Drizzle schema
drizzle/             Drizzle migration
lib/                 媒合邏輯、履歷解析、資料存取、驗證
scripts/             安裝、建置、測試與本機執行腳本
```

## 本機開發

### 環境需求

- Node.js `>=22.13.0`
- npm

### 安裝依賴

```sh
npm run install:ci
```

### 啟動開發伺服器

```sh
npm run dev
```

開發模式預設使用 Vinext / Vite。若需要指定連接埠，可使用：

```sh
npm run dev -- --port 5173
```

### 建置

```sh
npm run build
```

### 啟動本機 Worker 預覽

```sh
npm run start
```

此指令會使用 Wrangler 在本機預覽建置後的 Worker。

## 資料庫與 Migration

產生 Drizzle migration：

```sh
npm run db:generate
```

若使用本機 D1 預覽，需先建置產生 `dist/server/wrangler.json`，再用 Wrangler 套用 migration。

範例：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

`DB` 需與實際 D1 binding 名稱一致。

## 測試

核心測試：

```sh
node scripts/test.mjs
```

HTTP / Worker 測試：

```sh
node scripts/test-http.mjs
```

瀏覽器測試：

```sh
node scripts/test-browser.mjs
```

擴充功能測試：

```sh
node scripts/test-extension.mjs
```

TypeScript 型別檢查：

```sh
node node_modules/typescript/bin/tsc --noEmit
```

## 媒合規則概念

系統會根據使用者條件與職缺內容計算匹配分數。主要參考項目包含：

- 技能命中
- 職稱相似度
- 履歷描述相似度
- 年資要求
- 薪資條件
- 地區條件
- 排除關鍵字

分數是排序與篩選用的參考指標，不代表錄取機率。

## 資料與隱私

- 每位使用者資料以 ChatGPT 提供的穩定使用者 ID 區分。
- 前端不能指定資料擁有者，API 會由伺服器端身份判斷。
- 履歷原始檔不送到伺服器；系統保存解析後的文字與設定。
- 可刪除帳戶主資料。
- 測試資料、瀏覽器 Cookie、node_modules、建置快取與本機狀態不應提交到 Git。

## 注意事項

- 本專案不是 104 官方服務。
- 更新助手只用來協助讀取職缺列表，不會代替使用者投遞履歷。
- 職缺內容、薪資、地點與條件仍以 104 網站實際頁面為準。
- 若 104 網頁結構改變，更新助手可能需要調整。

## 常用指令

```sh
npm run install:ci      # 安裝依賴
npm run dev             # 啟動開發伺服器
npm run build           # 建置專案
npm run start           # 本機預覽 Worker
npm run lint            # ESLint 檢查
npm run db:generate     # 產生 Drizzle migration
```
