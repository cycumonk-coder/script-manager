import { useState, useEffect } from 'react';
import GoogleSheetsAuth from './GoogleSheetsAuth';
import './Settings.css';

const Settings = ({ onClose, onAuthChange, onSpreadsheetReady }) => {
  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'ai'
  const [cursorApiKey, setCursorApiKey] = useState('');

  useEffect(() => {
    // 載入已保存的 Cursor API Key
    const savedCursor = localStorage.getItem('cursor_api_key');
    if (savedCursor) setCursorApiKey(savedCursor);
  }, []);

  const handleSaveCursor = () => {
    if (cursorApiKey.trim()) {
      // 簡單驗證 API Key 格式
      if (!cursorApiKey.trim().startsWith('sk-')) {
        alert('API Key 格式不正確，應該以 sk- 開頭。請確認您輸入的是 OpenAI API Key。');
        return;
      }
      localStorage.setItem('cursor_api_key', cursorApiKey.trim());
      alert('OpenAI API Key 已儲存');
    } else {
      localStorage.removeItem('cursor_api_key');
      alert('OpenAI API Key 已清除');
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-header-title">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="2.5" fill="currentColor"/>
              <path d="M10 2.5V1.5M10 18.5V17.5M17.5 10H18.5M1.5 10H2.5M15.773 4.227L16.48 3.52M3.52 16.48L4.227 15.773M15.773 15.773L16.48 16.48M3.52 3.52L4.227 4.227" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M10 2.5C10 2.5 12.5 4.5 12.5 7.5C12.5 10.5 10 12.5 10 12.5M10 12.5C10 12.5 7.5 10.5 7.5 7.5C7.5 4.5 10 2.5 10 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M10 7.5C10 7.5 17.5 10 17.5 10M10 7.5C10 7.5 2.5 10 2.5 10M17.5 10C17.5 10 15 12.5 15 12.5M2.5 10C2.5 10 5 12.5 5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M10 12.5C10 12.5 12.5 15 12.5 17.5C12.5 17.5 10 17.5 10 17.5M10 12.5C10 12.5 7.5 15 7.5 17.5C7.5 17.5 10 17.5 10 17.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <h2>設定</h2>
          </div>
          <button className="settings-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'google' ? 'active' : ''}`}
            onClick={() => setActiveTab('google')}
          >
            Google 雲端
          </button>
          <button
            className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI 服務
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'google' && (
            <div className="settings-tab-content">
              <div className="settings-section">
                <h3>Google Sheets 雲端同步</h3>
                <p className="settings-description">
                  連接到 Google Sheets 以自動同步您的劇本資料到雲端，避免資料遺失。
                </p>
                <GoogleSheetsAuth 
                  onAuthChange={onAuthChange}
                  onSpreadsheetReady={onSpreadsheetReady}
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="settings-tab-content">
              <div className="settings-section">
                <h3>OpenAI API</h3>
                <p className="settings-description">
                  用於 AI 潤稿功能。<br/>
                  <strong>重要說明：</strong><br/>
                  • 即使您只有 Cursor 訂閱，沒有 ChatGPT Plus，也可以使用 OpenAI API<br/>
                  • OpenAI API 是獨立的服務，不需要 ChatGPT Plus 訂閱<br/>
                  • 您只需要在 OpenAI 平台註冊帳戶並獲取 API Key 即可<br/>
                  • API 使用按量付費，費用直接從您的 OpenAI 帳戶扣除<br/>
                  • 新帳戶通常有免費額度，用完後需要設置付款方式<br/>
                  <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer">
                    前往 OpenAI 平台獲取 API Key →
                  </a><br/>
                  <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer">
                    檢查帳單和配額 →
                  </a>
                </p>
                <div className="api-key-input-group">
                  <input
                    type="password"
                    className="api-key-input"
                    value={cursorApiKey}
                    onChange={(e) => setCursorApiKey(e.target.value)}
                    placeholder="輸入 OpenAI API Key（以 sk- 開頭）..."
                  />
                  <button className="api-key-save-btn" onClick={handleSaveCursor}>
                    儲存
                  </button>
                </div>
                <p className="api-key-hint">
                  ✅ 已設定：{cursorApiKey ? '是' : '否'}
                </p>
                <p className="settings-warning">
                  ⚠️ API Key 僅存儲在本地瀏覽器中，不會上傳到任何伺服器。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

