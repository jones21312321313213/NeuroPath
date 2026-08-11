import { createContext, useContext, useState, useCallback } from "react";
import { authAPI, usersAPI } from "../api/client";

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
    const data = await authAPI.login({ email, password });
    localStorage.setItem("neuropath_access_token", data.token);
    localStorage.setItem("neuropath_user", JSON.stringify(data.teacher));
    setUser(data.teacher);
    return data;
  };

  const register = async (userData) => authAPI.register(userData);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Token already invalid or backend unreachable — clear locally regardless.
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("neuropath_user");
      localStorage.removeItem("neuropath_access_token");
      setUser(null);
    }
  }, []);

  // ── Update teacher profile ─────────────────────────────
  // PATCH /api/users/profile/update/ — the backend resolves the account from
  // the Token header, so no user id is sent (it would be ignored anyway).
  const updateUser = useCallback(
    async (formData) => {
      // Convert FormData → plain object so we can send JSON
      const payload = {
        first_name: formData.get("first_name") || "",
        last_name: formData.get("last_name") || "",
        email: formData.get("email") || "",
      };

      // Only include password if the user actually typed one
      const password = formData.get("password");
      if (password) payload.password = password;

      const data = await usersAPI.updateProfile(payload);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
