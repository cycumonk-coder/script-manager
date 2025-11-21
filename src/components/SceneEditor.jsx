import { useState, useEffect, useRef } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import AIImageSettings from './AIImageSettings';
import 'easymde/dist/easymde.min.css';
import './SceneEditor.css';

const SceneEditor = ({ scene, onUpdateScene, onClose, allScenes = [], isNewScene = false }) => {
  const [title, setTitle] = useState(scene?.title || '');
  const [content, setContent] = useState(scene?.content || '');
  const [dayNight, setDayNight] = useState(scene?.dayNight || '');
  const [location, setLocation] = useState(scene?.location || '');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isComposingTitle, setIsComposingTitle] = useState(false);
  const [compositionTitle, setCompositionTitle] = useState('');
  const [isComposingContent, setIsComposingContent] = useState(false);
  const [isComposingLocation, setIsComposingLocation] = useState(false);
  const [compositionLocation, setCompositionLocation] = useState('');
  const [contentUpdateTimeout, setContentUpdateTimeout] = useState(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [polishing, setPolishing] = useState(false);
  const [polishedContent, setPolishedContent] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const mdeInstanceRef = useRef(null);
  const eventHandlersAttachedRef = useRef(false);
  const stateRef = useRef({ title, content, dayNight, location, scene, isNewScene });
  
  // 保持 ref 與 state 同步
  useEffect(() => {
    stateRef.current = { title, content, dayNight, location, scene, isNewScene };
  }, [title, content, dayNight, location, scene, isNewScene]);

  const previousSceneIdRef = useRef(scene?.id);

  useEffect(() => {
    // 只在場景 ID 改變時更新狀態（切換到不同場景時）
    if (scene && scene.id !== previousSceneIdRef.current) {
      setTitle(scene.title || '');
      setContent(scene.content || '');
      setDayNight(scene.dayNight || '');
      setLocation(scene.location || '');
      previousSceneIdRef.current = scene.id;
      // 當場景改變時，重置事件監聽器標記
      eventHandlersAttachedRef.current = false;
    }
  }, [scene?.id]);

  // 提取所有已使用的場景名稱
  const getAllLocations = () => {
    const locations = new Set();
    allScenes.forEach(s => {
      if (s.location && s.location.trim()) {
        locations.add(s.location.trim());
      }
    });
    return Array.from(locations).sort();
  };

  // 處理場景輸入變化
  const handleLocationChange = (e) => {
    const value = e.target.value;
    if (isComposingLocation) {
      setCompositionLocation(value);
      return;
    }
    setLocation(value);
    
    // 顯示建議
    if (value.trim()) {
      const allLocations = getAllLocations();
      const filtered = allLocations.filter(loc => 
        loc.toLowerCase().includes(value.toLowerCase()) && 
        loc !== value.trim()
      );
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(filtered.length > 0);
    } else {
      setShowLocationSuggestions(false);
      setLocationSuggestions([]);
    }

    // 自動儲存（新增模式下不自動保存，需要點擊儲存按鈕）
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: stateRef.current.title,
        content: stateRef.current.content,
        dayNight: stateRef.current.dayNight,
        location: value,
      });
    }
  };

  const handleLocationCompositionStart = () => {
    setIsComposingLocation(true);
  };

  const handleLocationCompositionEnd = (e) => {
    setIsComposingLocation(false);
    const value = e.target.value;
    setLocation(value);
    setCompositionLocation('');
    
    // 自動儲存（新增模式下不自動保存，需要點擊儲存按鈕）
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: stateRef.current.title,
        content: stateRef.current.content,
        dayNight: stateRef.current.dayNight,
        location: value,
      });
    }
  };

  const handleLocationSuggestionClick = (suggestion) => {
    setLocation(suggestion);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    
    // 自動儲存（新增模式下不自動保存，需要點擊儲存按鈕）
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: stateRef.current.title,
        content: stateRef.current.content,
        dayNight: stateRef.current.dayNight,
        location: suggestion,
      });
    }
  };

  // 處理日/夜變化
  const handleDayNightChange = (e) => {
    const value = e.target.value;
    setDayNight(value);
    
    // 自動儲存（新增模式下不自動保存，需要點擊儲存按鈕）
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: stateRef.current.title,
        content: stateRef.current.content,
        dayNight: value,
        location: stateRef.current.location,
      });
    }
  };

  // 清理 timeout 當組件卸載時
  useEffect(() => {
    return () => {
      if (contentUpdateTimeout) {
        clearTimeout(contentUpdateTimeout);
      }
    };
  }, [contentUpdateTimeout]);

  const handleSave = () => {
    if (onUpdateScene && scene) {
      onUpdateScene({
        ...scene,
        title,
        content,
        dayNight,
        location,
      });
      // 如果是新增模式，關閉編輯器
      if (isNewScene && onClose) {
        onClose();
      }
    }
  };

  const handleContentChange = (value) => {
    setContent(value);
    
    // 如果正在輸入法合成中，不進行任何保存操作
    if (isComposingContent) {
      return;
    }
    
    // 如果不在輸入法合成中，正常自動儲存（但使用 debounce 避免過於頻繁）
    // 僅在編輯模式下自動保存
    if (!isNewScene) {
      if (contentUpdateTimeout) {
        clearTimeout(contentUpdateTimeout);
      }
      
      const timeout = setTimeout(() => {
        const currentState = stateRef.current;
        if (onUpdateScene && currentState.scene) {
      onUpdateScene({
            ...currentState.scene,
            title: currentState.title,
        content: value,
            dayNight: currentState.dayNight,
            location: currentState.location,
      });
        }
      }, 800); // 延遲 800ms 再保存，避免頻繁更新
      
      setContentUpdateTimeout(timeout);
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    if (isComposingTitle) {
      setCompositionTitle(newTitle);
      return;
    }
    setTitle(newTitle);
    // 自動儲存（新增模式下不自動保存，需要點擊儲存按鈕）
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: newTitle,
        content: stateRef.current.content,
        dayNight: stateRef.current.dayNight,
        location: stateRef.current.location,
      });
    }
  };

  const handleTitleCompositionStart = () => {
    setIsComposingTitle(true);
  };

  const handleTitleCompositionEnd = (e) => {
    setIsComposingTitle(false);
    const newTitle = e.target.value;
    setTitle(newTitle);
    setCompositionTitle('');
    // 自動儲存（新增模式下不自動保存，需要點擊儲存按鈕）
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: newTitle,
        content: stateRef.current.content,
        dayNight: stateRef.current.dayNight,
        location: stateRef.current.location,
      });
    }
  };

  // 計算 diff（使用狀態管理選擇）
  const [diffSelections, setDiffSelections] = useState({});
  
  // 潤稿功能
  const handlePolish = async () => {
    if (!content || !content.trim()) {
      alert('請先輸入場次內容');
      return;
    }

    setPolishing(true);
    setPolishedContent(null);
    setShowDiff(false);
    setDiffSelections({});

    try {
      const apiKey = localStorage.getItem('cursor_api_key');
      
      if (!apiKey) {
        alert('請先設置 Cursor API Key 才能使用潤稿功能。點擊⚙️按鈕進行設置。');
        setPolishing(false);
        return;
      }

      // 調用 Cursor API 進行潤稿
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
              content: `請潤稿以下劇本內容：\n\n${content}`
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
      
      setPolishedContent(polished);
      setShowDiff(true);
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
      } finally {
        setPolishing(false);
      }
  };

  // 計算 diff（使用狀態管理選擇）
  const calculateDiff = (original, polished) => {
    const originalLines = original.split('\n');
    const polishedLines = polished.split('\n');
    const diff = [];
    
    let origIdx = 0;
    let polishIdx = 0;
    
    while (origIdx < originalLines.length || polishIdx < polishedLines.length) {
      const origLine = originalLines[origIdx] || '';
      const polishLine = polishedLines[polishIdx] || '';
      const index = diff.length;
      
      if (origLine === polishLine) {
        diff.push({ 
          type: 'unchanged', 
          original: origLine, 
          polished: polishLine, 
          selected: diffSelections[index] !== undefined ? diffSelections[index] : 'original',
          index: index
        });
        origIdx++;
        polishIdx++;
      } else if (origIdx < originalLines.length && polishIdx < polishedLines.length) {
        // 兩行不同，顯示為修改
        diff.push({ 
          type: 'modified', 
          original: origLine, 
          polished: polishLine, 
          selected: diffSelections[index] !== undefined ? diffSelections[index] : 'original',
          index: index
        });
        origIdx++;
        polishIdx++;
      } else if (origIdx < originalLines.length) {
        // 原始有但潤稿後沒有（刪除）
        diff.push({ 
          type: 'deleted', 
          original: origLine, 
          polished: '', 
          selected: diffSelections[index] !== undefined ? diffSelections[index] : 'original',
          index: index
        });
        origIdx++;
      } else {
        // 潤稿後有但原始沒有（新增）
        diff.push({ 
          type: 'added', 
          original: '', 
          polished: polishLine, 
          selected: diffSelections[index] !== undefined ? diffSelections[index] : 'polished',
          index: index
        });
        polishIdx++;
      }
    }
    
    return diff;
  };

  // 應用選擇的內容
  const applySelectedContent = () => {
    if (!polishedContent) return;
    
    const diff = calculateDiff(content, polishedContent);
    const finalContent = diff.map(item => {
      const selected = diffSelections[item.index] !== undefined ? diffSelections[item.index] : item.selected;
      if (selected === 'polished' && item.polished) {
        return item.polished;
      } else if (selected === 'original' && item.original) {
        return item.original;
      }
      return '';
    }).filter(line => line !== '').join('\n');
    
    setContent(finalContent);
    setPolishedContent(null);
    setShowDiff(false);
    setDiffSelections({});
    
    // 自動保存
    if (onUpdateScene && stateRef.current.scene && !stateRef.current.isNewScene) {
      onUpdateScene({
        ...stateRef.current.scene,
        title: stateRef.current.title,
        content: finalContent,
        dayNight: stateRef.current.dayNight,
        location: stateRef.current.location,
      });
    }
  };

  const generateAIVisual = async () => {
    if (!scene) return;
    
    setGeneratingImage(true);
    setImageError('');

    try {
      // 從場次內容和標題生成提示詞
      const prompt = `Create a cinematic visual representation for a script scene. ${title ? `Title: ${title}.` : ''} ${content ? `Scene description: ${content.substring(0, 500)}` : 'Dramatic scene from a screenplay'}. Style: cinematic, professional, moody lighting, film still quality.`;
      
      // 使用 Cursor API（需要API key）
      const apiKey = localStorage.getItem('cursor_api_key');
      
      if (!apiKey) {
        // 如果沒有API key，提示用戶設置
        setImageError('請先設置 Cursor API Key 才能生成AI視覺圖。點擊⚙️按鈕進行設置。');
        setGeneratingImage(false);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '生成圖片失敗');
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;

      if (onUpdateScene) {
        onUpdateScene({
          ...scene,
          title,
          content,
          dayNight,
          location,
          visualImage: imageUrl,
        });
      }
    } catch (error) {
      console.error('生成AI圖片錯誤：', error);
      setImageError(error.message || '生成圖片失敗，請檢查API設置和網路連接');
    } finally {
      setGeneratingImage(false);
    }
  };

  if (!scene) {
    return (
      <div className="scene-editor empty">
        <div className="empty-editor">
          <p>請選擇一個場次開始編輯</p>
        </div>
      </div>
    );
  }

  const mdeOptions = {
    placeholder: '開始寫作你的場次內容...',
    spellChecker: false,
    status: false,
    autofocus: false,
    toolbar: [
      'bold',
      'italic',
      'heading',
      '|',
      'quote',
      'unordered-list',
      'ordered-list',
      '|',
      'link',
      'image',
      '|',
      'preview',
      'side-by-side',
      'fullscreen',
      '|',
      'guide',
    ],
    // 啟用中文輸入法支援
    inputStyle: 'contenteditable',
    nativeSpellcheck: false,
    // CodeMirror 選項以支援 IME（輸入法編輯器）
    codemirrorOptions: {
      lineWrapping: true,
      lineNumbers: false,
      inputStyle: 'contenteditable', // 使用 contenteditable 模式以更好支援 IME
      spellcheck: false,
      // 禁用自動完成以避免干擾中文輸入
      hintOptions: {
        completeSingle: false
      }
    }
  };

  return (
    <div className="scene-editor">
      <div className="editor-header">
        <div className="editor-title-section">
          <span className="scene-number-badge">{isNewScene ? '新增場次' : `場次 ${scene.number}`}</span>
          <div className="scene-meta-fields">
            <select
              className="day-night-select"
              value={dayNight}
              onChange={handleDayNightChange}
            >
              <option value="">選擇日/夜</option>
              <option value="日">日</option>
              <option value="夜">夜</option>
              <option value="晨">晨</option>
              <option value="黃昏">黃昏</option>
            </select>
            <div className="location-input-wrapper">
              <input
                type="text"
                className="location-input"
                value={isComposingLocation ? (compositionLocation || location) : location}
                onChange={handleLocationChange}
                onCompositionStart={handleLocationCompositionStart}
                onCompositionEnd={handleLocationCompositionEnd}
                onFocus={() => {
                  const allLocations = getAllLocations();
                  if (location.trim()) {
                    const filtered = allLocations.filter(loc => 
                      loc.toLowerCase().includes(location.toLowerCase()) && 
                      loc !== location.trim()
                    );
                    setLocationSuggestions(filtered);
                    setShowLocationSuggestions(filtered.length > 0);
                  } else if (allLocations.length > 0) {
                    setLocationSuggestions(allLocations);
                    setShowLocationSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // 延遲隱藏，讓點擊建議有時間執行
                  setTimeout(() => setShowLocationSuggestions(false), 200);
                }}
                placeholder="場景地點..."
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="location-suggestions">
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="location-suggestion-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleLocationSuggestionClick(suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          <input
            type="text"
            className="scene-title-input"
            value={isComposingTitle ? (compositionTitle || title) : title}
            onChange={handleTitleChange}
            onCompositionStart={handleTitleCompositionStart}
            onCompositionEnd={handleTitleCompositionEnd}
            placeholder="場次標題..."
          />
          </div>
          <div className="ai-visual-actions">
            {isNewScene ? (
              <button
                className="save-scene-btn"
                onClick={handleSave}
                disabled={!title.trim()}
                title="儲存場次"
              >
                儲存
              </button>
            ) : (
              <>
                <button
                  className="polish-btn"
                  onClick={handlePolish}
                  disabled={polishing || !content || !content.trim()}
                  title="潤稿"
                >
                  {polishing ? '潤稿中...' : '潤稿'}
                </button>
            <button
              className="generate-ai-visual-btn"
              onClick={generateAIVisual}
              disabled={generatingImage}
              title="生成AI視覺圖"
            >
              {generatingImage ? '生成中...' : '🎨 生成視覺圖'}
            </button>
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="AI設置"
            >
              ⚙️
            </button>
              </>
            )}
          </div>
        </div>
        {onClose && (
          <button className="close-editor-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {/* Diff 視圖 */}
      {showDiff && polishedContent && (
        <div className="diff-container">
          <div className="diff-header">
            <h3>潤稿比對</h3>
            <div className="diff-actions">
              <button
                className="diff-cancel-btn"
                onClick={() => {
                  setShowDiff(false);
                  setPolishedContent(null);
                  setDiffSelections({});
                }}
              >
                取消
              </button>
              <button
                className="diff-apply-btn"
                onClick={applySelectedContent}
              >
                套用選擇
              </button>
            </div>
          </div>
          <div className="diff-content">
            {calculateDiff(content, polishedContent).map((item) => {
              const selected = diffSelections[item.index] !== undefined ? diffSelections[item.index] : item.selected;
              return (
                <div key={item.index} className={`diff-line diff-${item.type}`}>
                  <div className="diff-selector">
                    {item.original && (
                      <label>
                        <input
                          type="radio"
                          name={`diff-${item.index}`}
                          value="original"
                          checked={selected === 'original'}
                          onChange={() => {
                            setDiffSelections(prev => ({ ...prev, [item.index]: 'original' }));
                          }}
                        />
                        <span>原始</span>
                      </label>
                    )}
                    {(item.type === 'modified' || item.type === 'added') && item.polished && (
                      <label>
                        <input
                          type="radio"
                          name={`diff-${item.index}`}
                          value="polished"
                          checked={selected === 'polished'}
                          onChange={() => {
                            setDiffSelections(prev => ({ ...prev, [item.index]: 'polished' }));
                          }}
                        />
                        <span>潤稿</span>
                      </label>
                    )}
                  </div>
                  <div className="diff-text">
                    {item.original && (
                      <div className={`diff-original ${selected === 'original' ? 'selected' : ''}`}>
                        <span className="diff-label">原始：</span>
                        {item.original}
                      </div>
                    )}
                    {(item.type === 'modified' || item.type === 'added') && item.polished && (
                      <div className={`diff-polished ${selected === 'polished' ? 'selected' : ''}`}>
                        <span className="diff-label">潤稿：</span>
                        {item.polished}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(generatingImage || scene.visualImage) && (
        <div className="visual-image-container">
          {generatingImage ? (
            <div className="image-loading">
              <div className="loading-spinner"></div>
              <p>正在生成視覺圖...</p>
            </div>
          ) : scene.visualImage ? (
            <>
              <img 
                src={scene.visualImage} 
                alt="場次視覺圖" 
                className="scene-visual-image"
                onError={() => setImageError('圖片載入失敗')}
              />
              <button
                className="remove-image-btn"
                onClick={() => {
                  if (onUpdateScene) {
                    onUpdateScene({
                      ...scene,
                      title,
                      content,
                      visualImage: null,
                    });
                  }
                }}
              >
                ×
              </button>
            </>
          ) : null}
        </div>
      )}

      {imageError && (
        <div className="image-error-message">
          {imageError}
        </div>
      )}

      {showSettings && (
        <AIImageSettings onClose={() => setShowSettings(false)} />
      )}

      <div className="editor-content">
        <SimpleMDE
          value={content}
          onChange={handleContentChange}
          options={mdeOptions}
          getMdeInstance={(instance) => {
            if (instance && instance.codemirror && !eventHandlersAttachedRef.current) {
              mdeInstanceRef.current = instance;
              const cm = instance.codemirror;
              
              // 只設置一次事件監聽器
              const handleCompositionStart = () => {
                setIsComposingContent(true);
              };
              
              const handleCompositionEnd = () => {
                setIsComposingContent(false);
                // 合成結束後，確保內容更新並保存（僅在編輯模式下）
                const value = cm.getValue();
                setContent(value);
                if (!isNewScene && onUpdateScene) {
                  setTimeout(() => {
                    const currentState = stateRef.current;
                    if (currentState.scene) {
                      onUpdateScene({
                        ...currentState.scene,
                        title: currentState.title,
                        content: value,
                        dayNight: currentState.dayNight,
                        location: currentState.location,
                      });
                    }
                  }, 200);
                }
              };
              
              cm.on('compositionstart', handleCompositionStart);
              cm.on('compositionend', handleCompositionEnd);
              
              eventHandlersAttachedRef.current = true;
              
              // 組件卸載時清理
              return () => {
                if (cm) {
                  cm.off('compositionstart', handleCompositionStart);
                  cm.off('compositionend', handleCompositionEnd);
                }
                eventHandlersAttachedRef.current = false;
              };
            }
          }}
        />
      </div>

      <div className="editor-footer">
        <button className="save-btn" onClick={handleSave}>
          儲存
        </button>
      </div>
    </div>
  );
};

export default SceneEditor;

