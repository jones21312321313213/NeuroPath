import { createContext, useContext, useState, useCallback } from "react";
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

  const login = async (email, password) => {
    const response = await axios.post(
       "http://127.0.0.1:8000/api/users/login/",
      //`${BASE_URL}/users/login/`,
      { email, password },
    );
    const data = response.data;
    localStorage.setItem("neuropath_access_token", data.token); 
    localStorage.setItem("neuropath_user", JSON.stringify(data.teacher));
    setUser(data.teacher);
    return data;
  };

  const register = async (userData) => {
    const response = await axios.post(
       "http://127.0.0.1:8000/api/users/register/",
      //`${BASE_URL}/users/register/`,
      userData,
    );
    return response.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem("neuropath_user");
    localStorage.removeItem("neuropath_access_token"); // 🎯 Clear token
    setUser(null);
  }, []);

  // ── Update teacher profile ─────────────────────────────
  // Sends JSON to PATCH /api/users/profile/update/
  // The backend identifies the user via session cookie (withCredentials)
  // and falls back to the `id` field if the session isn't set.
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

      const token = localStorage.getItem("neuropath_access_token");
      
      const response = await fetch(`${BASE_URL}/users/profile/update/`, {
        method: "PATCH",
        headers: { 
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}) // 🎯 Add Token header
        },
        body: JSON.stringify(body),
        // 🎯 Removed credentials: "include"
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

      // Merge updated fields back into React state + localStorage
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
