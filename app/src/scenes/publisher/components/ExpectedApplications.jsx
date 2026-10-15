import RadioInput from "@/components/form/RadioInput";

const OPTIONS = [
  { value: true, label: "Oui" },
  { value: false, label: "Non" },
];

// null = non renseigné : aucune option cochée
const ExpectedApplications = ({ value, onChange, error }) => (
  <fieldset className="space-y-4">
    <legend className="mb-4 text-base font-bold">Candidatures attendues</legend>
    {error && <p className="text-error">{error}</p>}
    {OPTIONS.map((option) => (
      <RadioInput
        key={String(option.value)}
        id={`expected-applications-${option.value}`}
        name="expected-applications"
        value={String(option.value)}
        label={option.label}
        size={24}
        checked={value === option.value}
        onChange={() => onChange(option.value)}
      />
    ))}
  </fieldset>
);

export default ExpectedApplications;
