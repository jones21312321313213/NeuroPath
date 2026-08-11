import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

function jsonResponse(body, { ok = true, status } = {}) {
  const resolvedStatus = status !== undefined ? status : ok ? 200 : 400;
  return {
    ok,
    status: resolvedStatus,
    json: vi.fn().mockResolvedValue(body),
  };
}

function renderAuthHook() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("starts with no authenticated user when localStorage is empty", () => {
    const { result } = renderAuthHook();

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("restores the user from localStorage on mount", () => {
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ email: "stored@example.com" }),
    );

    const { result } = renderAuthHook();

    expect(result.current.user).toEqual({ email: "stored@example.com" });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logs in, persists the token/user, and updates state", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ token: "abc123", teacher: { email: "jane@example.com" } }),
    );
    const { result } = renderAuthHook();

    await act(async () => {
      await result.current.login("jane@example.com", "secret");
    });

    expect(result.current.user).toEqual({ email: "jane@example.com" });
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem("neuropath_access_token")).toBe("abc123");
    expect(JSON.parse(localStorage.getItem("neuropath_user"))).toEqual({
      email: "jane@example.com",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/login/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "jane@example.com", password: "secret" }),
      }),
    );
  });

  it("rejects and leaves the user unauthenticated when login fails", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid credentials" }, { ok: false, status: 400 }),
    );
    const { result } = renderAuthHook();

    await expect(
      act(async () => {
        await result.current.login("jane@example.com", "wrong");
      }),
    ).rejects.toThrow("Invalid credentials");

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("neuropath_access_token")).toBeNull();
  });

  it("registers a new user via the register endpoint without changing session state", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ id: 1, email: "new@example.com" }),
    );
    const { result } = renderAuthHook();

    let response;
    await act(async () => {
      response = await result.current.register({
        email: "new@example.com",
        password: "secret",
      });
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/register/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "secret" }),
      }),
    );
    expect(response).toEqual({ id: 1, email: "new@example.com" });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs out by clearing storage and resetting user state", async () => {
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ email: "stored@example.com" }),
    );
    localStorage.setItem("neuropath_access_token", "abc123");
    fetch.mockResolvedValueOnce(jsonResponse({ message: "Logged out" }));

    const { result } = renderAuthHook();
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/logout/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("neuropath_user")).toBeNull();
    expect(localStorage.getItem("neuropath_access_token")).toBeNull();
  });

  it("updates user profile and updates state and localStorage", async () => {
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ email: "jane@example.com", first_name: "Jane" }),
    );
    localStorage.setItem("neuropath_access_token", "abc123");
    fetch.mockResolvedValueOnce(
      jsonResponse({ first_name: "Jane Updated", last_name: "Doe" }),
    );

    const { result } = renderAuthHook();

    const formData = new FormData();
    formData.append("first_name", "Jane Updated");
    formData.append("last_name", "Doe");
    formData.append("email", "jane@example.com");

    await act(async () => {
      await result.current.updateUser(formData);
    });

    expect(result.current.user).toEqual({
      email: "jane@example.com",
      first_name: "Jane Updated",
      last_name: "Doe",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/profile/update/",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          first_name: "Jane Updated",
          last_name: "Doe",
          email: "jane@example.com",
        }),
      }),
    );
  });

  it("throws when useAuth is used outside of an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used inside AuthProvider",
    );
  });
});
