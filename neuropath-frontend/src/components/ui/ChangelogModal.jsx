import { useEffect } from "react";
import { SparklesIcon, CloseIcon } from "./icons";
import { RELEASE_NOTES, CURRENT_RELEASE_VERSION } from "../../constants/releaseNotes";

export default function ChangelogModal({ isOpen, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
      onClick={onClose}
      data-testid="changelog-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#82C7FF]/40 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f0f8ff]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#1a6fa8] flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />
            </div>
            <div>
              <h2 id="changelog-modal-title" className="text-lg font-extrabold text-[#1a3a4a]">
                Changelog &amp; Release Notes
              </h2>
              <p className="text-xs text-[#5a9dbf]">
                What's new in NeuroPath {CURRENT_RELEASE_VERSION}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {RELEASE_NOTES.map((rel) => (
            <div
              key={rel.version}
              className="rounded-xl border border-slate-200/80 p-5 bg-slate-50/50"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-[#1a6fa8]">
                    {rel.version}
                  </span>
                  {rel.isLatest && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                      Latest Release
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {rel.date}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                {rel.summary}
              </p>
              <ul className="space-y-2">
                {rel.changes.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <span className="leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1a6fa8] hover:bg-[#155a8a] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
