import type { MetabasePoint } from "@engagement/dto";

type ChartDataTableProps = { data: MetabasePoint[]; caption: string; nameHeader: string };

// Alternative textuelle d'un graphique (RGAA 1.6), masquée visuellement.
// Pas de classe `fr-table` : le JS du DSFR en fait une zone défilante non focusable une fois masquée (axe scrollable-region-focusable).
export function ChartDataTable({ data, caption, nameHeader }: ChartDataTableProps) {
  return (
    <div className="sr-only">
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
              <td>{point.value.toLocaleString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
