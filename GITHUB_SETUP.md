# 上傳到 GitHub 的步驟

## 步驟 1: 在 GitHub 上創建新倉庫

1. 前往 [GitHub](https://github.com) 並登入您的帳戶
2. 點擊右上角的 **+** 按鈕，選擇 **New repository**
3. 填寫倉庫資訊：
   - **Repository name**: `script-manager` 或您喜歡的名稱
   - **Description**: `劇本寫作管理系統 - 專為劇本創作者設計的寫作進度管理工具`
   - **Visibility**: 選擇 **Public**（公開）或 **Private**（私有）
   - **不要**勾選 "Initialize this repository with a README"（因為我們已經有文件了）
4. 點擊 **Create repository**

## 步驟 2: 連接本地倉庫到 GitHub

在終端機中執行以下命令（將 `YOUR_USERNAME` 替換為您的 GitHub 用戶名，`YOUR_REPO_NAME` 替換為您創建的倉庫名稱）：

```bash
cd ~/Desktop/劇本管理平台

# 添加遠程倉庫（替換成您的實際 URL）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或者如果您使用 SSH（需要先設置 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送代碼到 GitHub
git branch -M main
git push -u origin main
```

## 步驟 3: 驗證上傳

1. 前往您的 GitHub 倉庫頁面
2. 確認所有文件都已成功上傳
3. 檢查 README.md 是否正確顯示

## 後續更新

當您修改代碼後，可以使用以下命令更新 GitHub：

```bash
cd ~/Desktop/劇本管理平台

# 查看變更
git status

# 添加所有變更
git add .

# 提交變更（請寫清楚這次修改了什麼）
git commit -m "描述您的修改內容"

# 推送到 GitHub
git push
```

## 注意事項

⚠️ **重要**：`.gitignore` 文件已經配置好，以下內容**不會**被上傳到 GitHub：
- `node_modules/` 目錄
- `dist/` 目錄（構建產物）
- `.env` 文件（環境變數，包含 API keys）
- 其他臨時文件和系統文件

✅ **安全提示**：
- 確保您的 API keys 和敏感資訊都在 `.env` 文件中，並且 `.env` 已在 `.gitignore` 中
- 如果意外上傳了敏感資訊，請立即在 GitHub 上刪除該文件並重新生成 API keys

## 常見問題

### Q: 如果提示需要認證怎麼辦？
A: GitHub 現在要求使用 Personal Access Token 或 SSH key。您可以：
1. 使用 Personal Access Token：在 GitHub Settings > Developer settings > Personal access tokens 創建
2. 或設置 SSH key：參考 [GitHub SSH 設置指南](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

### Q: 如何更改遠程倉庫 URL？
A: 使用以下命令：
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### Q: 如何查看遠程倉庫資訊？
A: 使用以下命令：
```bash
git remote -v
```

