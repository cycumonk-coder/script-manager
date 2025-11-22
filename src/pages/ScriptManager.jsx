import { useState, useEffect, useRef, useCallback } from 'react';
import ProjectInfo from '../components/ProjectInfo';
import ScriptDashboard from '../components/ScriptDashboard';
import ScriptOutline from '../components/ScriptOutline';
import SceneEditor from '../components/SceneEditor';
import ImportExport from '../components/ImportExport';
import CharacterRelationship from '../components/CharacterRelationship';
import SceneGrouping from '../components/SceneGrouping';
import Settings from '../components/Settings';
import { 
  isAuthenticated, 
  loadProjectData, 
  saveProjectData,
  setSpreadsheetId 
} from '../services/googleSheets';
import { debugLocalStorage } from '../utils/debugLocalStorage';
import './ScriptManager.css';

const ScriptManager = () => {
  const [scriptData, setScriptData] = useState({
    deadline: '',
    totalScenes: 0,
    completedScenes: 0,
    title: '',
    coreIdea: '',
  });
  const [outline, setOutline] = useState({});
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [characterConnections, setCharacterConnections] = useState([]);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [googleSheetReady, setGoogleSheetReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const scriptDataRef = useRef(scriptData);
  const outlineRef = useRef(outline);
  const scenesRef = useRef(scenes);
  const charactersRef = useRef(characters);

  // 保持 ref 與 state 同步
  useEffect(() => {
    scriptDataRef.current = scriptData;
  }, [scriptData]);

  useEffect(() => {
    outlineRef.current = outline;
  }, [outline]);

  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  // 載入資料（只在首次載入時執行，避免覆蓋用戶輸入）
  useEffect(() => {
    // 只在首次載入時執行
    if (!isInitialLoadRef.current) return;
    
    const loadData = async () => {
      try {
        // 如果 Google Sheets 已認證且準備就緒，嘗試從 Google Sheets 載入
        if (googleAuthEnabled && googleSheetReady && isAuthenticated()) {
          try {
            const projectData = await loadProjectData();
            if (projectData.scriptData && Object.keys(projectData.scriptData).length > 0) {
              setScriptData(projectData.scriptData);
              setOutline(projectData.outline || {});
              setScenes(projectData.scenes || []);
              setCharacters(projectData.characters || []);
              setCharacterConnections(projectData.connections || []);
              isInitialLoadRef.current = false;
              return;
            }
          } catch (err) {
            console.warn('從 Google Sheets 載入失敗，改用 localStorage:', err);
          }
        }

        // 檢查 localStorage 是否可用
        if (!debugLocalStorage.isAvailable()) {
          console.error('❌ localStorage 不可用，無法載入資料');
          isInitialLoadRef.current = false;
          return;
        }

        // 檢查 localStorage 使用情況
        debugLocalStorage.checkUsage();

        // 從 localStorage 載入（作為備份或首次使用）
    const savedScriptData = localStorage.getItem('scriptData');
    const savedOutline = localStorage.getItem('scriptOutline');
    const savedScenes = localStorage.getItem('scriptScenes');
    const savedCharacters = localStorage.getItem('characters');
        const savedConnections = localStorage.getItem('characterConnections');
        
        console.log('🔵 [ScriptManager] 開始載入人物關係圖資料...');
        console.log('🔵 [ScriptManager] localStorage 中的 characters:', savedCharacters ? '存在' : '不存在');

    if (savedScriptData) {
          try {
            const parsedData = JSON.parse(savedScriptData);
            console.log('📂 從 localStorage 載入 scriptData:', parsedData);
            console.log('📂 載入的片名:', parsedData.title || '(空)');
            // 確保載入的資料包含所有必要欄位
            setScriptData({
              deadline: parsedData.deadline || '',
              totalScenes: parsedData.totalScenes || 0,
              completedScenes: parsedData.completedScenes || 0,
              title: parsedData.title || '',
              coreIdea: parsedData.coreIdea || '',
            });
          } catch (err) {
            console.error('❌ 解析 scriptData 失敗:', err);
          }
        } else {
          console.log('ℹ️ localStorage 中沒有 scriptData，使用預設值');
    }
    if (savedOutline) {
      setOutline(JSON.parse(savedOutline));
    }
    if (savedScenes) {
      const loadedScenes = JSON.parse(savedScenes);
      setScenes(loadedScenes);
          // 不再自動更新總場次數，由用戶手動輸入
        }
        if (savedCharacters) {
          try {
            const parsed = JSON.parse(savedCharacters);
            console.log('✅ [ScriptManager] 解析角色資料成功:', parsed);
            console.log('✅ [ScriptManager] 角色資料類型:', typeof parsed, Array.isArray(parsed) ? '(陣列)' : '(非陣列)');
            console.log('✅ [ScriptManager] 角色數量:', parsed.length);
            
            // 確保是陣列且不是空值
            if (Array.isArray(parsed)) {
              if (parsed.length > 0) {
                console.log('✅ [ScriptManager] 載入', parsed.length, '個角色:', parsed.map(c => c.name || '無名'));
                setCharacters(parsed);
                console.log('✅ [ScriptManager] 成功設置角色資料到狀態');
              } else {
                console.log('⚠️ [ScriptManager] 角色資料是空陣列');
                setCharacters([]);
              }
            } else {
              console.error('❌ [ScriptManager] 角色資料格式錯誤，不是陣列:', typeof parsed, parsed);
              setCharacters([]);
            }
          } catch (e) {
            console.error('❌ [ScriptManager] 解析角色資料失敗:', e);
            console.error('❌ [ScriptManager] 原始資料:', savedCharacters.substring(0, 200));
            setCharacters([]);
          }
        } else {
          console.log('⚠️ [ScriptManager] localStorage 中沒有角色資料');
          setCharacters([]);
        }
        
        if (savedConnections) {
          try {
            const parsed = JSON.parse(savedConnections);
            console.log('✅ [ScriptManager] 載入關係資料:', parsed.length, '個關係', parsed);
            setCharacterConnections(parsed);
          } catch (e) {
            console.error('❌ [ScriptManager] 載入關係資料失敗:', e);
          }
        } else {
          console.log('⚠️ [ScriptManager] 沒有找到關係資料');
        }
      } catch (err) {
        console.error('載入資料錯誤:', err);
      } finally {
        isInitialLoadRef.current = false;
      }
    };

    loadData();
  }, []); // 移除依賴，只在組件掛載時執行一次

  // 保存資料（同時保存到 Google Sheets 和 localStorage）
  const characterConnectionsRef = useRef(characterConnections);
  useEffect(() => {
    characterConnectionsRef.current = characterConnections;
  }, [characterConnections]);

  const saveToCloud = useCallback(async (data) => {
    if (!isInitialLoadRef.current && googleAuthEnabled && googleSheetReady && isAuthenticated()) {
      try {
        // 使用 ref 獲取最新狀態，避免依賴循環
        const currentScriptData = data.scriptData !== undefined ? data.scriptData : scriptDataRef.current;
        const currentOutline = data.outline !== undefined ? data.outline : outlineRef.current;
        const currentScenes = data.scenes !== undefined ? data.scenes : scenesRef.current;
        const currentCharacters = data.characters !== undefined ? data.characters : charactersRef.current;
        const currentConnections = data.connections !== undefined ? data.connections : characterConnectionsRef.current;
        
        await saveProjectData({
          scriptData: currentScriptData,
          outline: currentOutline,
          scenes: currentScenes,
          characters: currentCharacters,
          connections: currentConnections
        });
      } catch (err) {
        console.error('保存到 Google Sheets 失敗:', err);
      }
    }
  }, [googleAuthEnabled, googleSheetReady]);

  // 保存到 localStorage（始終作為備份）- 立即保存，使用獨立的 timeout
  const scriptDataTimeoutRef = useRef(null);
  const outlineTimeoutRef = useRef(null);
  const scenesTimeoutRef = useRef(null);
  const charactersTimeoutRef = useRef(null);

  useEffect(() => {
    if (isInitialLoadRef.current) {
      console.log('⏸️ 跳過初始載入，不保存');
      return;
    }
    
    // 立即保存到 localStorage（無延遲）
    try {
      const dataToSave = JSON.stringify(scriptData);
      localStorage.setItem('scriptData', dataToSave);
      console.log('✅ scriptData 已保存到 localStorage:', scriptData);
      console.log('💾 保存的完整資料:', dataToSave);
    } catch (err) {
      console.error('❌ 保存 scriptData 到 localStorage 失敗:', err);
    }
    
    // 延遲保存到雲端（避免過於頻繁的請求）
    if (scriptDataTimeoutRef.current) {
      clearTimeout(scriptDataTimeoutRef.current);
    }
    scriptDataTimeoutRef.current = setTimeout(() => {
      saveToCloud({ scriptData });
    }, 200); // 縮短到 200ms
    
    return () => {
      if (scriptDataTimeoutRef.current) {
        clearTimeout(scriptDataTimeoutRef.current);
      }
    };
  }, [scriptData, saveToCloud]);

  useEffect(() => {
    if (isInitialLoadRef.current) return;
    
    // 立即保存到 localStorage（無延遲）
    try {
    localStorage.setItem('scriptOutline', JSON.stringify(outline));
      console.log('✅ outline 已保存到 localStorage');
    } catch (err) {
      console.error('保存 outline 到 localStorage 失敗:', err);
    }
    
    // 延遲保存到雲端
    if (outlineTimeoutRef.current) {
      clearTimeout(outlineTimeoutRef.current);
    }
    outlineTimeoutRef.current = setTimeout(() => {
      saveToCloud({ outline });
    }, 100); // 即時儲存：100ms
    
    return () => {
      if (outlineTimeoutRef.current) {
        clearTimeout(outlineTimeoutRef.current);
      }
    };
  }, [outline, saveToCloud]);

  useEffect(() => {
    if (isInitialLoadRef.current) return;
    
    // 立即保存到 localStorage（無延遲）
    try {
    localStorage.setItem('scriptScenes', JSON.stringify(scenes));
      console.log('✅ scenes 已保存到 localStorage');
    } catch (err) {
      console.error('保存 scenes 到 localStorage 失敗:', err);
    }
    
    // 更新已完成場次數為實際場次數量（總場次數由用戶手動輸入，保持固定）
    const completedCount = scenes.length;
    setScriptData((prev) => {
      const updated = {
      ...prev,
      completedScenes: completedCount,
        // 總場次數保持用戶輸入的值不變
      };
      // 立即保存到 localStorage
      try {
        localStorage.setItem('scriptData', JSON.stringify(updated));
        console.log('✅ 已完成場次數已更新並保存:', completedCount);
      } catch (err) {
        console.error('保存已完成場次數到 localStorage 失敗:', err);
      }
      return updated;
    });
    
    // 延遲保存到雲端
    if (scenesTimeoutRef.current) {
      clearTimeout(scenesTimeoutRef.current);
    }
    scenesTimeoutRef.current = setTimeout(() => {
      saveToCloud({ scenes });
    }, 100); // 即時儲存：100ms
    
    return () => {
      if (scenesTimeoutRef.current) {
        clearTimeout(scenesTimeoutRef.current);
      }
    };
  }, [scenes, saveToCloud]);

  // 保存角色資料到 localStorage 和雲端
  useEffect(() => {
    if (isInitialLoadRef.current) {
      console.log('⏸️ [ScriptManager] 初始化中，跳過保存角色資料');
      return;
    }
    
    // 確保 characters 是陣列
    if (!Array.isArray(characters)) {
      console.error('❌ [ScriptManager] characters 不是陣列:', typeof characters, characters);
      return;
    }
    
    // 立即保存到 localStorage（無延遲）
    try {
      console.log('💾 [ScriptManager] 開始保存角色資料:', characters.length, '個角色');
      console.log('💾 [ScriptManager] 角色詳細列表:', characters.map(c => ({ id: c.id, name: c.name })));
      
      // 使用調試工具保存
      const saved = debugLocalStorage.setItem('characters', characters);
      
      if (saved) {
        // 立即驗證保存是否成功
        const verified = debugLocalStorage.getItem('characters');
        if (verified && Array.isArray(verified)) {
          console.log('✅ [ScriptManager] 角色資料保存並驗證成功:', verified.length, '個角色');
          
          if (verified.length !== characters.length) {
            console.error('❌ [ScriptManager] 保存的角色數量不一致！', {
              原始: characters.length,
              保存後: verified.length,
              原始角色: characters.map(c => c.name),
              保存後角色: verified.map(c => c.name)
            });
            
            // 嘗試重新保存
            console.log('🔄 [ScriptManager] 嘗試重新保存...');
            debugLocalStorage.setItem('characters', characters);
          } else {
            console.log('✅ [ScriptManager] 角色資料完整保存成功');
          }
        } else {
          console.error('❌ [ScriptManager] 驗證失敗：保存的資料不是陣列或為空');
        }
      } else {
        console.error('❌ [ScriptManager] 保存失敗');
      }
    } catch (err) {
      console.error('❌ [ScriptManager] 保存角色資料失敗:', err);
      // 如果 localStorage 空間不足，提示用戶
      if (err.name === 'QuotaExceededError') {
        const message = `儲存空間不足（localStorage 已滿，通常約 5-10MB）。\n\n可能原因：\n• 角色圖片佔用太多空間\n• 場次內容過多\n\n建議解決方法：\n1. 刪除部分角色的圖片（圖片會佔用大量空間）\n2. 清除瀏覽器快取和網站資料\n3. 使用 Google Sheets 雲端同步功能來儲存資料\n4. 匯出資料後清除 localStorage 再重新匯入`;
        alert(message);
      }
    }
    
    // 延遲保存到雲端
    if (charactersTimeoutRef.current) {
      clearTimeout(charactersTimeoutRef.current);
    }
    charactersTimeoutRef.current = setTimeout(() => {
      saveToCloud({ characters });
    }, 100); // 即時儲存：100ms
    
    return () => {
      if (charactersTimeoutRef.current) {
        clearTimeout(charactersTimeoutRef.current);
      }
    };
  }, [characters, saveToCloud]);

  // 保存關係資料到 localStorage 和雲端
  const connectionsTimeoutRef = useRef(null);
  useEffect(() => {
    if (isInitialLoadRef.current) {
      console.log('⏸️ [ScriptManager] 初始化中，跳過保存關係資料');
      return;
    }
    
    // 立即保存到 localStorage（無延遲）
    try {
      console.log('💾 [ScriptManager] 保存關係資料:', characterConnections.length, '個關係', characterConnections);
      localStorage.setItem('characterConnections', JSON.stringify(characterConnections));
      console.log('✅ [ScriptManager] 關係資料保存成功');
    } catch (err) {
      console.error('❌ [ScriptManager] 保存關係資料失敗:', err);
    }
    
    // 延遲保存到雲端
    if (connectionsTimeoutRef.current) {
      clearTimeout(connectionsTimeoutRef.current);
    }
    connectionsTimeoutRef.current = setTimeout(() => {
      saveToCloud({ connections: characterConnections });
    }, 100); // 即時儲存：100ms
    
    return () => {
      if (connectionsTimeoutRef.current) {
        clearTimeout(connectionsTimeoutRef.current);
      }
    };
  }, [characterConnections, saveToCloud]);

  // 處理 Google Sheets 認證狀態變化
  const handleAuthChange = (authenticated) => {
    setGoogleAuthEnabled(authenticated);
  };

  // 處理 Google Sheet 準備就緒
  const handleSpreadsheetReady = (sheetId) => {
    if (sheetId) {
      setSpreadsheetId(sheetId);
      setGoogleSheetReady(true);
      // Sheet 準備好後，嘗試同步資料
      saveToCloud({});
    }
  };

  const handleUpdateScriptData = (newData) => {
    console.log('📝 更新 scriptData:', newData);
    setScriptData(newData);
  };

  const handleUpdateOutline = (newOutline) => {
    setOutline(newOutline);
  };

  const handleSelectScene = (scene) => {
    setSelectedScene(scene);
    setShowEditor(true);
  };

  const handleUpdateScene = (updatedScene) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === updatedScene.id ? updatedScene : s))
    );
    if (selectedScene && selectedScene.id === updatedScene.id) {
      setSelectedScene(updatedScene);
    }
  };


  const handleDeleteScene = (sceneId) => {
    setScenes((prev) => {
      const filtered = prev.filter((s) => s.id !== sceneId);
      // 重新編號
      const updated = filtered.map((s, index) => ({ ...s, number: index + 1 }));
      // 更新已完成場次數（實際場次數量），總場次數保持用戶輸入的值不變
      const newCompletedCount = updated.length;
      setScriptData((prevData) => {
        const updatedData = {
          ...prevData,
          completedScenes: newCompletedCount,
          // 總場次數保持用戶輸入的值不變
        };
        // 立即保存到 localStorage
        try {
          localStorage.setItem('scriptData', JSON.stringify(updatedData));
          console.log('✅ 刪除場次後已完成場次數已更新並保存:', newCompletedCount);
        } catch (err) {
          console.error('保存已完成場次數到 localStorage 失敗:', err);
        }
        return updatedData;
      });
      return updated;
    });
    if (selectedScene && selectedScene.id === sceneId) {
      setSelectedScene(null);
      setShowEditor(false);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedScene(null);
  };

  return (
    <div className="script-manager">
      <div className="script-manager-header">
        <div className="header-left">
        <h1 className="app-title">劇本寫作管理</h1>
        <p className="app-subtitle">管理寫作進度，專注創作</p>
        </div>
        <button 
          className="settings-toggle-btn"
          onClick={() => setShowSettings(true)}
        >
          設定
        </button>
      </div>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onAuthChange={handleAuthChange}
          onSpreadsheetReady={handleSpreadsheetReady}
        />
      )}

      <div className="script-manager-content">
        <ProjectInfo
          scriptData={scriptData}
          onUpdateScriptData={handleUpdateScriptData}
        />

        <ScriptDashboard
          scriptData={scriptData}
          onUpdateScriptData={handleUpdateScriptData}
        />

        <ScriptOutline 
          outline={outline} 
          onUpdateOutline={handleUpdateOutline}
          scenes={scenes}
          onSelectScene={handleSelectScene}
          onUpdateScene={handleUpdateScene}
          onDeleteScene={handleDeleteScene}
          onAddScene={(newScene) => {
            // 新增場次並立即保存
            setScenes((prev) => {
              const updated = [...prev, newScene];
              // 立即保存到 localStorage
              try {
                localStorage.setItem('scriptScenes', JSON.stringify(updated));
                console.log('✅ 新增場次已保存到 localStorage');
              } catch (err) {
                console.error('保存場次到 localStorage 失敗:', err);
              }
              // 更新已完成場次數（實際新增的場次數量），總場次數保持用戶輸入的值不變
              const newCompletedCount = updated.length;
              setScriptData((prev) => {
                const updatedData = {
                  ...prev,
                  completedScenes: newCompletedCount,
                  // 總場次數保持用戶輸入的值不變
                };
                // 立即保存到 localStorage
                try {
                  localStorage.setItem('scriptData', JSON.stringify(updatedData));
                  console.log('✅ 已完成場次數已更新並保存:', newCompletedCount);
                } catch (err) {
                  console.error('保存已完成場次數到 localStorage 失敗:', err);
                }
                return updatedData;
              });
              return updated;
            });
          }}
          allScenes={scenes}
        />

        <CharacterRelationship 
          characters={characters}
          connections={characterConnections}
          onUpdateCharacters={(updatedCharacters) => {
            console.log('🔄 [ScriptManager] 收到角色更新:', updatedCharacters.length, '個角色');
            console.log('🔄 [ScriptManager] 更新前角色數量:', characters.length);
            console.log('🔄 [ScriptManager] 更新後角色數量:', updatedCharacters.length);
            console.log('🔄 [ScriptManager] 角色詳細資料:', updatedCharacters);
            
            // 確保是陣列
            if (!Array.isArray(updatedCharacters)) {
              console.error('❌ [ScriptManager] 接收到的角色資料不是陣列:', typeof updatedCharacters);
              return;
            }
            
            setCharacters(updatedCharacters);
            
            // 立即驗證
            setTimeout(() => {
              const current = localStorage.getItem('characters');
              if (current) {
                const parsed = JSON.parse(current);
                console.log('✅ [ScriptManager] 更新後驗證 localStorage:', parsed.length, '個角色');
                if (parsed.length !== updatedCharacters.length) {
                  console.error('❌ [ScriptManager] 角色數量不一致！', {
                    狀態: updatedCharacters.length,
                    localStorage: parsed.length
                  });
                }
              }
            }, 50);
          }}
          onUpdateConnections={(updatedConnections) => {
            console.log('🔄 [ScriptManager] 收到關係更新:', updatedConnections.length, '個關係');
            setCharacterConnections(updatedConnections);
          }}
        />

        <SceneGrouping
          scenes={scenes}
          onSelectScene={(scene) => {
            setSelectedScene(scene);
            setShowEditor(true);
          }}
        />

        <ImportExport
          scriptData={scriptData}
          outline={outline}
          scenes={scenes}
          onImport={(data) => {
            if (data.scriptData) setScriptData(data.scriptData);
            if (data.outline) setOutline(data.outline);
            if (data.scenes) setScenes(data.scenes);
          }}
        />
      </div>
    </div>
  );
};

export default ScriptManager;

