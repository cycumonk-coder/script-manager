import { useState } from 'react';
import './ImportExport.css';

const ImportExport = ({ scriptData, outline, scenes, onImport }) => {
  const exportData = () => {
    const data = {
      scriptData,
      outline,
      scenes,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `劇本資料_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportHollywoodFormat = () => {
    let script = '';
    
    const title = scriptData?.title || '劇本標題';
    const coreIdea = scriptData?.coreIdea || '';
    
    // 標題頁 - Pulp Fiction 風格
    script += '\n\n\n\n\n\n\n\n\n\n\n\n';
    script += `\t\t\t\t\t\t\t\t\t\t\t\t\t${title.toUpperCase()}\n\n\n`;
    if (coreIdea) {
      script += `\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t${coreIdea}\n\n\n`;
    }
    script += '\n\n\n\n\n\n\n\n\n\n\n\n\n';
    script += 'FADE IN:\n\n\n';
    
    // 根據大綱結構組織場次（Pulp Fiction 風格：章節式結構）
    const BEAT_SHEET_STRUCTURE = [
      { id: 'opening', label: '開場畫面' },
      { id: 'theme', label: '主題陳述' },
      { id: 'setup', label: '設定' },
      { id: 'catalyst', label: '催化劑' },
      { id: 'debate', label: '辯論' },
      { id: 'break1', label: '進入第二幕' },
      { id: 'bstory', label: 'B故事' },
      { id: 'fun', label: '樂趣與遊戲' },
      { id: 'midpoint', label: '中點' },
      { id: 'badguys', label: '壞人逼近' },
      { id: 'allislost', label: '全盤皆輸' },
      { id: 'darksoul', label: '靈魂暗夜' },
      { id: 'break2', label: '進入第三幕' },
      { id: 'finale', label: '結局' },
      { id: 'final', label: '最終畫面' },
    ];
    
    // 按大綱分組場次
    const scenesByBeat = {};
    scenes.forEach(scene => {
      if (scene.beatId) {
        if (!scenesByBeat[scene.beatId]) {
          scenesByBeat[scene.beatId] = [];
        }
        scenesByBeat[scene.beatId].push(scene);
      }
    });
    
    // 按大綱順序輸出場次
    BEAT_SHEET_STRUCTURE.forEach((beat, beatIndex) => {
      const beatScenes = scenesByBeat[beat.id] || [];
      if (beatScenes.length > 0) {
        // 添加章節標題（Pulp Fiction 風格）
        script += '\n\n';
        script += `\t\t\t\t\t\t\t\t\t\t\t${beat.label.toUpperCase()}\n\n`;
        script += '\n';
        
        // 排序場次
        const sortedScenes = beatScenes.sort((a, b) => a.number - b.number);
        
        // 處理該大綱下的所有場次
        sortedScenes.forEach((scene, sceneIndex) => {
          if (scene.content) {
            script += parsePulpFictionFormat(scene);
            if (sceneIndex < sortedScenes.length - 1) {
              script += '\n\n';
            }
          }
        });
        
        // 大綱段落之間的空行
        if (beatIndex < BEAT_SHEET_STRUCTURE.length - 1) {
          script += '\n\n\n';
        }
      }
    });
    
    // 如果有未分類的場次，也輸出
    const unclassifiedScenes = scenes.filter(s => !s.beatId);
    if (unclassifiedScenes.length > 0) {
      script += '\n\n\n';
      script += '\t\t\t\t\t\t\t\t\t\t\t其他場次\n\n\n';
      const sortedUnclassified = unclassifiedScenes.sort((a, b) => a.number - b.number);
      sortedUnclassified.forEach((scene, index) => {
        if (scene.content) {
          script += parsePulpFictionFormat(scene);
          if (index < sortedUnclassified.length - 1) {
            script += '\n\n';
          }
        }
      });
    }
    
    // 結尾 - Pulp Fiction 風格
    script += '\n\n\n\n\n\n\n\n\n\n';
    script += 'FADE OUT.\n\n\n';
    script += 'THE END\n';
    
    // 創建HTML文件
    const html = generatePulpFictionHTML(script, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '劇本'}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parsePulpFictionFormat = (scene) => {
    const markdown = scene.content || '';
    const sceneTitle = scene.title || '';
    const dayNight = scene.dayNight || 'DAY';
    const location = scene.location || '';
    
    let result = '';
    const lines = markdown.split('\n');
    let inDialogue = false;
    let currentCharacter = '';
    
    // 場景標題 - Pulp Fiction 風格（全大寫，左對齊）
    let sceneHeading = '';
    if (location) {
      sceneHeading = location.toUpperCase();
    } else if (sceneTitle) {
      sceneHeading = sceneTitle.toUpperCase();
    } else {
      sceneHeading = 'LOCATION';
    }
    
    // 判斷內景或外景（簡單判斷）
    const isInt = !sceneHeading.match(/\b(外|戶外|街道|公園|廣場|海邊|河邊)\b/i);
    const sceneType = isInt ? 'INT.' : 'EXT.';
    
    result += `${sceneType} ${sceneHeading} - ${dayNight.toUpperCase()}\n\n`;
    
    // 解析內容
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (inDialogue) {
          result += '\n';
          inDialogue = false;
        }
        continue;
      }
      
      // 場景標題 (## 開頭或包含 INT./EXT.)
      if (line.startsWith('##') || /^(INT\.|EXT\.)/i.test(line)) {
        if (inDialogue) {
          result += '\n';
          inDialogue = false;
        }
        const heading = line.replace(/^##\s*/, '').toUpperCase();
        if (!/^(INT\.|EXT\.)/i.test(heading)) {
          result += `INT. ${heading} - ${dayNight.toUpperCase()}\n\n`;
        } else {
          result += `${heading}\n\n`;
        }
      }
      // 角色名稱 (### 開頭)
      else if (line.startsWith('###')) {
        if (inDialogue) {
          result += '\n';
        }
        currentCharacter = line.replace(/^###\s*/, '').toUpperCase();
        // Pulp Fiction 風格：角色名稱居中（約4.2英寸）
        result += `\n\t\t\t\t\t\t\t\t\t\t\t\t${currentCharacter}\n\n`;
        inDialogue = true;
      }
      // 對話 (> 開頭或跟在角色名稱後)
      else if (line.startsWith('>') || inDialogue) {
        if (line.startsWith('>')) {
          line = line.replace(/^>\s*/, '');
        }
        // Pulp Fiction 風格：對話左縮進約2.5英寸（10個tab）
        result += `\t\t\t\t\t\t\t\t\t${line}\n\n`;
        inDialogue = true;
      }
      // 動作描述（其他所有內容）
      else {
        if (inDialogue) {
          result += '\n';
          inDialogue = false;
        }
        // Pulp Fiction 風格：動作描述左對齊，無縮進
        result += `${line}\n\n`;
      }
    }
    
    if (inDialogue) {
      result += '\n';
    }
    
    return result;
  };

  const parseMarkdownToHollywood = (markdown, sceneTitle) => {
    let result = '';
    const lines = markdown.split('\n');
    let inDialogue = false;
    let currentCharacter = '';
    
    // 如果有場景標題，先添加
    if (sceneTitle) {
      const beatLabel = sceneTitle.split('-')[0]?.trim() || '';
      result += `\n\nINT. ${beatLabel} - DAY\n\n`;
    }
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (inDialogue) {
          result += '\n';
          inDialogue = false;
        } else {
          result += '\n';
        }
        continue;
      }
      
      // 場景標題 (## 開頭或包含 INT./EXT.)
      if (line.startsWith('##') || /^(INT\.|EXT\.)/i.test(line)) {
        if (inDialogue) {
          result += '\n';
          inDialogue = false;
        }
        const sceneHeading = line.replace(/^##\s*/, '').toUpperCase();
        // 如果不是以INT./EXT.開頭，添加INT.
        if (!/^(INT\.|EXT\.)/i.test(sceneHeading)) {
          result += `\n\nINT. ${sceneHeading} - DAY\n\n`;
        } else {
          result += `\n\n${sceneHeading}\n\n`;
        }
      }
      // 角色名稱 (### 開頭或全大寫短行)
      else if (line.startsWith('###')) {
        if (inDialogue) {
          result += '\n';
        }
        currentCharacter = line.replace(/^###\s*/, '').toUpperCase();
        // 好萊塢格式：角色名稱居中（約3.5英寸縮進）
        result += `\n\t\t\t\t\t\t\t\t\t\t${currentCharacter}\n\n`;
        inDialogue = true;
      }
      // 對話 (> 開頭或跟在角色名稱後)
      else if (line.startsWith('>') || inDialogue) {
        if (line.startsWith('>')) {
          line = line.replace(/^>\s*/, '');
        }
        // 好萊塢格式：對話左縮進約2.5英寸
        result += `\t\t\t\t\t\t\t\t${line}\n\n`;
        inDialogue = true;
      }
      // 動作描述（其他所有內容）
      else {
        if (inDialogue) {
          result += '\n';
          inDialogue = false;
        }
        // 好萊塢格式：動作描述左對齊，但有一些縮進
        result += `\t${line}\n\n`;
      }
    }
    
    if (inDialogue) {
      result += '\n';
    }
    
    return result;
  };

  const generatePulpFictionHTML = (script, title) => {
    // 轉義HTML特殊字符
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title || '劇本')}</title>
    <style>
        @page {
            size: US Letter;
            margin: 1in 1in 1in 1.5in;
        }
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12pt;
            line-height: 1.6;
            margin: 0;
            padding: 1in 1in 1in 1.5in;
            background: white;
            color: black;
            max-width: 6.5in;
        }
        .script-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            letter-spacing: 0.02em;
        }
        /* 場景標題：全大寫，左對齊 */
        .script-content {
            font-weight: normal;
        }
        /* 章節標題樣式（Pulp Fiction 風格） */
        .chapter-title {
            font-weight: bold;
            text-align: center;
            margin: 1em 0;
            letter-spacing: 0.1em;
        }
        /* 確保正確的列印格式 */
        @media print {
            body {
                margin: 0;
                padding: 1in 1in 1in 1.5in;
            }
        }
    </style>
</head>
<body>
    <div class="script-content">${escapeHtml(script).replace(/\n/g, '<br>')}</div>
</body>
</html>`;
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (onImport) {
          onImport(data);
          alert('匯入成功！');
        }
      } catch (error) {
        alert('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="import-export">
      <div className="import-export-header">
        <h3 className="section-title">資料管理</h3>
      </div>
      <div className="import-export-actions">
        <button className="export-btn" onClick={exportData}>
          匯出資料 (JSON)
        </button>
        <button className="export-btn primary" onClick={exportHollywoodFormat}>
          匯出劇本 (好萊塢格式)
        </button>
        <label className="import-btn">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          匯入資料
        </label>
      </div>
    </div>
  );
};

export default ImportExport;

