/**
 * Date utility helpers for standardizing date pickers and ISO formatting.
 */

/**
 * Converts a date string in MM-DD-YYYY or YYYY-MM-DD format to standardized YYYY-MM-DD.
 * Returns empty string if invalid or empty.
 *
 * @param {string} val
 * @returns {string}
 */
export function toIsoDate(val) {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const legacyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (legacyMatch) {
    const [, mm, dd, yyyy] = legacyMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

/**
 * Validates whether a date string represents a valid calendar date in the past.
 * Supports both YYYY-MM-DD and MM-DD-YYYY.
 *
 * @param {string} dateStr
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePastDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) {
    return { valid: true };
  }

  const trimmed = dateStr.trim();
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  const legacyRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-\d{4}$/;

  let year, month, day;

  if (isoRegex.test(trimmed)) {
    [year, month, day] = trimmed.split("-").map(Number);
  } else if (legacyRegex.test(trimmed)) {
    [month, day, year] = trimmed.split("-").map(Number);
  } else {
    return { valid: false, error: "Birthdate must be in YYYY-MM-DD or MM-DD-YYYY format." };
  }

  const dateObj = new Date(year, month - 1, day);
  if (
    isNaN(dateObj.getTime()) ||
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return { valid: false, error: "Birthdate is not a valid calendar date." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateObj >= today) {
    return { valid: false, error: "Birthdate must be a date in the past." };
  }

  return { valid: true };
}
