import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";

type SearchResponse = {
  data: Array<{ _id?: string; id?: string }>;
  total: number;
};

type Options = {
  apiUrl: string;
  delayMs: number;
  maxPages: number;
  pageSize: number;
  widgetIds: string[];
};

const parsePositiveInteger = (value: string | undefined, option: string, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer`);
  }
  return parsed;
};

const getOptions = (): Options => {
  const args = process.argv.slice(2);
  const valueFor = (option: string): string | undefined => {
    const index = args.indexOf(option);
    return index === -1 ? undefined : args[index + 1];
  };

  const widgetIds = args.flatMap((argument, index) => (argument === "--widget-id" && args[index + 1] ? [args[index + 1]] : []));

  return {
    apiUrl: valueFor("--api-url") ?? process.env.API_URL ?? "https://api.api-engagement-dev.fr",
    delayMs: parsePositiveInteger(valueFor("--delay-ms"), "--delay-ms", 800),
    maxPages: parsePositiveInteger(valueFor("--max-pages"), "--max-pages", 10),
    pageSize: parsePositiveInteger(valueFor("--page-size"), "--page-size", 25),
    widgetIds,
  };
};

const wait = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs));

const fetchSearch = async (apiUrl: string, path: string, from: number, size: number): Promise<SearchResponse> => {
  const response = await fetch(`${apiUrl}${path}?${new URLSearchParams({ from: String(from), size: String(size) })}`);
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { ok?: boolean; data?: SearchResponse["data"]; total?: number };
  if (!payload.ok || !payload.data || payload.total === undefined) {
    throw new Error(`${path}: invalid response`);
  }
  return { data: payload.data, total: payload.total };
};

const missionIds = (data: SearchResponse["data"]): string[] => data.map((mission) => mission._id ?? mission.id).filter((id): id is string => Boolean(id));

const compareWidget = async (widget: { id: string; name: string | null }, options: Options): Promise<"same" | "different"> => {
  const iframePath = `/iframe/${widget.id}/search`;
  const browsePath = `/missions/browse/widget/${widget.id}`;
  let iframeTotal = 0;
  let browseTotal = 0;
  const iframeIds: string[] = [];
  const browseIds: string[] = [];
  let pagesCompared = 0;

  for (let page = 0; page < options.maxPages; page += 1) {
    const from = page * options.pageSize;
    const iframe = await fetchSearch(options.apiUrl, iframePath, from, options.pageSize);
    await wait(options.delayMs);
    const browse = await fetchSearch(options.apiUrl, browsePath, from, options.pageSize);

    iframeTotal = iframe.total;
    browseTotal = browse.total;
    iframeIds.push(...missionIds(iframe.data));
    browseIds.push(...missionIds(browse.data));
    pagesCompared += 1;

    if (iframe.data.length < options.pageSize && browse.data.length < options.pageSize) {
      break;
    }
  }

  const mismatchPosition = iframeIds.findIndex((id, index) => id !== browseIds[index]);
  const same = iframeTotal === browseTotal && mismatchPosition === -1 && iframeIds.length === browseIds.length;
  const label = widget.name ?? "Sans nom";

  if (same) {
    console.log(`[compare-widget-browse] OK ${label} (${widget.id}) : ${iframeTotal} missions, ${pagesCompared} page(s) comparée(s)`);
    return "same";
  }

  const iframeOnlyIds = iframeIds.filter((id) => !browseIds.includes(id));
  const details =
    mismatchPosition === -1
      ? "mêmes positions comparées"
      : `position ${mismatchPosition}: iframe=${iframeIds[mismatchPosition] ?? "absent"}, browse=${browseIds[mismatchPosition] ?? "absent"}`;
  console.log(`[compare-widget-browse] DIFF ${label} (${widget.id}) : iframe=${iframeTotal}, browse=${browseTotal}, ${pagesCompared} page(s) comparée(s), ${details}`);
  if (iframeOnlyIds.length > 0) {
    console.log(`[compare-widget-browse] iframe uniquement (${iframeOnlyIds.length}) : ${iframeOnlyIds.join(", ")}`);
  }
  return "different";
};

const main = async () => {
  const options = getOptions();
  const widgets = await prisma.widget.findMany({
    where: {
      active: true,
      deletedAt: null,
      ...(options.widgetIds.length ? { id: { in: options.widgetIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  console.log(`[compare-widget-browse] ${widgets.length} widget(s), API=${options.apiUrl}, pageSize=${options.pageSize}, maxPages=${options.maxPages}`);

  let identical = 0;
  let different = 0;
  let errors = 0;
  for (const widget of widgets) {
    try {
      const result = await compareWidget(widget, options);
      if (result === "same") {
        identical += 1;
      } else {
        different += 1;
      }
    } catch (error) {
      errors += 1;
      console.error(`[compare-widget-browse] ERREUR ${widget.name ?? "Sans nom"} (${widget.id}) : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`[compare-widget-browse] terminé : ${identical} identiques, ${different} différence(s), ${errors} erreur(s)`);
  process.exitCode = different || errors ? 1 : 0;
};

main()
  .catch((error) => {
    console.error(`[compare-widget-browse] ERREUR : ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
