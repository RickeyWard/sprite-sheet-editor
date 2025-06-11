import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/png') || file.type === 'application/json'
    );
    onFilesAdded(validFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'application/json': ['.json']
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
          <p>Drop PNG or JSON files here...</p>
        ) : (
          <div>
            <p>Drag and drop PNG or JSON files here, or click to select</p>
            <div className="file-format-info">
              <small>
                • PNG images: Individual sprite frames<br/>
                • JSON files: With base64 images or frame data<br/>
                • PNG + JSON pairs: TexturePacker/Pixi.js format
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