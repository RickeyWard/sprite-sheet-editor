import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Animation, SpriteFrame } from '../types';

interface AnimationPreviewProps {
  animations: Animation[];
  frames: SpriteFrame[];
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  animations,
  frames
}) => {
  const [selectedAnimationId, setSelectedAnimationId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [speed, setSpeed] = useState(200); // milliseconds per frame
  const [loop, setLoop] = useState(true);
  const [zoom, setZoom] = useState(2); // 2x zoom by default
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const selectedAnimation = animations.find(anim => anim.id === selectedAnimationId);
  const animationFrames = selectedAnimation?.frameIds.map(frameId => 
    frames.find(frame => frame.id === frameId)
  ).filter(Boolean) as SpriteFrame[] || [];

  const drawCheckerboard = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, checkerSize: number = 8) => {
    const lightColor = '#ffffff';
    const darkColor = '#cccccc';
    
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

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying || animationFrames.length === 0) return;

    if (timestamp - lastFrameTimeRef.current >= speed) {
      setCurrentFrameIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= animationFrames.length) {
          if (loop) {
            return 0;
          } else {
            setIsPlaying(false);
            return prevIndex;
          }
        }
        return nextIndex;
      });
      lastFrameTimeRef.current = timestamp;
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, speed, animationFrames.length, loop]);

  // Start/stop animation
  useEffect(() => {
    if (isPlaying && animationFrames.length > 0) {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate, animationFrames.length]);

  // Draw current frame with zoom and pan
  const drawFrame = useCallback(() => {
    if (!canvasRef.current || animationFrames.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const currentFrame = animationFrames[currentFrameIndex];

    if (!currentFrame) return;

    // Set canvas size to container size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Calculate display size with zoom
    const displayWidth = currentFrame.width * zoom;
    const displayHeight = currentFrame.height * zoom;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply pan offset and center the image initially
    const centerX = (canvas.width - displayWidth) / 2;
    const centerY = (canvas.height - displayHeight) / 2;
    const offsetX = centerX + pan.x;
    const offsetY = centerY + pan.y;

    // Draw checkerboard background
    const checkerSize = Math.max(4, 8 * zoom); // Scale checker size with zoom
    drawCheckerboard(ctx, offsetX, offsetY, displayWidth, displayHeight, checkerSize);
    
    // Draw frame
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    ctx.drawImage(currentFrame.image, offsetX, offsetY, displayWidth, displayHeight);
  }, [animationFrames, currentFrameIndex, zoom, pan, drawCheckerboard]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  // Reset frame index and pan when animation changes
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    setPan({ x: 0, y: 0 });
  }, [selectedAnimationId]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
        event.stopPropagation();
        event.preventDefault();
        const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomDelta)));
    }
    if (containerRef.current) {
        containerRef.current.addEventListener("wheel", handleWheel)
    }
    return () => {
        if (containerRef.current) {
            containerRef.current.removeEventListener("wheel", handleWheel)
        }
    }
}, [containerRef.current, setZoom])

  const handlePlay = () => {
    if (animationFrames.length > 0) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  const handlePrevFrame = () => {
    setCurrentFrameIndex(prev => 
      prev > 0 ? prev - 1 : (loop ? animationFrames.length - 1 : 0)
    );
  };

  const handleNextFrame = () => {
    setCurrentFrameIndex(prev => 
      prev < animationFrames.length - 1 ? prev + 1 : (loop ? 0 : prev)
    );
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseInt(e.target.value));
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  const handleZoomPreset = (zoomLevel: number) => {
    setZoom(zoomLevel);
  };

  const handleResetView = () => {
    setZoom(2);
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



  if (animations.length === 0) {
    return (
      <div className="animation-preview">
        <h3>Animation Preview</h3>
        <div className="no-animations-preview">
          <p>No animations to preview.</p>
          <p>Create some animations first!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animation-preview">
      <h3>Animation Preview</h3>
      
      <div className="animation-selector">
        <label htmlFor="animation-select">Select Animation:</label>
        <select
          id="animation-select"
          value={selectedAnimationId}
          onChange={(e) => setSelectedAnimationId(e.target.value)}
          className="animation-select"
        >
          <option value="">Choose an animation...</option>
          {animations.map(animation => (
            <option key={animation.id} value={animation.id}>
              {animation.name} ({animation.frameIds.length} frames)
            </option>
          ))}
        </select>
      </div>

      {selectedAnimation && (
        <>
          <div 
            ref={containerRef}
            className="preview-canvas-wrapper"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            <canvas
              ref={canvasRef}
              className="animation-canvas"
            />
            {animationFrames.length === 0 && (
              <div className="no-frames">No valid frames found</div>
            )}
          </div>

          <div className="animation-info">
            <span>Frame: {currentFrameIndex + 1} / {animationFrames.length}</span>
            {animationFrames[currentFrameIndex] && (
              <span>Current: {animationFrames[currentFrameIndex].name}</span>
            )}
          </div>

          <div className="zoom-controls">
            <div className="zoom-presets">
              <span>Zoom:</span>
              {[0.5, 1, 2, 4, 8].map(zoomLevel => (
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
                min="0.25"
                max="16"
                step="0.25"
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

          <div className="animation-controls">
            <div className="playback-controls">
              <button 
                onClick={handleStop} 
                className="control-btn"
                title="Stop"
              >
                ⏹️
              </button>
              <button 
                onClick={handlePrevFrame} 
                className="control-btn"
                title="Previous Frame"
              >
                ⏮️
              </button>
              <button 
                onClick={handlePlay} 
                className="control-btn play-btn"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button 
                onClick={handleNextFrame} 
                className="control-btn"
                title="Next Frame"
              >
                ⏭️
              </button>
            </div>

            <div className="speed-control">
              <label htmlFor="speed-slider">Speed:</label>
              <input
                id="speed-slider"
                type="range"
                min="50"
                max="1000"
                step="50"
                value={speed}
                onChange={handleSpeedChange}
                className="speed-slider"
              />
              <span className="speed-value">{speed}ms</span>
            </div>

            <div className="loop-control">
              <label>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                />
                Loop
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 