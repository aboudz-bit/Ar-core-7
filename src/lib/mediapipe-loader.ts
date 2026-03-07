/**
 * MediaPipe CDN Loader
 *
 * Loads MediaPipe libraries via CDN <script> injection instead of npm imports,
 * since @mediapipe/* packages are not installed as npm dependencies.
 * The libraries attach to `window` when loaded via script tags.
 */

const FACE_MESH_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js';

const loadedScripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = loadedScripts.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    // Check if script already exists in DOM
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load MediaPipe script: ${src}`));
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

/**
 * Load MediaPipe FaceMesh from CDN.
 * Returns the FaceMesh constructor.
 */
export async function loadFaceMeshLib(): Promise<
  new (config: { locateFile: (file: string) => string }) => {
    setOptions: (opts: Record<string, unknown>) => void;
    onResults: (cb: (results: { multiFaceLandmarks?: { x: number; y: number; z: number }[][] }) => void) => void;
    send: (input: { image: HTMLVideoElement }) => Promise<void>;
    initialize: () => Promise<void>;
    close: () => void;
  }
> {
  await loadScript(FACE_MESH_CDN);

  if (!window.FaceMesh) {
    throw new Error('FaceMesh not found on window after loading CDN script');
  }

  return window.FaceMesh;
}

/**
 * Load MediaPipe Pose from CDN.
 * Returns the Pose constructor.
 */
export async function loadPoseLib(): Promise<
  new (config: { locateFile: (file: string) => string }) => {
    setOptions: (opts: Record<string, unknown>) => void;
    onResults: (cb: (results: {
      poseLandmarks?: { x: number; y: number; z: number; visibility: number }[];
      poseWorldLandmarks?: { x: number; y: number; z: number; visibility: number }[];
    }) => void) => void;
    send: (input: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }) => Promise<void>;
    initialize: () => Promise<void>;
    close: () => void;
  }
> {
  await loadScript(POSE_CDN);

  if (!window.Pose) {
    throw new Error('Pose not found on window after loading CDN script');
  }

  return window.Pose;
}
