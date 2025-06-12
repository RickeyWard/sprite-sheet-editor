import type { SpriteFrame } from '../types';
import { 
  initBasisTranscoderGlobal, 
  TranscoderTextureFormat,
} from '../libs';

// Add KTX2 file detection
export function isKTX2File(file: File): boolean {
  return file.name.toLowerCase().endsWith('.ktx2') || file.type === 'image/ktx2';
}

// Function to decode KTX2 data to canvas using the existing BASIS transcoder
export async function loadKTX2ToCanvas(ktx2Data: Uint8Array): Promise<HTMLCanvasElement> {
  // Initialize BASIS transcoder
  console.log('Initializing BASIS transcoder...');
  const basisModule = await initBasisTranscoderGlobal({});
  console.log('BASIS transcoder initialized');
  
  if (!basisModule.KTX2File) {
    throw new Error('KTX2File class not available in transcoder module');
  } else {
    console.log('KTX2File class available in transcoder module');
  }
  
  // Check if initializeBasis was called
  console.log('Checking BASIS initialization...');
  if (!basisModule.calledRun) {
    console.warn('BASIS module may not be fully initialized');
  }
  
  // Debug: Check data integrity
  console.log('KTX2 data size:', ktx2Data.length);
  console.log('First 16 bytes:', Array.from(ktx2Data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  const ktx2File = new basisModule.KTX2File(new Uint8Array(ktx2Data));
  if (!ktx2File.isValid()) {
    ktx2File.close();
    ktx2File.delete();
    throw new Error('Invalid or unsupported .ktx2 file');
  } else {
    console.log('KTX2File created successfully');
  }

  const width = ktx2File.getWidth();
  const height = ktx2File.getHeight();

  if (!ktx2File.startTranscoding()) {
    console.warn('startTranscoding failed');
    ktx2File.close();
    ktx2File.delete();
    throw new Error('startTranscoding failed');
  }

  const format = TranscoderTextureFormat.cTFRGBA32;

  const dstSize = ktx2File.getImageTranscodedSizeInBytes(0, 0, 0, format);
  const dst = new Uint8Array(dstSize);
  
  var flags = basisModule.basisu_decode_flags.cDecodeFlagsHighQuality.value; // 0
                            
  if (!ktx2File.transcodeImageWithFlags(dst, 0, 0, 0, format, flags, -1, -1)) {
    console.warn('transcodeImage failed');
    ktx2File.close();
    ktx2File.delete();
    throw new Error('transcodeImage failed');
  }

  ktx2File.close();
  ktx2File.delete();
  
  console.log('Transcoding completed successfully');
  
  // Create canvas and draw transcoded data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  // Create ImageData from transcoded RGBA data
  const imageData = new ImageData(width, height);
  imageData.data.set(dst);
  
  // Draw to canvas
  ctx.putImageData(imageData, 0, 0);
  
  console.log('Canvas created successfully');
  
  return canvas;
}

// Function to load KTX2 file and convert to image
export async function loadKTX2FromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const ktx2Data = new Uint8Array(arrayBuffer);
        
        // Decode KTX2 to canvas
        const canvas = await loadKTX2ToCanvas(ktx2Data);
        
        // Convert canvas to image
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to create image from KTX2 canvas'));
        img.src = canvas.toDataURL('image/png');
        
      } catch (error) {
        reject(new Error(`Failed to load KTX2 file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read KTX2 file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  // Check if it's a KTX2 file and handle it specially
  if (isKTX2File(file)) {
    return loadKTX2FromFile(file);
  }
  
  // Handle regular image files
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    
    img.src = url;
  });
}

export async function createSpriteFrameFromFile(file: File): Promise<SpriteFrame> {
  // Check if it's a KTX2 file
  let image: HTMLImageElement;
  
  if (isKTX2File(file)) {
    image = await loadKTX2FromFile(file);
  } else {
    image = await loadImageFromFile(file);
  }
  
  const id = crypto.randomUUID();
  const name = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
  
  return {
    id,
    name,
    image,
    width: image.width,
    height: image.height
  };
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 