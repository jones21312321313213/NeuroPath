import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import axios from "axios";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("axios");

function renderAuthHook() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
    axios.post.mockResolvedValueOnce({
      data: { token: "abc123", teacher: { email: "jane@example.com" } },
    });
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
    expect(axios.post).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/users/login/",
      { email: "jane@example.com", password: "secret" },
    );
  });

  it("rejects and leaves the user unauthenticated when login fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("Invalid credentials"));
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
    axios.post.mockResolvedValueOnce({
      data: { id: 1, email: "new@example.com" },
    });
    const { result } = renderAuthHook();

    let response;
    await act(async () => {
      response = await result.current.register({
        email: "new@example.com",
        password: "secret",
      });
    });

    expect(axios.post).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/users/register/",
      { email: "new@example.com", password: "secret" },
    );
    expect(response).toEqual({ id: 1, email: "new@example.com" });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logs out by clearing storage and resetting user state", () => {
    localStorage.setItem(
      "neuropath_user",
      JSON.stringify({ email: "stored@example.com" }),
    );
    localStorage.setItem("neuropath_access_token", "abc123");
    const { result } = renderAuthHook();
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("neuropath_user")).toBeNull();
    expect(localStorage.getItem("neuropath_access_token")).toBeNull();
  });

  it("throws when useAuth is used outside of an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used inside AuthProvider",
    );
  });
});
