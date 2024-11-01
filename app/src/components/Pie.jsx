import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from "chart.js";
import { Pie as PieJS } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export const colors = [
  "rgba(250,117,117,255)",
  "rgba(252,205,109,255)",
  "rgba(251,146,107,255)",
  "rgba(110,213,197,255)",
  "rgba(114,183,122,255)",
  "rgba(146,146,146,255)",
  "rgba(255,160,122,255)",
  "rgba(255,127,80,255)",
  "rgba(255,69,0,255)",
  "rgba(255,218,185,255)",
  "rgba(255,245,238,255)",
  "rgba(240,128,128,255)",
  "rgba(255,192,203,255)",
  "rgba(255,222,173,255)",
  "rgba(255,250,205,255)",
  "rgba(255,239,213,255)",
];
const Pie = ({ data, labelKey, keys, legendPosition = "bottom" }) => {
  if (!data || !data.length) return <div className={` p-4 text-center text-sm font-bold text-black`}>Aucune donnée</div>;

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: legendPosition,
        maxWidth: 100,
        maxHeight: 100,
        labels: {
          pointStyle: "circle",
          usePointStyle: true,
          font: {
            size: 9,
          },
        },
      },
    },
  };

  const { labels, datasets } = buildData(data, labelKey, keys);
  return <PieJS options={options} data={{ labels, datasets }} />;
};

const buildData = (data) => {
  const labels = [];
  const datasets = { data: [], backgroundColor: [] };
  data.forEach((d, i) => {
    labels.push(d.key);
    datasets.data.push(d.doc_count);

    datasets.backgroundColor.push(d.color ? d.color : colors[i % colors.length]);
  });
  return { labels, datasets: [datasets] };
};

export default Pie;
