import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  useStudents,
  useScheduleEvents,
  useCreateScheduleEvent,
  useCompleteScheduleEvent,
  useReopenScheduleEvent,
  useDeleteScheduleEvent,
} from "../hooks/queries";
import { useToast } from "../context/ToastContext";
import "../styles/IepCalendar.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatScheduledDateTime(dateStr, timeStr) {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const monthName = MONTH_NAMES[dateObj.getMonth()];
    const formattedDate = `${monthName} ${day}, ${year}`;
    if (timeStr) {
      const cleanTime = timeStr.slice(0, 5);
      return `${formattedDate} @${cleanTime}`;
    }
    return formattedDate;
  } catch {
    return dateStr;
  }
}

export default function IepCalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(() => new Date());

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }, []);

  const selectedStudentId = searchParams.get("studentId") || "";

  // Modals & Drawers state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // for clicking a day on mobile month grid

  // Data queries
  const { data: studentsData = [] } = useStudents(user?.id);
  const studentList = Array.isArray(studentsData) ? studentsData : (studentsData?.results || []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Fetch events for current year & month (or surrounding)
  const queryParams = useMemo(() => {
    const p = {
      year: currentYear,
      month: currentMonth + 1,
    };
    if (selectedStudentId) {
      p.studentID = selectedStudentId;
    }
    return p;
  }, [currentYear, currentMonth, selectedStudentId]);

  const { data: eventsData = [], isFetching } = useScheduleEvents(queryParams);
  const events = useMemo(
    () => (Array.isArray(eventsData) ? eventsData : eventsData?.results || []),
    [eventsData],
  );

  // Mutations
  const createMutation = useCreateScheduleEvent();
  const completeMutation = useCompleteScheduleEvent();
  const reopenMutation = useReopenScheduleEvent();
  const deleteMutation = useDeleteScheduleEvent();

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Previous month's trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dateStr = `${currentMonth === 0 ? currentYear - 1 : currentYear}-${String(
        currentMonth === 0 ? 12 : currentMonth,
      ).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dayNumber: dayNum,
        dateString: dateStr,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const todayStr = new Date().toISOString().split("T")[0];
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
        i,
      ).padStart(2, "0")}`;
      days.push({
        dayNumber: i,
        dateString: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month's leading days (pad to 35 or 42 cells)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const dateStr = `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String(
        currentMonth === 11 ? 1 : currentMonth + 2,
      ).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dayNumber: i,
        dateString: dateStr,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const d = ev.due_date;
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events]);

  // Navigation handlers
  const handlePrevYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleYearChange = (e) => {
    const yr = Number(e.target.value);
    setCurrentDate(new Date(yr, currentMonth, 1));
  };

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    const years = [];
    for (let y = base - 3; y <= base + 5; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const handleStudentFilterChange = (e) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ studentId: val });
    } else {
      setSearchParams({});
    }
  };

  // Event Action handlers
  const handleToggleComplete = async (event) => {
    if (isTogglingStatus) return;
    setIsTogglingStatus(true);
    try {
      if (event.status === "completed") {
        await reopenMutation.mutateAsync(event.eventID);
        toast.success(`Reopened "${event.title}"`);
      } else {
        await completeMutation.mutateAsync(event.eventID);
        toast.success(`Completed "${event.title}"`);
      }
      setSelectedEvent(null);
    } catch (err) {
      toast.error(err.message || "Failed to update event status.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteMutation.mutateAsync(eventToDelete.eventID);
      toast.success("Event deleted successfully.");
      setEventToDelete(null);
      setSelectedEvent(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete event.");
    }
  };

  const handleRecordProgress = (studentId) => {
    setSelectedEvent(null);
    if (studentId) {
      navigate(`/dashboard/monitoring?studentId=${studentId}`);
    } else {
      navigate("/dashboard/monitoring");
    }
  };

  const getEventBadgeStyle = (ev) => {
    if (ev.status === "completed") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (ev.is_overdue) {
      return "bg-red-50 text-red-700 border-red-200 font-bold";
    }
    if (ev.event_type === "quarterly_review") {
      return "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
    }
    if (ev.event_type === "annual_renewal") {
      return "bg-purple-50 text-purple-800 border-purple-200 font-semibold";
    }
    if (ev.event_type === "custom_meeting") {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className="iep-calendar-container page-content w-full" data-testid="iep-calendar-page">
      {/* ── TOP HEADER: TITLE & PRIMARY ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#eef6fd] text-[#3d9de8] flex items-center justify-center font-bold">
              <i className="ti ti-calendar-event text-lg" aria-hidden="true" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
              Calendar &amp; Schedules
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5" data-testid="today-date-text">
            <span>Today&apos;s Date: <strong className="text-slate-700">{todayFormatted}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Custom Event */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#5aabf0] hover:bg-[#3d9de8] text-white shadow-xs transition-all cursor-pointer"
            data-testid="add-event-btn"
          >
            <i className="ti ti-plus" aria-hidden="true" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* ── FILTER & CONTROLS STRIP: 2 DEDICATED ROWS ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6 flex flex-col gap-3.5">
        {/* Row 1: Date Navigation (<<, <, Month Year, >, >>, Today) strictly in 1 single row */}
        <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 flex-nowrap w-full pb-3 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrevYear}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Previous Year"
              aria-label="Previous year"
              data-testid="prev-year-btn"
            >
              <i className="ti ti-chevrons-left text-sm sm:text-base" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Previous Month"
              aria-label="Previous month"
              data-testid="prev-month-btn"
            >
              <i className="ti ti-chevron-left text-sm sm:text-base" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 bg-slate-50 rounded-xl border border-slate-200 shrink-0 justify-center">
            <span className="text-xs sm:text-base font-bold text-slate-900">
              {MONTH_NAMES[currentMonth]}
            </span>
            <select
              value={currentYear}
              onChange={handleYearChange}
              className="text-xs sm:text-base font-extrabold text-[#1a6fa8] bg-transparent cursor-pointer focus:outline-none hover:text-[#0284c7]"
              aria-label="Select Year"
              data-testid="year-select"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Next Month"
              aria-label="Next month"
              data-testid="next-month-btn"
            >
              <i className="ti ti-chevron-right text-sm sm:text-base" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNextYear}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Next Year"
              aria-label="Next year"
              data-testid="next-year-btn"
            >
              <i className="ti ti-chevrons-right text-sm sm:text-base" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 ml-0.5 cursor-pointer shrink-0"
              data-testid="today-btn"
            >
              Today
            </button>
          </div>
        </div>

        {/* Row 2: Filter by Student */}
        <div className="flex items-center gap-2.5 w-full">
          <label htmlFor="student-filter" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Filter by Student:
          </label>
          <select
            id="student-filter"
            value={selectedStudentId}
            onChange={handleStudentFilterChange}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-[#5aabf0]"
            data-testid="student-filter-select"
          >
            <option value="">All Students ({studentList.length})</option>
            {studentList.map((st) => (
              <option key={st.studentID || st.id} value={st.studentID || st.id}>
                {st.name || `Student #${st.studentID || st.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── MAIN BODY: MONTH GRID VIEW ── */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
        {/* Subtle top indicator during month data fetch */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10" aria-hidden="true">
            <div className="h-full bg-blue-600 animate-pulse w-full" />
          </div>
        )}

        {/* Weekday headers */}
        <div className="w-full grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-2.5">
          {WEEKDAY_NAMES.map((name) => (
            <div key={name} className="w-full truncate">{name}</div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="w-full grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[600px] sm:min-h-[700px]">
          {calendarDays.map((cell) => {
            const dayEvents = eventsByDate[cell.dateString] || [];
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={cell.dateString}
                onClick={() => {
                  if (hasEvents) {
                    if (window.innerWidth <= 768) {
                      setSelectedDayEvents({ date: cell.dateString, events: dayEvents });
                    }
                  }
                }}
                className={`calendar-cell w-full min-w-0 min-h-[110px] sm:min-h-[135px] p-1.5 flex flex-col justify-start transition-colors ${
                  !cell.isCurrentMonth
                    ? "bg-slate-50/40 text-slate-300"
                    : cell.isToday
                    ? "bg-blue-50/30 text-slate-900"
                    : "bg-white text-slate-700"
                } ${hasEvents ? "cursor-pointer hover:bg-slate-50/80" : ""}`}
                data-testid={`calendar-cell-${cell.dateString}`}
              >
                  {/* Date number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        cell.isToday
                          ? "bg-blue-600 text-white font-bold"
                          : !cell.isCurrentMonth
                          ? "text-slate-400"
                          : "text-slate-700"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Mobile colored indicator dots on small screens */}
                    <div className="flex md:hidden items-center gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.eventID}
                          className={`w-1.5 h-1.5 rounded-full ${
                            ev.status === "completed"
                              ? "bg-emerald-500"
                              : ev.is_overdue
                              ? "bg-red-500"
                              : "bg-blue-500"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Desktop Event Pills */}
                  <div className="hidden md:flex flex-col gap-1 mt-1 overflow-hidden flex-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const badgeStyle = getEventBadgeStyle(ev);
                      return (
                        <button
                          key={ev.eventID}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded border truncate cursor-pointer transition-transform hover:scale-[1.01] ${badgeStyle}`}
                          title={ev.title}
                          data-testid={`event-pill-${ev.eventID}`}
                        >
                          <span className="font-semibold">
                            {ev.status === "completed" ? "✓ " : ""}
                            {ev.student_name ? `${ev.student_name.split(" ")[0]}: ` : ""}
                          </span>
                          <span>{ev.title}</span>
                        </button>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <span className="text-[10px] font-bold text-slate-500 px-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* ── EVENT DETAILS DRAWER / MODAL ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-drawer-title"
          data-testid="event-details-drawer"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 mb-1.5 ${getEventBadgeStyle(
                    selectedEvent,
                  )}`}
                >
                  {selectedEvent.status === "completed"
                    ? "Completed"
                    : selectedEvent.is_overdue
                    ? "Overdue"
                    : "Pending"}
                </span>
                <h3 id="event-drawer-title" className="text-lg font-bold text-slate-900">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close details"
              >
                <i className="ti ti-x text-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-semibold text-slate-800">
                  {selectedEvent.student_name || "General Classroom Event"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatScheduledDateTime(selectedEvent.due_date, selectedEvent.due_time)}
                </span>
              </div>
              {selectedEvent.timeline_mins_session && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Prescribed Dosage:</span>
                  <span className="font-semibold text-blue-700">
                    {selectedEvent.timeline_mins_session}
                  </span>
                </div>
              )}
              {selectedEvent.iep_version && (
                <div className="flex justify-between">
                  <span className="text-slate-500">IEP Reference:</span>
                  <span className="font-semibold text-slate-800">
                    Version {selectedEvent.iep_version}
                  </span>
                </div>
              )}
            </div>

            {selectedEvent.notes && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Objectives &amp; Guidance
                </h4>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                  {selectedEvent.notes}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setEventToDelete(selectedEvent)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                data-testid="open-delete-event-btn"
              >
                Delete Event
              </button>

              <div className="flex items-center gap-2">
                {selectedEvent.student_id && (
                  <button
                    type="button"
                    onClick={() => handleRecordProgress(selectedEvent.student_id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#5aabf0] hover:bg-[#3d9de8] text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <i className="ti ti-chart-bar" aria-hidden="true" />
                    <span>Record Progress</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isTogglingStatus}
                  onClick={() => handleToggleComplete(selectedEvent)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                  data-testid="toggle-event-complete-btn"
                >
                  <i className={`ti ${selectedEvent.status === "completed" ? "ti-rotate-clockwise" : "ti-check"}`} aria-hidden="true" />
                  <span>{isTogglingStatus ? "Updating..." : selectedEvent.status === "completed" ? "Reopen" : "Mark Done"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE DAY CLICK BOTTOM SHEET MODAL ── */}
      {selectedDayEvents && (
        <div
          className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedDayEvents(null)}
          data-testid="day-events-modal"
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Events for {formatScheduledDateTime(selectedDayEvents.date)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {selectedDayEvents.events.map((ev) => (
                <div key={ev.eventID} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{ev.title}</p>
                    <p className="text-[11px] text-slate-500">👤 {ev.student_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(ev);
                    }}
                    className="text-xs font-semibold text-[#3d9de8] px-2 py-1 rounded bg-[#eef6fd]"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-[1100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setEventToDelete(null)}
          data-testid="confirm-delete-modal"
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <i className="ti ti-trash" aria-hidden="true" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Scheduled Event?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <span className="font-semibold text-slate-700">&ldquo;{eventToDelete.title}&rdquo;</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="w-1/2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={handleConfirmDelete}
                className="w-1/2 py-2 px-3 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                data-testid="confirm-delete-btn"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CUSTOM EVENT MODAL ── */}
      {isAddModalOpen && (
        <AddCustomEventModal
          students={studentList}
          onClose={() => setIsAddModalOpen(false)}
          onCreate={async (formData) => {
            try {
              await createMutation.mutateAsync(formData);
              toast.success("Scheduled event created successfully!");
              setIsAddModalOpen(false);
            } catch (err) {
              toast.error(err.message || "Failed to create event.");
            }
          }}
        />
      )}
    </div>
  );
}

function AddCustomEventModal({ students, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: "",
    student: "",
    event_type: "custom_meeting",
    due_date: new Date().toISOString().split("T")[0],
    due_time: "10:00",
    priority: "medium",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please enter an event title.");
      return;
    }
    if (!formData.due_date) {
      alert("Please specify a due date.");
      return;
    }
    if (!formData.due_time) {
      alert("Please specify an event time.");
      return;
    }

    const payload = {
      ...formData,
      student: formData.student ? Number(formData.student) : null,
    };

    setIsSubmitting(true);
    try {
      await onCreate(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-event-title"
      data-testid="add-custom-event-modal"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#eef6fd] text-[#3d9de8] flex items-center justify-center font-bold">
              <i className="ti ti-calendar-plus" aria-hidden="true" />
            </span>
            <h3 id="add-event-title" className="text-base font-bold text-slate-900">
              Add Scheduled Event
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Parent IEP Meeting, Motor Skills Review"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="event-title-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student (Optional)
            </label>
            <select
              value={formData.student}
              onChange={(e) => setFormData({ ...formData, student: e.target.value })}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="event-student-select"
            >
              <option value="">General (No Student)</option>
              {students.map((st) => (
                <option key={st.studentID || st.id} value={st.studentID || st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                data-testid="event-date-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={formData.due_time}
                onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
                data-testid="event-time-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
              {["low", "medium", "high", "urgent"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: lvl })}
                  className={`py-1.5 rounded-lg border font-semibold capitalize cursor-pointer transition-colors ${
                    formData.priority === lvl
                      ? "bg-[#5aabf0] text-white border-[#5aabf0]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes &amp; Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Enter meeting agenda or skills to evaluate..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5aabf0] resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#5aabf0] hover:bg-[#3d9de8] text-white shadow-xs disabled:opacity-50 cursor-pointer"
              data-testid="save-event-submit-btn"
            >
              {isSubmitting ? "Saving..." : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
