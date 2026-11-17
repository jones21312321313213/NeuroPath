import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/queries";
import { Button } from "../components/ui/Button";

const PAGE_SIZE = 10;

const PRIORITY_BADGE_MAP = {
  urgent: {
    label: "Urgent (3d alert)",
    classes: "bg-red-100 text-red-700 border-red-200",
  },
  high: {
    label: "High (3d alert)",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
  medium: {
    label: "Medium (2d alert)",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  low: {
    label: "Low (1d alert)",
    classes: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const TRIGGER_BADGE_MAP = {
  overdue: {
    label: "Overdue",
    classes: "bg-red-600 text-white",
    icon: "ti-alert-triangle",
    iconBg: "bg-red-100 text-red-600",
  },
  due_today: {
    label: "Due Today",
    classes: "bg-sky-600 text-white",
    icon: "ti-bell-ringing",
    iconBg: "bg-sky-100 text-sky-600",
  },
  advance_notice: {
    label: "Upcoming Reminder",
    classes: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: "ti-clock",
    iconBg: "bg-blue-100 text-blue-600",
  },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data, isLoading, isError, error, refetch } = useNotifications({
    page,
    status: statusFilter,
    priority: priorityFilter,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = data?.results || [];
  const totalCount = data?.count ?? notifications.length;
  const totalPages = Math.max(1, data?.total_pages ?? Math.ceil(totalCount / PAGE_SIZE));
  const unreadCount = data?.unread_count ?? 0;
  const highPriorityCount = data?.high_priority_count ?? 0;

  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const handlePriorityChange = (nextPriority) => {
    setPriorityFilter(nextPriority);
    setPage(1);
  };

  const formatTimestamp = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <i className="ti ti-bell text-xl" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 m-0">
                  Notifications History
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 m-0">
                  Priority alerts trigger automatically: <strong>Low</strong> (1 day before),{" "}
                  <strong>Medium</strong> (2 days before), <strong>High</strong> (3 days before) &amp; on the event day.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/schedule")}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <i className="ti ti-calendar-event mr-1.5" aria-hidden="true" />
              Open Schedule &amp; Calendar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              <i className="ti ti-checks mr-1.5" aria-hidden="true" />
              {markAllReadMutation.isPending ? "Marking..." : "Mark All as Read"}
            </Button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Total Logged
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900" data-testid="notif-total-count">
              {totalCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/70">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 block">
              Unread Alerts
            </span>
            <span className="text-lg sm:text-xl font-bold text-sky-700" data-testid="notif-unread-count">
              {unreadCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/70">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700 block">
              High Priority Unread
            </span>
            <span className="text-lg sm:text-xl font-bold text-red-700" data-testid="notif-high-count">
              {highPriorityCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by read status">
          {[
            { key: "all", label: "All History" },
            { key: "unread", label: "Unread" },
            { key: "read", label: "Read" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatusChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="notif-priority-filter" className="text-xs font-semibold text-slate-600">
            Priority:
          </label>
          <select
            id="notif-priority-filter"
            value={priorityFilter}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High (3d lead)</option>
            <option value="medium">Medium (2d lead)</option>
            <option value="low">Low (1d lead)</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Loading notifications history...
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-medium text-red-600 m-0">Unable to load notification history.</p>
            {error?.message && (
              <p className="text-xs text-slate-500 m-0">{error.message}</p>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <i className="ti ti-bell-off text-2xl" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-700 m-0">No notifications found</p>
            <p className="text-xs text-slate-500 m-0">
              {statusFilter !== "all" || priorityFilter !== "all"
                ? "Try clearing your active filters to view all notifications."
                : "Milestone alerts and reminders will appear here as IEP deadlines approach."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100" data-testid="notifications-list">
            {notifications.map((item) => {
              const prioMeta =
                PRIORITY_BADGE_MAP[item.priority] || PRIORITY_BADGE_MAP.medium;
              const triggerMeta =
                TRIGGER_BADGE_MAP[item.trigger_type] || TRIGGER_BADGE_MAP.advance_notice;

              return (
                <div
                  key={item.notificationID}
                  data-testid={`notification-row-${item.notificationID}`}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors ${
                    !item.is_read
                      ? "bg-sky-50/40 hover:bg-sky-50/70"
                      : "bg-white hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${triggerMeta.iconBg}`}
                    >
                      <i className={`ti ${triggerMeta.icon} text-lg`} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!item.is_read && (
                          <span
                            className="w-2 h-2 rounded-full bg-sky-600 flex-shrink-0"
                            title="Unread"
                            aria-label="Unread notification"
                          />
                        )}
                        <h3 className="text-sm font-bold text-slate-900 m-0 truncate">
                          {item.title}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${triggerMeta.classes}`}
                        >
                          {triggerMeta.label}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${prioMeta.classes}`}
                        >
                          {prioMeta.label}
                        </span>
                      </div>

                      {item.message && (
                        <p className="text-xs text-slate-600 m-0 leading-relaxed">
                          {item.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        {item.student_name && (
                          <span className="font-medium text-slate-700">
                            👤 {item.student_name}
                          </span>
                        )}
                        {item.due_date && (
                          <span>
                            📅 Event Date: <strong>{item.due_date}</strong>
                          </span>
                        )}
                        {item.created_at && (
                          <span>Notified: {formatTimestamp(item.created_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0 pl-12 sm:pl-0">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(item.notificationID)}
                        disabled={markReadMutation.isPending}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                    {item.student_id && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/dashboard/monitoring?studentId=${item.student_id}`)
                        }
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                      >
                        Record Progress →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer (10 per page) */}
        {totalCount > 0 && (
          <div
            className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3"
            data-testid="notifications-pagination"
          >
            <span className="text-xs text-slate-600 font-medium">
              Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
              <strong>{totalCount}</strong> notifications (10 per page)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - page) <= 1,
                )
                .map((pageNum, idx, arr) => {
                  const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
                  return (
                    <span key={pageNum} className="inline-flex items-center gap-1.5">
                      {showEllipsis && (
                        <span className="px-1 text-xs text-slate-400">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(pageNum)}
                        aria-current={page === pageNum ? "page" : undefined}
                        className={`w-8 h-8 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          page === pageNum
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </span>
                  );
                })}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
