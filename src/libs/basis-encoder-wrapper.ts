// Isolated TypeScript wrapper for Basis Universal Encoder
// Completely separate from basis_encoder.js to avoid module resolution conflicts

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

// Main encoder class interface
export interface BasisEncoder {
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
  
  [key: string]: any;
}

// Main module interface
export interface BasisEncoderModule {
  BasisEncoder: new () => BasisEncoder;
  basis_tex_format: any;
  ldr_image_type: any;
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
import wasmURL from './basis_encoder.wasm?url';

if (typeof window !== 'undefined') {
  window.wasm_basis_encoder_url = wasmURL;
}

// Dynamic loader for the JavaScript module
let jsModule: any = null;

async function loadBasisModule(): Promise<any> {
  if (!jsModule) {
    // Dynamic import of the JS file
    jsModule = await import('./basis_encoder.js');
  }
  return jsModule;
}

// Initialize the encoder with global assignment
export async function initBasisEncoderGlobal(config: ModuleConfig = {}): Promise<BasisEncoderModule> {
  try {
    const jsModule = await loadBasisModule();
    
    const module = await jsModule.BASIS({
      onRuntimeInitialized: () => {
        console.log("BasisEncoderModule initialized");
        config.onRuntimeInitialized?.();
      },
      ...config
    });
    
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
  } catch (error) {
    console.error("Error initializing BASIS:", error);
    throw error;
  }
} 