import React, { useEffect, useRef, useState } from 'react';
import type { PackedSheet } from '../types';
import { downloadCanvas, downloadJSON } from '../utils/imageLoader';

interface SpritesheetPreviewProps {
  packedSheet: PackedSheet | null;
}

export const SpritesheetPreview: React.FC<SpritesheetPreviewProps> = ({ packedSheet }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (canvasRef.current && packedSheet) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Calculate scale to fit in preview
      const maxSize = 400;
      const sourceCanvas = packedSheet.canvas;
      const calculatedScale = Math.min(maxSize / sourceCanvas.width, maxSize / sourceCanvas.height, 1);
      setScale(calculatedScale);
      
      canvas.width = sourceCanvas.width * calculatedScale;
      canvas.height = sourceCanvas.height * calculatedScale;
      
      // Draw scaled version
      ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      
      // Draw frame boundaries
      Object.values(packedSheet.spritesheet.frames).forEach(frame => {
        const x = frame.frame.x * calculatedScale;
        const y = frame.frame.y * calculatedScale;
        const w = frame.frame.w * calculatedScale;
        const h = frame.frame.h * calculatedScale;
        
        ctx.strokeRect(x, y, w, h);
      });
    }
  }, [packedSheet]);

  const handleDownloadPNG = () => {
    if (packedSheet) {
      downloadCanvas(packedSheet.canvas, 'spritesheet.png');
    }
  };

  const handleDownloadJSON = () => {
    if (packedSheet) {
      downloadJSON(packedSheet.spritesheet, 'spritesheet.json');
    }
  };

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
        <span>Scale: {Math.round(scale * 100)}%</span>
      </div>
      
      <div className="preview-canvas-container">
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
      </div>
      
      <details className="json-preview">
        <summary>JSON Preview</summary>
        <pre className="json-content">
          {JSON.stringify(spritesheet, null, 2)}
        </pre>
      </details>
    </div>
  );
}; 