import { createContext, useContext, useState, useCallback } from "react";
import { authAPI, usersAPI } from "../api/client";
import { queryClient } from "../queryClient";
import {
  STORAGE_KEYS,
  SESSION_CHANNEL_NAME,
  BROADCAST_ACTIONS,
} from "../constants/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.teacher));
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(Date.now()));
    setUser(data.teacher);
    return data;
  };

  const register = async (userData) => authAPI.register(userData);

  const logout = useCallback(async (options = {}) => {
    const reason = options?.reason || "manual";
    const skipBroadcast = options?.skipBroadcast || false;
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // 1. Immediately clear local storage, query cache, and user state before network call
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE);
    try {
      localStorage.setItem(
        STORAGE_KEYS.LOGOUT_EVENT,
        JSON.stringify({ reason, timestamp: Date.now() })
      );
    } catch {
      // Ignore storage errors
    }
    queryClient.clear();
    setUser(null);

    // 2. Broadcast logout across all other open tabs
    if (!skipBroadcast && typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
        channel.postMessage({
          type: BROADCAST_ACTIONS.LOGOUT,
          reason,
          timestamp: Date.now(),
        });
        channel.close();
      } catch (err) {
        console.warn("Failed to broadcast logout message:", err);
      }
    }

    // 3. Fire-and-forget backend notification with the saved token so hung requests never keep local state alive
    try {
      if (token) {
        await authAPI.logout({ headers: { Authorization: `Token ${token}` } });
      } else {
        await authAPI.logout();
      }
    } catch (error) {
      // Token already invalid or backend unreachable — local state is already cleared.
      console.error("Logout failed:", error);
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

  // ── Mark tutorial complete ──────────────────────────────
  const markTutorialComplete = useCallback(async () => {
    try {
      await usersAPI.completeTutorial();
    } catch (err) {
      console.error("Failed to persist tutorial completion to server:", err);
    } finally {
      // Optimistically update local React state and localStorage so the user is never re-prompted
      const updated = {
        ...user,
        has_completed_tutorial: true,
      };
      try {
        localStorage.setItem("neuropath_user", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist updated user to localStorage:", e);
      }
      setUser(updated);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        markTutorialComplete,
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
