import React, { useState } from 'react';
import type { Animation, SpriteFrame } from '../types';

interface AnimationManagerProps {
  animations: Animation[];
  frames: SpriteFrame[];
  selectedFrames: Set<string>;
  onAnimationCreate: (name: string, frameIds: string[]) => void;
  onAnimationUpdate: (animationId: string, name: string, frameIds: string[]) => void;
  onAnimationDelete: (animationId: string) => void;
}

export const AnimationManager: React.FC<AnimationManagerProps> = ({
  animations,
  frames,
  selectedFrames,
  onAnimationCreate,
  onAnimationUpdate,
  onAnimationDelete
}) => {
  const [newAnimationName, setNewAnimationName] = useState('');
  const [editingAnimation, setEditingAnimation] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreateAnimation = () => {
    if (newAnimationName.trim() && selectedFrames.size > 0) {
      onAnimationCreate(newAnimationName.trim(), Array.from(selectedFrames));
      setNewAnimationName('');
    }
  };

  const handleStartEdit = (animation: Animation) => {
    setEditingAnimation(animation.id);
    setEditName(animation.name);
  };

  const handleFinishEdit = (animation: Animation) => {
    if (editName.trim()) {
      onAnimationUpdate(animation.id, editName.trim(), animation.frameIds);
    }
    setEditingAnimation(null);
    setEditName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, animation?: Animation) => {
    if (e.key === 'Enter') {
      if (animation) {
        handleFinishEdit(animation);
      } else {
        handleCreateAnimation();
      }
    } else if (e.key === 'Escape') {
      setEditingAnimation(null);
      setEditName('');
    }
  };

  const getFrameName = (frameId: string) => {
    return frames.find(f => f.id === frameId)?.name || 'Unknown';
  };

  return (
    <div className="animation-manager">
      <h3>Animations ({animations.length})</h3>
      
      <div className="create-animation">
        <div className="input-group">
          <input
            type="text"
            placeholder="Animation name"
            value={newAnimationName}
            onChange={(e) => setNewAnimationName(e.target.value)}
            onKeyDown={(e) => handleKeyPress(e)}
          />
          <button
            onClick={handleCreateAnimation}
            disabled={!newAnimationName.trim() || selectedFrames.size === 0}
            className="create-btn"
          >
            Create from Selected ({selectedFrames.size})
          </button>
        </div>
      </div>

      <div className="animations-list">
        {animations.map(animation => (
          <div key={animation.id} className="animation-item">
            <div className="animation-header">
              {editingAnimation === animation.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleFinishEdit(animation)}
                  onKeyDown={(e) => handleKeyPress(e, animation)}
                  autoFocus
                  className="animation-name-input"
                />
              ) : (
                <h4
                  className="animation-name"
                  onClick={() => handleStartEdit(animation)}
                  title="Click to rename"
                >
                  {animation.name}
                </h4>
              )}
              
              <button
                className="delete-btn"
                onClick={() => onAnimationDelete(animation.id)}
                title="Delete animation"
              >
                🗑️
              </button>
            </div>
            
            <div className="animation-frames">
              <span className="frame-count">{animation.frameIds.length} frames:</span>
              <div className="frame-list">
                {animation.frameIds.map((frameId, index) => (
                  <span key={frameId} className="frame-name">
                    {index > 0 && ' → '}
                    {getFrameName(frameId)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {animations.length === 0 && (
          <div className="no-animations">
            <p>No animations created yet.</p>
            <p>Select frames and create an animation above.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 