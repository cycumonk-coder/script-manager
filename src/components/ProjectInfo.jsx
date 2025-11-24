import { useState, useEffect, useRef } from 'react';
import './ProjectInfo.css';

const ProjectInfo = ({ scriptData, onUpdateScriptData, onClearProject, onSaveToCloud }) => {
  const [title, setTitle] = useState(scriptData?.title || '');
  const [coreIdea, setCoreIdea] = useState(scriptData?.coreIdea || '');
  const [isComposingTitle, setIsComposingTitle] = useState(false);
  const [isComposingIdea, setIsComposingIdea] = useState(false);
  const [compositionTitle, setCompositionTitle] = useState('');
  const [compositionIdea, setCompositionIdea] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const isInitialMount = useRef(true);

  // 同步 scriptData，確保在載入時能正確顯示資料
  useEffect(() => {
    if (scriptData) {
      // 如果是首次載入，直接設置（無論是否有值）
      if (isInitialMount.current) {
        console.log('📥 ProjectInfo 初始化，載入 scriptData:', scriptData);
        const loadedTitle = scriptData.title || '';
        const loadedCoreIdea = scriptData.coreIdea || '';
        setTitle(loadedTitle);
        setCoreIdea(loadedCoreIdea);
        console.log('📥 片名已載入:', loadedTitle || '(空)');
        console.log('📥 中心思想已載入:', loadedCoreIdea || '(空)');
        isInitialMount.current = false;
      } else {
        // 如果不是首次載入，只有在本地狀態為空且 scriptData 有值時才更新（避免覆蓋用戶輸入）
        // 這主要用於處理 scriptData 在組件掛載後才載入的情況
        if (title === '' && scriptData.title) {
          console.log('📥 更新片名（從 scriptData）:', scriptData.title);
          setTitle(scriptData.title);
        }
        if (coreIdea === '' && scriptData.coreIdea) {
          console.log('📥 更新中心思想（從 scriptData）:', scriptData.coreIdea);
          setCoreIdea(scriptData.coreIdea);
        }
      }
    }
  }, [scriptData]); // 監聽 scriptData 的變化

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    console.log('✏️ 片名輸入中:', newTitle);
    if (isComposingTitle) {
      setCompositionTitle(newTitle);
      return;
    }
    setTitle(newTitle);
    if (onUpdateScriptData) {
      console.log('📤 調用 onUpdateScriptData，新片名:', newTitle);
      onUpdateScriptData({ ...scriptData, title: newTitle });
    }
  };

  const handleTitleCompositionStart = () => {
    setIsComposingTitle(true);
  };

  const handleTitleCompositionEnd = (e) => {
    setIsComposingTitle(false);
    const newTitle = e.target.value;
    console.log('✅ 片名輸入完成（注音輸入）:', newTitle);
    setTitle(newTitle);
    if (onUpdateScriptData) {
      console.log('📤 調用 onUpdateScriptData（注音完成），新片名:', newTitle);
      onUpdateScriptData({ ...scriptData, title: newTitle });
    }
    setCompositionTitle('');
  };

  const handleCoreIdeaChange = (e) => {
    const newCoreIdea = e.target.value;
    if (isComposingIdea) {
      setCompositionIdea(newCoreIdea);
      return;
    }
    setCoreIdea(newCoreIdea);
    if (onUpdateScriptData) {
      onUpdateScriptData({ ...scriptData, coreIdea: newCoreIdea });
    }
  };

  const handleIdeaCompositionStart = () => {
    setIsComposingIdea(true);
  };

  const handleIdeaCompositionEnd = (e) => {
    setIsComposingIdea(false);
    const newCoreIdea = e.target.value;
    setCoreIdea(newCoreIdea);
    if (onUpdateScriptData) {
      onUpdateScriptData({ ...scriptData, coreIdea: newCoreIdea });
    }
    setCompositionIdea('');
  };

  const handleClearClick = () => {
    // 第一次點擊，顯示確認區域
    setShowConfirmClear(true);
  };

  const handleConfirmClear = () => {
    // 第二次確認，彈出最終確認對話框
    if (window.confirm('⚠️ 確定要清空所有專案內容嗎？\n\n此操作將清空：\n• 專案資訊（片名、中心思想）\n• 劇本大綱\n• 所有場次\n• 角色資料\n• 角色關係\n\n此操作無法復原！')) {
      if (onClearProject) {
        onClearProject();
      }
      setShowConfirmClear(false);
      // 清空本地狀態
      setTitle('');
      setCoreIdea('');
      alert('✅ 專案內容已清空');
    }
  };

  const handleCancelClear = () => {
    // 取消時隱藏確認區域
    setShowConfirmClear(false);
  };

  const handleSaveToCloud = async () => {
    if (!onSaveToCloud) return;
    
    setSaving(true);
    try {
      await onSaveToCloud();
    } catch (error) {
      // 錯誤已在父組件處理
      console.error('保存失敗:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="project-info">
      <div className="project-info-grid">
        <div className="project-info-field">
          <label className="field-label">片名</label>
          <input
            type="text"
            className="field-input"
            value={isComposingTitle ? (compositionTitle || title) : title}
            onChange={handleTitleChange}
            onCompositionStart={handleTitleCompositionStart}
            onCompositionEnd={handleTitleCompositionEnd}
            placeholder="輸入片名"
          />
        </div>
        <div className="project-info-field full-width">
          <label className="field-label">中心思想</label>
          <textarea
            className="field-textarea"
            value={isComposingIdea ? (compositionIdea || coreIdea) : coreIdea}
            onChange={handleCoreIdeaChange}
            onCompositionStart={handleIdeaCompositionStart}
            onCompositionEnd={handleIdeaCompositionEnd}
            placeholder="描述這個劇本想要傳達的核心思想..."
            rows="3"
          />
        </div>
      </div>
      
      {/* 專案操作按鈕 */}
      <div className="project-info-actions">
        {!showConfirmClear ? (
          <div className="project-action-buttons">
            {onSaveToCloud && (
              <button 
                className={`save-to-cloud-btn ${saving ? 'saving' : ''}`}
                onClick={handleSaveToCloud}
                type="button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="save-spinner"></div>
                    儲存中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    儲存到 Google 雲端
                  </>
                )}
              </button>
            )}
            <button 
              className="clear-project-btn" 
              onClick={handleClearClick}
              type="button"
            >
              清空專案內容
            </button>
          </div>
        ) : (
          <div className="confirm-clear-container">
            <span className="confirm-message">確定要清空所有專案內容嗎？此操作無法復原！</span>
            <div className="confirm-buttons">
              <button 
                className="confirm-clear-btn confirm" 
                onClick={handleConfirmClear}
                type="button"
              >
                確定清空
              </button>
              <button 
                className="confirm-clear-btn cancel" 
                onClick={handleCancelClear}
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInfo;

