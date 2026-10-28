import { useRef, useState, useEffect } from "react";

export default function SignaturePadModal({
  isOpen,
  onClose,
  onConfirmExport,
  studentName = "Learner",
  teacherName = "SPED Teacher",
  isExporting = false,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Initialize canvas with clear background
    const timer = setTimeout(() => {
      setHasSignature(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext ? canvas.getContext("2d") : null;
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return;
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1F4E79"; // Professional DepEd Navy ink
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return;
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e?.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext("2d") : null;
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const handleExportWithSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirmExport(dataUrl);
  };

  const handleExportWithoutSignature = () => {
    onConfirmExport(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3
              id="signature-modal-title"
              className="text-lg font-bold text-slate-800 flex items-center gap-2"
            >
              <span>✍️</span> Official Document Signature
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Draw your signature below to stamp onto the 6-page landscape official IEP record, or skip to sign with a pen after printing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
            aria-label="Close signature modal"
          >
            ✕
          </button>
        </div>

        {/* Stakeholder Signer Badges */}
        <div className="grid grid-cols-2 gap-3 my-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
              SPED Teacher (Signer)
            </span>
            <span className="font-bold text-slate-800 truncate block">
              {teacherName || "Assigned SPED Teacher"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
              Learner / Student
            </span>
            <span className="font-bold text-slate-800 truncate block">
              {studentName || "Learner"}
            </span>
          </div>
        </div>

        {/* Signature Canvas Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Draw your signature with mouse, trackpad, or finger:</span>
            {hasSignature && (
              <button
                type="button"
                onClick={handleClear}
                className="text-amber-600 hover:text-amber-700 font-semibold text-xs flex items-center gap-1"
              >
                <span>↺</span> Clear Canvas
              </button>
            )}
          </div>

          <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              width={520}
              height={160}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-40 cursor-crosshair bg-slate-50/40 block"
              aria-label="Signature drawing canvas"
            />
            {/* Visual Guideline line on canvas */}
            <div className="absolute bottom-6 left-8 right-8 border-b border-slate-300 pointer-events-none text-[10px] text-slate-400 text-center pb-0.5">
              Sign above this line
            </div>
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs gap-1.5">
                <span>🖊️</span> Click or touch and drag to sign
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportWithoutSignature}
              disabled={isExporting}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              title="Exports the PDF with a clean blank underline for manual pen signing"
            >
              Skip (Sign with Pen)
            </button>

            <button
              type="button"
              onClick={handleExportWithSignature}
              disabled={!hasSignature || isExporting}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                hasSignature && !isExporting
                  ? "bg-blue-600 hover:bg-blue-700 active:scale-98"
                  : "bg-slate-300 cursor-not-allowed text-slate-500 shadow-none"
              }`}
            >
              {isExporting ? (
                <>
                  <span className="animate-spin inline-block">⏳</span> Exporting...
                </>
              ) : (
                <>
                  <span>✨</span> Sign &amp; Export PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
