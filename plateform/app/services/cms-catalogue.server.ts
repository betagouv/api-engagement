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

export type CatalogueField = {
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
  children: CatalogueField[];
};

export type CatalogueSchema = { displayName: string; description: string | null; fields: CatalogueField[] };

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

const toFields = (schema: StrapiComponent): CatalogueField[] =>
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

export const getBlockSchema = (uid: string): CatalogueSchema | null => {
  const schema = getSchema(uid);
  if (!schema) return null;
  return { displayName: schema.info.displayName, description: schema.info.description ?? null, fields: toFields(schema) };
};
