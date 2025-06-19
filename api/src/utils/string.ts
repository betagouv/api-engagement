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

// Capitalize first letter of each word in a string
export const capitalizeFirstLetter = (string: string): string => {
  if (!string) {
    return string;
  }
  return string.replace(/\b\w/g, (l) => l.toUpperCase());
};

export const hasSpecialChar = (string: string) => {
  return /[$&+,:;=?@#|'<>.^*()%!-]/.test(string);
};

export const hasNumber = (string: string) => {
  return /[0-9]/.test(string);
};

export const hasLetter = (string: string) => {
  return /[a-zA-Z]/.test(string);
};
