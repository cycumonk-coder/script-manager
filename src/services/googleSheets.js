// Google Sheets API 服務
// 使用 Google Identity Services 進行 OAuth 認證後，可以直接調用 Google Sheets API

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

let accessToken = null;
let spreadsheetId = null;

// 獲取當前用戶 ID（用於數據分離）
function getCurrentUserId() {
  const userInfo = localStorage.getItem('google_user_info');
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      return user.id;
    } catch (e) {
      console.error('解析用戶資訊失敗:', e);
    }
  }
  return null;
}

// 獲取用戶專屬的存儲鍵
function getUserStorageKey(key) {
  const userId = getCurrentUserId();
  if (userId) {
    return `user_${userId}_${key}`;
  }
  return key; // 向後兼容，沒有用戶 ID 時使用原鍵
}

// 初始化 - 設置訪問令牌
export function setAccessToken(token) {
  accessToken = token;
}

// 初始化 - 設置 Google Sheet ID（按用戶分離）
export function setSpreadsheetId(sheetId) {
  spreadsheetId = sheetId;
  const storageKey = getUserStorageKey('google_sheet_id');
  localStorage.setItem(storageKey, sheetId);
  // 同時保存到舊鍵（向後兼容）
  if (!getCurrentUserId()) {
    localStorage.setItem('google_sheet_id', sheetId);
  }
}

// 獲取已保存的 Sheet ID（按用戶分離）
export function getSpreadsheetId() {
  if (!spreadsheetId) {
    const storageKey = getUserStorageKey('google_sheet_id');
    spreadsheetId = localStorage.getItem(storageKey) || localStorage.getItem('google_sheet_id');
  }
  return spreadsheetId;
}

// 獲取已保存的訪問令牌
export function getAccessToken() {
  if (!accessToken) {
    accessToken = localStorage.getItem('google_access_token');
  }
  return accessToken;
}

// 保存訪問令牌
export function saveAccessToken(token) {
  accessToken = token;
  localStorage.setItem('google_access_token', token);
}

// 清除認證信息
export function clearAuth() {
  accessToken = null;
  spreadsheetId = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_sheet_id');
}

// 檢查是否已認證
export function isAuthenticated() {
  return !!getAccessToken(); // 只要有 token 就算已認證，sheetId 可以在之後創建
}

// 創建或獲取工作表
async function ensureWorksheet(sheetName) {
  const token = getAccessToken();
  const sheetId = getSpreadsheetId();
  
  if (!token || !sheetId) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 先獲取所有工作表
    const metadataResponse = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${sheetId}?access_token=${token}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!metadataResponse.ok) {
      const error = await metadataResponse.json();
      if (error.error?.code === 401 || error.error?.status === 'UNAUTHENTICATED') {
        clearAuth();
        throw new Error('認證已過期，請重新連接 Google');
      }
      throw new Error('無法訪問 Google Sheets');
    }

    const metadata = await metadataResponse.json();
    const existingSheet = metadata.sheets?.find(
      sheet => sheet.properties.title === sheetName
    );

    if (!existingSheet) {
      // 創建新工作表
      const addSheetResponse = await fetch(
        `${GOOGLE_SHEETS_API_BASE}/${sheetId}:batchUpdate?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              addSheet: {
                properties: { title: sheetName }
              }
            }]
          })
        }
      );

      if (!addSheetResponse.ok) {
        throw new Error('無法創建工作表');
      }
    }

    return true;
  } catch (error) {
    console.error('確保工作表失敗:', error);
    throw error;
  }
}

// 讀取資料
export async function readData(sheetName, range = 'A1:Z1000') {
  const token = getAccessToken();
  const sheetId = getSpreadsheetId();
  
  if (!token || !sheetId) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    await ensureWorksheet(sheetName);
    
    const rangeWithSheet = `${sheetName}!${range}`;
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(rangeWithSheet)}?access_token=${token}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.code === 401 || error.error?.status === 'UNAUTHENTICATED') {
        // Token 過期，清除認證信息
        clearAuth();
        throw new Error('認證已過期，請重新連接 Google');
      }
      throw new Error(error.error?.message || '讀取資料失敗');
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('讀取資料錯誤:', error);
    throw error;
  }
}

// 寫入資料
export async function writeData(sheetName, range, values) {
  const token = getAccessToken();
  const sheetId = getSpreadsheetId();
  
  if (!token || !sheetId) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    await ensureWorksheet(sheetName);
    
    const rangeWithSheet = `${sheetName}!${range}`;
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${sheetId}/values/${encodeURIComponent(rangeWithSheet)}?valueInputOption=RAW&access_token=${token}`,
      {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          values: Array.isArray(values[0]) ? values : [values]
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.code === 401 || error.error?.status === 'UNAUTHENTICATED') {
        // Token 過期，清除認證信息
        clearAuth();
        throw new Error('認證已過期，請重新連接 Google');
      }
      throw new Error(error.error?.message || '寫入資料失敗');
    }

    return await response.json();
  } catch (error) {
    console.error('寫入資料錯誤:', error);
    throw error;
  }
}

// 檢查字串長度是否超過 Google Sheets 單格限制（50000 字元）
const MAX_CELL_LENGTH = 45000; // 留一些緩衝空間

// 安全地截斷字串，確保不超過限制
function safeTruncate(str, maxLength = MAX_CELL_LENGTH) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength);
}

// 將大內容分割成多個塊
function splitLargeContent(content, maxLength = MAX_CELL_LENGTH) {
  if (!content || content.length <= maxLength) {
    return [content];
  }
  const chunks = [];
  for (let i = 0; i < content.length; i += maxLength) {
    chunks.push(content.substring(i, i + maxLength));
  }
  return chunks;
}

// 保存完整專案資料（即時儲存）
export async function saveProjectData(data) {
  try {
    // 使用用戶 ID 作為工作表名稱，實現數據分離
    const userId = getCurrentUserId();
    const sheetName = userId ? `User_${userId}_ScriptData` : 'ScriptData';
    const contentSheetName = userId ? `User_${userId}_Content` : 'Content'; // 用於儲存大內容
    
    console.log('💾 [Google Sheets] 開始保存專案資料...');
    
    const rows = [['key', 'value', 'index', 'total', 'chunk']];
    const contentRows = [['type', 'id', 'field', 'chunkIndex', 'chunkTotal', 'content']];
    
    // 1. 保存 scriptData（通常不會太大）
    const scriptDataStr = JSON.stringify(data.scriptData || {});
    rows.push(['scriptData', safeTruncate(scriptDataStr), '0', '1', '0']);
    
    // 2. 保存 outline（按大綱分開儲存）
    const outline = data.outline || {};
    const outlineKeys = Object.keys(outline);
    if (outlineKeys.length > 0) {
      outlineKeys.forEach((beatId, index) => {
        const beatContent = outline[beatId] || '';
        const beatDataStr = JSON.stringify({ [beatId]: beatContent });
        
        if (beatDataStr.length <= MAX_CELL_LENGTH) {
          rows.push(['outline', beatDataStr, String(index), String(outlineKeys.length), '0']);
        } else {
          // 如果大綱內容太大，將內容分開儲存
          const minimalBeatData = { [beatId]: '' };
          rows.push(['outline', JSON.stringify(minimalBeatData), String(index), String(outlineKeys.length), '0']);
          
          // 將大內容儲存到 content 工作表
          const contentChunks = splitLargeContent(beatContent);
          contentChunks.forEach((chunk, chunkIndex) => {
            contentRows.push(['outline', beatId, 'content', String(chunkIndex), String(contentChunks.length), chunk]);
          });
        }
      });
    } else {
      rows.push(['outline', '{}', '0', '1', '0']);
    }
    
    // 3. 保存 scenes（按場次分開儲存，大內容分開儲存）
    const scenes = data.scenes || [];
    if (scenes.length > 0) {
      scenes.forEach((scene, index) => {
        // 先檢查完整場景的 JSON 長度
        const fullSceneStr = JSON.stringify(scene);
        
        if (fullSceneStr.length <= MAX_CELL_LENGTH) {
          rows.push(['scene', fullSceneStr, String(index), String(scenes.length), '0']);
        } else {
          // 如果場景太大，將大內容欄位分開儲存
          const sceneId = scene.id || `scene_${index}`;
          const sceneContent = scene.content || '';
          const sceneSound = scene.sound || '';
          
          // 創建最小場景資料（不包含大內容）
          const minimalScene = {
            id: scene.id,
            number: scene.number,
            title: scene.title,
            location: scene.location,
            dayNight: scene.dayNight,
            beatId: scene.beatId,
            completed: scene.completed,
            content: '', // 內容將分開儲存
            storyboardImage: scene.storyboardImage,
            sound: '' // 聲音也將分開儲存
          };
          
          const minimalSceneStr = JSON.stringify(minimalScene);
          if (minimalSceneStr.length <= MAX_CELL_LENGTH) {
            rows.push(['scene', minimalSceneStr, String(index), String(scenes.length), '0']);
          } else {
            // 如果最小場景仍然太大，進一步簡化
            const ultraMinimalScene = {
              id: scene.id,
              number: scene.number,
              title: safeTruncate(scene.title || '', 100),
              location: safeTruncate(scene.location || '', 100),
              dayNight: scene.dayNight,
              beatId: scene.beatId,
              completed: scene.completed
            };
            rows.push(['scene', safeTruncate(JSON.stringify(ultraMinimalScene)), String(index), String(scenes.length), '0']);
          }
          
          // 將 content 分塊儲存
          if (sceneContent) {
            const contentChunks = splitLargeContent(sceneContent);
            contentChunks.forEach((chunk, chunkIndex) => {
              contentRows.push(['scene', sceneId, 'content', String(chunkIndex), String(contentChunks.length), chunk]);
            });
          }
          
          // 將 sound 分塊儲存（如果太大）
          if (sceneSound && sceneSound.length > MAX_CELL_LENGTH) {
            const soundChunks = splitLargeContent(sceneSound);
            soundChunks.forEach((chunk, chunkIndex) => {
              contentRows.push(['scene', sceneId, 'sound', String(chunkIndex), String(soundChunks.length), chunk]);
            });
          } else if (sceneSound) {
            contentRows.push(['scene', sceneId, 'sound', '0', '1', sceneSound]);
          }
        }
      });
    } else {
      rows.push(['scenes', '[]', '0', '1', '0']);
    }
    
    // 4. 保存 characters（按角色分開儲存）
    const characters = data.characters || [];
    if (characters.length > 0) {
      characters.forEach((character, index) => {
        const characterStr = JSON.stringify(character);
        if (characterStr.length <= MAX_CELL_LENGTH) {
          rows.push(['character', characterStr, String(index), String(characters.length), '0']);
        } else {
          // 如果角色資料太大，簡化處理
          const minimalCharacter = {
            id: character.id,
            name: safeTruncate(character.name || '', 200),
            description: safeTruncate(character.description || '', 1000),
            image: character.image,
            imagePosition: character.imagePosition
          };
          rows.push(['character', safeTruncate(JSON.stringify(minimalCharacter)), String(index), String(characters.length), '0']);
        }
      });
    } else {
      rows.push(['characters', '[]', '0', '1', '0']);
    }
    
    // 5. 保存 connections（連接關係通常不會太大，但如果太大則分批）
    const connections = data.connections || [];
    if (connections.length > 0) {
      const connectionsStr = JSON.stringify(connections);
      if (connectionsStr.length <= MAX_CELL_LENGTH) {
        rows.push(['connections', connectionsStr, '0', '1', '0']);
      } else {
        // 分批儲存
        const batchSize = 50; // 減少批次大小
        for (let i = 0; i < connections.length; i += batchSize) {
          const batch = connections.slice(i, i + batchSize);
          const batchStr = JSON.stringify(batch);
          if (batchStr.length <= MAX_CELL_LENGTH) {
            rows.push(['connections', batchStr, String(Math.floor(i / batchSize)), String(Math.ceil(connections.length / batchSize)), '0']);
          } else {
            // 如果批次仍然太大，進一步縮小
            const smallerBatch = connections.slice(i, i + Math.floor(batchSize / 2));
            rows.push(['connections', safeTruncate(JSON.stringify(smallerBatch)), String(Math.floor(i / batchSize)), String(Math.ceil(connections.length / batchSize)), '0']);
          }
        }
      }
    } else {
      rows.push(['connections', '[]', '0', '1', '0']);
    }
    
    // 6. 保存最後更新時間
    rows.push(['lastUpdated', new Date().toISOString(), '0', '1', '0']);

    // 先寫入主資料
    const range = `A1:E${rows.length}`;
    await writeData(sheetName, range, rows);
    console.log(`✅ [Google Sheets] 主資料保存成功（共 ${rows.length} 行）`);
    
    // 如果有大內容，寫入到 content 工作表
    if (contentRows.length > 1) {
      const contentRange = `A1:F${contentRows.length}`;
      await writeData(contentSheetName, contentRange, contentRows);
      console.log(`✅ [Google Sheets] 大內容保存成功（共 ${contentRows.length - 1} 行）`);
    }
    
    console.log(`✅ [Google Sheets] 專案資料保存完成`);
    return true;
  } catch (error) {
    console.error('❌ [Google Sheets] 保存專案資料失敗:', error);
    throw error;
  }
}

// 載入完整專案資料
export async function loadProjectData() {
  try {
    const userId = getCurrentUserId();
    const sheetName = userId ? `User_${userId}_ScriptData` : 'ScriptData';
    const contentSheetName = userId ? `User_${userId}_Content` : 'Content';
    
    // 先讀取主資料（現在有 5 列：key, value, index, total, chunk）
    let rows = [];
    try {
      rows = await readData(sheetName, 'A1:E1000');
    } catch (err) {
      // 如果新格式讀取失敗，嘗試舊格式（4 列）
      try {
        rows = await readData(sheetName, 'A1:D1000');
      } catch (err2) {
        console.warn('無法讀取主資料工作表，返回空資料');
        return {
          scriptData: {},
          outline: {},
          scenes: [],
          characters: [],
          connections: []
        };
      }
    }
    
    // 讀取大內容資料
    let contentRows = [];
    try {
      contentRows = await readData(contentSheetName, 'A1:F10000');
    } catch (err) {
      console.log('大內容工作表不存在或無法讀取，跳過');
    }
    
    if (!rows || rows.length < 2) {
      return {
        scriptData: {},
        outline: {},
        scenes: [],
        characters: [],
        connections: []
      };
    }

    // 解析主資料
    const scriptData = {};
    const outline = {};
    const scenes = [];
    const characters = [];
    const connections = [];
    let lastUpdated = null;

    // 從第二行開始（跳過標題行）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [key, value, index, total, chunk] = row;
      if (!key || !value) continue;

      try {
        const parsedValue = JSON.parse(value);
        
        switch (key) {
          case 'scriptData':
            Object.assign(scriptData, parsedValue);
            break;
            
          case 'outline':
            // 合併大綱資料
            Object.assign(outline, parsedValue);
            break;
            
          case 'scene':
            // 按 index 插入場景（保持順序）
            const sceneIndex = parseInt(index) || 0;
            scenes[sceneIndex] = parsedValue;
            break;
            
          case 'character':
            // 按 index 插入角色（保持順序）
            const charIndex = parseInt(index) || 0;
            characters[charIndex] = parsedValue;
            break;
            
          case 'connections':
            // 連接關係可能是批次儲存的，需要合併
            if (Array.isArray(parsedValue)) {
              connections.push(...parsedValue);
            }
            break;
            
          case 'lastUpdated':
            lastUpdated = value;
            break;
            
          // 向後兼容舊格式
          case 'scenes':
            if (Array.isArray(parsedValue)) {
              scenes.push(...parsedValue);
            }
            break;
            
          case 'characters':
            if (Array.isArray(parsedValue)) {
              characters.push(...parsedValue);
            }
            break;
        }
      } catch (parseError) {
        console.warn(`⚠️ 解析資料失敗 (行 ${i + 1}, key: ${key}):`, parseError);
        // 如果是 lastUpdated，直接使用原始值
        if (key === 'lastUpdated') {
          lastUpdated = value;
        }
      }
    }

    // 處理大內容：從 content 工作表讀取並合併
    if (contentRows && contentRows.length > 1) {
      const contentMap = {}; // { type_id_field: { chunks: [], total: 0 } }
      
      // 從第二行開始（跳過標題行）
      for (let i = 1; i < contentRows.length; i++) {
        const [type, id, field, chunkIndex, chunkTotal, content] = contentRows[i];
        if (!type || !id || !field) continue;
        
        const key = `${type}_${id}_${field}`;
        if (!contentMap[key]) {
          contentMap[key] = {
            chunks: [],
            total: parseInt(chunkTotal) || 1
          };
        }
        
        const chunkIdx = parseInt(chunkIndex) || 0;
        contentMap[key].chunks[chunkIdx] = content || '';
      }
      
      // 合併大內容到對應的資料結構
      Object.keys(contentMap).forEach(key => {
        const [type, id, field] = key.split('_');
        const { chunks } = contentMap[key];
        const mergedContent = chunks.filter(c => c !== undefined).join('');
        
        if (type === 'outline') {
          // 合併到大綱
          if (outline[id]) {
            outline[id] = mergedContent;
          } else {
            outline[id] = mergedContent;
          }
        } else if (type === 'scene') {
          // 找到對應的場景並更新
          const scene = scenes.find(s => s && (s.id === id || s.id === `scene_${scenes.indexOf(s)}`));
          if (scene) {
            if (field === 'content') {
              scene.content = mergedContent;
            } else if (field === 'sound') {
              scene.sound = mergedContent;
            }
          } else {
            // 如果找不到場景，嘗試通過 index 找到
            const sceneIndex = scenes.findIndex(s => s && s.id === id);
            if (sceneIndex >= 0 && scenes[sceneIndex]) {
              if (field === 'content') {
                scenes[sceneIndex].content = mergedContent;
              } else if (field === 'sound') {
                scenes[sceneIndex].sound = mergedContent;
              }
            }
          }
        }
      });
    }

    // 過濾掉 undefined 的元素（如果某些 index 缺失）
    const filteredScenes = scenes.filter(s => s !== undefined);
    const filteredCharacters = characters.filter(c => c !== undefined);
    
    // 去重連接關係（基於 from 和 to）
    const uniqueConnections = [];
    const connectionSet = new Set();
    connections.forEach(conn => {
      const key = `${conn.from || ''}_${conn.to || ''}`;
      if (!connectionSet.has(key)) {
        connectionSet.add(key);
        uniqueConnections.push(conn);
      }
    });

    console.log('📥 [Google Sheets] 載入專案資料:', {
      scriptData: !!scriptData && Object.keys(scriptData).length > 0,
      outline: Object.keys(outline).length,
      scenes: filteredScenes.length,
      characters: filteredCharacters.length,
      connections: uniqueConnections.length,
      lastUpdated
    });

    return {
      scriptData,
      outline,
      scenes: filteredScenes,
      characters: filteredCharacters,
      connections: uniqueConnections
    };
  } catch (error) {
    console.error('載入專案資料失敗:', error);
    // 如果錯誤是因為工作表不存在，返回空資料
    if (error.message.includes('Unable to parse range') || error.message.includes('not found')) {
      return {
        scriptData: {},
        outline: {},
        scenes: [],
        characters: [],
        connections: []
      };
    }
    throw error;
  }
}

// 創建 Google Drive 資料夾
export async function createFolder(folderName = '劇本管理平台') {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 使用 Google Drive API 創建資料夾
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?access_token=' + token,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('創建資料夾錯誤詳情:', error);
      throw new Error(error.error?.message || '創建資料夾失敗');
    }

    const result = await response.json();
    const folderId = result.id;
    
    if (!folderId) {
      throw new Error('創建成功但未返回資料夾 ID');
    }
    
    console.log('✅ 成功創建資料夾:', folderName, 'ID:', folderId);
    return folderId;
  } catch (error) {
    console.error('創建資料夾錯誤:', error);
    throw error;
  }
}

// 檢查資料夾是否存在，如果不存在則創建
export async function ensureFolder(folderName = '劇本管理平台') {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 先搜尋是否已存在同名資料夾
    const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&access_token=${token}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.files && searchResult.files.length > 0) {
        // 找到現有資料夾，返回第一個
        console.log('✅ 找到現有資料夾:', folderName, 'ID:', searchResult.files[0].id);
        return searchResult.files[0].id;
      }
    }

    // 如果不存在，創建新資料夾
    return await createFolder(folderName);
  } catch (error) {
    console.error('確保資料夾存在錯誤:', error);
    // 如果搜尋失敗，直接創建
    return await createFolder(folderName);
  }
}

// 創建新的 Google Sheet（如果用戶還沒有），並放在指定的資料夾中
export async function createNewSpreadsheet(title = '劇本管理平台', folderName = '劇本管理平台') {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 確保資料夾存在
    console.log('📁 檢查並創建資料夾:', folderName);
    const folderId = await ensureFolder(folderName);
    
    // 使用 Google Drive API 創建新的 Google Sheet，並放在資料夾中
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?access_token=' + token,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: title,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId] // 將 Sheet 放在資料夾中
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('創建 Google Sheet 錯誤詳情:', error);
      throw new Error(error.error?.message || '創建 Google Sheet 失敗');
    }

    const result = await response.json();
    const sheetId = result.id;
    
    if (!sheetId) {
      throw new Error('創建成功但未返回 Sheet ID');
    }
    
    console.log('✅ 成功創建 Google Sheet:', title, 'ID:', sheetId, '資料夾:', folderName);
    setSpreadsheetId(sheetId);
    return sheetId;
  } catch (error) {
    console.error('創建 Google Sheet 錯誤:', error);
    throw error;
  }
}

// 上傳圖片到 Google Drive 的 photo 資料夾
export async function uploadImageToDrive(file, subFolderName = null, folderName = 'photo', parentFolderName = '劇本管理平台') {
  // 參數說明：
  // - file: 要上傳的文件
  // - subFolderName: 子資料夾名稱（例如 'people' 或 'storyboard'），如果為 null 則直接存儲在 folderName 下
  // - folderName: 主要資料夾名稱（默認為 'photo'）
  // - parentFolderName: 父資料夾名稱（默認為 '劇本管理平台'）
  // 
  // 資料夾結構：
  // - 劇本管理平台 (parentFolderName)
  //   - photo (folderName)
  //     - people (subFolderName) - 人物圖片
  //     - storyboard (subFolderName) - 分鏡圖
  
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 先確保父資料夾存在
    console.log('📁 檢查並創建父資料夾:', parentFolderName);
    const parentFolderId = await ensureFolder(parentFolderName);
    
    // 在父資料夾中查找或創建 photo 資料夾
    console.log('📁 檢查並創建主要資料夾:', folderName);
    const photoFolderId = await ensureFolderInParent(folderName, parentFolderId);
    
    // 如果有子資料夾名稱，在 photo 資料夾下創建子資料夾
    let targetFolderId = photoFolderId;
    if (subFolderName) {
      console.log(`📁 檢查並創建子資料夾: ${folderName}/${subFolderName}`);
      targetFolderId = await ensureFolderInParent(subFolderName, photoFolderId);
      console.log(`✅ 目標資料夾 ID: ${targetFolderId}`);
    } else {
      console.log(`📁 直接使用主要資料夾: ${folderName}`);
    }
    
    // 壓縮圖片
    const compressedFile = await compressImageFile(file, 800, 800, 0.85);
    
    // 創建 FormData 來上傳圖片
    const formData = new FormData();
    const metadata = {
      name: `${Date.now()}_${file.name}`,
      parents: [targetFolderId]  // 使用目標資料夾 ID（可能是子資料夾）
    };
    
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', compressedFile);
    
    // 上傳到 Google Drive
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink&access_token=' + token,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('上傳圖片錯誤詳情:', error);
      throw new Error(error.error?.message || '上傳圖片失敗');
    }

    const result = await response.json();
    
    if (!result.id) {
      throw new Error('上傳成功但未返回文件 ID');
    }
    
    // 設置文件為公開可讀（用於顯示）- 必須設置成功才能正常顯示
    let permissionSet = false;
    try {
      console.log('🔐 開始設置文件公開權限，文件 ID:', result.id);
      await setFilePublic(result.id);
      permissionSet = true;
      console.log('✅ 圖片權限設置成功');
      
      // 等待一小段時間確保權限生效（Drive API 有時需要一點時間傳播權限）
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error('❌ 設置文件為公開失敗:', err);
      console.warn('⚠️ 圖片可能無法正常顯示，請檢查文件權限');
      // 嘗試再次設置（有時 API 需要重試）
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await setFilePublic(result.id);
        permissionSet = true;
        console.log('✅ 重試後權限設置成功');
      } catch (retryErr) {
        console.error('❌ 重試設置權限也失敗:', retryErr);
      }
    }
    
    if (!permissionSet) {
      console.warn('⚠️ 圖片文件權限可能未正確設置，圖片可能無法正常顯示');
      console.warn('💡 建議：手動在 Google Drive 中設置文件權限為「知道連結的任何人可查看」');
    }
    
    // 返回圖片的共享連結
    // 使用多種 URL 格式以確保兼容性
    const imageUrl = `https://drive.google.com/uc?export=view&id=${result.id}`;
    // 備用 URL（直接內容連結）
    const directImageUrl = result.webContentLink || imageUrl;
    
    console.log('✅ 圖片上傳成功:', result.id);
    console.log('📷 圖片 URL:', imageUrl);
    console.log('🔗 直接內容連結:', directImageUrl);
    console.log('🔗 圖片查看連結:', result.webViewLink);
    
    // 驗證 URL 是否可訪問（可選）
    // 注意：由於 CORS 限制，這個驗證可能不會成功，但可以嘗試
    
    return {
      fileId: result.id,
      url: imageUrl,  // 用於 <img src>
      directUrl: directImageUrl,  // 備用直接連結
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`  // 用於在新分頁中查看
    };
  } catch (error) {
    console.error('上傳圖片錯誤:', error);
    throw error;
  }
}

// 在指定父資料夾中查找或創建資料夾
async function ensureFolderInParent(folderName, parentFolderId) {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 搜尋是否已存在同名資料夾在指定父資料夾中
    const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&access_token=${token}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.files && searchResult.files.length > 0) {
        // 找到現有資料夾，返回第一個
        console.log('✅ 找到現有資料夾:', folderName, 'ID:', searchResult.files[0].id);
        return searchResult.files[0].id;
      }
    }

    // 如果不存在，創建新資料夾在指定父資料夾中
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?access_token=' + token,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '創建資料夾失敗');
    }

    const result = await response.json();
    console.log('✅ 成功創建資料夾:', folderName, 'ID:', result.id);
    return result.id;
  } catch (error) {
    console.error('確保資料夾存在錯誤:', error);
    throw error;
  }
}

// 設置文件為公開可讀
async function setFilePublic(fileId) {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 先檢查權限是否已存在
    const checkResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?access_token=${token}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (checkResponse.ok) {
      const permissions = await checkResponse.json();
      const hasPublicPermission = permissions.permissions?.some(
        p => p.type === 'anyone' && p.role === 'reader'
      );
      
      if (hasPublicPermission) {
        console.log('✅ 文件已有公開讀取權限');
        return true;
      }
    }

    // 創建公開讀取權限
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?access_token=${token}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // 如果權限已存在（409），不視為錯誤
      if (error.error?.code === 409) {
        console.log('✅ 文件權限已存在');
        return true;
      }
      console.error('設置權限錯誤詳情:', error);
      throw new Error(error.error?.message || '設置文件權限失敗');
    }

    const result = await response.json();
    console.log('✅ 成功設置文件公開權限:', result.id);
    return true;
  } catch (error) {
    console.error('設置文件權限錯誤:', error);
    throw error;
  }
}

// 壓縮圖片文件（返回 Blob）
function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 計算新尺寸
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // 創建 canvas 並繪製壓縮後的圖片
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 轉換為 Blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('圖片壓縮失敗'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


