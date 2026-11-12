import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { QueryClientContext } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useUpcomingDeadlines } from "../../hooks/queries";

function TopbarNotificationBellInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const storageKey = user?.id ? `neuropath_seen_deadlines_${user.id}` : "neuropath_seen_deadlines";

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const { data: deadlinesData = [] } = useUpcomingDeadlines(14);
  const deadlines = Array.isArray(deadlinesData) ? deadlinesData : (deadlinesData?.results || []);

  const totalCount = deadlines.length;
  const overdueCount = deadlines.filter((d) => d.is_overdue).length;
  const hasOverdue = overdueCount > 0;

  const getStoredSeen = (key) => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? Number(saved) : 0;
    } catch {
      return 0;
    }
  };

  // Track seen count persistently across re-logins in localStorage
  const [seenCount, setSeenCount] = useState(() => getStoredSeen(storageKey));
  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);

  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey);
    setSeenCount(getStoredSeen(storageKey));
  }

  const unreadCount = Math.max(0, totalCount - seenCount);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSeenCount(totalCount);
        try {
          localStorage.setItem(storageKey, String(totalCount));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleOpenCalendar = () => {
    setIsOpen(false);
    navigate("/dashboard/schedule");
  };

  const handleRecordProgress = (studentId) => {
    setIsOpen(false);
    if (studentId) {
      navigate(`/dashboard/monitoring?studentId=${studentId}`);
    } else {
      navigate("/dashboard/monitoring");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Notifications: ${unreadCount} new upcoming deadlines`}
        aria-expanded={isOpen}
        data-testid="topbar-notification-bell-btn"
      >
        <i className="ti ti-bell text-lg" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm ${
              hasOverdue ? "bg-red-500 animate-pulse" : "bg-blue-600"
            }`}
            data-testid="notification-badge"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed left-3 right-3 top-[58px] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="dialog"
          aria-label="Upcoming Deadlines Notifications"
          data-testid="notifications-dropdown"
        >
          {/* Top Pointer Arrow aiming toward the Notification Bell */}
          <div
            className="absolute -top-2 right-14 sm:right-3.5 w-4 h-4 bg-slate-50 border-t border-l border-slate-200 rotate-45 z-20 pointer-events-none"
            aria-hidden="true"
          />

          <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ti ti-calendar-event text-blue-600" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                IEP Milestone Deadlines
              </span>
            </div>
            {hasOverdue && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {overdueCount} Overdue
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {deadlines.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <i className="ti ti-calendar-check text-2xl text-blue-500 mb-1" aria-hidden="true" />
                <p className="text-xs font-medium text-slate-700">No approaching deadlines</p>
                <p className="text-[11px] text-slate-400">All IEP progress reviews are up to date.</p>
              </div>
            ) : (
              deadlines.slice(0, 5).map((item) => (
                <div
                  key={item.eventID}
                  className="p-3 hover:bg-slate-50/80 transition-colors flex items-start gap-2.5"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.is_overdue
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <i
                      className={`ti ${item.is_overdue ? "ti-alert-circle" : "ti-clock"} text-sm`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      {item.student_name && <span>👤 {item.student_name}</span>}
                      <span>• Due {item.due_date}</span>
                    </p>
                  </div>
                  {item.student_id && (
                    <button
                      type="button"
                      onClick={() => handleRecordProgress(item.student_id)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                      title="Record progress scores"
                    >
                      Record →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleOpenCalendar}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Full Schedule &amp; Calendar</span>
              <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}

export default function TopbarNotificationBell() {
  const queryClient = useContext(QueryClientContext);
  if (!queryClient) {
    return (
      <div className="relative">
        <button
          type="button"
          className="relative w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
          aria-label="Notifications"
          data-testid="topbar-notification-bell-btn"
        >
          <i className="ti ti-bell text-lg" aria-hidden="true" />
        </button>
      </div>
    );
  }
  return <TopbarNotificationBellInner />;
}

