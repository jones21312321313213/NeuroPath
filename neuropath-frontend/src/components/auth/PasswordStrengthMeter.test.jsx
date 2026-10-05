import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { evaluatePasswordRules } from "../../utils/password";

describe("evaluatePasswordRules", () => {
  it("evaluates all criteria correctly for a strong password", () => {
    const res = evaluatePasswordRules("Password123!");
    expect(res.hasLength).toBe(true);
    expect(res.hasUpper).toBe(true);
    expect(res.hasLower).toBe(true);
    expect(res.hasNumber).toBe(true);
    expect(res.hasSpecial).toBe(true);
    expect(res.passedCount).toBe(5);
    expect(res.strengthLabel).toBe("Strong");
    expect(res.isValid).toBe(true);
  });

  it("identifies a medium password meeting some rules", () => {
    const res = evaluatePasswordRules("Password123");
    expect(res.hasLength).toBe(true);
    expect(res.hasSpecial).toBe(false);
    expect(res.strengthLabel).toBe("Medium");
    expect(res.isValid).toBe(false);
  });

  it("identifies a short/weak password", () => {
    const res = evaluatePasswordRules("Pass1!");
    expect(res.hasLength).toBe(false);
    expect(res.strengthLabel).toBe("Weak");
    expect(res.isValid).toBe(false);
  });
});

describe("PasswordStrengthMeter component", () => {
  it("renders requirements checklist by default", () => {
    render(<PasswordStrengthMeter password="" />);
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
    expect(screen.getByText(/at least one special character/i)).toBeInTheDocument();
  });

  it("renders live strength bar when password is provided", () => {
    render(<PasswordStrengthMeter password="Weak" />);
    expect(screen.getByText(/password strength:/i)).toBeInTheDocument();
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });
});
