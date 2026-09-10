import Toggle from "@/components/Toggle";
import { buildSearchParams } from "@/utils/url";
import { useId } from "react";
import { RiDeleteBin6Line } from "react-icons/ri";

const Trackers = ({ values, onChange }) => {
  const id = useId();

  const handleTrackerKeyChange = (e, i) => {
    const trackers = [...values.trackers];
    const searchParams = buildSearchParams(trackers);
    const url = `${values.url.split("?")[0]}${searchParams ? `?${searchParams}` : ""}`;
    trackers[i].key = e.target.value;
    onChange({ ...values, url, trackers });
  };

  const handleTrackerValueChange = (e, i) => {
    const trackers = [...values.trackers];
    trackers[i].value = e.target.value.replace(/ /g, "+");
    const searchParams = buildSearchParams(trackers);
    const url = `${values.url.split("?")[0]}${searchParams ? `?${searchParams}` : ""}`;
    onChange({ ...values, url, trackers });
  };

  const handleDeleteTracker = (i) => {
    const trackers = values.trackers.filter((t, j) => j !== i);
    const searchParams = buildSearchParams(trackers);
    const url = `${values.url.split("?")[0]}${searchParams ? `?${searchParams}` : ""}`;
    onChange({ ...values, url, trackers: values.trackers.filter((t, j) => j !== i) });
  };

  return (
    <>
      <div className="flex items-center">
        <Toggle
          id={`${id}-enabled`}
          value={values.trackers && values.trackers.length > 0}
          onChange={(v) => {
            if (v) onChange({ ...values, trackers: [{ key: "", value: "" }] });
            else onChange({ ...values, trackers: [], url: values.url.split("?")[0] });
          }}
        />
        <label htmlFor={`${id}-enabled`} className="ml-2 text-base">
          Ajouter des paramètres pour le suivi statistique
        </label>
      </div>
      {values.trackers && values.trackers.length > 0 && (
        <div className="border-grey-border overflow-x-auto border p-4 sm:p-8">
          <div className="min-w-[500px]">
            <div className="mb-2 flex items-center gap-4">
              <span className="flex-1 text-base">Nom du paramètre</span>
              <span className="flex-1 text-base">Valeur du paramètre</span>
              <div className="w-10" />
            </div>
            <div className="space-y-4">
              {values.trackers.map((tracker, i) => (
                <div key={i} className="flex items-center gap-6">
                  <label htmlFor={`${id}-key-${i}`} className="sr-only">
                    Nom du paramètre {i + 1}
                  </label>
                  <input
                    id={`${id}-key-${i}`}
                    className="input flex-1"
                    name="key"
                    value={tracker.key}
                    onChange={(e) => handleTrackerKeyChange(e, i)}
                    placeholder="Exemple : utm_source"
                  />
                  <label htmlFor={`${id}-value-${i}`} className="sr-only">
                    Valeur du paramètre {i + 1}
                  </label>
                  <input
                    id={`${id}-value-${i}`}
                    className="input flex-1"
                    name="value"
                    value={tracker.value}
                    onChange={(e) => handleTrackerValueChange(e, i)}
                    placeholder="Exemples : google, newsletter"
                  />

                  <button type="button" className="tertiary-btn w-10 px-0" onClick={() => handleDeleteTracker(i)} aria-label={`Supprimer le paramètre ${i + 1}`}>
                    <RiDeleteBin6Line className="text-error mx-auto" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="secondary-btn mt-4" onClick={() => onChange({ ...values, trackers: [...values.trackers, { key: "", value: "" }] })}>
              Ajouter un paramètre
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Trackers;
