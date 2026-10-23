import { useEffect, useState } from "react";

import { formatDateTime } from "@/scenes/admin-warning/components/Alerts";
import api from "@/services/api";
import { captureError } from "@/services/error";

const SOURCES = { metabase: "Metabase", job: "Job" };

// Historique des réceptions de l'alerte (une ligne par envoi de la source), des plus récentes aux plus anciennes.
const AlertOccurrences = ({ alertId }) => {
  const [occurrences, setOccurrences] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api
      .get(`/warning/${alertId}/occurrences`)
      .then((res) => {
        if (!res.ok) throw res;
        setOccurrences(res.data);
      })
      .catch((error) => {
        setLoadError(true);
        captureError(error, { extra: { alertId } });
      });
  }, [alertId]);

  return (
    <section aria-labelledby="alert-occurrences" className="space-y-4">
      <h3 id="alert-occurrences" className="sr-only">
        Historique des réceptions
      </h3>
      {loadError && (
        <p role="alert" className="text-error">
          Impossible de charger l'historique
        </p>
      )}
      {!loadError && occurrences?.length === 0 && <p className="text-text-mention">Aucune réception enregistrée</p>}
      <ol className="space-y-3">
        {occurrences?.map((o) => (
          <li key={o.id} className="border-blue-france-925 border-l-4 pl-4">
            <p className="text-sm font-bold">
              {formatDateTime(o.createdAt)} <span className="text-text-mention font-normal">· {SOURCES[o.source] ?? o.source}</span>
            </p>
            {o.description && <p className="text-text-mention text-sm whitespace-pre-line">{o.description}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default AlertOccurrences;
