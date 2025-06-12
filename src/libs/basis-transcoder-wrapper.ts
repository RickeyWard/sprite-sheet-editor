// Isolated TypeScript wrapper for Basis Universal Transcoder
// Completely separate from basis_transcoder.js to avoid module resolution conflicts

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
  
  [key: string]: any;
}

// Main module interface
export interface BasisTranscoderModule {
  BasisFile: new (data: Uint8Array) => BasisTranscoder;
  TranscoderTextureFormat: typeof TranscoderTextureFormat;
  BasisTextureType: typeof BasisTextureType;
  InternalError: any;
  BindingError: any;
  initializeBasis(): void;
  malloc(size: number): number;
  free(ptr: number): void;
  HEAP8: Int8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  calledRun: boolean;
  [key: string]: any;
}

// Set up WASM URL
import wasmURL from './basis_transcoder.wasm?url';

if (typeof window !== 'undefined') {
  window.wasm_basis_transcoder_url = wasmURL;
}

// Dynamic loader for the JavaScript module
let jsModule: any = null;

async function loadBasisModule(): Promise<any> {
  if (!jsModule) {
    // Dynamic import of the JS file
    jsModule = await import('./basis_transcoder.js');
  }
  return jsModule;
}

// Initialize the transcoder with global assignment
export async function initBasisTranscoderGlobal(config: ModuleConfig = {}): Promise<BasisTranscoderModule> {
  try {
    const jsModule = await loadBasisModule();
    
    const module = await jsModule.BASIS({
      onRuntimeInitialized: () => {
        console.log("BasisTranscoderModule initialized");
        config.onRuntimeInitialized?.();
      },
      ...config
    });
    
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
  } catch (error) {
    console.error("Error initializing BASIS transcoder:", error);
    throw error;
  }
} 