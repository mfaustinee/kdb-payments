import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Trash2, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  label: string;
  value?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, label, value }) => {
  const sigPad = useRef<SignatureCanvas>(null);
  const [signature, setSignature] = useState<string | null>(value || null);

  // Sync internal state with prop value if it changes externally
  useEffect(() => {
    if (value !== undefined) {
      setSignature(value || null);
    }
  }, [value]);

  // 1. Helper to compress the signature (keeps database light)
  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 400; // Smaller for signatures
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        // Save as PNG to preserve transparency
        resolve(canvas.toDataURL('image/png', 0.7));
      };
    });
  };

  // 2. Save logic
  const saveSignature = async () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const rawData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      const compressed = await compressImage(rawData);
      setSignature(compressed);
      onSave(compressed);
    }
  };

  const clearSignature = () => {
    setSignature(null);
    onSave('');
  };

  return (
    <div className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-200">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
        {label}
      </label>
      
      {!signature ? (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-1 bg-gray-50">
            <SignatureCanvas
              ref={sigPad}
              penColor="black"
              canvasProps={{
                className: "w-full h-40 rounded-lg cursor-crosshair",
                style: { background: 'white' }
              }}
            />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => sigPad.current?.clear()}
              className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={14} /> Clear
            </button>
            <button
              type="button"
              onClick={saveSignature}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <PenTool size={14} /> Save Signature
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group p-4 bg-slate-50 rounded-xl border border-slate-100">
          <img src={signature} alt="Signature" className="max-h-32 mx-auto border rounded-lg bg-white" />
          <button 
            type="button"
            onClick={clearSignature}
            className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 shadow-lg"
          >
            <Trash2 size={14} />
          </button>
          <div className="mt-2 text-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Signature Captured</span>
          </div>
        </div>
      )}
    </div>
  );
};
