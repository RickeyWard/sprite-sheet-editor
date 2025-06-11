// TypeScript module for Basis Universal Transcoder
// Generated from basis_transcoder.js Emscripten output

import wasmURL from './basis_transcoder.wasm?url';

// Declare global interface extensions
declare global {
  interface Window {
    BasisTranscoderModule: any;
    wasm_basis_transcoder_url?: string;
  }
}

// Basic types
export interface ModuleConfig {
  locateFile?: (path: string, scriptDirectory: string) => string;
  onRuntimeInitialized?: () => void;
  print?: (message: string) => void;
  printErr?: (message: string) => void;
  setStatus?: (status: string) => void;
  preInit?: (() => void) | (() => void)[];
  canvas?: HTMLCanvasElement;
  noInitialRun?: boolean;
  [key: string]: any;
}

// Transcoder-specific enums and constants
export enum TranscoderTextureFormat {
  // Compressed formats
  cTFETC1_RGB = 0,
  cTFETC2_RGBA = 1,
  cTFBC1_RGB = 2,
  cTFBC3_RGBA = 3,
  cTFBC4_R = 4,
  cTFBC5_RG = 5,
  cTFBC7_RGBA = 6,
  cTFPVRTC1_4_RGB = 8,
  cTFPVRTC1_4_RGBA = 9,
  cTFASTC_4x4_RGBA = 10,
  
  // Uncompressed formats
  cTFRGBA32 = 13,
  cTFRGB565 = 14,
  cTFBGR565 = 15,
  cTFRGBA4444 = 16,
  
  // Total number of texture formats
  cTFTotalTextureFormats = 22
}

export enum BasisTextureType {
  cBASISTexType2D = 0,
  cBASISTexTypeCubemapArray = 1,
  cBASISTexTypeVideoFrames = 2,
  cBASISTexTypeVolume = 3
}

// Main transcoder class interface
export interface BasisTranscoder {
  // Core methods
  startTranscoding(data: Uint8Array): boolean;
  getNumImages(): number;
  getNumLevels(imageIndex: number): number;
  getImageWidth(imageIndex: number, levelIndex: number): number;
  getImageHeight(imageIndex: number, levelIndex: number): number;
  getImageTranscodedSizeInBytes(
    imageIndex: number, 
    levelIndex: number, 
    format: number
  ): number;
  
  transcodeImage(
    outputBuffer: Uint8Array,
    imageIndex: number,
    levelIndex: number,
    format: number,
    decodeFlags: number,
    rowPitch: number
  ): boolean;
  
  delete(): void;
  
  // File info methods
  getHasAlpha(): boolean;
  getTextureType(): number;
  getUserData0(): number;
  getUserData1(): number;
  getTotalImages(): number;
  
  // Additional methods as needed
  [key: string]: any;
}

// File info interface
export interface BasisFileInfo {
  version: number;
  totalHeaderSize: number;
  totalSelectors: number;
  selectorCodebookSize: number;
  totalEndpoints: number;
  endpointCodebookSize: number;
  tablesSize: number;
  slicesSize: number;
  textureType: number;
  textureFormat: number;
  us_per_frame: number;
  userdata0: number;
  userdata1: number;
  flipY: boolean;
  etc1s: boolean;
  hasAlpha: boolean;
}

// Image info interface
export interface BasisImageInfo {
  imageIndex: number;
  totalLevels: number;
  alphaFlag: boolean;
  iframeFlag: boolean;
  width: number;
  height: number;
}

// Image level info interface
export interface BasisImageLevelInfo {
  imageIndex: number;
  levelIndex: number;
  unpacked_width: number;
  unpacked_height: number;
  width: number;
  height: number;
  numBlocksX: number;
  numBlocksY: number;
  totalBlocks: number;
  alphaFlag: boolean;
  iframeFlag: boolean;
}

// Exception classes
export class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalError';
  }
}

export class BindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BindingError';
  }
}

// Main module interface
export interface BasisTranscoderModule {
  // Core classes
  BasisFile: new (data: Uint8Array) => any;
  
  // Enums
  TranscoderTextureFormat: typeof TranscoderTextureFormat;
  BasisTextureType: typeof BasisTextureType;
  
  // Exception classes
  InternalError: typeof InternalError;
  BindingError: typeof BindingError;
  
  // Utility functions
  initializeBasis(): void;
  
  // Memory management
  malloc(size: number): number;
  free(ptr: number): void;
  
  // Data views
  HEAP8: Int8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  
  // Module state
  calledRun: boolean;
  
  // Dynamic calls
  dynCall_jiji?: (index: number, a1: number, a2: number, a3: number, a4: number) => number;
  
  [key: string]: any;
}

// Factory function type
export type BasisTranscoderFactory = (config?: ModuleConfig) => Promise<BasisTranscoderModule>;

// Set up global URL reference
if (typeof window !== 'undefined') {
  window.wasm_basis_transcoder_url = wasmURL;
}

// Dynamic import to avoid module resolution issues
let basisTranscoderJS: any = null;

// Export the factory function with proper typing
export const BASIS: BasisTranscoderFactory = async (config?: ModuleConfig) => {
  if (!basisTranscoderJS) {
    // @ts-ignore - importing JS module without types
    basisTranscoderJS = await import('./basis_transcoder.js');
  }
  return basisTranscoderJS.BASIS(config);
};

// Create a typed initialization function
export async function initBasisTranscoder(config: ModuleConfig = {}): Promise<BasisTranscoderModule> {
  return BASIS({
    onRuntimeInitialized: () => {
      console.log("BasisTranscoderModule initialized");
      config.onRuntimeInitialized?.();
    },
    ...config
  });
}

// Helper function to initialize with global assignment
export async function initBasisTranscoderGlobal(config: ModuleConfig = {}): Promise<BasisTranscoderModule> {
  const module = await initBasisTranscoder(config);
  
  if (typeof window !== 'undefined') {
    window.BasisTranscoderModule = module;
    
    if (module.initializeBasis) {
      module.initializeBasis();
      console.log("BasisTranscoderModule.initializeBasis() called successfully.");
    } else {
      console.error("BasisTranscoderModule.initializeBasis() is not available on the BasisTranscoderModule object.");
    }
  }
  
  return module;
}

// Utility functions for working with Basis files
export function getBasisFileInfo(module: BasisTranscoderModule, data: Uint8Array): BasisFileInfo | null {
  try {
    const basisFile = new module.BasisFile(data);
    if (!basisFile.startTranscoding()) {
      basisFile.delete();
      return null;
    }
    
    const info: BasisFileInfo = {
      version: basisFile.getVersion?.() || 0,
      totalHeaderSize: basisFile.getTotalHeaderSize?.() || 0,
      totalSelectors: basisFile.getTotalSelectors?.() || 0,
      selectorCodebookSize: basisFile.getSelectorCodebookSize?.() || 0,
      totalEndpoints: basisFile.getTotalEndpoints?.() || 0,
      endpointCodebookSize: basisFile.getEndpointCodebookSize?.() || 0,
      tablesSize: basisFile.getTablesSize?.() || 0,
      slicesSize: basisFile.getSlicesSize?.() || 0,
      textureType: basisFile.getTextureType?.() || 0,
      textureFormat: basisFile.getTextureFormat?.() || 0,
      us_per_frame: basisFile.getUSPerFrame?.() || 0,
      userdata0: basisFile.getUserData0?.() || 0,
      userdata1: basisFile.getUserData1?.() || 0,
      flipY: basisFile.getFlipY?.() || false,
      etc1s: basisFile.getETC1S?.() || false,
      hasAlpha: basisFile.getHasAlpha?.() || false,
    };
    
    basisFile.delete();
    return info;
  } catch (error) {
    console.error('Error getting basis file info:', error);
    return null;
  }
}

// Export default as the factory function
export default BASIS; 