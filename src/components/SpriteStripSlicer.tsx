import React, { useState, useEffect } from 'react';
import type { SpriteFrame } from '../types';
import type { SliceConfig } from '../utils/spriteStripSlicer';
import { suggestSliceConfig, sliceSpriteStrip } from '../utils/spriteStripSlicer';
import { isFrameEmptyOrSolid } from '../utils/frameAnalyzer';

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
  const [paddingPreviewCanvas, setPaddingPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [createAnimation, setCreateAnimation] = useState(true);
  const [animationName, setAnimationName] = useState(baseName);
  const [editableBaseName, setEditableBaseName] = useState(baseName);
  const [removeEmptyOrSolid, setRemoveEmptyOrSolid] = useState(true);
  const [estimatedFrameCount, setEstimatedFrameCount] = useState<number | null>(null);
  const [calculationSkipped, setCalculationSkipped] = useState(false);

  useEffect(() => {
    // Create preview canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxSize = 600; // Increased from 400 for better visibility
    let scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    
    // Apply additional zoom if frames are very small
    const minFrameDisplaySize = 32; // Minimum comfortable viewing size
    const frameDisplayScale = Math.min(minFrameDisplaySize / config.frameWidth, minFrameDisplaySize / config.frameHeight);
    if (frameDisplayScale > 1) {
      scale = Math.min(scale * frameDisplayScale, maxSize / Math.min(image.width, image.height));
    }
    
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    
    // Draw the image with pixelated scaling
    ctx.imageSmoothingEnabled = false;
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
          // Draw the source frame rectangle (original content area)
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

  // Create padding preview for a single frame
  useEffect(() => {
    if (config.paddingX === 0 && config.paddingY === 0) {
      setPaddingPreviewCanvas(null);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate final frame size including padding
    const finalFrameWidth = config.frameWidth + config.paddingX * 2;
    const finalFrameHeight = config.frameHeight + config.paddingY * 2;
    
    // Scale to fit in a reasonable preview size with zoom for small frames
    const maxPreviewSize = 160;
    const minDisplaySize = 80; // Minimum comfortable viewing size for padding preview
    let scale = Math.max(
      minDisplaySize / Math.max(finalFrameWidth, finalFrameHeight), // Ensure minimum size
      Math.min(maxPreviewSize / finalFrameWidth, maxPreviewSize / finalFrameHeight) // Don't exceed max size
    );
    
    canvas.width = finalFrameWidth * scale;
    canvas.height = finalFrameHeight * scale;
    
    // Draw checkerboard background
    const checkerSize = Math.max(4, 8 * scale);
    const lightColor = '#ffffff';
    const darkColor = '#cccccc';
    const numCols = Math.ceil(canvas.width / checkerSize);
    const numRows = Math.ceil(canvas.height / checkerSize);
    
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const isEven = (row + col) % 2 === 0;
        ctx.fillStyle = isEven ? lightColor : darkColor;
        ctx.fillRect(col * checkerSize, row * checkerSize, checkerSize, checkerSize);
      }
    }
    
    // Extract the first frame from the source image
    const sourceX = config.margin;
    const sourceY = config.margin;
    
    // Check if source coordinates are valid
    if (sourceX + config.frameWidth <= image.width && 
        sourceY + config.frameHeight <= image.height) {
      
      // Draw the original frame content centered in the padded canvas
      const destX = config.paddingX * scale;
      const destY = config.paddingY * scale;
      const destWidth = config.frameWidth * scale;
      const destHeight = config.frameHeight * scale;
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        image,
        sourceX, sourceY, config.frameWidth, config.frameHeight,
        destX, destY, destWidth, destHeight
      );
      
      // Draw a border around the original content area to show the padding
      ctx.strokeStyle = '#61dafb';
      ctx.lineWidth = 1;
      ctx.strokeRect(destX, destY, destWidth, destHeight);
      
      // Draw a border around the full padded frame
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      ctx.setLineDash([]);
    }
    
    setPaddingPreviewCanvas(canvas);
  }, [image, config]);

  // Calculate estimated frame count after filtering
  useEffect(() => {
    if (!removeEmptyOrSolid) {
      setEstimatedFrameCount(null);
      return;
    }

    // Immediately show loading state during debounce
    setEstimatedFrameCount(null);
    setCalculationSkipped(false);

    const calculateEstimatedFrames = (forceCalculation = false) => {
      try {
        const totalFrames = config.columns * config.rows;
        
        // Skip calculation for very large grids to avoid performance issues
        if (totalFrames > 400 && !forceCalculation) {
          setEstimatedFrameCount(null);
          setCalculationSkipped(true);
          return;
        }
        
        setCalculationSkipped(false);
        
        let validFrameCount = 0;
        
        for (let row = 0; row < config.rows; row++) {
          for (let col = 0; col < config.columns; col++) {
            const sourceX = config.margin + col * (config.frameWidth + config.spacing);
            const sourceY = config.margin + row * (config.frameHeight + config.spacing);
            
            // Skip if source coordinates are out of bounds
            if (sourceX + config.frameWidth > image.width || 
                sourceY + config.frameHeight > image.height) {
              continue;
            }
            
            // Create a temporary canvas to extract the frame
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) continue;
            
            tempCanvas.width = config.frameWidth;
            tempCanvas.height = config.frameHeight;
            tempCtx.drawImage(
              image,
              sourceX, sourceY, config.frameWidth, config.frameHeight,
              0, 0, config.frameWidth, config.frameHeight
            );
            
            // Analyze the canvas directly instead of creating a SpriteFrame
            const imageData = tempCtx.getImageData(0, 0, config.frameWidth, config.frameHeight);
            const data = imageData.data;
            
            // Check if frame is completely transparent
            let isTransparent = true;
            for (let i = 3; i < data.length; i += 4) { // Every 4th value is alpha
              if (data[i] > 0) { // Found a non-transparent pixel
                isTransparent = false;
                break;
              }
            }
            
            // If transparent, skip this frame
            if (isTransparent) {
              continue;
            }
            
            // Check if frame is solid color
            let isSolidColor = true;
            let firstR = -1, firstG = -1, firstB = -1, firstA = -1;
            
            // Find the first non-transparent pixel for reference
            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] > 0) {
                firstR = data[i];
                firstG = data[i + 1];
                firstB = data[i + 2];
                firstA = data[i + 3];
                break;
              }
            }
            
            // Check if all non-transparent pixels have the same color
            for (let i = 0; i < data.length; i += 4) {
              const alpha = data[i + 3];
              
              // Skip transparent pixels
              if (alpha === 0) continue;
              
              // Check if this pixel matches the reference color
              if (data[i] !== firstR || data[i + 1] !== firstG || 
                  data[i + 2] !== firstB || data[i + 3] !== firstA) {
                isSolidColor = false;
                break;
              }
            }
            
            // Count frame as valid if it's not transparent and not solid color
            if (!isSolidColor) {
              validFrameCount++;
            }
          }
        }
        
        setEstimatedFrameCount(validFrameCount);
      } catch (error) {
        console.error('Error calculating estimated frame count:', error);
        setEstimatedFrameCount(null);
      }
    };

    // Debounce the calculation to avoid excessive computation
    const timeoutId = setTimeout(calculateEstimatedFrames, 800);
    return () => clearTimeout(timeoutId);
  }, [image, config, removeEmptyOrSolid]);

  const forceEstimateCalculation = () => {
    setEstimatedFrameCount(null);
    setCalculationSkipped(false);
    
    // const totalFrames = config.columns * config.rows;
    
    try {
      let validFrameCount = 0;
      
      for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.columns; col++) {
          const sourceX = config.margin + col * (config.frameWidth + config.spacing);
          const sourceY = config.margin + row * (config.frameHeight + config.spacing);
          
          // Skip if source coordinates are out of bounds
          if (sourceX + config.frameWidth > image.width || 
              sourceY + config.frameHeight > image.height) {
            continue;
          }
          
          // Create a temporary canvas to extract the frame
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) continue;
          
          tempCanvas.width = config.frameWidth;
          tempCanvas.height = config.frameHeight;
          tempCtx.drawImage(
            image,
            sourceX, sourceY, config.frameWidth, config.frameHeight,
            0, 0, config.frameWidth, config.frameHeight
          );
          
          // Analyze the canvas directly instead of creating a SpriteFrame
          const imageData = tempCtx.getImageData(0, 0, config.frameWidth, config.frameHeight);
          const data = imageData.data;
          
          // Check if frame is completely transparent
          let isTransparent = true;
          for (let i = 3; i < data.length; i += 4) { // Every 4th value is alpha
            if (data[i] > 0) { // Found a non-transparent pixel
              isTransparent = false;
              break;
            }
          }
          
          // If transparent, skip this frame
          if (isTransparent) {
            continue;
          }
          
          // Check if frame is solid color
          let isSolidColor = true;
          let firstR = -1, firstG = -1, firstB = -1, firstA = -1;
          
          // Find the first non-transparent pixel for reference
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
              firstR = data[i];
              firstG = data[i + 1];
              firstB = data[i + 2];
              firstA = data[i + 3];
              break;
            }
          }
          
          // Check if all non-transparent pixels have the same color
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            
            // Skip transparent pixels
            if (alpha === 0) continue;
            
            // Check if this pixel matches the reference color
            if (data[i] !== firstR || data[i + 1] !== firstG || 
                data[i + 2] !== firstB || data[i + 3] !== firstA) {
              isSolidColor = false;
              break;
            }
          }
          
          // Count frame as valid if it's not transparent and not solid color
          if (!isSolidColor) {
            validFrameCount++;
          }
        }
      }
      
      setEstimatedFrameCount(validFrameCount);
    } catch (error) {
      console.error('Error calculating estimated frame count:', error);
      setEstimatedFrameCount(null);
      setCalculationSkipped(false);
    }
  };

  const handleSlice = async () => {
    try {
      let frames = await sliceSpriteStrip(image, config, editableBaseName);
      
      // Filter out empty or solid frames if option is enabled
      if (removeEmptyOrSolid) {
        const originalCount = frames.length;
        frames = frames.filter(frame => !isFrameEmptyOrSolid(frame));
        const removedCount = originalCount - frames.length;
        
        if (removedCount > 0) {
          console.log(`Filtered out ${removedCount} empty or solid frames`);
        }
      }
      
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
        <div className="slicer-header">
          <h3>Slice Sprite Strip</h3>
          <p>
            This image might be a sprite strip. Configure how to slice it into individual frames.
          </p>
        </div>
        
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
              
              {paddingPreviewCanvas && (
                <div className="padding-preview-section">
                  <h4>Single Frame with Padding</h4>
                  <div className="padding-preview-container">
                    <canvas
                      ref={(ref) => {
                        if (ref && paddingPreviewCanvas) {
                          const ctx = ref.getContext('2d');
                          if (ctx) {
                            ref.width = paddingPreviewCanvas.width;
                            ref.height = paddingPreviewCanvas.height;
                            ctx.drawImage(paddingPreviewCanvas, 0, 0);
                          }
                        }
                      }}
                      className="padding-preview"
                    />
                    <p className="padding-preview-info">
                      Blue: Original content<br/>
                      Red dashed: Final frame size
                    </p>
                  </div>
                </div>
              )}
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
                
                <div className="config-item">
                  <label>
                    Padding X:
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.paddingX}
                      onChange={(e) => updateConfig({ paddingX: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                </div>
                
                <div className="config-item">
                  <label>
                    Padding Y:
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.paddingY}
                      onChange={(e) => updateConfig({ paddingY: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </div>
              
              <div className="animation-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={removeEmptyOrSolid}
                    onChange={(e) => setRemoveEmptyOrSolid(e.target.checked)}
                  />
                  Ignore fully transparent/solid frames
                </label>
              </div>
              
              <div className="config-info">
                <p><strong>Total grid frames:</strong> {totalFrames}</p>
                {removeEmptyOrSolid && (
                  <p>
                    <strong>Estimated frames after filtering:</strong>{' '}
                    {calculationSkipped ? (
                      <span>
                        Too many frames ({totalFrames > 400 ? 'calculation skipped' : '—'}){' '}
                        <button 
                          type="button" 
                          className="force-calculate-link"
                          onClick={forceEstimateCalculation}
                          title="This may take a moment for large sprite sheets"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#61dafb',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0,
                            font: 'inherit',
                            fontSize: 'inherit'
                          }}
                        >
                          Calculate anyway
                        </button>
                      </span>
                    ) : (
                      estimatedFrameCount !== null ? estimatedFrameCount : '—'
                    )}
                  </p>
                )}
                <p><strong>Image size:</strong> {image.width} × {image.height}</p>
                <p><strong>Source frame size:</strong> {config.frameWidth} × {config.frameHeight}</p>
                <p><strong>Final frame size:</strong> {config.frameWidth + config.paddingX * 2} × {config.frameHeight + config.paddingY * 2}</p>
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
        
        <div className="slicer-footer">
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
                : `Slice into ${removeEmptyOrSolid && estimatedFrameCount !== null ? estimatedFrameCount : totalFrames} Frames`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 