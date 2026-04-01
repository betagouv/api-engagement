import Combobox from "@/components/combobox/DesignSystem";
import { useMemo, useState } from "react";

const LabelledCombobox = ({ id, values, onChange, placeholder, className = "w-full min-w-80", options }) => {
  const [search, setSearch] = useState("");

  const optionMap = useMemo(() => {
    return options.reduce((acc, option) => {
      acc[option.key] = option;
      return acc;
    }, {});
  }, [options]);
  const filteredOptions = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase())), [options, search]);

  return (
    <Combobox
      id={id}
      options={filteredOptions.map((option) => option.key)}
      values={values}
      onChange={onChange}
      onSearch={(search) => setSearch(search)}
      placeholder={placeholder}
      className={className}
      getLabel={(option) => optionMap[option]?.label}
      getCount={(option) => optionMap[option]?.doc_count}
      debounce={0}
    />
  );
};

export default LabelledCombobox;
