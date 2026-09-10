import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "../test/query-test-utils";
import {
  queryKeys,
  useStudents,
  useStudent,
  useIepDashboardStats,
  useStudentInsights,
  useLessonPlans,
  useVisualAids,
  useGenerateStudentInsight,
} from "./queries";
import {
  studentsAPI,
  iepAPI,
  lessonPlansAPI,
  visualAidsAPI,
} from "../api/client";

vi.mock("../api/client", () => ({
  studentsAPI: {
    list: vi.fn(),
    get: vi.fn(),
  },
  iepAPI: {
    dashboardStats: vi.fn(),
    getInsights: vi.fn(),
    generateInsight: vi.fn(),
  },
  lessonPlansAPI: {
    list: vi.fn(),
  },
  visualAidsAPI: {
    list: vi.fn(),
  },
}));

function createWrapper(queryClient = createTestQueryClient()) {
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("queryKeys", () => {
  it("generates correct keys for students", () => {
    expect(queryKeys.students(12)).toEqual(["students", 12]);
    expect(queryKeys.students("t-1")).toEqual(["students", "t-1"]);
    expect(queryKeys.students()).toEqual(["students", "all"]);
    expect(queryKeys.students(null)).toEqual(["students", "all"]);
    expect(queryKeys.students(undefined)).toEqual(["students", "all"]);
  });

  it("generates correct keys for student", () => {
    expect(queryKeys.student(42)).toEqual(["student", 42]);
    expect(queryKeys.student("stu-1")).toEqual(["student", "stu-1"]);
  });

  it("generates correct keys for iepStats", () => {
    expect(queryKeys.iepStats()).toEqual(["iep", "dashboard-stats"]);
  });

  it("generates correct keys for studentInsights", () => {
    expect(queryKeys.studentInsights(5)).toEqual(["student-insights", 5]);
    expect(queryKeys.studentInsights("5")).toEqual(["student-insights", "5"]);
  });

  it("generates correct keys for lessonPlans", () => {
    expect(queryKeys.lessonPlans(7)).toEqual(["lesson-plans", 7]);
    expect(queryKeys.lessonPlans()).toEqual(["lesson-plans", "all"]);
    expect(queryKeys.lessonPlans(null)).toEqual(["lesson-plans", "all"]);
  });

  it("generates correct keys for visualAids", () => {
    expect(queryKeys.visualAids({ student_id: 10 })).toEqual([
      "visual-aids",
      { student_id: 10 },
    ]);
    expect(queryKeys.visualAids()).toEqual(["visual-aids", "all"]);
    expect(queryKeys.visualAids(null)).toEqual(["visual-aids", "all"]);
  });
});

describe("useStudents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches students list when teacherId is provided", async () => {
    const mockStudents = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    studentsAPI.list.mockResolvedValueOnce(mockStudents);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudents(10), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsAPI.list).toHaveBeenCalledWith(10);
    expect(result.current.data).toEqual(mockStudents);
  });

  it("is disabled when teacherId is not provided", () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudents(null), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(studentsAPI.list).not.toHaveBeenCalled();
  });

  it("accepts custom options", async () => {
    const mockStudents = [{ id: 1, name: "Alice" }];
    studentsAPI.list.mockResolvedValueOnce(mockStudents);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useStudents(10, {
          select: (data) => data.map((s) => s.name),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["Alice"]);
  });
});

describe("useStudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single student by studentId when provided", async () => {
    const mockStudent = { id: 42, name: "Charlie" };
    studentsAPI.get.mockResolvedValueOnce(mockStudent);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudent(42), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(studentsAPI.get).toHaveBeenCalledWith(42);
    expect(result.current.data).toEqual(mockStudent);
  });

  it("is disabled when studentId is falsy", () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudent(null), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(studentsAPI.get).not.toHaveBeenCalled();
  });
});

describe("useIepDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches dashboard stats", async () => {
    const mockStats = { active_ieps: 15, ai_insights: 8 };
    iepAPI.dashboardStats.mockResolvedValueOnce(mockStats);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useIepDashboardStats(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iepAPI.dashboardStats).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockStats);
  });
});

describe("useStudentInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches insights and maps created_at to timestamp for regular students", async () => {
    const rawInsights = [
      {
        id: 1,
        created_at: "2026-09-01T12:00:00Z",
        summary_text: "High engagement in visual activities.",
        student: 5,
      },
    ];
    iepAPI.getInsights.mockResolvedValueOnce(rawInsights);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudentInsights(5), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iepAPI.getInsights).toHaveBeenCalledWith(5);
    expect(result.current.data).toEqual([
      {
        id: 1,
        timestamp: "2026-09-01T12:00:00Z",
        summary_text: "High engagement in visual activities.",
      },
    ]);
  });

  it("fetches insights when studentId is 4 or string '4'", async () => {
    iepAPI.getInsights.mockResolvedValueOnce([
      {
        id: 4,
        created_at: "2026-09-02T10:00:00Z",
        summary_text: "Student 4 insight from backend.",
      },
    ]);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudentInsights(4), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iepAPI.getInsights).toHaveBeenCalledWith(4);
    expect(result.current.data).toEqual([
      {
        id: 4,
        timestamp: "2026-09-02T10:00:00Z",
        summary_text: "Student 4 insight from backend.",
      },
    ]);
  });

  it("is disabled when studentId is falsy or options.enabled is false", () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudentInsights(null), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(iepAPI.getInsights).not.toHaveBeenCalled();

    const { result: resultDisabled } = renderHook(
      () => useStudentInsights(5, { enabled: false }),
      { wrapper: createWrapper(queryClient) }
    );
    expect(resultDisabled.current.fetchStatus).toBe("idle");
    expect(iepAPI.getInsights).not.toHaveBeenCalled();
  });

  it("handles empty or non-array results gracefully", async () => {
    iepAPI.getInsights.mockResolvedValueOnce(null);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useStudentInsights(9), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useLessonPlans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches lesson plans querying lessonPlansAPI.list()", async () => {
    const mockPlans = [
      { id: 1, title: "Math Fractions" },
      { id: 2, title: "Science Forces" },
    ];
    lessonPlansAPI.list.mockResolvedValueOnce(mockPlans);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLessonPlans(1), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(lessonPlansAPI.list).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockPlans);
  });

  it("uses default 'all' in queryKey when teacherId is omitted", async () => {
    lessonPlansAPI.list.mockResolvedValueOnce([]);

    const queryClient = createTestQueryClient();
    renderHook(() => useLessonPlans(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const state = queryClient.getQueryState(["lesson-plans", "all"]);
      expect(state).toBeDefined();
    });
  });
});

describe("useVisualAids", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches visual aids with params", async () => {
    const mockAids = [{ id: 1, title: "Visual Schedule" }];
    visualAidsAPI.list.mockResolvedValueOnce(mockAids);

    const queryClient = createTestQueryClient();
    const params = { student_id: 12 };
    const { result } = renderHook(() => useVisualAids(params), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(visualAidsAPI.list).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual(mockAids);
  });

  it("fetches visual aids without params and sets 'all' in queryKey", async () => {
    const mockAids = [{ id: 2, title: "Emotion Chart" }];
    visualAidsAPI.list.mockResolvedValueOnce(mockAids);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useVisualAids(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(visualAidsAPI.list).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockAids);
    const state = queryClient.getQueryState(["visual-aids", "all"]);
    expect(state).toBeDefined();
  });
});

describe("useGenerateStudentInsight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls iepAPI.generateInsight and invalidates student-insights and iep dashboard-stats queries on success", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const newInsight = {
      id: 99,
      created_at: "2026-09-02T15:00:00Z",
      summary_text: "New AI insight text",
    };
    iepAPI.generateInsight.mockResolvedValueOnce(newInsight);
    const onSuccessMock = vi.fn();

    const { result } = renderHook(
      () =>
        useGenerateStudentInsight(5, {
          onSuccess: onSuccessMock,
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(iepAPI.generateInsight).toHaveBeenCalledWith(5);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["student-insights", 5],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["iep", "dashboard-stats"],
    });
    expect(onSuccessMock).toHaveBeenCalledWith(newInsight, undefined, undefined);
  });

  it("handles mutation failure", async () => {
    const queryClient = createTestQueryClient();
    iepAPI.generateInsight.mockRejectedValueOnce(new Error("Generation failed"));

    const { result } = renderHook(() => useGenerateStudentInsight(5), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe("Generation failed");
  });
});
