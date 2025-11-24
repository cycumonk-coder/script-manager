import { useState, useEffect, useRef, useCallback } from 'react';
import ProjectInfo from '../components/ProjectInfo';
import ScriptDashboard from '../components/ScriptDashboard';
import ScriptOutline from '../components/ScriptOutline';
import SceneEditor from '../components/SceneEditor';
import ImportExport from '../components/ImportExport';
import CharacterRelationship from '../components/CharacterRelationship';
import SceneGrouping from '../components/SceneGrouping';
import Storyboard from '../components/Storyboard';
import Settings from '../components/Settings';
import LoginPage from './LoginPage';
import { 
  isAuthenticated, 
  loadProjectData, 
  saveProjectData,
  setSpreadsheetId,
  getSpreadsheetId,
  createNewSpreadsheet,
  setAccessToken,
  saveAccessToken,
  clearAuth
} from '../services/googleSheets';
import { debugLocalStorage } from '../utils/debugLocalStorage';
import { 
  getUserStorageItem, 
  setUserStorageItem, 
  removeUserStorageItem,
  getCurrentUserId,
  migrateOldDataToUserData,
  clearUserStorage
} from '../utils/userStorage';
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
  const [activeTab, setActiveTab] = useState('project');
  const [userInfo, setUserInfo] = useState(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false); // 追蹤資料載入狀態
  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const hasLoadedDataRef = useRef(false); // 追蹤是否已經載入過資料
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

  // 每次組件掛載時重置載入標記
  useEffect(() => {
    // 組件掛載時重置載入標記，確保每次重新整理都能載入資料
    isInitialLoadRef.current = true;
    hasLoadedDataRef.current = false;
    console.log('🔄 [組件掛載] 重置載入標記，準備載入資料');
  }, []); // 只在組件掛載時執行一次

  // 載入資料（當登入狀態確定後執行）
  useEffect(() => {
    // 如果已經載入過資料，跳過（避免重複載入）
    if (hasLoadedDataRef.current) {
      console.log('⏸️ [資料載入] 已經載入過資料，跳過');
      return;
    }
    
    // 只在初始載入時執行
    if (!isInitialLoadRef.current) {
      return;
    }
    
    // 檢查是否已登入
    const savedUserInfo = localStorage.getItem('google_user_info');
    const savedToken = localStorage.getItem('google_access_token');
    
    if (!savedUserInfo || !savedToken) {
      console.log('⚠️ [資料載入] 未登入，跳過資料載入');
      isInitialLoadRef.current = false;
      return;
    }
    
    // 確保登入狀態已設置
    if (!isGoogleLoggedIn || !userInfo?.id) {
      console.log('⏳ [資料載入] 等待登入狀態設置...', {
        isGoogleLoggedIn,
        hasUserInfo: !!userInfo,
        userId: userInfo?.id
      });
      return;
    }
    
    console.log('🔄 [資料載入] 開始載入資料...', { 
      isInitialLoad: isInitialLoadRef.current,
      isGoogleLoggedIn,
      hasUserInfo: !!userInfo,
      userId: userInfo?.id
    });
    
    const loadData = async () => {
      try {
        // 設置載入狀態，禁用自動保存
        setIsDataLoading(true);
        console.log('🔄 [資料載入] 開始載入資料，已禁用自動保存');
        
        // 直接從 localStorage 讀取用戶資訊，確保獲取正確的用戶 ID
        let userId = null;
        try {
          const userInfoStr = localStorage.getItem('google_user_info');
          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            userId = userInfo?.id;
            console.log('📋 [資料載入] 從 localStorage 獲取用戶 ID:', userId);
          }
        } catch (e) {
          console.error('❌ [資料載入] 解析用戶資訊失敗:', e);
        }
        
        if (!userId) {
          console.warn('⚠️ [資料載入] 無法獲取用戶 ID，跳過載入');
          isInitialLoadRef.current = false;
          setIsDataLoading(false);
          return;
        }
        
        // 遷移舊數據（如果存在）
        migrateOldDataToUserData(userId);
        
        console.log('📂 [資料載入] 使用的用戶 ID:', userId);
        
        // 先嘗試從 Google Sheets 載入資料
        // 只要有 token 和 spreadsheet ID，就嘗試載入（不一定要 googleSheetReady 為 true）
        let cloudData = null;
        const hasToken = isAuthenticated();
        const hasSheetId = getSpreadsheetId();
        
        console.log('🔍 [資料載入] 檢查載入條件:', {
          googleAuthEnabled,
          hasToken,
          hasSheetId,
          sheetId: hasSheetId
        });
        
        // 只要有 token 和 spreadsheet ID 就嘗試載入（不依賴 googleAuthEnabled）
        if (hasToken && hasSheetId) {
          try {
            console.log('☁️ [資料載入] 嘗試從 Google Sheets 載入資料...');
            cloudData = await loadProjectData();
            console.log('☁️ [資料載入] Google Sheets 載入完成，資料詳情:', {
              hasScriptData: !!cloudData?.scriptData,
              scriptDataKeys: cloudData?.scriptData ? Object.keys(cloudData.scriptData) : [],
              scriptDataTitle: cloudData?.scriptData?.title || '(無標題)',
              scriptDataCoreIdea: cloudData?.scriptData?.coreIdea || '(無核心概念)',
              outlineKeys: Object.keys(cloudData?.outline || {}),
              scenesCount: cloudData?.scenes?.length || 0,
              charactersCount: cloudData?.characters?.length || 0,
              connectionsCount: cloudData?.connections?.length || 0,
              fullData: cloudData // 輸出完整資料以便調試
            });
            
            // 如果成功載入資料，確保狀態正確
            if (cloudData) {
              setGoogleAuthEnabled(true);
              setGoogleSheetReady(true);
            }
          } catch (err) {
            console.error('❌ [資料載入] 從 Google Sheets 載入失敗:', err);
            console.warn('⚠️ [資料載入] 將使用 localStorage 作為備份');
            // 如果載入失敗，可能是 spreadsheet 不存在，嘗試創建
            if (err.message && err.message.includes('not found')) {
              console.log('ℹ️ [資料載入] Google Sheets 不存在，將在需要時創建');
            }
          }
        } else {
          console.log('ℹ️ [資料載入] 跳過 Google Sheets 載入（缺少必要條件）:', {
            hasToken,
            hasSheetId
          });
        }
        
        // 如果從 Google Sheets 載入成功且有資料，使用雲端資料；否則使用 localStorage
        // 檢查 cloudData 是否為空物件（只有空鍵值對）
        const hasCloudData = cloudData && (
          (cloudData.scriptData && Object.keys(cloudData.scriptData).length > 0 && (cloudData.scriptData.title || cloudData.scriptData.coreIdea)) ||
          (cloudData.outline && Object.keys(cloudData.outline).length > 0) ||
          (cloudData.scenes && cloudData.scenes.length > 0) ||
          (cloudData.characters && cloudData.characters.length > 0) ||
          (cloudData.connections && cloudData.connections.length > 0)
        );
        
        const savedScriptData = hasCloudData && cloudData.scriptData ? cloudData.scriptData : getUserStorageItem(userId, 'scriptData');
        const savedOutline = hasCloudData && cloudData.outline ? cloudData.outline : getUserStorageItem(userId, 'scriptOutline');
        const savedScenes = hasCloudData && cloudData.scenes ? cloudData.scenes : getUserStorageItem(userId, 'scriptScenes');
        const savedCharacters = hasCloudData && cloudData.characters ? cloudData.characters : getUserStorageItem(userId, 'characters');
        const savedConnections = hasCloudData && cloudData.connections ? cloudData.connections : getUserStorageItem(userId, 'characterConnections');
        
        console.log('📦 [資料載入] 最終使用的資料來源:', hasCloudData ? 'Google Sheets' : 'localStorage');
        console.log('📦 [資料載入] 找到的資料:', {
          userId,
          hasCloudData,
          scriptData: !!savedScriptData,
          scriptDataTitle: savedScriptData?.title || '(無)',
          scriptDataCoreIdea: savedScriptData?.coreIdea || '(無)',
          outline: !!savedOutline,
          scenes: savedScenes?.length || 0,
          characters: savedCharacters?.length || 0,
          connections: savedConnections?.length || 0
        });
        
        // 如果從 Google Sheets 載入成功，同步到 localStorage
        if (cloudData && (cloudData.scriptData || cloudData.outline || cloudData.scenes || cloudData.characters || cloudData.connections)) {
          console.log('💾 [資料載入] 將 Google Sheets 資料同步到 localStorage...');
          if (cloudData.scriptData) setUserStorageItem(userId, 'scriptData', cloudData.scriptData);
          if (cloudData.outline) setUserStorageItem(userId, 'scriptOutline', cloudData.outline);
          if (cloudData.scenes) setUserStorageItem(userId, 'scriptScenes', cloudData.scenes);
          if (cloudData.characters) setUserStorageItem(userId, 'characters', cloudData.characters);
          if (cloudData.connections) setUserStorageItem(userId, 'characterConnections', cloudData.connections);
        }
        
        // 載入 scriptData
        // 檢查 savedScriptData 是否真的有意義的資料（不只是空物件）
        const hasValidScriptData = savedScriptData && (
          savedScriptData.title ||
          savedScriptData.coreIdea ||
          savedScriptData.deadline ||
          savedScriptData.totalScenes > 0 ||
          savedScriptData.completedScenes > 0
        );
        
        if (hasValidScriptData) {
          try {
            const scriptDataToSet = {
              deadline: savedScriptData.deadline || '',
              totalScenes: savedScriptData.totalScenes || 0,
              completedScenes: savedScriptData.completedScenes || 0,
              title: savedScriptData.title || '',
              coreIdea: savedScriptData.coreIdea || '',
            };
            console.log('📝 [資料載入] 準備設置 scriptData:', scriptDataToSet);
            setScriptData(scriptDataToSet);
            console.log('✅ [資料載入] 載入 scriptData 成功:', scriptDataToSet.title || '(空標題)', {
              coreIdea: scriptDataToSet.coreIdea || '(空核心概念)',
              deadline: scriptDataToSet.deadline || '(無截止日期)'
            });
          } catch (err) {
            console.error('❌ [資料載入] 載入 scriptData 失敗:', err);
          }
        } else {
          console.log('ℹ️ [資料載入] 沒有找到有效的 scriptData（可能是空物件），將使用預設值');
          // 不設置空資料，保持現有狀態或使用預設值
        }
        
        // 載入 outline
        if (savedOutline) {
          try {
            setOutline(savedOutline);
            console.log('✅ [資料載入] 載入 outline 成功');
          } catch (err) {
            console.error('❌ [資料載入] 載入 outline 失敗:', err);
          }
        }
        
        // 載入 scenes
        if (savedScenes && Array.isArray(savedScenes)) {
          try {
            setScenes(savedScenes);
            console.log('✅ [資料載入] 載入 scenes 成功:', savedScenes.length, '個場次');
          } catch (err) {
            console.error('❌ [資料載入] 載入 scenes 失敗:', err);
          }
        }
        
        // 載入 characters
        if (savedCharacters && Array.isArray(savedCharacters)) {
          try {
            setCharacters(savedCharacters);
            console.log('✅ [資料載入] 載入 characters 成功:', savedCharacters.length, '個角色');
          } catch (e) {
            console.error('❌ [資料載入] 載入 characters 失敗:', e);
          }
        }
        
        // 載入 connections
        if (savedConnections && Array.isArray(savedConnections)) {
          try {
            setCharacterConnections(savedConnections);
            console.log('✅ [資料載入] 載入 connections 成功:', savedConnections.length, '個關係');
          } catch (e) {
            console.error('❌ [資料載入] 載入 connections 失敗:', e);
          }
        }
        
        console.log('✅ [資料載入] 資料載入完成，將啟用自動保存');
        isInitialLoadRef.current = false;
        hasLoadedDataRef.current = true; // 標記為已載入
        
        // 等待一個 tick，確保所有 state 更新完成後再啟用自動保存
        setTimeout(() => {
          setIsDataLoading(false);
          console.log('✅ [資料載入] 自動保存已啟用');
        }, 100);
      } catch (err) {
        console.error('❌ [資料載入] 載入資料錯誤:', err);
        isInitialLoadRef.current = false;
        hasLoadedDataRef.current = true; // 即使失敗也標記為已嘗試載入
        setIsDataLoading(false);
      }
    };
    
    // 稍微延遲，確保登入狀態已設置
    const timer = setTimeout(() => {
      loadData();
    }, 200); // 增加延遲時間，確保所有狀態都已設置
    
    return () => clearTimeout(timer);
  }, [isGoogleLoggedIn, userInfo?.id]); // 只依賴登入狀態，移除其他依賴避免重複觸發

  // 移除重複的載入邏輯，統一使用上面的 useEffect
  // 這個 useEffect 已經不再需要，因為上面的邏輯已經處理了所有情況
  useEffect(() => {
    // 如果已經載入過資料，跳過
    if (hasLoadedDataRef.current) {
      return;
    }
    
    // 如果登入狀態變為已登入，且是初始載入狀態，則載入資料
    if (isGoogleLoggedIn && userInfo && userInfo.id && isInitialLoadRef.current) {
      console.log('🔄 登入狀態改變且為初始載入，開始載入用戶資料', {
        userId: userInfo.id,
        email: userInfo.email,
        isInitialLoad: isInitialLoadRef.current
      });
      
      const loadData = async () => {
        try {
          // 設置載入狀態，禁用自動保存
          setIsDataLoading(true);
          console.log('🔄 開始載入用戶資料，已禁用自動保存');
          
          const userId = userInfo?.id || getCurrentUserId();
          console.log('📂 載入用戶資料，userId:', userId);
          
          if (!userId) {
            console.warn('⚠️ 無法獲取用戶 ID，跳過載入');
            isInitialLoadRef.current = false;
            setIsDataLoading(false);
            return;
          }
          
          // 遷移舊數據（如果存在）
          migrateOldDataToUserData(userId);
          
          // 先嘗試從 Google Sheets 載入資料
          // 只要有 token 和 spreadsheet ID，就嘗試載入（不一定要 googleSheetReady 為 true）
          let cloudData = null;
          const hasToken = isAuthenticated();
          const hasSheetId = getSpreadsheetId();
          
          if (googleAuthEnabled && hasToken && hasSheetId) {
            try {
              console.log('☁️ 嘗試從 Google Sheets 載入資料...', {
                hasToken,
                hasSheetId,
                sheetId: hasSheetId
              });
              cloudData = await loadProjectData();
              console.log('☁️ Google Sheets 資料:', {
                scriptData: !!cloudData?.scriptData && Object.keys(cloudData.scriptData).length > 0,
                outline: Object.keys(cloudData?.outline || {}).length,
                scenes: cloudData?.scenes?.length || 0,
                characters: cloudData?.characters?.length || 0,
                connections: cloudData?.connections?.length || 0
              });
              
              // 如果成功載入資料，確保 googleSheetReady 為 true
              if (cloudData && (cloudData.scriptData || cloudData.outline || cloudData.scenes || cloudData.characters || cloudData.connections)) {
                setGoogleSheetReady(true);
              }
            } catch (err) {
              console.warn('⚠️ 從 Google Sheets 載入失敗，將使用 localStorage:', err);
              // 如果載入失敗，可能是 spreadsheet 不存在，嘗試創建
              if (err.message && err.message.includes('not found')) {
                console.log('ℹ️ Google Sheets 不存在，將在需要時創建');
              }
            }
          } else {
            console.log('ℹ️ 跳過 Google Sheets 載入:', {
              googleAuthEnabled,
              hasToken,
              hasSheetId
            });
          }
          
          // 如果從 Google Sheets 載入成功且有資料，使用雲端資料；否則使用 localStorage
          const savedScriptData = cloudData?.scriptData || getUserStorageItem(userId, 'scriptData');
          const savedOutline = cloudData?.outline || getUserStorageItem(userId, 'scriptOutline');
          const savedScenes = cloudData?.scenes || getUserStorageItem(userId, 'scriptScenes');
          const savedCharacters = cloudData?.characters || getUserStorageItem(userId, 'characters');
          const savedConnections = cloudData?.connections || getUserStorageItem(userId, 'characterConnections');
          
          console.log('📦 最終使用的資料來源:', cloudData ? 'Google Sheets' : 'localStorage');
          console.log('📦 載入的資料:', {
            scriptData: !!savedScriptData,
            outline: !!savedOutline,
            scenes: savedScenes?.length || 0,
            characters: savedCharacters?.length || 0,
            connections: savedConnections?.length || 0
          });
          
          // 如果從 Google Sheets 載入成功，同步到 localStorage
          if (cloudData && (cloudData.scriptData || cloudData.outline || cloudData.scenes || cloudData.characters || cloudData.connections)) {
            console.log('💾 將 Google Sheets 資料同步到 localStorage...');
            if (cloudData.scriptData) setUserStorageItem(userId, 'scriptData', cloudData.scriptData);
            if (cloudData.outline) setUserStorageItem(userId, 'scriptOutline', cloudData.outline);
            if (cloudData.scenes) setUserStorageItem(userId, 'scriptScenes', cloudData.scenes);
            if (cloudData.characters) setUserStorageItem(userId, 'characters', cloudData.characters);
            if (cloudData.connections) setUserStorageItem(userId, 'characterConnections', cloudData.connections);
          }
          
          // 載入 scriptData
          if (savedScriptData) {
            try {
              setScriptData({
                deadline: savedScriptData.deadline || '',
                totalScenes: savedScriptData.totalScenes || 0,
                completedScenes: savedScriptData.completedScenes || 0,
                title: savedScriptData.title || '',
                coreIdea: savedScriptData.coreIdea || '',
              });
              console.log('✅ 載入 scriptData 成功:', savedScriptData.title || '(空)');
            } catch (err) {
              console.error('❌ 載入 scriptData 失敗:', err);
            }
          } else {
            console.log('ℹ️ 沒有找到 scriptData');
          }
          
          // 載入 outline
          if (savedOutline) {
            try {
              setOutline(savedOutline);
              console.log('✅ 載入 outline 成功');
            } catch (err) {
              console.error('❌ 載入 outline 失敗:', err);
            }
          }
          
          // 載入 scenes
          if (savedScenes && Array.isArray(savedScenes)) {
            try {
              setScenes(savedScenes);
              console.log('✅ 載入 scenes 成功:', savedScenes.length, '個場次');
            } catch (err) {
              console.error('❌ 載入 scenes 失敗:', err);
            }
          }
          
          // 載入 characters
          if (savedCharacters && Array.isArray(savedCharacters)) {
            try {
              setCharacters(savedCharacters);
              console.log('✅ 載入 characters 成功:', savedCharacters.length, '個角色');
            } catch (e) {
              console.error('❌ 載入 characters 失敗:', e);
            }
          }
          
          // 載入 connections
          if (savedConnections && Array.isArray(savedConnections)) {
            try {
              setCharacterConnections(savedConnections);
              console.log('✅ 載入 connections 成功:', savedConnections.length, '個關係');
            } catch (e) {
              console.error('❌ 載入 connections 失敗:', e);
            }
          }
          
          console.log('✅ 用戶資料載入完成，將啟用自動保存');
          isInitialLoadRef.current = false;
          hasLoadedDataRef.current = true; // 標記為已載入
          
          // 等待一個 tick，確保所有 state 更新完成後再啟用自動保存
          setTimeout(() => {
            setIsDataLoading(false);
            console.log('✅ 自動保存已啟用');
          }, 100);
        } catch (err) {
          console.error('❌ 載入資料錯誤:', err);
          isInitialLoadRef.current = false;
          hasLoadedDataRef.current = true; // 即使失敗也標記為已嘗試載入
          setIsDataLoading(false);
        }
      };
      
      loadData();
    }
  }, [isGoogleLoggedIn, userInfo?.id]); // 只依賴登入狀態，避免重複觸發

  // 保存資料（同時保存到 Google Sheets 和 localStorage）
  const characterConnectionsRef = useRef(characterConnections);
  useEffect(() => {
    characterConnectionsRef.current = characterConnections;
  }, [characterConnections]);

  const saveToCloud = useCallback(async (data) => {
    // 如果正在載入資料，禁止保存（避免空資料覆蓋雲端資料）
    if (isDataLoading) {
      console.log('⏸️ [自動保存] 資料載入中，跳過保存');
      return;
    }
    
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
  }, [googleAuthEnabled, googleSheetReady, isDataLoading]);

  // 手動保存到 Google 雲端（用戶點擊按鈕時觸發）
  const handleManualSaveToCloud = async () => {
    if (!googleAuthEnabled || !googleSheetReady || !isAuthenticated()) {
      alert('⚠️ 請先登入 Google 帳號並確保 Google Sheets 已準備就緒');
      return;
    }

    try {
      console.log('💾 [手動保存] 開始保存專案到 Google 雲端...');
      
      // 獲取當前所有資料
      const currentScriptData = scriptDataRef.current;
      const currentOutline = outlineRef.current;
      const currentScenes = scenesRef.current;
      const currentCharacters = charactersRef.current;
      const currentConnections = characterConnectionsRef.current;
      
      console.log('💾 [手動保存] 準備保存的資料:', {
        scriptData: !!currentScriptData,
        outline: !!currentOutline,
        scenes: currentScenes?.length || 0,
        characters: currentCharacters?.length || 0,
        connections: currentConnections?.length || 0
      });
      
      // 保存到 Google Sheets
      await saveProjectData({
        scriptData: currentScriptData,
        outline: currentOutline,
        scenes: currentScenes,
        characters: currentCharacters,
        connections: currentConnections
      });
      
      alert('✅ 專案已成功儲存到 Google 雲端！');
      console.log('✅ [手動保存] 專案已成功儲存到 Google 雲端');
    } catch (err) {
      console.error('❌ [手動保存] 保存失敗:', err);
      alert(`❌ 保存失敗：${err.message || '未知錯誤'}`);
    }
  };

  // 保存到 localStorage（始終作為備份）- 立即保存，使用獨立的 timeout
  const scriptDataTimeoutRef = useRef(null);
  const outlineTimeoutRef = useRef(null);
  const scenesTimeoutRef = useRef(null);
  const charactersTimeoutRef = useRef(null);

  useEffect(() => {
    if (isInitialLoadRef.current || isDataLoading) {
      console.log('⏸️ 跳過初始載入或資料載入中，不保存');
      return;
    }
    
    // 立即保存到 localStorage（使用用戶 ID 分離數據）
    try {
      const userId = getCurrentUserId();
      const saved = userId 
        ? setUserStorageItem(userId, 'scriptData', scriptData)
        : (localStorage.setItem('scriptData', JSON.stringify(scriptData)), true);
      
      if (saved) {
        console.log('✅ scriptData 已保存到 localStorage:', userId ? `(用戶 ${userId})` : '(全局)', scriptData);
      }
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
    if (isInitialLoadRef.current || isDataLoading) return;
    
    // 立即保存到 localStorage（使用用戶 ID 分離數據）
    try {
      const userId = getCurrentUserId();
      const saved = userId 
        ? setUserStorageItem(userId, 'scriptOutline', outline)
        : (localStorage.setItem('scriptOutline', JSON.stringify(outline)), true);
      
      if (saved) {
        console.log('✅ outline 已保存到 localStorage:', userId ? `(用戶 ${userId})` : '(全局)');
      }
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
    if (isInitialLoadRef.current || isDataLoading) return;
    
    // 立即保存到 localStorage（使用用戶 ID 分離數據）
    try {
      const userId = getCurrentUserId();
      const saved = userId 
        ? setUserStorageItem(userId, 'scriptScenes', scenes)
        : (localStorage.setItem('scriptScenes', JSON.stringify(scenes)), true);
      
      if (saved) {
        console.log('✅ scenes 已保存到 localStorage:', userId ? `(用戶 ${userId})` : '(全局)');
      }
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
      // 立即保存到 localStorage（使用用戶 ID 分離數據）
      try {
        const userId = getCurrentUserId();
        const saved = userId 
          ? setUserStorageItem(userId, 'scriptData', updated)
          : (localStorage.setItem('scriptData', JSON.stringify(updated)), true);
        
        if (saved) {
          console.log('✅ 已完成場次數已更新並保存:', completedCount, userId ? `(用戶 ${userId})` : '(全局)');
        }
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
    
    // 立即保存到 localStorage（使用用戶 ID 分離數據）
    try {
      const userId = getCurrentUserId();
      console.log('💾 [ScriptManager] 開始保存角色資料:', characters.length, '個角色', userId ? `(用戶 ${userId})` : '(全局)');
      console.log('💾 [ScriptManager] 角色詳細列表:', characters.map(c => ({ id: c.id, name: c.name })));
      
      // 使用用戶專屬存儲
      const saved = userId 
        ? setUserStorageItem(userId, 'characters', characters)
        : debugLocalStorage.setItem('characters', characters);
      
      if (saved) {
        // 立即驗證保存是否成功
        const verified = userId 
          ? getUserStorageItem(userId, 'characters')
          : debugLocalStorage.getItem('characters');
        
        if (verified && Array.isArray(verified)) {
          console.log('✅ [ScriptManager] 角色資料保存並驗證成功:', verified.length, '個角色');
          
          if (verified.length !== characters.length) {
            console.error('❌ [ScriptManager] 保存的角色數量不一致！', {
              原始: characters.length,
              保存後: verified.length
            });
            
            // 嘗試重新保存
            console.log('🔄 [ScriptManager] 嘗試重新保存...');
            if (userId) {
              setUserStorageItem(userId, 'characters', characters);
            } else {
              debugLocalStorage.setItem('characters', characters);
            }
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
    
    // 立即保存到 localStorage（使用用戶 ID 分離數據）
    try {
      const userId = getCurrentUserId();
      console.log('💾 [ScriptManager] 保存關係資料:', characterConnections.length, '個關係', userId ? `(用戶 ${userId})` : '(全局)');
      const saved = userId 
        ? setUserStorageItem(userId, 'characterConnections', characterConnections)
        : (localStorage.setItem('characterConnections', JSON.stringify(characterConnections)), true);
      
      if (saved) {
        console.log('✅ characterConnections 已保存到 localStorage');
      }
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

  // 清空所有專案內容
  const handleClearProject = () => {
    // 清空所有 state
    setScriptData({
      deadline: '',
      totalScenes: 0,
      completedScenes: 0,
      title: '',
      coreIdea: '',
    });
    setOutline({});
    setScenes([]);
    setSelectedScene(null);
    setCharacters([]);
    setCharacterConnections([]);
    
    // 清空 localStorage
    try {
      localStorage.removeItem('scriptData');
      localStorage.removeItem('scriptOutline');
      localStorage.removeItem('scriptScenes');
      localStorage.removeItem('characters');
      localStorage.removeItem('characterConnections');
      console.log('✅ 已清空所有 localStorage 資料');
    } catch (err) {
      console.error('清空 localStorage 失敗:', err);
    }
    
    // 提示用戶 Google Sheets 的資料需要手動清除
    if (googleAuthEnabled && googleSheetReady) {
      console.log('⚠️ Google Sheets 中的資料需要手動清除');
      setTimeout(() => {
        alert('提示：Google Sheets 中的資料未自動清除，如需清空雲端資料，請手動操作。');
      }, 500);
    }
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
        // 立即保存到 localStorage（使用用戶 ID 分離數據）
        try {
          const userId = getCurrentUserId();
          const saved = userId 
            ? setUserStorageItem(userId, 'scriptData', updatedData)
            : (localStorage.setItem('scriptData', JSON.stringify(updatedData)), true);
          
          if (saved) {
            console.log('✅ 已完成場次數已更新並保存:', newCompletedCount, userId ? `(用戶 ${userId})` : '(全局)');
          }
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

  // 檢查是否已登入（優先執行，確保登入狀態先設置）
  useEffect(() => {
    const savedUserInfo = localStorage.getItem('google_user_info');
    const savedToken = localStorage.getItem('google_access_token');
    
    console.log('🔍 [登入檢查] 開始檢查登入狀態', {
      hasSavedUserInfo: !!savedUserInfo,
      hasSavedToken: !!savedToken
    });
    
    if (savedUserInfo && savedToken) {
      try {
        const user = JSON.parse(savedUserInfo);
        console.log('✅ [登入檢查] 找到登入資訊，用戶:', user.email, 'ID:', user.id);
        setUserInfo(user);
        setIsGoogleLoggedIn(true);
        setAccessToken(savedToken);
        saveAccessToken(savedToken);
        setGoogleAuthEnabled(true);
        
        // 檢查是否有保存的 spreadsheet ID，如果有則設置 googleSheetReady
        const sheetId = getSpreadsheetId();
        if (sheetId) {
          console.log('✅ [登入檢查] 找到已保存的 Google Sheets ID:', sheetId);
          setGoogleSheetReady(true);
        } else {
          console.log('ℹ️ [登入檢查] 未找到已保存的 Google Sheets ID，將在需要時創建');
        }
        
        // 遷移舊的全局數據到用戶數據（向後兼容）
        const userId = user.id;
        if (userId) {
          migrateOldDataToUserData(userId);
        }
      } catch (err) {
        console.error('❌ [登入檢查] 載入用戶資訊失敗:', err);
      }
    } else {
      console.log('⚠️ [登入檢查] 未找到登入資訊');
    }
  }, []);

  // 點擊外部關閉用戶選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // 處理 Google 登入成功
  const handleGoogleLoginSuccess = async (userInfo, accessToken) => {
    console.log('✅ [ScriptManager] Google 登入成功:', userInfo);
    console.log('📋 用戶資訊:', {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name
    });
    
    setUserInfo(userInfo);
    setIsGoogleLoggedIn(true);
    
    // 設置 Access Token 以便後續使用 Google Cloud 服務
    setAccessToken(accessToken);
    saveAccessToken(accessToken);
    
    // 自動啟用 Google Sheets 功能
    setGoogleAuthEnabled(true);
    
    // 先初始化 Google Sheets（創建或獲取現有的 spreadsheet）
    // 這樣載入資料時就能使用正確的 spreadsheet ID
    try {
      let sheetId = getSpreadsheetId();
      
      if (!sheetId) {
        console.log('📝 [登入] 創建新的 Google Sheets...');
        sheetId = await createNewSpreadsheet();
        if (sheetId) {
          setSpreadsheetId(sheetId);
          setGoogleSheetReady(true);
          console.log('✅ [登入] Google Sheets 已創建並準備就緒:', sheetId);
        }
      } else {
        console.log('✅ [登入] 使用現有的 Google Sheets:', sheetId);
        setGoogleSheetReady(true);
      }
    } catch (err) {
      console.error('❌ [登入] 初始化 Google Sheets 失敗:', err);
      // 即使失敗也繼續，用戶可以稍後手動創建
    }
    
    // 立即載入該用戶的資料（優先從 Google Sheets 載入）
    const userId = userInfo.id;
    if (userId) {
      console.log('📂 [登入] 開始載入用戶資料，userId:', userId);
      
      // 遷移舊數據（如果存在）
      migrateOldDataToUserData(userId);
      
      // 設置載入狀態，禁用自動保存
      setIsDataLoading(true);
      console.log('🔄 [登入] 開始載入資料，已禁用自動保存');
      
      // 先嘗試從 Google Sheets 載入資料（與重新整理時的邏輯一致）
      let cloudData = null;
      const hasToken = isAuthenticated();
      const hasSheetId = getSpreadsheetId();
      
      console.log('🔍 [登入] 檢查載入條件:', {
        hasToken,
        hasSheetId,
        sheetId: hasSheetId
      });
      
      // 如果有 token 和 spreadsheet ID，優先從 Google Sheets 載入
      if (hasToken && hasSheetId) {
        try {
          console.log('☁️ [登入] 嘗試從 Google Sheets 載入資料...');
          cloudData = await loadProjectData();
          console.log('☁️ [登入] Google Sheets 載入完成，資料詳情:', {
            hasScriptData: !!cloudData?.scriptData,
            scriptDataKeys: cloudData?.scriptData ? Object.keys(cloudData.scriptData) : [],
            scriptDataTitle: cloudData?.scriptData?.title || '(無標題)',
            scriptDataCoreIdea: cloudData?.scriptData?.coreIdea || '(無核心概念)',
            outlineKeys: Object.keys(cloudData?.outline || {}),
            scenesCount: cloudData?.scenes?.length || 0,
            charactersCount: cloudData?.characters?.length || 0,
            connectionsCount: cloudData?.connections?.length || 0
          });
          
          // 如果成功載入資料，確保狀態正確
          if (cloudData) {
            setGoogleSheetReady(true);
          }
        } catch (err) {
          console.error('❌ [登入] 從 Google Sheets 載入失敗:', err);
          console.warn('⚠️ [登入] 將使用 localStorage 作為備份');
        }
      } else {
        console.log('ℹ️ [登入] 跳過 Google Sheets 載入（缺少必要條件）:', {
          hasToken,
          hasSheetId
        });
      }
      
      // 如果從 Google Sheets 載入成功且有資料，使用雲端資料；否則使用 localStorage
      const hasCloudData = cloudData && (
        (cloudData.scriptData && Object.keys(cloudData.scriptData).length > 0 && (cloudData.scriptData.title || cloudData.scriptData.coreIdea)) ||
        (cloudData.outline && Object.keys(cloudData.outline).length > 0) ||
        (cloudData.scenes && cloudData.scenes.length > 0) ||
        (cloudData.characters && cloudData.characters.length > 0) ||
        (cloudData.connections && cloudData.connections.length > 0)
      );
      
      const savedScriptData = hasCloudData && cloudData.scriptData ? cloudData.scriptData : getUserStorageItem(userId, 'scriptData');
      const savedOutline = hasCloudData && cloudData.outline ? cloudData.outline : getUserStorageItem(userId, 'scriptOutline');
      const savedScenes = hasCloudData && cloudData.scenes ? cloudData.scenes : getUserStorageItem(userId, 'scriptScenes');
      const savedCharacters = hasCloudData && cloudData.characters ? cloudData.characters : getUserStorageItem(userId, 'characters');
      const savedConnections = hasCloudData && cloudData.connections ? cloudData.connections : getUserStorageItem(userId, 'characterConnections');
      
      console.log('📦 [登入] 最終使用的資料來源:', hasCloudData ? 'Google Sheets' : 'localStorage');
      console.log('📦 [登入] 找到的資料:', {
        userId,
        hasCloudData,
        scriptData: !!savedScriptData,
        scriptDataTitle: savedScriptData?.title || '(無)',
        scriptDataCoreIdea: savedScriptData?.coreIdea || '(無)',
        outline: !!savedOutline,
        scenes: savedScenes?.length || 0,
        characters: savedCharacters?.length || 0,
        connections: savedConnections?.length || 0
      });
      
      // 如果從 Google Sheets 載入成功，同步到 localStorage
      if (cloudData && (cloudData.scriptData || cloudData.outline || cloudData.scenes || cloudData.characters || cloudData.connections)) {
        console.log('💾 [登入] 將 Google Sheets 資料同步到 localStorage...');
        if (cloudData.scriptData) setUserStorageItem(userId, 'scriptData', cloudData.scriptData);
        if (cloudData.outline) setUserStorageItem(userId, 'scriptOutline', cloudData.outline);
        if (cloudData.scenes) setUserStorageItem(userId, 'scriptScenes', cloudData.scenes);
        if (cloudData.characters) setUserStorageItem(userId, 'characters', cloudData.characters);
        if (cloudData.connections) setUserStorageItem(userId, 'characterConnections', cloudData.connections);
      }
      
      // 載入 scriptData
      const hasValidScriptData = savedScriptData && (
        savedScriptData.title ||
        savedScriptData.coreIdea ||
        savedScriptData.deadline ||
        savedScriptData.totalScenes > 0 ||
        savedScriptData.completedScenes > 0
      );
      
      if (hasValidScriptData) {
        try {
          const scriptDataToSet = {
            deadline: savedScriptData.deadline || '',
            totalScenes: savedScriptData.totalScenes || 0,
            completedScenes: savedScriptData.completedScenes || 0,
            title: savedScriptData.title || '',
            coreIdea: savedScriptData.coreIdea || '',
          };
          console.log('📝 [登入] 準備設置 scriptData:', scriptDataToSet);
          setScriptData(scriptDataToSet);
          console.log('✅ [登入] 載入 scriptData 成功:', scriptDataToSet.title || '(空標題)');
        } catch (err) {
          console.error('❌ [登入] 載入 scriptData 失敗:', err);
        }
      } else {
        console.log('ℹ️ [登入] 沒有找到有效的 scriptData');
      }
      
      // 載入 outline
      if (savedOutline) {
        try {
          setOutline(savedOutline);
          console.log('✅ [登入] 載入 outline 成功');
        } catch (err) {
          console.error('❌ [登入] 載入 outline 失敗:', err);
        }
      }
      
      // 載入 scenes
      if (savedScenes && Array.isArray(savedScenes)) {
        try {
          setScenes(savedScenes);
          console.log('✅ [登入] 載入 scenes 成功:', savedScenes.length, '個場次');
        } catch (err) {
          console.error('❌ [登入] 載入 scenes 失敗:', err);
        }
      }
      
      // 載入 characters
      if (savedCharacters && Array.isArray(savedCharacters)) {
        try {
          setCharacters(savedCharacters);
          console.log('✅ [登入] 載入 characters 成功:', savedCharacters.length, '個角色');
        } catch (e) {
          console.error('❌ [登入] 載入 characters 失敗:', e);
        }
      }
      
      // 載入 connections
      if (savedConnections && Array.isArray(savedConnections)) {
        try {
          setCharacterConnections(savedConnections);
          console.log('✅ [登入] 載入 connections 成功:', savedConnections.length, '個關係');
        } catch (e) {
          console.error('❌ [登入] 載入 connections 失敗:', e);
        }
      }
      
      console.log('✅ [登入] 用戶資料載入完成，將啟用自動保存');
      isInitialLoadRef.current = false;
      hasLoadedDataRef.current = true; // 標記為已載入
      
      // 等待一個 tick，確保所有 state 更新完成後再啟用自動保存
      setTimeout(() => {
        setIsDataLoading(false);
        console.log('✅ [登入] 自動保存已啟用');
      }, 100);
    }
  };

  // 如果未登入，顯示登入頁面
  if (!isGoogleLoggedIn) {
    return <LoginPage onLoginSuccess={handleGoogleLoginSuccess} />;
  }

  return (
    <div className="script-manager">
      {/* 資料載入遮罩層 */}
      {isDataLoading && (
        <div className="data-loading-overlay">
          <div className="data-loading-content">
            <div className="data-loading-spinner"></div>
            <p className="data-loading-text">正在載入資料...</p>
            <p className="data-loading-subtext">請稍候</p>
          </div>
        </div>
      )}
      <div className="script-manager-header">
        <div className="header-left">
          <h1 className="app-title">劇本寫作管理</h1>
          <p className="app-subtitle">管理寫作進度，專注創作</p>
        </div>
        <div className="header-right">
          {userInfo && (
            <div className="user-menu-container">
              <div 
                className="user-info-display"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-avatar-small">
                  <img src={userInfo.picture} alt={userInfo.name} />
                </div>
                <span className="user-name-small">{userInfo.name}</span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ 
                    marginLeft: '4px',
                    transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              
              {showUserMenu && (
                <>
                  <div 
                    className="user-menu-overlay"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="user-menu-dropdown">
                    <div className="user-menu-header">
                      <div className="user-menu-avatar">
                        <img src={userInfo.picture} alt={userInfo.name} />
                      </div>
                      <div className="user-menu-info">
                        <div className="user-menu-name">{userInfo.name}</div>
                        <div className="user-menu-email">{userInfo.email}</div>
                      </div>
                    </div>
                    <div className="user-menu-divider"></div>
                    <button 
                      className="user-menu-item"
                      onClick={() => {
                        // 切換帳號：清除當前登入並返回登入頁面
                        if (window.google?.accounts) {
                          const token = localStorage.getItem('google_access_token');
                          if (token) {
                            window.google.accounts.oauth2.revoke(token);
                          }
                        }
                        clearAuth();
                        localStorage.removeItem('google_user_info');
                        localStorage.removeItem('google_access_token');
                        setUserInfo(null);
                        setIsGoogleLoggedIn(false);
                        setGoogleAuthEnabled(false);
                        setShowUserMenu(false);
                        console.log('✅ 已切換帳號');
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <polyline points="17 11 21 7 17 3" />
                        <line x1="21" y1="7" x2="9" y2="7" />
                      </svg>
                      <span>切換帳號</span>
                    </button>
                    <button 
                      className="user-menu-item logout-item"
                      onClick={() => {
                        // 登出：清除所有資料並返回登入頁面
                        if (window.confirm('確定要登出嗎？登出後將清除所有本地資料。')) {
                          if (window.google?.accounts) {
                            const token = localStorage.getItem('google_access_token');
                            if (token) {
                              window.google.accounts.oauth2.revoke(token);
                            }
                          }
                          
                          // 清除所有認證和用戶資料
                          clearAuth();
                          localStorage.removeItem('google_user_info');
                          localStorage.removeItem('google_access_token');
                          localStorage.removeItem('google_client_id');
                          
                          // 清除專案資料（可選，根據需求決定）
                          // 如果需要保留資料，可以註釋掉以下幾行
                          const userId = userInfo?.id;
                          if (userId) {
                            clearUserStorage(userId);
                          }
                          
                          setUserInfo(null);
                          setIsGoogleLoggedIn(false);
                          setGoogleAuthEnabled(false);
                          setShowUserMenu(false);
                          console.log('✅ 已登出');
                        }
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>登出</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button 
            className="settings-toggle-btn"
            onClick={() => setShowSettings(true)}
          >
            設定
          </button>
        </div>
      </div>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onLogout={() => {
            clearAuth();
            setUserInfo(null);
            setIsGoogleLoggedIn(false);
            setGoogleAuthEnabled(false);
            setShowSettings(false);
            // 清除所有 Google 相關資料
            localStorage.removeItem('google_user_info');
            localStorage.removeItem('google_access_token');
          }}
        />
      )}

      <div className="script-manager-content">
        {/* Dashboard 在最上面 */}
        <ScriptDashboard
          scriptData={scriptData}
          onUpdateScriptData={handleUpdateScriptData}
        />

        {/* Tab 導航 */}
        <div className="tabs-container">
          <div className="tabs-nav">
            <button
              className={`tab-btn ${activeTab === 'project' ? 'active' : ''}`}
              onClick={() => setActiveTab('project')}
            >
              專案資訊
            </button>
            <button
              className={`tab-btn ${activeTab === 'outline' ? 'active' : ''}`}
              onClick={() => setActiveTab('outline')}
            >
              劇本大綱
            </button>
            <button
              className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => setActiveTab('characters')}
            >
              人物關係圖
            </button>
            <button
              className={`tab-btn ${activeTab === 'grouping' ? 'active' : ''}`}
              onClick={() => setActiveTab('grouping')}
            >
              場景統整
            </button>
            <button
              className={`tab-btn ${activeTab === 'storyboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('storyboard')}
            >
              分鏡圖
            </button>
            <button
              className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              資料管理
            </button>
          </div>

          {/* Tab 內容 */}
          <div className="tabs-content">
            {activeTab === 'project' && (
              <ProjectInfo
                scriptData={scriptData}
                onUpdateScriptData={handleUpdateScriptData}
                onClearProject={handleClearProject}
                onSaveToCloud={handleManualSaveToCloud}
              />
            )}

            {activeTab === 'outline' && (
              <ScriptOutline
                outline={outline}
                onUpdateOutline={handleUpdateOutline}
                scenes={scenes}
                onSelectScene={handleSelectScene}
                onUpdateScene={handleUpdateScene}
                onDeleteScene={handleDeleteScene}
                onAddScene={(newScene) => {
                  setScenes((prev) => {
                    const updated = [...prev, newScene];
                      try {
                        const userId = getCurrentUserId();
                        const saved = userId 
                          ? setUserStorageItem(userId, 'scriptScenes', updated)
                          : (localStorage.setItem('scriptScenes', JSON.stringify(updated)), true);
                        
                        if (saved) {
                          console.log('✅ 新增場次已保存到 localStorage:', userId ? `(用戶 ${userId})` : '(全局)');
                        }
                      } catch (err) {
                        console.error('保存場次到 localStorage 失敗:', err);
                      }
                      const newCompletedCount = updated.length;
                      setScriptData((prev) => {
                        const updatedData = {
                          ...prev,
                          completedScenes: newCompletedCount,
                        };
                        try {
                          const userId = getCurrentUserId();
                          const saved = userId 
                            ? setUserStorageItem(userId, 'scriptData', updatedData)
                            : (localStorage.setItem('scriptData', JSON.stringify(updatedData)), true);
                          
                          if (saved) {
                            console.log('✅ 已完成場次數已更新並保存:', newCompletedCount, userId ? `(用戶 ${userId})` : '(全局)');
                          }
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
            )}

            {activeTab === 'characters' && (
              <CharacterRelationship
                characters={characters}
                connections={characterConnections}
                onUpdateCharacters={(updatedCharacters) => {
                  console.log('🔄 [ScriptManager] 收到角色更新:', updatedCharacters.length, '個角色');
                  if (!Array.isArray(updatedCharacters)) {
                    console.error('❌ [ScriptManager] 接收到的角色資料不是陣列:', typeof updatedCharacters);
                    return;
                  }
                  setCharacters(updatedCharacters);
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
            )}

            {activeTab === 'grouping' && (
              <SceneGrouping
                scenes={scenes}
                onSelectScene={(scene) => {
                  setSelectedScene(scene);
                  setShowEditor(true);
                }}
              />
            )}

            {activeTab === 'storyboard' && (
              <Storyboard
                scenes={scenes}
                onUpdateScene={(updatedScene) => {
                  const updated = scenes.map(s =>
                    s.id === updatedScene.id ? updatedScene : s
                  );
                  setScenes(updated);
                }}
              />
            )}

            {activeTab === 'import' && (
              <ImportExport
                scriptData={scriptData}
                outline={outline}
                scenes={scenes}
                characters={characters}
                characterConnections={characterConnections}
                onImport={(data) => {
                  console.log('📥 [匯入] 開始匯入資料:', {
                    hasScriptData: !!data.scriptData,
                    hasOutline: !!data.outline,
                    scenesCount: data.scenes?.length || 0,
                    charactersCount: data.characters?.length || 0,
                    connectionsCount: data.connections?.length || 0
                  });
                  
                  // 先設置狀態
                  if (data.scriptData) setScriptData(data.scriptData);
                  if (data.outline) setOutline(data.outline);
                  if (data.scenes) setScenes(data.scenes);
                  if (data.characters) setCharacters(data.characters);
                  if (data.connections) setCharacterConnections(data.connections);
                  
                  // 立即保存到 localStorage（使用用戶 ID）
                  setTimeout(() => {
                    try {
                      const userId = getCurrentUserId();
                      console.log('💾 [匯入] 保存匯入的資料，userId:', userId);
                      
                      if (userId) {
                        // 使用用戶專屬存儲
                        if (data.scriptData) {
                          setUserStorageItem(userId, 'scriptData', data.scriptData);
                          console.log('✅ [匯入] scriptData 已保存');
                        }
                        if (data.outline) {
                          setUserStorageItem(userId, 'scriptOutline', data.outline);
                          console.log('✅ [匯入] outline 已保存');
                        }
                        if (data.scenes) {
                          setUserStorageItem(userId, 'scriptScenes', data.scenes);
                          console.log('✅ [匯入] scenes 已保存:', data.scenes.length, '個場次');
                        }
                        if (data.characters) {
                          setUserStorageItem(userId, 'characters', data.characters);
                          console.log('✅ [匯入] characters 已保存:', data.characters.length, '個角色');
                        }
                        if (data.connections) {
                          setUserStorageItem(userId, 'characterConnections', data.connections);
                          console.log('✅ [匯入] connections 已保存:', data.connections.length, '個關係');
                        }
                      } else {
                        // 如果沒有用戶 ID，使用全局存儲
                        console.warn('⚠️ [匯入] 沒有用戶 ID，使用全局存儲');
                        if (data.scriptData) localStorage.setItem('scriptData', JSON.stringify(data.scriptData));
                        if (data.outline) localStorage.setItem('scriptOutline', JSON.stringify(data.outline));
                        if (data.scenes) localStorage.setItem('scriptScenes', JSON.stringify(data.scenes));
                        if (data.characters) localStorage.setItem('characters', JSON.stringify(data.characters));
                        if (data.connections) localStorage.setItem('characterConnections', JSON.stringify(data.connections));
                      }
                      
                      console.log('✅ [匯入] 所有資料已保存完成');
                    } catch (err) {
                      console.error('❌ [匯入] 保存資料失敗:', err);
                    }
                  }, 100);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptManager;

