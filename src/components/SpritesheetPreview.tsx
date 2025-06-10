import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PackedSheet } from '../types';
import { downloadCanvas, downloadJSON } from '../utils/imageLoader';

interface SpritesheetPreviewProps {
  packedSheet: PackedSheet | null;
}

export const SpritesheetPreview: React.FC<SpritesheetPreviewProps> = ({ packedSheet }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [includeImageData, setIncludeImageData] = useState(false);

  const drawCheckerboard = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, checkerSize: number = 16) => {
    const lightColor = '#ffffff';
    const darkColor = '#cccccc';
    
    // Calculate how many checker squares we need
    const numCols = Math.ceil(width / checkerSize);
    const numRows = Math.ceil(height / checkerSize);
    
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const isEven = (row + col) % 2 === 0;
        ctx.fillStyle = isEven ? lightColor : darkColor;
        
        const rectX = x + col * checkerSize;
        const rectY = y + row * checkerSize;
        const rectWidth = Math.min(checkerSize, x + width - rectX);
        const rectHeight = Math.min(checkerSize, y + height - rectY);
        
        if (rectWidth > 0 && rectHeight > 0) {
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        }
      }
    }
  }, []);

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !packedSheet) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const sourceCanvas = packedSheet.canvas;
    
    // Calculate display size with zoom
    const displayWidth = sourceCanvas.width * zoom;
    const displayHeight = sourceCanvas.height * zoom;
    
    // Set canvas size to container size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply pan offset and center the image initially
    const centerX = (canvas.width - displayWidth) / 2;
    const centerY = (canvas.height - displayHeight) / 2;
    const offsetX = centerX + pan.x;
    const offsetY = centerY + pan.y;
    
    // Draw checkerboard background
    const checkerSize = Math.max(8, 16 * zoom); // Scale checker size with zoom
    drawCheckerboard(ctx, offsetX, offsetY, displayWidth, displayHeight, checkerSize);
    
    // Draw the spritesheet
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    ctx.drawImage(sourceCanvas, offsetX, offsetY, displayWidth, displayHeight);
    
    // Draw frame boundaries
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    
    Object.values(packedSheet.spritesheet.frames).forEach(frame => {
      const x = offsetX + (frame.frame.x * zoom);
      const y = offsetY + (frame.frame.y * zoom);
      const w = frame.frame.w * zoom;
      const h = frame.frame.h * zoom;
      
      ctx.strokeRect(x, y, w, h);
    });
  }, [packedSheet, zoom, pan, drawCheckerboard]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleDownloadPNG = () => {
    if (packedSheet) {
      downloadCanvas(packedSheet.canvas, 'spritesheet.png');
    }
  };

  const handleDownloadJSON = () => {
    if (packedSheet) {
      if (includeImageData) {
        // Create a copy of the spritesheet data with image data URL
        const spritesheetWithImage = {
          ...packedSheet.spritesheet,
          meta: {
            ...packedSheet.spritesheet.meta,
            image: packedSheet.canvas.toDataURL('image/png')
          }
        };
        downloadJSON(spritesheetWithImage, 'spritesheet.json');
      } else {
        downloadJSON(packedSheet.spritesheet, 'spritesheet.json');
      }
    }
  };

  // Zoom controls
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  const handleZoomPreset = (zoomLevel: number) => {
    setZoom(zoomLevel);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setPan(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Reset pan when packedSheet changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [packedSheet]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomDelta)));
    };
    if (containerRef.current) {
      containerRef.current.addEventListener("wheel", handleWheel);
    }
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, [containerRef.current, setZoom]);

  if (!packedSheet) {
    return (
      <div className="spritesheet-preview">
        <h3>Spritesheet Preview</h3>
        <div className="no-preview">
          <p>Add some sprites to see the packed spritesheet</p>
        </div>
      </div>
    );
  }

  const { canvas, spritesheet } = packedSheet;

  return (
    <div className="spritesheet-preview">
      <h3>Spritesheet Preview</h3>
      
      <div className="preview-info">
        <span>Size: {canvas.width} × {canvas.height}</span>
        <span>Frames: {Object.keys(spritesheet.frames).length}</span>
        <span>Animations: {Object.keys(spritesheet.animations).length}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
      </div>

      <div className="spritesheet-zoom-controls">
        <div className="zoom-presets">
          <span>Zoom:</span>
          {[0.25, 0.5, 1, 2, 4].map(zoomLevel => (
            <button
              key={zoomLevel}
              onClick={() => handleZoomPreset(zoomLevel)}
              className={`zoom-btn ${zoom === zoomLevel ? 'active' : ''}`}
            >
              {zoomLevel}x
            </button>
          ))}
          <button onClick={handleResetView} className="reset-btn" title="Reset view">
            🎯
          </button>
        </div>
        <div className="zoom-slider-container">
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={zoom}
            onChange={handleZoomChange}
            className="zoom-slider"
          />
          <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="pan-instructions">
          <span>💡 Drag to pan, scroll to zoom</span>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="preview-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <canvas
          ref={canvasRef}
          className="preview-canvas"
        />
      </div>
      
      <div className="export-controls">
        <button onClick={handleDownloadPNG} className="export-btn">
          📥 Download PNG
        </button>
        <button onClick={handleDownloadJSON} className="export-btn">
          📄 Download JSON
        </button>
        <div className="export-options">
          <label className="export-option">
            <input
              type="checkbox"
              checked={includeImageData}
              onChange={(e) => setIncludeImageData(e.target.checked)}
            />
            Include image data URL in JSON
          </label>
        </div>
      </div>
      
      <details className="json-preview">
        <summary>JSON Preview</summary>
        <pre className="json-content">
          {includeImageData && packedSheet ? 
            JSON.stringify({
              ...packedSheet.spritesheet,
              meta: {
                ...packedSheet.spritesheet.meta,
                image: packedSheet.canvas.toDataURL('image/png')
              }
            }, null, 2) :
            JSON.stringify(spritesheet, null, 2)
          }
        </pre>
      </details>
    </div>
  );
}; 