import type { SpriteFrame } from '../types';

export interface SliceConfig {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  spacing: number;
  margin: number;
  paddingX: number;
  paddingY: number;
}

export function detectPotentialSpriteStrip(image: HTMLImageElement, filename?: string): boolean {
  // Check filename for "strip" pattern first - this takes priority
  if (filename && filename.toLowerCase().includes('strip')) {
    return true;
  }
  
  const aspectRatio = image.width / image.height;
  
  // Consider it a potential sprite strip if:
  // 1. Very wide (aspect ratio > 3) - horizontal strip
  // 2. Very tall (aspect ratio < 0.33) - vertical strip  
  // 3. Dimensions are multiples of common frame sizes
  return aspectRatio > 3 || aspectRatio < 0.33 || 
         (image.width % 32 === 0 && image.height % 32 === 0) ||
         (image.width % 64 === 0 && image.height % 64 === 0) ||
         (image.width % 16 === 0 && image.height % 16 === 0);
}

export function suggestSliceConfig(image: HTMLImageElement, filename?: string): SliceConfig {
  // Check filename for "strip" pattern and extract number
  if (filename) {
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('strip')) {
      // Look for pattern like "strip8", "strip12", etc.
      const stripMatch = lowerFilename.match(/strip(\d+)/);
      if (stripMatch) {
        const columns = parseInt(stripMatch[1], 10);
        return {
          columns: Math.max(1, Math.min(columns, 32)), // Clamp between 1 and 32
          rows: 1,
          frameWidth: Math.floor(image.width / Math.max(1, Math.min(columns, 32))),
          frameHeight: image.height,
          spacing: 0,
          margin: 0,
          paddingX: 0,
          paddingY: 0
        };
      } else {
        // If filename contains "strip" but no number, assume horizontal strip
        // Try to guess number of frames based on common frame sizes
        const commonFrameSizes = [16, 24, 32, 48, 64, 96, 128];
        let bestGuess = 1;
        
        for (const size of commonFrameSizes) {
          if (image.width % size === 0 && image.height <= size * 2) {
            bestGuess = Math.max(bestGuess, Math.floor(image.width / size));
          }
        }
        
        return {
          columns: Math.min(bestGuess, 16),
          rows: 1,
          frameWidth: Math.floor(image.width / Math.min(bestGuess, 16)),
          frameHeight: image.height,
          spacing: 0,
          margin: 0,
          paddingX: 0,
          paddingY: 0
        };
      }
    }
  }
  
  const aspectRatio = image.width / image.height;
  
  // Default suggestion based on aspect ratio
  if (aspectRatio > 3) {
    // Horizontal strip - guess number of frames
    const commonFrameSizes = [16, 24, 32, 48, 64, 96, 128];
    let bestGuess = 1;
    
    for (const size of commonFrameSizes) {
      if (image.width % size === 0 && image.height <= size * 2) {
        bestGuess = Math.max(bestGuess, Math.floor(image.width / size));
      }
    }
    
    return {
      columns: Math.min(bestGuess, 16),
      rows: 1,
      frameWidth: Math.floor(image.width / Math.min(bestGuess, 16)),
      frameHeight: image.height,
      spacing: 0,
      margin: 0,
      paddingX: 0,
      paddingY: 0
    };
  } else if (aspectRatio < 0.33) {
    // Vertical strip
    const commonFrameSizes = [16, 24, 32, 48, 64, 96, 128];
    let bestGuess = 1;
    
    for (const size of commonFrameSizes) {
      if (image.height % size === 0 && image.width <= size * 2) {
        bestGuess = Math.max(bestGuess, Math.floor(image.height / size));
      }
    }
    
    return {
      columns: 1,
      rows: Math.min(bestGuess, 16),
      frameWidth: image.width,
      frameHeight: Math.floor(image.height / Math.min(bestGuess, 16)),
      spacing: 0,
      margin: 0,
      paddingX: 0,
      paddingY: 0
    };
  } else {
    // Square-ish - might be a grid
    const size = Math.min(image.width, image.height);
    const cols = Math.floor(image.width / (size / 4));
    const rows = Math.floor(image.height / (size / 4));
    
    return {
      columns: Math.max(1, Math.min(cols, 8)),
      rows: Math.max(1, Math.min(rows, 8)),
      frameWidth: Math.floor(image.width / Math.max(1, Math.min(cols, 8))),
      frameHeight: Math.floor(image.height / Math.max(1, Math.min(rows, 8))),
      spacing: 0,
      margin: 0,
      paddingX: 0,
      paddingY: 0
    };
  }
}

export function sliceSpriteStrip(
  image: HTMLImageElement, 
  config: SliceConfig, 
  baseName: string
): Promise<SpriteFrame[]> {
  return new Promise((resolve) => {
    const frames: SpriteFrame[] = [];
    let completed = 0;
    const total = config.columns * config.rows;
    
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.columns; col++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        // Calculate final frame size including padding
        const finalFrameWidth = config.frameWidth + config.paddingX * 2;
        const finalFrameHeight = config.frameHeight + config.paddingY * 2;
        
        canvas.width = finalFrameWidth;
        canvas.height = finalFrameHeight;
        
        // Fill with transparent background
        ctx.clearRect(0, 0, finalFrameWidth, finalFrameHeight);
        
        const sourceX = config.margin + col * (config.frameWidth + config.spacing);
        const sourceY = config.margin + row * (config.frameHeight + config.spacing);
        
        // Check if source coordinates are within image bounds
        if (sourceX + config.frameWidth > image.width || 
            sourceY + config.frameHeight > image.height) {
          completed++;
          if (completed === total) {
            resolve(frames);
          }
          continue;
        }
        
        // Draw the image centered in the padded canvas
        const destX = config.paddingX;
        const destY = config.paddingY;
        
        ctx.drawImage(
          image,
          sourceX, sourceY, config.frameWidth, config.frameHeight,
          destX, destY, config.frameWidth, config.frameHeight
        );
        
        // Convert canvas to image
        const frameImage = new Image();
        frameImage.onload = () => {
          const frameNumber = row * config.columns + col + 1;
          const frame: SpriteFrame = {
            id: crypto.randomUUID(),
            name: `${baseName}_${frameNumber.toString().padStart(2, '0')}`,
            image: frameImage,
            width: finalFrameWidth,
            height: finalFrameHeight
          };
          
          frames.push(frame);
          completed++;
          
          if (completed === total) {
            // Sort frames by creation order
            frames.sort((a, b) => {
              const aNum = parseInt(a.name.split('_').pop() || '0');
              const bNum = parseInt(b.name.split('_').pop() || '0');
              return aNum - bNum;
            });
            resolve(frames);
          }
        };
        
        frameImage.src = canvas.toDataURL();
      }
    }
  });
} 