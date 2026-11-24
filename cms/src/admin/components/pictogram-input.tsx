import { Combobox, ComboboxOption, Field } from "@strapi/design-system";
import { forwardRef } from "react";

// Pictogrammes DSFR proposés (valeur = nom du pictogramme).
export const PICTOGRAMS = [
  "accessibility",
  "airport",
  "application",
  "archive",
  "army_tank",
  "art",
  "astronaut",
  "audio",
  "avatar",
  "backpack",
  "base",
  "binders",
  "book",
  "calendar",
  "catalog",
  "city_hall",
  "coding",
  "community",
  "companie",
  "compass",
  "conclusion",
  "connection_lost",
  "contract",
  "culture",
  "data_visualization",
  "digital_art",
  "doctor",
  "document",
  "document_add",
  "document_download",
  "document_search",
  "document_signature",
  "driving_licence",
  "driving_license_new",
  "ear_off",
  "ecosystem",
  "environment",
  "error",
  "eye_off",
  "factory",
  "firefighter",
  "flow_list",
  "flow_settings",
  "food",
  "gendarmerie",
  "grocery",
  "health",
  "hospital",
  "house",
  "human_cooperation",
  "in_progress",
  "information",
  "innovation",
  "international_driving_license",
  "international_driving_license_new",
  "internet",
  "justice",
  "language",
  "leaf",
  "location_france",
  "location_overseas_france",
  "luggage",
  "mail_send",
  "map",
  "map_pin",
  "medical_research",
  "mental_disabilities",
  "money",
  "moon",
  "mountain",
  "national_identity_card",
  "national_identity_card_passport",
  "navy_anchor",
  "navy_bachi",
  "notification",
  "nuclear_plant",
  "padlock",
  "paint",
  "passport",
  "pictures",
  "podcast",
  "police",
  "presse_card",
  "school",
  "search",
  "self_training",
  "sign_document",
  "smartphone",
  "success",
  "sun",
  "system",
  "tax_stamp",
  "technical_error",
  "travel_back",
  "tree",
  "vaccine",
  "vehicle_registration",
  "video",
  "video_games",
  "virus",
  "warning",
  "wheelchair",
];

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
