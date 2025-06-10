export interface SpriteFrame {
  id: string;
  name: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface Animation {
  id: string;
  name: string;
  frameIds: string[];
}

export interface PackedSprite {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize: {
    w: number;
    h: number;
  };
}

export interface PixiSpritesheet {
  frames: Record<string, PackedSprite>;
  animations: Record<string, string[]>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: {
      w: number;
      h: number;
    };
    scale: string;
  };
}

export interface PackedSheet {
  canvas: HTMLCanvasElement;
  spritesheet: PixiSpritesheet;
} 