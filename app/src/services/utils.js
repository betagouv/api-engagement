export const timeSince = (date) => {
  let seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) return Math.floor(interval) + " années";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " mois";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " jours";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " heures";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes";
  return Math.floor(seconds) + " secondes";
};

const exportCSV = async (name, data) => {
  if (!data.length) return;
  const date = new Date();
  const filename = `${name} - ${date.toLocaleDateString("fr")}.csv`;
  const csv = generateCSV(data);
  downloadFile(filename, csv);
};
export default exportCSV;

// Use a depencies here ?
const generateCSV = (data) => {
  const csv = [Object.keys(data[0])].concat(data);
  return csv
    .map((it) => {
      return Object.values(it).join(";");
    })
    .join("\n");
};

const downloadFile = (filename, csv) => {
  let blob = new Blob([csv]);
  if (window.navigator.msSaveOrOpenBlob)
    // IE hack; see http://msdn.microsoft.com/en-us/library/ie/hh779016.aspx
    window.navigator.msSaveBlob(blob, filename);
  else {
    const encodedUrl = window.URL.createObjectURL(blob, {
      type: "data:text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodedUrl);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const slugify = (string) => {
  const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
  const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return string
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

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const hasSpecialChar = (string) => {
  return /[$&+,:;=?@#|'<>.^*()%!-]/.test(string);
};

export const hasNumber = (string) => {
  return /[0-9]/.test(string);
};

export const hasLetter = (string) => {
  return /[a-zA-Z]/.test(string);
};
