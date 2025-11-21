# 解決 GitHub 認證問題 (403 錯誤)

## 問題說明
錯誤訊息顯示：`Permission denied to cycumonk`
這表示 Git 使用了錯誤的用戶名進行認證。

## 解決方法

### 方法一：清除憑證緩存（推薦）

1. **清除 macOS Keychain 中的 GitHub 憑證**：
   
   打開「鑰匙圈存取」（Keychain Access）應用程式：
   - 按 `Cmd + Space` 搜索 "Keychain Access"
   - 在搜索框輸入 "github"
   - 刪除所有與 `github.com` 相關的項目
   - 重新啟動終端機

2. **或使用命令行清除**：
   ```bash
   git credential-osxkeychain erase
   host=github.com
   protocol=https
   ```
   （按 Enter 兩次）

### 方法二：使用 Personal Access Token（最可靠）

1. **生成 Token**：
   - 前往：https://github.com/settings/tokens
   - 點擊 **Generate new token** > **Generate new token (classic)**
   - 填寫：
     - **Note**: `script-manager-push`
     - **Expiration**: 選擇期限（例如 90 days 或 No expiration）
     - **Select scopes**: 勾選 **repo**（全部 repo 權限）
   - 點擊 **Generate token**
   - **立即複製 token**（只會顯示一次！）

2. **推送時使用 Token**：
   ```bash
   git push -u origin main
   ```
   當提示時：
   - **Username**: `cycumonk-coder`
   - **Password**: 貼上剛才複製的 token（**不是您的 GitHub 密碼**）

### 方法三：使用 SSH（最安全，推薦長期使用）

1. **檢查是否已有 SSH key**：
   ```bash
   ls -al ~/.ssh
   ```

2. **如果沒有 SSH key，生成一個**：
   ```bash
   ssh-keygen -t ed25519 -C "cycumonk@gmail.com"
   ```
   - 按 Enter 使用預設位置
   - 設置 passphrase（可選，建議設置以增加安全性）

3. **複製 public key**：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   複製輸出的全部內容

4. **添加到 GitHub**：
   - 前往：https://github.com/settings/keys
   - 點擊 **New SSH key**
   - **Title**: `Mac - Script Manager`
   - **Key**: 貼上剛才複製的 public key
   - 點擊 **Add SSH key**

5. **測試 SSH 連接**：
   ```bash
   ssh -T git@github.com
   ```
   應該看到：`Hi cycumonk-coder! You've successfully authenticated...`

6. **更改 remote URL 為 SSH**：
   ```bash
   git remote set-url origin git@github.com:cycumonk-coder/script-manager.git
   ```

7. **推送**：
   ```bash
   git push -u origin main
   ```

## 驗證是否修復

推送成功後，訪問以下網址應該能看到您的代碼：
https://github.com/cycumonk-coder/script-manager

## 如果仍然失敗

1. 確認倉庫名稱是否正確：`script-manager`
2. 確認 GitHub 用戶名是否正確：`cycumonk-coder`
3. 確認您有該倉庫的寫入權限

