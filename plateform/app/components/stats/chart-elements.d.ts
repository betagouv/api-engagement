import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ChartElement = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;

// Balises des web components de @gouvfr/dsfr-chart.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "bar-chart": ChartElement;
      "map-chart": ChartElement;
      "table-chart": ChartElement;
      "data-box": ChartElement;
    }
  }
}
