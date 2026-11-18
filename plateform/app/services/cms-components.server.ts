// Schémas Strapi (cms/src/components), source de vérité des champs : lus au build, jamais envoyés tels quels au navigateur.
type StrapiAttribute = {
  type: string;
  required?: boolean;
  repeatable?: boolean;
  multiple?: boolean;
  component?: string;
  enum?: string[];
  default?: string | boolean | number;
  min?: number;
  max?: number;
  description?: string;
};
type StrapiComponent = { info: { displayName: string; description?: string }; attributes: Record<string, StrapiAttribute> };

const SCHEMAS = import.meta.glob<StrapiComponent>("../../../cms/src/components/*/*.json", { eager: true, import: "default" });

export type CmsComponentField = {
  name: string;
  // Type Strapi, pour choisir le contrôle du formulaire : string, text, enumeration, boolean, media, blocks, component.
  kind: string;
  // Composant répétable ou média multiple : la valeur est une liste.
  list: boolean;
  // Libellé lisible du type (ex. « Liste de « Question » (min 1) »).
  typeLabel: string;
  // Nom du composant imbriqué (ex. « Question »).
  itemName: string | null;
  required: boolean;
  options: string[];
  defaultValue: string | null;
  description: string | null;
  // Champs d'un composant imbriqué (ex. les questions d'une FAQ).
  children: CmsComponentField[];
};

export type CmsComponentSchema = { displayName: string; description: string | null; fields: CmsComponentField[] };

const getSchema = (uid: string) => {
  const [category, name] = uid.split(".");
  return SCHEMAS[`../../../cms/src/components/${category}/${name}.json`];
};

const describeType = (attribute: StrapiAttribute) => {
  if (attribute.type === "component") {
    const displayName = getSchema(attribute.component!)?.info.displayName ?? attribute.component!;
    if (!attribute.repeatable) return displayName;
    const bounds = [attribute.min !== undefined && `min ${attribute.min}`, attribute.max !== undefined && `max ${attribute.max}`].filter(Boolean).join(", ");
    return `Liste de « ${displayName} »${bounds ? ` (${bounds})` : ""}`;
  }
  if (attribute.type === "media") return attribute.multiple ? "Images" : "Image";
  if (attribute.type === "blocks") return "Texte riche";
  if (attribute.type === "text") return "Texte long";
  if (attribute.type === "string") return "Texte court";
  if (attribute.type === "boolean") return "Oui / non";
  if (attribute.type === "enumeration") return "Liste de choix";
  return attribute.type;
};

const toFields = (schema: StrapiComponent): CmsComponentField[] =>
  Object.entries(schema.attributes).map(([name, attribute]) => {
    const child = attribute.type === "component" ? getSchema(attribute.component!) : undefined;
    return {
      name,
      kind: attribute.type,
      list: Boolean(attribute.repeatable || attribute.multiple),
      typeLabel: describeType(attribute),
      itemName: child?.info.displayName ?? null,
      required: Boolean(attribute.required),
      options: attribute.enum ?? [],
      defaultValue: attribute.default === undefined ? null : String(attribute.default),
      description: attribute.description ?? null,
      children: child ? toFields(child) : [],
    };
  });

export const getBlockSchema = (uid: string): CmsComponentSchema | null => {
  const schema = getSchema(uid);
  if (!schema) return null;
  return { displayName: schema.info.displayName, description: schema.info.description ?? null, fields: toFields(schema) };
};

// Strapi n'impose les champs obligatoires qu'à la publication : un brouillon peut en contenir de vides (null), que les composants
// lisent sans garde (`image.url`, `points.split`). D'après les schémas, on écarte le bloc (ou l'élément de liste) dont un champ
// obligatoire est vide, pour que l'aperçu reste affichable pendant la rédaction : un bloc à moitié rédigé n'apparaît qu'une fois complet.
type Unit = Record<string, unknown>;

const isFilled = (value: unknown) => value !== null && value !== undefined && value !== "";

const isComplete = (schema: StrapiComponent, unit: Unit) => Object.entries(schema.attributes).every(([name, attribute]) => !attribute.required || isFilled(unit[name]));

function cleanUnit(schema: StrapiComponent, unit: Unit): Unit {
  const cleaned = { ...unit };
  for (const [name, attribute] of Object.entries(schema.attributes)) {
    const items = unit[name];
    const child = attribute.type === "component" && Array.isArray(items) ? getSchema(attribute.component!) : undefined;
    if (child) cleaned[name] = (items as Unit[]).filter((item) => isComplete(child, item)).map((item) => cleanUnit(child, item));
  }
  return cleaned;
}

export function dropIncomplete<T extends { __component: string }>(blocks: T[]): T[] {
  return blocks.flatMap((block) => {
    const schema = getSchema(block.__component);
    if (!schema) return [block];
    return isComplete(schema, block) ? [cleanUnit(schema, block) as T] : [];
  });
}
