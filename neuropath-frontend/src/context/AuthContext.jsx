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
      let profilePicture = null;
      if (typeof FormData !== "undefined" && formData instanceof FormData) {
        const pic = formData.get("profile_picture");
        if (typeof File !== "undefined" && pic instanceof File && pic.size > 0) {
          profilePicture = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(pic);
          });
        }
      }

      const data = await usersAPI.updateProfile(formData);

      // Unpack response payload before merging (handles { user: ... }, { teacher: ... }, or flat)
      const updatedUser = (data && (data.user || data.teacher)) || data || {};

      // Merge updated fields back into React state + localStorage
      const updated = {
        ...user,
        ...updatedUser,
        ...(profilePicture ? { profile_picture: profilePicture } : {}),
      };

      try {
        localStorage.setItem("neuropath_user", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist user profile to localStorage:", e);
        try {
          const fallbackUser = { ...updated };
          delete fallbackUser.profile_picture;
          localStorage.setItem("neuropath_user", JSON.stringify(fallbackUser));
        } catch {
          // Ignore further storage errors (e.g. QuotaExceededError)
        }
      }

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
