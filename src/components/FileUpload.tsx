import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/png'));
    onFilesAdded(imageFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png']
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
          <p>Drop PNG files here...</p>
        ) : (
          <div>
            <p>Drag and drop PNG files here, or click to select</p>
            <button type="button" className="upload-btn">
              Choose Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 