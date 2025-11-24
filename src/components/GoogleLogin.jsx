import { useState, useEffect } from 'react';
import './GoogleLogin.css';

// Google Client ID - 從 localStorage 或使用默認值
const DEFAULT_CLIENT_ID = '859362486554-eohfkl8ej49qih16sasodn833q4som9t.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = localStorage.getItem('google_client_id') || DEFAULT_CLIENT_ID;

// Google OAuth 範圍 - 包含用戶基本資訊和 Google Cloud 服務
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',  // 用戶基本資訊
  'https://www.googleapis.com/auth/userinfo.email',    // 用戶郵箱
  'https://www.googleapis.com/auth/spreadsheets',      // Google Sheets
  'https://www.googleapis.com/auth/drive.file'         // Google Drive
].join(' ');

const GoogleLogin = ({ onLoginSuccess, onLogout }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    // 檢查是否已登入
    const savedUserInfo = localStorage.getItem('google_user_info');
    const savedToken = localStorage.getItem('google_access_token');
    
    if (savedUserInfo && savedToken) {
      try {
        const user = JSON.parse(savedUserInfo);
        setUserInfo(user);
        setIsSignedIn(true);
        if (onLoginSuccess) onLoginSuccess(user, savedToken);
      } catch (err) {
        console.error('載入用戶資訊失敗:', err);
        clearLoginData();
      }
    }

    // 載入 Google Identity Services
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
    script.onerror = () => {
      setError('無法載入 Google Identity Services');
    };
    document.head.appendChild(script);
  };

  const initializeTokenClient = () => {
    if (!window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) {
      console.warn('無法初始化 Token Client：缺少必要的資源');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID.trim(),
        scope: GOOGLE_SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            handleAuthError(tokenResponse.error);
            setLoading(false);
            return;
          }

          // 保存 Access Token
          const accessToken = tokenResponse.access_token;
          localStorage.setItem('google_access_token', accessToken);

          // 獲取用戶資訊
          try {
            const userInfo = await fetchUserInfo(accessToken);
            setUserInfo(userInfo);
            setIsSignedIn(true);
            localStorage.setItem('google_user_info', JSON.stringify(userInfo));
            
            console.log('✅ Google 登入成功:', userInfo);
            if (onLoginSuccess) onLoginSuccess(userInfo, accessToken);
          } catch (err) {
            console.error('獲取用戶資訊失敗:', err);
            setError('獲取用戶資訊失敗: ' + err.message);
          }
          
          setLoading(false);
        },
      });

      setTokenClient(client);
    } catch (err) {
      console.error('初始化 Token Client 錯誤:', err);
      setError('初始化 OAuth 客戶端失敗: ' + err.message);
      setLoading(false);
    }
  };

  const fetchUserInfo = async (accessToken) => {
    // 使用 OAuth2 v3 API，它返回更穩定的 sub 字段
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('無法獲取用戶資訊');
    }

    const data = await response.json();
    
    // 使用 sub 字段作為用戶 ID（更穩定），如果沒有則使用 id
    const userId = data.sub || data.id;
    
    console.log('🔍 [GoogleLogin] 獲取用戶資訊:', {
      sub: data.sub,
      id: data.id,
      email: data.email,
      name: data.name,
      '使用的 userId': userId
    });
    
    return {
      id: userId, // 使用穩定的 sub 或 id
      email: data.email,
      name: data.name,
      picture: data.picture,
      verifiedEmail: data.email_verified || data.verified_email
    };
  };

  const handleAuthError = (error) => {
    const currentOrigin = window.location.origin;
    let errorMessage = '登入失敗: ' + error;
    
    if (error === 'deleted_client') {
      errorMessage = '❌ OAuth 客戶端已被刪除！請在 Google Cloud Console 中創建新的 OAuth 2.0 客戶端 ID。';
    } else if (error === 'invalid_client') {
      errorMessage = '❌ OAuth 客戶端無效！請檢查 Client ID 是否正確。';
    } else if (error === 'access_denied') {
      errorMessage = '授權被拒絕。請重新嘗試並授予必要的權限。';
    } else if (error === 'popup_closed_by_user') {
      errorMessage = '登入視窗已關閉。';
    } else if (error.includes('redirect_uri_mismatch') || error === 'redirect_uri_mismatch') {
      errorMessage = `❌ 重定向 URI 不匹配錯誤！\n\n當前網址：${currentOrigin}\n\n🔧 解決方案：\n\n1. 前往 Google Cloud Console：\n   https://console.cloud.google.com/apis/credentials\n\n2. 找到您的 OAuth 2.0 客戶端 ID（Client ID）\n\n3. 點擊「編輯」按鈕\n\n4. 在「已授權的 JavaScript 來源」中添加以下網址：\n   • ${currentOrigin}\n   • http://localhost:3001（本地開發用）\n   • https://localhost:3001（本地開發用）\n\n5. 在「已授權的重新導向 URI」中添加：\n   • ${currentOrigin}\n   • ${currentOrigin}/\n   • http://localhost:3001\n   • http://localhost:3001/\n\n6. 點擊「儲存」\n\n7. 等待 1-2 分鐘讓設定生效，然後重新整理頁面再試\n\n⚠️ 注意：\n- 不要包含尾隨斜線（除非是根路徑）\n- 確保使用正確的協議（http:// 或 https://）\n- 如果使用自定義域名，也要添加該域名`;
    }
    
    setError(errorMessage);
  };

  const handleLogin = async () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
      setError('請先設置正確的 Google Client ID');
      return;
    }

    setLoading(true);
    setError('');

    if (!window.google?.accounts?.oauth2) {
      loadGoogleScript();
      setTimeout(() => {
        if (window.google?.accounts?.oauth2 && tokenClient) {
          tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          setError('無法載入 Google Identity Services');
          setLoading(false);
        }
      }, 1000);
      return;
    }

    if (!tokenClient) {
      initializeTokenClient();
      setTimeout(() => {
        if (tokenClient) {
          tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          setError('初始化 OAuth 客戶端失敗');
          setLoading(false);
        }
      }, 100);
      return;
    }

    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('Google 登入錯誤:', err);
      setError('登入失敗: ' + err.message);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.google?.accounts) {
      const token = localStorage.getItem('google_access_token');
      if (token) {
        window.google.accounts.oauth2.revoke(token, () => {
          console.log('✅ Access Token 已撤銷');
        });
      }
    }
    
    clearLoginData();
    setIsSignedIn(false);
    setUserInfo(null);
    
    if (onLogout) onLogout();
    console.log('✅ 已登出');
  };

  const clearLoginData = () => {
    // 清除基本認證資訊
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user_info');
    localStorage.removeItem('google_sheet_id');
    
    // 清除所有用戶專屬的資料（使用通配符方式）
    // 由於無法直接使用通配符，我們需要清除所有可能的用戶資料鍵
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('user_') || key.includes('_google_sheet_id'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ [登出] 已清除 ${key}`);
    });
    
    console.log('✅ [登出] 已清除所有登入資料和用戶專屬資料');
  };

  if (loading) {
    return (
      <div className="google-login">
        <div className="login-loading">
          <div className="spinner"></div>
          <span>登入中...</span>
        </div>
      </div>
    );
  }

  if (isSignedIn && userInfo) {
    return (
      <div className="google-login">
        <div className="user-profile">
          <div className="user-avatar">
            <img src={userInfo.picture} alt={userInfo.name} />
          </div>
          <div className="user-info">
            <div className="user-name">{userInfo.name}</div>
            <div className="user-email">{userInfo.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="登出">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="google-login">
      <button className="google-login-btn" onClick={handleLogin}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Google 登入</span>
      </button>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
};

export default GoogleLogin;

