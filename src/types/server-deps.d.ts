/**
 * Type stubs for optional server-side dependencies.
 * These packages are used in service files but may not be installed
 * in all environments (e.g. edge, client builds).
 */

declare module '@tensorflow-models/body-pix' {
  export interface PartSegmentation {
    data: Int32Array;
    width: number;
    height: number;
  }
  export interface BodyPix {
    segmentPersonParts(input: unknown, config?: unknown): Promise<PartSegmentation>;
  }
  export function load(config?: unknown): Promise<BodyPix>;
}

declare module '@tensorflow/tfjs-node' {
  interface Tensor {
    dispose(): void;
  }
  export function tensor3d(values: unknown, shape?: number[], dtype?: string): Tensor;
}

declare module 'sharp' {
  interface ResizeOptions {
    width?: number;
    height?: number;
    fit?: string;
    kernel?: string;
    background?: { r: number; g: number; b: number; alpha?: number };
  }
  interface CompositeLayer {
    input: Buffer | string;
    gravity?: string;
    blend?: string;
    left?: number;
    top?: number;
  }
  interface ExtractRegion {
    left: number;
    top: number;
    width: number;
    height: number;
  }
  interface SharpInstance {
    resize(options: ResizeOptions): SharpInstance;
    resize(width: number, height: number, options?: Record<string, unknown>): SharpInstance;
    removeAlpha(): SharpInstance;
    ensureAlpha(value?: number): SharpInstance;
    extract(region: ExtractRegion): SharpInstance;
    composite(images: CompositeLayer[]): SharpInstance;
    grayscale(flag?: boolean): SharpInstance;
    png(): SharpInstance;
    jpeg(options?: Record<string, unknown>): SharpInstance;
    raw(): SharpInstance;
    toBuffer(): Promise<Buffer>;
    toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number; channels: number } }>;
    toFile(path: string): Promise<unknown>;
    metadata(): Promise<{ width?: number; height?: number; channels?: number; format?: string }>;
  }
  interface CreateOptions {
    create: {
      width: number;
      height: number;
      channels: number;
      background: { r: number; g: number; b: number; alpha?: number };
    };
  }
  function sharp(input?: Buffer | string | CreateOptions, options?: Record<string, unknown>): SharpInstance;
  export = sharp;
}
