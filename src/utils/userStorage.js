// 用戶數據存儲工具 - 根據用戶 ID 分離數據

/**
 * 獲取帶用戶 ID 前綴的存儲鍵
 */
export function getUserStorageKey(userId, key) {
  if (!userId) {
    console.warn('⚠️ 沒有用戶 ID，使用全局存儲鍵:', key);
    return key;
  }
  return `user_${userId}_${key}`;
}

/**
 * 從 localStorage 獲取用戶數據
 */
export function getUserStorageItem(userId, key) {
  const storageKey = getUserStorageKey(userId, key);
  const value = localStorage.getItem(storageKey);
  
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(`❌ 解析 ${storageKey} 失敗:`, e);
      return null;
    }
  }
  return null;
}

/**
 * 保存用戶數據到 localStorage
 */
export function setUserStorageItem(userId, key, value) {
  const storageKey = getUserStorageKey(userId, key);
  try {
    const stringified = JSON.stringify(value);
    localStorage.setItem(storageKey, stringified);
    return true;
  } catch (e) {
    console.error(`❌ 保存 ${storageKey} 失敗:`, e);
    if (e.name === 'QuotaExceededError') {
      alert('儲存空間不足，請清除一些資料或使用 Google Sheets 雲端同步。');
    }
    return false;
  }
}

/**
 * 刪除用戶數據
 */
export function removeUserStorageItem(userId, key) {
  const storageKey = getUserStorageKey(userId, key);
  localStorage.removeItem(storageKey);
}

/**
 * 清除所有用戶數據
 */
export function clearUserStorage(userId) {
  if (!userId) return;
  
  const keys = [
    'scriptData',
    'scriptOutline',
    'scriptScenes',
    'characters',
    'characterConnections',
    'google_sheet_id'
  ];
  
  keys.forEach(key => {
    const storageKey = getUserStorageKey(userId, key);
    localStorage.removeItem(storageKey);
    console.log(`🗑️ 已清除 ${storageKey}`);
  });
}

/**
 * 獲取當前登入的用戶 ID
 */
export function getCurrentUserId() {
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

/**
 * 遷移舊的全局數據到用戶數據（向後兼容）
 */
export function migrateOldDataToUserData(userId) {
  if (!userId) return;
  
  const oldKeys = {
    'scriptData': 'scriptData',
    'scriptOutline': 'scriptOutline',
    'scriptScenes': 'scriptScenes',
    'characters': 'characters',
    'characterConnections': 'characterConnections'
  };
  
  let migrated = false;
  
  Object.entries(oldKeys).forEach(([oldKey, newKey]) => {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue) {
      const userKey = getUserStorageKey(userId, newKey);
      // 如果用戶數據不存在，才遷移舊數據
      if (!localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, oldValue);
        console.log(`🔄 已遷移 ${oldKey} 到 ${userKey}`);
        migrated = true;
      }
    }
  });
  
  if (migrated) {
    console.log('✅ 已將舊數據遷移到用戶數據');
  }
  
  return migrated;
}



