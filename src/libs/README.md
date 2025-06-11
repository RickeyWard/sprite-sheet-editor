# Basis Universal TypeScript Modules

This directory contains TypeScript wrapper modules for Basis Universal encoder and transcoder libraries.

## Overview

- `basis_encoder.ts` - TypeScript module for the Basis Universal encoder
- `basis_transcoder.ts` - TypeScript module for the Basis Universal transcoder
- `basis_encoder.js` - Original Emscripten-generated JavaScript (keep for runtime)
- `basis_transcoder.js` - Original Emscripten-generated JavaScript (keep for runtime)
- `basis_encoder.wasm` - WebAssembly binary for encoder
- `basis_transcoder.wasm` - WebAssembly binary for transcoder

## Usage

### Basis Encoder

```typescript
import { initBasisEncoder, BasisTextureFormat, ImageType } from '../libs/basis_encoder';

// Initialize the encoder module
const module = await initBasisEncoder();

// Create an encoder instance
const encoder = new module.BasisEncoder();

// Configure encoder settings
encoder.setCreateKTX2File(true);
encoder.setKTX2UASTCSupercompression(true);
encoder.setFormatMode(1); // UASTC mode
encoder.setQualityLevel(128);

// Set source image data
encoder.setSliceSourceImage(
  0, // slice index
  imageData, // Uint8Array of image data
  width,
  height,
  module.ldr_image_type.cPNGImage.value
);

// Encode to output buffer
const outputBuffer = new Uint8Array(1024 * 1024); // Large enough buffer
const outputSize = encoder.encode(outputBuffer);

// Clean up
encoder.delete();

if (outputSize > 0) {
  const result = outputBuffer.slice(0, outputSize);
  // Use the encoded data...
}
```

### Basis Transcoder

```typescript
import { initBasisTranscoder, TranscoderTextureFormat } from '../libs/basis_transcoder';

// Initialize the transcoder module
const module = await initBasisTranscoder();

// Create a basis file instance
const basisFile = new module.BasisFile(basisData); // Uint8Array of .basis file

// Start transcoding
if (basisFile.startTranscoding()) {
  const numImages = basisFile.getNumImages();
  
  for (let imageIndex = 0; imageIndex < numImages; imageIndex++) {
    const numLevels = basisFile.getNumLevels(imageIndex);
    
    for (let levelIndex = 0; levelIndex < numLevels; levelIndex++) {
      const width = basisFile.getImageWidth(imageIndex, levelIndex);
      const height = basisFile.getImageHeight(imageIndex, levelIndex);
      
      // Get required output buffer size
      const outputSize = basisFile.getImageTranscodedSizeInBytes(
        imageIndex, 
        levelIndex, 
        module.TranscoderTextureFormat.cTFRGBA32
      );
      
      // Allocate output buffer
      const outputBuffer = new Uint8Array(outputSize);
      
      // Transcode the image
      const success = basisFile.transcodeImage(
        outputBuffer,
        imageIndex,
        levelIndex,
        module.TranscoderTextureFormat.cTFRGBA32,
        0, // decode flags
        0  // row pitch (0 = auto)
      );
      
      if (success) {
        // Use the transcoded RGBA data...
      }
    }
  }
}

// Clean up
basisFile.delete();
```

### Global Initialization

For convenience, you can use the global initialization functions:

```typescript
import { initBasisEncoderGlobal } from '../libs/basis_encoder';
import { initBasisTranscoderGlobal } from '../libs/basis_transcoder';

// Initialize and assign to global window object
await initBasisEncoderGlobal();
await initBasisTranscoderGlobal();

// Now you can access via window.BasisEncoderModule and window.BasisTranscoderModule
const encoder = new window.BasisEncoderModule.BasisEncoder();
```

## Types

### Encoder Types

- `BasisEncoder` - Main encoder class interface
- `BasisEncoderModule` - Module interface with all encoder functionality
- `BasisTextureFormat` - Enum for texture formats (ETC1S, UASTC, etc.)
- `ImageType` - Enum for input image types (PNG, JPEG, etc.)

### Transcoder Types

- `BasisTranscoder` - Main transcoder class interface  
- `BasisTranscoderModule` - Module interface with all transcoder functionality
- `TranscoderTextureFormat` - Enum for output texture formats
- `BasisFileInfo` - Interface for basis file metadata
- `BasisImageInfo` - Interface for image metadata
- `BasisImageLevelInfo` - Interface for mip level metadata

## Error Handling

Both modules export `InternalError` and `BindingError` classes for proper error handling:

```typescript
import { InternalError, BindingError } from '../libs/basis_encoder';

try {
  // Encoder operations...
} catch (error) {
  if (error instanceof InternalError) {
    console.error('Internal encoder error:', error.message);
  } else if (error instanceof BindingError) {
    console.error('Binding error:', error.message);
  }
}
```

## Notes

- The original `.js` files must be kept alongside the `.ts` files as they contain the actual Emscripten runtime
- The TypeScript modules are wrappers that provide type safety and better developer experience
- WebAssembly files (`.wasm`) are automatically loaded via the module URLs
- All functions that interact with WebAssembly memory should use `Uint8Array` for binary data 