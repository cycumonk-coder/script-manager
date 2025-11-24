import { useState, useEffect } from 'react';
import GoogleLogin from '../components/GoogleLogin';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [clientId, setClientId] = useState('');
  const [showClientIdInput, setShowClientIdInput] = useState(false);

  useEffect(() => {
    // 檢查是否已設置 Client ID
    const savedClientId = localStorage.getItem('google_client_id') || 
                         '859362486554-eohfkl8ej49qih16sasodn833q4som9t.apps.googleusercontent.com';
    setClientId(savedClientId);
  }, []);

  const handleSetClientId = () => {
    const trimmedClientId = clientId.trim();
    
    if (!trimmedClientId) {
      alert('請輸入 Google Client ID');
      return;
    }

    if (!trimmedClientId.includes('.apps.googleusercontent.com')) {
      alert('Client ID 格式不正確。正確格式應為：xxxxx.apps.googleusercontent.com');
      return;
    }

    localStorage.setItem('google_client_id', trimmedClientId);
    setShowClientIdInput(false);
    window.location.reload();
  };

  const handleLoginSuccess = (userInfo, accessToken) => {
    if (onLoginSuccess) {
      onLoginSuccess(userInfo, accessToken);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">劇本寫作管理</h1>
          <p className="login-subtitle">使用 Google 帳號登入以開始使用</p>
        </div>

        <div className="login-content">
          <div className="login-card">
            <div className="login-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            <h2 className="login-card-title">歡迎回來</h2>
            <p className="login-card-subtitle">登入以存取您的劇本專案和 Google Cloud 服務</p>

            {!showClientIdInput ? (
              <>
                <GoogleLogin 
                  onLoginSuccess={handleLoginSuccess}
                  onLogout={() => {}}
                />

                <div className="client-id-hint">
                  <button 
                    className="link-btn"
                    onClick={() => setShowClientIdInput(true)}
                  >
                    需要設置 Google Client ID？
                  </button>
                </div>
              </>
            ) : (
              <div className="client-id-setup">
                <h3 className="setup-title">設置 Google Client ID</h3>
                <div className="setup-form">
                  <input
                    type="text"
                    placeholder="輸入 Google Client ID（格式：xxxxx.apps.googleusercontent.com）"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetClientId()}
                    className="client-id-input"
                  />
                  <button 
                    onClick={handleSetClientId}
                    className="setup-btn"
                  >
                    設定
                  </button>
                </div>
                <div className="setup-hint">
                  <p>💡 如何獲取 Client ID：</p>
                  <ol>
                    <li>前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                    <li>創建或選擇一個專案</li>
                    <li>啟用 <strong>Google Sheets API</strong> 和 <strong>Google Drive API</strong></li>
                    <li>設定 OAuth 同意畫面</li>
                    <li>創建 OAuth 2.0 客戶端 ID（網頁應用程式）</li>
                    <li>在「已授權的 JavaScript 來源」中添加：<code>{window.location.origin}</code></li>
                  </ol>
                  <button 
                    className="link-btn"
                    onClick={() => setShowClientIdInput(false)}
                  >
                    返回登入
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="login-features">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div className="feature-content">
                <h3>Google Sheets 整合</h3>
                <p>自動同步資料到 Google Sheets</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">☁️</div>
              <div className="feature-content">
                <h3>Google Drive 儲存</h3>
                <p>圖片自動上傳到 Google Drive</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔄</div>
              <div className="feature-content">
                <h3>即時同步</h3>
                <p>資料即時保存，隨時存取</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;



