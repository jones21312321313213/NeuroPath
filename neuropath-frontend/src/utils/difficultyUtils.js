/**
 * Utility functions for IEP Section B difficulties and student profile difficulty synchronization.
 */

/**
 * Merge two lists of difficulty markers, deduplicating case-insensitively
 * while preserving original casing and insertion order.
 *
 * @param {Array<string>} existingList
 * @param {Array<string>} newList
 * @returns {Array<string>}
 */
export function mergeDifficulties(existingList = [], newList = []) {
  const seen = new Set();
  const result = [];
  const combined = [...(existingList || []), ...(newList || [])];
  for (const item of combined) {
    const trimmed = String(item || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}
