import RadioInput from "@/components/form/RadioInput";
import { RiErrorWarningFill } from "react-icons/ri";

const OPTIONS = [
  { value: true, label: "Oui" },
  { value: false, label: "Non" },
];

// null = non renseigné : aucune option cochée
const ExpectedApplications = ({ value, onChange, error }) => (
  <fieldset className={`space-y-4 ${error ? "before:bg-error relative before:absolute before:inset-y-0 before:-left-3 before:w-0.5" : ""}`}>
    <legend className={`mb-4 text-base font-bold ${error ? "text-error" : ""}`}>
      Candidatures attendues
      <span className="text-error ml-1" aria-hidden="true">
        *
      </span>
    </legend>
    {OPTIONS.map((option) => (
      <RadioInput
        key={String(option.value)}
        id={`expected-applications-${option.value}`}
        name="expected-applications"
        value={String(option.value)}
        label={option.label}
        size={24}
        checked={value === option.value}
        required
        ariaDescribedby={error ? "expected-applications-error" : undefined}
        onChange={() => onChange(option.value)}
      />
    ))}
    {error && (
      <p id="expected-applications-error" className="text-error flex items-center text-sm" aria-live="polite">
        <RiErrorWarningFill className="mr-2" aria-hidden="true" />
        {error}
      </p>
    )}
  </fieldset>
);

export default ExpectedApplications;
