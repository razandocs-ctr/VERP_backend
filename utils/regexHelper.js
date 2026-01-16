/**
 * Escapes special characters in a string for use in a regular expression.
 * This prevents ReDoS attacks by ensuring user input is treated as literal characters.
 * 
 * @param {string} string - The input string to escape
 * @returns {string} - The escaped string safe for RegExp constructor
 */
export const escapeRegex = (string) => {
    if (typeof string !== 'string') {
        return '';
    }
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};
