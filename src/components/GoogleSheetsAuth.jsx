import { useState, useEffect } from 'react';
import { 
  setAccessToken, 
  setSpreadsheetId, 
  getSpreadsheetId,
  getAccessToken,
  saveAccessToken,
  clearAuth,
  isAuthenticated,
  createNewSpreadsheet
} from '../services/googleSheets';
import './GoogleSheetsAuth.css';

// Google Client ID - 請在 Google Cloud Console 創建 OAuth 2.0 客戶端並替換此值
// https://console.cloud.google.com/apis/credentials
const DEFAULT_CLIENT_ID = '859362486554-eohfkl8ej49qih16sasodn833q4som9t.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = localStorage.getItem('google_client_id') || DEFAULT_CLIENT_ID;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

const GoogleSheetsAuth = ({ onAuthChange, onSpreadsheetReady }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [spreadsheetId, setLocalSpreadsheetId] = useState('');
  const [clientId, setClientId] = useState(GOOGLE_CLIENT_ID);
  const [showClientIdInput, setShowClientIdInput] = useState(false); // 默認隱藏，因為已經設置了 Client ID
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    // 如果 localStorage 中沒有 Client ID，使用默認值
    if (!localStorage.getItem('google_client_id')) {
      localStorage.setItem('google_client_id', DEFAULT_CLIENT_ID);
      setClientId(DEFAULT_CLIENT_ID);
    }

    // 檢查是否已認證
    const authenticated = isAuthenticated();
    setIsSignedIn(authenticated);
    
    if (authenticated) {
      const sheetId = getSpreadsheetId();
      setLocalSpreadsheetId(sheetId || '');
      if (onAuthChange) onAuthChange(true);
    }

    // 如果有 Client ID，載入 Google Identity Services
    if (GOOGLE_CLIENT_ID) {
      loadGoogleScript();
    }
  }, []);

  const loadGoogleScript = () => {
    if (window.google?.accounts?.oauth2) {
      initializeTokenClient();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeTokenClient();
    };
    document.head.appendChild(script);
  };

  const initializeTokenClient = () => {
    if (!window.google?.accounts?.oauth2 || !clientId) {
      console.warn('無法初始化 Token Client：缺少必要的資源');
      return;
    }

    try {
      // 驗證 Client ID 格式
      if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
        setError('Client ID 格式不正確。正確格式應為：xxxxx.apps.googleusercontent.com');
        setLoading(false);
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: GOOGLE_SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            let errorMessage = '授權失敗: ' + tokenResponse.error;
            
            // 提供更具體的錯誤訊息
            if (tokenResponse.error === 'invalid_client') {
              const currentClientId = clientId || localStorage.getItem('google_client_id') || '未設置';
              errorMessage = `OAuth 客戶端未找到！\n\n當前使用的 Client ID：${currentClientId}\n\n請確認以下項目：\n\n1. 在 Google Cloud Console (https://console.cloud.google.com/apis/credentials) 中確認 Client ID 是否存在\n2. 確認 Client ID 完整且正確（應該包含 .apps.googleusercontent.com）\n3. 確認應用程式類型為「網頁應用程式」\n4. ⚠️ 最重要：在「已授權的 JavaScript 來源」中添加：http://localhost:3001（沒有尾隨斜線）\n5. 確認在「OAuth 同意畫面」中添加了您的 Google 帳號為測試使用者\n6. 如果修改了設定，請等待 1-2 分鐘後再嘗試\n\n如果問題持續，請嘗試刪除並重新創建 OAuth 客戶端。`;
            } else if (tokenResponse.error === 'invalid_request') {
              const currentClientId = clientId || localStorage.getItem('google_client_id') || '未設置';
              errorMessage = `OAuth 請求無效！\n\n當前使用的 Client ID：${currentClientId}\n\n可能的原因：\n\n1. ⚠️ 在 Google Cloud Console 的「已授權的 JavaScript 來源」中，必須添加：\n   - http://localhost:3001（沒有尾隨斜線）\n   - 如果使用其他端口，請添加對應的 URL\n\n2. 確認 Client ID 格式正確（應該包含 .apps.googleusercontent.com）\n\n3. 確認應用程式類型為「網頁應用程式」\n\n4. 確認已啟用 Google Sheets API 和 Google Drive API\n\n5. 在 OAuth 同意畫面中添加了您的 Google 帳號為測試使用者\n\n6. 清除瀏覽器快取並重新整理頁面後再試\n\n7. 如果問題持續，請嘗試刪除並重新創建 OAuth 客戶端`;
            } else if (tokenResponse.error === 'access_denied') {
              errorMessage = '授權被拒絕。請重新嘗試並授予必要的權限。';
            } else if (tokenResponse.error === 'popup_closed_by_user') {
              errorMessage = '授權視窗已關閉。請重新嘗試。';
            }
            
            setError(errorMessage);
            setLoading(false);
            return;
          }

          saveAccessToken(tokenResponse.access_token);
          setAccessToken(tokenResponse.access_token);
          setIsSignedIn(true);
          if (onAuthChange) onAuthChange(true);

          // 檢查是否有 Sheet ID，如果沒有就創建一個
          const sheetId = getSpreadsheetId();
          if (!sheetId) {
            setCreating(true);
            try {
              const newSheetId = await createNewSpreadsheet('劇本管理平台');
              setLocalSpreadsheetId(newSheetId);
              if (onSpreadsheetReady) onSpreadsheetReady(newSheetId);
            } catch (err) {
              setError('創建 Google Sheet 失敗: ' + err.message);
            } finally {
              setCreating(false);
              setLoading(false);
            }
          } else {
            setLocalSpreadsheetId(sheetId);
            if (onSpreadsheetReady) onSpreadsheetReady(sheetId);
            setLoading(false);
          }
        },
      });

      setTokenClient(client);
    } catch (err) {
      console.error('初始化 Token Client 錯誤:', err);
      setError('初始化 OAuth 客戶端失敗: ' + err.message);
      setLoading(false);
    }
  };

  const handleSetClientId = () => {
    const trimmedClientId = clientId.trim();
    
    if (!trimmedClientId) {
      setError('請輸入 Google Client ID');
      return;
    }

    // 驗證 Client ID 格式
    if (!trimmedClientId.includes('.apps.googleusercontent.com')) {
      setError('Client ID 格式不正確。正確格式應為：xxxxx.apps.googleusercontent.com');
      return;
    }

    // 清除之前的錯誤和認證狀態
    setError('');
    clearAuth();
    setIsSignedIn(false);
    
    localStorage.setItem('google_client_id', trimmedClientId);
    setShowClientIdInput(false);
    loadGoogleScript();
  };

  const handleGoogleAuth = async () => {
    if (!clientId || !clientId.trim()) {
      setError('請先設置 Google Client ID');
      setShowClientIdInput(true);
      return;
    }

    // 驗證 Client ID 格式
    if (!clientId.includes('.apps.googleusercontent.com')) {
      setError('Client ID 格式不正確。正確格式應為：xxxxx.apps.googleusercontent.com');
      setShowClientIdInput(true);
      return;
    }

    setLoading(true);
    setError('');

    // 如果 Google Identity Services 尚未載入，先載入
    if (!window.google?.accounts?.oauth2) {
      loadGoogleScript();
      // 等待腳本載入
      setTimeout(() => {
        if (!window.google?.accounts?.oauth2) {
          setError('無法載入 Google Identity Services。請檢查網路連線並重新整理頁面。');
          setLoading(false);
          return;
        }
        // 載入完成後初始化並請求授權
        initializeTokenClient();
        if (tokenClient) {
          tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          setError('初始化 OAuth 客戶端失敗。請檢查 Client ID 是否正確。');
          setLoading(false);
        }
      }, 1000);
      return;
    }

    // 如果 tokenClient 尚未初始化，先初始化
    if (!tokenClient) {
      initializeTokenClient();
      // 等待初始化完成
      setTimeout(() => {
        if (tokenClient) {
          try {
            tokenClient.requestAccessToken({ prompt: 'consent' });
          } catch (err) {
            console.error('請求授權錯誤:', err);
            setError('請求授權失敗: ' + err.message);
            setLoading(false);
          }
        } else {
          setError('初始化 OAuth 客戶端失敗。請檢查 Client ID 是否正確。');
          setLoading(false);
        }
      }, 100);
      return;
    }

    // 如果都已準備好，直接請求授權
    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('Google 認證錯誤:', err);
      let errorMsg = '認證失敗: ' + err.message;
      if (err.message && err.message.includes('invalid_request')) {
        errorMsg = 'OAuth 請求無效。請確認：\n1. 在 Google Cloud Console 的「已授權的 JavaScript 來源」中添加了 http://localhost:3001\n2. Client ID 格式正確\n3. 應用程式類型為「網頁應用程式」';
      }
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (window.google?.accounts) {
      window.google.accounts.id.disableAutoSelect();
    }
    clearAuth();
    setIsSignedIn(false);
    setLocalSpreadsheetId('');
    if (onAuthChange) onAuthChange(false);
  };

  const handleSetSpreadsheetId = async () => {
    if (!spreadsheetId.trim()) {
      setError('請輸入 Google Sheet ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSpreadsheetId(spreadsheetId.trim());
      setLocalSpreadsheetId(spreadsheetId.trim());
      if (onSpreadsheetReady) onSpreadsheetReady(spreadsheetId.trim());
    } catch (err) {
      setError('設置失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || creating) {
    return (
      <div className="google-sheets-auth">
        <div className="auth-loading">
          {creating ? '正在創建 Google Sheet...' : '正在處理...'}
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="google-sheets-auth">
        <div className="auth-status connected">
          <div className="status-icon">✓</div>
          <div className="status-info">
            <div className="status-title">已連接到 Google 雲端</div>
            <div className="status-details">
              {spreadsheetId ? (
                <>
                  <span>Sheet ID: {spreadsheetId.substring(0, 20)}...</span>
                  <button 
                    className="change-sheet-btn"
                    onClick={() => setLocalSpreadsheetId('')}
                  >
                    更換
                  </button>
                </>
              ) : (
                <div className="set-sheet-id">
                  <input
                    type="text"
                    placeholder="輸入 Google Sheet ID"
                    value={spreadsheetId}
                    onChange={(e) => setLocalSpreadsheetId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetSpreadsheetId()}
                  />
                  <button onClick={handleSetSpreadsheetId}>設定</button>
                </div>
              )}
            </div>
          </div>
          <button className="sign-out-btn" onClick={handleSignOut}>
            登出
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
      </div>
    );
  }

  if (showClientIdInput) {
    return (
      <div className="google-sheets-auth">
        <div className="auth-status disconnected">
          <div className="status-icon">⚙</div>
          <div className="status-info">
            <div className="status-title">設置 Google Client ID</div>
            <div className="status-details">
              請輸入您的 Google OAuth 2.0 Client ID
            </div>
            <div className="set-client-id">
              <input
                type="text"
                placeholder="輸入 Google Client ID（格式：xxxxx.apps.googleusercontent.com）"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSetClientId()}
              />
              <button onClick={handleSetClientId}>設定</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="client-id-hint">
              <p>💡 如何獲取 Client ID：</p>
              <ol>
                <li>前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                <li>創建或選擇一個專案</li>
                <li>啟用 <strong>Google Sheets API</strong> 和 <strong>Google Drive API</strong></li>
                <li>設定 OAuth 同意畫面（如果尚未設定）：
                  <ul>
                    <li>選擇「外部」</li>
                    <li>填寫應用程式資訊</li>
                    <li>添加您的 Google 帳號為測試使用者</li>
                  </ul>
                </li>
                <li>創建 OAuth 2.0 客戶端 ID：
                  <ul>
                    <li>應用程式類型：<strong>網頁應用程式</strong></li>
                    <li>名稱：劇本管理平台（或自訂）</li>
                    <li>已授權的 JavaScript 來源：<strong>http://localhost:3001</strong></li>
                  </ul>
                </li>
                <li>複製 Client ID（格式：xxxxx.apps.googleusercontent.com）並貼上</li>
              </ol>
              <p className="important-note">⚠️ 重要：如果遇到「invalid_client」錯誤，請確認：</p>
              <ul>
                <li>Client ID 完整且正確（包含 .apps.googleusercontent.com）</li>
                <li>在「已授權的 JavaScript 來源」中添加了 http://localhost:3001</li>
                <li>應用程式類型為「網頁應用程式」而非其他類型</li>
                <li>在 OAuth 同意畫面中添加了您的帳號為測試使用者</li>
              </ul>
            </div>
          </div>
        </div>
        {error && <div className="auth-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="google-sheets-auth">
      <div className="auth-status disconnected">
        <div className="status-icon">⚠</div>
        <div className="status-info">
          <div className="status-title">未連接到 Google 雲端</div>
          <div className="status-details">
            連接到 Google Sheets 以自動同步您的劇本資料
          </div>
          {!clientId || !clientId.trim() ? (
            <div className="client-id-prompt">
              <p>⚠️ 請先設置 Google Client ID</p>
              <button 
                className="set-client-id-btn"
                onClick={() => setShowClientIdInput(true)}
              >
                設置 Client ID
              </button>
            </div>
          ) : (
            <div className="client-id-display">
              <p>已設置 Client ID: {clientId.substring(0, 30)}...</p>
              <button 
                className="change-client-id-btn"
                onClick={() => setShowClientIdInput(true)}
              >
                更換
              </button>
            </div>
          )}
        </div>
        <button 
          className="sign-in-btn"
          onClick={handleGoogleAuth}
          disabled={loading || !clientId || !clientId.trim()}
        >
          {loading ? '處理中...' : '連接到 Google'}
        </button>
      </div>
      {error && <div className="auth-error">{error}</div>}
      <div className="auth-hint">
        <p>💡 提示：首次連接會要求您授權訪問 Google Sheets。我們會自動創建一個新的 Google Sheet 來儲存您的資料。</p>
        {!clientId || !clientId.trim() ? (
          <p>📝 <strong>第一步：</strong>點擊「設置 Client ID」按鈕，輸入您的 Google OAuth 2.0 Client ID</p>
        ) : null}
      </div>
    </div>
  );
};

export default GoogleSheetsAuth;

