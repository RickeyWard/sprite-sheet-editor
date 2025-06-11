import React, { useState, useEffect } from 'react';
import type { SpriteFrame } from '../types';
import type { SliceConfig } from '../utils/spriteStripSlicer';
import { suggestSliceConfig, sliceSpriteStrip } from '../utils/spriteStripSlicer';

interface SpriteStripSlicerProps {
  image: HTMLImageElement;
  baseName: string;
  onSlice: (frames: SpriteFrame[], createAnimation?: { name: string }) => void;
  onCancel: () => void;
  onKeepOriginal: () => void;
}

export const SpriteStripSlicer: React.FC<SpriteStripSlicerProps> = ({
  image,
  baseName,
  onSlice,
  onCancel,
  onKeepOriginal
}) => {
  const [config, setConfig] = useState<SliceConfig>(() => suggestSliceConfig(image));
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [createAnimation, setCreateAnimation] = useState(true);
  const [animationName, setAnimationName] = useState(baseName);
  const [editableBaseName, setEditableBaseName] = useState(baseName);

  useEffect(() => {
    // Create preview canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxSize = 600; // Increased from 400 for better visibility
    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    
    // Draw the image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Draw grid overlay
    ctx.strokeStyle = '#61dafb';
    ctx.lineWidth = 1;
    
    const frameWidth = config.frameWidth * scale;
    const frameHeight = config.frameHeight * scale;
    const spacing = config.spacing * scale;
    const margin = config.margin * scale;
    
    // Ensure minimum visibility - if frames are too small, make them at least 2px
    const minFrameSize = 2;
    const visibleFrameWidth = Math.max(frameWidth, minFrameSize);
    const visibleFrameHeight = Math.max(frameHeight, minFrameSize);
    
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.columns; col++) {
        const x = margin + col * (frameWidth + spacing);
        const y = margin + row * (frameHeight + spacing);
        
        // Always draw the grid lines, even if very small
        if (x < canvas.width && y < canvas.height) {
          // Draw the frame rectangle
          const rectWidth = Math.min(visibleFrameWidth, canvas.width - x);
          const rectHeight = Math.min(visibleFrameHeight, canvas.height - y);
          
          if (rectWidth > 0 && rectHeight > 0) {
            ctx.strokeRect(x, y, rectWidth, rectHeight);
            
            // Draw frame number only if there's enough space
            if (rectWidth > 20 && rectHeight > 20) {
              ctx.fillStyle = '#61dafb';
              ctx.font = `${Math.max(8, Math.min(12, rectHeight / 3))}px monospace`;
              ctx.fillText(
                `${row * config.columns + col + 1}`,
                x + 2,
                y + Math.max(10, rectHeight / 3)
              );
            }
          }
        }
      }
    }
    
    setPreviewCanvas(canvas);
  }, [image, config]);

  const handleSlice = async () => {
    try {
      const frames = await sliceSpriteStrip(image, config, editableBaseName);
      const animationOption = createAnimation && animationName.trim() 
        ? { name: animationName.trim() } 
        : undefined;
      onSlice(frames, animationOption);
    } catch (error) {
      console.error('Error slicing sprite strip:', error);
      alert('Error slicing sprite strip. Please check your configuration.');
    }
  };

  const updateConfig = (updates: Partial<SliceConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Auto-calculate frame dimensions if columns/rows change
      if (updates.columns !== undefined || updates.rows !== undefined) {
        newConfig.frameWidth = Math.floor(
          (image.width - 2 * newConfig.margin - (newConfig.columns - 1) * newConfig.spacing) / newConfig.columns
        );
        newConfig.frameHeight = Math.floor(
          (image.height - 2 * newConfig.margin - (newConfig.rows - 1) * newConfig.spacing) / newConfig.rows
        );
      }
      
      return newConfig;
    });
  };

  const totalFrames = config.columns * config.rows;

  return (
    <div className="sprite-strip-slicer-overlay">
      <div className="sprite-strip-slicer">
        <h3>Slice Sprite Strip</h3>
        <p>
          This image might be a sprite strip. Configure how to slice it into individual frames.
        </p>
        
        <div className="slicer-content">
          <div className="base-name-section">
            <h4>Frame Naming</h4>
            <div className="config-item">
              <label>
                Base Name:
                <input
                  type="text"
                  value={editableBaseName}
                  onChange={(e) => setEditableBaseName(e.target.value)}
                  placeholder="Enter base name for frames"
                />
              </label>
            </div>
          </div>
          
          <div className="grid-content">
            <div className="preview-section">
              <h4>Preview</h4>
              <div className="preview-container">
                {previewCanvas && (
                  <canvas
                    ref={(ref) => {
                      if (ref && previewCanvas) {
                        const ctx = ref.getContext('2d');
                        if (ctx) {
                          ref.width = previewCanvas.width;
                          ref.height = previewCanvas.height;
                          ctx.drawImage(previewCanvas, 0, 0);
                        }
                      }
                    }}
                    className="slice-preview"
                  />
                )}
              </div>
            </div>
            
            <div className="config-section">
              <h4>Configuration</h4>
              
              <div className="config-grid">
                <div className="config-item">
                  <label>
                    Columns:
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={config.columns}
                      onChange={(e) => updateConfig({ columns: parseInt(e.target.value) || 1 })}
                    />
                  </label>
                </div>
                
                <div className="config-item">
                  <label>
                    Rows:
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={config.rows}
                      onChange={(e) => updateConfig({ rows: parseInt(e.target.value) || 1 })}
                    />
                  </label>
                </div>
                
                <div className="config-item">
                  <label>
                    Frame Width:
                    <input
                      type="number"
                      min="1"
                      max={image.width}
                      value={config.frameWidth}
                      onChange={(e) => updateConfig({ frameWidth: parseInt(e.target.value) || 1 })}
                    />
                  </label>
                </div>
                
                <div className="config-item">
                  <label>
                    Frame Height:
                    <input
                      type="number"
                      min="1"
                      max={image.height}
                      value={config.frameHeight}
                      onChange={(e) => updateConfig({ frameHeight: parseInt(e.target.value) || 1 })}
                    />
                  </label>
                </div>
                
                <div className="config-item">
                  <label>
                    Spacing:
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={config.spacing}
                      onChange={(e) => updateConfig({ spacing: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                </div>
                
                <div className="config-item">
                  <label>
                    Margin:
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={config.margin}
                      onChange={(e) => updateConfig({ margin: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </div>
              
              <div className="config-info">
                <p><strong>Total frames:</strong> {totalFrames}</p>
                <p><strong>Image size:</strong> {image.width} × {image.height}</p>
                <p><strong>Frame size:</strong> {config.frameWidth} × {config.frameHeight}</p>
                <p><strong>Frame names:</strong> {editableBaseName}_01, {editableBaseName}_02, {editableBaseName}_03...</p>
              </div>
              
              <div className="animation-options">
                <h4>Animation</h4>
                <div className="animation-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={createAnimation}
                      onChange={(e) => setCreateAnimation(e.target.checked)}
                    />
                    Create animation from frames
                  </label>
                </div>
                
                {createAnimation && (
                  <div className="animation-name-input">
                    <label>
                      Animation name:
                      <input
                        type="text"
                        value={animationName}
                        onChange={(e) => setAnimationName(e.target.value)}
                        placeholder="Enter animation name"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="slicer-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="keep-original-btn" onClick={onKeepOriginal}>
            Keep as Single Image
          </button>
          <button 
            className="slice-btn" 
            onClick={handleSlice}
            disabled={totalFrames === 0 || !editableBaseName.trim() || (createAnimation && !animationName.trim())}
          >
            {createAnimation 
              ? `Slice & Create "${animationName}" Animation` 
              : `Slice into ${totalFrames} Frames`
            }
          </button>
        </div>
      </div>
    </div>
  );
}; 