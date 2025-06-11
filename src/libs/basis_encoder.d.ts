declare module 'basis_encoder.js' {
  export function BASIS(options?: { onRuntimeInitialized?: () => void }): Promise<any>;
  export function initializeBasis(): Promise<void>;
}