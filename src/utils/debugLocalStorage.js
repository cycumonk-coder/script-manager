// 調試 localStorage 的工具函數

export const debugLocalStorage = {
  // 檢查 localStorage 是否可用
  isAvailable: () => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error('localStorage 不可用:', e);
      return false;
    }
  },

  // 安全地獲取資料
  getItem: (key) => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        console.log(`📭 localStorage["${key}"] = null`);
        return null;
      }
      const parsed = JSON.parse(value);
      console.log(`📥 localStorage["${key}"] =`, parsed);
      return parsed;
    } catch (e) {
      console.error(`❌ 讀取 localStorage["${key}"] 失敗:`, e);
      return null;
    }
  },

  // 安全地設置資料
  setItem: (key, value) => {
    try {
      const stringified = JSON.stringify(value);
      localStorage.setItem(key, stringified);
      
      // 驗證保存是否成功
      const saved = localStorage.getItem(key);
      if (saved === stringified) {
        console.log(`✅ localStorage["${key}"] 保存成功:`, value);
        return true;
      } else {
        console.error(`❌ localStorage["${key}"] 保存後驗證失敗`);
        console.error('原始:', stringified.substring(0, 100));
        console.error('保存後:', saved ? saved.substring(0, 100) : 'null');
        return false;
      }
    } catch (e) {
      console.error(`❌ 保存 localStorage["${key}"] 失敗:`, e);
      if (e.name === 'QuotaExceededError') {
        const message = `儲存空間不足（localStorage 已滿，通常約 5-10MB）。\n\n建議解決方法：\n1. 刪除部分角色的圖片（圖片會佔用大量空間）\n2. 清除瀏覽器快取和網站資料\n3. 使用 Google Sheets 雲端同步功能來儲存資料\n4. 匯出資料後清除 localStorage 再重新匯入`;
        alert(message);
      }
      return false;
    }
  },

  // 檢查 localStorage 使用情況
  checkUsage: () => {
    let total = 0;
    const details = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage.getItem(key).length;
        total += size;
        details[key] = {
          size: size,
          sizeKB: (size / 1024).toFixed(2),
          sizeMB: (size / (1024 * 1024)).toFixed(2)
        };
        console.log(`📊 localStorage["${key}"]: ${(size / 1024).toFixed(2)} KB (${(size / (1024 * 1024)).toFixed(2)} MB)`);
      }
    }
    const totalKB = (total / 1024).toFixed(2);
    const totalMB = (total / (1024 * 1024)).toFixed(2);
    console.log(`📊 localStorage 總使用量: ${totalMB} MB (${totalKB} KB / ${total} bytes)`);
    
    // 檢查是否接近限制（通常 5-10MB）
    const limitMB = 5; // 保守估計 5MB
    if (total / (1024 * 1024) > limitMB * 0.8) {
      console.warn(`⚠️ localStorage 使用量已超過 80%，建議清理資料`);
      const sorted = Object.entries(details).sort((a, b) => b[1].size - a[1].size).slice(0, 3);
      console.warn(`⚠️ 最大使用項:`, sorted.map(([k, v]) => `${k}: ${v.sizeMB} MB`));
    }
    
    return { total, totalKB, totalMB, details };
  },

  // 清空特定 key（用於調試）
  clearItem: (key) => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ 已清除 localStorage["${key}"]`);
    } catch (e) {
      console.error(`❌ 清除 localStorage["${key}"] 失敗:`, e);
    }
  }
};

