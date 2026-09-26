import axe from "axe-core";

/**
 * Runs an accessibility audit on a rendered DOM container using axe-core.
 *
 * @param {HTMLElement|Document} container - The DOM node or container to audit.
 * @param {object} [options={}] - Optional axe configuration overrides.
 * @returns {Promise<axe.AxeResults>} Axe audit results containing violations, passes, etc.
 */
export async function runAxeAudit(container, options = {}) {
  const results = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    },
    ...options,
  });
  return results;
}

export default runAxeAudit;
