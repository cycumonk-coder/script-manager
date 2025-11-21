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
        alert('儲存空間不足，請清除瀏覽器資料');
      }
      return false;
    }
  },

  // 檢查 localStorage 使用情況
  checkUsage: () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage.getItem(key).length;
        total += size;
        console.log(`📊 localStorage["${key}"]: ${size} bytes`);
      }
    }
    console.log(`📊 localStorage 總使用量: ${total} bytes (${(total / 1024).toFixed(2)} KB)`);
    return total;
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

