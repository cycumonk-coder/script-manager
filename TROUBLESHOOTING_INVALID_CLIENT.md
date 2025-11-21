# 解決 invalid_client 錯誤指南

## 錯誤訊息
```
錯誤 401：invalid_client
要求詳情： flowName=GeneralOAuthFlow
```

## 可能原因和解決方案

### ✅ 解決方案 1：檢查「已授權的 JavaScript 來源」

**這是最常見的原因！**

1. 前往 [Google Cloud Console - 憑證](https://console.cloud.google.com/apis/credentials)
2. 找到您的 OAuth 2.0 客戶端 ID：`859362486554-eohfkl8ej49qih16sasodn833q4som9t`
3. 點擊編輯（鉛筆圖示 ✏️）
4. 檢查「**已授權的 JavaScript 來源**」：
   
   **必須包含：**
   ```
   http://localhost:3001
   ```
   
   ⚠️ **重要：**
   - 不要包含尾隨斜線 `/`（錯誤：`http://localhost:3001/`）
   - 確保端口號是 3001
   - 使用 `http://` 不是 `https://`
   - 不要包含其他路徑（如 `/script`）

5. 如果沒有，點擊「**新增 URI**」並添加：`http://localhost:3001`
6. 點擊「**儲存**」
7. **等待 1-2 分鐘**讓更改生效
8. 回到應用程式重新嘗試

---

### ✅ 解決方案 2：確認應用程式類型

1. 在編輯 OAuth 客戶端頁面
2. 確認「**應用程式類型**」是「**網頁應用程式**」
3. 如果是「桌面應用程式」或其他類型，請：
   - 刪除這個客戶端
   - 重新創建一個「**網頁應用程式**」類型的客戶端

---

### ✅ 解決方案 3：檢查 OAuth 同意畫面

1. 前往 [OAuth 同意畫面](https://console.cloud.google.com/apis/credentials/consent)
2. 確認已設定完成（不是「草稿」狀態）
3. 點擊「**測試使用者**」標籤
4. 確認您的 Google 帳號（cycumonk@gmail.com）在列表中
5. 如果不在，點擊「**新增使用者**」添加

---

### ✅ 解決方案 4：清除瀏覽器快取

有時候瀏覽器會快取舊的認證資訊：

1. **Chrome/Edge：**
   - 按 `F12` 打開開發者工具
   - 右鍵點擊重新整理按鈕
   - 選擇「**清除快取並強制重新整理**」

2. **或手動清除：**
   - 按 `F12` 打開開發者工具
   - 前往「**Application**」（應用程式）標籤
   - 左側選擇「**Local Storage**」> `http://localhost:3001`
   - 刪除以下項目：
     - `google_client_id`
     - `google_access_token`
     - `google_sheet_id`
   - 重新整理頁面

---

### ✅ 解決方案 5：檢查 Client ID 是否正確

確認 Client ID 完整且正確：

**正確格式：**
```
859362486554-eohfkl8ej49qih16sasodn833q4som9t.apps.googleusercontent.com
```

**確認：**
- ✅ 包含完整的前後綴
- ✅ 包含 `.apps.googleusercontent.com`
- ✅ 沒有多餘的空格或換行

在瀏覽器控制台檢查：
1. 按 `F12` 打開開發者工具
2. 前往「**Console**」（控制台）標籤
3. 輸入：`localStorage.getItem('google_client_id')`
4. 確認顯示的是完整的 Client ID

---

### ✅ 解決方案 6：確認 API 已啟用

1. 前往 [API 程式庫](https://console.cloud.google.com/apis/library)
2. 搜尋「**Google Sheets API**」
3. 確認顯示「**已啟用**」
4. 搜尋「**Google Drive API**」
5. 確認顯示「**已啟用**」

如果未啟用，點擊「**啟用**」按鈕

---

### ✅ 解決方案 7：檢查專案是否正確

1. 確認您在正確的 Google Cloud 專案中
2. 在頂部導航欄檢查專案名稱
3. 如果有多個專案，確認 OAuth 客戶端是在正確的專案中創建的

---

## 逐步診斷

### 步驟 1：檢查 Google Cloud Console 設定

```
1. ✅ 專案已創建
2. ✅ Google Sheets API 已啟用
3. ✅ Google Drive API 已啟用
4. ✅ OAuth 同意畫面已設定
5. ✅ 您的帳號已添加為測試使用者
6. ✅ OAuth 客戶端類型為「網頁應用程式」
7. ✅ 「已授權的 JavaScript 來源」包含 http://localhost:3001
```

### 步驟 2：清除應用程式狀態

在瀏覽器控制台（F12 > Console）執行：

```javascript
// 清除所有 Google 相關的本地儲存
localStorage.removeItem('google_client_id');
localStorage.removeItem('google_access_token');
localStorage.removeItem('google_sheet_id');

// 重新整理頁面
location.reload();
```

### 步驟 3：重新嘗試連接

1. 重新整理頁面
2. 確認 Client ID 已自動設置
3. 點擊「連接到 Google」
4. 如果仍有錯誤，檢查瀏覽器控制台的完整錯誤訊息

---

## 如果仍然無法解決

### 收集除錯資訊

1. 按 `F12` 打開開發者工具
2. 前往「**Console**」（控制台）標籤
3. 嘗試連接 Google
4. 複製所有錯誤訊息（紅色文字）

### 檢查項目

提供以下資訊以便進一步診斷：

1. **Client ID**（前幾個字元即可）：`859362486554-...`
2. **當前網址**：應該是 `http://localhost:3001`
3. **瀏覽器控制台的完整錯誤訊息**
4. **已授權的 JavaScript 來源**中是否有 `http://localhost:3001`
5. **應用程式類型**是否為「網頁應用程式」

---

## 常見錯誤訊息對照

| 錯誤訊息 | 原因 | 解決方案 |
|---------|------|---------|
| `invalid_client` | Client ID 錯誤或未配置 JavaScript 來源 | 檢查 Client ID 和 JavaScript 來源 |
| `access_denied` | 用戶拒絕授權 | 重新嘗試並點擊「允許」 |
| `redirect_uri_mismatch` | 重新導向 URI 不匹配 | 檢查 JavaScript 來源設定 |
| `unauthorized_client` | 客戶端未授權 | 檢查應用程式類型和設定 |

---

## 快速修復檢查清單

在重新嘗試之前，請確認：

- [ ] Google Cloud Console 中「已授權的 JavaScript 來源」包含 `http://localhost:3001`
- [ ] 已點擊「儲存」並等待 1-2 分鐘
- [ ] 應用程式類型為「網頁應用程式」
- [ ] OAuth 同意畫面已設定並添加測試使用者
- [ ] 已清除瀏覽器快取和 localStorage
- [ ] 已重新整理頁面
- [ ] Client ID 格式正確（包含 .apps.googleusercontent.com）

完成以上所有項目後，再次嘗試連接。

