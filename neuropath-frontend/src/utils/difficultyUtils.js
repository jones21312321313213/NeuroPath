/**
 * Sanitize and deduplicate a list of difficulty markers case-insensitively,
 * removing empty entries and preserving original casing and insertion order.
 *
 * @param {Array<string|object>} list
 * @returns {Array<string>}
 */
export function sanitizeDifficulties(list = []) {
  const seen = new Set();
  const result = [];
  for (const item of list || []) {
    const raw = typeof item === "object" && item !== null ? item.difficulty : item;
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Merge two lists of difficulty markers, deduplicating case-insensitively
 * while preserving original casing and insertion order.
 *
 * @param {Array<string>} existingList
 * @param {Array<string>} newList
 * @returns {Array<string>}
 */
export function mergeDifficulties(existingList = [], newList = []) {
  return sanitizeDifficulties([...(existingList || []), ...(newList || [])]);
}

