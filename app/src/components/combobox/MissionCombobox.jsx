// import Combobox from "@/components/combobox/index";
import Combobox from "@/components/combobox/DesignSystem";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { useEffect, useState } from "react";

const MissionCombobox = ({ id, values, onChange, placeholder, className, filters }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions("");
  }, [filters]);

  const fetchOptions = async (search) => {
    try {
      setLoading(true);
      const res = await api.get(`/mission/autocomplete?${filters}&search=${search}`);
      if (!res.ok) {
        throw res;
      }
      setOptions(res.data.map((item) => (item.key === "" ? "Non renseignée" : item.key)));
    } catch (error) {
      captureError(error, { extra: { search, filters } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Combobox
      id={id}
      options={options}
      values={values}
      onChange={onChange}
      onSearch={(search) => fetchOptions(search)}
      placeholder={placeholder}
      className="w-full min-w-80"
      loading={loading}
    />
  );
};

export default MissionCombobox;
