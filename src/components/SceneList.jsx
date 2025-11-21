import { useState, useEffect } from 'react';
import { BEAT_SHEET_STRUCTURE } from './ScriptOutline';
import './SceneList.css';

const SceneList = ({ scenes, onSelectScene, onUpdateScene, onAddScene, onDeleteScene }) => {
  const [localScenes, setLocalScenes] = useState(scenes || []);

  useEffect(() => {
    if (scenes) {
      setLocalScenes(scenes);
    }
  }, [scenes]);

  const handleAddScene = () => {
    const newScene = {
      id: Date.now(),
      number: localScenes.length + 1,
      title: `場次 ${localScenes.length + 1}`,
      content: '',
      completed: false,
    };
    const updated = [...localScenes, newScene];
    setLocalScenes(updated);
    if (onAddScene) {
      onAddScene(newScene);
    }
    if (onSelectScene) {
      onSelectScene(newScene);
    }
  };

  const handleToggleComplete = (sceneId) => {
    const updated = localScenes.map((scene) =>
      scene.id === sceneId ? { ...scene, completed: !scene.completed } : scene
    );
    setLocalScenes(updated);
    const scene = updated.find((s) => s.id === sceneId);
    if (onUpdateScene && scene) {
      onUpdateScene(scene);
    }
  };

  const handleDelete = (sceneId, e) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除此場次嗎？')) {
      const updated = localScenes.filter((scene) => scene.id !== sceneId);
      setLocalScenes(updated);
      if (onDeleteScene) {
        onDeleteScene(sceneId);
      }
    }
  };

  const completedCount = localScenes.filter((s) => s.completed).length;

  return (
    <div className="scene-list">
      <div className="scene-list-header">
        <h2 className="scene-list-title">場次列表</h2>
        <div className="scene-list-stats">
          <span className="stat-item">
            <span className="stat-text">已完成: {completedCount} / {localScenes.length}</span>
          </span>
        </div>
        <button className="add-scene-btn" onClick={handleAddScene} aria-label="新增場次">
          新增場次
        </button>
      </div>

      <div className="scenes-container">
        {localScenes.length === 0 ? (
          <div className="empty-state">
            <p>還沒有場次，點擊「新增場次」開始寫作</p>
          </div>
        ) : (
          localScenes.map((scene) => (
            <div
              key={scene.id}
              className={`scene-item ${scene.completed ? 'completed' : ''}`}
              onClick={() => onSelectScene && onSelectScene(scene)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectScene && onSelectScene(scene);
                }
              }}
            >
              <div className="scene-item-header">
                <div className="scene-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={scene.completed || false}
                      onChange={() => handleToggleComplete(scene.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="large-checkbox"
                    />
                    <span className="checkmark"></span>
                    <span className="scene-number">
                      場次 {scene.number}
                    </span>
                  </label>
                </div>
                <button
                  className="delete-scene-btn"
                  onClick={(e) => handleDelete(scene.id, e)}
                  aria-label="刪除場次"
                >
                  ×
                </button>
              </div>
              <div className="scene-title">{scene.title || `場次 ${scene.number}`}</div>
              {scene.beatId && (
                <div className="scene-beat-badge">
                  {BEAT_SHEET_STRUCTURE.find(b => b.id === scene.beatId)?.label || scene.beatId}
                </div>
              )}
              {scene.content && (
                <div className="scene-preview">
                  {scene.content.substring(0, 100)}
                  {scene.content.length > 100 ? '...' : ''}
                </div>
              )}
              {scene.completed && (
                <div className="completed-badge">已完成</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SceneList;

