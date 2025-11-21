# 部署指南 - 將劇本管理平台發布到網上

## 推薦方案：Vercel（最簡單，免費）

### 優點
- ✅ 完全免費
- ✅ 自動 SSL 證書（HTTPS）
- ✅ 自動部署（當您推送到 GitHub 時）
- ✅ 全球 CDN，速度快
- ✅ 自訂域名支援
- ✅ 零配置，自動偵測 Vite 專案

---

## 部署步驟

### 方法一：透過 Vercel 網頁界面（推薦，最簡單）

#### 步驟 1：登入 Vercel
1. 前往 [Vercel](https://vercel.com)
2. 點擊 **Sign Up** 或 **Log In**
3. 選擇 **Continue with GitHub**（使用您的 GitHub 帳戶登入）

#### 步驟 2：匯入專案
1. 登入後，點擊 **Add New...** → **Project**
2. 在 **Import Git Repository** 中，找到您的 `script-manager` 倉庫
3. 如果沒看到，點擊 **Adjust GitHub App Permissions** 授權 Vercel 訪問您的倉庫
4. 選擇 `cycumonk-coder/script-manager` 倉庫

#### 步驟 3：配置專案
Vercel 會自動偵測這是 Vite 專案，保持以下設置：

- **Framework Preset**: Vite（應該自動偵測）
- **Root Directory**: `./`（根目錄）
- **Build Command**: `npm run build`（自動）
- **Output Directory**: `dist`（自動）
- **Install Command**: `npm install`（自動）

**環境變數**（如果需要，目前不需要設置）：
- 暫時不需要設置任何環境變數

#### 步驟 4：部署
1. 點擊 **Deploy** 按鈕
2. 等待部署完成（通常 1-2 分鐘）
3. 完成後會顯示您的專屬網址，例如：
   ```
   https://script-manager-xxxxx.vercel.app
   ```

#### 步驟 5：自訂域名（可選）
如果您想使用自訂域名（例如：`script-manager.yourdomain.com`）：

1. 在 Vercel 專案頁面，點擊 **Settings** → **Domains**
2. 輸入您的域名
3. 按照指示配置 DNS 記錄

---

### 方法二：使用 Vercel CLI（進階選項）

#### 步驟 1：安裝 Vercel CLI
```bash
npm install -g vercel
```

#### 步驟 2：登入
```bash
vercel login
```

#### 步驟 3：部署
```bash
cd ~/Desktop/劇本管理平台
vercel
```

按照提示操作即可。

---

## 其他部署選項

### 選項 2：Netlify

1. 前往 [Netlify](https://www.netlify.com)
2. 使用 GitHub 登入
3. 點擊 **Add new site** → **Import an existing project**
4. 選擇您的 GitHub 倉庫
5. 設置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. 點擊 **Deploy**

### 選項 3：GitHub Pages

#### 步驟 1：安裝 GitHub Pages 插件
```bash
npm install --save-dev gh-pages
```

#### 步驟 2：更新 package.json
在 `package.json` 中添加：

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://cycumonk-coder.github.io/script-manager"
}
```

#### 步驟 3：更新 vite.config.js
```javascript
export default defineConfig({
  base: '/script-manager/',
  // ... 其他配置
})
```

#### 步驟 4：部署
```bash
npm run deploy
```

---

## 自動部署設置

### Vercel 自動部署（推薦）
一旦連接 GitHub 倉庫後，每次您推送到 GitHub 時，Vercel 會自動重新部署：

```bash
git add .
git commit -m "更新功能"
git push
```

Vercel 會自動：
1. 偵測到 GitHub 有新推送
2. 執行 `npm install`
3. 執行 `npm run build`
4. 部署新版本

---

## 驗證部署

部署成功後：

1. 訪問您獲得的 Vercel 網址（例如：`https://script-manager-xxxxx.vercel.app`）
2. 檢查所有功能是否正常運作
3. 測試：
   - 劇本大綱編輯
   - 場次管理
   - 資料儲存（localStorage）
   - 匯入匯出功能

---

## 常見問題

### Q: 部署後看不到內容或顯示空白頁？
A: 檢查瀏覽器控制台是否有錯誤。可能需要設置 base path。

### Q: 如何更新已部署的版本？
A: 只需推送新的變更到 GitHub，Vercel 會自動重新部署。

### Q: 可以同時部署到多個平台嗎？
A: 可以，但建議只使用一個平台以避免混淆。

### Q: 免費版有限制嗎？
A: Vercel 免費版對個人專案完全足夠，包括：
- 無限個人專案
- 100GB 頻寬/月
- 自動 SSL
- 全球 CDN

---

## 推薦流程

1. ✅ **使用 Vercel 部署**（最簡單）
2. ✅ **測試所有功能**
3. ✅ **設定自動部署**（已自動設定）
4. ✅ **（可選）添加自訂域名**

部署完成後，您就可以隨時隨地訪問您的劇本管理平台了！

