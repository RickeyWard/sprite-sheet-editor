import React, { useState } from 'react';
import { initBasisEncoderGlobal, type BasisEncoder } from '../libs/basis-encoder-wrapper';
import { BasisTextureFormat } from '../libs/basis_encoder';

interface KTX2ConverterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KTX2Converter: React.FC<KTX2ConverterProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

      // Configure encoder settings
      encoder.controlThreading(false, 4);
      encoder.setCreateKTX2File(true);
      encoder.setKTX2UASTCSupercompression(true);
      encoder.setKTX2SRGBTransferFunc(true);
      encoder.setMipSRGB(true);
      encoder.setPerceptual(true);
      encoder.setFormatMode(BasisTextureFormat.cUASTC4x4); // UASTC mode
      encoder.setPackUASTCFlags(3); // 0-4. 4 is very slow.

      // RDO, no idea what RDO is
      //encoder.setRDOUASTC(true);
      //encoder.setRDOUASTCQualityScalar(10); // 0-10.0

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

          {selectedFile && (
            <div className="conversion-settings">
              <h3>Conversion Settings</h3>
              <ul>
                <li>Format: UASTC (High quality)</li>
                <li>Quality Level: 128 (High)</li>
                <li>Super Compression: Enabled</li>
                <li>sRGB Transfer: Enabled</li>
              </ul>
            </div>
          )}
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