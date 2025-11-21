# Google 雲端同步設定步驟（詳細版）

## 您需要準備的資料

只需要 **一個** 資料：**Google OAuth 2.0 Client ID**

格式：`xxxxx.apps.googleusercontent.com`

---

## 完整設定步驟

### 步驟 1：前往 Google Cloud Console

1. 打開瀏覽器，前往：https://console.cloud.google.com/
2. 登入您的 Google 帳號（cycumonk@gmail.com）

### 步驟 2：創建或選擇專案

1. 點擊頂部專案選擇器（顯示目前專案名稱的下拉選單）
2. 點擊「**新增專案**」
3. 輸入專案名稱（例如：「劇本管理平台」）
4. 點擊「**建立**」
5. 等待專案建立完成（約 10-30 秒）

### 步驟 3：啟用必要的 API

1. 在左側選單中，點擊「**API 和服務**」>「**程式庫**」
2. 在搜尋框中輸入「**Google Sheets API**」
3. 點擊「**Google Sheets API**」
4. 點擊「**啟用**」按鈕
5. 返回程式庫，搜尋「**Google Drive API**」
6. 點擊「**Google Drive API**」
7. 點擊「**啟用**」按鈕

✅ 完成後，兩個 API 都應該顯示「已啟用」狀態

### 步驟 4：設定 OAuth 同意畫面（第一次使用需要）

1. 在左側選單中，點擊「**API 和服務**」>「**OAuth 同意畫面**」
2. 選擇「**外部**」（除非您有 Google Workspace 帳號）
3. 點擊「**建立**」

**填寫應用程式資訊：**
- **應用程式名稱**：劇本管理平台（或您想要的名稱）
- **使用者支援電子郵件**：選擇您的電子郵件（cycumonk@gmail.com）
- **應用程式標誌**：（選填，可跳過）
- **應用程式的網域**：（選填，可跳過）
- **授權的網域**：（選填，可跳過）
- **開發人員連絡資訊**：輸入您的電子郵件

4. 點擊「**儲存並繼續**」

**設定範圍（Scopes）：**
1. 點擊「**新增或移除範圍**」
2. 在搜尋框中輸入「spreadsheets」
3. 勾選「**.../auth/spreadsheets**」（Google Sheets API）
4. 搜尋「drive.file」
5. 勾選「**.../auth/drive.file**」（Google Drive API）
6. 點擊「**更新**」
7. 點擊「**儲存並繼續**」

**新增測試使用者：**
1. 點擊「**新增使用者**」
2. 輸入您的 Google 帳號：**cycumonk@gmail.com**
3. 點擊「**新增**」
4. 點擊「**儲存並繼續**」

**摘要：**
1. 檢查所有資訊是否正確
2. 點擊「**返回儀表板**」

✅ OAuth 同意畫面設定完成

### 步驟 5：建立 OAuth 2.0 客戶端 ID

1. 在左側選單中，點擊「**API 和服務**」>「**憑證**」
2. 點擊頂部的「**建立憑證**」按鈕
3. 選擇「**OAuth 用戶端 ID**」

**如果這是首次建立 OAuth 客戶端，系統可能會提示：**
- 選擇「**設定 OAuth 同意畫面**」（如果尚未完成）
- 按照上面的步驟完成設定後再回到這裡

**建立 OAuth 客戶端 ID：**
1. **應用程式類型**：選擇「**網頁應用程式**」
2. **名稱**：輸入「劇本管理平台」（或您想要的名稱）
3. **已授權的 JavaScript 來源**：
   - 點擊「**新增 URI**」
   - 輸入：`http://localhost:3001`
   - ⚠️ **重要**：不要包含尾隨斜線 `/`
   - ⚠️ **重要**：確保端口號是 3001（或您使用的端口）
4. **已授權的重新導向 URI**：（留空即可，我們使用 Google Identity Services，不需要這個）

5. 點擊「**建立**」

✅ 系統會顯示一個對話框，包含您的 Client ID

### 步驟 6：複製 Client ID

在對話框中，您會看到：

```
用戶端 ID
xxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

用戶端密鑰
xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**您只需要複製「用戶端 ID」**（第一行）

格式應該是：`xxxxx-xxxxx.apps.googleusercontent.com`

---

## 在應用程式中設定

### 步驟 7：在劇本管理平台中輸入 Client ID

1. 打開劇本管理平台（http://localhost:3001）
2. 在頁面頂部，您會看到「**Google Sheets 認證**」區塊
3. 在「**輸入 Google Client ID**」欄位中，貼上剛才複製的 Client ID
4. 點擊「**設定**」按鈕

### 步驟 8：授權應用程式

1. 點擊「**連接到 Google**」按鈕
2. 會彈出 Google 授權視窗
3. 選擇您的 Google 帳號（cycumonk@gmail.com）
4. 檢查授權範圍：
   - ✅ 查看和管理您的 Google 試算表
   - ✅ 查看、編輯、建立和刪除您在 Google 雲端硬碟中的所有檔案
5. 點擊「**允許**」

✅ 授權完成！系統會自動創建一個 Google Sheet 來儲存您的資料

---

## 驗證設定是否成功

### 檢查清單

✅ **應用程式顯示「已連接到 Google 雲端」**
- 在「Google Sheets 認證」區塊中，狀態圖示應該顯示綠色的 ✓
- 狀態文字應該顯示「已連接到 Google 雲端」

✅ **可以看到 Google Sheet ID**
- 應該顯示一個 Sheet ID（例如：1a2b3c4d5e6f7g8h9i0j...）
- 這是系統自動創建的 Google Sheet 的唯一識別碼

✅ **資料自動同步**
- 修改任何劇本資料後，等待約 1 秒
- 資料會自動保存到 Google Sheets
- 重新整理頁面後，資料應該還在

### 在 Google Sheets 中查看資料

1. 前往：https://sheets.google.com/
2. 您應該會看到一個名為「**劇本管理平台**」的新試算表
3. 打開它，您會看到一個名為「**ScriptData**」的工作表
4. 裡面應該包含您的所有劇本資料（以 JSON 格式儲存）

---

## 常見問題

### Q1: 我沒有看到「OAuth 同意畫面」選項
**A:** 這是因為您還沒有建立 OAuth 客戶端。先完成步驟 4，或者系統會在步驟 5 時提示您設定。

### Q2: 錯誤訊息顯示「invalid_client」
**A:** 檢查以下項目：
- Client ID 是否完整（包含 .apps.googleusercontent.com）
- 「已授權的 JavaScript 來源」是否包含 http://localhost:3001
- 應用程式類型是否為「網頁應用程式」
- 是否在「OAuth 同意畫面」中添加了自己為測試使用者

### Q3: 授權後看不到 Google Sheet
**A:** 
- 等待幾秒鐘，讓系統創建 Sheet
- 前往 https://sheets.google.com/ 查看
- 檢查瀏覽器控制台是否有錯誤訊息

### Q4: 資料沒有自動同步
**A:**
- 確認已顯示「已連接到 Google 雲端」
- 檢查瀏覽器控制台是否有錯誤
- 嘗試登出後重新連接

### Q5: 如何更換 Google Sheet？
**A:**
- 在認證區塊中點擊「更換」
- 輸入新的 Google Sheet ID（從 Sheet 的網址中複製）
- 點擊「設定」

---

## 安全提示

🔒 **您的資料完全由您控制**
- 所有資料儲存在您自己的 Google Sheet 中
- 只有您授權的帳號可以訪問
- 可以隨時撤銷應用程式的訪問權限

🔐 **如何撤銷授權**
1. 前往：https://myaccount.google.com/permissions
2. 找到「劇本管理平台」應用程式
3. 點擊「移除存取權」

---

## 總結

您只需要提供：
1. ✅ **Google OAuth 2.0 Client ID**（從 Google Cloud Console 獲取）

其他資料（如 Google Sheet ID）會自動生成和管理。

**設定時間**：約 5-10 分鐘（首次設定）

**之後**：資料會自動同步，無需額外操作

