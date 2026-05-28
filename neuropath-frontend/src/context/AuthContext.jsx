import { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("neuropath_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Prime the Django csrftoken cookie as soon as the app loads.
  // Without this, the cookie may not exist on the first PATCH request
  // and Django's CsrfViewMiddleware will return 403 Forbidden.
  useEffect(() => {
    fetch(`${BASE_URL}/csrf/`, { credentials: "include" }).catch(() => {});
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(
      "http://127.0.0.1:8000/api/users/login/",
      { email, password },
      { withCredentials: true },
    );
    const data = response.data;
    localStorage.setItem("neuropath_user", JSON.stringify(data.teacher));
    setUser(data.teacher);
    return data;
  };

  const register = async (userData) => {
    const response = await axios.post(
      "http://127.0.0.1:8000/api/users/register/",
      userData,
    );
    return response.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("neuropath_user");
    setUser(null);
  }, []);

  // ── Update teacher profile ─────────────────────────────
  // Sends JSON to PATCH /api/users/profile/update/
  // The backend identifies the user via the `id` field in the body.
  const updateUser = useCallback(
    async (formData) => {
      // Convert FormData → plain object so we can send JSON
      const body = {
        id: user?.id,
        first_name: formData.get("first_name") || "",
        last_name: formData.get("last_name") || "",
        email: formData.get("email") || "",
      };

      // Only include password if the user actually typed one
      const password = formData.get("password");
      if (password) body.password = password;

      // Read the CSRF token that Django sets as a cookie so the
      // CsrfViewMiddleware accepts this cross-origin PATCH request.
      const csrfToken =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("csrftoken="))
          ?.split("=")[1] || "";

      const response = await fetch(`${BASE_URL}/users/profile/update/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // Django's CSRF middleware checks this header on unsafe methods.
          "X-CSRFToken": csrfToken,
        },
        credentials: "include", // sends the Django session cookie
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errors = data.errors || data.detail || data;
        let message = "Failed to update profile.";
        if (typeof errors === "string") message = errors;
        else if (typeof errors === "object") {
          const msgs = Object.values(errors).flat();
          message = msgs[0] || message;
        }
        throw new Error(message);
      }

      // Merge updated fields back into React state + localStorage.
      // We spread `user` first so existing fields (like profile_picture)
      // are preserved when the backend response omits them.
      const updated = { ...user, ...data };
      localStorage.setItem("neuropath_user", JSON.stringify(updated));
      setUser(updated);

      return data;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
