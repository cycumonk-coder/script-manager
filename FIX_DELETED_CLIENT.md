# 🔧 修復 "401: deleted_client" 錯誤指南

## 錯誤說明

當您看到以下錯誤時：
```
401：deleted_client
要求詳情： flowName=GeneralOAuthFlow
```

這表示您使用的 Google OAuth 2.0 客戶端 ID 已被刪除或無效。

---

## ✅ 解決方案：重新創建 OAuth 客戶端 ID

### 步驟 1：前往 Google Cloud Console

1. 前往 [Google Cloud Console - 憑證](https://console.cloud.google.com/apis/credentials)
2. 選擇您的專案（或創建新專案）
3. 確認已啟用以下 API：
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**

---

### 步驟 2：設定 OAuth 同意畫面

如果還沒有設定：

1. 點擊左側選單「**OAuth 同意畫面**」
2. 選擇「**外部**」（除非您的組織使用 Google Workspace）
3. 填寫應用程式資訊：
   - **應用程式名稱**：劇本管理平台
   - **使用者支援電子郵件**：您的電子郵件
   - **開發人員連絡資訊**：您的電子郵件
4. 點擊「**儲存並繼續**」
5. 在「**測試使用者**」標籤中：
   - 點擊「**新增使用者**」
   - 輸入您的 Google 帳號（例如：cycumonk@gmail.com）
   - 點擊「**新增**」
6. 完成設定

---

### 步驟 3：創建新的 OAuth 2.0 客戶端 ID

1. 前往「**憑證**」頁面
2. 點擊「**建立憑證**」>「**OAuth 用戶端 ID**」
3. 如果這是首次創建，系統會提示設定 OAuth 同意畫面（已完成步驟 2，可跳過）

4. 填寫表單：
   - **應用程式類型**：選擇「**網頁應用程式**」
   - **名稱**：劇本管理平台（或自訂名稱）

5. **⚠️ 重要：設定「已授權的 JavaScript 來源」**
   
   點擊「**新增 URI**」按鈕，添加以下網址：
   
   **本地開發：**
   ```
   http://localhost:3001
   ```
   
   **Vercel 部署：**
   ```
   https://您的專案名稱.vercel.app
   ```
   
   **例如：**
   ```
   https://script-manager-abc123.vercel.app
   ```
   
   **⚠️ 注意事項：**
   - ✅ 必須包含 `https://` 或 `http://`
   - ✅ 不要包含尾隨斜線 `/`
   - ✅ 不要包含路徑（如 `/script`）
   - ✅ 確保端口號正確（本地為 3001）

6. **設定「已授權的重新導向 URI」**（可選，但建議添加）：
   
   如果系統要求，可以添加：
   ```
   http://localhost:3001
   https://您的專案名稱.vercel.app
   ```

7. 點擊「**建立**」

8. **複製 Client ID**：
   - 系統會顯示新創建的 Client ID
   - 格式類似：`123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - **⚠️ 立即複製並保存**（稍後無法查看完整 ID）

---

### 步驟 4：在應用程式中更新 Client ID

#### 方法 A：透過應用程式介面（推薦）

1. 打開您的應用程式（本地或 Vercel）
2. 找到「**設置 Google Client ID**」或「**Google 雲端連接**」區域
3. 點擊「**設置 Client ID**」或「**更換**」按鈕
4. 輸入新創建的 Client ID
5. 點擊「**設定**」或「**保存**」
6. 重新整理頁面

#### 方法 B：清除並重新設定（如果方法 A 不可用）

在瀏覽器控制台（F12 > Console）執行：

```javascript
// 清除舊的 Client ID
localStorage.removeItem('google_client_id');
localStorage.removeItem('google_access_token');
localStorage.removeItem('google_sheet_id');

// 重新整理頁面
location.reload();
```

然後在應用程式中重新輸入新的 Client ID。

---

### 步驟 5：驗證設定

1. 確認 Client ID 格式正確：
   - 包含 `.apps.googleusercontent.com`
   - 沒有多餘的空格或換行
   - 完整且正確

2. 在 Google Cloud Console 確認：
   - ✅ OAuth 客戶端狀態為「**已啟用**」
   - ✅ 「已授權的 JavaScript 來源」包含正確的網址
   - ✅ 應用程式類型為「**網頁應用程式**」

3. 重新嘗試連接 Google：
   - 點擊「**連接到 Google**」按鈕
   - 授權應用程式訪問您的 Google 帳號
   - 應該成功連接

---

## 🔍 常見問題

### Q1: 為什麼會出現 "deleted_client" 錯誤？

**可能原因：**
- OAuth 客戶端在 Google Cloud Console 中被刪除
- 使用錯誤或無效的 Client ID
- Client ID 屬於其他專案或帳號

**解決方案：** 按照上述步驟重新創建 OAuth 客戶端。

---

### Q2: 我已經添加了 localhost:3001，但 Vercel 部署還是不行？

**原因：** Vercel 使用 HTTPS 和不同的網址，需要在「已授權的 JavaScript 來源」中添加 Vercel 網址。

**解決方案：**
1. 在 Google Cloud Console 中編輯 OAuth 客戶端
2. 添加您的 Vercel 網址（格式：`https://您的專案名稱.vercel.app`）
3. 保存並等待 1-2 分鐘讓更改生效
4. 重新嘗試連接

---

### Q3: 如何找到我的 Vercel 網址？

**方法 1：查看 Vercel 儀表板**
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 在「**Overview**」頁面查看「**Domains**」
4. 會顯示類似：`https://script-manager-abc123.vercel.app`

**方法 2：查看瀏覽器網址列**
- 直接查看您訪問應用程式的完整網址

---

### Q4: 創建了新的 Client ID，但還是出現錯誤？

**檢查清單：**
- [ ] Client ID 格式正確（包含 `.apps.googleusercontent.com`）
- [ ] 已在「已授權的 JavaScript 來源」中添加正確的網址（包括 Vercel 網址）
- [ ] 應用程式類型為「網頁應用程式」
- [ ] 已清除瀏覽器的 localStorage 並重新輸入 Client ID
- [ ] 已等待 1-2 分鐘讓 Google 設定生效
- [ ] 已重新整理頁面

**如果仍有問題：**
1. 檢查瀏覽器控制台的完整錯誤訊息
2. 確認 Vercel 網址是否正確添加到 Google Cloud Console
3. 嘗試清除瀏覽器快取和 cookies
4. 確認當前網址與「已授權的 JavaScript 來源」中的網址完全一致

---

### Q5: 本地開發正常，但 Vercel 部署失敗？

**原因：** Vercel 使用 HTTPS 和不同的網址，OAuth 客戶端需要配置兩個來源。

**解決方案：**
在「已授權的 JavaScript 來源」中**同時添加**：
1. `http://localhost:3001`（本地開發）
2. `https://您的專案名稱.vercel.app`（Vercel 部署）

---

## 📝 快速檢查清單

完成以下所有項目後，錯誤應該會被解決：

- [ ] ✅ 已在 Google Cloud Console 創建新的 OAuth 2.0 客戶端 ID
- [ ] ✅ OAuth 同意畫面已設定並添加測試使用者
- [ ] ✅ 「已授權的 JavaScript 來源」包含 `http://localhost:3001`
- [ ] ✅ 「已授權的 JavaScript 來源」包含 Vercel 網址（如果部署到 Vercel）
- [ ] ✅ 應用程式類型為「網頁應用程式」
- [ ] ✅ 已清除舊的 Client ID 並輸入新的 Client ID
- [ ] ✅ 已清除瀏覽器快取和 localStorage
- [ ] ✅ 已等待 1-2 分鐘讓 Google 設定生效
- [ ] ✅ 已重新整理頁面並重新嘗試連接

---

## 🆘 仍然無法解決？

如果按照上述步驟操作後仍然出現錯誤，請提供以下資訊：

1. **完整的錯誤訊息**（從瀏覽器控制台複製）
2. **當前使用的 Client ID**（前幾個字元即可，例如：`123456789-...`）
3. **當前網址**（localhost 或 Vercel 網址）
4. **「已授權的 JavaScript 來源」中的網址列表**（截圖或文字）
5. **應用程式類型**（應為「網頁應用程式」）

---

## 📚 相關連結

- [Google Cloud Console - 憑證](https://console.cloud.google.com/apis/credentials)
- [Google Cloud Console - OAuth 同意畫面](https://console.cloud.google.com/apis/credentials/consent)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Google OAuth 2.0 文檔](https://developers.google.com/identity/protocols/oauth2)

---

**最後更新：** 2024

