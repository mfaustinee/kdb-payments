import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Trash2, 
  PenTool, 
  Camera, 
  Upload, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  AlertCircle, 
  RefreshCw, 
  Zap 
} from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  label: string;
  value?: string;
}

type SignatureMode = 'draw' | 'upload' | 'camera';

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, label, value }) => {
  const sigPad = useRef<SignatureCanvas>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [signature, setSignature] = useState<string | null>(value || null);
  const [activeMode, setActiveMode] = useState<SignatureMode>('draw');
  const [autoOptimize, setAutoOptimize] = useState<boolean>(true);
  const [rawImage, setRawImage] = useState<string | null>(null);
  
  // Camera-specific states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Sync internal state with prop value if it changes externally
  useEffect(() => {
    if (value !== undefined) {
      setSignature(value || null);
    }
  }, [value]);

  // Clean up camera stream on unmount or tab switch
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle Mode switching
  const handleModeChange = (mode: SignatureMode) => {
    // If transitioning away from camera, make sure we stop the feed
    if (activeMode === 'camera' && stream) {
      stopCamera();
    }
    setActiveMode(mode);
    setCameraError(null);
  };

  // Helper: Binarization filter (clears grey/colored background, converts white paper to transparent, inks signature in rich deep slate)
  const applyBinarization = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Calculate dynamic threshold or use fixed visual scanning standard threshold
        // White paper typically tests > 130 brightness
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a === 0) continue; // Keep transparent canvas pixels transparent

          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luminance > 140) {
            // Fade out the light background paper
            data[i + 3] = 0;
          } else {
            // Recolor original dark strokes to uniform clean navy/charcoal ink
            data[i] = 15;      // Red
            data[i + 1] = 23;  // Green
            data[i + 2] = 42;  // Blue
            data[i + 3] = 255; // Fully opaque stamp ink
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(base64);
      };
    });
  };

  // Helper: Compress signature and keep database light
  const compressImage = (base64: string, applyOptimization: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 500; // Optimal size for high contrast document stamps
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        
        const compressedBase64 = canvas.toDataURL('image/png', 0.85);
        
        if (applyOptimization) {
          const binarized = await applyBinarization(compressedBase64);
          resolve(binarized);
        } else {
          resolve(compressedBase64);
        }
      };
      img.onerror = () => {
        resolve(base64);
      };
    });
  };

  // Draw Mode - Save Signature Canvas
  const saveDrawnSignature = async () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const rawData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      setRawImage(rawData);
      
      // Standard signature canvas doesn't need paper background clearing because it starts transparent
      const processed = await compressImage(rawData, false);
      setSignature(processed);
      onSave(processed);
    }
  };

  // Camera Mode - Turn on camera
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Could not access your camera. Please ensure permissions are granted or switch to Draw/Upload mode."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Camera Mode - Snap Photo
  const snapPhoto = async () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // Draw the current video frame on the temporary canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setRawImage(dataUrl);
        
        // Auto-process to extract black ink and discard white paper backdrop
        const processed = await compressImage(dataUrl, autoOptimize);
        setSignature(processed);
        onSave(processed);
        stopCamera();
      }
    }
  };

  // File Upload Mode - File reader helper
  const processUploadedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setRawImage(dataUrl);
        const processed = await compressImage(dataUrl, autoOptimize);
        setSignature(processed);
        onSave(processed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processUploadedFile(files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processUploadedFile(files[0]);
    }
  };

  // Re-run optimization toggle
  const handleToggleAutoOptimize = async (isEnabled: boolean) => {
    setAutoOptimize(isEnabled);
    if (rawImage) {
      const processed = await compressImage(rawImage, isEnabled);
      setSignature(processed);
      onSave(processed);
    }
  };

  // Global Clear
  const clearSignature = () => {
    setSignature(null);
    setRawImage(null);
    onSave('');
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="w-full p-6 bg-white rounded-3xl shadow-sm border border-slate-200">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        {label}
      </label>
      
      {/* 3-Way Mode Toggle Tabs */}
      {!signature && (
        <div className="flex bg-slate-50 p-1 rounded-2xl mb-4 border border-slate-100">
          <button
            type="button"
            onClick={() => handleModeChange('draw')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeMode === 'draw' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <PenTool size={14} /> Draw
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('upload')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeMode === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Upload size={14} /> Upload Image
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('camera')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeMode === 'camera' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Camera size={14} /> Camera Capture
          </button>
        </div>
      )}

      {/* Signature Render State */}
      {signature ? (
        <div className="space-y-4">
          <div className="relative group p-6 bg-[#fcfdfd] rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
            <div className="min-h-36 max-h-44 w-full flex items-center justify-center bg-white rounded-xl border border-dashed border-slate-200 p-4 shadow-inner">
              <img src={signature} alt="Signature Preview" className="max-h-32 object-contain" />
            </div>
            
            <button 
              type="button"
              onClick={clearSignature}
              className="absolute top-3 right-3 bg-rose-500 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 shadow-md"
            >
              <Trash2 size={14} />
            </button>
            
            <div className="w-full flex flex-col sm:flex-row items-center justify-between mt-2 pt-2 border-t border-slate-50 gap-2">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                <Check size={12} className="stroke-[3]" /> Captured Successfully
              </span>
              
              {/* Intelligent optimization checkbox for uploaded/camera signatures */}
              {activeMode !== 'draw' && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={autoOptimize}
                    onChange={(e) => handleToggleAutoOptimize(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="text-amber-500" /> Transparent Ink Inkify
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Form Interactive States */
        <div className="min-h-[180px]">
          {/* Mode 1: Signature Canvas */}
          {activeMode === 'draw' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-2xl p-1 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                <SignatureCanvas
                  ref={sigPad}
                  penColor="#0f172a"
                  canvasProps={{
                    className: "w-full h-40 rounded-xl cursor-crosshair",
                    style: { background: '#ffffff', touchAction: 'none' }
                  }}
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => sigPad.current?.clear()}
                  className="text-xs font-black text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors uppercase tracking-wider"
                >
                  <Trash2 size={13} /> Clear
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSignature}
                  className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3.5 rounded-xl flex items-center gap-1 transition-all uppercase tracking-wider"
                >
                  <PenTool size={13} /> Capture Draw
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Drag & Drop File Upload */}
          {activeMode === 'upload' && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/50' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300'
              }`}
              onClick={() => document.getElementById('signature-file-input')?.click()}
            >
              <input 
                id="signature-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
                <ImageIcon size={20} />
              </div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Drag your signature file here or <span className="text-blue-600 underline">Browse</span>
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Upload physical signature on plain paper. JPG or PNG.
              </p>
              
              <div className="mt-4 flex items-center gap-1 bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                <Sparkles size={10} /> Auto background remover active
              </div>
            </div>
          )}

          {/* Mode 3: Cam Capture */}
          {activeMode === 'camera' && (
            <div className="space-y-4">
              {!isCameraActive ? (
                <div className="border border-slate-200 bg-slate-50 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[160px]">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                    <Camera size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Sign on paper and snap with camera
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium max-w-xs mt-1 leading-relaxed">
                    We will binarize and auto-optimize the lighting for perfect document inclusion.
                  </p>
                  
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-4 px-5 py-2.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Activate Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cameraError && (
                    <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      {cameraError}
                    </div>
                  )}

                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-inner max-w-md mx-auto aspect-video flex items-center justify-center">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Visual alignment frame helper for signatures */}
                    <div className="absolute inset-x-8 inset-y-10 border-2 border-dashed border-emerald-400/40 rounded-xl pointer-events-none flex items-center justify-center">
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-black/60 px-2 py-0.5 rounded">
                        Align Signature Within Box
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={snapPhoto}
                      className="bg-emerald-600 text-white font-black text-xs uppercase tracking-widest py-2.5 px-6 rounded-xl hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <Zap size={12} className="fill-white" /> Snap & Dry-Ink Signature
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

