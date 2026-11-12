import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  studentsAPI,
  iepAPI,
  lessonPlansAPI,
  visualAidsAPI,
  resourcesAPI,
  trackingAPI,
  scheduleAPI,
} from "../api/client";

export const queryKeys = {
  students: (teacherId) => ["students", teacherId ?? "all"],
  student: (studentId) => ["student", studentId],
  iepStats: () => ["iep", "dashboard-stats"],
  studentInsights: (studentId) => ["student-insights", studentId],
  lessonPlans: (teacherId) => ["lesson-plans", teacherId ?? "all"],
  visualAids: (params) => ["visual-aids", params ?? "all"],
  resourceStats: () => ["resources", "dashboard-stats"],
  recentActivity: () => ["recent-activity"],
  scheduleEvents: (params) => ["schedule-events", params ?? "all"],
  upcomingDeadlines: (days) => ["upcoming-deadlines", days ?? 14],
};


export function useStudents(teacherId, options = {}) {
  const { enabled, ...restOptions } = options;
  return useQuery({
    queryKey: queryKeys.students(teacherId),
    queryFn: () => studentsAPI.list(teacherId),
    enabled: enabled !== undefined ? enabled : Boolean(teacherId),
    ...restOptions,
  });
}

export function useStudent(studentId, options = {}) {
  const { enabled, ...restOptions } = options;
  return useQuery({
    queryKey: queryKeys.student(studentId),
    queryFn: () => studentsAPI.get(studentId),
    enabled: enabled !== undefined ? enabled : Boolean(studentId),
    ...restOptions,
  });
}

export function useIepDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.iepStats(),
    queryFn: () => iepAPI.dashboardStats(),
    ...options,
  });
}

export function useStudentInsights(studentId, options = {}) {
  const { enabled, ...restOptions } = options;
  const isEnabled =
    enabled !== undefined
      ? enabled
      : Boolean(studentId);

  return useQuery({
    queryKey: queryKeys.studentInsights(studentId),
    queryFn: async () => {
      const data = await iepAPI.getInsights(studentId);
      return (Array.isArray(data) ? data : []).map((item) => ({
        id: item.id,
        timestamp: item.created_at,
        summary_text: item.summary_text,
      }));
    },
    enabled: isEnabled,
    ...restOptions,
  });
}

export function useLessonPlans(teacherId, options = {}) {
  return useQuery({
    queryKey: queryKeys.lessonPlans(teacherId),
    queryFn: () => lessonPlansAPI.list(),
    ...options,
  });
}

export function useVisualAids(params = undefined, options = {}) {
  return useQuery({
    queryKey: queryKeys.visualAids(params),
    queryFn: () =>
      params !== undefined ? visualAidsAPI.list(params) : visualAidsAPI.list(),
    ...options,
  });
}

export function useResourceDashboardStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.resourceStats(),
    queryFn: () => resourcesAPI.dashboardStats(),
    ...options,
  });
}

export const useResourceStats = useResourceDashboardStats;

export function useGenerateStudentInsight(studentId, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: (variables) =>
      iepAPI.generateInsight(variables ?? studentId),
    onSuccess: async (data, variables, context) => {
      const targetStudentId = variables ?? studentId;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.studentInsights(targetStudentId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.iepStats(),
        }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}

export function useDeleteStudent(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: (studentId) => studentsAPI.delete(studentId),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["student", variables] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.iepStats() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.resourceStats() }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}

export function useRecentActivity(options = {}) {
  return useQuery({
    queryKey: queryKeys.recentActivity(),
    queryFn: () => trackingAPI.getRecentActivity(),
    ...options,
  });
}

// ── Schedule & Calendar Queries & Mutations (Module 5) ────────────────────────
export function useScheduleEvents(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.scheduleEvents(params),
    queryFn: () => scheduleAPI.list(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

export function useUpcomingDeadlines(days = 14, options = {}) {
  return useQuery({
    queryKey: queryKeys.upcomingDeadlines(days),
    queryFn: () => scheduleAPI.getUpcoming(days),
    ...options,
  });
}

export function useCreateScheduleEvent(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: (data) => scheduleAPI.create(data),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-events"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-deadlines"] }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}

export function useUpdateScheduleEvent(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: ({ id, data }) => scheduleAPI.update(id, data),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-events"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-deadlines"] }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}

export function useCompleteScheduleEvent(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: (id) => scheduleAPI.complete(id),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-events"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-deadlines"] }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}

export function useReopenScheduleEvent(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: (id) => scheduleAPI.reopen(id),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-events"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-deadlines"] }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}

export function useDeleteScheduleEvent(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn: (id) => scheduleAPI.delete(id),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["schedule-events"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-deadlines"] }),
      ]);
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    ...restOptions,
  });
}



