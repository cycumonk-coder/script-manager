import { useState, useRef, useEffect } from 'react';
import './ImagePositionEditor.css';

const ImagePositionEditor = ({ imageSrc, onSave, onCancel, initialPosition = null }) => {
  const [position, setPosition] = useState(initialPosition ? { x: initialPosition.x || 0, y: initialPosition.y || 0 } : { x: 0, y: 0 });
  const [scale, setScale] = useState(initialPosition ? (initialPosition.scale || 1) : 1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // 圖片載入完成後，計算初始縮放和位置
  useEffect(() => {
    if (imageSrc && imageRef.current) {
      const img = imageRef.current;
      
      // 如果已有初始位置，使用它
      if (initialPosition) {
        setPosition({ x: initialPosition.x || 0, y: initialPosition.y || 0 });
        setScale(initialPosition.scale || 1);
      } else {
        // 否則計算初始縮放
        img.onload = () => {
          // 計算初始縮放，確保圖片能覆蓋整個圓形區域
          const containerSize = 200; // 圓形容器大小
          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;
          
          // 計算需要的縮放比例（確保圖片能覆蓋圓形）
          const scaleX = containerSize / imgWidth;
          const scaleY = containerSize / imgHeight;
          const initialScale = Math.max(scaleX, scaleY) * 1.2; // 稍微放大一點
          
          setScale(initialScale);
          setPosition({ x: 0, y: 0 });
        };
      }
    }
  }, [imageSrc, initialPosition]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // 只處理左鍵
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setDragStart({
        x: e.clientX - rect.left - centerX - position.x,
        y: e.clientY - rect.top - centerY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newX = e.clientX - rect.left - centerX - dragStart.x;
    const newY = e.clientY - rect.top - centerY - dragStart.y;
    
    // 限制拖動範圍（根據縮放比例調整）
    const maxOffset = 150;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, scale + delta));
    setScale(newScale);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleMouseMove(e);
      const handleUp = () => handleMouseUp();
      
      document.addEventListener('mousemove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleSave = () => {
    onSave({
      x: position.x,
      y: position.y,
      scale: scale
    });
  };

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  };

  return (
    <div className="image-position-editor-overlay">
      <div className="image-position-editor">
        <div className="image-editor-header">
          <h3>調整頭像位置</h3>
          <button className="editor-close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="image-editor-body">
          <div className="image-editor-preview-container">
            <div 
              ref={containerRef}
              className="image-editor-preview"
              onWheel={handleWheel}
            >
              <div 
                className="image-editor-mask"
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="調整中"
                  draggable={false}
                  onMouseDown={handleMouseDown}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                    transformOrigin: 'center center',
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                    pointerEvents: 'auto'
                  }}
                />
              </div>
            </div>
            <div className="image-editor-instructions">
              <p>💡 拖動圖片調整位置，滾動滑鼠滾輪調整大小</p>
            </div>
          </div>

          <div className="image-editor-controls">
            <div className="control-group">
              <label>縮放</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="scale-slider"
              />
              <span className="scale-value">{(scale * 100).toFixed(0)}%</span>
            </div>
            
            <div className="control-actions">
              <button className="reset-btn" onClick={handleReset}>
                重置
              </button>
              <button className="cancel-btn" onClick={onCancel}>
                取消
              </button>
              <button className="save-btn" onClick={handleSave}>
                確認
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePositionEditor;

