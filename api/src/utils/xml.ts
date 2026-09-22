import { XMLBuilder } from "fast-xml-parser";

/**
 * Construit un flux XML `<source>…</source>` à partir d'un objet déjà structuré.
 * Toute valeur texte dont la clé figure dans `cdataKeys` est encapsulée en CDATA, à n'importe
 * quel niveau de l'arbre (jobs, sous-objets, tableaux de chaînes).
 */
export function buildFeedXml(source: Record<string, unknown>, cdataKeys: string[]): string {
  const wrapWithCdata = (value: unknown, parentKey?: string): unknown => {
    if (Array.isArray(value)) {
      if (parentKey && cdataKeys.includes(parentKey)) {
        return value.map((el) => (typeof el === "string" ? { "#cdata": el } : wrapWithCdata(el)));
      }
      return value.map((el) => wrapWithCdata(el));
    }
    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value)) {
        if (cdataKeys.includes(key) && typeof child === "string") {
          result[key] = { "#cdata": child };
        } else if (Array.isArray(child) || (child && typeof child === "object")) {
          result[key] = wrapWithCdata(child, key);
        } else {
          result[key] = child;
        }
      }
      return result;
    }
    return value;
  };

  const builder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true, cdataPropName: "#cdata" });
  return builder.build({ source: wrapWithCdata(source) });
}
