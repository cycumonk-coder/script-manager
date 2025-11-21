# Google Sheets 雲端儲存設定指南

本專案已整合 Google Sheets API，可以將您的劇本資料自動同步到 Google 雲端，避免重新整理後資料遺失。

## 設定步驟

### 1. 創建 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊「建立專案」或選擇現有專案
3. 為專案命名（例如：「劇本管理平台」）

### 2. 啟用必要的 API

在 Google Cloud Console 中：

1. 前往「API 和服務」>「程式庫」
2. 搜尋並啟用以下 API：
   - **Google Sheets API**
   - **Google Drive API**

### 3. 創建 OAuth 2.0 客戶端 ID

1. 前往「API 和服務」>「憑證」
2. 點擊「建立憑證」>「OAuth 用戶端 ID」
3. 如果這是首次建立，可能需要先設定 OAuth 同意畫面：
   - 選擇「外部」
   - 填寫應用程式資訊（應用程式名稱、用戶支援電子郵件等）
   - 點擊「儲存並繼續」
   - 在「範圍」頁面點擊「儲存並繼續」
   - 在「測試使用者」頁面，添加您自己的 Google 帳號
   - 完成設定
4. 回到「憑證」頁面，點擊「建立憑證」>「OAuth 用戶端 ID」
5. 選擇應用程式類型：「網頁應用程式」
6. 填寫名稱（例如：「劇本管理平台」）
7. 在「已授權的 JavaScript 來源」中添加：
   - `http://localhost:3001`（開發環境）
   - 您的生產環境網址（如果已部署）
8. 點擊「建立」
9. 複製「用戶端 ID」（Client ID）

### 4. 在應用程式中設定 Client ID

1. 啟動應用程式後，在頂部會看到「Google Sheets 認證」區塊
2. 如果尚未設定 Client ID，會顯示設定介面
3. 將剛才複製的 Client ID 貼上並點擊「設定」

### 5. 授權應用程式

1. 點擊「連接到 Google」按鈕
2. 選擇您要使用的 Google 帳號
3. 授權應用程式訪問 Google Sheets 和 Google Drive
4. 系統會自動創建一個新的 Google Sheet 來儲存您的資料

## 使用方式

### 自動同步

設定完成後，您的劇本資料會自動同步到 Google Sheets：

- **即時備份**：每次修改資料後，系統會在 1 秒內自動保存到 Google Sheets
- **自動載入**：重新整理頁面或下次開啟時，系統會自動從 Google Sheets 載入最新資料
- **本地備份**：資料同時保存在瀏覽器的 localStorage 中，作為雙重保障

### 資料結構

所有資料儲存在一個名為「ScriptData」的工作表中：

- `scriptData`: 專案基本資料（片名、中心思想、截止日期等）
- `outline`: 劇本大綱
- `scenes`: 所有場次內容
- `characters`: 角色資訊
- `connections`: 角色關係圖
- `lastUpdated`: 最後更新時間

### 手動設定 Google Sheet ID

如果您想使用現有的 Google Sheet：

1. 在 Google Sheets 中開啟或創建您要使用的 Sheet
2. 從網址中複製 Sheet ID（網址格式：`https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`）
3. 在應用程式的認證區塊中點擊「更換」
4. 貼上 Sheet ID 並點擊「設定」

## 安全提示

- ⚠️ **重要**：Client ID 儲存在瀏覽器的 localStorage 中，僅用於前端認證
- 🔒 **訪問令牌**：認證後獲得的訪問令牌也僅儲存在本地，不會上傳到任何伺服器
- 📋 **資料隱私**：您的劇本資料僅儲存在您自己的 Google Sheet 中，完全由您控制
- 🔑 **權限管理**：如需撤銷應用程式的訪問權限，可前往 [Google 帳號管理](https://myaccount.google.com/permissions)

## 故障排除

### 無法連接到 Google

- 確認 Client ID 設定正確
- 確認已啟用 Google Sheets API 和 Google Drive API
- 確認在 OAuth 同意畫面中添加了您的 Google 帳號作為測試使用者

### 資料無法同步

- 檢查瀏覽器控制台是否有錯誤訊息
- 確認已成功授權應用程式
- 確認 Google Sheet ID 設定正確
- 嘗試登出後重新連接

### 重新整理後資料不見

- 確認已成功連接到 Google Sheets（認證區塊顯示「已連接」）
- 確認資料已保存到 Google Sheets（可在 Google Sheets 中查看）
- 如果使用新的瀏覽器或清除快取，需要重新授權

## 技術細節

- 使用 **Google Identity Services** 進行 OAuth 2.0 認證
- 使用 **Google Sheets API v4** 進行資料讀寫
- 所有 API 請求直接在瀏覽器中執行，無需後端伺服器
- 資料以 JSON 格式儲存在 Google Sheets 中

