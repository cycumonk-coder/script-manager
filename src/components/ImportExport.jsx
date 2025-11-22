import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './ImportExport.css';

// 設置 PDF.js worker（使用 public 目錄中的文件）
// 文件已複製到 public/pdf.worker.min.mjs
if (typeof window !== 'undefined') {
  // 使用相對路徑，從 public 目錄提供
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

const ImportExport = ({ scriptData, outline, scenes, characters = [], characterConnections = [], onImport }) => {
  const [parsingPDF, setParsingPDF] = useState(false);
  const exportData = () => {
    const data = {
      scriptData,
      outline,
      scenes,
      characters,
      connections: characterConnections,
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

  // 台灣優良劇本格式匯出
  const exportTaiwanFormat = () => {
    if (!scenes || scenes.length === 0) {
      alert('目前沒有場次資料可以匯出');
      return;
    }

    let script = '';
    const title = scriptData?.title || '劇本標題';
    
    // 標題
    script += `分鏡圖，直式橫書正體（繁體）中文12級字\n\n\n`;
    
    // 按場次編號排序
    const sortedScenes = [...scenes].sort((a, b) => (a.number || 0) - (b.number || 0));
    
    // 處理每個場次
    sortedScenes.forEach((scene, index) => {
      if (!scene.content) return;
      
      // 場景標題：數字. 內景/外景 場景名稱 時間
      const sceneNumber = scene.number || (index + 1);
      const location = scene.location || '地點';
      const dayNight = scene.dayNight || '日';
      
      // 判斷內景或外景
      const isInterior = !location.match(/(外|戶外|街道|公園|廣場|海邊|河邊|室外)/i);
      const sceneType = isInterior ? '內景' : '外景';
      
      script += `${sceneNumber}. ${sceneType} ${location} ${dayNight}\n\n`;
      
      // 解析場景內容
      const parsedContent = parseTaiwanFormat(scene.content);
      
      // 場景描述
      if (parsedContent.description) {
        script += `${parsedContent.description}\n\n`;
      }
      
      // 角色介紹
      if (parsedContent.characters.length > 0) {
        script += `${parsedContent.characters.join('。')}。\n\n`;
      }
      
      // 動作和對白交錯
      parsedContent.actions.forEach((action, actionIndex) => {
        // 動作描述（如果存在且不為空）
        if (action.action && action.action.trim()) {
          script += `${action.action.trim()}\n\n`;
        }
        
        // 對白
        if (action.dialogue && action.dialogue.length > 0) {
          action.dialogue.forEach(d => {
            if (d.character && d.text) {
              script += `${d.character}：${d.text}\n\n`;
            }
          });
        }
      });
      
      // 場次之間的空行
      if (index < sortedScenes.length - 1) {
        script += '\n\n';
      }
    });
    
    // 創建文字檔
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '劇本'}_台灣優良劇本格式_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 解析場景內容為台灣優良劇本格式
  const parseTaiwanFormat = (content) => {
    if (!content) {
      return {
        description: '',
        characters: [],
        actions: []
      };
    }
    
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    
    let description = '';
    let characters = [];
    let actions = [];
    let currentAction = { action: '', dialogue: [] };
    let foundDescription = false;
    let foundCharacters = false;
    
    // 對白模式（角色：對白 或 ###角色名 後接 >對白）
    const dialoguePattern = /^([^：:]+)[：:]\s*(.+)$/;
    // Markdown 格式：### 角色名
    const markdownCharacterPattern = /^###\s*(.+)$/;
    // Markdown 格式：> 對白
    const markdownDialoguePattern = /^>\s*(.+)$/;
    // 角色介紹模式（包含性別、年齡）
    const characterIntroPattern = /([^，。]+)，([男女])，([^，。]+歲?)。?/;
    
    let currentCharacter = '';
    let inDialogueBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳過場景標題（## 開頭）
      if (line.startsWith('##')) {
        continue;
      }
      
      // Markdown 格式：### 角色名
      const charMatch = line.match(markdownCharacterPattern);
      if (charMatch) {
        currentCharacter = charMatch[1].trim();
        inDialogueBlock = true;
        continue;
      }
      
      // Markdown 格式：> 對白
      const markdownDialogueMatch = line.match(markdownDialoguePattern);
      if (markdownDialogueMatch && currentCharacter) {
        const dialogueText = markdownDialogueMatch[1].trim();
        if (!currentAction.dialogue) {
          currentAction.dialogue = [];
        }
        currentAction.dialogue.push({
          character: currentCharacter,
          text: dialogueText
        });
        inDialogueBlock = true;
        continue;
      }
      
      // 直接格式：角色名：對白
      const dialogueMatch = line.match(dialoguePattern);
      if (dialogueMatch) {
        const character = dialogueMatch[1].trim();
        const text = dialogueMatch[2].trim();
        
        // 結束當前的動作描述
        if (currentAction.action && !inDialogueBlock) {
          if (currentAction.action || currentAction.dialogue?.length > 0) {
            actions.push({ ...currentAction });
          }
          currentAction = { action: '', dialogue: [] };
        }
        
        if (!currentAction.dialogue) {
          currentAction.dialogue = [];
        }
        
        currentAction.dialogue.push({
          character: character,
          text: text
        });
        inDialogueBlock = true;
        continue;
      }
      
      // 檢查是否為場景描述（通常在前幾行，包含場景環境描述）
      if (!foundDescription && i < 5) {
        // 檢查是否包含場景描述關鍵字（建築、家具、環境等）
        if (line.match(/(棟|間|層|樓|中|裡|內|有|沒有|中|客廳|房間|公寓|建築)/) && line.length > 15) {
          description = line;
          foundDescription = true;
          continue;
        }
      }
      
      // 檢查是否為角色介紹（包含性別、年齡描述）
      // 檢查是否為角色介紹（包含年齡、性別等描述）
      // 格式：角色名，性別，年齡。或 角色名，性別，年齡歲。
      if (!foundCharacters && line.match(/([^，。]+)，([男女])，([^，。]+歲?)/)) {
        // 如果這一行包含角色介紹，整行都作為角色介紹
        // 可能包含多個角色的介紹，用句號分割
        const parts = line.split(/[。]/).filter(p => p.trim());
        parts.forEach(part => {
          if (part.match(/([^，。]+)，([男女])，([^，。]+歲?)/) || (part.includes('，') && part.includes('歲'))) {
            const trimmed = part.trim();
            if (trimmed) {
              characters.push(trimmed);
            }
          }
        });
        // 如果包含「跟」或「和」連接的角色關係描述，也加入
        if (line.includes('跟') || line.includes('和')) {
          characters.push(line);
        }
        foundCharacters = true;
        continue;
      }
      
      // 其他視為動作描述
      // 如果當前在對白區塊中，先保存並開始新的動作描述
      if (inDialogueBlock && !line.match(dialoguePattern) && !line.match(markdownDialoguePattern)) {
        if (currentAction.action || currentAction.dialogue?.length > 0) {
          actions.push({ ...currentAction });
        }
        currentAction = { action: line, dialogue: [] };
        inDialogueBlock = false;
      } else {
        // 合併多行的動作描述
        if (currentAction.action) {
          currentAction.action += ' ' + line;
        } else {
          currentAction.action = line;
        }
      }
    }
    
    // 保存最後一個動作組
    if (currentAction.action || currentAction.dialogue?.length > 0) {
      actions.push(currentAction);
    }
    
    // 如果沒有場景描述，嘗試從第一個動作描述中提取
    if (!description && actions.length > 0 && actions[0].action) {
      const firstAction = actions[0].action;
      if (firstAction.match(/(棟|間|層|樓|中|裡|內|有|沒有|中|客廳|房間|公寓|建築)/) && firstAction.length > 15) {
        description = firstAction;
        actions[0].action = ''; // 移除已作為描述的部分
      }
    }
    
    return {
      description: description,
      characters: characters,
      actions: actions
    };
  };

  // 解析好萊塢格式劇本（從文本）
  const parseHollywoodScript = (scriptText) => {
    const lines = scriptText.split('\n');
    const parsedScenes = [];
    let currentScene = null;
    let sceneNumber = 1;
    
    // 場景標題正則（INT./EXT. 場景名稱 - 時間）
    const sceneHeadingPattern = /^(INT\.|EXT\.)\s+(.+?)\s*-\s*(.+)$/i;
    // 角色名稱正則（全大寫，短行，可能包含點和空格）
    const characterPattern = /^[A-Z][A-Z\s&.'-]+$/;
    
    let currentContent = [];
    let inDialogue = false;
    let currentCharacter = '';
    let dialogueLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 跳過空行、分隔線、章節標題
      if (!trimmedLine || 
          trimmedLine.match(/^[-=#]+$/) || 
          trimmedLine.match(/^(FADE OUT|THE END|FADE IN)/i) ||
          trimmedLine.match(/^PULP FICTION/i) ||
          trimmedLine.match(/^by$/i)) {
        if (inDialogue && dialogueLines.length > 0) {
          dialogueLines.forEach(dl => currentContent.push(`> ${dl}`));
          dialogueLines = [];
          inDialogue = false;
        }
        continue;
      }
      
      // 檢查是否是場景標題
      const sceneMatch = trimmedLine.match(sceneHeadingPattern);
      if (sceneMatch) {
        // 保存上一個場景
        if (currentScene) {
          if (inDialogue && dialogueLines.length > 0) {
            dialogueLines.forEach(dl => currentContent.push(`> ${dl}`));
            dialogueLines = [];
          }
          if (currentContent.length > 0) {
            currentScene.content = currentContent.join('\n');
            parsedScenes.push(currentScene);
          }
        }
        
        // 創建新場景
        const [, sceneType, location, time] = sceneMatch;
        currentScene = {
          id: `scene-${sceneNumber}`,
          number: sceneNumber++,
          title: `${sceneType.trim()} ${location.trim()}`,
          location: location.trim(),
          dayNight: time.trim(),
          content: '',
          beatId: null
        };
        currentContent = [];
        inDialogue = false;
        currentCharacter = '';
        dialogueLines = [];
        continue;
      }
      
      // 檢查是否是角色名稱
      if (characterPattern.test(trimmedLine) && 
          trimmedLine.length < 50 && 
          trimmedLine.length > 2 &&
          !trimmedLine.includes('.') &&
          !trimmedLine.match(/^(INT\.|EXT\.|FADE|THE END)/i)) {
        
        // 檢查下一行是否是對白或動作
        let isCharacterName = false;
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (!nextLine) continue;
          
          if (characterPattern.test(nextLine) && nextLine.length < 50) {
            break;
          }
          
          if (nextLine.length > 0 && 
              !characterPattern.test(nextLine) && 
              !nextLine.match(/^(INT\.|EXT\.|FADE)/i)) {
            isCharacterName = true;
            break;
          }
        }
        
        if (isCharacterName) {
          // 結束之前的對白
          if (inDialogue && dialogueLines.length > 0) {
            dialogueLines.forEach(dl => currentContent.push(`> ${dl}`));
            dialogueLines = [];
          }
          
          // 提取角色名稱
          currentCharacter = trimmedLine.replace(/\s*\([^)]*\)\s*$/, '').trim();
          currentContent.push(`### ${currentCharacter}`);
          inDialogue = true;
          continue;
        }
      }
      
      // 處理動作描述和對白
      if (currentScene && trimmedLine) {
        if (inDialogue) {
          // 動作指示
          if (trimmedLine.match(/^\(.+\)$/)) {
            const lastIndex = currentContent.length - 1;
            if (lastIndex >= 0 && currentContent[lastIndex].startsWith('###')) {
              const actionText = trimmedLine.slice(1, -1);
              currentContent[lastIndex] += ` (${actionText})`;
            }
          } 
          // 新角色名稱
          else if (characterPattern.test(trimmedLine) && trimmedLine.length < 50) {
            if (dialogueLines.length > 0) {
              dialogueLines.forEach(dl => currentContent.push(`> ${dl}`));
              dialogueLines = [];
            }
            currentCharacter = trimmedLine.replace(/\s*\([^)]*\)\s*$/, '').trim();
            currentContent.push(`### ${currentCharacter}`);
          }
          // 對白內容
          else {
            if (trimmedLine.startsWith('- ')) {
              dialogueLines[dialogueLines.length - 1] += ' ' + trimmedLine.substring(2);
            } else {
              dialogueLines.push(trimmedLine);
            }
          }
        } else {
          // 動作描述
          currentContent.push(trimmedLine);
        }
      }
    }
    
    // 保存最後一個場景
    if (currentScene) {
      if (inDialogue && dialogueLines.length > 0) {
        dialogueLines.forEach(dl => currentContent.push(`> ${dl}`));
      }
      if (currentContent.length > 0) {
        currentScene.content = currentContent.join('\n');
        parsedScenes.push(currentScene);
      }
    }
    
    return parsedScenes;
  };

  // 解析 PDF 文件
  const handlePDFImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      alert('請選擇 PDF 文件');
      return;
    }
    
    setParsingPDF(true);
    
    try {
      // 讀取 PDF 文件
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // 提取所有頁面的文本
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // 解析劇本
      const parsedScenes = parseHollywoodScript(fullText);
      
      if (parsedScenes.length === 0) {
        alert('無法從 PDF 中解析出場景，請確認 PDF 格式是否為標準好萊塢劇本格式');
        setParsingPDF(false);
        return;
      }
      
      // 提取劇本標題（從第一行或前幾行）
      let title = '匯入的劇本';
      const firstLines = fullText.split('\n').slice(0, 10);
      for (const line of firstLines) {
        const trimmed = line.trim();
        if (trimmed && trimmed.length > 3 && trimmed.length < 100 && !trimmed.match(/^(INT\.|EXT\.|by|PULP)/i)) {
          title = trimmed;
          break;
        }
      }
      
      // 創建匯入資料
      const importData = {
        scriptData: {
          ...scriptData,
          title: title,
          totalScenes: parsedScenes.length,
          completedScenes: 0
        },
        outline: outline || {},
        scenes: parsedScenes,
        characters: [], // PDF 匯入時沒有角色資料
        connections: [] // PDF 匯入時沒有關係資料
      };
      
      // 自動填入資料
      if (onImport) {
        onImport(importData);
        alert(`成功解析 PDF！共找到 ${parsedScenes.length} 個場景。`);
      }
      
    } catch (error) {
      console.error('PDF 解析錯誤:', error);
      alert(`PDF 解析失敗：${error.message || '未知錯誤'}`);
    } finally {
      setParsingPDF(false);
      // 重置文件輸入
      event.target.value = '';
    }
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
        <button className="export-btn primary" onClick={exportTaiwanFormat}>
          匯出劇本 (台灣優良劇本格式)
        </button>
        <label className="import-btn">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          匯入資料 (JSON)
        </label>
        <label className={`import-btn ${parsingPDF ? 'loading' : ''}`}>
          <input
            type="file"
            accept=".pdf"
            onChange={handlePDFImport}
            style={{ display: 'none' }}
            disabled={parsingPDF}
          />
          {parsingPDF ? '解析 PDF 中...' : '匯入 PDF 劇本'}
        </label>
      </div>
    </div>
  );
};

export default ImportExport;

