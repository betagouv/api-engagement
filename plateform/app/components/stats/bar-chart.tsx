import type { MetabasePoint } from "@engagement/dto";
import { useChartsReady } from "./use-charts-ready";

type BarChartProps = { data: MetabasePoint[]; name: string; horizontal?: boolean };

export function BarChart({ data, name, horizontal }: BarChartProps) {
  const ready = useChartsReady();
  if (!ready) return <div style={{ minHeight: 280 }} />;

  // `key` : remonte le graphique quand la série change (ex. changement de question).
  return (
    <bar-chart
      key={name}
      x={JSON.stringify([data.map((p) => p.name)])}
      y={JSON.stringify([data.map((p) => p.value)])}
      name={JSON.stringify([name])}
      horizontal={horizontal || undefined}
      selected-palette="default"
    />
  );
}
