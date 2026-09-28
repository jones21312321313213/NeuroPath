import { describe, it, expect } from "vitest";
import { toIsoDate, validatePastDate, formatRelativeTime, formatDateTime } from "./dateUtils";


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
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

  describe("formatRelativeTime", () => {
    it("handles null, undefined, or empty values", () => {
      expect(formatRelativeTime(null)).toBe("Recently");
      expect(formatRelativeTime(undefined)).toBe("Recently");
      expect(formatRelativeTime("invalid-date")).toBe("Recently");
    });

    it("returns just now for very recent timestamps", () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe("just now");
      expect(formatRelativeTime(new Date(now.getTime() - 30 * 1000))).toBe("just now");
    });

    it("returns minutes ago for timestamps under 1 hour", () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(formatRelativeTime(tenMinsAgo)).toBe("10m ago");
    });

    it("returns hours ago for timestamps under 24 hours", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
    });

    it("returns Yesterday for timestamps 1 day ago", () => {
      const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneDayAgo)).toBe("Yesterday");
    });

    it("returns days ago for timestamps within a week", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
    });

    it("returns weeks ago for timestamps within a month", () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoWeeksAgo)).toBe("2w ago");
    });
  });

  describe("formatDateTime", () => {
    it("handles empty or invalid inputs", () => {
      expect(formatDateTime(null)).toBe("");
      expect(formatDateTime("")).toBe("");
      expect(formatDateTime("invalid")).toBe("");
    });

    it("formats a valid date string", () => {
      const formatted = formatDateTime("2026-09-28T10:00:00Z");
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/2026/);
    });
  });
});

