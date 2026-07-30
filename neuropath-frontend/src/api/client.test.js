import { describe, it, expect, vi, beforeEach } from "vitest";
import { authAPI, studentsAPI } from "./client";

function jsonResponse(body, { ok = true } = {}) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends a GET request without an Authorization header when no token is stored", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

    const result = await authAPI.me();

    expect(result).toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/auth/me/",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("attaches a Token Authorization header when an access token is stored", async () => {
    localStorage.setItem("neuropath_access_token", "abc123");
    fetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await authAPI.me();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/auth/me/",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Token abc123",
        },
      }),
    );
  });

  it("posts JSON-encoded credentials for login", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ token: "xyz" }));

    const result = await authAPI.login({
      email: "jane@example.com",
      password: "secret",
    });

    expect(result).toEqual({ token: "xyz" });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/auth/login/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "jane@example.com",
          password: "secret",
        }),
      }),
    );
  });

  it("throws the first field error message when the response body has field errors", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ errors: { email: ["This field is required."] } }, { ok: false }),
    );

    await expect(authAPI.login({ email: "", password: "" })).rejects.toThrow(
      "This field is required.",
    );
  });

  it("throws the detail message when the response body has a string detail", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid credentials." }, { ok: false }),
    );

    await expect(
      authAPI.login({ email: "jane@example.com", password: "wrong" }),
    ).rejects.toThrow("Invalid credentials.");
  });

  it("falls back to a generic error message when the response body can't be parsed", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error("not json")),
    });

    await expect(authAPI.me()).rejects.toThrow("Something went wrong.");
  });

  it("omits the teacher_id query param when listing students without one", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await studentsAPI.list();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/students/",
      expect.anything(),
    );
  });

  it("includes the teacher_id query param when listing students with one", async () => {
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await studentsAPI.list(42);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/users/students/?teacher_id=42",
      expect.anything(),
    );
  });
});
