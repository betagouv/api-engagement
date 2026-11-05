import { useState } from "react";

import CmsBlocks, { type CmsBlocksContext } from "~/components/cms";
import { CATALOGUE_IMAGES } from "~/config/cms-catalogue";
import type { CatalogueField } from "~/services/cms-catalogue.server";
import type { CmsBlock, CmsMedia } from "~/types/cms";

type Values = Record<string, unknown>;

// Démonstration d'un bloc du CMS (catalogue /catalogue-blocs), à la manière des démos du DSFR : aperçu en direct
// et paramètres générés depuis le schéma Strapi. Rien n'est enregistré.
export default function CatalogueEditor({
  uid,
  fields,
  examples,
  context,
}: {
  uid: string;
  fields: CatalogueField[];
  examples: { label: string; block: CmsBlock }[];
  context: CmsBlocksContext;
}) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [values, setValues] = useState<Values>(examples[0].block);

  const selectExample = (index: number) => {
    setExampleIndex(index);
    setValues(examples[index].block);
  };

  return (
    <>
      <div className="fr-container">
        <h2 className="fr-h4 mb-4!">Aperçu</h2>
        {examples.length > 1 && (
          <div className="fr-select-group max-w-md mb-4!">
            <label className="fr-label" htmlFor={`${uid}-example`}>
              Variante de départ
            </label>
            <select className="fr-select" id={`${uid}-example`} value={exampleIndex} onChange={(event) => selectExample(Number(event.target.value))}>
              {examples.map(({ label }, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-y border-gray-300 py-8">
        <CmsBlocks blocks={[values as CmsBlock]} context={context} />
      </div>

      <div className="fr-container grid gap-8 py-8 lg:grid-cols-2">
        <form onSubmit={(event) => event.preventDefault()} aria-labelledby={`${uid}-params-title`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id={`${uid}-params-title`} className="fr-h4 mb-0!">
              Paramètres
            </h2>
            <button type="button" className="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-refresh-line fr-btn--icon-left" onClick={() => selectExample(exampleIndex)}>
              Réinitialiser
            </button>
          </div>
          <p className="fr-text--sm text-mention-grey!">* champ obligatoire dans Strapi</p>
          <Fields fields={fields} values={values} onChange={setValues} idPrefix={uid} />
        </form>

        <div>
          <h2 className="fr-h4">Données</h2>
          <p className="fr-text--sm text-mention-grey!">Contenu du bloc tel que plateform le reçoit du CMS.</p>
          <pre className="max-h-160 overflow-auto bg-gray-100 p-4 text-xs lg:sticky lg:top-4">{JSON.stringify(values, null, 2)}</pre>
        </div>
      </div>
    </>
  );
}

function Fields({ fields, values, onChange, idPrefix }: { fields: CatalogueField[]; values: Values; onChange: (values: Values) => void; idPrefix: string }) {
  return fields.map((field) => (
    <FieldInput key={field.name} field={field} value={values[field.name]} onChange={(value) => onChange({ ...values, [field.name]: value })} id={`${idPrefix}-${field.name}`} />
  ));
}

function FieldInput({ field, value, onChange, id }: { field: CatalogueField; value: unknown; onChange: (value: unknown) => void; id: string }) {
  const label = `${field.name}${field.required ? " *" : ""}`;
  const hint = field.description && <span className="fr-hint-text">{field.description}</span>;

  if (field.kind === "boolean") {
    return (
      <div className="fr-toggle mb-6">
        <input type="checkbox" className="fr-toggle__input" id={id} checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <label className="fr-toggle__label" htmlFor={id} data-fr-checked-label="Activé" data-fr-unchecked-label="Désactivé">
          {label}
        </label>
        {field.description && <p className="fr-hint-text">{field.description}</p>}
      </div>
    );
  }

  if (field.kind === "enumeration") {
    return (
      <div className="fr-select-group">
        <label className="fr-label" htmlFor={id}>
          {label}
          {hint}
        </label>
        <select className="fr-select" id={id} value={(value as string | null) ?? ""} onChange={(event) => onChange(event.target.value || null)}>
          {!field.required && <option value="">Aucune valeur</option>}
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === "media" && field.list) {
    const selected = (value as CmsMedia[] | null) ?? [];
    return (
      <fieldset className="mb-6">
        <legend className="fr-label mb-2">
          {label}
          {hint}
        </legend>
        {CATALOGUE_IMAGES.map(({ label: imageLabel, media }, index) => {
          const checked = selected.some((item) => item.url === media.url);
          return (
            <div key={media.url} className="fr-checkbox-group fr-checkbox-group--sm">
              <input
                type="checkbox"
                id={`${id}-${index}`}
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((item) => item.url !== media.url) : [...selected, media])}
              />
              <label className="fr-label" htmlFor={`${id}-${index}`}>
                {imageLabel}
              </label>
            </div>
          );
        })}
      </fieldset>
    );
  }

  if (field.kind === "media") {
    return (
      <div className="fr-select-group">
        <label className="fr-label" htmlFor={id}>
          {label}
          {hint}
        </label>
        <select
          className="fr-select"
          id={id}
          value={(value as CmsMedia | null)?.url ?? ""}
          onChange={(event) => onChange(CATALOGUE_IMAGES.find(({ media }) => media.url === event.target.value)?.media ?? null)}
        >
          {!field.required && <option value="">Aucune image</option>}
          {CATALOGUE_IMAGES.map(({ label: imageLabel, media }) => (
            <option key={media.url} value={media.url}>
              {imageLabel}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === "blocks") {
    return (
      <div className="fr-input-group">
        <p className="fr-label">
          {label}
          <span className="fr-hint-text">Texte riche : se modifie dans l'éditeur de Strapi, pas dans cette démo.</span>
        </p>
      </div>
    );
  }

  if (field.kind === "component") {
    const items = field.list ? ((value as Values[] | null) ?? []) : [(value as Values | null) ?? emptyItem(field.children)];
    return (
      <fieldset className="mb-6">
        <legend className="fr-label mb-2">
          {label}
          {hint}
        </legend>
        {items.map((item, index) => (
          <div key={index} className="mb-4 border border-gray-300 p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="fr-text--bold mb-0!">
                {field.itemName} {field.list && index + 1}
              </p>
              {field.list && (
                <button
                  type="button"
                  className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-delete-line fr-btn--icon-left"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Supprimer
                </button>
              )}
            </div>
            <Fields
              fields={field.children}
              values={item}
              onChange={(nextItem) => onChange(field.list ? items.map((current, itemIndex) => (itemIndex === index ? nextItem : current)) : nextItem)}
              idPrefix={`${id}-${index}`}
            />
          </div>
        ))}
        {field.list && (
          <button type="button" className="fr-btn fr-btn--secondary fr-btn--sm fr-icon-add-line fr-btn--icon-left" onClick={() => onChange([...items, emptyItem(field.children)])}>
            Ajouter : {field.itemName}
          </button>
        )}
      </fieldset>
    );
  }

  // Texte court (string) ou long (text). Un champ facultatif vidé vaut null, comme dans Strapi.
  const text = (value as string | null) ?? "";
  const onTextChange = (nextText: string) => onChange(nextText || (field.required ? "" : null));
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor={id}>
        {label}
        {hint}
      </label>
      {field.kind === "text" ? (
        <textarea className="fr-input" id={id} rows={3} value={text} onChange={(event) => onTextChange(event.target.value)} />
      ) : (
        <input className="fr-input" id={id} type="text" value={text} onChange={(event) => onTextChange(event.target.value)} />
      )}
    </div>
  );
}

// Nouvel élément d'une liste (ex. une question de plus) : valeurs par défaut du schéma, textes obligatoires pré-remplis
// pour que l'élément soit visible dans l'aperçu.
function emptyItem(fields: CatalogueField[]): Values {
  return Object.fromEntries(fields.map((field) => [field.name, emptyValue(field)]));
}

function emptyValue(field: CatalogueField): unknown {
  if (field.list) return [];
  if (field.kind === "boolean") return field.defaultValue === "true";
  if (field.kind === "enumeration") return field.defaultValue ?? (field.required ? field.options[0] : null);
  if (field.kind === "media") return field.required ? CATALOGUE_IMAGES[0].media : null;
  if (field.kind === "blocks") return [{ type: "paragraph", children: [{ type: "text", text: "Texte à rédiger dans Strapi." }] }];
  if (field.kind === "component") return emptyItem(field.children);
  return field.required ? "À compléter" : null;
}
