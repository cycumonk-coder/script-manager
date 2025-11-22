import { useState, useEffect, useRef } from 'react';
import './CharacterRelationship.css';
import ImagePositionEditor from './ImagePositionEditor';

const CharacterRelationship = ({ characters = [], connections = [], onUpdateCharacters, onUpdateConnections }) => {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [editingConnection, setEditingConnection] = useState(null);
  const [connectionLabel, setConnectionLabel] = useState('');
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCharacter, setNewCharacter] = useState({ name: '', personality: '', image: null, uploading: false, imagePosition: null });
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editCharacterForm, setEditCharacterForm] = useState({ name: '', personality: '', image: null, uploading: false, imagePosition: null });
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageFor, setEditingImageFor] = useState(null); // 'new' or 'edit'
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [draggingAvatar, setDraggingAvatar] = useState(null); // 'new' or 'edit'
  const [avatarDragStart, setAvatarDragStart] = useState({ x: 0, y: 0 });
  const [avatarScale, setAvatarScale] = useState({ new: 1, edit: 1 });
  const avatarPreviewRef = useRef({ new: null, edit: null });
  const [isComposing, setIsComposing] = useState({});
  const [compositionValues, setCompositionValues] = useState({});
  const [isComposingConnection, setIsComposingConnection] = useState(false);
  const [compositionConnectionLabel, setCompositionConnectionLabel] = useState('');
  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  // 調試：監聽 props 變化
  useEffect(() => {
    console.log('🟢 [CharacterRelationship] 收到 props:', {
      charactersCount: characters.length,
      connectionsCount: connections.length,
      hasOnUpdateCharacters: !!onUpdateCharacters,
      hasOnUpdateConnections: !!onUpdateConnections,
      characters: characters,
      connections: connections
    });
  }, [characters, connections, onUpdateCharacters, onUpdateConnections]);

  const deleteConnection = (id) => {
    console.log('🗑️ [CharacterRelationship] 刪除連線:', id);
    const updatedConnections = connections.filter(c => c.id !== id);
    if (onUpdateConnections) {
      console.log('📤 [CharacterRelationship] 調用 onUpdateConnections:', updatedConnections);
      onUpdateConnections(updatedConnections);
    } else {
      console.error('❌ [CharacterRelationship] onUpdateConnections 不存在！');
    }
  };

  // 處理ESC鍵取消連線和Delete鍵刪除選中的連線
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && connectingFrom) {
        setConnectingFrom(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnection) {
        if (window.confirm('確定要刪除此關係嗎？')) {
          deleteConnection(selectedConnection);
          setSelectedConnection(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectingFrom, selectedConnection, connections]);

  // 壓縮圖片
  const compressImage = (file, maxWidth = 200, maxHeight = 200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 計算新尺寸
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          // 創建 canvas 並繪製壓縮後的圖片
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 轉換為 base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    // 檢查檔案大小（原始檔案）
    const maxSize = 10 * 1024 * 1024; // 10MB（因為會上傳到 Google Drive，不需要太嚴格）
    if (file.size > maxSize) {
      alert('圖片檔案太大，請選擇小於 10MB 的圖片');
      return;
    }
    
    try {
      // 檢查是否已連接 Google
      const { isAuthenticated, uploadImageToDrive } = await import('../services/googleSheets');
      
      if (isAuthenticated()) {
        // 如果已連接 Google，上傳到 Google Drive
        console.log('🖼️ [CharacterRelationship] 開始上傳圖片到 Google Drive...');
        
        // 先顯示壓縮後的預覽（本地）
        const compressedImage = await compressImage(file);
        if (isEdit) {
          setEditCharacterForm({ ...editCharacterForm, image: compressedImage, uploading: true });
        } else {
          setNewCharacter({ ...newCharacter, image: compressedImage, uploading: true });
        }
        
        // 後台上傳到 Google Drive
        try {
          const uploadResult = await uploadImageToDrive(file);
          console.log('✅ [CharacterRelationship] 圖片上傳到 Google Drive 成功:', uploadResult.url);
          
          // 更新為 Google Drive URL
          const finalImageUrl = uploadResult.url;
          if (isEdit) {
            setEditCharacterForm(prev => ({ 
              ...prev, 
              image: finalImageUrl, 
              uploading: false,
              imagePosition: prev.imagePosition || { x: 0, y: 0, scale: 1 }
            }));
          } else {
            setNewCharacter(prev => ({ 
              ...prev, 
              image: finalImageUrl, 
              uploading: false,
              imagePosition: prev.imagePosition || { x: 0, y: 0, scale: 1 }
            }));
          }
        } catch (uploadError) {
          console.error('❌ [CharacterRelationship] 上傳到 Google Drive 失敗，使用本地圖片:', uploadError);
          // 如果上傳失敗，繼續使用壓縮後的 base64 圖片
          if (isEdit) {
            setEditCharacterForm(prev => ({ ...prev, uploading: false }));
          } else {
            setNewCharacter(prev => ({ ...prev, uploading: false }));
          }
        }
      } else {
        // 如果未連接 Google，使用本地壓縮（舊方式）
        console.log('🖼️ [CharacterRelationship] 未連接 Google，使用本地壓縮圖片...');
        const compressedImage = await compressImage(file);
        console.log('✅ [CharacterRelationship] 圖片壓縮完成');
        console.log('📊 [CharacterRelationship] 壓縮後大小:', (compressedImage.length / 1024).toFixed(2), 'KB');
        
        // 未連接 Google 時，使用本地壓縮圖片
        if (isEdit) {
          setEditCharacterForm(prev => ({ 
            ...prev, 
            image: compressedImage,
            imagePosition: prev.imagePosition || { x: 0, y: 0, scale: 1 }
          }));
        } else {
          setNewCharacter(prev => ({ 
            ...prev, 
            image: compressedImage,
            imagePosition: prev.imagePosition || { x: 0, y: 0, scale: 1 }
          }));
        }
      }
    } catch (error) {
      console.error('❌ [CharacterRelationship] 圖片處理失敗:', error);
      alert('圖片處理失敗，請重試');
    }
  };

  const saveCharacterEdit = () => {
    if (!editingCharacter || !editCharacterForm.name.trim()) return;
    console.log('✏️ [CharacterRelationship] 編輯角色:', editingCharacter);
    const updatedCharacters = characters.map(c =>
      c.id === editingCharacter
        ? { ...c, name: editCharacterForm.name, personality: editCharacterForm.personality, image: editCharacterForm.image, imagePosition: editCharacterForm.imagePosition }
        : c
    );
    if (onUpdateCharacters) {
      console.log('📤 [CharacterRelationship] 調用 onUpdateCharacters:', updatedCharacters);
      onUpdateCharacters(updatedCharacters);
    } else {
      console.error('❌ [CharacterRelationship] onUpdateCharacters 不存在！');
    }
    setEditingCharacter(null);
    setEditCharacterForm({ name: '', personality: '', image: null, uploading: false });
  };

  const addCharacter = () => {
    if (!newCharacter.name.trim()) return;

    const newChar = {
      id: Date.now(),
      name: newCharacter.name,
      personality: newCharacter.personality,
      image: newCharacter.image,
      imagePosition: newCharacter.imagePosition,
      uploading: false,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };

    console.log('➕ [CharacterRelationship] 新增角色:', newChar);
    console.log('➕ [CharacterRelationship] 現有角色數量:', characters.length);
    
    // 確保 characters 是陣列
    const currentCharacters = Array.isArray(characters) ? characters : [];
    const updatedCharacters = [...currentCharacters, newChar];
    
    console.log('➕ [CharacterRelationship] 更新後角色數量:', updatedCharacters.length);
    console.log('➕ [CharacterRelationship] 更新後角色列表:', updatedCharacters);
    
    if (onUpdateCharacters) {
      console.log('📤 [CharacterRelationship] 調用 onUpdateCharacters，傳遞', updatedCharacters.length, '個角色');
      // 使用 setTimeout 確保狀態更新
      onUpdateCharacters(updatedCharacters);
      
      // 驗證更新是否成功
      setTimeout(() => {
        console.log('✅ [CharacterRelationship] 角色新增完成，請檢查父組件狀態');
      }, 100);
    } else {
      console.error('❌ [CharacterRelationship] onUpdateCharacters 不存在！');
    }
    setNewCharacter({ name: '', personality: '', image: null, uploading: false });
    setShowAddForm(false);
  };

  const deleteCharacter = (id) => {
    console.log('🗑️ [CharacterRelationship] 刪除角色:', id);
    const updatedCharacters = characters.filter(c => c.id !== id);
    const updatedConnections = connections.filter(
      c => c.from !== id && c.to !== id
    );
    if (onUpdateCharacters) {
      console.log('📤 [CharacterRelationship] 調用 onUpdateCharacters:', updatedCharacters);
      onUpdateCharacters(updatedCharacters);
    } else {
      console.error('❌ [CharacterRelationship] onUpdateCharacters 不存在！');
    }
    if (onUpdateConnections) {
      console.log('📤 [CharacterRelationship] 調用 onUpdateConnections:', updatedConnections);
      onUpdateConnections(updatedConnections);
    } else {
      console.error('❌ [CharacterRelationship] onUpdateConnections 不存在！');
    }
  };

  const handleMouseDown = (e, id) => {
    if (e.button !== 0) return; // 只處理左鍵
    if (e.shiftKey) {
      // Shift+點擊：開始連線
      e.stopPropagation();
      setConnectingFrom(id);
      setSelectedConnection(null);
    } else if (!connectingFrom) {
      // 普通點擊：開始拖曳
      e.stopPropagation();
      const character = characters.find(c => c.id === id);
      if (character) {
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          setDraggingId(id);
          setDragOffset({
            x: e.clientX - rect.left - character.x,
            y: e.clientY - rect.top - character.y,
          });
        }
      }
    }
  };

  const handleDoubleClick = (e, id) => {
    e.stopPropagation();
    const character = characters.find(c => c.id === id);
    if (character) {
      setEditingCharacter(id);
      setEditCharacterForm({
        name: character.name,
        personality: character.personality,
        image: character.image,
        imagePosition: character.imagePosition || null,
        uploading: false
      });
    }
  };

  const handleMouseMove = (e) => {
    if (draggingId) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      const updatedCharacters = characters.map(c =>
        c.id === draggingId ? { ...c, x: Math.max(50, Math.min(rect.width - 50, newX)), y: Math.max(50, Math.min(rect.height - 50, newY)) } : c
      );
      
      // 立即更新父組件（會觸發保存）
      if (onUpdateCharacters) {
        onUpdateCharacters(updatedCharacters);
      } else {
        console.error('❌ [CharacterRelationship] 拖曳時 onUpdateCharacters 不存在！');
      }
    } else if (connectingFrom) {
      // Shift拖曳模式下，尋找目標角色
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 高亮顯示接近的角色
      const nearChar = characters.find(char => {
        if (char.id === connectingFrom) return false;
        const dx = x - char.x;
        const dy = y - char.y;
        return Math.sqrt(dx * dx + dy * dy) < 60;
      });
    }
  };

  const handleMouseUp = (e) => {
    if (connectingFrom && draggingId === null) {
      // Shift拖曳模式下，釋放時建立連線
      if (e.button === 0 || !e.button) {
        const svg = svgRef.current;
        if (!svg) {
          setConnectingFrom(null);
          return;
        }
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedChar = characters.find(char => {
          if (char.id === connectingFrom) return false;
          const dx = x - char.x;
          const dy = y - char.y;
          return Math.sqrt(dx * dx + dy * dy) < 60; // 節點半徑約60
        });

        if (clickedChar && clickedChar.id !== connectingFrom) {
          // 檢查是否已存在連線
          const existing = connections.find(
            c => (c.from === connectingFrom && c.to === clickedChar.id) ||
                 (c.from === clickedChar.id && c.to === connectingFrom)
          );

          if (!existing) {
            const newConnection = {
              id: Date.now(),
              from: connectingFrom,
              to: clickedChar.id,
              label: '',
            };
            const updatedConnections = [...connections, newConnection];
            console.log('🔗 [CharacterRelationship] 建立新連線:', newConnection);
            if (onUpdateConnections) {
              console.log('📤 [CharacterRelationship] 調用 onUpdateConnections:', updatedConnections);
              onUpdateConnections(updatedConnections);
            } else {
              console.error('❌ [CharacterRelationship] onUpdateConnections 不存在！');
            }
            setEditingConnection(newConnection.id);
            setConnectionLabel('');
          }
        }
      }
      setConnectingFrom(null);
    } else if (draggingId) {
      setDraggingId(null);
    }
  };

  const updateConnectionLabel = (connectionId, label) => {
    console.log('🏷️ [CharacterRelationship] 更新連線標籤:', connectionId, label);
    const updatedConnections = connections.map(c =>
      c.id === connectionId ? { ...c, label } : c
    );
    if (onUpdateConnections) {
      console.log('📤 [CharacterRelationship] 調用 onUpdateConnections:', updatedConnections);
      onUpdateConnections(updatedConnections);
    } else {
      console.error('❌ [CharacterRelationship] onUpdateConnections 不存在！');
    }
    setEditingConnection(null);
    setConnectionLabel('');
    setIsComposingConnection(false);
    setCompositionConnectionLabel('');
  };

  const handleConnectionLabelChange = (e) => {
    const value = e.target.value;
    if (isComposingConnection) {
      setCompositionConnectionLabel(value);
      return;
    }
    setConnectionLabel(value);
  };

  const handleConnectionLabelCompositionStart = () => {
    setIsComposingConnection(true);
  };

  const handleConnectionLabelCompositionEnd = (e) => {
    setIsComposingConnection(false);
    const value = e.target.value;
    setConnectionLabel(value);
    setCompositionConnectionLabel('');
  };

  const getCharacterCenter = (char) => {
    return { x: char.x, y: char.y };
  };

  // 處理頭像預覽區域的拖曳
  const handleAvatarMouseDown = (e, type) => {
    if (e.button !== 0) return; // 只處理左鍵
    e.preventDefault();
    e.stopPropagation();
    
    const rect = avatarPreviewRef.current[type]?.getBoundingClientRect();
    if (!rect) return;
    
    const currentPosition = type === 'new' 
      ? newCharacter.imagePosition || { x: 0, y: 0, scale: 1 }
      : editCharacterForm.imagePosition || { x: 0, y: 0, scale: 1 };
    
    setDraggingAvatar(type);
    setAvatarDragStart({
      x: e.clientX - rect.left - rect.width / 2 - (currentPosition.x || 0) * 0.5,
      y: e.clientY - rect.top - rect.height / 2 - (currentPosition.y || 0) * 0.5
    });
  };

  const handleAvatarMouseMove = (e) => {
    if (!draggingAvatar) return;
    
    const rect = avatarPreviewRef.current[draggingAvatar]?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newX = (e.clientX - rect.left - centerX - avatarDragStart.x) * 2;
    const newY = (e.clientY - rect.top - centerY - avatarDragStart.y) * 2;
    
    // 限制拖動範圍
    const maxOffset = 100;
    const position = {
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
      scale: draggingAvatar === 'new' 
        ? (newCharacter.imagePosition?.scale || avatarScale.new || 1)
        : (editCharacterForm.imagePosition?.scale || avatarScale.edit || 1)
    };
    
    if (draggingAvatar === 'new') {
      setNewCharacter(prev => ({ ...prev, imagePosition: position }));
    } else {
      setEditCharacterForm(prev => ({ ...prev, imagePosition: position }));
    }
  };

  const handleAvatarMouseUp = () => {
    setDraggingAvatar(null);
  };

  const handleAvatarWheel = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const currentScale = type === 'new'
      ? (newCharacter.imagePosition?.scale || avatarScale.new || 1)
      : (editCharacterForm.imagePosition?.scale || avatarScale.edit || 1);
    
    const newScale = Math.max(0.5, Math.min(3, currentScale + delta));
    
    if (type === 'new') {
      setAvatarScale(prev => ({ ...prev, new: newScale }));
      setNewCharacter(prev => ({
        ...prev,
        imagePosition: {
          x: prev.imagePosition?.x || 0,
          y: prev.imagePosition?.y || 0,
          scale: newScale
        }
      }));
    } else {
      setAvatarScale(prev => ({ ...prev, edit: newScale }));
      setEditCharacterForm(prev => ({
        ...prev,
        imagePosition: {
          x: prev.imagePosition?.x || 0,
          y: prev.imagePosition?.y || 0,
          scale: newScale
        }
      }));
    }
  };

  useEffect(() => {
    if (draggingAvatar) {
      document.addEventListener('mousemove', handleAvatarMouseMove);
      document.addEventListener('mouseup', handleAvatarMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleAvatarMouseMove);
        document.removeEventListener('mouseup', handleAvatarMouseUp);
      };
    }
  }, [draggingAvatar, avatarDragStart]);

  return (
    <div className="character-relationship">
      <div className="character-relationship-header">
        <h3 className="section-title">人物關係圖</h3>
        <button
          className="add-character-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '取消' : '+ 新增角色'}
        </button>
      </div>

      {showAddForm && (
        <div className="rpg-character-form">
          <div className="rpg-form-header">
            <h3>創建新角色</h3>
            <button className="rpg-form-close" onClick={() => setShowAddForm(false)}>×</button>
          </div>
          
          <div className="rpg-form-body">
            <div className="rpg-avatar-section">
              <div className="rpg-avatar-container">
                {newCharacter.image ? (
                  <>
                    <div 
                      ref={(el) => avatarPreviewRef.current.new = el}
                      className="rpg-avatar-preview"
                      onMouseDown={(e) => handleAvatarMouseDown(e, 'new')}
                      onWheel={(e) => handleAvatarWheel(e, 'new')}
                      style={{ cursor: draggingAvatar === 'new' ? 'grabbing' : 'grab' }}
                    >
                      <img 
                        src={newCharacter.image} 
                        alt="角色頭像"
                        draggable={false}
                        style={{
                          transform: newCharacter.imagePosition 
                            ? `translate(calc(-50% + ${(newCharacter.imagePosition.x || 0) * 0.5}px), calc(-50% + ${(newCharacter.imagePosition.y || 0) * 0.5}px)) scale(${newCharacter.imagePosition.scale || 1})`
                            : 'translate(-50%, -50%)',
                          transformOrigin: 'center center',
                          pointerEvents: 'none'
                        }}
                      />
                      {newCharacter.uploading && (
                        <div className="rpg-avatar-uploading">
                          <div className="rpg-uploading-spinner"></div>
                          <span>上傳中...</span>
                        </div>
                      )}
                    </div>
                    <label className="rpg-avatar-change-btn" title="更換頭像">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>更換圖片</span>
                    </label>
                  </>
                ) : (
                  <label className="rpg-avatar-placeholder">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <div className="rpg-avatar-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="rpg-avatar-text">上傳頭像</span>
                  </label>
                )}
              </div>
            </div>

            <div className="rpg-form-fields">
              <div className="rpg-field-group">
                <label className="rpg-field-label">
                  <span className="rpg-label-icon">姓名</span>
                </label>
                <input
                  type="text"
                  className="rpg-field-input"
                  value={isComposing['new-name'] ? (compositionValues['new-name'] ?? newCharacter.name) : newCharacter.name}
                  onChange={(e) => {
                    if (isComposing['new-name']) {
                      setCompositionValues(prev => ({ ...prev, 'new-name': e.target.value }));
                      return;
                    }
                    setNewCharacter({ ...newCharacter, name: e.target.value });
                  }}
                  onCompositionStart={() => setIsComposing(prev => ({ ...prev, 'new-name': true }))}
                  onCompositionEnd={(e) => {
                    setIsComposing(prev => ({ ...prev, 'new-name': false }));
                    setNewCharacter({ ...newCharacter, name: e.target.value });
                    setCompositionValues(prev => {
                      const next = { ...prev };
                      delete next['new-name'];
                      return next;
                    });
                  }}
                  placeholder="輸入角色姓名"
                />
              </div>

              <div className="rpg-field-group">
                <label className="rpg-field-label">
                  <span className="rpg-label-icon">個性特質</span>
                </label>
                <textarea
                  className="rpg-field-textarea"
                  value={isComposing['new-personality'] ? (compositionValues['new-personality'] ?? newCharacter.personality) : newCharacter.personality}
                  onChange={(e) => {
                    if (isComposing['new-personality']) {
                      setCompositionValues(prev => ({ ...prev, 'new-personality': e.target.value }));
                      return;
                    }
                    setNewCharacter({ ...newCharacter, personality: e.target.value });
                  }}
                  onCompositionStart={() => setIsComposing(prev => ({ ...prev, 'new-personality': true }))}
                  onCompositionEnd={(e) => {
                    setIsComposing(prev => ({ ...prev, 'new-personality': false }));
                    setNewCharacter({ ...newCharacter, personality: e.target.value });
                    setCompositionValues(prev => {
                      const next = { ...prev };
                      delete next['new-personality'];
                      return next;
                    });
                  }}
                  placeholder="描述角色的個性、特質、背景..."
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div className="rpg-form-actions">
            <button className="rpg-cancel-btn" onClick={() => {
              setShowAddForm(false);
              setNewCharacter({ name: '', personality: '', image: null, uploading: false });
            }}>
              取消
            </button>
            <button className="rpg-create-btn" onClick={addCharacter} disabled={!newCharacter.name.trim()}>
              創建角色
            </button>
          </div>
        </div>
      )}

      {editingCharacter && (
        <div className="rpg-character-form rpg-edit-form">
          <div className="rpg-form-header">
            <h3>編輯角色</h3>
            <button className="rpg-form-close" onClick={() => {
              setEditingCharacter(null);
              setEditCharacterForm({ name: '', personality: '', image: null, uploading: false });
            }}>×</button>
          </div>
          
          <div className="rpg-form-body">
            <div className="rpg-avatar-section">
              <div className="rpg-avatar-container">
                {editCharacterForm.image ? (
                  <>
                    <div 
                      ref={(el) => avatarPreviewRef.current.edit = el}
                      className="rpg-avatar-preview"
                      onMouseDown={(e) => handleAvatarMouseDown(e, 'edit')}
                      onWheel={(e) => handleAvatarWheel(e, 'edit')}
                      style={{ cursor: draggingAvatar === 'edit' ? 'grabbing' : 'grab' }}
                    >
                      <img 
                        src={editCharacterForm.image} 
                        alt="角色頭像"
                        draggable={false}
                        style={{
                          transform: editCharacterForm.imagePosition 
                            ? `translate(calc(-50% + ${(editCharacterForm.imagePosition.x || 0) * 0.5}px), calc(-50% + ${(editCharacterForm.imagePosition.y || 0) * 0.5}px)) scale(${editCharacterForm.imagePosition.scale || 1})`
                            : 'translate(-50%, -50%)',
                          transformOrigin: 'center center',
                          pointerEvents: 'none'
                        }}
                      />
                      {editCharacterForm.uploading && (
                        <div className="rpg-avatar-uploading">
                          <div className="rpg-uploading-spinner"></div>
                          <span>上傳中...</span>
                        </div>
                      )}
                    </div>
                    <label className="rpg-avatar-change-btn" title="更換頭像">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        style={{ display: 'none' }}
                      />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>更換圖片</span>
                    </label>
                  </>
                ) : (
                  <label className="rpg-avatar-placeholder">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      style={{ display: 'none' }}
                    />
                    <div className="rpg-avatar-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="rpg-avatar-text">上傳頭像</span>
                  </label>
                )}
              </div>
            </div>

            <div className="rpg-form-fields">
              <div className="rpg-field-group">
                <label className="rpg-field-label">
                  <span className="rpg-label-icon">姓名</span>
                </label>
                <input
                  type="text"
                  className="rpg-field-input"
                  value={isComposing['edit-name'] ? (compositionValues['edit-name'] ?? editCharacterForm.name) : editCharacterForm.name}
                  onChange={(e) => {
                    if (isComposing['edit-name']) {
                      setCompositionValues(prev => ({ ...prev, 'edit-name': e.target.value }));
                      return;
                    }
                    setEditCharacterForm({ ...editCharacterForm, name: e.target.value });
                  }}
                  onCompositionStart={() => setIsComposing(prev => ({ ...prev, 'edit-name': true }))}
                  onCompositionEnd={(e) => {
                    setIsComposing(prev => ({ ...prev, 'edit-name': false }));
                    setEditCharacterForm({ ...editCharacterForm, name: e.target.value });
                    setCompositionValues(prev => {
                      const next = { ...prev };
                      delete next['edit-name'];
                      return next;
                    });
                  }}
                  placeholder="輸入角色姓名"
                />
              </div>

              <div className="rpg-field-group">
                <label className="rpg-field-label">
                  <span className="rpg-label-icon">個性特質</span>
                </label>
                <textarea
                  className="rpg-field-textarea"
                  value={isComposing['edit-personality'] ? (compositionValues['edit-personality'] ?? editCharacterForm.personality) : editCharacterForm.personality}
                  onChange={(e) => {
                    if (isComposing['edit-personality']) {
                      setCompositionValues(prev => ({ ...prev, 'edit-personality': e.target.value }));
                      return;
                    }
                    setEditCharacterForm({ ...editCharacterForm, personality: e.target.value });
                  }}
                  onCompositionStart={() => setIsComposing(prev => ({ ...prev, 'edit-personality': true }))}
                  onCompositionEnd={(e) => {
                    setIsComposing(prev => ({ ...prev, 'edit-personality': false }));
                    setEditCharacterForm({ ...editCharacterForm, personality: e.target.value });
                    setCompositionValues(prev => {
                      const next = { ...prev };
                      delete next['edit-personality'];
                      return next;
                    });
                  }}
                  placeholder="描述角色的個性、特質、背景..."
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div className="rpg-form-actions">
            <button className="rpg-cancel-btn" onClick={() => {
              setEditingCharacter(null);
              setEditCharacterForm({ name: '', personality: '', image: null, uploading: false });
            }}>
              取消
            </button>
            <button className="rpg-create-btn" onClick={saveCharacterEdit} disabled={!editCharacterForm.name.trim()}>
              儲存變更
            </button>
          </div>
        </div>
      )}

      <div className="character-canvas-container">
        <svg
          ref={svgRef}
          className="character-canvas"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            // 點擊空白處取消選中連線
            if (e.target === e.currentTarget || e.target.tagName === 'svg') {
              setSelectedConnection(null);
            }
          }}
        >
          {/* 繪製連線 */}
          {connections.map(conn => {
            const fromChar = characters.find(c => c.id === conn.from);
            const toChar = characters.find(c => c.id === conn.to);
            if (!fromChar || !toChar) return null;

            const from = getCharacterCenter(fromChar);
            const to = getCharacterCenter(toChar);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <g key={conn.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={selectedConnection === conn.id ? "#dc2626" : "#6366f1"}
                  strokeWidth={selectedConnection === conn.id ? "3" : "2"}
                  markerEnd="url(#arrowhead)"
                  className="connection-line"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnection(conn.id);
                    setEditingConnection(null);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {editingConnection === conn.id ? (
                  <foreignObject x={midX - 75} y={midY - 12} width="150" height="24">
                    <input
                      type="text"
                      value={isComposingConnection ? (compositionConnectionLabel || connectionLabel) : connectionLabel}
                      onChange={handleConnectionLabelChange}
                      onCompositionStart={handleConnectionLabelCompositionStart}
                      onCompositionEnd={handleConnectionLabelCompositionEnd}
                      onBlur={() => updateConnectionLabel(conn.id, connectionLabel)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isComposingConnection) {
                          updateConnectionLabel(conn.id, connectionLabel);
                        }
                      }}
                      placeholder="關係名稱"
                      className="connection-label-input"
                      autoFocus
                    />
                  </foreignObject>
                ) : (
                  <g 
                    className="connection-label-group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingConnection(conn.id);
                      setConnectionLabel(conn.label || '');
                      setSelectedConnection(null);
                    }}
                  >
                    <rect
                      x={midX - 40}
                      y={midY - 12}
                      width={conn.label ? Math.max(80, conn.label.length * 8) : 80}
                      height="24"
                      fill="white"
                      stroke={selectedConnection === conn.id ? "#dc2626" : "#6366f1"}
                      strokeWidth={selectedConnection === conn.id ? "2" : "1"}
                      rx="4"
                      className="connection-label-box"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#111827"
                      className="connection-label-text"
                    >
                      {conn.label || '點擊編輯'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 箭頭標記和裁剪路徑 */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
            </marker>
            <clipPath id="circleClip">
              <circle cx="0" cy="0" r="45" />
            </clipPath>
          </defs>

          {/* 繪製角色節點 */}
          {characters.map(char => (
            <g
              key={char.id}
              transform={`translate(${char.x}, ${char.y})`}
              onMouseDown={(e) => handleMouseDown(e, char.id)}
              className={`character-node ${draggingId === char.id ? 'dragging' : ''} ${connectingFrom === char.id ? 'connecting' : ''}`}
            >
              <g 
                clipPath="url(#circleClip)" 
                transform="translate(0, 0)"
                onDoubleClick={(e) => handleDoubleClick(e, char.id)}
                style={{ cursor: 'pointer' }}
              >
                {char.image ? (
                  <g transform={`translate(${char.imagePosition ? (char.imagePosition.x || 0) * 0.5 : 0}, ${char.imagePosition ? (char.imagePosition.y || 0) * 0.5 : 0})`}>
                    <image
                      href={char.image}
                      x={char.imagePosition ? -45 * (char.imagePosition.scale || 1) : -45}
                      y={char.imagePosition ? -45 * (char.imagePosition.scale || 1) : -45}
                      width={char.imagePosition ? (90 * (char.imagePosition.scale || 1)) : 90}
                      height={char.imagePosition ? (90 * (char.imagePosition.scale || 1)) : 90}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: 'auto' }}
                    />
                  </g>
                ) : (
                  <circle
                    cx="0"
                    cy="0"
                    r="45"
                    fill="#f3f4f6"
                    style={{ pointerEvents: 'auto' }}
                  />
                )}
              </g>
              <circle
                cx="0"
                cy="0"
                r="50"
                fill="none"
                stroke={connectingFrom === char.id ? "#6366f1" : "#e5e7eb"}
                strokeWidth={connectingFrom === char.id ? "3" : "2"}
                style={{ cursor: connectingFrom ? 'crosshair' : 'move', pointerEvents: 'none' }}
              />
              <text
                x="0"
                y="65"
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                fill="#111827"
                style={{ pointerEvents: 'none' }}
              >
                {char.name}
              </text>
              {char.personality && (
                <text
                  x="0"
                  y="82"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                  style={{ pointerEvents: 'none' }}
                  className="personality-text"
                >
                  {char.personality.length > 15
                    ? char.personality.substring(0, 15) + '...'
                    : char.personality}
                </text>
              )}
              <circle
                cx="35"
                cy="-35"
                r="12"
                fill="#dc2626"
                className="delete-character-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`確定要刪除「${char.name}」嗎？`)) {
                    deleteCharacter(char.id);
                  }
                }}
              >
                <title>刪除角色</title>
              </circle>
              <text
                x="35"
                y="-35"
                textAnchor="middle"
                fontSize="14"
                fill="white"
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                ×
              </text>
            </g>
          ))}
        </svg>

        {connectingFrom && (
          <div className="connection-hint">
            點擊另一個角色建立連線（或按 ESC 取消）
          </div>
        )}
      </div>

      {selectedConnection && (
        <div className="connection-selected-hint">
          已選中連線，按 Delete 鍵可刪除此關係
        </div>
      )}

      {/* 圖片位置編輯器 */}
      {showImageEditor && tempImageSrc && (
        <ImagePositionEditor
          imageSrc={tempImageSrc}
          initialPosition={
            editingImageFor === 'new' 
              ? newCharacter.imagePosition 
              : editingImageFor === 'edit' 
                ? editCharacterForm.imagePosition 
                : null
          }
          onSave={(position) => {
            console.log('✅ 圖片位置已調整:', position);
            if (editingImageFor === 'new') {
              setNewCharacter(prev => ({ ...prev, imagePosition: position }));
            } else if (editingImageFor === 'edit') {
              setEditCharacterForm(prev => ({ ...prev, imagePosition: position }));
            }
            setShowImageEditor(false);
            setTempImageSrc(null);
            setEditingImageFor(null);
          }}
          onCancel={() => {
            setShowImageEditor(false);
            setTempImageSrc(null);
            setEditingImageFor(null);
          }}
        />
      )}

      <div className="character-relationship-help">
        <p>使用說明：</p>
        <ul>
          <li>拖曳角色節點可以移動位置</li>
          <li>雙擊角色圖片可以編輯角色的姓名、個性和照片</li>
          <li>按住 Shift + 拖曳角色可以建立連線，拖曳到目標角色後釋放</li>
          <li>點擊連線標籤可以編輯關係名稱</li>
          <li>點擊連線後按 Delete 鍵可以刪除關係</li>
        </ul>
      </div>
    </div>
  );
};

export default CharacterRelationship;

