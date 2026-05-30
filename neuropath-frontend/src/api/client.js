// Base URL — change for production
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("neuropath_access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errors = data.errors || data.detail || data;
    let message = "Something went wrong.";
    if (typeof errors === "string") {
      message = errors;
    } else if (typeof errors === "object") {
      const msgs = Object.values(errors).flat();
      message = msgs[0] || message;
    }
    throw new Error(message);
  }

  return data;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (payload) =>
    request("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request("/auth/login/", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me/"),
  logout: (refreshToken) =>
    request("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    }),
  refreshToken: (refresh) =>
    request("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),
};

// ── Students ───────────────────────────────────────────────────────────────────
export const studentsAPI = {
  list: (teacherId) =>
    request(`/users/students/${teacherId ? `?teacher_id=${teacherId}` : ""}`),
  get: (id) => request(`/users/students/${id}/view/`),
  create: (payload) =>
    request("/users/students/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id, payload) =>
    request(`/users/students/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

// ── Lesson Plans ───────────────────────────────────────────────────────────────
export const lessonPlansAPI = {
  getDirectory: (teacherId) =>
    request(
      `/resources/generate-lesson/${teacherId ? `?teacher_id=${teacherId}` : ""}`,
    ),
  generate: (payload) =>
    request("/resources/generate-lesson/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/resources/view-lessons/${qs ? "?" + qs : ""}`);
  },
  get: (id) => request(`/resources/edit-lesson/${id}/`),
  update: (id, payload) =>
    request(`/resources/edit-lesson/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  delete: (id) =>
    request(`/resources/delete-lesson/${id}/`, { method: "DELETE" }),
};

// ── Visual Aids ────────────────────────────────────────────────────────────────
export const visualAidsAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/resources/visual-aids/${qs ? "?" + qs : ""}`);
  },
  listByStudent: (studentId) =>
    request(`/resources/visual-aids/?student_id=${studentId}`),
  get: (id) => request(`/resources/visual-aids/${id}/`),
  generate: (payload) =>
    request("/resources/generate-visual-aid/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  delete: (id) =>
    request(`/resources/visual-aids/${id}/`, { method: "DELETE" }),
  exportUrl: (id) =>
    `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/resources/export-visual-aid/${id}/`,
};

// ── Teaching Strategies ────────────────────────────────────────────────────────
export const teachingStrategiesAPI = {
  getDirectory: (teacherId) =>
    request(
      `/resources/generate-strategy/${teacherId ? `?teacher_id=${teacherId}` : ""}`,
    ),
  generate: (payload) =>
    request("/resources/generate-strategy/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: (studentID) =>
    request(`/resources/query-strategies/?studentID=${studentID}`),
  get: (id) => request(`/resources/query-strategies/${id}/`),
  exportUrl: (id) =>
    `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/resources/query-strategies/${id}/export/`,
  update: (id, payload) =>
    request(`/resources/edit-strategy/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  listForDelete: (studentID) =>
    request(`/resources/delete-strategy/?studentID=${studentID}`),
  delete: (id) =>
    request(`/resources/delete-strategy/${id}/`, { method: "DELETE" }),
};

// ── IEP Generation / Viewing ─────────────────────────────────────────────────
export const iepAPI = {
  generate: (payload) =>
    request("/iep/generate-iep/", {
      method: "POST",
      body: JSON.stringify({ action: "generate", ...payload }),
    }),
  save: (payload) =>
    request("/iep/generate-iep/", {
      method: "POST",
      body: JSON.stringify({ action: "save", ...payload }),
    }),
  listByStudent: (studentID, teacherId) =>
    request(
      `/iep/student/${studentID}/${teacherId ? `?teacher_id=${teacherId}` : ""}`,
    ),
  get: (id) => request(`/iep/${id}/`),
  update: (id, payload) =>
    request(`/iep/edit/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  delete: (id) => request(`/iep/delete/${id}/`, { method: "DELETE" }),

  // Fetch all IEPGoal rows (with nested objective_rows) for a specific IEP
  listGoalsByIep: (iepId) => request(`/iep/goals/?iep=${iepId}`),
  // List IEP goals for a specific student
  listGoalsByStudent: (studentId) =>
    request(`/iep/goals/?student_id=${studentId}`),

  // List goals only from the latest saved IEP/version for a student
  listLatestGoalsByStudent: (studentId) =>
    request(`/iep/goals/?student_id=${studentId}&latest=true`),

  getInsights: (studentId) => request(`/iep/student/${studentId}/insights/`),

  generateInsight: (studentId) =>
    request(`/iep/student/${studentId}/generate-insight/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  generateGoalsFromIep: (payload) =>
    request("/iep/generate-goals-from-iep/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Save a single generated goal → POST /api/iep/goals/
  saveGoal: (payload) =>
    request("/iep/goals/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateGoal: (goalId, payload) =>
    request(`/iep/goals/${goalId}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteGoal: (goalId) =>
    request(`/iep/goals/${goalId}/`, { method: "DELETE" }),

  // Dashboard overview stats: active IEP count + AI insights count
  dashboardStats: () => request("/iep/dashboard-stats/"),
};

// ── Users / Teacher Profile ────────────────────────────────────────────────────
export const usersAPI = {
  // PATCH /api/users/profile/update/ — accepts FormData (supports profile_picture upload)
  updateProfile: (formData) => {
    const token = localStorage.getItem("neuropath_access_token");
    return fetch(`${BASE_URL}/users/profile/update/`, {
      method: "PATCH",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errors = data.errors || data.detail || data;
        let message = "Failed to update profile.";
        if (typeof errors === "string") message = errors;
        else if (typeof errors === "object") {
          const msgs = Object.values(errors).flat();
          message = msgs[0] || message;
        }
        throw new Error(message);
      }
      return data;
    });
  },
};
