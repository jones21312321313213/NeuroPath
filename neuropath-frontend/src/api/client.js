// Base URL — change for production
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// const getCsrfToken = () => {
//   return (
//     document.cookie
//       .split("; ")
//       .find((row) => row.startsWith("csrftoken="))
//       ?.split("=")[1] || ""
//   );
// };

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
  // Generate tab — GET loads { directory: [{ studentID, studentName, availableGoals: [{ goalID, label, goalArea }] }] }
  getDirectory: (teacherId) =>
    request(
      `/resources/generate-lesson/${teacherId ? `?teacher_id=${teacherId}` : ""}`,
    ),
  // Generate tab — POST { goalID, subject, topic } → { message, data: { generated_prompt, draft_content } }
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
  list: () => request("/resources/visual-aids/"),
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
  // Generate tab — GET loads { directory: [{ studentID, studentName, availableGoals: [{ iepID, label }] }] }
  getDirectory: (teacherId) =>
    request(
      `/resources/generate-strategy/${teacherId ? `?teacher_id=${teacherId}` : ""}`,
    ),
  // Generate tab — POST { studentID, iepGoalID } → { message, data: { strategyID, title, strategyContent, ... } }
  generate: (payload) =>
    request("/resources/generate-strategy/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // View tab — GET list filtered by studentID → [{ strategyID, studentName, title, strategyContent, formattedDate }]
  list: (studentID) =>
    request(`/resources/query-strategies/?studentID=${studentID}`),
  // View tab — GET single strategy detail
  get: (id) => request(`/resources/query-strategies/${id}/`),
  // View/Export tab — returns a PDF download URL
  exportUrl: (id) =>
    `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/resources/query-strategies/${id}/export/`,
  // Edit tab — PUT { title, strategyContent }
  update: (id, payload) =>
    request(`/resources/edit-strategy/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  // Delete tab — GET list for deletion (same as list but separate endpoint)
  listForDelete: (studentID) =>
    request(`/resources/delete-strategy/?studentID=${studentID}`),
  // Delete tab — DELETE
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
  // List all IEP goals for a specific student (used by ManageVisualAids)
  listGoalsByStudent: (studentId) =>
    request(`/iep/goals/?student_id=${studentId}`),

  // 🎯 FIXED: Now pointing to the correct /iep/ routes from your urls.py!
  getInsights: (studentId) => request(`/iep/student/${studentId}/insights/`),

  generateInsight: (studentId) =>
    request(`/iep/student/${studentId}/generate-insight/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
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
