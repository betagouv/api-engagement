/**
 * Slugify a string
 *
 * @param value The string to slugify
 * @returns The slugified string
 */
export const slugify = (value: string) => {
  const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
  const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

/**
 * Capitalize the first letter of each word in a string
 
 * @param string The string to capitalize
 * @returns The capitalized string 
 */
export const capitalizeFirstLetter = (string: string): string => {
  if (!string) {
    return string;
  }
  return string.replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Check if a string contains special characters
 *
 * @param string The string to check
 * @returns True if the string contains special characters, false otherwise
 */
export const hasSpecialChar = (string: string) => {
  return /[$&+,:;=?@#|'<>.^*()%!-]/.test(string);
};

/**
 * Check if a string contains numbers
 *
 * @param string The string to check
 * @returns True if the string contains numbers, false otherwise
 */
export const hasNumber = (string: string) => {
  return /[0-9]/.test(string);
};

/**
 * Check if a string contains letters
 *
 * @param string The string to check
 * @returns True if the string contains letters, false otherwise
 */
export const hasLetter = (string: string) => {
  return /[a-zA-Z]/.test(string);
};
