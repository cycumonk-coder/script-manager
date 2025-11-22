# Pulp Fiction 劇本解析器

這個腳本可以將 Pulp Fiction 或其他好萊塢格式的劇本轉換為可匯入到劇本管理平台的 JSON 格式。

## 使用方法

### 步驟 1：準備劇本文本文件

1. 將 PDF 文本內容複製到文本文件 `pulp-fiction.txt`（位於專案根目錄）
2. 確保文本格式是標準的好萊塢劇本格式：
   - 場景標題：`INT. 場景名稱 - 時間` 或 `EXT. 場景名稱 - 時間`
   - 角色名稱：全大寫，短行
   - 對白：在角色名稱下方
   - 動作描述：普通文字

### 步驟 2：運行解析腳本

```bash
cd "/Users/huangshiwen/Desktop/劇本管理平台"
node scripts/pulp-fiction-parser.js
```

### 步驟 3：檢查生成的 JSON 文件

腳本會生成 `pulp-fiction-import.json` 文件，包含：
- `scriptData`: 劇本基本信息（標題、作者等）
- `outline`: 劇本大綱（可手動填寫）
- `scenes`: 所有場景的陣列

### 步驟 4：匯入到劇本管理平台

1. 打開劇本管理平台
2. 進入「資料管理」標籤
3. 點擊「匯入資料」按鈕
4. 選擇 `pulp-fiction-import.json` 文件
5. 完成！所有場景會自動匯入

## 生成的文件結構

```json
{
  "scriptData": {
    "title": "PULP FICTION",
    "coreIdea": "...",
    "author": "Quentin Tarantino & Roger Avary"
  },
  "outline": {
    "opening": "",
    "theme": "",
    ...
  },
  "scenes": [
    {
      "id": "scene-1",
      "number": 1,
      "title": "INT. COFFEE SHOP",
      "location": "COFFEE SHOP",
      "dayNight": "MORNING",
      "content": "場景內容（Markdown 格式）",
      "beatId": null
    },
    ...
  ]
}
```

## 注意事項

- 解析器會自動識別場景標題、角色名稱和對白
- 如果某些場景解析不正確，可以在匯入後手動編輯
- 劇本大綱（outline）部分需要手動填寫，或匯入後在平台上編輯
- 場景的 `beatId` 可以在匯入後手動分配到對應的大綱

## 故障排除

如果解析結果不理想：

1. **場景數量不正確**：檢查劇本文本中的場景標題格式是否正確
2. **對白與動作描述混雜**：檢查角色名稱是否為全大寫
3. **缺少場景**：確認文本文件包含完整的劇本內容

## 自訂解析器

如果需要解析其他格式的劇本，可以修改 `pulp-fiction-parser.js` 中的解析邏輯：
- `parseHollywoodScript()` 函數負責解析劇本格式
- 可以調整正則表達式以匹配不同的劇本格式

