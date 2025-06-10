import type { SpriteFrame } from '../types';

interface TrimData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getTrimBounds(image: HTMLImageElement): TrimData {
  // Create a temporary canvas to analyze the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  
  // Find the bounds of non-transparent pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];
      
      if (alpha > 0) { // Non-transparent pixel
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  // If no non-transparent pixels found, return full bounds
  if (minX >= canvas.width) {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

export function createTrimmedSprite(originalFrame: SpriteFrame, padding: number = 0): SpriteFrame & { trimData: TrimData; originalSize: { width: number; height: number } } {
  const trimBounds = getTrimBounds(originalFrame.image);
  
  // Add padding to the trim bounds
  const paddedBounds = {
    x: Math.max(0, trimBounds.x - padding),
    y: Math.max(0, trimBounds.y - padding),
    width: Math.min(originalFrame.width - Math.max(0, trimBounds.x - padding), trimBounds.width + padding * 2),
    height: Math.min(originalFrame.height - Math.max(0, trimBounds.y - padding), trimBounds.height + padding * 2)
  };
  
  // Create new canvas with trimmed size
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = paddedBounds.width;
  canvas.height = paddedBounds.height;
  
  // Draw the trimmed portion
  ctx.drawImage(
    originalFrame.image,
    paddedBounds.x, paddedBounds.y, paddedBounds.width, paddedBounds.height,
    0, 0, paddedBounds.width, paddedBounds.height
  );
  
  // Create a new image from the trimmed canvas
  const trimmedImage = new Image();
  trimmedImage.src = canvas.toDataURL();
  
  return {
    ...originalFrame,
    image: trimmedImage,
    width: paddedBounds.width,
    height: paddedBounds.height,
    trimData: trimBounds,
    originalSize: { width: originalFrame.width, height: originalFrame.height }
  };
}

export async function createTrimmedSpriteAsync(originalFrame: SpriteFrame, padding: number = 0): Promise<SpriteFrame & { trimData: TrimData; originalSize: { width: number; height: number } }> {
  return new Promise((resolve) => {
    const trimBounds = getTrimBounds(originalFrame.image);
    
    // Add padding to the trim bounds
    const paddedBounds = {
      x: Math.max(0, trimBounds.x - padding),
      y: Math.max(0, trimBounds.y - padding),
      width: Math.min(originalFrame.width - Math.max(0, trimBounds.x - padding), trimBounds.width + padding * 2),
      height: Math.min(originalFrame.height - Math.max(0, trimBounds.y - padding), trimBounds.height + padding * 2)
    };
    
    // Create new canvas with trimmed size
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = paddedBounds.width;
    canvas.height = paddedBounds.height;
    
    // Draw the trimmed portion
    ctx.drawImage(
      originalFrame.image,
      paddedBounds.x, paddedBounds.y, paddedBounds.width, paddedBounds.height,
      0, 0, paddedBounds.width, paddedBounds.height
    );
    
    // Create a new image from the trimmed canvas
    const trimmedImage = new Image();
    trimmedImage.onload = () => {
      resolve({
        ...originalFrame,
        image: trimmedImage,
        width: paddedBounds.width,
        height: paddedBounds.height,
        trimData: trimBounds,
        originalSize: { width: originalFrame.width, height: originalFrame.height }
      });
    };
    trimmedImage.src = canvas.toDataURL();
  });
}

export async function addPaddingToSprite(originalFrame: SpriteFrame, padding: number): Promise<SpriteFrame> {
  return new Promise((resolve) => {
    // Create new canvas with padded size
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = originalFrame.width + padding * 2;
    canvas.height = originalFrame.height + padding * 2;
    
    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the original image centered with padding
    ctx.drawImage(originalFrame.image, padding, padding);
    
    // Create a new image from the padded canvas
    const paddedImage = new Image();
    paddedImage.onload = () => {
      resolve({
        ...originalFrame,
        image: paddedImage,
        width: canvas.width,
        height: canvas.height
      });
    };
    paddedImage.src = canvas.toDataURL();
  });
} 