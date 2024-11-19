import { useEffect, useState } from "react";
import api from "../services/api";
import { captureError } from "../services/error";
import useStore from "../services/store";
import Autocomplete from "./Autocomplete";

const SelectOrganization = ({ onChange }) => {
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
        const res = await api.get(`/mission/autocomplete?field=organizationName&search=${search}&publisherId=${publisher._id}`);
        if (!res.ok) throw res;
        setOptions(
          res.data.map((org) => ({
            label: org.key === "" ? "Non renseignée" : org.key,
            value: org.key,
          })),
        );
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des organisations");
      }
    };
    fetchOptions();
  }, [search, publisher._id]);

  return (
    <Autocomplete
      value={search}
      onChange={setSearch}
      onSelect={(org) => {
        setSearch(org ? org.label : "");
        onChange(org ? org.value : null);
        setOptions([]);
      }}
      options={options}
      onClear={() => {
        setSearch("");
        onChange(null);
      }}
      placeholder="Organisation"
      className="w-96"
    />
  );
};

export default SelectOrganization;
