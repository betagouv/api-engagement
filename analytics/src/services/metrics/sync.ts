import { ExportSummary } from "../../jobs/types";
import { DailyPublisherUsage } from "./cockpit";

const DAY_MS = 86_400_000;
const INITIAL_DAYS = 7;
const LOOKBACK_DAYS = 2;

export const METRICS_TABLE = "http_requests_by_publisher_total";

interface DailyMetricsSyncOptions {
  readDay: (end: Date) => Promise<DailyPublisherUsage[]>;
  getCursor: () => Promise<string | null>;
  writeDay: (date: string, rows: DailyPublisherUsage[], cursor: string, batchSize: number) => Promise<void>;
  batchSize?: number;
  now?: Date;
  summary?: ExportSummary;
}

const parseDate = (value: string): Date => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("La date de synchronisation des métriques doit être une date valide au format YYYY-MM-DD.");
  }
  return date;
};

export const syncDailyMetrics = async (options: DailyMetricsSyncOptions): Promise<ExportSummary> => {
  const start = Date.now();
  const batchSize = options.batchSize ?? 1000;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
    throw new Error("La taille des lots de métriques doit être un entier entre 1 et 10000.");
  }
  const today = parseDate((options.now ?? new Date()).toISOString().slice(0, 10)).getTime();

  // Le curseur est la borne de fin exclusive de la dernière journée validée.
  const savedCursor = await options.getCursor();
  let cursor = savedCursor ? parseDate(savedCursor).getTime() : null;
  if (cursor !== null && cursor > today) {
    throw new Error("Le curseur des métriques est dans le futur.");
  }
  let day = cursor !== null ? cursor - LOOKBACK_DAYS * DAY_MS : today - INITIAL_DAYS * DAY_MS;
  const summary = options.summary ?? { processed: 0, written: 0, skipped: 0, errors: 0, durationMs: 0 };

  while (day < today) {
    const date = new Date(day).toISOString().slice(0, 10);
    const end = new Date(day + DAY_MS);
    const rows = await options.readDay(end);
    summary.processed += rows.length;
    const nextCursor = Math.max(cursor ?? end.getTime(), end.getTime());
    // Une journée vide est validée sans inventer de lignes à zéro.
    await options.writeDay(date, rows, new Date(nextCursor).toISOString().slice(0, 10), batchSize);
    cursor = nextCursor;
    summary.written += rows.length;
    console.log(`[Export Metrics] ${date} : ${rows.length} lignes synchronisées.`);
    day += DAY_MS;
  }

  summary.durationMs = Date.now() - start;
  return summary;
};
