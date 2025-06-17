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
/**
 * https://binomialllc.github.io/basis_universal/
 * format values for setFormatMode
 */
export enum BasisTextureFormat {
  cETC1S = 0,
  cUASTC4x4 = 1,
  cUASTC_HDR_4x4 = 2,
  cASTC_HDR_6x6 = 3,
  cASTC_HDR_6x6_INTERMEDIATE = 4
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
  /** Create .KTX2 files instead of .basis files. By default this is FALSE. */
  setCreateKTX2File(enable: boolean): void;
  /** KTX2: Use UASTC Zstandard supercompression. Defaults to disabled or KTX2_SS_NONE.
   * Impacts UASTC LDR 4x4, UASTC HDR 4x4, and ASTC HDR 6x6 (but not ASTC HDR 6x6 intermediate) */
  setKTX2UASTCSupercompression(enable: boolean): void;
  /** KTX2: If true, the encoder will use sRGB transfer function. Defaults to false. This should very probably match the "perceptual" setting.
   * UASTC LDR 4x4, UASTC HDR 4x4 */
  setKTX2SRGBTransferFunc(enable: boolean): void;
  /** Sets the desired encoding format. This is the preferred way to control which format the encoder creates.
   * tex_format is a basis_tex_format (cETC1s, cUASTC4x4, cUASTC_HDR_4x4 etc.)
   * This can be used instead of the older setUASTC(), setHDR() etc. methods. */
  setFormatMode(mode: number|BasisTextureFormat): void;
  /** Sets the max # of endpoint clusters for ETC1S mode. Use instead of setQualityLevel.
   * Default is 512, range is [1,BASISU_MAX_ENDPOINT_CLUSTERS]
   * ETC1S mode */
  setQualityLevel(level: number): void;
  /** The compression_level parameter controls the encoder perf vs. file size tradeoff for ETC1S files.
   * It does not directly control file size vs. quality - see quality_level().
   * Default is BASISU_DEFAULT_COMPRESSION_LEVEL, range is [0,BASISU_MAX_COMPRESSION_LEVEL]
   * ETC1S mode */
  setCompressionLevel(level: number): void;
  /** If true mipmaps will be generated from the source images */
  setMipGen(enable: boolean): void;
  /** Write output .PNG/.EXR files for debugging */
  setDebug(enable: boolean): void;
  /** Display output PSNR statistics */
  setComputeStats(enable: boolean): void;
  /** If true, the input is assumed to be in sRGB space. Be sure to set this correctly! (Examples: True on photos, albedo/spec maps, and false on normal maps.)
   * In HDR mode, if perceptual is true R and G are weighted higher (2.0, 3.0) than B (1.0). Otherwise the encoder uses equal weightings for each channel.
   * ETC1S, UASTC LDR 4x4, UASTC HDR 4x4 */
  setPerceptual(enable: boolean): void;
  /** If true mipmap filtering occurs in sRGB space - this generally should match the perceptual parameter */
  setMipSRGB(enable: boolean): void;
  /** If true, the RDO post-processor will be applied to the encoded UASTC texture data.
   *  RDO is a post-processing step that reduces the size of the encoded texture by removing small details, "Rate Distortion Optimization". note this is only valuable when you are compressing on the transport layer a lossless compression like deflate/zstd.
   * UASTC LDR 4x4 */
  setRDOUASTC(enable: boolean): void;
  /** Default is 1.0 range is [0.001, 10.0]
   * UASTC LDR 4x4 */
  setRDOUASTCQualityScalar(quality: number): void;
  /** Sets the UASTC encoding performance vs. quality tradeoff, and other lesser used UASTC encoder flags.
   * This is a combination of flags. See cPackUASTCLevelDefault (2), etc.
   * UASTC LDR 4x4 */
  setPackUASTCFlags(flags: number): void;
  /** Sets the UASTC HDR 4x4 quality vs. encoder performance tradeoff (0-4, default is 1). Higher=slower but better quality. */
  setUASTCHDRQualityLevel(level: number): void;
  /** ASTC HDR 6x6: Compression speed vs. quality level. Ranges from [0,cPackASTC6x6MaxUserCompLevel]. */
  setASTC_HDR_6x6_Level(level: number): void;
  /** Sets ASTC HDR 6x6/6x6 intermediate lambda setting. The higher this setting, the lower the bitrate.
   * ASTC HDR 6x6 */
  setLambda(lambda: number): void;
  /**ASTC HDR 6x6: Enables REC 2020 delta E ITP vs. REC 709 in the encoder. */
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