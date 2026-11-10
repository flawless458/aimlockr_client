/**
 * @typedef {object} SearchableRow
 * @property {string} label
 */

/**
 * @typedef {object} SearchableSection
 * @property {string} title
 * @property {ReadonlyArray<SearchableRow>} rows
 */

/**
 * @param {unknown} query
 * @returns {string}
 */
export const normalizeQuery = (query) => (typeof query === 'string' ? query.trim().toLowerCase() : '');

/**
 * @param {string} text
 * @param {string} query
 * @returns {boolean}
 */
export const matchesQuery = (text, query) => {
  const normalized = normalizeQuery(query);
  return normalized === '' || text.toLowerCase().includes(normalized);
};

/**
 * @template {SearchableSection} Section
 * @template {SearchableRow} Row
 * @param {ReadonlyArray<Section>} sections
 * @param {string} query
 * @returns {Array<Section>}
 */
export const filterSections = (sections, query) => {
  const normalized = normalizeQuery(query);
  if (normalized === '') return sections.map((section) => ({ ...section, rows: [...section.rows] }));
  return /** @type {Array<Section>} */ (sections
    .map((section) => {
      if (matchesQuery(section.title, normalized)) return { ...section, rows: [...section.rows] };
      const rows = section.rows.filter((row) => matchesQuery(row.label, normalized));
      return { ...section, rows };
    })
    .filter((section) => section.rows.length > 0));
};

/**
 * @param {ReadonlyArray<SearchableSection>} sections
 * @param {string} query
 * @returns {number}
 */
export const countMatches = (sections, query) =>
  filterSections(sections, query).reduce((total, section) => total + section.rows.length, 0);
