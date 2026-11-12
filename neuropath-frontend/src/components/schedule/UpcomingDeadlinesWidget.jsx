import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpcomingDeadlines, useCompleteScheduleEvent } from "../../hooks/queries";
import { useToast } from "../../context/ToastContext";

export default function UpcomingDeadlinesWidget({ onNavigateCalendar }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: deadlinesData = [], isLoading, isError } = useUpcomingDeadlines(14);
  const completeMutation = useCompleteScheduleEvent();
  const [completingId, setCompletingId] = useState(null);

  const deadlines = Array.isArray(deadlinesData) ? deadlinesData : (deadlinesData?.results || []);

  const handleComplete = async (eventID, title) => {
    try {
      setCompletingId(eventID);
      await completeMutation.mutateAsync(eventID);
      toast.success(`Completed "${title}"`);
    } catch (err) {
      toast.error(err.message || "Failed to mark event completed.");
    } finally {
      setCompletingId(null);
    }
  };

  const handleRecordProgress = (studentId) => {
    if (studentId) {
      navigate(`/dashboard/monitoring?studentId=${studentId}`);
    } else {
      navigate("/dashboard/monitoring");
    }
  };

  const getUrgencyBadge = (item) => {
    if (item.is_overdue) {
      return {
        label: "Overdue",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: "ti-alert-circle",
      };
    }
    const days = item.days_remaining;
    if (days === 0) {
      return {
        label: "Due Today",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: "ti-clock",
      };
    }
    if (days === 1) {
      return {
        label: "Due Tomorrow",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "ti-clock",
      };
    }
    if (days <= 3) {
      return {
        label: `In ${days} days`,
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "ti-calendar-time",
      };
    }
    if (days <= 7) {
      return {
        label: `In ${days} days`,
        className: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "ti-calendar-event",
      };
    }
    return {
      label: `In ${days} days`,
      className: "bg-slate-100 text-slate-700 border-slate-200",
      icon: "ti-calendar",
    };
  };

  return (
    <section
      className="overview-deadlines-section"
      data-testid="upcoming-deadlines-section"
      aria-label="Upcoming IEP Deadlines"
    >
      <div className="overview-activity-header">
        <div>
          <p className="overview-section-label" style={{ marginBottom: 2 }}>
            IEP Schedules &amp; Milestone Deadlines
          </p>
          <span className="overview-activity-hint">
            DepEd-mandated 30/60/90-day progress monitoring reviews and approaching renewals
          </span>
        </div>
        <button
          type="button"
          onClick={() => (onNavigateCalendar ? onNavigateCalendar() : navigate("/dashboard/schedule"))}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
          data-testid="view-full-calendar-btn"
        >
          <span>View Full Calendar</span>
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>

      <div className="overview-activity-card">
        {isLoading ? (
          <div className="overview-activity-empty" data-testid="deadlines-loading">
            <i className="ti ti-loader animate-spin overview-activity-empty-icon" aria-hidden="true" />
            <p className="overview-activity-empty-title">Loading approaching deadlines...</p>
          </div>
        ) : isError ? (
          <div className="overview-activity-empty text-red-500" data-testid="deadlines-error">
            <i className="ti ti-alert-triangle overview-activity-empty-icon text-red-400" aria-hidden="true" />
            <p className="overview-activity-empty-title text-red-600">Failed to load schedule deadlines</p>
            <p className="overview-activity-empty-text">Please refresh the dashboard to retry.</p>
          </div>
        ) : deadlines.length === 0 ? (
          <div className="overview-activity-empty" data-testid="deadlines-empty">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <i className="ti ti-calendar-check text-2xl" aria-hidden="true" />
            </div>
            <p className="overview-activity-empty-title text-slate-800">All IEP Milestones Up to Date!</p>
            <p className="overview-activity-empty-text text-slate-500">
              No milestones or conferences are due in the next 14 days. When you accept new IEPs, upcoming 30/60/90-day review dates will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100" role="list">
            {deadlines.map((item) => {
              const urgency = getUrgencyBadge(item);
              const isCompleting = completingId === item.eventID;

              return (
                <div
                  key={item.eventID}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-slate-50/60 rounded-lg px-2"
                  role="listitem"
                  data-testid={`deadline-item-${item.eventID}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        item.is_overdue
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-blue-50 text-blue-600 border-blue-200"
                      }`}
                    >
                      <i className={`ti ${urgency.icon} text-lg`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${urgency.className}`}
                        >
                          <i className={`ti ${urgency.icon} text-xs`} aria-hidden="true" />
                          {urgency.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {item.student_name && (
                          <span className="font-medium text-slate-700">
                            👤 {item.student_name}
                          </span>
                        )}
                        <span>• Due: {item.due_date}</span>
                        {item.timeline_mins_session && (
                          <span className="text-slate-400">
                            • Dosage: {item.timeline_mins_session}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {item.student_id && (
                      <button
                        type="button"
                        onClick={() => handleRecordProgress(item.student_id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                        title="Open Outcome Monitoring to record progress scores for this student"
                      >
                        <i className="ti ti-chart-bar" aria-hidden="true" />
                        <span>Record Progress</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isCompleting}
                      onClick={() => handleComplete(item.eventID, item.title)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Mark milestone assessment complete"
                    >
                      <i className={`ti ${isCompleting ? "ti-loader animate-spin" : "ti-check"}`} aria-hidden="true" />
                      <span>{isCompleting ? "Saving..." : "Mark Done"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
