import type { SpriteFrame, PackedSheet, PixiSpritesheet, Animation, PackingOptions } from '../types';
import { createTrimmedSpriteAsync, addPaddingToSprite } from './imageTrimmer';

interface PackedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  frame: SpriteFrame;
}

// Simple bin packing algorithm
class BinPacker {
  private root: Node | null = null;

  constructor(private width: number, private height: number) {}

  pack(frames: SpriteFrame[]): PackedRect[] {
    this.root = { x: 0, y: 0, width: this.width, height: this.height, used: false, right: null, down: null };
    const packed: PackedRect[] = [];

    for (const frame of frames) {
      const node = this.findNode(this.root, frame.width, frame.height);
      if (node) {
        const fit = this.splitNode(node, frame.width, frame.height);
        packed.push({
          x: fit.x,
          y: fit.y,
          width: frame.width,
          height: frame.height,
          frame
        });
      }
    }

    return packed;
  }

  private findNode(root: Node | null, width: number, height: number): Node | null {
    if (!root) return null;
    if (root.used) {
      return this.findNode(root.right, width, height) || this.findNode(root.down, width, height);
    } else if (width <= root.width && height <= root.height) {
      return root;
    } else {
      return null;
    }
  }

  private splitNode(node: Node, width: number, height: number): Node {
    node.used = true;
    node.down = {
      x: node.x,
      y: node.y + height,
      width: node.width,
      height: node.height - height,
      used: false,
      right: null,
      down: null
    };
    node.right = {
      x: node.x + width,
      y: node.y,
      width: node.width - width,
      height: height,
      used: false,
      right: null,
      down: null
    };
    return node;
  }
}

interface Node {
  x: number;
  y: number;
  width: number;
  height: number;
  used: boolean;
  right: Node | null;
  down: Node | null;
}

export async function packSprites(
  frames: SpriteFrame[], 
  animations: Animation[], 
  maxWidth: number = 2048, 
  maxHeight: number = 2048, 
  options: PackingOptions = {
    spacing: 2,
    trimWhitespace: false,
    forcePowerOf2: true,
    padding: 1,
    allowRotation: false
  }
): Promise<PackedSheet | null> {
  if (frames.length === 0) return null;

  // Process frames based on options
  let processedFrames = frames;
  
  if (options.trimWhitespace) {
    // Trim whitespace from all frames
    processedFrames = await Promise.all(
      frames.map(frame => createTrimmedSpriteAsync(frame, options.padding))
    );
  } else if (options.padding > 0) {
    // Apply padding without trimming
    processedFrames = await Promise.all(
      frames.map(frame => addPaddingToSprite(frame, options.padding))
    );
  }

  // Calculate optimal canvas size including spacing
  const spacedFrames = processedFrames.map(frame => ({
    ...frame,
    width: frame.width + options.spacing,
    height: frame.height + options.spacing
  }));
  
  const totalArea = spacedFrames.reduce((sum, frame) => sum + frame.width * frame.height, 0);
  const maxDimension = Math.max(...spacedFrames.map(f => Math.max(f.width, f.height)));
  let size = Math.max(Math.ceil(Math.sqrt(totalArea)), maxDimension);
  
  if (options.forcePowerOf2) {
    // Round up to next power of 2
    size = Math.pow(2, Math.ceil(Math.log2(size)));
  }
  
  // Ensure we don't exceed max dimensions
  size = Math.min(size, Math.min(maxWidth, maxHeight));

  let packed: PackedRect[] = [];
  let attempts = 0;
  const maxAttempts = 10;
  
  let currentWidth = size;
  let currentHeight = size;

  // Try packing with increasing canvas sizes
  while (packed.length < spacedFrames.length && attempts < maxAttempts) {
    const packer = new BinPacker(currentWidth, currentHeight);
    packed = packer.pack(spacedFrames);
    
    if (packed.length < spacedFrames.length) {
      // Try expanding width first, then height
      if (currentWidth < maxWidth && (currentWidth <= currentHeight || currentHeight >= maxHeight)) {
        currentWidth = options.forcePowerOf2 
          ? Math.min(currentWidth * 2, maxWidth)
          : Math.min(Math.ceil(currentWidth * 1.5), maxWidth);
      } else if (currentHeight < maxHeight) {
        currentHeight = options.forcePowerOf2
          ? Math.min(currentHeight * 2, maxHeight)
          : Math.min(Math.ceil(currentHeight * 1.5), maxHeight);
      } else {
        // Can't expand further, break
        break;
      }
    }
    attempts++;
  }

  if (packed.length < spacedFrames.length) {
    console.error('Could not pack all sprites');
    return null;
  }

  // Create canvas and draw sprites
  const canvas = document.createElement('canvas');
  canvas.width = currentWidth;
  canvas.height = currentHeight;
  const ctx = canvas.getContext('2d')!;

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, currentWidth, currentHeight);

  const spritesheetFrames: Record<string, any> = {};

  // Draw each sprite and record its position
  for (const rect of packed) {
    const originalFrame = frames.find(f => f.id === rect.frame.id);
    if (!originalFrame) continue;
    
    // Draw the actual image (without spacing)
    const drawWidth = rect.frame.width - options.spacing;
    const drawHeight = rect.frame.height - options.spacing;
    ctx.drawImage(rect.frame.image, rect.x, rect.y, drawWidth, drawHeight);
    
    // Handle trimmed vs non-trimmed sprites and padding
    const isTrimmed = options.trimWhitespace && 'trimData' in rect.frame;
    const isPadded = !isTrimmed && options.padding > 0;
    const trimData = isTrimmed ? (rect.frame as any).trimData : null;
    const originalSize = isTrimmed ? (rect.frame as any).originalSize : { width: originalFrame.width, height: originalFrame.height };
    
    spritesheetFrames[rect.frame.name] = {
      frame: {
        x: rect.x,
        y: rect.y,
        w: drawWidth,
        h: drawHeight
      },
      rotated: false,
      trimmed: isTrimmed,
      spriteSourceSize: {
        x: trimData ? trimData.x : (isPadded ? -options.padding : 0),
        y: trimData ? trimData.y : (isPadded ? -options.padding : 0),
        w: drawWidth,
        h: drawHeight
      },
      sourceSize: {
        w: originalSize.width,
        h: originalSize.height
      }
    };
  }

  // Create animations mapping
  const animationsMap: Record<string, string[]> = {};
  for (const animation of animations) {
    const frameNames = animation.frameIds
      .map(id => frames.find(f => f.id === id)?.name)
      .filter(Boolean) as string[];
    if (frameNames.length > 0) {
      animationsMap[animation.name] = frameNames;
    }
  }

  const spritesheet: PixiSpritesheet = {
    frames: spritesheetFrames,
    animations: animationsMap,
    meta: {
      app: 'Spritesheet Editor',
      version: '1.0.0',
      image: 'spritesheet.png',
      format: 'RGBA8888',
      size: {
        w: currentWidth,
        h: currentHeight
      },
      scale: '1'
    }
  };

  return {
    canvas,
    spritesheet
  };
} 