// TypeScript module for Basis Universal Encoder
// Generated from basis_encoder.js Emscripten output

import wasmURL from './basis_encoder.wasm?url';

// Declare global interface extensions
declare global {
  interface Window {
    BasisEncoderModule: any;
    wasm_basis_encoder_url: string;
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

// Encoder-specific enums and constants
export enum BasisTextureFormat {
  cETC1S = 0,
  cUASTC4x4 = 1,
  cUASTC_HDR_4x4 = 2,
  cASTC_HDR_6x6 = 3,
  cASTC_HDR_6x6_INTERMEDIATE = 4
}

export enum ImageType {
  cPNGImage = 0,
  cJPEGImage = 1,
  cTGAImage = 2,
  cBMPImage = 3,
  cGIFImage = 4,
  cKTXImage = 5,
  cPVRImage = 6,
  cDDSImage = 7
}

// Main encoder class interface
export interface BasisEncoder {
  // Core methods
  setSliceSourceImage(
    sliceIndex: number, 
    imageData: Uint8Array, 
    width: number, 
    height: number, 
    imageType: number
  ): boolean;
  
  encode(outputBuffer: Uint8Array): number;
  delete(): void;
  
  // Configuration methods
  setCreateKTX2File(enable: boolean): void;
  setKTX2UASTCSupercompression(enable: boolean): void;
  setKTX2SRGBTransferFunc(enable: boolean): void;
  setFormatMode(mode: number): void;
  setQualityLevel(level: number): void;
  setCompressionLevel(level: number): void;
  setMipGen(enable: boolean): void;
  setDebug(enable: boolean): void;
  setComputeStats(enable: boolean): void;
  setPerceptual(enable: boolean): void;
  setMipSRGB(enable: boolean): void;
  setRDOUASTC(enable: boolean): void;
  setRDOUASTCQualityScalar(quality: number): void;
  setPackUASTCFlags(flags: number): void;
  setUASTCHDRQualityLevel(level: number): void;
  setASTC_HDR_6x6_Level(level: number): void;
  setLambda(lambda: number): void;
  setRec2020(enable: boolean): void;
  controlThreading(enable: boolean, numThreads: number): void;
  
  // Additional methods as needed
  [key: string]: any;
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
export interface BasisEncoderModule {
  // Core classes
  BasisEncoder: new () => BasisEncoder;
  
  // Enums
  basis_tex_format: typeof BasisTextureFormat;
  ldr_image_type: typeof ImageType;
  
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
  dynCall_ji: (index: number, a1: number) => number;
  dynCall_iij: (index: number, a1: number, a2: number, a3: number) => number;
  dynCall_jiiii: (index: number, a1: number, a2: number, a3: number, a4: number) => number;
  dynCall_jiji: (index: number, a1: number, a2: number, a3: number, a4: number) => number;
  dynCall_viijii: (index: number, a1: number, a2: number, a3: number, a4: number, a5: number, a6: number) => void;
  dynCall_iiiiij: (index: number, a1: number, a2: number, a3: number, a4: number, a5: number, a6: number) => number;
  dynCall_iiiiijj: (index: number, a1: number, a2: number, a3: number, a4: number, a5: number, a6: number, a7: number, a8: number) => number;
  dynCall_iiiiiijj: (index: number, a1: number, a2: number, a3: number, a4: number, a5: number, a6: number, a7: number, a8: number, a9: number) => number;
  
  [key: string]: any;
}

// Factory function type
export type BasisEncoderFactory = (config?: ModuleConfig) => Promise<BasisEncoderModule>;

// Set up global URL reference
if (typeof window !== 'undefined') {
  window.wasm_basis_encoder_url = wasmURL;
}

// Dynamic import to avoid module resolution issues
let basisEncoderJS: any = null;

// Export the factory function with proper typing
export const BASIS: BasisEncoderFactory = async (config?: ModuleConfig) => {
  if (!basisEncoderJS) {
    // @ts-ignore - importing JS module without types
    basisEncoderJS = await import('./basis_encoder.js');
  }
  return basisEncoderJS.BASIS(config);
};

// Create a typed initialization function
export async function initBasisEncoder(config: ModuleConfig = {}): Promise<BasisEncoderModule> {
  return BASIS({
    onRuntimeInitialized: () => {
      console.log("BasisEncoderModule initialized");
      config.onRuntimeInitialized?.();
    },
    ...config
  });
}

// Helper function to initialize with global assignment
export async function initBasisEncoderGlobal(config: ModuleConfig = {}): Promise<BasisEncoderModule> {
  const module = await initBasisEncoder(config);
  
  if (typeof window !== 'undefined') {
    window.BasisEncoderModule = module;
    
    if (module.initializeBasis) {
      module.initializeBasis();
      console.log("BasisEncoderModule.initializeBasis() called successfully.");
    } else {
      console.error("BasisEncoderModule.initializeBasis() is not available on the BasisEncoderModule object.");
    }
  }
  
  return module;
}

// Export default as the factory function
export default BASIS; 