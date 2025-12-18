import { RiDeleteBin6Line } from "react-icons/ri";
import Toggle from "../../../components/Toggle";

const Trackers = ({ values, onChange }) => {
  const handleTrackerKeyChange = (e, i) => {
    const trackers = [...values.trackers];
    const query = new URLSearchParams();
    trackers.forEach((t, j) => (i === j ? query.append(e.target.value, trackers[i].value) : query.append(t.key, t.value)));
    const url = `${values.url.split("?")[0]}?${query.toString()}`;
    trackers[i].key = e.target.value;
    onChange({ ...values, url, trackers });
  };

  const handleTrackerValueChange = (e, i) => {
    const trackers = [...values.trackers];
    const query = new URLSearchParams();
    trackers.forEach((t) => query.append(t.key, t.value || ""));
    query.set(trackers[i].key, e.target.value);
    const url = `${values.url.split("?")[0]}?${query.toString()}`;
    trackers[i].value = e.target.value;
    onChange({ ...values, url, trackers });
  };

  const handleDeleteTracker = (i) => {
    const query = new URLSearchParams();
    values.trackers.forEach((t, j) => (i === j ? null : query.append(t.key, t.value || "")));
    const url = `${values.url.split("?")[0]}?${query.toString()}`;
    onChange({ ...values, url, trackers: values.trackers.filter((t, j) => j !== i) });
  };

  return (
    <>
      <div className="flex items-center">
        <Toggle
          value={values.trackers && values.trackers.length > 0}
          onChange={(v) => {
            if (v) onChange({ ...values, trackers: [{ key: "", value: "" }] });
            else onChange({ ...values, trackers: [], url: values.url.split("?")[0] });
          }}
        />
        <label className="ml-2 text-base">Ajouter des paramètres pour le suivi statistique</label>
      </div>
      {values.trackers && values.trackers.length > 0 && (
        <div className="border border-gray-900 p-8">
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
                <div className="flex w-10 justify-end">
                  {values.trackers.length > 1 && (
                    <button type="button" className="tertiary-btn" onClick={() => handleDeleteTracker(i)}>
                      <RiDeleteBin6Line className="text-red-error" />
                    </button>
                  )}
                </div>
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
