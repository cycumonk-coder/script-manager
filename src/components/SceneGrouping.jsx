import { useState, useMemo } from 'react';
import './SceneGrouping.css';

const SceneGrouping = ({ scenes, onSelectScene }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [compositionValue, setCompositionValue] = useState('');

  // 提取場景名稱/地點的關鍵字
  const extractLocationKeywords = (text) => {
    if (!text) return [];
    
    const keywords = new Set();
    
    // 1. 檢查標題中的場景名稱（格式：場景名稱：描述 或 場景名稱 - 描述）
    const titleMatch = text.match(/^(.+?)(?:[：:：\-—]|$)/);
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      // 過濾掉太短或太長的標題
      if (title.length > 1 && title.length < 30 && !title.match(/^(場次|第|Scene)/i)) {
        keywords.add(title);
      }
    }
    
    // 2. 常見場景標記詞模式
    const locationPatterns = [
      // 在/於/到 + 地點
      /(?:在|於|到|從|前往|回到|離開|進入|走出|來到|抵達)([^，。！？\n、，]+?)(?:[，。！？\n]|$)/g,
      // 地點 + 內/外/中/裡/前/後/上/下
      /([^：:：\n]+?)(?:的)?(?:內|外|中|裡|前|後|上|下|門口|門口|大廳|房間|辦公室|教室|餐廳|咖啡廳|公園|街道|車站|機場|醫院|學校|公司|家|房間|客廳|臥室|廚房|浴室)(?:[，。！？\n]|$)/g,
      // 場景/地點/位置 + 名稱
      /(?:場景|地點|位置|場所|地點)(?:：|:)?([^，。！？\n]+?)(?:[，。！？\n]|$)/g,
      // INT./EXT. 格式（好萊塢格式）
      /(?:INT\.|EXT\.|內景|外景)\s*[：:：]?\s*([^，。！？\n]+?)(?:[，。！？\n]|$)/gi,
    ];
    
    locationPatterns.forEach(pattern => {
      let match;
      // 重置正則表達式的 lastIndex
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        const keyword = match[1]?.trim();
        // 過濾掉常見的無意義詞彙
        const stopWords = ['的', '了', '是', '有', '在', '和', '與', '或', '但', '而', '這', '那', '一個', '一些', '什麼', '如何', '為什麼'];
        if (keyword && 
            keyword.length > 1 && 
            keyword.length < 25 && 
            !stopWords.includes(keyword) &&
            !keyword.match(/^\d+$/) && // 排除純數字
            !keyword.match(/^[a-zA-Z]+$/) && // 排除純英文單詞（除非是專有名詞）
            keyword.length > 2) { // 至少3個字元
          keywords.add(keyword);
        }
      }
    });
    
    // 3. 提取引號內的場景名稱
    const quotedMatches = text.match(/["「『]([^"」』]+?)["」』]/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const quoted = match.replace(/["「『」』]/g, '').trim();
        if (quoted.length > 2 && quoted.length < 25) {
          keywords.add(quoted);
        }
      });
    }
    
    return Array.from(keywords);
  };

  // 只在有搜尋關鍵字時才進行分組和過濾
  const filteredGroups = useMemo(() => {
    if (!scenes || scenes.length === 0) return {};
    
    // 如果沒有搜尋關鍵字，返回空物件（不顯示任何分組）
    if (!searchTerm.trim()) return {};

    const groups = {};
    const searchLower = searchTerm.toLowerCase().trim();
    
    // 用於追蹤已經添加的場景，避免重複
    const addedSceneIds = new Set();
    
    // 遍歷所有場景，只檢查場景地點欄位
    scenes.forEach(scene => {
      // 只檢查場景地點欄位是否包含搜尋關鍵字
      const location = (scene.location || '').toLowerCase().trim();
      
      // 如果場景地點包含搜尋關鍵字，且該場景尚未被添加
      if (location && location.includes(searchLower) && !addedSceneIds.has(scene.id)) {
        // 使用場景地點作為分組鍵
        const groupKey = scene.location || '未分類場景';
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        
        // 添加到對應的分組
        groups[groupKey].push(scene);
        // 標記為已添加，避免重複
        addedSceneIds.add(scene.id);
      }
    });

    return groups;
  }, [scenes, searchTerm]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (isComposing) {
      setCompositionValue(value);
      return;
    }
    setSearchTerm(value);
  };

  const handleSearchCompositionStart = () => {
    setIsComposing(true);
  };

  const handleSearchCompositionEnd = (e) => {
    setIsComposing(false);
    setSearchTerm(e.target.value);
    setCompositionValue('');
  };

  const sortedGroups = Object.entries(filteredGroups).sort((a, b) => {
    // 按場景數量排序，多的在前
    if (b[1].length !== a[1].length) {
      return b[1].length - a[1].length;
    }
    // 如果數量相同，按名稱排序
    return a[0].localeCompare(b[0], 'zh-TW');
  });

  // 匯出篩選後的場景資料
  const handleExportFilteredScenes = () => {
    if (sortedGroups.length === 0) {
      alert('目前沒有可匯出的場景資料');
      return;
    }

    // 收集所有篩選後的場景
    const allFilteredScenes = [];
    sortedGroups.forEach(([location, sceneList]) => {
      sceneList.forEach(scene => {
        allFilteredScenes.push({
          ...scene,
          groupLocation: location
        });
      });
    });

    // 按場次編號排序
    allFilteredScenes.sort((a, b) => (a.number || 0) - (b.number || 0));

    // 準備匯出資料
    const exportData = {
      searchTerm: searchTerm,
      exportDate: new Date().toISOString(),
      totalScenes: allFilteredScenes.length,
      groups: sortedGroups.map(([location, sceneList]) => ({
        location: location,
        sceneCount: sceneList.length,
        scenes: sceneList.sort((a, b) => (a.number || 0) - (b.number || 0))
      })),
      allScenes: allFilteredScenes
    };

    // 匯出為 JSON 格式
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `場景統整_${searchTerm}_${new Date().toISOString().split('T')[0]}.json`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 匯出為文字格式
  const handleExportAsText = () => {
    if (sortedGroups.length === 0) {
      alert('目前沒有可匯出的場景資料');
      return;
    }

    let text = `場景統整結果\n`;
    text += `搜尋關鍵字: ${searchTerm}\n`;
    text += `匯出日期: ${new Date().toLocaleString('zh-TW')}\n`;
    text += `總場景數: ${sortedGroups.reduce((sum, [, scenes]) => sum + scenes.length, 0)}\n`;
    text += `${'='.repeat(50)}\n\n`;

    sortedGroups.forEach(([location, sceneList]) => {
      text += `地點: ${location} (${sceneList.length} 個場景)\n`;
      text += `${'-'.repeat(50)}\n`;
      
      // 按場次編號排序
      const sortedScenes = [...sceneList].sort((a, b) => (a.number || 0) - (b.number || 0));
      
      sortedScenes.forEach((scene, index) => {
        text += `\n場次 ${scene.number}`;
        if (scene.title) {
          text += ` - ${scene.title}`;
        }
        text += `\n`;
        
        if (scene.location) {
          text += `地點: ${scene.location}\n`;
        }
        
        if (scene.content) {
          text += `內容:\n${scene.content}\n`;
        }
        
        if (index < sortedScenes.length - 1) {
          text += `\n${'-'.repeat(30)}\n`;
        }
      });
      
      text += `\n\n`;
    });

    // 匯出為文字檔
    const blob = new Blob([text], { 
      type: 'text/plain;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `場景統整_${searchTerm}_${new Date().toISOString().split('T')[0]}.txt`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmitNewScene = () => {
    if (!newScene.beatId) {
      alert('請選擇大綱');
      return;
    }
    if (onAddScene) {
      const sceneToAdd = {
        ...newScene,
        id: Date.now(),
        beatId: newScene.beatId,
      };
      onAddScene(sceneToAdd);
      // 重置表單
      setNewScene({
        number: scenes.length + 2,
        dayNight: '',
        beatId: '',
        title: '',
        content: '',
        location: '',
        completed: false,
      });
      setShowAddForm(false);
    }
  };

  return (
    <div className="scene-grouping">
      <div className="scene-grouping-header">
        <h3 className="section-title">場景統整</h3>
        <div className="scene-grouping-search">
          <input
            type="text"
            className="search-input"
            placeholder="搜尋場景地點..."
            value={isComposing ? (compositionValue || searchTerm) : searchTerm}
            onChange={handleSearchChange}
            onCompositionStart={handleSearchCompositionStart}
            onCompositionEnd={handleSearchCompositionEnd}
          />
          {sortedGroups.length > 0 && (
            <div className="export-buttons">
              <button 
                className="export-btn export-json-btn"
                onClick={handleExportFilteredScenes}
                title="匯出為 JSON 格式"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                匯出 JSON
              </button>
              <button 
                className="export-btn export-text-btn"
                onClick={handleExportAsText}
                title="匯出為文字格式"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                匯出文字
              </button>
            </div>
          )}
        </div>
      </div>

      {!searchTerm.trim() ? (
        <div className="scene-grouping-empty">
          <p>請在搜尋框中輸入關鍵字來查找相關場景</p>
          {scenes && scenes.length === 0 && (
            <p className="empty-hint">請先添加場次內容</p>
          )}
        </div>
      ) : sortedGroups.length === 0 ? (
        <div className="scene-grouping-empty">
          <p>目前沒有找到相關的場景分組</p>
        </div>
      ) : (
        <div className="scene-grouping-content">
          {sortedGroups.map(([location, sceneList]) => (
            <div key={location} className="scene-group">
              <div className="scene-group-header">
                <h4 className="scene-group-title">
                  {location}
                  <span className="scene-count-badge">{sceneList.length}</span>
                </h4>
              </div>
              <div className="scene-group-list">
                {sceneList.map(scene => (
                  <div
                    key={scene.id}
                    className="scene-group-item"
                    onClick={() => onSelectScene && onSelectScene(scene)}
                  >
                    <div className="scene-item-header">
                      <span className="scene-item-number">場次 {scene.number}</span>
                      {scene.title && (
                        <span className="scene-item-title">{scene.title}</span>
                      )}
                    </div>
                    {scene.content && (
                      <div className="scene-item-preview">
                        {scene.content.substring(0, 100)}
                        {scene.content.length > 100 && '...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SceneGrouping;

