import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, ScanLine, X, ArrowRight, FileImage } from 'lucide-react';
import type { OcrResponse } from '../types/math.ts';
import { MathDisplay } from './MathDisplay.tsx';

interface CameraOcrInputProps {
  onUseExtracted: (plainExpression: string, latex: string) => void;
  onSolveExtracted: (plainExpression: string, latex: string) => void;
}

export const CameraOcrInput: React.FC<CameraOcrInputProps> = ({
  onUseExtracted,
  onSolveExtracted,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setOcrError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Live camera is not supported in this browser. Upload an equation photo instead.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError(
        'Camera permission was declined or no camera was found. You can upload an image file below.'
      );
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreviewUrl(dataUrl);
    setImageBase64(dataUrl);
    setMimeType('image/jpeg');
    setOcrResult(null);
    setOcrError(null);
    stopCamera();
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload a PNG, JPEG, or WebP image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPreviewUrl(dataUrl);
      setImageBase64(dataUrl);
      setMimeType(file.type || 'image/png');
      setOcrResult(null);
      setOcrError(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const createSampleEquationImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paper-like crisp background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e2e8f0';
    for (let y = 40; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic 44px Georgia, serif';
    ctx.fillText('Evaluate:   ∫₀² (3x² − 2x + 1) dx', 76, 155);

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    setImageBase64(dataUrl);
    setMimeType('image/png');
    setOcrResult(null);
    setOcrError(null);
    stopCamera();
  };

  const runOcrScan = async () => {
    if (!imageBase64) return;
    setIsScanning(true);
    setOcrError(null);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to recognize math from image.');
      }
      setOcrResult(data as OcrResponse);
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'OCR scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const clearImage = () => {
    setPreviewUrl(null);
    setImageBase64(null);
    setOcrResult(null);
    setOcrError(null);
  };

  return (
    <div className="space-y-4">
      {/* Camera / Dropzone Stage */}
      {cameraActive ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-4/5 h-24 border-2 border-blue-400/80 rounded-xl" />
          </div>
          <div className="p-3 bg-slate-900/90 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={stopCamera}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Equation</span>
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Captured equation preview"
              className="w-full max-h-60 object-contain bg-white dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={clearImage}
              aria-label="Remove image"
              className="absolute top-3 right-3 min-h-[36px] min-w-[36px] rounded-lg bg-slate-900/80 text-white hover:bg-slate-900 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Ready for Gemini Vision OCR extraction
            </span>
            <button
              type="button"
              onClick={runOcrScan}
              disabled={isScanning}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span>{isScanning ? 'Extracting LaTeX...' : 'Scan & Convert to LaTeX'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            <FileImage className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Scan Handwritten or Printed Math
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Take a live photo or drop a screenshot of equations, integrals, matrices, or word problems to convert into digital LaTeX.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={startCamera}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Open Camera</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
            <button
              type="button"
              onClick={createSampleEquationImage}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              Load Sample Photo
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          {cameraError}
        </div>
      )}

      {ocrError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 px-4 py-3 text-xs text-red-700 dark:text-red-300">
          {ocrError}
        </div>
      )}

      {/* Recognized LaTeX Output */}
      {ocrResult && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              OCR Extracted LaTeX
            </span>
            <span>{ocrResult.confidenceNote}</span>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3.5 border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            <MathDisplay latex={ocrResult.extractedLatex} displayMode={true} />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            {ocrResult.problemDescription}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                onSolveExtracted(ocrResult.plainExpression, ocrResult.extractedLatex)
              }
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>Solve Extracted Equation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUseExtracted(ocrResult.plainExpression, ocrResult.extractedLatex)
              }
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Edit in Keyboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
