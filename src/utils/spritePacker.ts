import type { SpriteFrame, PackedSheet, PixiSpritesheet, Animation, PackingOptions } from '../types';
import { createTrimmedSpriteAsync } from './imageTrimmer';

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
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

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

// Horizontal layout - arrange sprites in rows
function packHorizontal(
  frames: SpriteFrame[],
  initialWidth: number,
  initialHeight: number,
  maxWidth: number,
  maxHeight: number,
  options: PackingOptions
): PackedRect[] {
  const packed: PackedRect[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;

  for (const frame of frames) {
    // Check if we need to start a new row
    if (currentX + frame.width > maxWidth && currentX > 0) {
      currentX = 0;
      currentY += rowHeight;
      rowHeight = 0;
    }

    // Check if we exceed max height
    if (currentY + frame.height > maxHeight) {
      break; // Can't fit more sprites
    }

    packed.push({
      x: currentX,
      y: currentY,
      width: frame.width,
      height: frame.height,
      frame
    });

    currentX += frame.width;
    rowHeight = Math.max(rowHeight, frame.height);
  }

  return packed;
}

// Vertical layout - arrange sprites in columns
function packVertical(
  frames: SpriteFrame[],
  initialWidth: number,
  initialHeight: number,
  maxWidth: number,
  maxHeight: number,
  options: PackingOptions
): PackedRect[] {
  const packed: PackedRect[] = [];
  let currentX = 0;
  let currentY = 0;
  let columnWidth = 0;

  for (const frame of frames) {
    // Check if we need to start a new column
    if (currentY + frame.height > maxHeight && currentY > 0) {
      currentY = 0;
      currentX += columnWidth;
      columnWidth = 0;
    }

    // Check if we exceed max width
    if (currentX + frame.width > maxWidth) {
      break; // Can't fit more sprites
    }

    packed.push({
      x: currentX,
      y: currentY,
      width: frame.width,
      height: frame.height,
      frame
    });

    currentY += frame.height;
    columnWidth = Math.max(columnWidth, frame.width);
  }

  return packed;
}

// By-animation layout - one horizontal row per animation
function packByAnimation(
  frames: SpriteFrame[],
  animations: Animation[],
  initialWidth: number,
  initialHeight: number,
  maxWidth: number,
  maxHeight: number,
  options: PackingOptions
): PackedRect[] {
  const packed: PackedRect[] = [];
  let currentY = 0;

  // Group frames by animation
  const animationFrames: { animation: Animation; frames: SpriteFrame[] }[] = [];
  const usedFrameIds = new Set<string>();

  // Process each animation
  for (const animation of animations) {
    const animFrames = animation.frameIds
      .map(id => frames.find(f => f.id === id))
      .filter(Boolean) as SpriteFrame[];
    
    if (animFrames.length > 0) {
      animationFrames.push({ animation, frames: animFrames });
      animFrames.forEach(frame => usedFrameIds.add(frame.id));
    }
  }

  // Add orphaned frames (not part of any animation) as a separate group
  const orphanedFrames = frames.filter(frame => !usedFrameIds.has(frame.id));
  if (orphanedFrames.length > 0) {
    // Sort orphaned frames by name
    orphanedFrames.sort((a, b) => a.name.localeCompare(b.name));
    animationFrames.push({ 
      animation: { id: 'orphaned', name: 'Individual Frames', frameIds: [] }, 
      frames: orphanedFrames 
    });
  }

  // Pack each animation group as a horizontal row
  for (const { frames: animFrames } of animationFrames) {
    let currentX = 0;
    let rowHeight = 0;

    // Calculate row height
    rowHeight = Math.max(...animFrames.map(frame => frame.height));

    // Check if this row will fit
    if (currentY + rowHeight > maxHeight) {
      break; // Can't fit more rows
    }

    // Pack frames in this row
    for (const frame of animFrames) {
      // Check if frame fits in current row width
      if (currentX + frame.width > maxWidth) {
        break; // Skip frames that don't fit
      }

      packed.push({
        x: currentX,
        y: currentY,
        width: frame.width,
        height: frame.height,
        frame
      });

      currentX += frame.width;
    }

    // Move to next row
    currentY += rowHeight;
  }

  return packed;
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
    allowRotation: false,
    layout: 'compact'
  }
): Promise<PackedSheet | null> {
  if (frames.length === 0) return null;

  // Sort frames and animations based on layout
  let sortedFrames = [...frames];
  let sortedAnimations = [...animations];
  
  if (options.layout === 'by-animation') {
    // Sort animations by name
    sortedAnimations.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // For other layouts, sort frames by name
    sortedFrames.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Process frames based on options
  let processedFrames = sortedFrames;
  
  if (options.trimWhitespace) {
    // Trim whitespace from all frames
    processedFrames = await Promise.all(
      frames.map(frame => createTrimmedSpriteAsync(frame, 0))
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

  // Pack sprites using the selected layout algorithm
  if (options.layout === 'horizontal') {
    packed = packHorizontal(spacedFrames, currentWidth, currentHeight, maxWidth, maxHeight, options);
  } else if (options.layout === 'vertical') {
    packed = packVertical(spacedFrames, currentWidth, currentHeight, maxWidth, maxHeight, options);
  } else if (options.layout === 'by-animation') {
    packed = packByAnimation(spacedFrames, sortedAnimations, currentWidth, currentHeight, maxWidth, maxHeight, options);
  } else {
    // Compact layout - try packing with increasing canvas sizes
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
  }

  if (packed.length < spacedFrames.length) {
    console.error('Could not pack all sprites');
    return null;
  }

  // Calculate actual used dimensions
  let actualWidth = 0;
  let actualHeight = 0;
  for (const rect of packed) {
    const drawWidth = rect.frame.width - options.spacing;
    const drawHeight = rect.frame.height - options.spacing;
    actualWidth = Math.max(actualWidth, rect.x + drawWidth);
    actualHeight = Math.max(actualHeight, rect.y + drawHeight);
  }

  // Optionally round up to power of 2 if needed
  if (options.forcePowerOf2) {
    actualWidth = Math.pow(2, Math.ceil(Math.log2(actualWidth)));
    actualHeight = Math.pow(2, Math.ceil(Math.log2(actualHeight)));
  }

  // Create canvas with actual dimensions
  const canvas = document.createElement('canvas');
  canvas.width = actualWidth;
  canvas.height = actualHeight;
  const ctx = canvas.getContext('2d')!;

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, actualWidth, actualHeight);

  const spritesheetFrames: Record<string, any> = {};

  // Draw each sprite and record its position
  for (const rect of packed) {
    const originalFrame = frames.find(f => f.id === rect.frame.id);
    if (!originalFrame) continue;
    
    // Draw the actual image (without spacing)
    const drawWidth = rect.frame.width - options.spacing;
    const drawHeight = rect.frame.height - options.spacing;
    ctx.drawImage(rect.frame.image, rect.x, rect.y, drawWidth, drawHeight);
    
    // Handle trimmed vs non-trimmed sprites
    const isTrimmed = options.trimWhitespace && 'trimData' in rect.frame;
    const trimData = isTrimmed ? (rect.frame as any).trimData : null;
    const originalSize = isTrimmed ? (rect.frame as any).originalSize : { width: originalFrame.width, height: originalFrame.height };
    
    // Rotation should be based on current packing settings, not imported data
    const rotated = false; // TODO: implement rotation based on options.allowRotation
    
    // Trimmed state: use current processing state, not imported state
    const trimmed = isTrimmed;
    
    // Use original sprite dimensions
    const sourceSize = {
      w: originalSize.width,
      h: originalSize.height
    };
    
    // Always recompute spriteSourceSize based on current packing/trimming
    const spriteSourceSize = {
      x: trimData ? trimData.x : 0,
      y: trimData ? trimData.y : 0,
      w: trimData ? trimData.width : originalSize.width,
      h: trimData ? trimData.height : originalSize.height
    };
    
    spritesheetFrames[rect.frame.name] = {
      frame: {
        x: rect.x,
        y: rect.y,
        w: drawWidth,
        h: drawHeight
      },
      rotated,
      trimmed,
      spriteSourceSize,
      sourceSize
    };
  }

  // Create animations mapping
  const animationsMap: Record<string, string[]> = {};
  for (const animation of sortedAnimations) {
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
        w: actualWidth,
        h: actualHeight
      },
      scale: '1'
    }
  };

  return {
    canvas,
    spritesheet
  };
} 