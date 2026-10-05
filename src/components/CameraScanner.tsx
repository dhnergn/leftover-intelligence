import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { PantryItem, SpoilageRisk, FreshnessLevel, ItemCategory } from '../types/pantry';
import sampleFridgeBox from '../assets/images/sample_fridge_box_1790895342174.jpg';
import sampleProduceCounter from '../assets/images/sample_produce_counter_1790895352344.jpg';

interface CameraScannerProps {
  onAddItemsToPantry: (items: PantryItem[]) => void;
  onOpenRecipesWithItems: (items: PantryItem[]) => void;
}

interface DetectedItemCandidate {
  name: string;
  quantity: string;
  category: ItemCategory;
  freshness: FreshnessLevel;
  freshnessDescription: string;
  spoilageRisk: SpoilageRisk;
  estimatedDaysLeft: number;
  storageTip: string;
  confidence?: number;
  selected: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onAddItemsToPantry,
  onOpenRecipesWithItems,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSummary, setScanSummary] = useState<string>('');
  const [candidates, setCandidates] = useState<DetectedItemCandidate[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access could not be established:', err);
      setCameraError(
        'Camera is not accessible or permission was denied. You can still upload a photo or use demo samples below.'
      );
      setCameraActive(false);
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Re-attach video stream if video element mounts
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Flip camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Perform Gemini AI Scan
  const processImageForScan = async (base64Image: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setCandidates([]);
    setScanSummary('');

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server scan failed');
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        setErrorMessage('No distinct food leftovers or ingredients detected. Try snapping from a closer angle with good lighting.');
      } else {
        const mapped: DetectedItemCandidate[] = data.items.map((it: any) => ({
          name: it.name,
          quantity: it.quantity || '1 portion',
          category: it.category || 'cooked_leftover',
          freshness: it.freshness || 'moderate',
          freshnessDescription: it.freshnessDescription || 'Visual analysis complete',
          spoilageRisk: it.spoilageRisk || 'medium',
          estimatedDaysLeft: typeof it.estimatedDaysLeft === 'number' ? it.estimatedDaysLeft : 2,
          storageTip: it.storageTip || 'Keep chilled in airtight container',
          confidence: it.confidence || 90,
          selected: true,
        }));
        setCandidates(mapped);
        setScanSummary(data.summary || '');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'Error communicating with recognition server. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // Capture frame from live video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    processImageForScan(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      processImageForScan(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Load sample image for instant demo
  const loadSampleImage = async (url: string) => {
    try {
      setIsScanning(true);
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setCapturedImage(base64data);
        processImageForScan(base64data);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load sample image', err);
      setIsScanning(false);
    }
  };

  // Reset scanner to live feed
  const retakePhoto = () => {
    setCapturedImage(null);
    setCandidates([]);
    setErrorMessage(null);
    setScanSummary('');
    if (!cameraActive) {
      startCamera();
    }
  };

  // Toggle item selection
  const toggleCandidateSelection = (index: number) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  // Convert selected candidates to PantryItems
  const buildPantryItems = (): PantryItem[] => {
    const now = new Date();
    return candidates
      .filter((c) => c.selected)
      .map((c, idx) => {
        const expDate = new Date();
        expDate.setDate(now.getDate() + Math.max(1, c.estimatedDaysLeft));
        const expiresAtStr = expDate.toISOString().split('T')[0];

        return {
          id: `scanned-${Date.now()}-${idx}`,
          name: c.name,
          quantity: c.quantity,
          category: c.category,
          freshness: c.freshness,
          freshnessDescription: c.freshnessDescription,
          spoilageRisk: c.spoilageRisk,
          estimatedDaysLeft: c.estimatedDaysLeft,
          expiresAt: expiresAtStr,
          addedAt: now.toISOString(),
          storageTip: c.storageTip,
          status: 'active',
          confidence: c.confidence,
          imageUrl: capturedImage || undefined,
        };
      });
  };

  const handleSaveToPantry = () => {
    const items = buildPantryItems();
    if (items.length > 0) {
      onAddItemsToPantry(items);
    }
  };

  const handleSaveAndGenerateRecipes = () => {
    const items = buildPantryItems();
    if (items.length > 0) {
      onAddItemsToPantry(items);
      onOpenRecipesWithItems(items);
    }
  };

  const selectedCount = candidates.filter((c) => c.selected).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header & Mode Intro */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-display">
          Scan Leftovers & Produce
        </h1>
        <p className="text-sm text-stone-600">
          Point your camera at meal containers, produce, or opened fridge items. AI detects quantity, freshness, and spoilage risk.
        </p>
      </div>

      {/* Main Viewfinder Card */}
      <div className="bg-stone-900 rounded-2xl overflow-hidden shadow-sm border border-stone-800 relative">
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewport Area */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-stone-950 flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Scanned leftovers"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="p-6 text-center max-w-md space-y-3 text-stone-400">
              <Camera className="w-12 h-12 mx-auto text-stone-600 stroke-1" />
              <p className="text-sm">
                {cameraError || 'Camera inactive. Click to activate or upload a photo.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-medium text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                >
                  Retry Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-white rounded-lg transition-colors"
                >
                  Upload Photo
                </button>
              </div>
            </div>
          )}

          {/* Minimalist Viewfinder Reticle (when live) */}
          {cameraActive && !capturedImage && (
            <div className="pointer-events-none absolute inset-6 sm:inset-10 border border-white/20 rounded-xl flex flex-col justify-between p-4">
              <div className="flex justify-between items-start">
                <div className="w-4 h-4 border-t-2 border-l-2 border-white/80 rounded-tl" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-white/80 rounded-tr" />
              </div>
              <div className="text-center">
                <span className="text-[11px] font-medium tracking-wide text-white/70 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                  Align leftovers inside frame
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div className="w-4 h-4 border-b-2 border-l-2 border-white/80 rounded-bl" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-white/80 rounded-br" />
              </div>
            </div>
          )}

          {/* Scanning Animation Overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-stone-200 p-4">
              <div className="w-12 h-12 rounded-full border-2 border-stone-600 border-t-stone-200 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold tracking-tight text-white">
                  Inspecting Freshness & Spoilage
                </p>
                <p className="text-xs text-stone-400">
                  Gemini 3.8 Flash evaluating visual degradation, portions & shelf life...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Viewfinder Bottom Controls Bar */}
        <div className="p-4 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between gap-3">
          {/* Left Action: Flip camera or Retake */}
          <div>
            {capturedImage ? (
              <button
                onClick={retakePhoto}
                disabled={isScanning}
                className="px-3.5 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            ) : cameraActive ? (
              <button
                onClick={toggleFacingMode}
                className="px-3.5 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5"
                title="Switch Camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip Camera</span>
              </button>
            ) : (
              <div className="text-xs text-stone-500">Camera offline</div>
            )}
          </div>

          {/* Center Action: Primary Shutter Button */}
          {!capturedImage && (
            <div className="flex items-center gap-2">
              <button
                onClick={capturePhoto}
                disabled={!cameraActive || isScanning}
                aria-label="Capture food photo"
                className="w-14 h-14 rounded-full border-4 border-stone-400 hover:border-white bg-white/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-full bg-white transition-transform" />
              </button>
            </div>
          )}

          {/* Right Action: File Upload */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="px-3.5 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Test Leftovers (Fast Evaluation & Demo) */}
      {!capturedImage && (
        <div className="bg-stone-100 rounded-xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Instant Demo Samples (One-Click Test)
            </span>
            <span className="text-xs text-stone-500">Test AI Recognition</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => loadSampleImage(sampleFridgeBox)}
              className="p-3 bg-white hover:bg-stone-50 rounded-lg border border-stone-200 text-left transition-colors flex items-center gap-3 group"
            >
              <img
                src={sampleFridgeBox}
                alt="Meal Prep Leftovers"
                className="w-14 h-14 rounded-md object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-stone-900 truncate group-hover:text-stone-700">
                  Meal Prep Leftovers Container
                </p>
                <p className="text-[11px] text-stone-500 line-clamp-1">
                  Cooked roast chicken, rice & broccoli florets
                </p>
                <span className="text-[10px] text-rose-700 font-medium">High Spoilage Risk</span>
              </div>
            </button>

            <button
              onClick={() => loadSampleImage(sampleProduceCounter)}
              className="p-3 bg-white hover:bg-stone-50 rounded-lg border border-stone-200 text-left transition-colors flex items-center gap-3 group"
            >
              <img
                src={sampleProduceCounter}
                alt="Cutting Board Produce"
                className="w-14 h-14 rounded-md object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-stone-900 truncate group-hover:text-stone-700">
                  Produce Rescue Counter
                </p>
                <p className="text-[11px] text-stone-500 line-clamp-1">
                  Cut onion, bell pepper, cherry tomatoes & cilantro
                </p>
                <span className="text-[10px] text-amber-700 font-medium">Critical Herb Wilting</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Recognition Notice</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Recognition Results Cards */}
      {candidates.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Identified Items ({candidates.length})
              </h2>
              {scanSummary && (
                <p className="text-xs text-stone-500 mt-0.5">{scanSummary}</p>
              )}
            </div>
            <div className="text-xs text-stone-500">
              {selectedCount} of {candidates.length} selected
            </div>
          </div>

          <div className="space-y-2.5">
            {candidates.map((item, index) => {
              const isUrgent = item.spoilageRisk === 'high' || item.estimatedDaysLeft <= 1;
              return (
                <div
                  key={index}
                  onClick={() => toggleCandidateSelection(index)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    item.selected
                      ? isUrgent
                        ? 'bg-white border-rose-200 shadow-xs'
                        : 'bg-white border-stone-300 shadow-xs'
                      : 'bg-stone-50 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center transition-colors flex-shrink-0 ${
                          item.selected
                            ? 'bg-stone-900 text-white'
                            : 'border border-stone-300 bg-white'
                        }`}
                      >
                        {item.selected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="text-sm font-semibold text-stone-900 truncate">
                            {item.name}
                          </h3>
                          <span className="text-xs text-stone-500">· {item.quantity}</span>
                        </div>

                        {/* Unboxed Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-2 text-xs">
                          {/* Spoilage Risk text */}
                          <span
                            className={`font-semibold flex items-center gap-1 ${
                              item.spoilageRisk === 'high'
                                ? 'text-rose-700'
                                : item.spoilageRisk === 'medium'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {item.spoilageRisk === 'high' ? (
                              <ShieldAlert className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {item.spoilageRisk === 'high'
                              ? 'High Spoilage Risk'
                              : item.spoilageRisk === 'medium'
                              ? 'Medium Risk'
                              : 'Low Risk'}
                          </span>

                          <span className="text-stone-300">·</span>

                          {/* Expiration estimation */}
                          <span className="text-stone-600 font-medium tabular-nums">
                            {item.estimatedDaysLeft <= 0
                              ? 'Use immediately today'
                              : item.estimatedDaysLeft === 1
                              ? 'Use within 24h'
                              : `Safe for ~${item.estimatedDaysLeft} days`}
                          </span>

                          <span className="text-stone-300">·</span>

                          <span className="text-stone-500 capitalize">
                            {item.category.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Freshness description */}
                        <p className="text-xs text-stone-600 pt-0.5">
                          {item.freshnessDescription}
                        </p>

                        {/* Storage tip */}
                        <p className="text-[11px] text-stone-500 italic">
                          Tip: {item.storageTip}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={handleSaveToPantry}
              disabled={selectedCount === 0}
              className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200 disabled:opacity-50"
            >
              Add {selectedCount} to Pantry List
            </button>

            <button
              onClick={handleSaveAndGenerateRecipes}
              disabled={selectedCount === 0}
              className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Add & Generate Recipes Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
