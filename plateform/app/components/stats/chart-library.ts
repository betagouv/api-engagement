import "@gouvfr/dsfr-chart/css";
import { useEffect, useState, type DetailedHTMLProps, type HTMLAttributes } from "react";

type ChartElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;

// Balises des web components de @gouvfr/dsfr-chart, déclarées pour le JSX.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "bar-chart": ChartElement;
      "map-chart": ChartElement;
      "table-chart": ChartElement;
      "data-box": ChartElement;
    }
  }
}

// Les web components ont besoin de `window` : import dynamique côté client uniquement.
export function useChartsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void import("@gouvfr/dsfr-chart").then(() => setReady(true));
  }, []);
  return ready;
}
