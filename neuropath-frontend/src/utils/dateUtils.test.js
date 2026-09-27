import { describe, it, expect } from "vitest";
import { toIsoDate, validatePastDate } from "./dateUtils";

describe("dateUtils", () => {
  describe("toIsoDate", () => {
    it("returns empty string for null, undefined, or empty values", () => {
      expect(toIsoDate(null)).toBe("");
      expect(toIsoDate(undefined)).toBe("");
      expect(toIsoDate("")).toBe("");
      expect(toIsoDate("   ")).toBe("");
    });

    it("returns already-formatted ISO date unchanged", () => {
      expect(toIsoDate("2018-05-12")).toBe("2018-05-12");
      expect(toIsoDate("2026-09-24")).toBe("2026-09-24");
    });

    it("converts MM-DD-YYYY legacy format to YYYY-MM-DD", () => {
      expect(toIsoDate("05-12-2018")).toBe("2018-05-12");
      expect(toIsoDate("12-31-2015")).toBe("2015-12-31");
      expect(toIsoDate("01-09-2020")).toBe("2020-01-09");
    });

    it("returns string unchanged if format does not match legacy", () => {
      expect(toIsoDate("custom-string")).toBe("custom-string");
    });
  });

  describe("validatePastDate", () => {
    it("returns valid: true for empty or null date", () => {
      expect(validatePastDate("")).toEqual({ valid: true });
      expect(validatePastDate(null)).toEqual({ valid: true });
      expect(validatePastDate("   ")).toEqual({ valid: true });
    });

    it("accepts valid past dates in ISO format", () => {
      const result = validatePastDate("2018-05-12");
      expect(result.valid).toBe(true);
    });

    it("accepts valid past dates in MM-DD-YYYY format", () => {
      const result = validatePastDate("05-12-2018");
      expect(result.valid).toBe(true);
    });

    it("rejects future dates", () => {
      const result = validatePastDate("2099-01-01");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must be a date in the past/i);
    });

    it("rejects today's date", () => {
      const todayIso = new Date().toISOString().split("T")[0];
      const result = validatePastDate(todayIso);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must be a date in the past/i);
    });

    it("rejects invalid date strings that do not match date format", () => {
      const result = validatePastDate("2020/05/12");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must be in YYYY-MM-DD or MM-DD-YYYY/i);
    });

    it("rejects invalid calendar dates like February 31", () => {
      const result = validatePastDate("2020-02-31");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/not a valid calendar date/i);
    });
  });
});
