/**
 * JSON Decoder for Sprite Sheet Data
 * 
 * Supported JSON formats:
 * 
 * 1. PixiJS format with base64 encoded image in meta:
 * {
 *   "frames": {
 *     "sprite1.png": { 
 *       "frame": { "x": 0, "y": 0, "w": 32, "h": 32 },
 *       "rotated": false,
 *       "trimmed": false,
 *       "spriteSourceSize": { "x": 0, "y": 0, "w": 32, "h": 32 },
 *       "sourceSize": { "w": 32, "h": 32 }
 *     }
 *   },
 *   "animations": {
 *     "walk": ["sprite1.png", "sprite2.png"]
 *   },
 *   "meta": {
 *     "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77ZgAAAABJRU5ErkJggg==",
 *     "size": { "w": 512, "h": 512 },
 *     "scale": "1"
 *   }
 * }
 * 
 * 2. JSON for use with separate image file (TexturePacker/Pixi.js format):
 * {
 *   "frames": {
 *     "sprite1": { "frame": { "x": 0, "y": 0, "w": 32, "h": 32 } },
 *     "sprite2": { "frame": { "x": 32, "y": 0, "w": 32, "h": 32 } }
 *   },
 *   "animations": {
 *     "walk": ["sprite1", "sprite2"]
 *   },
 *   "meta": {
 *     "image": "spritesheet.png",
 *     "size": { "w": 512, "h": 512 },
 *     "scale": "1"
 *   }
 * }
 */

import type { SpriteFrame, Animation } from '../types';

export interface SpritesheetData {
  frames: SpriteFrame[];
  animations: Animation[];
  image?: string; // base64 encoded image
}

export function loadImageFromBase64(base64Data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image from base64 data'));
    };
    
    // Ensure the base64 data has the proper prefix
    if (!base64Data.startsWith('data:image/')) {
      base64Data = `data:image/png;base64,${base64Data}`;
    }
    
    img.src = base64Data;
  });
}

export async function decodeSpritesheetJSON(file: File): Promise<SpritesheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Check if this is a valid spritesheet JSON
        if (!jsonData || typeof jsonData !== 'object') {
          throw new Error('Invalid JSON format');
        }
        
        const frames: SpriteFrame[] = [];
        const animations: Animation[] = [];
        
        // Handle different JSON formats
        if ((jsonData.image || (jsonData.meta && jsonData.meta.image)) && jsonData.frames) {
          // Format with base64 image and frame data (supports both root level and meta.image)
          const imageData = jsonData.image || jsonData.meta.image;
          const baseImage = await loadImageFromBase64(imageData);
          
          // Parse frames from JSON data
          if (Array.isArray(jsonData.frames)) {
            // Simple array format
            for (const frameData of jsonData.frames) {
              const frame = await createSpriteFrameFromFrameData(frameData, baseImage);
              if (frame) frames.push(frame);
            }
          } else if (typeof jsonData.frames === 'object') {
            // Object format (PixiJS/TexturePacker format)
            for (const [frameName, frameData] of Object.entries(jsonData.frames)) {
              const frame = await createSpriteFrameFromFrameData(frameData, baseImage, frameName);
              if (frame) frames.push(frame);
            }
          }
          
          // Parse animations if present
          if (jsonData.animations && typeof jsonData.animations === 'object') {
            for (const [animName, animData] of Object.entries(jsonData.animations)) {
              const animation = createAnimationFromData(animName, animData as any, frames);
              if (animation) animations.push(animation);
            }
          }
        } else if (jsonData.frames && Array.isArray(jsonData.frames)) {
          // Format with individual frame data containing base64 images
          for (const frameData of jsonData.frames) {
            if (frameData.image || frameData.base64) {
              const imageData = frameData.image || frameData.base64;
              const image = await loadImageFromBase64(imageData);
              
              const frame: SpriteFrame = {
                id: frameData.id || crypto.randomUUID(),
                name: frameData.name || `frame_${frames.length}`,
                image,
                width: frameData.width || image.width,
                height: frameData.height || image.height,
                x: frameData.x,
                y: frameData.y
              };
              
              frames.push(frame);
            }
          }
          
          // Parse animations if present
          if (jsonData.animations && Array.isArray(jsonData.animations)) {
            for (const animData of jsonData.animations) {
              const animation: Animation = {
                id: animData.id || crypto.randomUUID(),
                name: animData.name || `animation_${animations.length}`,
                frameIds: animData.frameIds || []
              };
              animations.push(animation);
            }
          }
        }
        
        if (frames.length === 0) {
          throw new Error('No valid frames found in JSON data. Please check the format.');
        }
        
        resolve({ frames, animations, image: jsonData.image });
        
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

async function createSpriteFrameFromFrameData(
  frameData: any, 
  baseImage: HTMLImageElement, 
  frameName?: string
): Promise<SpriteFrame | null> {
  try {
    // Handle different frame data formats
    let x = 0, y = 0, width = baseImage.width, height = baseImage.height;
    let rotated = false;
    let trimmed = false;
    let sourceSize: { w: number; h: number } | undefined;
    let spriteSourceSize: { x: number; y: number; w: number; h: number } | undefined;
    
    if (frameData.frame) {
      // PixiJS/TexturePacker format
      x = frameData.frame.x || 0;
      y = frameData.frame.y || 0;
      width = frameData.frame.w || frameData.frame.width || baseImage.width;
      height = frameData.frame.h || frameData.frame.height || baseImage.height;
      
      // Handle PixiJS specific properties
      rotated = frameData.rotated || false;
      trimmed = frameData.trimmed || false;
      
      if (frameData.sourceSize) {
        sourceSize = {
          w: frameData.sourceSize.w || frameData.sourceSize.width || width,
          h: frameData.sourceSize.h || frameData.sourceSize.height || height
        };
      }
      
      if (frameData.spriteSourceSize) {
        spriteSourceSize = {
          x: frameData.spriteSourceSize.x || 0,
          y: frameData.spriteSourceSize.y || 0,
          w: frameData.spriteSourceSize.w || frameData.spriteSourceSize.width || width,
          h: frameData.spriteSourceSize.h || frameData.spriteSourceSize.height || height
        };
      }
      
    } else {
      // Simple format
      x = frameData.x || 0;
      y = frameData.y || 0;
      width = frameData.width || frameData.w || baseImage.width;
      height = frameData.height || frameData.h || baseImage.height;
      
      // Handle simple format equivalents
      if (frameData.sourceSize || frameData.originalWidth || frameData.originalHeight) {
        sourceSize = {
          w: frameData.sourceSize?.w || frameData.originalWidth || width,
          h: frameData.sourceSize?.h || frameData.originalHeight || height
        };
      }
    }
    
    // Create a canvas to reconstruct the frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Use sourceSize for canvas dimensions if available, otherwise use frame size
    const canvasWidth = sourceSize ? sourceSize.w : (rotated ? height : width);
    const canvasHeight = sourceSize ? sourceSize.h : (rotated ? width : height);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Calculate where to draw the frame within the canvas
    let drawX = 0;
    let drawY = 0;
    let drawWidth = width;
    let drawHeight = height;
    
    if (spriteSourceSize && sourceSize) {
      // Use spriteSourceSize to position the frame correctly within the original bounds
      drawX = spriteSourceSize.x;
      drawY = spriteSourceSize.y;
      drawWidth = spriteSourceSize.w;
      drawHeight = spriteSourceSize.h;
    }
    
    // Handle rotation if needed
    if (rotated) {
      ctx.save();
      ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(baseImage, x, y, width, height, -drawHeight / 2, -drawWidth / 2, drawHeight, drawWidth);
      ctx.restore();
    } else {
      ctx.drawImage(baseImage, x, y, width, height, drawX, drawY, drawWidth, drawHeight);
    }
    
    // Convert canvas to image
    const frameImage = new Image();
    await new Promise<void>((resolve, reject) => {
      frameImage.onload = () => resolve();
      frameImage.onerror = () => reject(new Error('Failed to create frame image'));
      frameImage.src = canvas.toDataURL('image/png');
    });
    
    // Clean up frame name (remove file extensions if present)
    const cleanFrameName = (frameName || frameData.name || `frame_${Date.now()}_${Math.random().toString(16).slice(2)}`)
      .replace(/\.(png|jpg|jpeg|gif|bmp)$/i, '');
    
    return {
      id: frameData.id || crypto.randomUUID(),
      name: cleanFrameName,
      image: frameImage,
      width: canvasWidth,
      height: canvasHeight,
      x,
      y
      // PixiJS properties discarded - sprite is now reconstructed and "clean"
    };
  } catch (error) {
    console.error('Error creating sprite frame:', error);
    return null;
  }
}

function createAnimationFromData(
  animName: string, 
  animData: any, 
  frames: SpriteFrame[]
): Animation | null {
  try {
    let frameIds: string[] = [];
    
    if (Array.isArray(animData)) {
      // Array of frame names or indices
      frameIds = animData.map((item) => {
        if (typeof item === 'string') {
          // Try to find frame by name
          const frame = frames.find(f => f.name === item);
          return frame ? frame.id : item;
        } else if (typeof item === 'number') {
          // Frame index
          return frames[item]?.id || '';
        }
        return '';
      }).filter(id => id !== '');
    } else if (animData.frameIds) {
      frameIds = animData.frameIds;
    } else if (animData.frames) {
      // Array of frame references
      frameIds = animData.frames.map((item: any) => {
        if (typeof item === 'string') {
          const frame = frames.find(f => f.name === item);
          return frame ? frame.id : item;
        }
        return item;
      }).filter((id: string) => id !== '');
    }
    
    if (frameIds.length === 0) return null;
    
    return {
      id: animData.id || crypto.randomUUID(),
      name: animName,
      frameIds
    };
  } catch (error) {
    console.error('Error creating animation:', error);
    return null;
  }
}

export async function handleImageWithJSON(imageFile: File, jsonFile: File): Promise<SpritesheetData> {
  // Load the image
  const image = new Image();
  const imageUrl = URL.createObjectURL(imageFile);
  
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve();
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image'));
    };
    image.src = imageUrl;
  });
  
  // Parse the JSON file
  const jsonData = await new Promise<any>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read JSON file'));
    reader.readAsText(jsonFile);
  });
  
  const frames: SpriteFrame[] = [];
  const animations: Animation[] = [];
  
  // Parse frames from JSON data using the loaded image
  if (jsonData.frames) {
    if (Array.isArray(jsonData.frames)) {
      // Simple array format
      for (const frameData of jsonData.frames) {
        const frame = await createSpriteFrameFromFrameData(frameData, image);
        if (frame) frames.push(frame);
      }
    } else if (typeof jsonData.frames === 'object') {
      // Object format (like TexturePacker/Pixi.js format)
      for (const [frameName, frameData] of Object.entries(jsonData.frames)) {
        const frame = await createSpriteFrameFromFrameData(frameData, image, frameName);
        if (frame) frames.push(frame);
      }
    }
  }
  
  // Parse animations if present
  if (jsonData.animations && typeof jsonData.animations === 'object') {
    for (const [animName, animData] of Object.entries(jsonData.animations)) {
      const animation = createAnimationFromData(animName, animData as any, frames);
      if (animation) animations.push(animation);
    }
  }
  
  return { frames, animations };
} 