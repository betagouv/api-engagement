import {
  Bar,
  BarChart as BarChartRechart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart as LineChartRechart,
  PieChart,
  Pie as PieRechart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const COLORS = [
  "rgb(158,1,66,0.7)", // red
  "rgb(213,62,79,0.7)", // red
  "rgb(244,109,67,0.7)", // orange
  "rgb(253,174,97,0.7)", // orange
  "rgb(254,224,139,0.7)", // yellow
  "rgb(230,245,152,0.7)", // yellow
  "rgb(171,221,164,0.7)", // green
  "rgb(102,194,165,0.7)", // green
  "rgb(50,136,189,0.7)", // blue
  "rgb(94,79,162,0.7)", // blue
  "rgba(0,0,145,255)", // dark blue
];

const PieTooltip = ({ active, payload, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg">
        <div className="bg-[#f6f6f6] text-xs text-[#666666] w-full px-4 py-2">
          <p className="label">{payload[0].payload.name}</p>
        </div>
        <div className="space-y-2 p-4">
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="w-4 h-2 mr-2" style={{ backgroundColor: p.payload.fill }} />
              <p className="text-xs font-bold">{unit ? `${p.value} ${unit}` : p.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const Pie = ({ data, dataKey = "value", nameKey = "name", cx = "50%", cy = "50%", outerRadius = "100%", innerRadius = "50%", paddingAngle = 0.2, unit = "" }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <PieRechart data={data} dataKey={dataKey} nameKey={nameKey} cx={cx} cy={cy} outerRadius={outerRadius} innerRadius={innerRadius} paddingAngle={paddingAngle}>
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.name === "Autres" ? "rgba(0,0,0,0.5)" : entry.color ? entry.color : COLORS[i % COLORS.length]} />
          ))}
        </PieRechart>
        <Tooltip content={<PieTooltip unit={unit} />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const LineChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc, p) => acc + p.value, 0);
    return (
      <div className="bg-white shadow-lg">
        <div className="bg-[#f6f6f6] text-xs text-[#666666] w-full px-4 py-2">
          <p className="label">{`${label} - ${total}`}</p>
        </div>
        <div className="space-y-2 p-4">
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="w-4 h-2 mr-2" style={{ backgroundColor: p.stroke }} />
                <p className="text-xs truncate font-bold">{p.name}</p>
              </div>
              <p className="text-xs font-bold">{p.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const LineChart = ({ data, dataKey = ["value"], nameKey = "name", color = "", type = "", legend = true }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChartRechart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={nameKey} />
        <YAxis />
        <Tooltip content={<LineChartTooltip />} />
        {legend && <Legend />}
        {dataKey.map((k, i) => (
          <Line key={i} type={type} dataKey={k} stroke={color[i % color.length]} />
        ))}
      </LineChartRechart>
    </ResponsiveContainer>
  );
};

const BarCharLabelList = ({ value, x, y, width, height }) => {
  return (
    <text
      className="text-xs"
      x={x + width / 2}
      y={height > 20 ? y + height / 2 : y - 4}
      fill={height > 20 ? "white" : "black"}
      dy={height > 20 ? null : -10}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {value >= 10000 ? `${Math.round(value / 1000)}k` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
    </text>
  );
};

const BarChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg">
        <div className="bg-[#f6f6f6] text-xs text-[#666666] w-full px-4 py-2">
          <p className="label">{label}</p>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="w-4 h-2 mr-2" style={{ backgroundColor: payload[0].fill }} />
              <p className="text-xs truncate font-bold">{payload[0].name}</p>
            </div>
            <p className="text-xs font-bold">{payload[0].value}</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const BarChart = ({ data, dataKey = "Volume", nameKey = "name", color = COLORS[10] }) => {
  if (!data || !data.length) return;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChartRechart data={data}>
        <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={{ fontSize: 12 }}></XAxis>
        <Tooltip content={<BarChartTooltip />} />
        <Bar dataKey={dataKey} fill={color} barSize={30} radius={[2, 2, 0, 0]}>
          <LabelList dataKey={dataKey} content={<BarCharLabelList />} />
        </Bar>
      </BarChartRechart>
    </ResponsiveContainer>
  );
};

const StackedBarChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc, p) => acc + p.value, 0);
    return (
      <div className="bg-white shadow-lg">
        <div className="bg-[#f6f6f6] text-xs text-[#666666] w-full px-4 py-2">
          <p className="label">{`${label} - ${total}`}</p>
        </div>
        <div className="space-y-2 p-4">
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="w-4 h-2 mr-2" style={{ backgroundColor: p.fill }} />
                <p className="text-xs truncate font-bold">{p.name}</p>
              </div>
              <p className="text-xs font-bold">{p.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const StackedBarChartLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap justify-end gap-4 pb-4">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div className="w-4 h-2" style={{ backgroundColor: entry.color }}></div>
          <p className="text-xs truncate">{entry.value}</p>
        </div>
      ))}
    </div>
  );
};

export const StackedBarchart = ({ data, dataKey = ["Volume"], nameKey = "name", color = COLORS, legend = true }) => {
  if (!data || !data.length) return;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChartRechart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={nameKey} style={{ fontSize: "12px", color: "#666666" }} />
        <YAxis style={{ fontSize: "12px", color: "#666666" }} />
        <Tooltip content={<StackedBarChartTooltip />} />
        {legend && <Legend verticalAlign="top" content={<StackedBarChartLegend />} />}
        {dataKey.map((k, i) => (
          <Bar key={i} dataKey={k} stackId="a" fill={k === "Autres" ? "rgba(0,0,0,0.5)" : color[i % color.length]} />
        ))}
      </BarChartRechart>
    </ResponsiveContainer>
  );
};

export default Pie;
