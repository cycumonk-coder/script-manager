// Google Sheets API 服務
// 使用 Google Identity Services 進行 OAuth 認證後，可以直接調用 Google Sheets API

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

let accessToken = null;
let spreadsheetId = null;

// 初始化 - 設置訪問令牌
export function setAccessToken(token) {
  accessToken = token;
}

// 初始化 - 設置 Google Sheet ID
export function setSpreadsheetId(sheetId) {
  spreadsheetId = sheetId;
  localStorage.setItem('google_sheet_id', sheetId);
}

// 獲取已保存的 Sheet ID
export function getSpreadsheetId() {
  if (!spreadsheetId) {
    spreadsheetId = localStorage.getItem('google_sheet_id');
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

// 保存完整專案資料
export async function saveProjectData(data) {
  try {
    const sheetName = 'ScriptData';
    
    // 將資料轉換為二維陣列
    const rows = [
      ['key', 'value'],
      ['scriptData', JSON.stringify(data.scriptData || {})],
      ['outline', JSON.stringify(data.outline || {})],
      ['scenes', JSON.stringify(data.scenes || [])],
      ['characters', JSON.stringify(data.characters || [])],
      ['connections', JSON.stringify(data.connections || [])],
      ['lastUpdated', new Date().toISOString()]
    ];

    await writeData(sheetName, 'A1:B10', rows);
    return true;
  } catch (error) {
    console.error('保存專案資料失敗:', error);
    throw error;
  }
}

// 載入完整專案資料
export async function loadProjectData() {
  try {
    const sheetName = 'ScriptData';
    const rows = await readData(sheetName, 'A1:B10');
    
    if (!rows || rows.length < 2) {
      return {
        scriptData: {},
        outline: {},
        scenes: [],
        characters: [],
        connections: []
      };
    }

    // 轉換為物件
    const data = {};
    for (let i = 1; i < rows.length; i++) {
      const [key, value] = rows[i];
      if (key && value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }

    return {
      scriptData: data.scriptData || {},
      outline: data.outline || {},
      scenes: data.scenes || [],
      characters: data.characters || [],
      connections: data.connections || []
    };
  } catch (error) {
    console.error('載入專案資料失敗:', error);
    // 如果錯誤是因為工作表不存在，返回空資料
    if (error.message.includes('Unable to parse range')) {
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

// 創建新的 Google Sheet（如果用戶還沒有）
export async function createNewSpreadsheet(title = '劇本管理平台') {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 使用 Google Drive API 創建新的 Google Sheet
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
          mimeType: 'application/vnd.google-apps.spreadsheet'
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
    
    setSpreadsheetId(sheetId);
    return sheetId;
  } catch (error) {
    console.error('創建 Google Sheet 錯誤:', error);
    throw error;
  }
}

