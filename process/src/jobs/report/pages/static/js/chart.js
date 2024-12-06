document.addEventListener("DOMContentLoaded", function () {
  const MONTHS = ["janv.", "fév.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const COLORS = ["#000091", "#FB955D", "#F96666", "#54D669", "#FF6FF1"];

  // Initialize Line Charts
  document.querySelectorAll('canvas[data-chart="line"]').forEach((canvas) => {
    const data = JSON.parse(canvas.dataset.chartData);
    data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    new Chart(canvas, {
      type: "line",
      data: {
        labels: data.map((d) => MONTHS[new Date(d.month).getMonth()]),
        datasets: [
          {
            label: "Redirections",
            data: data.map((d) => d.click),
            borderColor: "#000091",
            backgroundColor: "#000091",
            tension: 0.1,
            borderWidth: 1,
            pointRadius: 2,
          },
          {
            label: "Redirections année précédente",
            data: data.map((d) => d.clickLastYear),
            borderColor: "#B3B3DE",
            backgroundColor: "#B3B3DE",
            tension: 0.1,
            borderWidth: 1,
            pointRadius: 2,
          },
          {
            label: "Candidatures",
            data: data.map((d) => d.apply),
            borderColor: "#FA7A35",
            backgroundColor: "#FA7A35",
            tension: 0.1,
            borderWidth: 1,
            pointRadius: 2,
          },
          {
            label: "Candidatures année précédente",
            data: data.map((d) => d.applyLastYear),
            borderColor: "#FDD7C2",
            backgroundColor: "#FDD7C2",
            tension: 0.1,
            borderWidth: 1,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  });

  // Initialize Bar Charts
  document.querySelectorAll('canvas[data-chart="bar"]').forEach((canvas) => {
    const data = JSON.parse(canvas.dataset.chartData);
    data.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    const labels = data.map((d) => MONTHS[new Date(d.month).getMonth()]);
    const keys = Object.keys(data[0]).filter((key) => key !== "month");

    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: keys.map((key, index) => ({
          label: key,
          data: data.map((d) => d[key]),
          backgroundColor: COLORS[index],
          stack: "stack1",
          borderWidth: 1,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
          },
        },
      },
    });
  });
});
