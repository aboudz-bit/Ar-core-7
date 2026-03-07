declare module '@mediapipe/pose' {
  interface PoseConfig {
    locateFile?: (file: string) => string;
  }

  interface PoseOptions {
    modelComplexity?: 0 | 1 | 2;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
  }

  interface PoseResults {
    poseLandmarks?: NormalizedLandmark[];
    poseWorldLandmarks?: NormalizedLandmark[];
  }

  export class Pose {
    constructor(config?: PoseConfig);
    setOptions(options: PoseOptions): void;
    onResults(callback: (results: PoseResults) => void): void;
    send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
    close(): void;
  }
}

declare module '@mediapipe/face_mesh' {
  interface FaceMeshConfig {
    locateFile?: (file: string) => string;
  }

  interface FaceMeshOptions {
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
  }

  interface FaceMeshResults {
    multiFaceLandmarks?: NormalizedLandmark[][];
  }

  export class FaceMesh {
    constructor(config?: FaceMeshConfig);
    setOptions(options: FaceMeshOptions): void;
    onResults(callback: (results: FaceMeshResults) => void): void;
    send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
    close(): void;
  }
}
