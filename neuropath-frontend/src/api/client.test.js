import { describe, it, expect, vi, beforeEach } from "vitest";
import { authAPI, studentsAPI, usersAPI, trackingAPI, lessonPlansAPI, resourcesAPI } from "./client";


function jsonResponse(body, { ok = true, status } = {}) {
  const resolvedStatus = status !== undefined ? status : ok ? 200 : 400;
  return {
    ok,
    status: resolvedStatus,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends a GET request without an Authorization header when no token is stored", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));

    const result = await studentsAPI.list();

    expect(result).toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/students/",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("attaches a Token Authorization header when an access token is stored", async () => {
    localStorage.setItem("neuropath_access_token", "abc123");
    fetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));

    await studentsAPI.list();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/students/",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Token abc123",
        },
      }),
    );
  });

  it("posts JSON-encoded credentials for login", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ token: "xyz" }));

    const result = await authAPI.login({
      email: "jane@example.com",
      password: "secret",
    });

    expect(result).toEqual({ token: "xyz" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/login/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "jane@example.com",
          password: "secret",
        }),
      }),
    );
  });

  it("posts JSON-encoded payload for registration", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 1, email: "jane@example.com" }));

    const result = await authAPI.register({
      email: "jane@example.com",
      password: "secret",
    });

    expect(result).toEqual({ id: 1, email: "jane@example.com" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/register/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "jane@example.com",
          password: "secret",
        }),
      }),
    );
  });

  it("posts to logout endpoint with empty object body", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: "Logged out" }));

    await authAPI.logout();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/logout/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  });

  it("patches profile update payload to user profile endpoint", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ first_name: "Jane" }));

    const result = await usersAPI.updateProfile({ first_name: "Jane" });

    expect(result).toEqual({ first_name: "Jane" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/profile/update/",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ first_name: "Jane" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("forwards FormData in updateProfile and omits Content-Type header", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ first_name: "Jane" }));
    const formData = new FormData();
    formData.append("first_name", "Jane");

    const result = await usersAPI.updateProfile(formData);

    expect(result).toEqual({ first_name: "Jane" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/profile/update/",
      expect.objectContaining({
        method: "PATCH",
        body: formData,
        headers: expect.not.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("throws the first field error message when the response body has field errors", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ errors: { email: ["This field is required."] } }, { ok: false, status: 400 }),
    );

    await expect(authAPI.login({ email: "", password: "" })).rejects.toThrow(
      "This field is required.",
    );
  });

  it("throws the detail message when the response body has a string detail", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid credentials." }, { ok: false, status: 401 }),
    );

    await expect(
      authAPI.login({ email: "jane@example.com", password: "wrong" }),
    ).rejects.toThrow("Invalid credentials.");
  });

  it("falls back to a generic error message when the response body can't be parsed", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("not json")),
    });

    await expect(authAPI.login({ email: "a", password: "b" })).rejects.toThrow("Something went wrong.");
  });

  it("omits the teacher_id query param when listing students without one", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await studentsAPI.list();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/students/",
      expect.anything(),
    );
  });

  it("includes the teacher_id query param when listing students with one", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await studentsAPI.list(42);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/students/?teacher_id=42",
      expect.anything(),
    );
  });

  it("triggers forceReauth redirect when receiving 401 with an existing token", async () => {
    localStorage.setItem("neuropath_access_token", "stale_token");
    localStorage.setItem("neuropath_user", JSON.stringify({ name: "User" }));

    const replaceSpy = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/dashboard", replace: replaceSpy },
    });

    fetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid token." }, { ok: false, status: 401 }),
    );

    await expect(studentsAPI.list()).rejects.toThrow("Invalid token.");

    expect(localStorage.getItem("neuropath_access_token")).toBeNull();
    expect(localStorage.getItem("neuropath_user")).toBeNull();
    expect(replaceSpy).toHaveBeenCalledWith("/login");
  });

  describe("trackingAPI", () => {
    it("fetches progress dashboard for a student", async () => {
      fetch.mockResolvedValueOnce(jsonResponse([{ name: "Math", progress: 85 }]));

      const result = await trackingAPI.getProgressDashboard(12);

      expect(result).toEqual([{ name: "Math", progress: 85 }]);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tracking/progress-dashboard/?studentID=12",
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );
    });

    it("fetches analytics with optional subject query parameter", async () => {
      fetch.mockResolvedValueOnce(jsonResponse([{ performanceScore: 90 }]));

      await trackingAPI.getAnalytics(12, "Math");

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tracking/analytics/?studentID=12&subject=Math",
        expect.anything(),
      );
    });

    it("posts progress log to analytics endpoint", async () => {
      fetch.mockResolvedValueOnce(jsonResponse({ progressID: 5 }, { status: 201 }));

      const payload = { studentID: 12, subjectName: "Reading", performanceScore: 78 };
      await trackingAPI.recordProgress(payload);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tracking/analytics/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    });

    it("fetches student record pdf as a blob with auth header", async () => {
      localStorage.setItem("neuropath_access_token", "test-token");
      const mockBlob = new Blob(["mock-pdf-content"], { type: "application/pdf" });
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const blob = await trackingAPI.exportStudentRecordPDF(15);

      expect(blob).toBe(mockBlob);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/tracking/student-records/15/export/",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Token test-token",
          }),
        }),
      );
    });

    it("throws an error when exportStudentRecordPDF request fails", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "Export engine failure." }),
      });

      await expect(trackingAPI.exportStudentRecordPDF(15)).rejects.toThrow(
        "Export engine failure.",
      );
    });
  });

  describe("lessonPlansAPI", () => {
    it("generates a lesson plan with provided parameters", async () => {
      fetch.mockResolvedValueOnce(
        jsonResponse({ message: "Generated", data: { lesson_plans: [] } }),
      );
      const payload = {
        studentID: 1,
        goalID: 10,
        goalArea: "Math",
        teacherPrompt: "",
      };
      const result = await lessonPlansAPI.generate(payload);
      expect(result).toEqual({ message: "Generated", data: { lesson_plans: [] } });
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/resources/generate-lesson/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    });

    it("saves a generated lesson plan with transformed payload", async () => {
      fetch.mockResolvedValueOnce(
        jsonResponse({ lessonID: 42, title: "Math Lesson Plan" }),
      );
      const payload = {
        studentID: 1,
        goalID: 10,
        title: "Math Lesson Plan",
        content: [{ objective_focus: "Counting" }],
      };
      const result = await lessonPlansAPI.save(payload);
      expect(result).toEqual({ lessonID: 42, title: "Math Lesson Plan" });
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/resources/lesson-plans/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            iep_goal: 10,
            title: "Math Lesson Plan",
            lessonContent: JSON.stringify([{ objective_focus: "Counting" }]),
          }),
        }),
      );
    });
  });

  describe("resourcesAPI", () => {
    it("fetches resource dashboard stats", async () => {
      fetch.mockResolvedValueOnce(
        jsonResponse({
          total: 5,
          total_resources: 5,
          lesson_plans: 2,
          teaching_strategies: 2,
          visual_aids: 1,
        }),
      );

      const result = await resourcesAPI.dashboardStats();

      expect(result).toEqual({
        total: 5,
        total_resources: 5,
        lesson_plans: 2,
        teaching_strategies: 2,
        visual_aids: 1,
      });
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/resources/dashboard-stats/",
        expect.any(Object),
      );
    });
  });
});

