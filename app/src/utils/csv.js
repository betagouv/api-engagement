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

const exportCSV = async (name, data) => {
  if (!data.length) return;
  const date = new Date();
  const filename = `${name} - ${date.toLocaleDateString("fr")}.csv`;
  const csv = generateCSV(data);
  downloadFile(filename, csv);
};

export default exportCSV;
