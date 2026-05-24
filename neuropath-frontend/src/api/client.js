// Base URL — change for production
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * Core fetch wrapper. Attaches Bearer token if present.
 * Throws structured errors for easy handling in components.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("neuropath_access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Flatten DRF validation errors into a readable string
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

// ── Auth endpoints ────────────────────────────────────────────────────────

export const authAPI = {
  register: (payload) =>
    request("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request("/auth/login/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

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
  list: () => request("/users/students/"),
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
  list: () => request("/resources/query-strategies/"),
  get: (id) => request(`/resources/query-strategies/${id}/`),
  generate: (payload) =>
    request("/resources/generate-strategy/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id, payload) =>
    request(`/resources/edit-strategy/${id}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  delete: (id) =>
    request(`/resources/delete-strategy/${id}/`, { method: "DELETE" }),
};
