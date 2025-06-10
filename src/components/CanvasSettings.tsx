import React from 'react';

interface CanvasSettingsProps {
  maxWidth: number;
  maxHeight: number;
  onMaxWidthChange: (width: number) => void;
  onMaxHeightChange: (height: number) => void;
}

const PRESET_SIZES = [
  { label: '128×128', width: 128, height: 128 },
  { label: '256×256', width: 256, height: 256 },
  { label: '512×512', width: 512, height: 512 },
  { label: '1024×1024', width: 1024, height: 1024 },
  { label: '2048×2048', width: 2048, height: 2048 },
  { label: '4096×4096', width: 4096, height: 4096 },
  { label: '1024×512', width: 1024, height: 512 },
  { label: '2048×1024', width: 2048, height: 1024 },
  { label: '4096×2048', width: 4096, height: 2048 },
  { label: '4096×4096', width: 4096, height: 4096 },
];

export const CanvasSettings: React.FC<CanvasSettingsProps> = ({
  maxWidth,
  maxHeight,
  onMaxWidthChange,
  onMaxHeightChange
}) => {
  const handlePresetSelect = (width: number, height: number) => {
    onMaxWidthChange(width);
    onMaxHeightChange(height);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 512;
    onMaxWidthChange(Math.max(8, Math.min(8192, value)));
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 512;
    onMaxHeightChange(Math.max(8, Math.min(8192, value)));
  };

  return (
    <div className="canvas-settings">
      <h3>Canvas Settings</h3>
      
      <div className="settings-grid">
        <div className="setting-item">
          <label htmlFor="max-width">Max Width:</label>
          <input
            id="max-width"
            type="number"
            min="8"
            max="8192"
            step="16"
            value={maxWidth}
            onChange={handleWidthChange}
            className="dimension-input"
          />
        </div>
        
        <div className="setting-item">
          <label htmlFor="max-height">Max Height:</label>
          <input
            id="max-height"
            type="number"
            min="8"
            max="8192"
            step="16"
            value={maxHeight}
            onChange={handleHeightChange}
            className="dimension-input"
          />
        </div>
      </div>

      <div className="presets">
        <label>Quick Presets:</label>
        <div className="preset-buttons">
          {PRESET_SIZES.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetSelect(preset.width, preset.height)}
              className={`preset-btn ${
                maxWidth === preset.width && maxHeight === preset.height ? 'active' : ''
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="current-settings">
        <span>Current max size: {maxWidth} × {maxHeight}</span>
      </div>
    </div>
  );
}; 