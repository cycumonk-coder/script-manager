import { useState } from 'react';
import './FactCheck.css';

const FactCheck = ({ scriptData, outline, scenes, characters, onUpdateScene, onUpdateOutline }) => {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [expandedIssues, setExpandedIssues] = useState({});

  const performFactCheck = async () => {
    setChecking(true);
    setError('');
    setResults(null);

    try {
      const apiKey = localStorage.getItem('openai_api_key');
      
      if (!apiKey) {
        setError('請先設置 OpenAI API Key 才能使用事實檢核功能。');
        setChecking(false);
        return;
      }

      // 準備檢查資料
      const checkData = {
        title: scriptData?.title || '',
        coreIdea: scriptData?.coreIdea || '',
        outline: outline || {},
        scenes: scenes || [],
        characters: characters || [],
      };

      // 構建提示詞
      const prompt = buildFactCheckPrompt(checkData);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '你是一位專業的劇本顧問和事實檢核員。你的工作是檢查劇本內容的一致性、角色個性的符合度，以及劇情是否符合現實邏輯。請提供詳細、專業、建設性的反饋。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '事實檢核失敗');
      }

      const data = await response.json();
      const analysisResult = data.choices[0].message.content;

      // 解析結果
      const parsedResults = parseAnalysisResult(analysisResult);
      setResults(parsedResults);

    } catch (error) {
      console.error('事實檢核錯誤：', error);
      setError(error.message || '事實檢核失敗，請檢查API設置和網路連接');
    } finally {
      setChecking(false);
    }
  };

  const buildFactCheckPrompt = (data) => {
    let prompt = '請對以下劇本進行事實檢核，檢查以下幾個方面：\n\n';
    prompt += '1. 角色個性一致性：角色在不同場次中的行為是否符合其設定的個性\n';
    prompt += '2. 劇情邏輯性：劇情發展是否符合現實邏輯，是否存在矛盾或不合理之處\n';
    prompt += '3. 故事一致性：場次之間是否有連貫性，是否符合故事大綱\n';
    prompt += '4. 中心思想符合度：劇情是否與設定的中心思想一致\n\n';
    prompt += '重要：請使用以下格式回覆每個問題：\n';
    prompt += '【問題】場次 X：問題描述\n';
    prompt += '【建議】具體的修改建議，提供可替換的內容或修改方向\n\n';

    if (data.title) {
      prompt += `片名：${data.title}\n\n`;
    }

    if (data.coreIdea) {
      prompt += `中心思想：${data.coreIdea}\n\n`;
    }

    // 角色資訊
    if (data.characters && data.characters.length > 0) {
      prompt += '角色設定：\n';
      data.characters.forEach((char, index) => {
        prompt += `${index + 1}. ${char.name}：${char.personality || '未設定個性'}\n`;
      });
      prompt += '\n';
    }

    // 大綱資訊
    if (data.outline && Object.keys(data.outline).length > 0) {
      prompt += '故事大綱：\n';
      Object.entries(data.outline).forEach(([key, value]) => {
        if (value && value.trim()) {
          prompt += `- ${key}：${value.substring(0, 200)}${value.length > 200 ? '...' : ''}\n`;
        }
      });
      prompt += '\n';
    }

    // 場次內容
    if (data.scenes && data.scenes.length > 0) {
      prompt += '場次內容：\n\n';
      data.scenes.forEach((scene, index) => {
        prompt += `場次 ${scene.number || index + 1}：${scene.title || '未命名'}\n`;
        if (scene.content) {
          prompt += `內容：${scene.content.substring(0, 500)}${scene.content.length > 500 ? '...' : ''}\n`;
        }
        prompt += '\n';
      });
    }

    prompt += '\n請提供詳細的檢核結果，包括：\n';
    prompt += '- 發現的問題（如有）\n';
    prompt += '- 角色個性不一致的地方\n';
    prompt += '- 劇情邏輯問題\n';
    prompt += '- 改進建議\n';
    prompt += '請以結構化的方式呈現結果，使用標題和列表。';

    return prompt;
  };

  const parseAnalysisResult = (result) => {
    // 解析結果，提取結構化問題資訊
    const issues = [];
    const suggestions = [];
    const text = result;

    // 使用正則表達式匹配【問題】和【建議】格式
    const issuePattern = /【問題】[^【]*/gi;
    const suggestionPattern = /【建議】[^【]*/gi;
    
    const issueMatches = text.match(issuePattern) || [];
    const suggestionMatches = text.match(suggestionPattern) || [];

    issueMatches.forEach((match, index) => {
      const content = match.replace(/【問題】/i, '').trim();
      
      // 提取場次編號
      const sceneMatch = content.match(/場次\s*(\d+)/i);
      let relatedScene = null;
      let sceneNum = null;
      
      if (sceneMatch) {
        sceneNum = parseInt(sceneMatch[1]);
        relatedScene = scenes?.find(s => s.number === sceneNum);
      }
      
      // 提取角色名稱
      const charMatch = content.match(/角色[：:\s]*([^，,。.\n]+)/i);
      let relatedCharacter = null;
      
      if (charMatch) {
        const charName = charMatch[1].trim();
        relatedCharacter = characters?.find(c => c.name === charName);
      }
      
      // 提取問題描述（移除場次和角色資訊）
      let description = content
        .replace(/場次\s*\d+[：:\s]*/i, '')
        .replace(/角色[：:\s]*[^，,。.\n]+[，,]?\s*/i, '')
        .trim();
      
      // 如果有對應的建議
      let suggestion = '';
      if (suggestionMatches[index]) {
        suggestion = suggestionMatches[index].replace(/【建議】/i, '').trim();
      }
      
      if (description) {
        issues.push({
          id: index + 1,
          title: sceneNum ? `場次 ${sceneNum} 的問題` : `問題 ${index + 1}`,
          description: description,
          suggestion: suggestion,
          relatedScene: relatedScene,
          relatedCharacter: relatedCharacter,
        });
      }
    });

    // 提取其他未配對的建議
    suggestionMatches.slice(issueMatches.length).forEach((match) => {
      const suggestion = match.replace(/【建議】/i, '').trim();
      if (suggestion && !issues.some(i => i.suggestion === suggestion)) {
        suggestions.push(suggestion);
      }
    });

    // 如果沒有找到格式化的問題，嘗試簡單解析
    if (issues.length === 0) {
      const lines = text.split('\n').filter(line => line.trim());
      let currentIssue = null;
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        
        // 檢測場次或問題標記
        if (trimmed.match(/場次\s*\d+/i) || trimmed.match(/問題\s*\d+/i) || trimmed.match(/^[#*]+\s*問題/i)) {
          if (currentIssue && currentIssue.description) {
            issues.push(currentIssue);
          }
          
          const sceneMatch = trimmed.match(/場次\s*(\d+)/i);
          const sceneNum = sceneMatch ? parseInt(sceneMatch[1]) : null;
          
          currentIssue = {
            id: issues.length + 1,
            title: sceneNum ? `場次 ${sceneNum}` : `問題 ${issues.length + 1}`,
            description: trimmed.replace(/場次\s*\d+[：:\s]*|問題\s*\d+[：:\s]*|^[#*•\s]+/i, '').trim(),
            suggestion: '',
            relatedScene: sceneNum ? scenes?.find(s => s.number === sceneNum) : null,
            relatedCharacter: null,
          };
        }
        // 檢測建議
        else if (trimmed.match(/建議|應該|可以/i) && currentIssue) {
          currentIssue.suggestion = (currentIssue.suggestion + ' ' + trimmed.replace(/(建議|應該|可以)[：:\s]*/i, '')).trim();
        }
        // 其他內容
        else if (trimmed.length > 10 && currentIssue) {
          if (trimmed.includes('建議') || trimmed.includes('應該') || trimmed.includes('可以')) {
            currentIssue.suggestion = (currentIssue.suggestion + ' ' + trimmed).trim();
          } else {
            currentIssue.description = (currentIssue.description + ' ' + trimmed).trim();
          }
        }
      });
      
      if (currentIssue && currentIssue.description) {
        issues.push(currentIssue);
      }
    }

    return {
      raw: result,
      issues: issues.length > 0 ? issues : null,
      suggestions: suggestions.length > 0 ? suggestions : null,
      hasIssues: issues.length > 0,
    };
  };

  const toggleIssueExpand = (issueId) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };

  const applySuggestion = (issue) => {
    if (!issue.suggestion || !issue.relatedScene) {
      alert('此建議無法自動應用，請手動查看建議內容並進行修改。');
      return;
    }
    
    // 確認應用建議
    if (!window.confirm(`確定要將此建議應用到場次 ${issue.relatedScene.number} 嗎？`)) {
      return;
    }
    
    // 根據建議修改場次內容
    // 如果建議是完整的內容替換，使用建議內容；否則在現有內容基礎上修改
    let updatedContent = issue.relatedScene.content || '';
    
    // 如果建議看起來是完整的修改方案，直接使用
    if (issue.suggestion.length > 50 && !issue.suggestion.includes('建議') && !issue.suggestion.includes('應該')) {
      updatedContent = issue.suggestion;
    } else {
      // 否則，將建議添加到內容開頭作為註釋
      updatedContent = `> ${issue.suggestion}\n\n${updatedContent}`;
    }
    
    if (onUpdateScene && issue.relatedScene) {
      onUpdateScene({
        ...issue.relatedScene,
        content: updatedContent,
      });
      
      // 從結果中移除已接受的問題
      setResults(prev => ({
        ...prev,
        issues: prev.issues.filter(i => i.id !== issue.id),
        hasIssues: prev.issues.filter(i => i.id !== issue.id).length > 0,
      }));
    }
    
    // 收起展開的問題
    setExpandedIssues(prev => ({
      ...prev,
      [issue.id]: false
    }));
  };

  const dismissIssue = (issueId) => {
    setResults(prev => ({
      ...prev,
      issues: prev.issues.filter(i => i.id !== issueId),
      hasIssues: prev.issues.filter(i => i.id !== issueId).length > 0,
    }));
  };

  return (
    <div className="fact-check">
      <div className="fact-check-header">
        <div className="fact-check-title-section">
          <h3 className="section-title">事實檢核</h3>
          <p className="section-subtitle">檢查角色個性一致性與劇情邏輯性</p>
        </div>
        <button
          className="fact-check-btn"
          onClick={performFactCheck}
          disabled={checking || (scenes && scenes.length === 0)}
          title={scenes && scenes.length === 0 ? '請先添加場次內容' : '執行事實檢核'}
        >
          {checking ? '檢核中...' : '🔍 執行檢核'}
        </button>
      </div>

      {error && (
        <div className="fact-check-error">
          <p>{error}</p>
        </div>
      )}

      {checking && (
        <div className="fact-check-loading">
          <div className="checking-spinner"></div>
          <p>正在分析劇本內容，請稍候...</p>
        </div>
      )}

      {results && (
        <div className="fact-check-results">
          <div className="results-header">
            <h4>檢核結果</h4>
            <button
              className="close-results-btn"
              onClick={() => setResults(null)}
            >
              ×
            </button>
          </div>

          {results.hasIssues ? (
            <div className="results-content">
              {results.issues && (
                <div className="results-section issues-section">
                  <h5 className="section-title">⚠️ 發現的問題</h5>
                  <div className="issues-container">
                    {results.issues.map((issue) => (
                      <div key={issue.id} className="issue-item">
                        <div className="issue-header">
                          <div className="issue-info">
                            <span className="issue-badge">問題 {issue.id}</span>
                            {issue.relatedScene && (
                              <span className="issue-source">
                                場次 {issue.relatedScene.number}
                              </span>
                            )}
                            {issue.relatedCharacter && (
                              <span className="issue-source">
                                角色：{issue.relatedCharacter.name}
                              </span>
                            )}
                          </div>
                          <button
                            className="expand-btn"
                            onClick={() => toggleIssueExpand(issue.id)}
                          >
                            {expandedIssues[issue.id] ? '▼' : '▶'}
                          </button>
                        </div>
                        <div className="issue-description">
                          {issue.description || issue.title}
                        </div>
                        {expandedIssues[issue.id] && (
                          <div className="issue-details">
                            {issue.suggestion ? (
                              <div className="suggestion-box">
                                <div className="suggestion-label">💡 建議修改：</div>
                                <div className="suggestion-content">{issue.suggestion}</div>
                                {issue.relatedScene && onUpdateScene ? (
                                  <div className="suggestion-actions">
                                    <button
                                      className="accept-btn"
                                      onClick={() => applySuggestion(issue)}
                                    >
                                      ✓ 接受建議
                                    </button>
                                    <button
                                      className="dismiss-btn"
                                      onClick={() => dismissIssue(issue.id)}
                                    >
                                      ✕ 維持原樣
                                    </button>
                                  </div>
                                ) : (
                                  <div className="suggestion-note">
                                    <p>此建議需要手動應用，請根據建議內容進行修改。</p>
                                    <button
                                      className="dismiss-btn"
                                      onClick={() => dismissIssue(issue.id)}
                                    >
                                      ✕ 已閱讀
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="suggestion-box">
                                <div className="suggestion-label">ℹ️ 說明：</div>
                                <div className="suggestion-content">
                                  此問題需要您根據問題描述自行調整內容。
                                </div>
                                <div className="suggestion-actions">
                                  <button
                                    className="dismiss-btn"
                                    onClick={() => dismissIssue(issue.id)}
                                  >
                                    ✕ 已閱讀
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.suggestions && (
                <div className="results-section suggestions-section">
                  <h5 className="section-title">💡 改進建議</h5>
                  <ul className="suggestions-list">
                    {results.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="results-content success">
              <div className="success-message">
                <span className="success-icon">✓</span>
                <p>檢核完成！未發現明顯問題。</p>
                {results.suggestions && (
                  <div className="results-section suggestions-section">
                    <h5 className="section-title">💡 改進建議</h5>
                    <ul className="suggestions-list">
                      {results.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="results-raw">
            <details>
              <summary>查看完整分析報告</summary>
              <pre className="raw-content">{results.raw}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactCheck;

