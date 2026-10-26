import { adaptMetabasePoints, type MetabasePoint, type MetabaseQueryResponse } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";
import { STATS_REGIONS } from "~/config/public-stats";

export type MetabaseCardResult = Pick<MetabaseQueryResponse, "data">;
export type DepartmentPoint = { code: string; nom: string; value: number };
export type QuestionAnswerRow = { question: string; answer: string; value: number };

const formatWeek = (week: string) => new Date(week).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit" });

// Les semaines (ISO) ne sont pas toujours triées par Metabase.
export function toWeeklyPoints(card: MetabaseCardResult): MetabasePoint[] {
  return adaptMetabasePoints(card)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((point) => ({ ...point, name: formatWeek(point.name) }));
}

// Colonnes de la card : code département, nom, nombre.
export function toDepartmentPoints(card: MetabaseCardResult): DepartmentPoint[] {
  return card.data.rows.map(([code, nom, value]) => ({ code: String(code), nom: String(nom), value: Number(value) || 0 }));
}

export function toAnswerRows(cardsByQuestion: [string, MetabaseCardResult | null][]): QuestionAnswerRow[] {
  return cardsByQuestion.flatMap(([question, card]) => (card ? adaptMetabasePoints(card).map((point) => ({ question, answer: point.name, value: point.value })) : []));
}

// Ordre numérique, 2A/2B entre 19 et 21, DOM après, « Non renseigné » (-) en dernier.
const departmentRank = (code: string) => (code === "-" ? Infinity : code === "2A" ? 20.1 : code === "2B" ? 20.2 : Number(code));

export const sortDepartments = (departments: DepartmentPoint[]) => [...departments].sort((a, b) => departmentRank(a.code) - departmentRank(b.code));

// Filtre territoire : variable Metabase unique (`department` ou `region`), absente pour toute la France.
export type TerritoryFilter = { department: string } | { region: string } | Record<string, never>;

// Valeur du select : « department:75 » ou « region:11 ». Toute valeur inconnue retombe sur toute la France.
export function parseTerritory(value: string | null): TerritoryFilter {
  const [kind, code] = (value ?? "").split(":");
  if (kind === "department" && code in TAXONOMY.departmentCode.values) return { department: code };
  if (kind === "region" && code in STATS_REGIONS) return { region: code };
  return {};
}
