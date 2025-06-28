import React, { useState } from 'react';
import { initBasisEncoderGlobal, type BasisEncoder } from '../libs/basis-encoder-wrapper';
import { BasisTextureFormat } from '../libs/basis_encoder.ts';

interface KTX2ConverterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface KTX2EncodingOptions {
  // Format selection
  format: BasisTextureFormat;
  
  // ETC1S LDR Options
  etc1sQuality: number;
  etc1sCompressionLevel: number;
  
  // UASTC HDR Options
  forceUASTCHDROnLDR: boolean;
  uastcHDRQuality: number;
  convertLDRToLinear: boolean;
  
  // UASTC LDR Options
  uastcLDREnabled: boolean;
  uastcLDRQuality: number;
  rdoUASTC: boolean;
  rdoQuality: number;
  
  // Other Options
  perceptual: boolean;
  generateMipmaps: boolean;
  mipSRGB: boolean;
  ktx2SuperCompression: boolean;
  srgbTransferFunc: boolean;
  
  // Debug Options
  debug: boolean;
  computeStats: boolean;
  
  // ASTC HDR 6x6 Options (for future use)
  astcHDR6x6Level: number;
  lambda: number;
  rec2020: boolean;
}

const defaultOptions: KTX2EncodingOptions = {
  format: BasisTextureFormat.cUASTC4x4,
  etc1sQuality: 255,
  etc1sCompressionLevel: 2,
  forceUASTCHDROnLDR: false,
  uastcHDRQuality: 0,
  convertLDRToLinear: false,
  uastcLDREnabled: true,
  uastcLDRQuality: 1,
  rdoUASTC: false,
  rdoQuality: 1.0,
  perceptual: true,
  generateMipmaps: false,
  mipSRGB: true,
  ktx2SuperCompression: true,
  srgbTransferFunc: true,
  debug: false,
  computeStats: false,
  astcHDR6x6Level: 0,
  lambda: 1.0,
  rec2020: false,
};

export const KTX2Converter: React.FC<KTX2ConverterProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [options, setOptions] = useState<KTX2EncodingOptions>(defaultOptions);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      alert('Please select a valid image file (PNG, JPG, etc.)');
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      alert('Please select a valid image file (PNG, JPG, etc.)');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const updateOption = <K extends keyof KTX2EncodingOptions>(
    key: K,
    value: KTX2EncodingOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const convertToKTX2 = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    try {
      // Initialize the BASIS encoder
      const basisModule = await initBasisEncoderGlobal();
      
      // Load the image
      const img = new Image();
      const imageLoaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
      });
      
      img.src = URL.createObjectURL(selectedFile);
      const loadedImg = await imageLoaded;
      URL.revokeObjectURL(img.src);

      // Create canvas to get pixel data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      canvas.width = loadedImg.width;
      canvas.height = loadedImg.height;
      ctx.drawImage(loadedImg, 0, 0);

      // Get raw RGBA pixel data
      const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = new Uint8Array(canvasImageData.data.buffer);

      // Create encoder instance
      const encoder: BasisEncoder = new basisModule.BasisEncoder();

      // Configure encoder settings based on options
      encoder.controlThreading(false, 4);
      encoder.setCreateKTX2File(true);
      
      // Format selection
      encoder.setFormatMode(options.format);
      
      // ETC1S specific settings
      if (options.format === BasisTextureFormat.cETC1S) {
        encoder.setQualityLevel(options.etc1sQuality);
        encoder.setCompressionLevel(options.etc1sCompressionLevel);
      }
      
      // UASTC HDR specific settings
      if (options.format === BasisTextureFormat.cUASTC_HDR_4x4) {
        encoder.setUASTCHDRQualityLevel(options.uastcHDRQuality);
        if (options.convertLDRToLinear) {
          // This would require additional implementation in the encoder
          console.log('Convert LDR to linear light option selected');
        }
      }
      
      // UASTC LDR specific settings
      if (options.format === BasisTextureFormat.cUASTC4x4) {
        encoder.setPackUASTCFlags(options.uastcLDRQuality);
        if (options.rdoUASTC) {
          encoder.setRDOUASTC(true);
          encoder.setRDOUASTCQualityScalar(options.rdoQuality);
        } else {
          encoder.setRDOUASTC(false);
        }
      }
      
      // ASTC HDR 6x6 settings (future)
      if (options.format === BasisTextureFormat.cASTC_HDR_6x6) {
        encoder.setASTC_HDR_6x6_Level(options.astcHDR6x6Level);
        encoder.setLambda(options.lambda);
        encoder.setRec2020(options.rec2020);
      }
      
      // General settings
      encoder.setKTX2UASTCSupercompression(options.ktx2SuperCompression);
      encoder.setKTX2SRGBTransferFunc(options.srgbTransferFunc);
      encoder.setPerceptual(options.perceptual);
      encoder.setMipGen(options.generateMipmaps);
      encoder.setMipSRGB(options.mipSRGB);
      encoder.setDebug(options.debug);
      encoder.setComputeStats(options.computeStats);

      // Set source image data
      const success = encoder.setSliceSourceImage(0, pixelData, canvas.width, canvas.height, 0);
      if (!success) {
        throw new Error('Failed to set source image data');
      }

      // Create output buffer
      const outputBuffer = new Uint8Array(1024 * 1024 * 4); // 4MB buffer

      // Encode the image
      const outputSize = encoder.encode(outputBuffer);
      encoder.delete();

      if (outputSize === 0) {
        throw new Error('Encoding failed - output size is 0');
      }

      // Create final data array with exact size
      const ktx2Data = new Uint8Array(outputBuffer.buffer, 0, outputSize);

      // Download the KTX2 file
      const blob = new Blob([ktx2Data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedFile.name.replace(/\.[^/.]+$/, '')}.ktx2`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Reset state
      setSelectedFile(null);
      alert('KTX2 conversion completed successfully!');
      
    } catch (error) {
      console.error('KTX2 conversion failed:', error);
      alert(`KTX2 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  const formatNames = {
    [BasisTextureFormat.cETC1S]: 'ETC1S (Smaller size)',
    [BasisTextureFormat.cUASTC4x4]: 'UASTC LDR 4x4 (High quality)',
    [BasisTextureFormat.cUASTC_HDR_4x4]: 'UASTC HDR 4x4 (HDR)',
    [BasisTextureFormat.cASTC_HDR_6x6]: 'ASTC HDR 6x6 (Future)',
    [BasisTextureFormat.cASTC_HDR_6x6_INTERMEDIATE]: 'ASTC HDR 6x6 Intermediate (Future)',
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content ktx2-converter" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Convert Image to KTX2</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>Upload an image file to convert it to KTX2 format for optimized texture storage.</p>
          
          <div 
            className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {selectedFile ? (
              <div className="selected-file">
                <p>✅ Selected: {selectedFile.name}</p>
                <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="drop-instructions">
                <p>Drop an image file here or click to select</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="ktx2-file-input"
                />
                <label htmlFor="ktx2-file-input" className="file-select-btn">
                  Choose Image
                </label>
              </div>
            )}
          </div>

          <div className="encoding-options">
            <h3>Encoding Options</h3>
            
            {/* Format Selection */}
            <div className="option-group">
              <label>
                <strong>Texture Format:</strong>
                <select 
                  value={options.format} 
                  onChange={(e) => updateOption('format', parseInt(e.target.value) as BasisTextureFormat)}
                >
                  {Object.entries(formatNames).map(([value, name]) => (
                    <option key={value} value={value}>{name}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* ETC1S LDR Options */}
            {options.format === BasisTextureFormat.cETC1S && (
              <div className="option-group">
                <h4>ETC1S LDR Options</h4>
                <label>
                  ETC1S Quality (1-255):
                  <input
                    type="range"
                    min="1"
                    max="255"
                    value={options.etc1sQuality}
                    onChange={(e) => updateOption('etc1sQuality', parseInt(e.target.value))}
                  />
                  <span>{options.etc1sQuality}</span>
                </label>
                <label>
                  Compression Level (0-6):
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={options.etc1sCompressionLevel}
                    onChange={(e) => updateOption('etc1sCompressionLevel', parseInt(e.target.value))}
                  />
                  <span>{options.etc1sCompressionLevel}</span>
                </label>
              </div>
            )}

            {/* UASTC HDR Options */}
            {options.format === BasisTextureFormat.cUASTC_HDR_4x4 && (
              <div className="option-group">
                <h4>UASTC HDR Options</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={options.forceUASTCHDROnLDR}
                    onChange={(e) => updateOption('forceUASTCHDROnLDR', e.target.checked)}
                  />
                  Force UASTC HDR on LDR Inputs
                </label>
                <label>
                  UASTC HDR Quality (0-4):
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={options.uastcHDRQuality}
                    onChange={(e) => updateOption('uastcHDRQuality', parseInt(e.target.value))}
                  />
                  <span>{options.uastcHDRQuality}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.convertLDRToLinear}
                    onChange={(e) => updateOption('convertLDRToLinear', e.target.checked)}
                  />
                  Convert LDR images to linear light
                </label>
              </div>
            )}

            {/* UASTC LDR Options */}
            {options.format === BasisTextureFormat.cUASTC4x4 && (
              <div className="option-group">
                <h4>UASTC LDR Options</h4>
                <label>
                  UASTC LDR Quality (0-4):
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={options.uastcLDRQuality}
                    onChange={(e) => updateOption('uastcLDRQuality', parseInt(e.target.value))}
                  />
                  <span>{options.uastcLDRQuality}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.rdoUASTC}
                    onChange={(e) => updateOption('rdoUASTC', e.target.checked)}
                  />
                  UASTC LDR RDO (Rate Distortion Optimization)
                </label>
                {options.rdoUASTC && (
                  <label>
                    RDO Quality (0.001-10.0):
                    <input
                      type="range"
                      min="0.001"
                      max="10"
                      step="0.1"
                      value={options.rdoQuality}
                      onChange={(e) => updateOption('rdoQuality', parseFloat(e.target.value))}
                    />
                    <span>{options.rdoQuality.toFixed(1)}</span>
                  </label>
                )}
              </div>
            )}

            {/* ASTC HDR 6x6 Options */}
            {(options.format === BasisTextureFormat.cASTC_HDR_6x6 || options.format === BasisTextureFormat.cASTC_HDR_6x6_INTERMEDIATE) && (
              <div className="option-group">
                <h4>ASTC HDR 6x6 Options</h4>
                <label>
                  Compression Level (0-4):
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={options.astcHDR6x6Level}
                    onChange={(e) => updateOption('astcHDR6x6Level', parseInt(e.target.value))}
                  />
                  <span>{options.astcHDR6x6Level}</span>
                </label>
                <label>
                  Lambda (0.1-10.0):
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={options.lambda}
                    onChange={(e) => updateOption('lambda', parseFloat(e.target.value))}
                  />
                  <span>{options.lambda.toFixed(1)}</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={options.rec2020}
                    onChange={(e) => updateOption('rec2020', e.target.checked)}
                  />
                  Enable REC 2020 Delta E ITP
                </label>
              </div>
            )}

            {/* General Options */}
            <div className="option-group">
              <h4>General Options</h4>
              <label>
                <input
                  type="checkbox"
                  checked={options.perceptual}
                  onChange={(e) => updateOption('perceptual', e.target.checked)}
                />
                Use sRGB/perceptual metrics
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.generateMipmaps}
                  onChange={(e) => updateOption('generateMipmaps', e.target.checked)}
                />
                Generate mipmaps
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.mipSRGB}
                  onChange={(e) => updateOption('mipSRGB', e.target.checked)}
                />
                Mipmap filtering in sRGB space
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.ktx2SuperCompression}
                  onChange={(e) => updateOption('ktx2SuperCompression', e.target.checked)}
                />
                KTX2 UASTC Zstandard supercompression
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.srgbTransferFunc}
                  onChange={(e) => updateOption('srgbTransferFunc', e.target.checked)}
                />
                KTX2 sRGB transfer function
              </label>
            </div>

            {/* Debug Options */}
            <div className="option-group">
              <h4>Debug Options</h4>
              <label>
                <input
                  type="checkbox"
                  checked={options.debug}
                  onChange={(e) => updateOption('debug', e.target.checked)}
                />
                Debug output (See Dev Console)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.computeStats}
                  onChange={(e) => updateOption('computeStats', e.target.checked)}
                />
                Compute stats
              </label>
            </div>

            {/* Preset Buttons */}
            <div className="option-group">
              <h4>Presets</h4>
              <div className="preset-buttons">
                <button 
                  type="button"
                  onClick={() => setOptions({
                    ...defaultOptions,
                    format: BasisTextureFormat.cETC1S,
                    etc1sQuality: 128,
                    etc1sCompressionLevel: 1,
                    perceptual: true
                  })}
                >
                  ETC1S Balanced
                </button>
                <button 
                  type="button"
                  onClick={() => setOptions({
                    ...defaultOptions,
                    format: BasisTextureFormat.cUASTC4x4,
                    uastcLDRQuality: 2,
                    rdoUASTC: true,
                    rdoQuality: 1.5
                  })}
                >
                  UASTC High Quality
                </button>
                <button 
                  type="button"
                  onClick={() => setOptions({
                    ...defaultOptions,
                    format: BasisTextureFormat.cUASTC_HDR_4x4,
                    uastcHDRQuality: 2
                  })}
                >
                  HDR Mode
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="convert-btn"
            onClick={convertToKTX2}
            disabled={!selectedFile || isConverting}
          >
            {isConverting ? '🔄 Converting...' : '🔄 Convert to KTX2'}
          </button>
          <button className="cancel-btn" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}; 