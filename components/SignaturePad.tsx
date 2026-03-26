
import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  label: string;
  value?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, label, value }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isEmpty, setIsEmpty] = useState(true);

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    // Handle High DPI screens
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Only resize if dimensions actually changed
      const newWidth = rect.width * dpr;
      const newHeight = rect.height * dpr;
      
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        // Save current content if any, to restore after resize
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.scale(dpr, dpr);
        
        // Reset context styles after resize
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a'; // Slate-900

        // Restore content if it was not empty
        if (tempCtx && (tempCanvas.width > 0 && tempCanvas.height > 0)) {
          ctx.drawImage(tempCanvas, 0, 0, newWidth / dpr, newHeight / dpr);
        } else if (value) {
          // If we have a value but temp was empty (e.g. first resize), restore from value
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, newWidth / dpr, newHeight / dpr);
          };
          img.src = value;
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      
      if ('touches' in e) {
        // Use changedTouches for end events, touches for start/move
        const touch = e.touches[0] || (e as TouchEvent).changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      // Calculate position relative to the canvas element
      // Since we used ctx.scale(dpr, dpr), the internal coordinate system
      // matches the CSS pixel system. So (clientX - rect.left) is exactly
      // the coordinate we need to pass to ctx methods.
      return {
        x: (clientX - rect.left),
        y: (clientY - rect.top)
      };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const pos = getPos(e);
      lastPos.current = pos;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsEmpty(false);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      
      // Prevent scrolling while signing
      if (e.cancelable) e.preventDefault();
      
      const pos = getPos(e);
      
      // Standard smooth drawing logic
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      lastPos.current = pos;
    };

    const stop = () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        // Use JPEG with 0.5 quality to prevent "413 Request Entity Too Large" errors
        // and avoid filling up localStorage quota.
        onSaveRef.current(canvas.toDataURL('image/jpeg', 0.5));
      }
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stop);
    
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', stop);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stop);
    };
  }, []);

  // Auto-restore logic: if we have a value but the canvas is empty, draw it
  useEffect(() => {
    if (value && isEmpty && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Clear first to be safe
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);
        
        // Draw the image. We assume the image was saved at the same aspect ratio
        // or we just fit it to the current canvas size.
        ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [value, isEmpty]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear with the scaled dimensions
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Re-apply scale
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    
    // Reset styles
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    
    setIsEmpty(true);
    onSave('');
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex justify-between items-end">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
          <p className="text-[10px] text-slate-400">Sign inside the box below</p>
        </div>
        {!isEmpty && (
          <button 
            type="button" 
            onClick={clear}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold uppercase tracking-tight"
          >
            Clear
          </button>
        )}
      </div>
      <div className="relative group">
        <canvas 
          ref={canvasRef} 
          className="signature-canvas w-full h-32 bg-slate-50 border-2 border-slate-200 rounded-xl cursor-crosshair touch-none transition-colors group-hover:border-slate-300"
          style={{ touchAction: 'none' }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="text-slate-400 text-sm font-medium italic">Sign here</span>
          </div>
        )}
      </div>
    </div>
  );
};
