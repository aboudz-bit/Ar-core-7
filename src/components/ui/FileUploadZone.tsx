'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, X, FileIcon, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

const ALLOWED_EXTENSIONS = ['.glb', '.gltf', '.usdz', '.jpg', '.jpeg', '.png', '.webp', '.svg'];
const MAX_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || '50');
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface UploadResult {
  success: boolean;
  data?: { id: string; assetType: string; fileName: string; filePath: string; fileSize: number };
  error?: string;
}

interface FileUploadZoneProps {
  productId: string;
  assetType?: string;
  accept?: string;
  label?: string;
  hint?: string;
  onUploadComplete?: (result: UploadResult) => void;
  compact?: boolean;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

export function FileUploadZone({
  productId,
  assetType,
  accept,
  label = 'Drag & drop files here',
  hint,
  onUploadComplete,
  compact = false,
}: FileUploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type "${ext}" is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large (${formatBytes(file.size)}). Maximum size is ${MAX_SIZE_MB}MB`;
    }
    if (file.size === 0) {
      return 'File is empty';
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    setState('validating');
    setError(null);
    setProgress(0);

    const validationError = validateFile(file);
    if (validationError) {
      setState('error');
      setError(validationError);
      return;
    }

    setState('uploading');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);
    if (assetType) {
      formData.append('assetType', assetType);
    }

    // Simulate progress ticks while uploading
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 300);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await res.json();

      if (data.success) {
        setProgress(100);
        setState('success');
        setUploadedFileName(file.name);
        onUploadComplete?.({ success: true, data: data.data });
        // Reset after 2s
        setTimeout(() => {
          setState('idle');
          setProgress(0);
          setUploadedFileName(null);
        }, 2000);
      } else {
        setState('error');
        setError(data.error || 'Upload failed');
        onUploadComplete?.({ success: false, error: data.error });
      }
    } catch {
      clearInterval(progressInterval);
      setState('error');
      setError('Network error. Please try again.');
      onUploadComplete?.({ success: false, error: 'Network error' });
    }
  }, [productId, assetType, onUploadComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFile]);

  const acceptAttr = accept || ALLOWED_EXTENSIONS.join(',');

  if (compact) {
    return (
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => state === 'idle' && fileInputRef.current?.click()}
        className={`
          relative flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all
          ${dragActive ? 'border-brand-500 bg-brand-50' : ''}
          ${state === 'idle' ? 'border-surface-300 hover:border-brand-400 hover:bg-surface-50' : ''}
          ${state === 'uploading' ? 'border-brand-400 bg-brand-50' : ''}
          ${state === 'success' ? 'border-emerald-400 bg-emerald-50' : ''}
          ${state === 'error' ? 'border-red-400 bg-red-50' : ''}
        `}
      >
        <input ref={fileInputRef} type="file" className="hidden" accept={acceptAttr} onChange={handleFileSelect} />
        {state === 'idle' && (
          <>
            <Upload className="w-5 h-5 text-surface-400" />
            <span className="text-sm text-surface-600">{label}</span>
          </>
        )}
        {state === 'validating' && (
          <>
            <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            <span className="text-sm text-brand-600">Validating...</span>
          </>
        )}
        {state === 'uploading' && (
          <>
            <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            <div className="flex-1">
              <span className="text-sm text-brand-600">Uploading... {progress}%</span>
              <div className="h-1 bg-brand-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-emerald-700">{uploadedFileName} uploaded</span>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700 flex-1">{error}</span>
            <button onClick={(e) => { e.stopPropagation(); setState('idle'); setError(null); }} className="p-0.5">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200
        ${dragActive ? 'border-brand-500 bg-brand-50 scale-[1.01]' : ''}
        ${state === 'idle' ? 'border-surface-300 hover:border-brand-400' : ''}
        ${state === 'uploading' ? 'border-brand-400 bg-brand-50/50' : ''}
        ${state === 'success' ? 'border-emerald-400 bg-emerald-50' : ''}
        ${state === 'error' ? 'border-red-400 bg-red-50' : ''}
      `}
    >
      <input ref={fileInputRef} type="file" className="hidden" accept={acceptAttr} onChange={handleFileSelect} />

      <div className="p-8 text-center">
        {state === 'idle' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-surface-400" />
            </div>
            <p className="text-sm font-medium text-surface-800 mb-1">{label}</p>
            <p className="text-xs text-surface-400 mb-4">
              {hint || `Supported: GLB, GLTF, USDZ, JPG, PNG, WebP · Max ${MAX_SIZE_MB}MB`}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              <FileIcon className="w-4 h-4" /> Browse Files
            </button>
          </>
        )}

        {state === 'validating' && (
          <>
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-brand-600">Validating file...</p>
          </>
        )}

        {state === 'uploading' && (
          <>
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-brand-700 mb-2">Uploading... {progress}%</p>
            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-emerald-700">{uploadedFileName}</p>
            <p className="text-xs text-emerald-500 mt-1">Upload complete</p>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => { setState('idle'); setError(null); }}
              className="btn-secondary text-sm"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
