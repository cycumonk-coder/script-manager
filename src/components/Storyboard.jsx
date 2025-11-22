import { useState, useEffect, useMemo } from 'react';
import { BEAT_SHEET_STRUCTURE } from './ScriptOutline';
import './Storyboard.css';

const Storyboard = ({ scenes, onUpdateScene }) => {
  const [selectedScenes, setSelectedScenes] = useState([]);
  const [selectedBeats, setSelectedBeats] = useState({}); // 追蹤選中的大綱 { beatId: true/false }
  const [expandedBeats, setExpandedBeats] = useState({}); // 追蹤展開的大綱
  const [storyboardItems, setStoryboardItems] = useState([]);
  const [generatingImage, setGeneratingImage] = useState({}); // 追蹤每個項目的生成狀態
  const [batchGenerating, setBatchGenerating] = useState(false); // 批次生成狀態

  // 按大綱分組場景
  const scenesByBeat = useMemo(() => {
    const grouped = {};
    
    // 初始化所有大綱
    BEAT_SHEET_STRUCTURE.forEach(beat => {
      grouped[beat.id] = {
        beat: beat,
        scenes: []
      };
    });
    
    // 未分類場景
    grouped['unclassified'] = {
      beat: { id: 'unclassified', label: '未分類', description: '未分配到任何大綱的場景' },
      scenes: []
    };
    
    // 將場景分配到對應的大綱
    if (scenes && scenes.length > 0) {
      scenes.forEach(scene => {
        const beatId = scene.beatId || 'unclassified';
        if (!grouped[beatId]) {
          grouped[beatId] = {
            beat: { id: beatId, label: beatId, description: '' },
            scenes: []
          };
        }
        grouped[beatId].scenes.push(scene);
      });
    }
    
    // 排序每個大綱下的場景
    Object.keys(grouped).forEach(beatId => {
      grouped[beatId].scenes.sort((a, b) => (a.number || 0) - (b.number || 0));
    });
    
    return grouped;
  }, [scenes]);

  // 將選中的場景轉換為分鏡圖項目
  useEffect(() => {
    if (selectedScenes.length > 0) {
      // 按場次編號排序
      const sortedScenes = [...selectedScenes].sort((a, b) => (a.number || 0) - (b.number || 0));
      
      const items = sortedScenes.map((scene, index) => ({
        id: scene.id || `storyboard-${index}`,
        sceneId: scene.id,
        sceneNumber: scene.number || index + 1,
        beatId: scene.beatId || null,
        beatLabel: scene.beatId ? (BEAT_SHEET_STRUCTURE.find(b => b.id === scene.beatId)?.label || scene.beatId) : null,
        description: scene.content || '',
        image: scene.storyboardImage || null,
        sound: scene.sound || '',
        notes: scene.notes || '',
        uploading: false  // 上傳狀態
      }));
      setStoryboardItems(items);
    } else {
      setStoryboardItems([]);
    }
  }, [selectedScenes]);

  // 處理大綱展開/收合
  const handleBeatToggle = (beatId) => {
    setExpandedBeats(prev => ({
      ...prev,
      [beatId]: !prev[beatId]
    }));
  };

  // 處理大綱選擇（選擇該大綱下的所有場景）
  const handleBeatSelect = (beatId) => {
    const beatScenes = scenesByBeat[beatId]?.scenes || [];
    if (beatScenes.length === 0) return;

    setSelectedBeats(prev => {
      const isSelected = prev[beatId];
      const newSelectedBeats = { ...prev };
      
      if (isSelected) {
        // 取消選擇該大綱的所有場景
        delete newSelectedBeats[beatId];
        setSelectedScenes(prevScenes => 
          prevScenes.filter(s => s.beatId !== beatId)
        );
      } else {
        // 選擇該大綱的所有場景
        newSelectedBeats[beatId] = true;
        setSelectedScenes(prevScenes => {
          const existingIds = new Set(prevScenes.map(s => s.id));
          const newScenes = beatScenes.filter(s => !existingIds.has(s.id));
          return [...prevScenes, ...newScenes];
        });
      }
      
      return newSelectedBeats;
    });
  };

  // 處理場景選擇
  const handleSceneToggle = (scene) => {
    setSelectedScenes(prev => {
      const exists = prev.find(s => s.id === scene.id);
      if (exists) {
        // 取消選擇時，如果該大綱下所有場景都被取消，也取消大綱選擇
        const beatId = scene.beatId;
        if (beatId) {
          const remaining = prev.filter(s => s.id !== scene.id);
          const beatScenes = scenesByBeat[beatId]?.scenes || [];
          const allUnselected = beatScenes.every(s => 
            s.id === scene.id || !remaining.find(rs => rs.id === s.id)
          );
          
          if (allUnselected) {
            setSelectedBeats(prevBeats => {
              const newBeats = { ...prevBeats };
              delete newBeats[beatId];
              return newBeats;
            });
          }
        }
        
        return prev.filter(s => s.id !== scene.id);
      } else {
        // 選擇場景時，檢查該大綱下的所有場景是否都被選中
        const beatId = scene.beatId;
        if (beatId) {
          const newSelected = [...prev, scene];
          const beatScenes = scenesByBeat[beatId]?.scenes || [];
          const allSelected = beatScenes.every(s => 
            newSelected.find(ns => ns.id === s.id)
          );
          
          if (allSelected) {
            setSelectedBeats(prevBeats => ({
              ...prevBeats,
              [beatId]: true
            }));
          }
        }
        
        return [...prev, scene];
      }
    });
  };

  // 處理圖片上傳
  const handleImageUpload = async (itemId, event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      event.target.value = ''; // 重置文件輸入
      return;
    }
    
    // 檢查檔案大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('圖片檔案太大，請選擇小於 10MB 的圖片');
      event.target.value = '';
      return;
    }
    
    try {
      // 先讀取為 base64 預覽
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target.result;
        
        // 先顯示本地預覽
        setStoryboardItems(prev => {
          return prev.map(item => 
            item.id === itemId 
              ? { ...item, image: imageData, uploading: true }
              : item
          );
        });
        
        // 檢查是否已連接 Google，如果已連接則上傳到 Google Drive
        try {
          const { isAuthenticated, uploadImageToDrive } = await import('../services/googleSheets');
          
          if (isAuthenticated()) {
            console.log('🖼️ [Storyboard] 已連接 Google，上傳分鏡圖到 Google Drive (photo/storyboard)...');
            
            try {
              // 分鏡圖存儲在 photo/storyboard 資料夾
              const uploadResult = await uploadImageToDrive(file, 'storyboard');
              console.log('✅ [Storyboard] 分鏡圖上傳到 Google Drive 成功 (photo/storyboard):', uploadResult.url);
              
              // 更新為 Google Drive URL
              const finalImageUrl = uploadResult.url || uploadResult.directUrl;
              
              // 驗證圖片 URL 是否可訪問（簡單驗證，超時後假設有效）
              const validateImageUrl = (url) => {
                return new Promise((resolve) => {
                  const testImage = new Image();
                  let resolved = false;
                  
                  const resolveOnce = (result) => {
                    if (!resolved) {
                      resolved = true;
                      resolve(result);
                    }
                  };
                  
                  testImage.onload = () => {
                    console.log('✅ [Storyboard] 圖片 URL 驗證成功:', url);
                    resolveOnce(true);
                  };
                  
                  testImage.onerror = () => {
                    console.warn('⚠️ [Storyboard] 圖片 URL 無法訪問，將使用本地壓縮圖片:', url);
                    resolveOnce(false);
                  };
                  
                  // 設置超時（3秒後假設 URL 有效，因為有時 CORS 會阻止驗證）
                  setTimeout(() => {
                    console.log('⏱️ [Storyboard] 圖片 URL 驗證超時，假設有效:', url);
                    resolveOnce(true);
                  }, 3000);
                  
                  testImage.src = url;
                });
              };
              
              const isValidUrl = await validateImageUrl(finalImageUrl);
              
              // 先獲取當前 item 以獲取 sceneId
              const currentItem = storyboardItems.find(i => i.id === itemId);
              
              if (isValidUrl) {
                // URL 有效，使用 Google Drive URL
                setStoryboardItems(prev => {
                  return prev.map(item => 
                    item.id === itemId 
                      ? { ...item, image: finalImageUrl, uploading: false }
                      : item
                  );
                });
                
                // 更新場景資料
                if (onUpdateScene && scenes && currentItem) {
                  const scene = scenes.find(s => s.id === currentItem.sceneId);
                  if (scene) {
                    onUpdateScene({
                      ...scene,
                      storyboardImage: finalImageUrl
                    });
                  }
                }
              } else {
                // URL 無效，保持使用本地 base64 圖片（必須保留 imageData）
                console.log('🔄 [Storyboard] 圖片 URL 無效，保持使用本地壓縮圖片');
                setStoryboardItems(prev => {
                  return prev.map(item => 
                    item.id === itemId 
                      ? { ...item, image: imageData, uploading: false }  // 保留圖片數據
                      : item
                  );
                });
                
                // 更新場景資料（使用本地圖片）
                if (onUpdateScene && scenes && currentItem) {
                  const scene = scenes.find(s => s.id === currentItem.sceneId);
                  if (scene) {
                    onUpdateScene({
                      ...scene,
                      storyboardImage: imageData  // 使用本地 base64 圖片
                    });
                  }
                }
              }
            } catch (uploadError) {
              console.error('❌ [Storyboard] 上傳到 Google Drive 失敗，使用本地圖片:', uploadError);
              // 如果上傳失敗，繼續使用本地 base64 圖片（必須保留 imageData）
              setStoryboardItems(prev => {
                const updated = prev.map(item => 
                  item.id === itemId 
                    ? { ...item, image: imageData, uploading: false }  // 保留圖片數據
                    : item
                );
                
                // 更新場景資料（使用本地圖片）
                const item = updated.find(i => i.id === itemId);
                if (item && onUpdateScene && scenes) {
                  const scene = scenes.find(s => s.id === item.sceneId);
                  if (scene) {
                    onUpdateScene({
                      ...scene,
                      storyboardImage: imageData  // 使用本地 base64 圖片
                    });
                  }
                }
                
                return updated;
              });
            }
          } else {
            // 未連接 Google，使用本地 base64 圖片
            console.log('🖼️ [Storyboard] 未連接 Google，使用本地壓縮圖片');
            setStoryboardItems(prev => {
              const updated = prev.map(item => 
                item.id === itemId 
                  ? { ...item, image: imageData, uploading: false }
                  : item
              );
              
              // 更新場景資料
              const item = updated.find(i => i.id === itemId);
              if (item && onUpdateScene && scenes) {
                const scene = scenes.find(s => s.id === item.sceneId);
                if (scene) {
                  onUpdateScene({
                    ...scene,
                    storyboardImage: imageData
                  });
                }
              }
              
              return updated;
            });
          }
        } catch (error) {
          console.error('❌ [Storyboard] 圖片處理失敗:', error);
          // 使用本地 base64 圖片作為備用
          setStoryboardItems(prev => {
            return prev.map(item => 
              item.id === itemId 
                ? { ...item, image: imageData, uploading: false }
                : item
            );
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ [Storyboard] 圖片上傳處理失敗:', error);
      alert('圖片處理失敗，請重試');
      event.target.value = '';
    }
  };

  // 處理文字說明更新
  const handleDescriptionChange = (itemId, value) => {
    setStoryboardItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId 
          ? { ...item, description: value }
          : item
      );
      
      // 更新場景資料
      const item = updated.find(i => i.id === itemId);
      if (item && onUpdateScene && scenes) {
        const scene = scenes.find(s => s.id === item.sceneId);
        if (scene) {
          onUpdateScene({
            ...scene,
            content: value
          });
        }
      }
      
      return updated;
    });
  };

  // 處理聲音更新
  const handleSoundChange = (itemId, value) => {
    setStoryboardItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId 
          ? { ...item, sound: value }
          : item
      );
      
      // 更新場景資料
      const item = updated.find(i => i.id === itemId);
      if (item && onUpdateScene && scenes) {
        const scene = scenes.find(s => s.id === item.sceneId);
        if (scene) {
          onUpdateScene({
            ...scene,
            sound: value
          });
        }
      }
      
      return updated;
    });
  };

  // 處理備註更新
  const handleNotesChange = (itemId, value) => {
    setStoryboardItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, notes: value }
          : item
      )
    );
  };

  // AI 生成分鏡圖
  const handleAIGenerateImage = async (itemId, silent = false) => {
    const item = storyboardItems.find(i => i.id === itemId);
    if (!item || !item.description.trim()) {
      if (!silent) {
        alert('請先輸入場次的文字說明');
      }
      return;
    }

    // 嘗試讀取 cursor_api_key（Settings 中保存的 key）
    let apiKey = localStorage.getItem('cursor_api_key');
    // 如果沒有，嘗試讀取 openai_api_key（備用 key）
    if (!apiKey) {
      apiKey = localStorage.getItem('openai_api_key');
    }
    
    if (!apiKey) {
      alert('請先到「設定」→「AI 服務」中設置 OpenAI API Key 才能使用 AI 生成功能。');
      return;
    }

    // 設置生成狀態
    setGeneratingImage(prev => ({ ...prev, [itemId]: true }));

    try {
      // 清理和優化用戶輸入的文字說明
      let sceneDescription = item.description.trim();
      
      // 限制描述長度，避免過長導致問題
      if (sceneDescription.length > 500) {
        sceneDescription = sceneDescription.substring(0, 500);
      }
      
      // 移除可能的敏感詞彙或特殊字符
      sceneDescription = sceneDescription
        .replace(/[^\w\s\u4e00-\u9fa5，。！？、：；（）【】《》]/g, ' ') // 保留中英文字符和常用標點
        .replace(/\s+/g, ' ') // 將多個空格合併為單個
        .trim();
      
      // 構建更安全、更專業的 prompt
      // 使用更中性的描述方式，專注於視覺構圖和分鏡圖風格
      // 明確說明這是電影分鏡圖，避免被誤判
      const prompt = `A professional film storyboard frame in black and white pencil sketch style, realistic cinematic composition, 16:9 aspect ratio. This is a movie storyboard panel showing a scene: ${sceneDescription}. Clean illustration style, professional filmmaking storyboard, visual composition for film production.`;
      
      console.log('生成分鏡圖 Prompt:', prompt);

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1792x1024', // 16:9 比例
          quality: 'standard',
          style: 'natural'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = '生成圖片失敗，請稍後再試。';
        
        if (response.status === 401) {
          errorMessage = 'API Key 不正確。請到「設定」中檢查並重新設置 OpenAI API Key。';
        } else if (response.status === 429) {
          errorMessage = '已超過 API 使用配額。請前往 https://platform.openai.com/account/billing 檢查帳單和配額。';
        } else if (response.status === 400) {
          // 處理安全系統拒絕的情況
          const errorMsg = (errorData.error?.message || '').toLowerCase();
          if (errorMsg.includes('safety system') || errorMsg.includes('content policy') || errorMsg.includes('rejected')) {
            errorMessage = '提示內容觸發了安全系統。建議：\n\n1. 調整文字說明，使用更中性、專業的電影描述\n2. 避免使用可能敏感的詞彙\n3. 專注於場景的視覺構圖描述（例如：位置、動作、構圖）\n4. 可以稍後再試，或修改場次內容後重新生成\n\n提示：您也可以使用「上傳圖片」功能手動上傳分鏡圖。';
          } else if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.data && data.data[0] && data.data[0].url) {
        const imageUrl = data.data[0].url;
        
        // 更新分鏡圖項目
        setStoryboardItems(prev => 
          prev.map(i => 
            i.id === itemId 
              ? { ...i, image: imageUrl }
              : i
          )
        );

        // 更新場景資料
        if (onUpdateScene && scenes) {
          const scene = scenes.find(s => s.id === item.sceneId);
          if (scene) {
            onUpdateScene({
              ...scene,
              storyboardImage: imageUrl
            });
          }
        }
      } else {
        throw new Error('未收到圖片 URL');
      }
    } catch (error) {
      console.error('AI 生成圖片錯誤:', error);
      if (!silent) {
        alert(error.message || '生成圖片時發生錯誤，請稍後再試。');
      }
      throw error; // 重新拋出錯誤以便批次生成處理
    } finally {
      // 清除生成狀態
      setGeneratingImage(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
    }
  };

  // 刪除分鏡圖項目
  const handleRemoveItem = (itemId) => {
    setStoryboardItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedScenes(prev => {
      const item = storyboardItems.find(i => i.id === itemId);
      if (item) {
        return prev.filter(s => s.id !== item.sceneId);
      }
      return prev;
    });
  };

  // 清除所有選擇
  const handleClearAll = () => {
    setSelectedScenes([]);
    setSelectedBeats({});
    setStoryboardItems([]);
  };

  // 全選所有場景
  const handleSelectAll = () => {
    if (scenes && scenes.length > 0) {
      setSelectedScenes([...scenes]);
      // 選中所有有大綱的場景
      const beatsToSelect = {};
      Object.keys(scenesByBeat).forEach(beatId => {
        if (scenesByBeat[beatId].scenes.length > 0) {
          beatsToSelect[beatId] = true;
        }
      });
      setSelectedBeats(beatsToSelect);
    }
  };

  // 批次生成分鏡圖（全部）
  const handleBatchGenerateAll = async () => {
    if (storyboardItems.length === 0) {
      alert('請先選擇要生成的場景');
      return;
    }

    const itemsToGenerate = storyboardItems.filter(item => 
      !item.image && item.description.trim()
    );

    if (itemsToGenerate.length === 0) {
      alert('沒有需要生成的項目。請確保選中的場景都有文字說明且尚未生成圖片。');
      return;
    }

    if (!confirm(`即將為 ${itemsToGenerate.length} 個分鏡圖生成圖片，這可能需要一些時間，是否繼續？`)) {
      return;
    }

    setBatchGenerating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // 逐個生成，添加延遲避免 API 限流
      for (let i = 0; i < itemsToGenerate.length; i++) {
        const item = itemsToGenerate[i];
        try {
          await handleAIGenerateImage(item.id, true); // true 表示靜默模式（不顯示錯誤彈窗）
          successCount++;
        } catch (error) {
          console.error(`生成分鏡 ${i + 1} 失敗:`, error);
          failCount++;
        }
        
        // 添加延遲（每秒最多 1 個請求）
        if (i < itemsToGenerate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      if (failCount > 0) {
        alert(`批次生成完成！成功：${successCount} 個，失敗：${failCount} 個。`);
      } else {
        alert(`批次生成完成！共生成 ${successCount} 張分鏡圖。`);
      }
    } catch (error) {
      console.error('批次生成錯誤:', error);
      alert(`批次生成過程中發生錯誤。成功：${successCount} 個，失敗：${failCount} 個。`);
    } finally {
      setBatchGenerating(false);
    }
  };

  // 批次生成分鏡圖（按大綱）
  const handleBatchGenerateByBeat = async (beatId) => {
    const beatScenes = scenesByBeat[beatId]?.scenes || [];
    if (beatScenes.length === 0) return;

    const itemsToGenerate = storyboardItems.filter(item => 
      item.beatId === beatId && !item.image && item.description.trim()
    );

    if (itemsToGenerate.length === 0) {
      alert('該大綱下沒有需要生成的項目。請確保場次都有文字說明且尚未生成圖片。');
      return;
    }

    if (!confirm(`即將為「${scenesByBeat[beatId].beat.label}」大綱下的 ${itemsToGenerate.length} 個分鏡圖生成圖片，是否繼續？`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    try {
      // 逐個生成，添加延遲避免 API 限流
      for (let i = 0; i < itemsToGenerate.length; i++) {
        const item = itemsToGenerate[i];
        try {
          await handleAIGenerateImage(item.id, true);
          successCount++;
        } catch (error) {
          console.error(`生成分鏡 ${i + 1} 失敗:`, error);
          failCount++;
        }
        
        if (i < itemsToGenerate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      if (failCount > 0) {
        alert(`「${scenesByBeat[beatId].beat.label}」大綱生成完成！成功：${successCount} 個，失敗：${failCount} 個。`);
      } else {
        alert(`「${scenesByBeat[beatId].beat.label}」大綱下的分鏡圖生成完成！共 ${successCount} 張。`);
      }
    } catch (error) {
      console.error('批次生成錯誤:', error);
      alert(`批次生成過程中發生錯誤。成功：${successCount} 個，失敗：${failCount} 個。`);
    }
  };

  return (
    <div className="storyboard-container">
      <div className="storyboard-header">
        <h3 className="storyboard-title">分鏡圖</h3>
        <div className="storyboard-actions">
          <button 
            className="action-btn select-all-btn"
            onClick={handleSelectAll}
            disabled={!scenes || scenes.length === 0}
          >
            全選場景
          </button>
          <button 
            className="action-btn batch-generate-btn"
            onClick={handleBatchGenerateAll}
            disabled={storyboardItems.length === 0 || batchGenerating}
          >
            {batchGenerating ? (
              <>
                <span className="spinner"></span>
                批次生成中...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                批次生成全部
              </>
            )}
          </button>
          <button 
            className="action-btn clear-btn"
            onClick={handleClearAll}
            disabled={storyboardItems.length === 0}
          >
            清除選擇
          </button>
        </div>
      </div>

      {/* 場景選擇區域 - 兩層結構：大綱 -> 場次 */}
      <div className="scene-selection-panel">
        <h4 className="panel-title">選擇要轉換的場景</h4>
        <div className="beat-selection-tree">
          {BEAT_SHEET_STRUCTURE.map(beat => {
            const beatData = scenesByBeat[beat.id];
            const beatScenes = beatData?.scenes || [];
            const isExpanded = expandedBeats[beat.id] ?? false;
            const isBeatSelected = selectedBeats[beat.id] || false;
            const hasScenes = beatScenes.length > 0;

            if (!hasScenes) return null;

            return (
              <div key={beat.id} className="beat-group">
                <div className="beat-header-row">
                  <label className="beat-checkbox-item">
                    <input
                      type="checkbox"
                      checked={isBeatSelected}
                      onChange={() => handleBeatSelect(beat.id)}
                    />
                    <span className="beat-label" onClick={() => handleBeatToggle(beat.id)}>
                      {beat.label}
                      <span className="beat-scene-count">({beatScenes.length} 個場景)</span>
                    </span>
                  </label>
                  <div className="beat-actions">
                    <button
                      className="beat-expand-btn"
                      onClick={() => handleBeatToggle(beat.id)}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <button
                      className="beat-generate-btn"
                      onClick={() => handleBatchGenerateByBeat(beat.id)}
                      disabled={batchGenerating || storyboardItems.filter(i => i.beatId === beat.id && !i.image && i.description.trim()).length === 0}
                      title="批次生成該大綱下的所有分鏡圖"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      </svg>
                      生成
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="scene-list-in-beat">
                    {beatScenes.map(scene => (
                      <label key={scene.id} className="scene-checkbox-item nested">
                        <input
                          type="checkbox"
                          checked={selectedScenes.some(s => s.id === scene.id)}
                          onChange={() => handleSceneToggle(scene)}
                        />
                        <span className="checkbox-label">
                          場次 {scene.number}
                          {scene.title && ` - ${scene.title}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* 未分類場景 */}
          {scenesByBeat['unclassified']?.scenes.length > 0 && (
            <div className="beat-group">
              <div className="beat-header-row">
                <label className="beat-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedBeats['unclassified'] || false}
                    onChange={() => handleBeatSelect('unclassified')}
                  />
                  <span className="beat-label" onClick={() => handleBeatToggle('unclassified')}>
                    未分類
                    <span className="beat-scene-count">({scenesByBeat['unclassified'].scenes.length} 個場景)</span>
                  </span>
                </label>
                <div className="beat-actions">
                  <button
                    className="beat-expand-btn"
                    onClick={() => handleBeatToggle('unclassified')}
                  >
                    {expandedBeats['unclassified'] ? '▼' : '▶'}
                  </button>
                </div>
              </div>
              
              {expandedBeats['unclassified'] && (
                <div className="scene-list-in-beat">
                  {scenesByBeat['unclassified'].scenes.map(scene => (
                    <label key={scene.id} className="scene-checkbox-item nested">
                      <input
                        type="checkbox"
                        checked={selectedScenes.some(s => s.id === scene.id)}
                        onChange={() => handleSceneToggle(scene)}
                      />
                      <span className="checkbox-label">
                        場次 {scene.number}
                        {scene.title && ` - ${scene.title}`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {scenes && scenes.length === 0 && (
            <p className="empty-message">目前沒有場景資料</p>
          )}
        </div>
      </div>

      {/* 分鏡圖顯示區域 */}
      {storyboardItems.length > 0 && (
        <div className="storyboard-content">
          <div className="storyboard-grid">
            {storyboardItems.map((item, index) => (
              <div key={item.id} className="storyboard-item">
                <div className="storyboard-item-header">
                  <span className="item-number">分鏡 {index + 1} - 場次 {item.sceneNumber}</span>
                  <button 
                    className="remove-item-btn"
                    onClick={() => handleRemoveItem(item.id)}
                    title="移除"
                  >
                    ×
                  </button>
                </div>
                
                <div className="storyboard-row">
                  {/* 左欄：文字說明 */}
                  <div className="storyboard-column description-column">
                    <label className="column-label">文字說明</label>
                    <textarea
                      className="description-input"
                      value={item.description}
                      onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                      placeholder="輸入場景的文字說明..."
                      rows={8}
                    />
                    {item.notes && (
                      <div className="notes-section">
                        <label className="notes-label">備註</label>
                        <textarea
                          className="notes-input"
                          value={item.notes}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="備註..."
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* 中欄：分鏡圖 */}
                  <div className="storyboard-column image-column">
                    <label className="column-label">分鏡圖</label>
                    <div className="image-upload-area">
                      {item.image ? (
                        <div className="image-preview">
                          {item.uploading && (
                            <div className="image-uploading-overlay">
                              <div className="upload-spinner"></div>
                              <span>上傳中...</span>
                            </div>
                          )}
                          <img src={item.image} alt={`分鏡 ${index + 1}`} />
                          <button 
                            className="change-image-btn"
                            onClick={() => document.getElementById(`image-input-${item.id}`).click()}
                          >
                            更換圖片
                          </button>
                          <button 
                            className="remove-image-btn"
                            onClick={() => {
                              setStoryboardItems(prev => 
                                prev.map(i => i.id === item.id ? { ...i, image: null } : i)
                              );
                            }}
                            title="刪除圖片"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="image-placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <p>點擊上傳分鏡圖</p>
                          <input
                            id={`image-input-${item.id}`}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(item.id, e)}
                          />
                          <div className="image-upload-actions">
                            <button 
                              className="upload-btn"
                              onClick={() => document.getElementById(`image-input-${item.id}`).click()}
                            >
                              上傳圖片
                            </button>
                            <button 
                              className="ai-generate-btn"
                              onClick={() => handleAIGenerateImage(item.id)}
                              disabled={generatingImage[item.id] || !item.description.trim()}
                              title={!item.description.trim() ? '請先輸入文字說明' : 'AI生成分鏡圖'}
                            >
                              {generatingImage[item.id] ? (
                                <>
                                  <span className="spinner"></span>
                                  生成中...
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                                  </svg>
                                  AI生成
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      <input
                        id={`image-input-${item.id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageUpload(item.id, e)}
                      />
                    </div>
                  </div>

                  {/* 右欄：聲音 */}
                  <div className="storyboard-column sound-column">
                    <label className="column-label">聲音</label>
                    <textarea
                      className="sound-input"
                      value={item.sound}
                      onChange={(e) => handleSoundChange(item.id, e.target.value)}
                      placeholder="輸入聲音描述（對白、音效、背景音樂等）..."
                      rows={8}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {storyboardItems.length === 0 && selectedScenes.length === 0 && (
        <div className="storyboard-empty">
          <p>請在上方選擇場景以生成分鏡圖</p>
        </div>
      )}
    </div>
  );
};

export default Storyboard;

