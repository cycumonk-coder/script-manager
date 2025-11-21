import { useState, useEffect } from 'react';
import './AIImageSettings.css';

const AIImageSettings = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('openai_api_key', apiKey);
    if (onClose) onClose();
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem('openai_api_key');
  };

  return (
    <div className="ai-image-settings-overlay" onClick={onClose}>
      <div className="ai-image-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>AI 視覺圖設置</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="settings-content">
          <p className="settings-description">
            輸入您的 OpenAI API Key 以使用 DALL-E 生成高質量視覺圖。
            如果未設置，將使用備用圖片服務。
          </p>
          <div className="form-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <p className="form-hint">
              您的 API Key 僅存儲在本地瀏覽器中，不會上傳到任何伺服器。
            </p>
          </div>
          <div className="settings-actions">
            <button className="save-btn" onClick={handleSave}>
              儲存
            </button>
            <button className="clear-btn" onClick={handleClear}>
              清除
            </button>
            <button className="cancel-btn" onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIImageSettings;

