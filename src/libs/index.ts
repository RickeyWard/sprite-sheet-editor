// Re-export only working Basis Universal components
// Avoid re-exporting from TypeScript modules that have JS export conflicts

// Export working encoder wrapper
export {
  initBasisEncoderGlobal,
  type BasisEncoder,
  type BasisEncoderModule,
  type ModuleConfig
} from './basis-encoder-wrapper';

// Export working transcoder wrapper
export {
  initBasisTranscoderGlobal,
  TranscoderTextureFormat,
  BasisTextureType,
  type BasisTranscoder,
  type BasisTranscoderModule
} from './basis-transcoder-wrapper';

// Note: Direct imports from basis_encoder.ts and basis_transcoder.ts may have 
// export conflicts with their compiled JS counterparts. Use the wrapper or 
// import the factory functions directly if needed. 