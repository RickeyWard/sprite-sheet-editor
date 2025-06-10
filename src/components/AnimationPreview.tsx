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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const selectedAnimation = animations.find(anim => anim.id === selectedAnimationId);
  const animationFrames = selectedAnimation?.frameIds.map(frameId => 
    frames.find(frame => frame.id === frameId)
  ).filter(Boolean) as SpriteFrame[] || [];

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

  // Draw current frame
  useEffect(() => {
    if (!canvasRef.current || animationFrames.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const currentFrame = animationFrames[currentFrameIndex];

    if (!currentFrame) return;

    // Set canvas size to frame size multiplied by zoom
    const scaledWidth = currentFrame.width * zoom;
    const scaledHeight = currentFrame.height * zoom;
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    // Clear and draw frame
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    ctx.drawImage(currentFrame.image, 0, 0, scaledWidth, scaledHeight);
  }, [animationFrames, currentFrameIndex, zoom]);

  // Reset frame index when animation changes
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  }, [selectedAnimationId]);

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
          <div className="preview-canvas-wrapper">
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
              <span className="zoom-value">{zoom}x</span>
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