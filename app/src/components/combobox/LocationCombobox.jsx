import { captureError } from "@/services/error";
import Combobox from "@/components/combobox/index";

const LocationCombobox = ({ id, selected, onSelect, placeholder, className }) => {
  const fetchLocasions = async (search) => {
    if (search.length < 4) {
      if (selected) {
        return [
          {
            label: selected.label,
            value: selected.value,
          },
        ];
      }
      return [];
    }
    try {
      const res = await fetch(`https://data.geopf.fr/geocodage/search?q=${search}&type=municipality&autocomplete=1&limit=6`).then((r) => r.json());
      if (!res.features) {
        return [];
      }
      return res.features.map((f) => ({
        label: `${f.properties.name}, ${f.properties.city} ${f.properties.postcode}`,
        value: `${f.geometry.coordinates[1]}-${f.geometry.coordinates[0]}`,
      }));
    } catch (error) {
      captureError(error, { extra: { search } });
    }
    return [];
  };

  return <Combobox id={id} value={selected ? selected.value : null} onSelect={onSelect} onSearch={fetchLocasions} placeholder={placeholder} className={className} />;
};

export default LocationCombobox;
