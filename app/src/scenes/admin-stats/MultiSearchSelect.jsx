const MultiSearchSelect = ({ options = [], value = [], onChange, placeholder = "Sélectionner" }) => {
  const handleChange = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    onChange?.({ value: values });
  };

  return (
    <div className="min-w-[18em]">
      <label className="sr-only">{placeholder}</label>
      <select multiple className="select w-full py-2" value={value} onChange={handleChange} aria-label={placeholder}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MultiSearchSelect;
