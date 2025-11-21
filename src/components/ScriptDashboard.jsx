import { useState, useEffect, useRef } from 'react';
import './ScriptDashboard.css';

const ScriptDashboard = ({ scriptData, onUpdateScriptData }) => {
  const [deadline, setDeadline] = useState(scriptData?.deadline || '');
  const [totalScenes, setTotalScenes] = useState(scriptData?.totalScenes || 0);
  const [completedScenes, setCompletedScenes] = useState(scriptData?.completedScenes || 0);

  const isInitialMount = useRef(true);
  
  useEffect(() => {
    // 只在初始化時同步 scriptData，避免覆蓋用戶正在輸入的內容
    if (isInitialMount.current) {
      if (scriptData) {
        setDeadline(scriptData.deadline || '');
        setTotalScenes(scriptData.totalScenes || 0);
        setCompletedScenes(scriptData.completedScenes || 0);
      }
      isInitialMount.current = false;
    } else {
      // 如果不是首次載入，同步 scriptData 的變化（特別是總場次數的自動更新）
      if (scriptData) {
        if (deadline !== scriptData.deadline && scriptData.deadline) {
          setDeadline(scriptData.deadline);
        }
        // 總場次數應該自動同步（因為新增場次時會自動更新）
        if (totalScenes !== scriptData.totalScenes) {
          setTotalScenes(scriptData.totalScenes || 0);
        }
        if (completedScenes !== scriptData.completedScenes) {
          setCompletedScenes(scriptData.completedScenes || 0);
        }
      }
    }
  }, [scriptData]);

  const handleDeadlineChange = (e) => {
    const newDeadline = e.target.value;
    setDeadline(newDeadline);
    if (onUpdateScriptData) {
      onUpdateScriptData({ ...scriptData, deadline: newDeadline });
    }
  };

  const handleTotalScenesChange = (e) => {
    const newTotal = parseInt(e.target.value) || 0;
    setTotalScenes(newTotal);
    if (onUpdateScriptData) {
      onUpdateScriptData({ ...scriptData, totalScenes: newTotal });
    }
  };

  const calculateRemainingDays = () => {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const calculateDailyScenes = () => {
    const remainingDays = calculateRemainingDays();
    if (!remainingDays || remainingDays === 0 || totalScenes === 0) return 0;
    const remainingScenes = totalScenes - completedScenes;
    if (remainingScenes <= 0) return 0;
    return Math.ceil(remainingScenes / remainingDays);
  };

  const remainingDays = calculateRemainingDays();
  const dailyScenes = calculateDailyScenes();
  const remainingScenes = totalScenes - completedScenes;
  const progressPercentage = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  const getUrgencyLevel = () => {
    if (!remainingDays || remainingDays === null) return 'neutral';
    if (remainingDays <= 7) return 'critical';
    if (remainingDays <= 14) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = () => {
    const level = getUrgencyLevel();
    if (level === 'critical') return '#dc2626';
    if (level === 'warning') return '#d97706';
    if (level === 'normal') return '#059669';
    return '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <div className="script-dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">寫作進度</h2>
        {deadline && (
          <div className="dashboard-meta">
            <span className="meta-label">目標日期</span>
            <span className="meta-value">{formatDate(deadline)}</span>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card metric-card">
          <div className="card-header">
            <span className="card-label">總場次數</span>
          </div>
          <div className="card-body">
            <input
              type="number"
              value={totalScenes}
              onChange={handleTotalScenesChange}
              min="0"
              className="metric-input"
              aria-label="場次總數"
            />
          </div>
        </div>

        <div className="dashboard-card metric-card success">
          <div className="card-header">
            <span className="card-label">已完成</span>
            <span className="card-trend positive">{completedScenes > 0 ? '+' : ''}</span>
          </div>
          <div className="card-body">
            <div className="metric-value primary">{completedScenes}</div>
            {totalScenes > 0 && (
              <div className="metric-sub">
                佔 {Math.round((completedScenes / totalScenes) * 100)}%
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card metric-card">
          <div className="card-header">
            <span className="card-label">剩餘場次</span>
          </div>
          <div className="card-body">
            <div className="metric-value">{remainingScenes}</div>
            {totalScenes > 0 && (
              <div className="metric-sub">
                還有 {Math.round((remainingScenes / totalScenes) * 100)}% 待完成
              </div>
            )}
          </div>
        </div>

        <div className={`dashboard-card metric-card ${urgencyLevel}`}>
          <div className="card-header">
            <span className="card-label">剩餘時間</span>
            {urgencyLevel === 'critical' && <span className="card-badge urgent">緊急</span>}
            {urgencyLevel === 'warning' && <span className="card-badge warning">注意</span>}
          </div>
          <div className="card-body">
            <div className="metric-value" style={{ color: getUrgencyColor() }}>
              {remainingDays !== null ? `${remainingDays} 天` : '—'}
            </div>
            {remainingDays !== null && remainingDays <= 14 && (
              <div className="metric-sub urgent-text">
                {remainingDays <= 7 ? '需加速進度' : '時間有限'}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card metric-card">
          <div className="card-header">
            <span className="card-label">每日配額</span>
          </div>
          <div className="card-body">
            <div className="metric-value" style={{ color: '#0284c7' }}>
              {dailyScenes > 0 ? `${dailyScenes} 場` : '—'}
            </div>
            {dailyScenes > 0 && (
              <div className="metric-sub">
                {remainingDays !== null && remainingDays > 0 
                  ? `未來 ${remainingDays} 天平均` 
                  : '建議配額'}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card date-card">
          <div className="card-header">
            <span className="card-label">設定截止日期</span>
          </div>
          <div className="card-body">
            <input
              type="date"
              value={deadline}
              onChange={handleDeadlineChange}
              className="date-input"
              aria-label="完結日期"
            />
            {deadline && (
              <div className="date-display">{formatDate(deadline)}</div>
            )}
          </div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <div className="progress-info">
            <span className="progress-label">整體進度</span>
            <span className="progress-value">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="progress-stats">
            <span className="stat-item">
              <span className="stat-value">{completedScenes}</span>
              <span className="stat-label">已完成</span>
            </span>
            <span className="stat-divider">/</span>
            <span className="stat-item">
              <span className="stat-value">{totalScenes}</span>
              <span className="stat-label">總數</span>
            </span>
          </div>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progressPercentage === 100 && (
            <div className="completion-status">
              <span className="status-indicator"></span>
              <span className="status-text">專案已完成</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptDashboard;

