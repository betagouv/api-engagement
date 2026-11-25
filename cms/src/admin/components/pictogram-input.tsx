import { Combobox, ComboboxOption, Field } from "@strapi/design-system";
import { forwardRef } from "react";

// Pictogrammes DSFR proposés, lus dans le paquet @gouvfr/dsfr (nouvelle version du DSFR = nouveaux choix sans code ici).
// Valeur = nom du fichier, tirets remplacés par des underscores (`self-training.svg` → `self_training`), comme plateform/app/components/cms/pictograms.ts.
const FILES = (import.meta as unknown as { glob: (pattern: string) => Record<string, unknown> }).glob("/node_modules/@gouvfr/dsfr/dist/artwork/pictograms/*/*.svg");
export const PICTOGRAMS = [...new Set(Object.keys(FILES).map((file) => file.split("/").pop()!.replace(".svg", "").replaceAll("-", "_")))].sort();

type Props = {
  name: string;
  value?: string | null;
  onChange: (event: { target: { name: string; value: string | null; type: string } }) => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

// Champ pictogramme : liste déroulante avec saisie pour filtrer (la liste compte une centaine d'entrées).
const PictogramInput = forwardRef<HTMLInputElement, Props>(({ name, value, onChange, label, hint, error, required, disabled }, ref) => (
  <Field.Root name={name} error={error} hint={hint} required={required}>
    <Field.Label>{label}</Field.Label>
    <Combobox
      ref={ref}
      placeholder="Rechercher un pictogramme…"
      value={value ?? undefined}
      disabled={disabled}
      onChange={(next?: string) => onChange({ target: { name, value: next ?? null, type: "string" } })}
    >
      {PICTOGRAMS.map((pictogram) => (
        <ComboboxOption key={pictogram} value={pictogram}>
          {pictogram}
        </ComboboxOption>
      ))}
    </Combobox>
    <Field.Hint />
    <Field.Error />
  </Field.Root>
));

export default PictogramInput;
