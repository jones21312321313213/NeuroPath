import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  studentsAPI,
  iepAPI,
  lessonPlansAPI,
  visualAidsAPI,
} from "../api/client";

export const queryKeys = {
  students: (teacherId) => ["students", teacherId ?? "all"],
  student: (studentId) => ["student", studentId],
  iepStats: () => ["iep", "dashboard-stats"],
  studentInsights: (studentId) => ["student-insights", studentId],
  lessonPlans: (teacherId) => ["lesson-plans", teacherId ?? "all"],
  visualAids: (params) => ["visual-aids", params ?? "all"],
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
