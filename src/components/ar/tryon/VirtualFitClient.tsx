'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, XCircle, ImageIcon, Shirt, ArrowRight, RotateCcw } from 'lucide-react';

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
}

type JobStatus = 'idle' | 'uploading' | 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export function VirtualFitClient({ experience, product, company, garmentOverlays, branding }: VirtualFitClientProps) {
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
  const [error, setError] = useState<string | null>(null);

  const personInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePersonSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonImage(file);
    setPersonPreview(URL.createObjectURL(file));
    setOutputImage(null);
    setError(null);
  }, []);

  const handleGarmentSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGarmentImage(file);
    setGarmentPreview(URL.createObjectURL(file));
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
        const res = await fetch(`/api/tryon-jobs/${id}`);
        const data = await res.json();
        if (!data.success) return;

        const jobStatus = data.data.status as JobStatus;
        setStatus(jobStatus);

        if (jobStatus === 'COMPLETE') {
          setOutputImage(data.data.outputImagePath);
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

      const res = await fetch('/api/tryon-jobs', {
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
  }, [personImage, garmentImage, selectedGarmentOverlay, company.id, experience.id, pollJobStatus]);

  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPersonImage(null);
    setPersonPreview(null);
    setGarmentImage(null);
    setGarmentPreview(null);
    setSelectedGarmentOverlay(garmentOverlays.length > 0 ? garmentOverlays[0].filePath : null);
    setJobId(null);
    setStatus('idle');
    setOutputImage(null);
    setError(null);
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
            <p className="text-xs text-surface-400 mt-4">
              This is a photo-based preview. Results may vary from actual product fit.
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
