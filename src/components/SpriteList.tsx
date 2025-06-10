import React, { useState } from 'react';
import type { SpriteFrame } from '../types';

interface SpriteListProps {
  frames: SpriteFrame[];
  selectedFrames: Set<string>;
  onFrameSelect: (frameId: string, selected: boolean) => void;
  onFrameRemove: (frameId: string) => void;
  onFrameRename: (frameId: string, newName: string) => void;
}

export const SpriteList: React.FC<SpriteListProps> = ({
  frames,
  selectedFrames,
  onFrameSelect,
  onFrameRemove,
  onFrameRename
}) => {
  const [editingFrame, setEditingFrame] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (frame: SpriteFrame) => {
    setEditingFrame(frame.id);
    setEditName(frame.name);
  };

  const handleFinishEdit = () => {
    if (editingFrame && editName.trim()) {
      onFrameRename(editingFrame, editName.trim());
    }
    setEditingFrame(null);
    setEditName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingFrame(null);
      setEditName('');
    }
  };

  return (
    <div className="sprite-list">
      <h3>Sprite Frames ({frames.length})</h3>
      <div className="frames-grid">
        {frames.map(frame => (
          <div key={frame.id} className="frame-item">
            <div className="frame-header">
              <input
                type="checkbox"
                checked={selectedFrames.has(frame.id)}
                onChange={(e) => onFrameSelect(frame.id, e.target.checked)}
              />
              <button
                className="remove-btn"
                onClick={() => onFrameRemove(frame.id)}
                title="Remove frame"
              >
                ✕
              </button>
            </div>
            
            <div className="frame-preview">
              <canvas
                width={Math.min(frame.width, 64)}
                height={Math.min(frame.height, 64)}
                ref={(canvas) => {
                  if (canvas) {
                    const ctx = canvas.getContext('2d')!;
                    const scale = Math.min(64 / frame.width, 64 / frame.height);
                    const w = frame.width * scale;
                    const h = frame.height * scale;
                    canvas.width = w;
                    canvas.height = h;
                    
                    // Draw checkerboard background
                    const checkerSize = Math.max(4, 8 * scale);
                    const lightColor = '#ffffff';
                    const darkColor = '#cccccc';
                    const numCols = Math.ceil(w / checkerSize);
                    const numRows = Math.ceil(h / checkerSize);
                    
                    for (let row = 0; row < numRows; row++) {
                      for (let col = 0; col < numCols; col++) {
                        const isEven = (row + col) % 2 === 0;
                        ctx.fillStyle = isEven ? lightColor : darkColor;
                        ctx.fillRect(col * checkerSize, row * checkerSize, checkerSize, checkerSize);
                      }
                    }
                    
                    // Draw the frame on top
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(frame.image, 0, 0, w, h);
                  }
                }}
              />
            </div>
            
            <div className="frame-info">
              {editingFrame === frame.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  className="frame-name-input"
                />
              ) : (
                <div
                  className="frame-name"
                  onClick={() => handleStartEdit(frame)}
                  title="Click to rename"
                >
                  {frame.name}
                </div>
              )}
              <div className="frame-dimensions">
                {frame.width} × {frame.height}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 