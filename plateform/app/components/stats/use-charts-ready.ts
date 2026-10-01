import "@gouvfr/dsfr-chart/css";
import { useEffect, useState } from "react";

// Les web components ont besoin de `window` : import dynamique côté client uniquement.
export function useChartsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void import("@gouvfr/dsfr-chart").then(() => setReady(true));
  }, []);
  return ready;
}
