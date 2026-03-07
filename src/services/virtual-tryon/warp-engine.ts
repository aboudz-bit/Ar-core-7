import type { BodyMeasurements } from '@/services/body/body-measurements';
import { warpGarment, type WarpResult } from './cloth-warp';

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface WarpEngineInput {
  personImageBuffer: Buffer;
  garmentImageBuffer: Buffer;
  landmarks: LandmarkPoint[];
  measurements: BodyMeasurements;
  targetHeight: number;
  imageWidth: number;
  imageHeight: number;
  drapeFactor?: number;
}

export interface WarpEngineOutput {
  buffer: Buffer;
  canvasWidth: number;
  canvasHeight: number;
  engineName: string;
  metadata: Record<string, unknown>;
}

export interface WarpEngine {
  readonly name: string;
  readonly description: string;
  readonly available: boolean;
  warp(input: WarpEngineInput): Promise<WarpEngineOutput>;
}

export class GeometricWarpEngine implements WarpEngine {
  readonly name = 'geometric';
  readonly description = 'Section-based geometric warp with 24-strip body contour following';
  readonly available = true;

  async warp(input: WarpEngineInput): Promise<WarpEngineOutput> {
    const result: WarpResult = await warpGarment(input.garmentImageBuffer, {
      measurements: input.measurements,
      landmarks: input.landmarks,
      targetHeight: input.targetHeight,
      imageWidth: input.imageWidth,
      imageHeight: input.imageHeight,
      stripCount: 24,
      drapeFactor: input.drapeFactor ?? 1.0,
    });

    return {
      buffer: result.buffer,
      canvasWidth: result.canvasWidth,
      canvasHeight: result.canvasHeight,
      engineName: this.name,
      metadata: {
        method: result.method,
        stripCount: result.stripCount,
        strips: result.strips.length,
      },
    };
  }
}

export class MLWarpEngine implements WarpEngine {
  readonly name = 'ml-viton';
  readonly description = 'ML-based virtual try-on engine (VITON-HD style) — not yet implemented';
  readonly available = false;

  async warp(_input: WarpEngineInput): Promise<WarpEngineOutput> {
    throw new Error(
      'MLWarpEngine is not yet implemented. This is a placeholder for future ML-based warping ' +
      '(e.g., VITON-HD, HR-VITON). To integrate: implement inference against a hosted model ' +
      'that accepts person image + garment image + body pose and returns a warped garment output.'
    );
  }
}

export function getWarpEngine(engineName?: string): WarpEngine {
  switch (engineName) {
    case 'ml-viton':
      return new MLWarpEngine();
    case 'geometric':
    default:
      return new GeometricWarpEngine();
  }
}

export function listAvailableEngines(): Array<{ name: string; description: string; available: boolean }> {
  const engines: WarpEngine[] = [
    new GeometricWarpEngine(),
    new MLWarpEngine(),
  ];
  return engines.map(e => ({ name: e.name, description: e.description, available: e.available }));
}
