import { useEffect, useState } from "react";
import Autocomplete from "../../../components/Autocomplete";
import api from "../../../services/api";
import { captureError } from "../../../services/error";
import useStore from "../../../services/store";

const SelectOrganization = ({ onChange }) => {
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
        const res = await api.get(`/mission/autocomplete?field=organizationName&search=${search}&publisherId=${publisher.id}`);
        if (!res.ok) throw res;
        setOptions(
          res.data.map((org) => ({
            label: org.key === "" ? "Non renseignée" : org.key,
            value: org.key,
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
      placeholder="Organisations"
      className="w-96"
    />
  );
};

export default SelectOrganization;
