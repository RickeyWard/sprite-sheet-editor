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
  const [expandedAnimations, setExpandedAnimations] = useState<Set<string>>(new Set());
  const [draggedFrame, setDraggedFrame] = useState<{ animationId: string; frameIndex: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const getFrame = (frameId: string) => {
    return frames.find(f => f.id === frameId);
  };

  const getFrameThumbnail = (frame: SpriteFrame): string => {
    // Create a canvas to convert the image to a data URL
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set thumbnail size
    const size = 32;
    canvas.width = size;
    canvas.height = size;

    // Calculate scaling to fit the image in the thumbnail while maintaining aspect ratio
    const scale = Math.min(size / frame.width, size / frame.height);
    const scaledWidth = frame.width * scale;
    const scaledHeight = frame.height * scale;
    const x = (size - scaledWidth) / 2;
    const y = (size - scaledHeight) / 2;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Draw the image scaled and centered
    ctx.drawImage(frame.image, x, y, scaledWidth, scaledHeight);
    
    return canvas.toDataURL();
  };

  const handleMoveFrame = (animation: Animation, frameIndex: number, direction: 'up' | 'down') => {
    const newFrameIds = [...animation.frameIds];
    const targetIndex = direction === 'up' ? frameIndex - 1 : frameIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < newFrameIds.length) {
      [newFrameIds[frameIndex], newFrameIds[targetIndex]] = [newFrameIds[targetIndex], newFrameIds[frameIndex]];
      onAnimationUpdate(animation.id, animation.name, newFrameIds);
    }
  };

  const handleRemoveFrame = (animation: Animation, frameIndex: number) => {
    const newFrameIds = animation.frameIds.filter((_, index) => index !== frameIndex);
    if (newFrameIds.length > 0) {
      onAnimationUpdate(animation.id, animation.name, newFrameIds);
    } else {
      // If no frames left, delete the animation
      onAnimationDelete(animation.id);
    }
  };

  const toggleExpanded = (animationId: string) => {
    setExpandedAnimations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(animationId)) {
        newSet.delete(animationId);
      } else {
        newSet.add(animationId);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, animationId: string, frameIndex: number) => {
    setDraggedFrame({ animationId, frameIndex });
    e.dataTransfer.effectAllowed = 'move';
    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(targetIndex);
  };

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(targetIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the container, not just moving between child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetAnimationId: string, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedFrame || draggedFrame.animationId !== targetAnimationId) {
      setDraggedFrame(null);
      setDragOverIndex(null);
      return;
    }

    const animation = animations.find(a => a.id === targetAnimationId);
    if (!animation) return;

    const sourceIndex = draggedFrame.frameIndex;
    if (sourceIndex === targetIndex) {
      setDraggedFrame(null);
      setDragOverIndex(null);
      return;
    }

    // Create new frame order
    const newFrameIds = [...animation.frameIds];
    const draggedFrameId = newFrameIds[sourceIndex];
    
    // Remove from source position
    newFrameIds.splice(sourceIndex, 1);
    
    // Insert at target position (adjust if target was after source)
    const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    newFrameIds.splice(adjustedTargetIndex, 0, draggedFrameId);

    onAnimationUpdate(animation.id, animation.name, newFrameIds);
    setDraggedFrame(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedFrame(null);
    setDragOverIndex(null);
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
        {animations.map(animation => {
          const isExpanded = expandedAnimations.has(animation.id);
          
          return (
            <div key={animation.id} className="animation-item">
              <div className="animation-header">
                <button
                  className="expand-btn"
                  onClick={() => toggleExpanded(animation.id)}
                  title={isExpanded ? "Collapse" : "Expand to reorder frames"}
                >
                  {isExpanded ? '📂' : '📁'}
                </button>
                
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
              
              {!isExpanded ? (
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
              ) : (
                <div className="animation-frames-detailed">
                  <div className="frame-reorder-list">
                    {animation.frameIds.map((frameId, index) => {
                      const frame = getFrame(frameId);
                      return (
                                                <div 
                          key={frameId} 
                          className={`frame-reorder-item ${
                            draggedFrame?.animationId === animation.id && draggedFrame?.frameIndex === index ? 'dragging' : ''
                          } ${
                            dragOverIndex === index ? 'drag-over' : ''
                          }`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, animation.id, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnter={(e) => handleDragEnter(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, animation.id, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="frame-info">
                            <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                            <span className="frame-index">{index + 1}.</span>
                            {frame && (
                              <img
                                src={getFrameThumbnail(frame)}
                                alt={frame.name}
                                className="frame-thumbnail"
                              />
                            )}
                            <span className="frame-name">{getFrameName(frameId)}</span>
                          </div>
                          <div className="frame-controls">
                            <button
                              className="move-btn"
                              onClick={() => handleMoveFrame(animation, index, 'up')}
                              disabled={index === 0}
                              title="Move up"
                            >
                              ⬆️
                            </button>
                            <button
                              className="move-btn"
                              onClick={() => handleMoveFrame(animation, index, 'down')}
                              disabled={index === animation.frameIds.length - 1}
                              title="Move down"
                            >
                              ⬇️
                            </button>
                            <button
                              className="remove-frame-btn"
                              onClick={() => handleRemoveFrame(animation, index)}
                              title="Remove from animation"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
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