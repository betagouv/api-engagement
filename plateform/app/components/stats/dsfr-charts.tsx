import type { MetabasePoint } from "@engagement/dto";
import "@gouvfr/dsfr-chart/css";
import { useEffect, useState, type DetailedHTMLProps, type HTMLAttributes } from "react";

type CustomElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "bar-chart": CustomElement;
      "map-chart": CustomElement;
      "table-chart": CustomElement;
      "data-box": CustomElement;
    }
  }
}

export type DepartmentPoint = { code: string; nom: string; value: number };

const formatNumber = (value: number) => value.toLocaleString("fr-FR");

// Les web components ont besoin de `window` : import dynamique côté client uniquement.
function useDsfrChart() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void import("@gouvfr/dsfr-chart").then(() => setReady(true));
  }, []);
  return ready;
}

export function DsfrBarChart({ data, horizontal = false, name }: { data: MetabasePoint[]; horizontal?: boolean; name: string }) {
  const ready = useDsfrChart();
  if (!ready) return <div style={{ minHeight: 280 }} />;
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

// Ordre des départements : numérique, 2A/2B entre 19 et 21, DOM après, « Non renseigné » (-) en dernier.
const departmentOrder = (code: string) => (code === "-" ? Infinity : code === "2A" ? 20.1 : code === "2B" ? 20.2 : Number(code));

// DataBox officielle : carte + alternative tableau (contrôle graphique / tableau intégré à la lib).
export function DepartmentsMap({ data, name }: { data: DepartmentPoint[]; name: string }) {
  const ready = useDsfrChart();
  if (!ready) return <div style={{ minHeight: 400 }} />;

  const rows = [...data].sort((a, b) => departmentOrder(a.code) - departmentOrder(b.code));
  const byCode = Object.fromEntries(rows.filter((d) => d.code !== "-").map((d) => [d.code, d.value]));
  const id = "stats-departments";

  return (
    <>
      <data-box id={id} name={name} heading-level="h3" source="Trouve ta mission" date={new Date().toISOString().slice(0, 10)} />
      <map-chart databox-id={id} databox-type="chart" data={JSON.stringify(byCode)} name={name} level="dep" />
      <table-chart
        databox-id={id}
        databox-type="table"
        x={JSON.stringify(rows.map((d) => (d.code === "-" ? d.nom : `${d.nom} (${d.code})`)))}
        y={JSON.stringify([rows.map((d) => d.value)])}
        name={JSON.stringify(["Quiz terminés"])}
        table-name="Département"
      />
    </>
  );
}

// Alternative accessible au graphique (RGAA 4.1) : mêmes données en tableau, masqué visuellement.
export function StatsDataTable({ data, caption, nameHeader = "Libellé" }: { data: MetabasePoint[]; caption: string; nameHeader?: string }) {
  return (
    <div className="sr-only">
      <div className="fr-table">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{nameHeader}</th>
              <th scope="col">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.name}>
                <td>{point.name}</td>
                <td>{formatNumber(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
