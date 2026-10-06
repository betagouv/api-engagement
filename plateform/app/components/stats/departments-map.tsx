import { sortDepartments, type DepartmentPoint } from "~/utils/public-stats";
import { useChartsReady } from "./chart-library";

const DATA_BOX_ID = "stats-departments";

// La carte colore en violet (et n'affiche rien au survol) les départements absents des données : on les force à 0.
const DEPARTMENT_CODES = [...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, "0")).filter((code) => code !== "20"), "2A", "2B", "971", "972", "973", "974", "976"];

// Carte et alternative tableau regroupées dans la DataBox de la lib (contrôle graphique / tableau).
export function DepartmentsMap({ data, name }: { data: DepartmentPoint[]; name: string }) {
  const ready = useChartsReady();
  if (!ready) return <div style={{ minHeight: 400 }} />;

  const departments = sortDepartments(data);
  const valueByCode = {
    ...Object.fromEntries(DEPARTMENT_CODES.map((code) => [code, 0])),
    ...Object.fromEntries(departments.filter((d) => d.code !== "-").map((d) => [d.code, d.value])),
  };

  return (
    <>
      <data-box id={DATA_BOX_ID} name={name} heading-level="h3" source="Trouve ta mission" date={new Date().toISOString().slice(0, 10)} />
      <map-chart databox-id={DATA_BOX_ID} databox-type="chart" data={JSON.stringify(valueByCode)} name={name} level="dep" />
      <table-chart
        databox-id={DATA_BOX_ID}
        databox-type="table"
        x={JSON.stringify(departments.map((d) => (d.code === "-" ? d.nom : `${d.nom} (${d.code})`)))}
        y={JSON.stringify([departments.map((d) => d.value)])}
        name={JSON.stringify(["Quiz terminés"])}
        table-name="Département"
      />
    </>
  );
}
