'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, ImageIcon, Shirt, ArrowRight, RotateCcw, Ruler, Scan } from 'lucide-react';
import { loadPoseLib } from '@/lib/mediapipe-loader';

type PoseLandmark = { x: number; y: number; z: number; visibility: number };

async function detectPoseFromImage(imageFile: File): Promise<PoseLandmark[] | null> {
  try {
    const PoseClass = await loadPoseLib();

    const pose = new PoseClass({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    let resolved = false;
    const resultPromise = new Promise<PoseLandmark[] | null>((resolve) => {
      pose.onResults((results: { poseLandmarks?: PoseLandmark[] }) => {
        if (resolved) return;
        resolved = true;
        if (results.poseLandmarks && results.poseLandmarks.length >= 25) {
          resolve(results.poseLandmarks);
        } else {
          resolve(null);
        }
        pose.close();
      });
    });

    await pose.initialize();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const objectUrl = URL.createObjectURL(imageFile);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
      img.src = objectUrl;
    });

    URL.revokeObjectURL(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { pose.close(); return null; }
    ctx.drawImage(img, 0, 0);

    try {
      await pose.send({ image: canvas });
    } catch {
      if (!resolved) { resolved = true; pose.close(); return null; }
    }

    // Timeout: if onResults hasn't fired in 10s, give up
    const timeout = new Promise<PoseLandmark[] | null>((resolve) => {
      setTimeout(() => {
        if (!resolved) { resolved = true; pose.close(); }
        resolve(null);
      }, 10000);
    });

    return await Promise.race([resultPromise, timeout]);
  } catch (err) {
    console.error('[VirtualFit] Pose detection failed:', err);
    return null;
  }
}

interface VirtualFitClientProps {
  experience: {
    id: string;
    name: string;
    slug: string;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    brandPrimary: string;
    logoUrl: string | null;
  };
  // Pre-existing garment images from the product
  garmentOverlays: { id: string; filePath: string; fileName: string }[];
  branding: { hideBranding: boolean };
  // Optional merchant product specs — pre-populates fields and sends to try-on API
  merchantSpecs?: {
    garmentCategory: string;
    fitType: string;
    drapeFactor: number;
    sizingSystem: string;
    sizeChart: Record<string, Record<string, number>> | null;
    garmentLength: number | null;
    sleeveLength: number | null;
    shoulderSpec: number | null;
    chestSpec: number | null;
  };
}

type JobStatus = 'idle' | 'uploading' | 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export function VirtualFitClient({ experience, product, company, garmentOverlays, branding, merchantSpecs }: VirtualFitClientProps) {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [selectedGarmentOverlay, setSelectedGarmentOverlay] = useState<string | null>(
    garmentOverlays.length > 0 ? garmentOverlays[0].filePath : null
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [sizeRec, setSizeRec] = useState<{
    recommendedSize: string;
    confidence: number;
    fitPrediction: string;
    alternatives: string[];
    reasoning: string;
    category?: string;
    sizingSystem?: string;
    dataSource?: string;
    measurementBasis?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [usualSize, setUsualSize] = useState<string>('');
  const [garmentCategory, setGarmentCategory] = useState<string>(merchantSpecs?.garmentCategory || 't-shirt');
  const [fitType, setFitType] = useState<string>(merchantSpecs?.fitType || 'regular');
  const [drapeFactor, setDrapeFactor] = useState<string>(merchantSpecs?.drapeFactor?.toString() || '1.0');
  const [detectedLandmarks, setDetectedLandmarks] = useState<PoseLandmark[] | null>(null);
  const [detectingPose, setDetectingPose] = useState(false);

  const personInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling interval and object URLs on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (personPreviewRef.current) URL.revokeObjectURL(personPreviewRef.current);
      if (garmentPreviewRef.current) URL.revokeObjectURL(garmentPreviewRef.current);
    };
  }, []);

  const personPreviewRef = useRef<string | null>(null);
  personPreviewRef.current = personPreview;
  const garmentPreviewRef = useRef<string | null>(null);
  garmentPreviewRef.current = garmentPreview;

  const handlePersonSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (personPreviewRef.current) URL.revokeObjectURL(personPreviewRef.current);
    setPersonImage(file);
    const url = URL.createObjectURL(file);
    setPersonPreview(url);
    personPreviewRef.current = url;
    setOutputImage(null);
    setError(null);
    setDetectedLandmarks(null);

    setDetectingPose(true);
    try {
      const landmarks = await detectPoseFromImage(file);
      setDetectedLandmarks(landmarks);
      if (landmarks) {
        console.log(`[VirtualFit] Detected ${landmarks.length} body landmarks from photo`);
      } else {
        console.log('[VirtualFit] No body detected in photo — will use fallback placement');
      }
    } catch (err) {
      console.warn('[VirtualFit] Pose detection error:', err);
    } finally {
      setDetectingPose(false);
    }
  }, []);

  const handleGarmentSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (garmentPreviewRef.current) URL.revokeObjectURL(garmentPreviewRef.current);
    setGarmentImage(file);
    const url = URL.createObjectURL(file);
    setGarmentPreview(url);
    garmentPreviewRef.current = url;
    setSelectedGarmentOverlay(null);
    setOutputImage(null);
    setError(null);
  }, []);

  const handleSelectOverlayGarment = useCallback((filePath: string) => {
    setSelectedGarmentOverlay(filePath);
    setGarmentImage(null);
    setGarmentPreview(null);
    setOutputImage(null);
    setError(null);
  }, []);

  const pollJobStatus = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/tryon-jobs/${id}`);
        const data = await res.json();
        if (!data.success) return;

        const jobStatus = data.data.status as JobStatus;
        setStatus(jobStatus);

        if (jobStatus === 'COMPLETE') {
          setOutputImage(data.data.outputImagePath);
          // Extract size recommendation from job metadata
          const meta = data.data.metadata as Record<string, unknown> | null;
          if (meta?.sizeRecommendation) {
            setSizeRec(meta.sizeRecommendation as NonNullable<typeof sizeRec>);
          }
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (jobStatus === 'FAILED') {
          setError(data.data.errorMessage || 'Processing failed');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Retry on network error
      }
    }, 2000);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!personImage) return;

    const hasGarment = garmentImage || selectedGarmentOverlay;
    if (!hasGarment) return;

    setStatus('uploading');
    setError(null);
    setOutputImage(null);

    try {
      const formData = new FormData();
      formData.append('personImage', personImage);
      if (garmentImage) {
        formData.append('garmentImage', garmentImage);
      } else if (selectedGarmentOverlay) {
        formData.append('garmentImagePath', selectedGarmentOverlay);
      }
      formData.append('companyId', company.id);
      formData.append('experienceId', experience.id);
      if (heightCm) formData.append('heightCm', heightCm);
      if (weightKg) formData.append('weightKg', weightKg);
      if (usualSize) formData.append('usualSize', usualSize);
      if (detectedLandmarks) {
        formData.append('bodyLandmarks', JSON.stringify(detectedLandmarks));
      }
      if (garmentCategory) formData.append('garmentCategory', garmentCategory);
      if (fitType) formData.append('fitType', fitType);
      if (drapeFactor && drapeFactor !== '1.0') formData.append('drapeFactor', drapeFactor);

      // Send merchant-configured specs if available
      if (merchantSpecs) {
        if (merchantSpecs.sizeChart) formData.append('sizeChart', JSON.stringify(merchantSpecs.sizeChart));
        if (merchantSpecs.sizingSystem) formData.append('sizingSystem', merchantSpecs.sizingSystem);
        if (merchantSpecs.garmentLength != null) formData.append('garmentLength', String(merchantSpecs.garmentLength));
        if (merchantSpecs.sleeveLength != null) formData.append('sleeveLength', String(merchantSpecs.sleeveLength));
        if (merchantSpecs.shoulderSpec != null) formData.append('shoulderSpec', String(merchantSpecs.shoulderSpec));
        if (merchantSpecs.chestSpec != null) formData.append('chestSpec', String(merchantSpecs.chestSpec));
      }

      const res = await fetch('/api/public/tryon-jobs', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create try-on job');
        setStatus('FAILED');
        return;
      }

      setJobId(data.data.id);
      setStatus('UPLOADED');
      pollJobStatus(data.data.id);
    } catch {
      setError('Network error. Please try again.');
      setStatus('FAILED');
    }
  }, [personImage, garmentImage, selectedGarmentOverlay, company.id, experience.id, heightCm, weightKg, usualSize, detectedLandmarks, garmentCategory, fitType, drapeFactor, merchantSpecs, pollJobStatus]);

  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    // Revoke ObjectURLs to prevent memory leaks
    if (personPreviewRef.current) { URL.revokeObjectURL(personPreviewRef.current); personPreviewRef.current = null; }
    if (garmentPreviewRef.current) { URL.revokeObjectURL(garmentPreviewRef.current); garmentPreviewRef.current = null; }
    setPersonImage(null);
    setPersonPreview(null);
    setGarmentImage(null);
    setGarmentPreview(null);
    setSelectedGarmentOverlay(garmentOverlays.length > 0 ? garmentOverlays[0].filePath : null);
    setJobId(null);
    setStatus('idle');
    setOutputImage(null);
    setSizeRec(null);
    setError(null);
    setHeightCm('');
    setWeightKg('');
    setUsualSize('');
    setGarmentCategory('t-shirt');
    setFitType('regular');
    setDrapeFactor('1.0');
    setDetectedLandmarks(null);
    setDetectingPose(false);
  }, [garmentOverlays]);

  const garmentSrc = garmentPreview || selectedGarmentOverlay;
  const isProcessing = status === 'uploading' || status === 'UPLOADED' || status === 'PROCESSING';
  const canSubmit = personImage && (garmentImage || selectedGarmentOverlay) && !isProcessing;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-surface-900">{product?.title || experience.name}</h1>
            <p className="text-xs text-surface-500">{company.name} — Virtual Try-On</p>
          </div>
          {experience.ctaText && experience.ctaLink && (
            <a
              href={experience.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: company.brandPrimary }}
            >
              {experience.ctaText}
            </a>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Upload section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Person image */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Your Photo
            </h3>
            <div
              onClick={() => personInputRef.current?.click()}
              className={`relative h-80 rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
                personPreview ? 'border-transparent' : 'border-surface-300 hover:border-brand-400 bg-white'
              }`}
            >
              {personPreview ? (
                <img src={personPreview} alt="Person" className="w-full h-full object-contain bg-surface-100" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-surface-400">
                  <Upload className="w-10 h-10 mb-3" />
                  <p className="text-sm font-medium">Upload a full-body photo</p>
                  <p className="text-xs mt-1">JPG, PNG — clear, front-facing</p>
                </div>
              )}
            </div>
            <input ref={personInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePersonSelect} />
            {personPreview && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {detectingPose ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                    <span className="text-surface-500">Detecting body pose...</span>
                  </>
                ) : detectedLandmarks ? (
                  <>
                    <Scan className="w-3.5 h-3.5 text-emerald-500" />
                    <span data-testid="text-landmarks-detected" className="text-emerald-600">{detectedLandmarks.length} body landmarks detected — cloth warping enabled</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5 text-surface-400" />
                    <span data-testid="text-no-landmarks" className="text-surface-400">No body detected — will use proportional placement</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Garment image */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              <Shirt className="w-4 h-4" /> Garment
            </h3>

            {/* Pre-existing garment overlays from product */}
            {garmentOverlays.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {garmentOverlays.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectOverlayGarment(g.filePath)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedGarmentOverlay === g.filePath ? 'border-brand-500' : 'border-surface-200'
                    }`}
                  >
                    <img src={g.filePath} alt={g.fileName} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div
              onClick={() => garmentInputRef.current?.click()}
              className={`relative h-80 rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ${
                garmentSrc ? 'border-transparent' : 'border-surface-300 hover:border-brand-400 bg-white'
              }`}
            >
              {garmentSrc ? (
                <img src={garmentSrc} alt="Garment" className="w-full h-full object-contain bg-surface-100" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-surface-400">
                  <Upload className="w-10 h-10 mb-3" />
                  <p className="text-sm font-medium">Upload a garment image</p>
                  <p className="text-xs mt-1">Clean, flat-lay or on-model photo</p>
                </div>
              )}
            </div>
            <input ref={garmentInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleGarmentSelect} />
          </div>
        </div>

        {/* Garment type & fit */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
            <Shirt className="w-4 h-4" /> Garment Type
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="garmentCategory" className="block text-xs font-medium text-surface-600 mb-1">Category</label>
              <select
                id="garmentCategory"
                data-testid="select-garment-category"
                value={garmentCategory}
                onChange={(e) => setGarmentCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm text-surface-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              >
                <option value="t-shirt">T-Shirt</option>
                <option value="shirt">Shirt</option>
                <option value="jacket">Jacket</option>
                <option value="hoodie">Hoodie</option>
                <option value="sweater">Sweater</option>
                <option value="polo">Polo</option>
                <option value="thobe">Thobe</option>
                <option value="abaya">Abaya</option>
                <option value="dress">Dress</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="fitType" className="block text-xs font-medium text-surface-600 mb-1">Fit Type</label>
              <select
                id="fitType"
                data-testid="select-fit-type"
                value={fitType}
                onChange={(e) => setFitType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm text-surface-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              >
                <option value="slim">Slim Fit</option>
                <option value="regular">Regular Fit</option>
                <option value="loose">Loose Fit</option>
                <option value="oversized">Oversized</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="drapeFactor" className="block text-xs font-medium text-surface-600 mb-1">
              Drape Factor: {drapeFactor}
            </label>
            <input
              id="drapeFactor"
              data-testid="input-drape-factor"
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={drapeFactor}
              onChange={(e) => setDrapeFactor(e.target.value)}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-surface-400 mt-0.5">
              <span>Fitted (0.7)</span>
              <span>Default (1.0)</span>
              <span>Flowing (1.5)</span>
            </div>
          </div>
          <p className="text-[11px] text-surface-400 mt-2">
            {garmentCategory === 'thobe' && 'Thobe sizing uses numeric system (52–64) based on height, shoulder width, and sleeve length.'}
            {garmentCategory === 'abaya' && 'Abaya sizing uses numeric system (50–60) prioritizing overall length and shoulder width for drape fit.'}
            {(garmentCategory === 't-shirt' || garmentCategory === 'shirt' || garmentCategory === 'polo') && 'Standard letter sizing (XS–XXXL) based on shoulder width and chest measurements.'}
            {(garmentCategory === 'jacket' || garmentCategory === 'hoodie' || garmentCategory === 'sweater') && 'Outerwear sizing (XS–XXXL) with wider chest allowance and full sleeve length.'}
            {garmentCategory === 'dress' && 'Standard letter sizing. Height and shoulder width are primary factors.'}
            {garmentCategory === 'other' && 'Generic sizing — results may be less accurate without category-specific rules.'}
          </p>
        </div>

        {/* Body profile inputs */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 mb-8">
          <h3 className="text-sm font-semibold text-surface-700 mb-1 flex items-center gap-2">
            <Ruler className="w-4 h-4" /> Body Profile <span className="text-xs font-normal text-surface-400">(optional — improves fit accuracy)</span>
          </h3>
          <p className="text-[11px] text-surface-400 mb-4">
            Providing your height and weight helps the system estimate better garment sizing. This is an approximation, not an exact measurement.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="heightCm" className="block text-xs font-medium text-surface-600 mb-1">Height (cm)</label>
              <input
                id="heightCm"
                data-testid="input-height"
                type="number"
                min="50"
                max="300"
                step="1"
                placeholder="e.g. 175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="weightKg" className="block text-xs font-medium text-surface-600 mb-1">Weight (kg)</label>
              <input
                id="weightKg"
                data-testid="input-weight"
                type="number"
                min="20"
                max="500"
                step="0.5"
                placeholder="e.g. 70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="usualSize" className="block text-xs font-medium text-surface-600 mb-1">Usual Size</label>
              <input
                id="usualSize"
                data-testid="input-usual-size"
                type="text"
                placeholder="e.g. M, L, 42"
                value={usualSize}
                onChange={(e) => setUsualSize(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: company.brandPrimary }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {status === 'uploading' ? 'Uploading...' : status === 'PROCESSING' ? 'Generating preview...' : 'Queued...'}
              </>
            ) : (
              <>
                Generate Try-On Preview
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {(outputImage || error) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-surface-300 text-surface-700 font-medium text-sm hover:bg-surface-100"
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </button>
          )}
        </div>

        {/* Status / result */}
        {status === 'COMPLETE' && outputImage && (
          <div className="bg-white rounded-xl border border-surface-200 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-surface-900">Try-On Preview Ready</h3>
            </div>
            <img
              src={outputImage}
              alt="Virtual try-on result"
              className="max-w-lg mx-auto rounded-lg shadow-lg"
            />
            {sizeRec && (
              <div className="mt-6 mx-auto max-w-sm bg-surface-50 rounded-lg border border-surface-200 p-4 text-left">
                <h4 className="text-sm font-semibold text-surface-800 mb-2 flex items-center gap-2">
                  <Ruler className="w-4 h-4" /> Size Recommendation
                  {sizeRec.category && sizeRec.category !== 'other' && (
                    <span data-testid="text-size-category" className="text-xs font-normal text-surface-400 capitalize">({sizeRec.category})</span>
                  )}
                </h4>
                <div className="flex items-baseline gap-3 mb-2">
                  <span data-testid="text-recommended-size" className="text-2xl font-bold" style={{ color: company.brandPrimary }}>
                    {sizeRec.sizingSystem === 'numeric'
                      ? `Size ${sizeRec.recommendedSize}`
                      : sizeRec.recommendedSize}
                  </span>
                  <span data-testid="text-size-confidence" className="text-xs text-surface-500">
                    Confidence: {Math.round(sizeRec.confidence * 100)}%
                  </span>
                  <span data-testid="text-fit-prediction" className="text-xs px-2 py-0.5 rounded-full bg-surface-200 text-surface-600 capitalize">
                    {sizeRec.fitPrediction} fit
                  </span>
                </div>
                {sizeRec.alternatives.length > 0 && (
                  <p data-testid="text-alternatives" className="text-xs text-surface-500 mb-1">
                    Also consider: {sizeRec.alternatives.map(a =>
                      sizeRec.sizingSystem === 'numeric' ? `Size ${a}` : a
                    ).join(', ')}
                  </p>
                )}
                {sizeRec.dataSource && (
                  <p data-testid="text-data-source" className="text-[11px] text-surface-400 mb-1">
                    Data: {sizeRec.dataSource === 'product-specific' ? 'Product-specific size chart' : sizeRec.dataSource === 'category-default' ? `Default ${sizeRec.category || ''} sizing chart` : 'Generic size estimation'}
                    {sizeRec.measurementBasis ? ` · Based on: ${sizeRec.measurementBasis}` : ''}
                  </p>
                )}
                <p data-testid="text-reasoning" className="text-[11px] text-surface-400">{sizeRec.reasoning}</p>
              </div>
            )}
            <p className="text-xs text-surface-400 mt-4">
              This is an estimation-based preview. Sizing is approximate and may vary from actual product fit.
            </p>
          </div>
        )}

        {status === 'FAILED' && error && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-bold text-red-800">Processing Failed</h3>
            </div>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {!branding.hideBranding && (
        <div className="text-center py-6">
          <p className="text-[10px] text-surface-300">Powered by AR-core-7</p>
        </div>
      )}
    </div>
  );
}
