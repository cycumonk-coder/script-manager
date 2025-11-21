# 在 GitHub 上創建倉庫的詳細步驟

## 方法一：使用網頁界面（推薦）

### 步驟 1：登入 GitHub
1. 打開瀏覽器，前往 https://github.com
2. 登入您的帳戶（用戶名：cycumonk-coder）

### 步驟 2：創建新倉庫
1. 點擊右上角的 **+** 圖標
2. 選擇 **New repository**（新倉庫）

### 步驟 3：填寫倉庫資訊
**重要：請完全按照以下設置**

- **Repository name（倉庫名稱）**: `script-manager` ✅
  - 必須完全一樣：`script-manager`
  
- **Description（描述）**: `劇本寫作管理系統` （可選）

- **Visibility（可見性）**: 
  - 選擇 **Public**（公開）或 **Private**（私有）
  - 建議選擇 **Private** 如果是私人專案

- **重要：不要勾選以下任何選項** ❌
  - ❌ 不要勾選 "Add a README file"
  - ❌ 不要勾選 "Add .gitignore"
  - ❌ 不要勾選 "Choose a license"
  
  **原因**：因為我們已經有這些文件了，如果勾選會產生衝突

### 步驟 4：創建倉庫
點擊綠色的 **Create repository** 按鈕

### 步驟 5：創建完成後
您會看到 GitHub 顯示的指示頁面，**不要**按照那個頁面的指示操作，因為我們已經準備好本地倉庫了。

---

## 方法二：使用 GitHub CLI（如果您已安裝）

如果您已安裝 GitHub CLI，可以使用以下命令：

```bash
gh repo create script-manager --private --source=. --remote=origin --push
```

---

## 創建完成後的下一步

創建倉庫後，在終端機執行：

```bash
cd ~/Desktop/劇本管理平台
git push -u origin main
```

## 如果仍然出現認證錯誤

### 使用 Personal Access Token（推薦）

1. 前往：https://github.com/settings/tokens
2. 點擊 **Generate new token** > **Generate new token (classic)**
3. 填寫：
   - **Note**: `script-manager-push`
   - **Expiration**: 選擇期限（例如 90 days）
   - **Select scopes**: 勾選 **repo**（全部 repo 權限）
4. 點擊 **Generate token**
5. **複製 token**（只會顯示一次！）
6. 推送時：
   ```bash
   git push -u origin main
   # Username: cycumonk-coder
   # Password: 貼上剛才複製的 token（不是您的 GitHub 密碼！）
   ```

### 或使用 SSH（更安全）

```bash
# 檢查是否已有 SSH key
ls -al ~/.ssh

# 如果沒有，生成 SSH key
ssh-keygen -t ed25519 -C "cycumonk@gmail.com"
# 按 Enter 使用預設位置
# 設置 passphrase（可選）

# 複製 public key
cat ~/.ssh/id_ed25519.pub

# 添加到 GitHub: https://github.com/settings/keys
# 點擊 New SSH key，貼上 public key

# 更改 remote URL
git remote set-url origin git@github.com:cycumonk-coder/script-manager.git

# 推送
git push -u origin main
```

## 驗證倉庫是否創建成功

創建後，訪問以下網址應該可以看到倉庫：
https://github.com/cycumonk-coder/script-manager

如果顯示 404，說明倉庫還沒創建或名稱不對。

