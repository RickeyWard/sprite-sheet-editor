// Re-export all Basis Universal TypeScript wrappers
// This ensures proper module resolution and avoids conflicts with JS files

export {
  initBasisEncoder,
  initBasisEncoderGlobal,
  BASIS as BasisEncoderFactory,
  BasisTextureFormat,
  ImageType,
  InternalError,
  BindingError,
  type BasisEncoder,
  type BasisEncoderModule,
  type BasisEncoderFactory as BasisEncoderFactoryType,
  type ModuleConfig
} from './basis_encoder';

export {
  initBasisTranscoder,
  initBasisTranscoderGlobal,
  getBasisFileInfo,
  BASIS as BasisTranscoderFactory,
  TranscoderTextureFormat,
  BasisTextureType,
  type BasisTranscoder,
  type BasisTranscoderModule,
  type BasisTranscoderFactory as BasisTranscoderFactoryType,
  type BasisFileInfo,
  type BasisImageInfo,
  type BasisImageLevelInfo
} from './basis_transcoder'; 