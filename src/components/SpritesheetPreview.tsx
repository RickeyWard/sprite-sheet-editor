import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PackedSheet } from '../types';
import { downloadCanvas, downloadJSON } from '../utils/imageLoader';

import {
  initBasisEncoderGlobal,
  type BasisEncoder
} from '../libs/basis-encoder-wrapper';


interface SpritesheetPreviewProps {
  packedSheet: PackedSheet | null;
  frames: { length: number }; // Just need the length for checking if frames exist
}

export const SpritesheetPreview: React.FC<SpritesheetPreviewProps> = ({ packedSheet, frames }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [includeImageData, setIncludeImageData] = useState(false);
  const [useKTX2Format, setUseKTX2Format] = useState(false);
  const [autoFit, setAutoFit] = useState(true);
  const [marchingAntsOffset, setMarchingAntsOffset] = useState(0);

  // Animation for marching ants
  useEffect(() => {
    const interval = setInterval(() => {
      setMarchingAntsOffset(prev => (prev + 1) % 8);
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  const drawMarchingAnts = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    ctx.save();
    ctx.lineWidth = 1;

    // Function to draw a dashed line with marching ants effect
    const drawDashedRect = (x: number, y: number, width: number, height: number) => {
      const dashLength = 4;

      // Draw white border first
      ctx.setLineDash([dashLength, dashLength]);
      ctx.lineDashOffset = -marchingAntsOffset;
      ctx.strokeStyle = 'white';
      ctx.strokeRect(x, y, width, height);

      // Draw black border offset
      ctx.setLineDash([dashLength, dashLength]);
      ctx.lineDashOffset = -marchingAntsOffset - dashLength;
      ctx.strokeStyle = 'black';
      ctx.strokeRect(x, y, width, height);
    };

    drawDashedRect(x, y, width, height);
    ctx.restore();
  }, [marchingAntsOffset]);

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

  const calculateAutoFitZoom = useCallback(() => {
    if (!canvasRef.current || !packedSheet || !containerRef.current) return 1;

    const container = containerRef.current;
    const sourceCanvas = packedSheet.canvas;

    // Get container dimensions with some padding
    const containerWidth = container.clientWidth - 40; // 20px padding on each side
    const containerHeight = container.clientHeight - 40;

    // Calculate zoom to fit both width and height
    const zoomX = containerWidth / sourceCanvas.width;
    const zoomY = containerHeight / sourceCanvas.height;

    // Use the smaller zoom to ensure it fits in both dimensions
    // Allow zooming up but cap at reasonable maximum
    return Math.max(0.1, Math.min(zoomX, zoomY, 10));
  }, [packedSheet]);

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !packedSheet) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const sourceCanvas = packedSheet.canvas;

    // Use auto-fit zoom if enabled, otherwise use manual zoom
    const effectiveZoom = autoFit ? calculateAutoFitZoom() : zoom;
    const effectivePan = autoFit ? { x: 0, y: 0 } : pan;

    // Calculate display size with zoom
    const displayWidth = sourceCanvas.width * effectiveZoom;
    const displayHeight = sourceCanvas.height * effectiveZoom;

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
    const offsetX = centerX + effectivePan.x;
    const offsetY = centerY + effectivePan.y;

    // Draw checkerboard background
    const checkerSize = Math.max(8, 16 * effectiveZoom); // Scale checker size with zoom
    drawCheckerboard(ctx, offsetX, offsetY, displayWidth, displayHeight, checkerSize);

    // Draw the spritesheet
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    ctx.drawImage(sourceCanvas, offsetX, offsetY, displayWidth, displayHeight);

    // Draw frame boundaries with marching ants
    Object.values(packedSheet.spritesheet.frames).forEach(frame => {
      const x = offsetX + (frame.frame.x * effectiveZoom);
      const y = offsetY + (frame.frame.y * effectiveZoom);
      const w = frame.frame.w * effectiveZoom;
      const h = frame.frame.h * effectiveZoom;

      drawMarchingAnts(ctx, x, y, w, h);
    });
  }, [packedSheet, zoom, pan, drawCheckerboard, autoFit, calculateAutoFitZoom, drawMarchingAnts]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const generateKTX2DataURL = async (): Promise<string | null> => {
    const basisModule = await initBasisEncoderGlobal();
    if (!packedSheet || !basisModule) {
      return null;
    }

    try {
      // Get raw pixel data from canvas
      const canvas = packedSheet.canvas;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Get raw RGBA pixel data
      const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = new Uint8Array(canvasImageData.data.buffer);

      // Create encoder instance
      const encoder: BasisEncoder = new basisModule.BasisEncoder();

      // Configure encoder settings
      encoder.controlThreading(false, 4);
      encoder.setCreateKTX2File(true);
      encoder.setKTX2UASTCSupercompression(true);
      encoder.setKTX2SRGBTransferFunc(true);

      // Set source image - using raw RGBA pixel data
      const canvasWidth = packedSheet.canvas.width;
      const canvasHeight = packedSheet.canvas.height;

      // For raw RGBA data, we don't need to specify an image type - pass 0
      const success = encoder.setSliceSourceImage(0, pixelData, canvasWidth, canvasHeight, 0);

      if (!success) {
        throw new Error(`Failed to set source image data (${canvasWidth}x${canvasHeight}, ${pixelData.length} bytes)`);
      }

      // Configure format and quality
      encoder.setFormatMode(1); // UASTC mode
      encoder.setQualityLevel(128); // High quality

      // Create output buffer
      const outputBuffer = new Uint8Array(1024 * 1024 * 24);

      // Encode the image
      const outputSize = encoder.encode(outputBuffer);

      // Clean up encoder
      encoder.delete();

      if (outputSize === 0) {
        throw new Error('Encoding failed - output size is 0');
      }

      // Create final data array with exact size
      const ktx2Data = new Uint8Array(outputBuffer.buffer, 0, outputSize);

      // Convert to base64 and create data URL
      const base64String = btoa(String.fromCharCode(...ktx2Data));
      return `data:image/ktx2;base64,${base64String}`;

    } catch (error) {
      console.error('Error generating KTX2 data URL:', error);
      return null;
    }
  };

  const handleDownloadPNG = () => {
    if (packedSheet) {
      downloadCanvas(packedSheet.canvas, 'spritesheet.png');
    }
  };

  const handleDownloadKTX2 = async () => {
    const downloadBtn = document.getElementById('download-ktx2-btn') as HTMLButtonElement;

    if (!packedSheet) {
      alert('No spritesheet available to export');
      return;
    }

    const basisModule = await initBasisEncoderGlobal();

    if (!basisModule) {
      alert('Basis encoder module not initialized. Please wait and try again.');
      return;
    }


    try {
      downloadBtn?.setAttribute('disabled', 'true');

      // Get raw pixel data from canvas instead of PNG blob
      const canvas = packedSheet.canvas;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Get raw RGBA pixel data
      const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = new Uint8Array(canvasImageData.data.buffer);

      // Create encoder instance with proper typing
      const encoder: BasisEncoder = new basisModule.BasisEncoder();

      // Configure encoder settings
      encoder.controlThreading(false, 4);
      encoder.setCreateKTX2File(true);
      encoder.setKTX2UASTCSupercompression(true);
      encoder.setKTX2SRGBTransferFunc(true);

      // Set source image - now using raw RGBA pixel data
      const canvasWidth = packedSheet.canvas.width;
      const canvasHeight = packedSheet.canvas.height;

      console.log(`Setting source image: ${canvasWidth}x${canvasHeight}, raw RGBA data size: ${pixelData.length} bytes`);

      // For raw RGBA data, we don't need to specify an image type - pass 0 (note that we could get a png and then use var img_type = window.BasisEncoderModule.ldr_image_type.cPNGImage.value;
      const success = encoder.setSliceSourceImage(0, pixelData, canvasWidth, canvasHeight, 0);

      if (!success) {
        throw new Error(`Failed to set source image data (${canvasWidth}x${canvasHeight}, ${pixelData.length} bytes)`);
      }

      // Configure format and quality
      encoder.setFormatMode(1); // UASTC mode
      encoder.setQualityLevel(128); // High quality

      // Optional: Set debug and stats (uncomment if needed)
      // encoder.setDebug(false);
      // encoder.setComputeStats(false);
      // encoder.setPerceptual(true);
      // encoder.setMipSRGB(true);
      // encoder.setMipGen(false);

      // Log the encoding format (using UASTC LDR 4x4 format)
      console.log('Encoding to UASTC LDR 4x4 format');

      // Create output buffer (24MB should be sufficient for most spritesheets)
      const outputBuffer = new Uint8Array(1024 * 1024 * 24);

      // Encode the image
      console.log('Starting KTX2 encoding...');
      const startTime = performance.now();
      const outputSize = encoder.encode(outputBuffer);
      const elapsed = performance.now() - startTime;

      console.log(`Encoding completed in ${elapsed.toFixed(2)}ms`);

      // Clean up encoder
      encoder.delete();

      if (outputSize === 0) {
        throw new Error('Encoding failed - output size is 0');
      }

      // Create final data array with exact size
      const ktx2Data = new Uint8Array(outputBuffer.buffer, 0, outputSize);

      console.log(`KTX2 encoding succeeded, output size: ${outputSize} bytes`);

      // Download the file
      const filename = 'spritesheet.ktx2';
      const blob = new Blob([ktx2Data], { type: 'image/ktx2' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error creating KTX2 file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error creating KTX2 file: ${errorMessage}`);
    } finally {
      downloadBtn?.removeAttribute('disabled');
    }
  };

  const handleDownloadJSON = async () => {
    if (packedSheet) {
      let spritesheetData = { ...packedSheet.spritesheet };

      if (includeImageData) {
        const updatedMeta = { ...packedSheet.spritesheet.meta };

        if (useKTX2Format) {
          const ktx2DataURL = await generateKTX2DataURL();
          if (ktx2DataURL) {
            updatedMeta.image = ktx2DataURL;
          }
        } else {
          updatedMeta.image = packedSheet.canvas.toDataURL('image/png');
        }

        spritesheetData = {
          ...spritesheetData,
          meta: updatedMeta
        };
      }

      downloadJSON(spritesheetData, 'spritesheet.json');
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
    if (autoFit) {
      // Preserve the current auto-fit zoom and reset pan when transitioning to manual control
      setZoom(calculateAutoFitZoom());
      setPan({ x: 0, y: 0 }); // Reset pan to prevent jumping
      setAutoFit(false);
    }
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
      if (autoFit) {
        // Preserve the current auto-fit zoom and reset pan when transitioning to manual control
        setZoom(calculateAutoFitZoom());
        setPan({ x: 0, y: 0 }); // Reset pan to prevent jumping
        setAutoFit(false);
      }
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
  }, [containerRef.current, setZoom, autoFit, calculateAutoFitZoom]);

  if (!packedSheet) {
    const hasFrames = frames.length > 0;
    
    return (
      <div className="spritesheet-preview">
        <h3>Spritesheet Preview</h3>
        <div className="no-preview">
          {hasFrames ? (
            <div>
              <p>❌ Unable to pack sprites</p>
              <p style={{ fontSize: '0.9rem', color: '#ff6b6b', marginTop: '8px' }}>
                The sprites are too large to fit in the current maximum canvas size.
                Try reducing the canvas size constraints, using fewer sprites, or enabling trimming/spacing options.
              </p>
            </div>
          ) : (
            <p>Add some sprites to see the packed spritesheet</p>
          )}
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
        <span>Zoom: {Math.round((autoFit ? calculateAutoFitZoom() : zoom) * 100)}%</span>
      </div>

      <div className="spritesheet-zoom-controls">
        <div className="zoom-presets">
          <span>Zoom:</span>
          <button
            onClick={() => {
              if (autoFit) {
                // When manually disabling auto-fit, preserve zoom and reset pan
                setZoom(calculateAutoFitZoom());
                setPan({ x: 0, y: 0 });
              }
              setAutoFit(!autoFit);
            }}
            className={`zoom-btn auto-fit-btn ${autoFit ? 'active' : ''}`}
            title="Auto fit to container"
          >
            📐 Auto
          </button>
          {[0.25, 0.5, 1, 2, 4].map(zoomLevel => (
            <button
              key={zoomLevel}
              onClick={() => {
                setAutoFit(false);
                handleZoomPreset(zoomLevel);
              }}
              className={`zoom-btn ${!autoFit && zoom === zoomLevel ? 'active' : ''}`}
            >
              {zoomLevel}x
            </button>
          ))}
          <button
            onClick={() => {
              setAutoFit(false);
              handleResetView();
            }}
            className="reset-btn"
            title="Reset view"
          >
            🎯
          </button>
        </div>
        <div className="zoom-slider-container">
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={autoFit ? calculateAutoFitZoom() : zoom}
            onChange={(e) => {
              if (autoFit) {
                // Preserve the current auto-fit zoom and reset pan when starting to use slider
                setZoom(calculateAutoFitZoom());
                setPan({ x: 0, y: 0 }); // Reset pan to prevent jumping
                setAutoFit(false);
              }
              handleZoomChange(e);
            }}
            className="zoom-slider"
          />
          <span className="zoom-value">
            {Math.round((autoFit ? calculateAutoFitZoom() : zoom) * 100)}%
          </span>
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
        <button
          id='download-ktx2-btn'
          onClick={handleDownloadKTX2}
          className="export-btn"
        >
          📄 Download KTX2
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
          {includeImageData && (
            <div className="image-format-options" style={{ marginLeft: '20px', marginTop: '8px' }}>
              <label className="export-option">
                <input
                  type="radio"
                  name="imageFormat"
                  checked={!useKTX2Format}
                  onChange={() => setUseKTX2Format(false)}
                />
                PNG format
              </label>
              <label className="export-option">
                <input
                  type="radio"
                  name="imageFormat"
                  checked={useKTX2Format}
                  onChange={() => setUseKTX2Format(true)}
                />
                KTX2 format
              </label>
            </div>
          )}
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
                image: useKTX2Format
                  ? '[KTX2 data URL - click download to generate]'
                  : packedSheet.canvas.toDataURL('image/png')
              }
            }, null, 2) :
            JSON.stringify(spritesheet, null, 2)
          }
        </pre>
      </details>
    </div>
  );
}; 