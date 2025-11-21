import { useState, useEffect, useRef } from 'react';
import './ProjectInfo.css';

const ProjectInfo = ({ scriptData, onUpdateScriptData }) => {
  const [title, setTitle] = useState(scriptData?.title || '');
  const [coreIdea, setCoreIdea] = useState(scriptData?.coreIdea || '');
  const [isComposingTitle, setIsComposingTitle] = useState(false);
  const [isComposingIdea, setIsComposingIdea] = useState(false);
  const [compositionTitle, setCompositionTitle] = useState('');
  const [compositionIdea, setCompositionIdea] = useState('');
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

  return (
    <div className="project-info">
      <div className="project-info-header">
        <h2 className="project-info-title">專案資訊</h2>
      </div>
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
    </div>
  );
};

export default ProjectInfo;

