import { useEffect, useState } from "react";
import Autocomplete from "../../../components/Autocomplete";
import api from "../../../services/api";
import { captureError } from "../../../services/error";
import useStore from "../../../services/store";

const SelectCity = ({ onChange }) => {
  const { publisher } = useStore();
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        if (search.length === 0) {
          onChange(null);
          setOptions([]);
          return;
        }
        const res = await api.get(`/mission/autocomplete?field=city&search=${search}&publisherId=${publisher.id}`);
        if (!res.ok) throw res;
        setOptions(
          res.data.map((city) => ({
            label: city.key === "" ? "Non renseignée" : city.key,
            value: city.key,
          })),
        );
      } catch (error) {
        captureError(error, { extra: { search, publisherId: publisher.id } });
      }
    };
    fetchOptions();
  }, [search, publisher.id]);

  return (
    <Autocomplete
      value={search}
      onChange={setSearch}
      onSelect={(city) => {
        setSearch(city ? city.label : "");
        onChange(city ? city.value : null);
        setOptions([]);
      }}
      options={options}
      onClear={() => {
        setSearch("");
        onChange(null);
      }}
      placeholder="Villes"
      className="w-96"
    />
  );
};

export default SelectCity;
