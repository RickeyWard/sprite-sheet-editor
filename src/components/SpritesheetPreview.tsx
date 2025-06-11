import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PackedSheet } from '../types';
import { downloadCanvas, downloadJSON } from '../utils/imageLoader';

import wasmURL from '../libs/basis_encoder.wasm?url';
declare global {
  interface Window {
    BasisEncoderModule: any;
    wasm_basis_encoder_url: string;
  }
}
window.wasm_basis_encoder_url = wasmURL;
// @ts-ignore
import * as basisEncoderModule from '../libs/basis_encoder.js';

try {
  basisEncoderModule.BASIS({
  onRuntimeInitialized: () => {
    console.log("BasisEncoderModule initialized");
  }
}).then((module: any) => {
  window.BasisEncoderModule = module;

  if (module.initializeBasis) {
    module.initializeBasis();
    console.log("BasisEncoderModule.initializeBasis() called successfully.");
  }
  else {
    console.error("BasisEncoderModule.initializeBasis() is not available on the BasisEncoderModule object.");
  }

});
} catch (error) {
  console.error("Error initializing BASIS:", error);
}

interface SpritesheetPreviewProps {
  packedSheet: PackedSheet | null;
}

export const SpritesheetPreview: React.FC<SpritesheetPreviewProps> = ({ packedSheet }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [includeImageData, setIncludeImageData] = useState(false);
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

  const handleDownloadPNG = () => {
    if (packedSheet) {
      downloadCanvas(packedSheet.canvas, 'spritesheet.png');
    }
  };

  const handleDownloadKTX2 = async () => {
    const downloadBtn = document.getElementById('download-ktx2-btn');
    if (packedSheet) {
      try {
        downloadBtn?.setAttribute('disabled', 'true');

        // Convert canvas to blob then to arrayBuffer
        const blobData = await new Promise<Blob>(resolve => {
          packedSheet.canvas.toBlob(blob => {
            resolve(blob as Blob);
          }, 'image/png');
        });
        const curLoadedImageData = await blobData.arrayBuffer();

        const { BasisEncoder } = window.BasisEncoderModule;

        const basisEncoder = new BasisEncoder();
        basisEncoder.controlThreading(false, 4);
        basisEncoder.setCreateKTX2File(true);
        basisEncoder.setKTX2UASTCSupercompression(true);
        basisEncoder.setKTX2SRGBTransferFunc(true);
        var img_type = window.BasisEncoderModule.ldr_image_type.cPNGImage.value;
        basisEncoder.setSliceSourceImage(0, new Uint8Array(curLoadedImageData), 0, 0, img_type);
        basisEncoder.setFormatMode(1);
        basisEncoder.setQualityLevel(10);

        // set all the settings to the default values
        // Use UASTC HDR quality (0=fastest)
        // basisEncoder.setUASTCHDRQualityLevel(getUASTCHDRQuality());
         
        // basisEncoder.setASTC_HDR_6x6_Level(getASTCHDR6x6CompLevel());
        // basisEncoder.setLambda(getASTC6x6RDOLambda());
        // basisEncoder.setRec2020(elem('Rec2020').checked);

        // basisEncoder.setDebug(elem('Debug').checked);
        // basisEncoder.setComputeStats(elem('ComputeStats').checked);
        // basisEncoder.setPerceptual(elem('SRGB').checked);
        // basisEncoder.setMipSRGB(elem('SRGB').checked);

        // const etc1SQualityLevel = parseInt(elem('EncodeQuality').value, 10);
        // basisEncoder.setQualityLevel(etc1SQualityLevel);
                          
        // basisEncoder.setRDOUASTC(elem('UASTC_LDR_RDO').checked);
        // basisEncoder.setRDOUASTCQualityScalar(getUASTCLDRRDOQuality());
        
        // basisEncoder.setMipGen(elem('Mipmaps').checked);
        // basisEncoder.setCompressionLevel(getETC1SCompLevel());
        // basisEncoder.setPackUASTCFlags(getUASTCLDRQuality());

        const desiredBasisTexFormat = window.BasisEncoderModule.basis_tex_format.cUASTC4x4.value;
        basisEncoder.setFormatMode(1);

        if (desiredBasisTexFormat === window.BasisEncoderModule.basis_tex_format.cUASTC_HDR_4x4.value)
            console.log('Encoding to UASTC HDR 4x4 quality level '); // + getUASTCHDRQuality());
        else if (desiredBasisTexFormat === window.BasisEncoderModule.basis_tex_format.cASTC_HDR_6x6.value)
            console.log('Encoding to ASTC HDR 6x6');
        else if (desiredBasisTexFormat === window.BasisEncoderModule.basis_tex_format.cASTC_HDR_6x6_INTERMEDIATE.value)
            console.log('Encoding to ASTC HDR 6x6 Intermediate');
        else if (desiredBasisTexFormat === window.BasisEncoderModule.basis_tex_format.cUASTC4x4.value)
            console.log('Encoding to UASTC LDR 4x4');
        else 
            console.log('Encoding to ETC1S quality level '); // + etc1SQualityLevel);

         // Create a destination buffer to hold the compressed .basis file data. If this buffer isn't large enough compression will fail.
        var ktx2FileData = new Uint8Array(1024 * 1024 * 24);
        const startTime = performance.now();
        let num_output_bytes = basisEncoder.encode(ktx2FileData);
        const elapsed = performance.now() - startTime;
        console.log('encoding time', elapsed.toFixed(2));

        let actualKTX2FileData = new Uint8Array(ktx2FileData.buffer, 0, num_output_bytes);
        basisEncoder.delete();

        if (num_output_bytes == 0) {
          console.log('encodeBasisTexture() failed!');
        } else {
          console.log('encodeBasisTexture() succeeded, output size ' + num_output_bytes);
          const filename = 'spritesheet.ktx2';
          const blob = new Blob([actualKTX2FileData], { type: 'image/ktx2' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error creating KTX2 file:', error);
        alert('Error creating KTX2 file. This is a placeholder implementation.');
      }
      downloadBtn?.removeAttribute('disabled');
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
        <button id='download-ktx2-btn' onClick={handleDownloadKTX2} className="export-btn">
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