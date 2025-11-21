import { useState, useEffect, useRef } from 'react';
import SceneEditor from './SceneEditor';
import './ScriptOutline.css';

export const BEAT_SHEET_STRUCTURE = [
  { id: 'opening', label: '開場畫面', description: '第一印象，設定故事基調' },
  { id: 'theme', label: '主題陳述', description: '故事要傳達的核心訊息' },
  { id: 'setup', label: '設定', description: '介紹主角和世界觀' },
  { id: 'catalyst', label: '催化劑', description: '改變一切的關鍵事件' },
  { id: 'debate', label: '辯論', description: '主角猶豫是否接受挑戰' },
  { id: 'break1', label: '進入第二幕', description: '主角做出決定，故事轉向' },
  { id: 'bstory', label: 'B故事', description: '次要情節線，通常與主題相關' },
  { id: 'fun', label: '樂趣與遊戲', description: '承諾的前提開始展現' },
  { id: 'midpoint', label: '中點', description: '重大轉折，真假勝利或失敗' },
  { id: 'badguys', label: '壞人逼近', description: '壓力增加，主角面臨更大挑戰' },
  { id: 'allislost', label: '全盤皆輸', description: '最黑暗的時刻' },
  { id: 'darksoul', label: '靈魂暗夜', description: '主角反思，找到解決之道' },
  { id: 'break2', label: '進入第三幕', description: '主角重新出發，帶著新認知' },
  { id: 'finale', label: '結局', description: '最終對決與解決' },
  { id: 'final', label: '最終畫面', description: '與開場呼應，展現轉變' },
];

const ScriptOutline = ({ outline, onUpdateOutline, scenes = [], onSelectScene, onUpdateScene, onDeleteScene, onAddScene, allScenes = [] }) => {
  const [localOutline, setLocalOutline] = useState(outline || {});
  const [isComposing, setIsComposing] = useState({});
  const [compositionValues, setCompositionValues] = useState({});
  // 預設所有段落都收合
  const [collapsedBeats, setCollapsedBeats] = useState(() => {
    const initialState = {};
    BEAT_SHEET_STRUCTURE.forEach(beat => {
      initialState[beat.id] = true;
    });
    return initialState;
  });
  const [editingSceneId, setEditingSceneId] = useState(null);
  const [draggedSceneId, setDraggedSceneId] = useState(null);
  const [dragOverBeatId, setDragOverBeatId] = useState(null);
  const [addingSceneBeatId, setAddingSceneBeatId] = useState(null);
  const [polishingSceneId, setPolishingSceneId] = useState(null);
  const [polishing, setPolishing] = useState(false); // 追蹤是否正在潤稿
  const [polishedSceneContent, setPolishedSceneContent] = useState(null);
  const [showSceneDiff, setShowSceneDiff] = useState(false);
  const [sceneDiffSelections, setSceneDiffSelections] = useState({});
  const [newScene, setNewScene] = useState({
    number: scenes.length + 1,
    dayNight: '',
    title: '',
    content: '',
    location: '',
    completed: false,
  });

  // 同步 outline，確保重新整理後能正確載入資料
  useEffect(() => {
    if (outline && Object.keys(outline).length > 0) {
      // 如果 outline 有資料，更新本地狀態
      // 但只在本地狀態為空或 outline 有更新時才更新，避免覆蓋用戶正在輸入的內容
      setLocalOutline(prev => {
        // 如果本地狀態為空，直接使用 outline
        if (!prev || Object.keys(prev).length === 0) {
          return outline;
        }
        // 否則合併資料，保留本地未保存的內容
        const merged = { ...prev };
        Object.keys(outline).forEach(key => {
          // 如果本地沒有這個 key 的資料，或本地資料為空，使用 outline 的資料
          if (!merged[key] || (typeof merged[key] === 'string' && merged[key].trim() === '')) {
            merged[key] = outline[key];
          } else if (typeof outline[key] === 'object' && typeof merged[key] === 'string') {
            // 如果 outline 是物件格式（包含 completed），但本地是字串，轉換格式
            merged[key] = outline[key];
          } else if (typeof outline[key] === 'object' && typeof merged[key] === 'object') {
            // 如果兩者都是物件，合併內容但保留本地的 completed 狀態
            merged[key] = {
              content: merged[key].content || outline[key].content || '',
              completed: merged[key].completed !== undefined ? merged[key].completed : (outline[key].completed || false)
            };
          }
        });
        return merged;
      });
    }
  }, [outline]);

  const handleChange = (beatId, value) => {
    if (isComposing[beatId]) {
      setCompositionValues(prev => ({ ...prev, [beatId]: value }));
      return;
    }
    // 保持完成狀態，只更新內容
    const currentData = localOutline[beatId];
    let updatedBeatData;
    if (typeof currentData === 'object' && currentData !== null) {
      updatedBeatData = { ...currentData, content: value };
    } else {
      // 如果原本是字串或不存在，檢查是否有完成狀態需要保留
      const completed = typeof currentData === 'object' && currentData.completed ? currentData.completed : false;
      updatedBeatData = { content: value, completed };
    }
    
    const updated = { ...localOutline, [beatId]: updatedBeatData };
    setLocalOutline(updated);
    // 立即保存
    if (onUpdateOutline) {
      onUpdateOutline(updated);
    }
  };

  const handleCompositionStart = (beatId) => {
    setIsComposing(prev => ({ ...prev, [beatId]: true }));
  };

  const handleCompositionEnd = (beatId, e) => {
    setIsComposing(prev => ({ ...prev, [beatId]: false }));
    const value = e.target.value;
    // 保持完成狀態，只更新內容
    const currentData = localOutline[beatId];
    let updatedBeatData;
    if (typeof currentData === 'object' && currentData !== null) {
      updatedBeatData = { ...currentData, content: value };
    } else {
      // 如果原本是字串或不存在，檢查是否有完成狀態需要保留
      const completed = typeof currentData === 'object' && currentData.completed ? currentData.completed : false;
      updatedBeatData = { content: value, completed };
    }
    
    const updated = { ...localOutline, [beatId]: updatedBeatData };
    setLocalOutline(updated);
    // 立即保存
    if (onUpdateOutline) {
      onUpdateOutline(updated);
    }
    setCompositionValues(prev => {
      const next = { ...prev };
      delete next[beatId];
      return next;
    });
  };

  // 處理大綱項目的完成狀態切換
  const handleBeatComplete = (beatId, checked) => {
    const beatData = localOutline[beatId] || '';
    // 保存完成狀態到 outline，使用特殊格式：{ content: '...', completed: true/false }
    // 為了向後兼容，如果原本是字串，轉換為物件
    let updatedBeatData;
    if (typeof beatData === 'string') {
      updatedBeatData = { content: beatData, completed: checked };
    } else if (typeof beatData === 'object') {
      updatedBeatData = { ...beatData, completed: checked };
    } else {
      updatedBeatData = { content: '', completed: checked };
    }
    
    const updated = { ...localOutline, [beatId]: updatedBeatData };
    setLocalOutline(updated);
    if (onUpdateOutline) {
      onUpdateOutline(updated);
    }
  };

  // 獲取大綱項目的內容（兼容舊格式）
  const getBeatContent = (beatId) => {
    const data = localOutline[beatId];
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data.content) return data.content;
    return '';
  };

  // 獲取大綱項目的完成狀態
  const getBeatCompleted = (beatId) => {
    const data = localOutline[beatId];
    if (!data) return false;
    if (typeof data === 'object' && typeof data.completed === 'boolean') return data.completed;
    return false;
  };


  const toggleBeatCollapse = (beatId) => {
    setCollapsedBeats(prev => ({
      ...prev,
      [beatId]: !prev[beatId]
    }));
  };

  const getBeatScenes = (beatId) => {
    return scenes.filter(s => s.beatId === beatId);
  };

  // 處理場次拖曳開始
  const handleSceneDragStart = (e, sceneId) => {
    setDraggedSceneId(sceneId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sceneId.toString());
  };

  // 處理場次拖曳結束
  const handleSceneDragEnd = () => {
    setDraggedSceneId(null);
    setDragOverBeatId(null);
  };

  // 處理拖曳到大綱區塊
  const handleBeatDragOver = (e, beatId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverBeatId(beatId);
  };

  // 處理場次放置到大綱區塊
  const handleBeatDrop = (e, targetBeatId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSceneId && onUpdateScene) {
      const draggedScene = scenes.find(s => s.id === draggedSceneId);
      if (draggedScene && draggedScene.beatId !== targetBeatId) {
        onUpdateScene({
          ...draggedScene,
          beatId: targetBeatId,
        });
        // 確保目標大綱展開
        setCollapsedBeats(prev => ({ ...prev, [targetBeatId]: false }));
      }
    }
    setDraggedSceneId(null);
    setDragOverBeatId(null);
  };

  return (
    <div className="script-outline">
      <h2 className="outline-title">劇本大綱</h2>
      <p className="outline-subtitle">建立故事結構，逐步完成劇本</p>
      
      <div className="beat-sheet">
        {BEAT_SHEET_STRUCTURE.map((beat, index) => {
          const beatContent = getBeatContent(beat.id);
          const hasContent = beatContent && beatContent.trim().length > 0;
          const isCompleted = getBeatCompleted(beat.id);
          const beatScenes = getBeatScenes(beat.id);
          const completedScenes = beatScenes.filter(s => s.completed).length;
          
          const isCollapsed = collapsedBeats[beat.id];
          
          return (
            <div 
              key={beat.id} 
              className={`beat-item ${hasContent ? 'has-content' : ''} ${isCompleted ? 'completed' : ''} ${isCollapsed ? 'collapsed' : ''} ${dragOverBeatId === beat.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleBeatDragOver(e, beat.id)}
              onDrop={(e) => handleBeatDrop(e, beat.id)}
              onDragLeave={() => setDragOverBeatId(null)}
            >
              <div 
                className="beat-header" 
                onClick={(e) => {
                  // 如果點擊的是收合按鈕，只展開/收合
                  if (e.target.closest('.beat-collapse-btn')) {
                    e.stopPropagation();
                    toggleBeatCollapse(beat.id);
                    return;
                  }
                  // 如果點擊的是其他區域，展開/收合
                  toggleBeatCollapse(beat.id);
                }}
              >
                <span className="beat-number">{index + 1}</span>
                <div className="beat-info">
                  <h3 className="beat-label">{beat.label}</h3>
                  <p className="beat-description">{beat.description}</p>
                </div>
                <div className="beat-actions">
                  {beatScenes.length > 0 && (
                    <span className="beat-scene-count">
                      {completedScenes}/{beatScenes.length}
                    </span>
                  )}
                  <button
                    className={`beat-collapse-btn ${isCollapsed ? 'collapsed' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBeatCollapse(beat.id);
                    }}
                    aria-label={isCollapsed ? '展開' : '收合'}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              {!isCollapsed && (
                <>
              <div className="beat-content-section">
                <textarea
                  className="beat-content"
                  value={isComposing[beat.id] ? (compositionValues[beat.id] ?? beatContent) : beatContent}
                  onChange={(e) => handleChange(beat.id, e.target.value)}
                  onCompositionStart={() => handleCompositionStart(beat.id)}
                  onCompositionEnd={(e) => handleCompositionEnd(beat.id, e)}
                  placeholder={`描述這個節拍點的內容...`}
                  rows="4"
                  aria-label={`${beat.label} - ${beat.description}`}
                />
              </div>
              
              {/* 場次管理區域 - 每個大綱段落都有自己的場次區塊 */}
              <div 
                className={`beat-scenes-section ${dragOverBeatId === beat.id ? 'drag-over' : ''}`}
              >
                  <div className="beat-scenes-header">
                  <h4 className="beat-scenes-title">
                    相關場次 
                    {beatScenes.length > 0 && (
                      <span className="scene-count-badge">
                        ({completedScenes}/{beatScenes.length})
                      </span>
                    )}
                  </h4>
                  </div>
                  
                {/* 場次列表 - 直接顯示，不需要展開 */}
                {beatScenes.length > 0 && (
                    <div className="beat-scenes-list">
                      {beatScenes.map((scene) => (
                      <div key={scene.id}>
                        <div
                          className={`beat-scene-item ${scene.completed ? 'completed' : ''} ${editingSceneId === `edit-${scene.id}` ? 'editing' : ''} ${draggedSceneId === scene.id ? 'dragging' : ''}`}
                          draggable
                          onDragStart={(e) => handleSceneDragStart(e, scene.id)}
                          onDragEnd={handleSceneDragEnd}
                        >
                          <div className="beat-scene-header">
                            <div className="beat-scene-info">
                            <span className="beat-scene-number">場次 {scene.number}</span>
                              {scene.dayNight && (
                                <span className="beat-scene-daynight">{scene.dayNight}戲</span>
                              )}
                              {scene.location && (
                                <span className="beat-scene-location">{scene.location}</span>
                              )}
                            {scene.completed && <span className="beat-scene-check">✓</span>}
                            </div>
                            <div className="beat-scene-actions">
                              <button
                                className="beat-scene-edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSceneId(`edit-${scene.id}`);
                                  // 確保該大綱段落展開
                                  setCollapsedBeats(prev => ({ ...prev, [beat.id]: false }));
                                }}
                                title="編輯場次"
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.686 11.9445 1.59123C12.1727 1.49646 12.4166 1.44763 12.6627 1.44763C12.9088 1.44763 13.1527 1.49646 13.3809 1.59123C13.6091 1.686 13.817 1.8249 13.9921 2.00001C14.1672 2.17512 14.3061 2.38304 14.4009 2.61122C14.4957 2.8394 14.5445 3.08328 14.5445 3.32935C14.5445 3.57542 14.4957 3.8193 14.4009 4.04748C14.3061 4.27566 14.1672 4.48358 13.9921 4.65868L5.32448 13.3263L1.33331 14.6667L2.67375 10.6755L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            <button
                              className="beat-scene-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                    if (editingSceneId === `edit-${scene.id}`) {
                                      setEditingSceneId(null);
                                    }
                                if (onDeleteScene) {
                                  onDeleteScene(scene.id);
                                    }
                                  }}
                                title="刪除場次"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          {scene.title && (
                            <div className="beat-scene-title">{scene.title}</div>
                          )}
                          {scene.content && scene.content.length > 0 && (
                            <div className="beat-scene-content-preview">
                              {scene.content.substring(0, 80)}
                              {scene.content.length > 80 && '...'}
                            </div>
                          )}
                        </div>
                        {/* 編輯場次表單 - 使用與新增相同的格式 */}
                        {editingSceneId === `edit-${scene.id}` && (
                          <div className="new-scene-form">
                            <div className="new-scene-form-header">
                              <span className="new-scene-form-title">編輯場次</span>
                            </div>
                            <div className="new-scene-form-fields">
                              <div className="new-scene-field-row">
                                <div className="new-scene-field">
                                  <label>場次數</label>
                                  <input
                                    type="number"
                                    value={scene.number}
                                    onChange={(e) => {
                                      if (onUpdateScene) {
                                        onUpdateScene({
                                          ...scene,
                                          number: parseInt(e.target.value) || 1,
                                        });
                                      }
                                    }}
                                    min="1"
                                  />
                                </div>
                                <div className="new-scene-field">
                                  <label>日/夜戲</label>
                                  <select
                                    value={scene.dayNight || ''}
                                    onChange={(e) => {
                                      if (onUpdateScene) {
                                        onUpdateScene({
                                          ...scene,
                                          dayNight: e.target.value,
                                        });
                                      }
                                    }}
                                  >
                                    <option value="">選擇日/夜</option>
                                    <option value="日">日</option>
                                    <option value="夜">夜</option>
                                    <option value="晨">晨</option>
                                    <option value="黃昏">黃昏</option>
                                  </select>
                                </div>
                                <div className="new-scene-field">
                                  <label>場景地點</label>
                                  <input
                                    type="text"
                                    value={scene.location || ''}
                                    onChange={(e) => {
                                      if (onUpdateScene) {
                                        onUpdateScene({
                                          ...scene,
                                          location: e.target.value,
                                        });
                                      }
                                    }}
                                    placeholder="輸入場景地點..."
                                  />
                                </div>
                              </div>
                              <div className="new-scene-field">
                                <label>場次標題</label>
                                <input
                                  type="text"
                                  value={scene.title || ''}
                                  onChange={(e) => {
                                    if (onUpdateScene) {
                                      onUpdateScene({
                                        ...scene,
                                        title: e.target.value,
                                      });
                                    }
                                  }}
                                  placeholder="輸入場次標題..."
                                />
                              </div>
                              <div className="new-scene-field">
                                <label>場次內容</label>
                                <textarea
                                  value={scene.content || ''}
                                  onChange={(e) => {
                                    if (onUpdateScene) {
                                      onUpdateScene({
                                        ...scene,
                                        content: e.target.value,
                                      });
                                    }
                                  }}
                                  placeholder="輸入場次內容..."
                                  rows="6"
                                />
                              </div>
                            </div>
                            <div className="new-scene-form-actions">
                              <button
                                className="polish-scene-btn"
                                onClick={async () => {
                                  const apiKey = localStorage.getItem('cursor_api_key');
                                  if (!apiKey) {
                                    alert('請先設置 Cursor API Key 才能使用潤稿功能。請到設定中設置。');
                                    return;
                                  }
                                  
                                  if (!scene.content || !scene.content.trim()) {
                                    alert('請先輸入場次內容');
                                    return;
                                  }
                                  
                                  // 開始潤稿，顯示載入狀態
                                  setPolishing(true);
                                  setPolishingSceneId(scene.id);
                                  
                                  try {
                                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${apiKey}`,
                                      },
                                      body: JSON.stringify({
                                        model: 'gpt-3.5-turbo',
                                        messages: [
                                          {
                                            role: 'system',
                                            content: '你是一位專業的劇本潤稿編輯。請將提供的劇本內容潤稿得更通順、流暢，保持原有的風格和意思，但讓文字更加精煉和專業。只返回潤稿後的內容，不要添加任何說明或註解。'
                                          },
                                          {
                                            role: 'user',
                                            content: `請潤稿以下劇本內容：\n\n${scene.content}`
                                          }
                                        ],
                                        temperature: 0.7,
                                        max_tokens: 2000,
                                      }),
                                    });
                                    
                                    if (!response.ok) {
                                      const errorData = await response.json();
                                      throw new Error(errorData.error?.message || '潤稿失敗');
                                    }
                                    
                                    const data = await response.json();
                                    const polished = data.choices[0].message.content.trim();
                                    
                                    // 顯示 diff 視圖
                                    setPolishedSceneContent(polished);
                                    setShowSceneDiff(true);
                                  } catch (error) {
                                    console.error('潤稿錯誤：', error);
                                    let errorMessage = '潤稿失敗，請檢查API設置和網路連接';
                                    
                                    if (error.message && error.message.includes('Incorrect API key')) {
                                      errorMessage = 'API Key 不正確。請到「設定」→「AI 服務」中檢查並重新設置 OpenAI API Key。\n\n如果問題持續，請確認：\n1. API Key 是否正確複製（包含開頭的 sk-）\n2. API Key 是否已過期或被撤銷\n3. 是否使用了正確的 OpenAI API Key';
                                    } else if (error.message && error.message.includes('exceeded your current quota') || error.message.includes('quota')) {
                                      errorMessage = '已超過 API 使用配額。\n\n可能的原因：\n1. 免費額度已用完\n2. 帳戶未設置付款方式\n3. 使用量超過計劃限制\n\n解決方法：\n1. 前往 https://platform.openai.com/account/billing 檢查帳單和配額\n2. 設置付款方式以繼續使用\n3. 或等待配額重置（如果是免費額度）';
                                    } else if (error.message && error.message.includes('does not exist or you do not have access')) {
                                      errorMessage = '模型不可用或沒有訪問權限。請確認您的 OpenAI API Key 是否有權限使用 GPT-4 模型。\n\n建議：\n1. 檢查您的 OpenAI 帳戶是否有 GPT-4 訪問權限\n2. 或聯繫 OpenAI 支持以啟用 GPT-4 訪問';
                                    } else if (error.message) {
                                      errorMessage = error.message;
                                    }
                                    
                                    alert(errorMessage);
                                    // 錯誤時清除載入狀態
                                    setPolishing(false);
                                    setPolishingSceneId(null);
                                  } finally {
                                    // 無論成功或失敗，都清除載入狀態
                                    setPolishing(false);
                                  }
                                }}
                                disabled={!scene.content || !scene.content.trim() || (polishing && polishingSceneId === scene.id)}
                                title="潤稿"
                              >
                                {polishing && polishingSceneId === scene.id ? (
                                  <>
                                    <span className="polish-loading-spinner"></span>
                                    潤稿中...
                                  </>
                                ) : (
                                  '潤稿'
                                )}
                              </button>
                              <button
                                className="cancel-scene-btn"
                                onClick={() => {
                                  setEditingSceneId(null);
                                  setPolishingSceneId(null);
                                  setShowSceneDiff(false);
                                  setPolishing(false);
                                }}
                              >
                                取消
                              </button>
                              <button
                                className="save-scene-btn"
                                onClick={() => {
                                  // 收合場次編輯表單（折疊起來）
                                  setEditingSceneId(null);
                                  setPolishingSceneId(null);
                                  setShowSceneDiff(false);
                                  setPolishing(false);
                                }}
                              >
                                儲存
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* 潤稿載入提示 */}
                        {polishing && polishingSceneId === scene.id && (
                          <div className="polish-loading-container">
                            <div className="polish-loading-content">
                              <span className="polish-loading-spinner-large"></span>
                              <p>正在潤稿中，請稍候...</p>
                            </div>
                          </div>
                        )}
                        
                        {/* 潤稿 Diff 視圖 - 在場次列表的編輯表單下方 */}
                        {showSceneDiff && polishingSceneId === scene.id && polishedSceneContent && !polishing && (
                          <div className="scene-diff-container">
                            <div className="scene-diff-header">
                              <h4>潤稿比對</h4>
                              <div className="scene-diff-actions">
                                <button
                                  className="scene-diff-cancel-btn"
                                  onClick={() => {
                                    setShowSceneDiff(false);
                                    setPolishingSceneId(null);
                                    setPolishedSceneContent(null);
                                    setSceneDiffSelections({});
                                  }}
                                >
                                  取消
                                </button>
                                <button
                                  className="scene-diff-apply-btn"
                                  onClick={() => {
                                    const originalLines = scene.content.split('\n');
                                    const polishedLines = polishedSceneContent.split('\n');
                                    const diff = [];
                                    
                                    let origIdx = 0;
                                    let polishIdx = 0;
                                    
                                    while (origIdx < originalLines.length || polishIdx < polishedLines.length) {
                                      const origLine = originalLines[origIdx] || '';
                                      const polishLine = polishedLines[polishIdx] || '';
                                      const index = diff.length;
                                      
                                      if (origLine === polishLine) {
                                        const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'original';
                                        diff.push({ type: 'unchanged', original: origLine, polished: polishLine, selected, index });
                                        origIdx++;
                                        polishIdx++;
                                      } else if (origIdx < originalLines.length && polishIdx < polishedLines.length) {
                                        const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'original';
                                        diff.push({ type: 'modified', original: origLine, polished: polishLine, selected, index });
                                        origIdx++;
                                        polishIdx++;
                                      } else if (origIdx < originalLines.length) {
                                        const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'original';
                                        diff.push({ type: 'deleted', original: origLine, polished: '', selected, index });
                                        origIdx++;
                                      } else {
                                        const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'polished';
                                        diff.push({ type: 'added', original: '', polished: polishLine, selected, index });
                                        polishIdx++;
                                      }
                                    }
                                    
                                    const finalContent = diff.map(item => {
                                      const selected = sceneDiffSelections[item.index] !== undefined ? sceneDiffSelections[item.index] : item.selected;
                                      if (selected === 'polished' && item.polished) {
                                        return item.polished;
                                      } else if (selected === 'original' && item.original) {
                                        return item.original;
                                      }
                                      return '';
                                    }).filter(line => line !== '').join('\n');
                                    
                                    if (onUpdateScene) {
                                      onUpdateScene({
                                        ...scene,
                                        content: finalContent,
                                      });
                                    }
                                    
                                    setShowSceneDiff(false);
                                    setPolishingSceneId(null);
                                    setPolishedSceneContent(null);
                                    setSceneDiffSelections({});
                                  }}
                                >
                                  套用選擇
                                </button>
                              </div>
                            </div>
                            <div className="scene-diff-content">
                              {(() => {
                                const originalLines = scene.content.split('\n');
                                const polishedLines = polishedSceneContent.split('\n');
                                const diff = [];
                                
                                let origIdx = 0;
                                let polishIdx = 0;
                                
                                while (origIdx < originalLines.length || polishIdx < polishedLines.length) {
                                  const origLine = originalLines[origIdx] || '';
                                  const polishLine = polishedLines[polishIdx] || '';
                                  const index = diff.length;
                                  
                                  if (origLine === polishLine) {
                                    const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'original';
                                    diff.push({ type: 'unchanged', original: origLine, polished: polishLine, selected, index });
                                    origIdx++;
                                    polishIdx++;
                                  } else if (origIdx < originalLines.length && polishIdx < polishedLines.length) {
                                    const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'original';
                                    diff.push({ type: 'modified', original: origLine, polished: polishLine, selected, index });
                                    origIdx++;
                                    polishIdx++;
                                  } else if (origIdx < originalLines.length) {
                                    const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'original';
                                    diff.push({ type: 'deleted', original: origLine, polished: '', selected, index });
                                    origIdx++;
                                  } else {
                                    const selected = sceneDiffSelections[index] !== undefined ? sceneDiffSelections[index] : 'polished';
                                    diff.push({ type: 'added', original: '', polished: polishLine, selected, index });
                                    polishIdx++;
                                  }
                                }
                                
                                return diff.map((item) => {
                                  const selected = sceneDiffSelections[item.index] !== undefined ? sceneDiffSelections[item.index] : item.selected;
                                  return (
                                    <div key={item.index} className={`scene-diff-line scene-diff-${item.type}`}>
                                      <div className="scene-diff-selector">
                                        {item.original && (
                                          <label>
                                            <input
                                              type="radio"
                                              name={`scene-diff-${item.index}`}
                                              value="original"
                                              checked={selected === 'original'}
                                              onChange={() => {
                                                setSceneDiffSelections(prev => ({ ...prev, [item.index]: 'original' }));
                                              }}
                                            />
                                            <span>原始</span>
                                          </label>
                                        )}
                                        {(item.type === 'modified' || item.type === 'added') && item.polished && (
                                          <label>
                                            <input
                                              type="radio"
                                              name={`scene-diff-${item.index}`}
                                              value="polished"
                                              checked={selected === 'polished'}
                                              onChange={() => {
                                                setSceneDiffSelections(prev => ({ ...prev, [item.index]: 'polished' }));
                                              }}
                                            />
                                            <span>潤稿</span>
                                          </label>
                                        )}
                                      </div>
                                      <div className="scene-diff-text">
                                        {item.original && (
                                          <div className={`scene-diff-original ${selected === 'original' ? 'selected' : ''}`}>
                                            <span className="scene-diff-label">原始：</span>
                                            {item.original}
                                          </div>
                                        )}
                                        {(item.type === 'modified' || item.type === 'added') && item.polished && (
                                          <div className={`scene-diff-polished ${selected === 'polished' ? 'selected' : ''}`}>
                                            <span className="scene-diff-label">潤稿：</span>
                                            {item.polished}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 新增場次按鈕和表單 */}
                {addingSceneBeatId !== beat.id && editingSceneId !== `new-${beat.id}` && (
                  <button
                    className="add-scene-to-beat-btn"
                    onClick={() => {
                      setAddingSceneBeatId(beat.id);
                      setEditingSceneId(`new-${beat.id}`);
                      setNewScene({
                        number: scenes.length + 1,
                        dayNight: '',
                        title: '',
                        content: '',
                        location: '',
                        completed: false,
                      });
                      // 確保該大綱段落展開
                      setCollapsedBeats(prev => ({ ...prev, [beat.id]: false }));
                    }}
                  >
                    + 新增場次
                  </button>
                )}

                {/* 新增場次表單 */}
                {editingSceneId === `new-${beat.id}` && (
                  <div className="new-scene-form">
                    <div className="new-scene-form-header">
                      <span className="new-scene-form-title">新增場次</span>
                    </div>
                    <div className="new-scene-form-fields">
                      <div className="new-scene-field-row">
                        <div className="new-scene-field">
                          <label>場次數</label>
                          <input
                            type="number"
                            value={newScene.number}
                            onChange={(e) => setNewScene({ ...newScene, number: parseInt(e.target.value) || 1 })}
                            min="1"
                          />
                        </div>
                        <div className="new-scene-field">
                          <label>日/夜戲</label>
                          <select
                            value={newScene.dayNight}
                            onChange={(e) => setNewScene({ ...newScene, dayNight: e.target.value })}
                          >
                            <option value="">選擇日/夜</option>
                            <option value="日">日</option>
                            <option value="夜">夜</option>
                            <option value="晨">晨</option>
                            <option value="黃昏">黃昏</option>
                          </select>
                        </div>
                        <div className="new-scene-field">
                          <label>場景地點</label>
                          <input
                            type="text"
                            value={newScene.location}
                            onChange={(e) => setNewScene({ ...newScene, location: e.target.value })}
                            placeholder="輸入場景地點..."
                          />
                        </div>
                      </div>
                      <div className="new-scene-field">
                        <label>場次標題</label>
                        <input
                          type="text"
                          value={newScene.title}
                          onChange={(e) => setNewScene({ ...newScene, title: e.target.value })}
                          placeholder="輸入場次標題..."
                        />
                      </div>
                      <div className="new-scene-field">
                        <label>場次內容</label>
                        <textarea
                          value={newScene.content}
                          onChange={(e) => setNewScene({ ...newScene, content: e.target.value })}
                          placeholder="輸入場次內容..."
                          rows="6"
                        />
                      </div>
                    </div>
                    <div className="new-scene-form-actions">
                      <button
                        className="cancel-scene-btn"
                        onClick={() => {
                          setAddingSceneBeatId(null);
                          setEditingSceneId(null);
                          setNewScene({
                            number: scenes.length + 1,
                            dayNight: '',
                            title: '',
                            content: '',
                            location: '',
                            completed: false,
                          });
                        }}
                      >
                        取消
                      </button>
                      <button
                        className="save-scene-btn"
                        onClick={() => {
                          if (onAddScene) {
                            const sceneToAdd = {
                              ...newScene,
                              id: Date.now(),
                              beatId: beat.id,
                            };
                            // 新增場次並保存
                            onAddScene(sceneToAdd);
                            // 立即重置新增表單狀態，讓表單收合（折疊起來）
                            setAddingSceneBeatId(null);
                            setEditingSceneId(null);
                            // 重置表單內容，準備下一次新增
                            setNewScene({
                              number: scenes.length + 2,
                              dayNight: '',
                              title: '',
                              content: '',
                              location: '',
                              completed: false,
                            });
                            // 新增場次後，場次會自動顯示在場次列表中（卡片格式）
                            // 表單會收合，可以繼續點擊「+ 新增場次」按鈕來新增下一個場次
                          }
                        }}
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                )}


              </div>
              </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScriptOutline;

