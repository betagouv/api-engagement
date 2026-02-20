import api from "@/services/api";
import { captureError } from "@/services/error";
import Combobox from "@/components/combobox/index";

const MissionCombobox = ({ id, value, onSelect, onChange, placeholder, className, filters }) => {
  const fetchOptions = async (search) => {
    try {
      const res = await api.get(`/mission/autocomplete?${filters}&search=${search}`);
      if (!res.ok) throw res;
      return res.data.map((item) => ({
        label: item.key === "" ? "Non renseignée" : item.key,
        value: item.key,
      }));
    } catch (error) {
      captureError(error, { extra: { search, filters } });
    }
    return [];
  };

  return <Combobox id={id} value={value} onSelect={onSelect} onChange={onChange} onSearch={(search) => fetchOptions(search)} placeholder={placeholder} className={className} />;
};

export default MissionCombobox;
