import type { SpriteFrame } from '../types';

/**
 * Analyzes a frame to determine if it's completely transparent
 */
export function isFrameCompletelyTransparent(frame: SpriteFrame): boolean {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return false;
  
  canvas.width = frame.width;
  canvas.height = frame.height;
  
  // Draw the frame to the canvas
  ctx.drawImage(frame.image, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
  const data = imageData.data;
  
  // Check if all pixels are transparent (alpha = 0)
  for (let i = 3; i < data.length; i += 4) { // Every 4th value is alpha
    if (data[i] > 0) { // Found a non-transparent pixel
      return false;
    }
  }
  
  return true;
}

/**
 * Analyzes a frame to determine if it's a solid single color
 */
export function isFrameSolidColor(frame: SpriteFrame): boolean {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return false;
  
  canvas.width = frame.width;
  canvas.height = frame.height;
  
  // Draw the frame to the canvas
  ctx.drawImage(frame.image, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
  const data = imageData.data;
  
  if (data.length === 0) return false;
  
  // Get the first pixel's color (RGBA)
  let firstR = data[0];
  let firstG = data[1];
  let firstB = data[2];
  let firstA = data[3];
  
  // Find the first non-transparent pixel if the first pixel is transparent
  let foundNonTransparent = firstA > 0;
  if (!foundNonTransparent) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // Found non-transparent pixel
        firstR = data[i];
        firstG = data[i + 1];
        firstB = data[i + 2];
        firstA = data[i + 3];
        foundNonTransparent = true;
        break;
      }
    }
  }
  
  // If all pixels are transparent, it's not a solid color (it's transparent)
  if (!foundNonTransparent) {
    return false;
  }
  
  // Check if all non-transparent pixels have the same color
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    
    // Skip transparent pixels
    if (alpha === 0) continue;
    
    // Check if this pixel matches the reference color
    if (data[i] !== firstR || data[i + 1] !== firstG || data[i + 2] !== firstB || data[i + 3] !== firstA) {
      return false;
    }
  }
  
  return true;
}

/**
 * Combines both checks - returns true if frame is either completely transparent or solid color
 */
export function isFrameEmptyOrSolid(frame: SpriteFrame): boolean {
  return isFrameCompletelyTransparent(frame) || isFrameSolidColor(frame);
}

/**
 * Analyzes multiple frames and returns information about which ones are empty or solid
 */
export function analyzeFrames(frames: SpriteFrame[]): {
  transparent: SpriteFrame[];
  solidColor: SpriteFrame[];
  emptyOrSolid: SpriteFrame[];
  total: number;
} {
  const transparent: SpriteFrame[] = [];
  const solidColor: SpriteFrame[] = [];
  const emptyOrSolid: SpriteFrame[] = [];
  
  for (const frame of frames) {
    const isTransparent = isFrameCompletelyTransparent(frame);
    const isSolid = !isTransparent && isFrameSolidColor(frame);
    
    if (isTransparent) {
      transparent.push(frame);
      emptyOrSolid.push(frame);
    } else if (isSolid) {
      solidColor.push(frame);
      emptyOrSolid.push(frame);
    }
  }
  
  return {
    transparent,
    solidColor,
    emptyOrSolid,
    total: frames.length
  };
} 