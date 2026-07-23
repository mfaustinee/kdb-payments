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
  label?: string;
  value?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, label = "Digital Signature *", value }) => {
  const sigPad = useRef<SignatureCanvas>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [signature, setSignature] = useState<string | null>(value || null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sync internal state with prop value if it changes externally
  useEffect(() => {
    if (value !== undefined) {
      setSignature(value || null);
    }
  }, [value]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Helper: Binarization filter (clears white/grey paper background, converts white paper to transparent)
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

  // Helper: Compress signature image to keep state light
  const compressImage = (base64: string, shouldBinarize: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 500;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        
        const compressedBase64 = canvas.toDataURL('image/png', 0.85);
        
        if (shouldBinarize) {
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

  // Save Drawn Signature from Canvas
  const saveDrawnSignature = async () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const sigData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      const compressed = await compressImage(sigData, false);
      setSignature(compressed);
      onSave(compressed);
    }
  };

  // Handle Image File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file (PNG, JPG, JPEG)');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          const compressed = await compressImage(result, true);
          setSignature(compressed);
          onSave(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera Capture
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
      setCameraError("Camera access failed. Please select an image file or draw directly.");
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

  const snapPhoto = async () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const compressed = await compressImage(dataUrl, true);
        setSignature(compressed);
        onSave(compressed);
        stopCamera();
      }
    }
  };

  // Clear Signature
  const clearSignature = () => {
    setSignature(null);
    onSave('');
    if (sigPad.current) {
      sigPad.current.clear();
    }
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {!signature ? (
        <div className="space-y-3">
          {/* Signature Canvas Pad */}
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-2 bg-gray-50 hover:border-gray-300 transition-colors">
            <SignatureCanvas
              ref={sigPad}
              penColor="#0f172a"
              canvasProps={{
                className: "w-full h-36 rounded-xl cursor-crosshair",
                style: { background: '#ffffff', touchAction: 'none' }
              }}
            />
            <div className="flex justify-between items-center mt-2 px-1">
              <button
                type="button"
                onClick={() => sigPad.current?.clear()}
                className="text-[11px] font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Pad
              </button>
              <button
                type="button"
                onClick={saveDrawnSignature}
                className="text-[11px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 py-1 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" /> Save Signature
              </button>
            </div>
          </div>

          {/* Separator / Alternative Upload Option */}
          <div className="flex items-center gap-2 justify-center my-1">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">
              OR UPLOAD IMAGE / CAMERA CAPTURE
            </span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          {/* Upload & Camera Buttons */}
          {!isCameraActive ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 rounded-xl p-2.5 text-center cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-bold text-gray-700">Upload Signature File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>
            </div>
          ) : (
            /* Active Camera Stream Modal Overlay */
            <div className="space-y-3 bg-slate-900 p-4 rounded-2xl text-white">
              {cameraError && (
                <div className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {cameraError}
                </div>
              )}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-dashed border-emerald-400/50 rounded-lg pointer-events-none flex items-center justify-center">
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-black/70 px-2 py-0.5 rounded">
                    Position Signature Paper Here
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={snapPhoto}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" /> Snap Photo
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Saved Signature Display State */
        <div className="relative group border rounded-xl p-3 bg-white flex flex-col items-center justify-center min-h-[110px] shadow-sm">
          <img src={signature} alt="Captured Signature" className="max-h-24 object-contain" />
          <button
            type="button"
            onClick={clearSignature}
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors cursor-pointer"
            title="Clear & Re-sign"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="mt-1 text-[9px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <Check className="w-3 h-3" /> Signature Saved
          </div>
        </div>
      )}
    </div>
  );
};

