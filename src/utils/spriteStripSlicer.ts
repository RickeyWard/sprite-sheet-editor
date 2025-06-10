import type { SpriteFrame } from '../types';

export interface SliceConfig {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  spacing: number;
  margin: number;
}

export function detectPotentialSpriteStrip(image: HTMLImageElement): boolean {
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

export function suggestSliceConfig(image: HTMLImageElement): SliceConfig {
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
      margin: 0
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
      margin: 0
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
      margin: 0
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
        
        canvas.width = config.frameWidth;
        canvas.height = config.frameHeight;
        
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
        
        ctx.drawImage(
          image,
          sourceX, sourceY, config.frameWidth, config.frameHeight,
          0, 0, config.frameWidth, config.frameHeight
        );
        
        // Convert canvas to image
        const frameImage = new Image();
        frameImage.onload = () => {
          const frameNumber = row * config.columns + col + 1;
          const frame: SpriteFrame = {
            id: crypto.randomUUID(),
            name: `${baseName}_${frameNumber.toString().padStart(2, '0')}`,
            image: frameImage,
            width: config.frameWidth,
            height: config.frameHeight
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