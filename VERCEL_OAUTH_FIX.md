# 🔧 修復 Vercel 部署後的 OAuth 重定向錯誤

## 問題描述

部署到 Vercel 後，登入時出現以下錯誤：
```
已封鎖存取權：這個應用程式的要求無效
發生錯誤 400： redirect_uri_mismatch
```

## 原因

Google OAuth 2.0 需要在 Google Cloud Console 中設置「已授權的 JavaScript 來源」和「已授權的重新導向 URI」。當您部署到 Vercel 後，需要使用新的網址，但 Google Cloud Console 中還沒有添加這個網址。

## 解決步驟

### 步驟 1：獲取您的 Vercel 網址

1. 登入 Vercel 控制台：https://vercel.com/dashboard
2. 找到您的專案
3. 複製部署網址，格式通常是：
   - `https://your-project-name.vercel.app`
   - 或您的自定義域名

### 步驟 2：更新 Google Cloud Console 設置

1. **前往 Google Cloud Console**
   - 打開：https://console.cloud.google.com/apis/credentials
   - 確保選擇了正確的專案

2. **找到 OAuth 2.0 客戶端 ID**
   - 在「憑證」頁面中找到您的 OAuth 2.0 客戶端 ID
   - 點擊客戶端 ID 名稱或右側的「編輯」圖標

3. **添加已授權的 JavaScript 來源**
   
   在「已授權的 JavaScript 來源」區塊中，點擊「+ 新增 URI」，然後添加：
   ```
   https://your-project-name.vercel.app
   http://localhost:3001
   https://localhost:3001
   ```
   
   ⚠️ **重要提示：**
   - 不要包含尾隨斜線（`/`）
   - 確保使用正確的協議（`https://` 或 `http://`）
   - 如果有多個 Vercel 部署（預覽、生產），都要添加

4. **添加已授權的重新導向 URI**
   
   在「已授權的重新導向 URI」區塊中，點擊「+ 新增 URI」，然後添加：
   ```
   https://your-project-name.vercel.app
   https://your-project-name.vercel.app/
   http://localhost:3001
   http://localhost:3001/
   ```
   
   ⚠️ **注意：**
   - 這裡可以包含尾隨斜線
   - 添加根路徑和帶斜線的版本

5. **儲存設定**
   - 點擊底部的「儲存」按鈕
   - 等待 1-2 分鐘讓設定生效

### 步驟 3：測試

1. 清除瀏覽器快取和 Cookie
2. 重新整理 Vercel 部署的網頁
3. 嘗試登入

## 完整範例

假設您的 Vercel 網址是：`https://script-manager.vercel.app`

### 已授權的 JavaScript 來源：
```
https://script-manager.vercel.app
http://localhost:3001
https://localhost:3001
```

### 已授權的重新導向 URI：
```
https://script-manager.vercel.app
https://script-manager.vercel.app/
http://localhost:3001
http://localhost:3001/
```

## 如果使用自定義域名

如果您在 Vercel 中設置了自定義域名（例如：`https://yourdomain.com`），也需要添加：

### 已授權的 JavaScript 來源：
```
https://yourdomain.com
https://www.yourdomain.com
https://script-manager.vercel.app
http://localhost:3001
```

### 已授權的重新導向 URI：
```
https://yourdomain.com
https://yourdomain.com/
https://www.yourdomain.com
https://www.yourdomain.com/
https://script-manager.vercel.app
https://script-manager.vercel.app/
http://localhost:3001
http://localhost:3001/
```

## 常見問題

### Q: 為什麼需要等待 1-2 分鐘？
A: Google 的設定需要時間同步到所有伺服器。通常 1-2 分鐘內會生效，但有時可能需要更長時間。

### Q: 我添加了網址但還是出現錯誤？
A: 請檢查：
1. 網址是否完全正確（包括協議、域名、沒有多餘的斜線）
2. 是否點擊了「儲存」按鈕
3. 是否等待了足夠的時間
4. 是否清除了瀏覽器快取

### Q: 預覽部署（Preview Deployments）也需要添加嗎？
A: 如果您需要測試預覽部署，可以添加。但通常只需要添加生產環境的網址即可。

### Q: 我可以使用通配符嗎？
A: 不可以。Google OAuth 不支援通配符，必須明確列出每個網址。

## 驗證設定

設定完成後，您可以：

1. 在 Google Cloud Console 中確認所有網址都已正確添加
2. 清除瀏覽器快取
3. 在無痕模式下測試登入
4. 檢查瀏覽器控制台是否有其他錯誤訊息

## 需要幫助？

如果問題持續存在，請檢查：
- 瀏覽器控制台的完整錯誤訊息
- Google Cloud Console 中的設定是否正確
- Vercel 部署的網址是否正確

