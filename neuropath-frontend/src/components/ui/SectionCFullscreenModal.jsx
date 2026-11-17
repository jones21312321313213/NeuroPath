import { useState, useEffect, useRef } from "react";

function isPortraitMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 640 && window.innerHeight > window.innerWidth;
}

function getDefaultZoom(isPortraitMobile) {
  if (!isPortraitMobile || typeof window === "undefined") return 80;
  const landscapeWidth = Math.max(window.innerHeight - 36, 360);
  const fitPercent = Math.floor((landscapeWidth / 1480) * 100);
  return Math.max(45, Math.min(80, fitPercent));
}

function SectionCFullscreenDialog({
  onClose,
  title,
  children,
  contentClassName = "iep-table-wrap iep-table-fullscreen-content",
}) {
  const containerRef = useRef(null);
  const [isPortraitMobile, setIsPortraitMobile] = useState(() =>
    isPortraitMobileViewport(),
  );
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(() =>
    isPortraitMobileViewport(),
  );
  const [defaultZoom] = useState(() => getDefaultZoom(isPortraitMobileViewport()));
  const [zoomLevel, setZoomLevel] = useState(defaultZoom);

  const isCssLandscapeRotated = isPortraitMobile && autoRotateEnabled;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const tryNativeLandscape = async () => {
      if (!isPortraitMobileViewport()) return;
      try {
        if (
          containerRef.current &&
          typeof containerRef.current.requestFullscreen === "function" &&
          !document.fullscreenElement
        ) {
          await containerRef.current.requestFullscreen();
        }
      } catch {
        // Ignore if browser blocks programmatic fullscreen
      }
      try {
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock("landscape");
        }
      } catch {
        // Native orientation lock unsupported on iOS Safari / desktop emulation;
        // CSS landscape rotation fallback handles 390x844 automatically.
      }
    };

    tryNativeLandscape();

    const handleViewportChange = () => {
      const portrait = isPortraitMobileViewport();
      setIsPortraitMobile(portrait);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("keydown", handleKeyDown);

      try {
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      } catch {
        // Ignore unlock errors
      }
      try {
        if (
          document.fullscreenElement &&
          typeof document.exitFullscreen === "function"
        ) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // Ignore exitFullscreen errors
      }
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="iep-fullscreen-backdrop fixed inset-0 z-[1050] bg-slate-900/85 backdrop-blur-sm flex flex-col p-2 sm:p-5 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Section C Learner Goals Fullscreen View"
      data-landscape-rotated={isCssLandscapeRotated ? "true" : "false"}
    >
      <div
        className={`flex flex-col ${
          isCssLandscapeRotated
            ? "iep-fullscreen-landscape-rotated"
            : "flex-1 w-full h-full min-h-0"
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden border border-slate-200 min-h-0">
          <div className="iep-fullscreen-header px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <i className="ti ti-table text-sky-400 text-lg shrink-0" aria-hidden="true" />
              <span className="font-bold text-xs sm:text-sm tracking-wide truncate">
                {title}
              </span>
              {isCssLandscapeRotated && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
                  Landscape
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isPortraitMobile && (
                <button
                  type="button"
                  onClick={() => setAutoRotateEnabled((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 text-xs font-semibold cursor-pointer transition-colors border border-white/15"
                  aria-label={
                    autoRotateEnabled
                      ? "Switch to portrait orientation"
                      : "Rotate to landscape orientation"
                  }
                  title="Toggle Landscape / Portrait view"
                >
                  <i className="ti ti-rotate-clockwise-2 text-sm" aria-hidden="true" />
                  <span>{autoRotateEnabled ? "Portrait" : "Landscape"}</span>
                </button>
              )}

              <div
                className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/15"
                role="group"
                aria-label="Zoom controls"
              >
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 10, 40))}
                  className="p-1 px-2 text-white/90 hover:text-white hover:bg-white/10 rounded text-xs font-bold transition-colors cursor-pointer"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <i className="ti ti-minus" aria-hidden="true" />
                </button>
                <span className="px-2 text-xs font-semibold text-white/90 select-none min-w-[42px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 10, 130))}
                  className="p-1 px-2 text-white/90 hover:text-white hover:bg-white/10 rounded text-xs font-bold transition-colors cursor-pointer"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <i className="ti ti-plus" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(defaultZoom)}
                  className="px-2 py-0.5 ml-1 text-[11px] font-semibold text-sky-300 hover:text-sky-200 hover:bg-white/10 rounded transition-colors cursor-pointer"
                  title={`Reset zoom (${defaultZoom}%)`}
                >
                  {defaultZoom}% (Default)
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-colors"
                aria-label="Exit fullscreen"
              >
                <i className="ti ti-x text-sm" aria-hidden="true" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          <div className="iep-fullscreen-body flex-1 overflow-auto p-3 sm:p-5 bg-slate-50">
            <div
              className={`${contentClassName} bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all`}
              style={{ zoom: `${zoomLevel}%` }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionCFullscreenModal({
  isOpen,
  onClose,
  title = "Section C: Learner's Goal — Fullscreen View",
  children,
  contentClassName,
}) {
  if (!isOpen) return null;
  return (
    <SectionCFullscreenDialog
      onClose={onClose}
      title={title}
      contentClassName={contentClassName}
    >
      {children}
    </SectionCFullscreenDialog>
  );
}
