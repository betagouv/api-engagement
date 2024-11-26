import { useEffect, useState } from "react";
import api from "../services/api";
import { captureError } from "../services/error";
import useStore from "../services/store";
import Autocomplete from "./Autocomplete";

const SelectCity = ({ onChange }) => {
  const { publisher } = useStore();
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        if (search.length > 0 && search.length < 3) {
          setOptions([]);
          return;
        }
        const res = await api.get(`/mission/autocomplete?field=city&search=${search}&publisherId=${publisher._id}`);
        if (!res.ok) throw res;
        setOptions(
          res.data.map((city) => ({
            label: city.key === "" ? "Non renseignée" : city.key,
            value: city.key,
          })),
        );
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des villes");
      }
    };
    fetchOptions();
  }, [search, publisher._id]);

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
      placeholder="Ville"
      className="w-96"
    />
  );
};

export default SelectCity;
