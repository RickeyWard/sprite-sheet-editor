import React from 'react';
import type { PackingOptions } from '../types';

interface PackingSettingsProps {
  options: PackingOptions;
  onOptionsChange: (options: PackingOptions) => void;
}

export const PackingSettings: React.FC<PackingSettingsProps> = ({
  options,
  onOptionsChange
}) => {
  const handleChange = (key: keyof PackingOptions, value: number | boolean | string) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  const handlePreset = (preset: 'preserve' | 'tight' | 'standard' | 'loose') => {
    const presets: Record<string, PackingOptions> = {
              tight: {
          spacing: 0,
          trimWhitespace: true,
          forcePowerOf2: true,
          allowRotation: false,
          layout: 'compact'
        },
        standard: {
          spacing: 2,
          trimWhitespace: false,
          forcePowerOf2: true,
          allowRotation: false,
          layout: 'compact'
        },
        loose: {
          spacing: 4,
          trimWhitespace: false,
          forcePowerOf2: false,
          allowRotation: false,
          layout: 'compact'
        },
        preserve: {
          spacing: 0,
          trimWhitespace: false,
          forcePowerOf2: false,
          allowRotation: false,
          layout: 'by-animation'
        }
    };
    onOptionsChange(presets[preset]);
  };

  return (
    <div className="packing-settings">
      <h3>Packing Options</h3>
      
      <div className="preset-buttons">
        <span>Quick Presets:</span>
        <button 
          onClick={() => handlePreset('preserve')} 
          className="preset-option-btn preserve-preset"
          title="Keep original dimensions, minimal spacing, no trimming"
        >
          Preserve
        </button>
        <button 
          onClick={() => handlePreset('tight')} 
          className="preset-option-btn"
          title="No spacing, trim whitespace, power-of-2"
        >
          Tight
        </button>
        <button 
          onClick={() => handlePreset('standard')} 
          className="preset-option-btn"
          title="2px spacing, power-of-2"
        >
          Standard
        </button>
        <button 
          onClick={() => handlePreset('loose')} 
          className="preset-option-btn"
          title="4px spacing, flexible size"
        >
          Loose
        </button>
      </div>

      <div className="packing-options-grid">
        <div className="option-group">
          <label htmlFor="spacing">
            Spacing between sprites:
            <span className="option-value">{options.spacing}px</span>
          </label>
          <input
            id="spacing"
            type="range"
            min="0"
            max="20"
            value={options.spacing}
            onChange={(e) => handleChange('spacing', parseInt(e.target.value))}
            className="option-slider"
          />
        </div>


        <div className="option-group radio-group">
          <span className="radio-group-title">Sprite Dimensions:</span>
          <label>
            <input
              type="radio"
              name="trimWhitespace"
              checked={!options.trimWhitespace}
              onChange={() => handleChange('trimWhitespace', false)}
            />
            <span className="radio-label">
              Keep original sprite dimensions
              <small>Don't trim transparent pixels - preserve exact image size</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="trimWhitespace"
              checked={options.trimWhitespace}
              onChange={() => handleChange('trimWhitespace', true)}
            />
            <span className="radio-label">
              Trim transparent pixels
              <small>Remove empty space around sprites for efficiency</small>
            </span>
          </label>
        </div>

        <div className="option-group radio-group">
          <span className="radio-group-title">Packing Layout:</span>
          <label>
            <input
              type="radio"
              name="layout"
              checked={options.layout === 'compact'}
              onChange={() => handleChange('layout', 'compact')}
            />
            <span className="radio-label">
              Compact
              <small>Optimal space usage with bin packing algorithm</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="layout"
              checked={options.layout === 'horizontal'}
              onChange={() => handleChange('layout', 'horizontal')}
            />
            <span className="radio-label">
              Horizontal
              <small>Arrange sprites in rows from left to right</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="layout"
              checked={options.layout === 'vertical'}
              onChange={() => handleChange('layout', 'vertical')}
            />
            <span className="radio-label">
              Vertical
              <small>Arrange sprites in columns from top to bottom</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="layout"
              checked={options.layout === 'by-animation'}
              onChange={() => handleChange('layout', 'by-animation')}
            />
            <span className="radio-label">
              By Animation
              <small>Each animation gets its own horizontal row</small>
            </span>
          </label>
        </div>

        <div className="option-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={options.forcePowerOf2}
              onChange={(e) => handleChange('forcePowerOf2', e.target.checked)}
            />
            <span className="checkbox-label">
              Force power-of-2 dimensions
              <small>Canvas size will be 512, 1024, 2048, etc.</small>
            </span>
          </label>
        </div>

        <div className="option-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={options.allowRotation}
              onChange={(e) => handleChange('allowRotation', e.target.checked)}
            />
            <span className="checkbox-label">
              Allow sprite rotation
              <small>Rotate sprites 90° for better packing (experimental)</small>
            </span>
          </label>
        </div>
      </div>

      <div className="packing-info">
        <div className="info-item">
          <strong>Current Settings:</strong>
        </div>
        <div className="info-item">
          <span>Spacing: {options.spacing}px</span>
          <span>Layout: {options.layout}</span>
        </div>
        <div className="info-item">
          <span>Original size: {options.trimWhitespace ? 'No' : 'Yes'}</span>
          <span>Power-of-2: {options.forcePowerOf2 ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );
}; 