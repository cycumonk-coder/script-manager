/**
 * 解析 Pulp Fiction 劇本並轉換為可匯入格式
 * 
 * 這個腳本會解析好萊塢格式的劇本文本，並將其轉換為平台可用的 JSON 格式
 * 
 * 使用方法：
 * 1. 將 PDF 文本內容複製到 pulp-fiction.txt 文件
 * 2. node scripts/pulp-fiction-parser.js
 * 3. 會生成 pulp-fiction-import.json 文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取劇本文本文件（如果存在）
let scriptText = '';
const textFilePath = path.join(__dirname, '../pulp-fiction.txt');

if (fs.existsSync(textFilePath)) {
  scriptText = fs.readFileSync(textFilePath, 'utf-8');
  console.log('已讀取劇本文本文件');
} else {
  console.log('未找到劇本文本文件，使用內建範例');
  // 使用範例文本（實際使用時應該從文件讀取）
  scriptText = `INT. COFFEE SHOP - MORNING

A normal Denny's, Spires-like coffee shop in Los Angeles. It's about 9:00 in the morning. While the place isn't jammed, there's a healthy number of people drinking coffee, munching on bacon and eating eggs.

Two of these people are a YOUNG MAN and a YOUNG WOMAN. The Young Man has a slight working-class English accent and, like his fellow countryman, smokes cigarettes like they're going out of style.

It is impossible to tell where the Young Woman is from or how old she is; everything she does contradicts something she did. The boy and girl sit in a booth. Their dialogue is to be said in a rapidpace "HIS GIRL FRIDAY" fashion.

YOUNG MAN
No, forget it, it's too risky. I'm through
doin' that shit.
YOUNG WOMAN
You always say that, the same thing every
time: never again, I'm through, too
dangerous.
YOUNG MAN
I know that's what I always say. I'm
always right too, but -
YOUNG WOMAN

- but you forget about it in a day or two
-

YOUNG MAN

- yeah, well, the days of me forgittin'
are over, and the days of me rememberin'
have just begun.

FADE OUT

THE END`;
}

// 解析好萊塢格式劇本
function parseHollywoodScript(scriptText) {
  const lines = scriptText.split('\n');
  const scenes = [];
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
    const originalLine = line; // 保留原始格式用於對白換行
    
    // 跳過空行、分隔線、章節標題
    if (!trimmedLine || 
        trimmedLine.match(/^[-=#]+$/) || 
        trimmedLine.match(/^(FADE OUT|THE END|FADE IN)/i) ||
        trimmedLine.match(/^PULP FICTION/i) ||
        trimmedLine.match(/^by$/i)) {
      if (inDialogue && dialogueLines.length > 0) {
        // 結束對白區塊
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
          scenes.push(currentScene);
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
    // 條件：全大寫、短行、下一行不是場景標題、不是動作描述
    if (characterPattern.test(trimmedLine) && 
        trimmedLine.length < 50 && 
        trimmedLine.length > 2 &&
        !trimmedLine.includes('.') &&
        !trimmedLine.match(/^(INT\.|EXT\.|FADE|THE END)/i)) {
      
      // 檢查下一行是否是對白或動作（不是另一個角色名稱）
      let isCharacterName = false;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        
        // 如果是另一個全大寫短行，可能不是角色名稱
        if (characterPattern.test(nextLine) && nextLine.length < 50) {
          break;
        }
        
        // 如果下一行是對白或動作，這是角色名稱
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
        
        // 提取角色名稱（移除括號內的動作指示）
        currentCharacter = trimmedLine.replace(/\s*\([^)]*\)\s*$/, '').trim();
        
        // 添加角色名稱到內容（Markdown 格式）
        currentContent.push(`### ${currentCharacter}`);
        inDialogue = true;
        continue;
      }
    }
    
    // 處理動作描述和對白
    if (currentScene && trimmedLine) {
      // 如果在對白模式中
      if (inDialogue) {
        // 檢查是否是動作指示（在括號中，通常在角色名稱下方）
        if (trimmedLine.match(/^\(.+\)$/)) {
          // 動作指示，合併到角色名稱行
          const lastIndex = currentContent.length - 1;
          if (lastIndex >= 0 && currentContent[lastIndex].startsWith('###')) {
            const actionText = trimmedLine.slice(1, -1);
            currentContent[lastIndex] += ` (${actionText})`;
          }
        } 
        // 檢查是否是新角色名稱（結束當前對白）
        else if (characterPattern.test(trimmedLine) && trimmedLine.length < 50) {
          // 結束當前對白
          if (dialogueLines.length > 0) {
            dialogueLines.forEach(dl => currentContent.push(`> ${dl}`));
            dialogueLines = [];
          }
          // 開始新角色
          currentCharacter = trimmedLine.replace(/\s*\([^)]*\)\s*$/, '').trim();
          currentContent.push(`### ${currentCharacter}`);
        }
        // 對白內容（可能跨多行）
        else {
          // 對白行，先收集起來
          if (trimmedLine.startsWith('- ')) {
            // 繼續對白（前一行有 -）
            dialogueLines[dialogueLines.length - 1] += ' ' + trimmedLine.substring(2);
          } else {
            dialogueLines.push(trimmedLine);
          }
        }
      } 
      // 動作描述
      else {
        // 普通動作描述
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
      scenes.push(currentScene);
    }
  }
  
  return scenes;
}

// 解析劇本
console.log('開始解析劇本...');
const scenes = parseHollywoodScript(scriptText);
console.log(`解析完成！共找到 ${scenes.length} 個場景`);

// 創建匯入格式
const importData = {
  scriptData: {
    title: 'PULP FICTION',
    coreIdea: 'PULP [pulp] n. 1. A soft, moist, shapeless mass or matter. 2. A magazine or book containing lurid subject matter and being characteristically printed on rough, unfinished paper.',
    author: 'Quentin Tarantino & Roger Avary',
    version: '1.0'
  },
  outline: {
    opening: '',
    theme: '',
    setup: '',
    catalyst: '',
    debate: '',
    break1: '',
    bstory: '',
    fun: '',
    midpoint: '',
    badguys: '',
    allislost: '',
    darksoul: '',
    break2: '',
    finale: '',
    final: ''
  },
  scenes: scenes,
  exportDate: new Date().toISOString(),
  version: '1.0'
};

// 寫入 JSON 文件
const outputPath = path.join(__dirname, '../pulp-fiction-import.json');
fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2), 'utf-8');
console.log(`\n已生成匯入文件：${outputPath}`);
console.log(`\n場景列表：`);
scenes.forEach((scene, index) => {
  console.log(`${index + 1}. ${scene.title} - ${scene.dayNight}`);
});

console.log(`\n請使用「匯入資料」功能將此 JSON 文件匯入到劇本管理平台。`);

