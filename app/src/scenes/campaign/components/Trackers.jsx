import { RiDeleteBin6Line } from "react-icons/ri";
import Toggle from "@/components/Toggle";
import { buildSearchParams } from "@/utils/url";

const Trackers = ({ values, onChange }) => {
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
          aria-label="Ajouter des paramètres pour le suivi statistique"
          value={values.trackers && values.trackers.length > 0}
          onChange={(v) => {
            if (v) onChange({ ...values, trackers: [{ key: "", value: "" }] });
            else onChange({ ...values, trackers: [], url: values.url.split("?")[0] });
          }}
        />
        <label className="ml-2 text-base">Ajouter des paramètres pour le suivi statistique</label>
      </div>
      {values.trackers && values.trackers.length > 0 && (
        <div className="border-grey-border border p-8">
          <div className="mb-2 flex items-center gap-4">
            <label className="flex-1 text-base">Nom du paramètre</label>
            <label className="flex-1 text-base">Valeur du paramètre</label>
            <div className="w-10" />
          </div>
          <div className="space-y-4">
            {values.trackers.map((tracker, i) => (
              <div key={i} className="flex items-center gap-6">
                <input className="input flex-1" name="key" value={tracker.key} onChange={(e) => handleTrackerKeyChange(e, i)} placeholder="Exemple : utm_source" />
                <input className="input flex-1" name="value" value={tracker.value} onChange={(e) => handleTrackerValueChange(e, i)} placeholder="Exemples : google, newsletter" />

                <button type="button" className="tertiary-btn w-10 px-0" onClick={() => handleDeleteTracker(i)}>
                  <RiDeleteBin6Line className="text-error mx-auto" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="secondary-btn mt-4" onClick={() => onChange({ ...values, trackers: [...values.trackers, { key: "", value: "" }] })}>
            Ajouter un paramètre
          </button>
        </div>
      )}
    </>
  );
};

export default Trackers;
