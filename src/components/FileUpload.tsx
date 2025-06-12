import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/png') || 
      file.type === 'application/json' ||
      file.name.toLowerCase().endsWith('.ktx2') ||
      file.type === 'image/ktx2'
    );
    onFilesAdded(validFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'application/json': ['.json'],
      'image/ktx2': ['.ktx2'],
      'application/octet-stream': ['.ktx2'] // Some systems may serve KTX2 as binary
    },
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="dropzone-content">
        <div className="upload-icon">📁</div>
        {isDragActive ? (
          <p>Drop PNG, JSON, or KTX2 files here...</p>
        ) : (
          <div>
            <p>Drag and drop PNG, JSON, or KTX2 files here, or click to select</p>
            <div className="file-format-info">
              <small>
                <ul>
                  <li>PNG images: Individual sprite frames</li>
                  <li>KTX2 files: Compressed texture files (will be decoded)</li>
                  <li>JSON files: With base64 images or frame data</li>
                  <li>PNG/KTX2 + JSON pairs: TexturePacker/Pixi.js format with matching filenames</li>
                </ul>
              </small>
            </div>
            <button type="button" className="upload-btn">
              Choose Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 