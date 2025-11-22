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

// 保存完整專案資料（即時儲存）
export async function saveProjectData(data) {
  try {
    const sheetName = 'ScriptData';
    
    console.log('💾 [Google Sheets] 開始保存專案資料...');
    
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
    console.log('✅ [Google Sheets] 專案資料保存成功');
    return true;
  } catch (error) {
    console.error('❌ [Google Sheets] 保存專案資料失敗:', error);
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
export async function uploadImageToDrive(file, folderName = 'photo', parentFolderName = '劇本管理平台') {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('未設置 Google Sheets 認證信息');
  }

  try {
    // 先確保父資料夾存在
    console.log('📁 檢查並創建父資料夾:', parentFolderName);
    const parentFolderId = await ensureFolder(parentFolderName);
    
    // 在父資料夾中查找或創建 photo 資料夾
    const photoFolderId = await ensureFolderInParent(folderName, parentFolderId);
    
    // 壓縮圖片
    const compressedFile = await compressImageFile(file, 800, 800, 0.85);
    
    // 創建 FormData 來上傳圖片
    const formData = new FormData();
    const metadata = {
      name: `${Date.now()}_${file.name}`,
      parents: [photoFolderId]
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
    
    // 設置文件為公開可讀（用於顯示）
    if (result.id) {
      try {
        await setFilePublic(result.id);
      } catch (err) {
        console.warn('設置文件為公開失敗，但不影響使用:', err);
      }
    }
    
    // 返回圖片的共享連結（使用 Google Drive 的圖片預覽 URL）
    // 這個 URL 可以直接在 <img> 標籤中使用
    const imageUrl = `https://drive.google.com/uc?export=view&id=${result.id}`;
    
    console.log('✅ 圖片上傳成功:', result.id);
    console.log('📷 圖片 URL:', imageUrl);
    console.log('🔗 圖片查看連結:', result.webViewLink);
    
    return {
      fileId: result.id,
      url: imageUrl,  // 用於 <img src>
      webViewLink: result.webViewLink  // 用於在新分頁中查看
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
      // 如果權限已存在，不視為錯誤
      if (error.error?.code !== 409) {
        throw new Error(error.error?.message || '設置文件權限失敗');
      }
    }

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

