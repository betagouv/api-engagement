/**
 * generate-changelog.ts
 *
 * Génère et publie le changelog d'un tag de release :
 *  1. Liste les commits depuis le tag précédent (toutes les apps confondues)
 *  2. Récupère les PRs associées via GitHub API
 *  3. Extrait le contenu des tickets Notion (ou le body de la PR en fallback)
 *  4. Synthétise l'impact pour un public non-tech via Claude
 *  5. Crée une entrée dans la Notion changelog DB
 *  6. Publie sur Slack
 *
 * Usage :
 *   # Mode tag (production / CI) — range auto depuis le tag précédent
 *   npx ts-node generate-changelog.ts --tag v1.2.3
 *
 *   # Mode range explicite (dev / test sans tag git)
 *   npx ts-node generate-changelog.ts --from abc1234 [--to HEAD]
 *
 *   # Combiné : range explicite + label personnalisé
 *   npx ts-node generate-changelog.ts --tag v1.2.3 --from abc1234 [--to def5678]
 *
 * Variables d'environnement requises :
 *   GITHUB_TOKEN, NOTION_API_KEY, NOTION_CHANGELOG_DATABASE_ID,
 *   OPENAI_API_KEY, SLACK_TOKEN, SLACK_RELEASE_CHANNEL_ID
 */

import * as dotenv from "dotenv";
dotenv.config(); // Charge scripts/.env si présent (ignoré en CI où les vars sont injectées)

import { execSync } from "child_process";
import OpenAI from "openai";
import { Client as NotionClient } from "@notionhq/client";

// ---------------------------------------------------------------------------
// ⚙️  Configuration Notion DB — adapter aux noms réels de vos propriétés
// ---------------------------------------------------------------------------
const NOTION_DB_FIELDS = {
  version: "Version", // Propriété de type Title
  date: "Date",       // Propriété de type Date
} as const;

const GITHUB_REPO = "betagouv/api-engagement";

// ---------------------------------------------------------------------------
// ⚙️  Apps connues — ordre d'affichage et décorateurs Slack
// ---------------------------------------------------------------------------
const APPS = [
  { scope: "app",       label: "Tableau de bord", decorator: "——" },
  { scope: "api",       label: "API",              decorator: "—"  },
  { scope: "widget",    label: "Widget",           decorator: "—"  },
  { scope: "analytics", label: "Analytics",        decorator: "·"  },
] as const;

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------
interface Commit {
  sha: string;
  message: string;
  /** Scope du conventional commit (ex: "api", "app", "widget", "analytics"), ou null */
  scope: string | null;
}

interface ChangelogSection {
  app: string;
  bullets: string[];
}

interface PR {
  number: number;
  title: string;
  body: string;
  url: string;
  notionLinks: string[];
}

interface PRContext {
  pr: PR;
  /** Contenu Notion si trouvé, sinon null → fallback sur pr.body */
  notionContent: string | null;
}

// ---------------------------------------------------------------------------
// Lecture des variables d'environnement
// ---------------------------------------------------------------------------
const {
  GITHUB_TOKEN,
  NOTION_API_KEY,
  NOTION_CHANGELOG_DATABASE_ID,
  OPENAI_API_KEY,
  SLACK_TOKEN,
  SLACK_RELEASE_CHANNEL_ID,
} = process.env;

function validateEnv(): void {
  const missing = [
    "GITHUB_TOKEN",
    "NOTION_API_KEY",
    "NOTION_CHANGELOG_DATABASE_ID",
    "OPENAI_API_KEY",
    "SLACK_TOKEN",
    "SLACK_RELEASE_CHANNEL_ID",
  ].filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes : ${missing.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Parsing des arguments
// ---------------------------------------------------------------------------
interface Args {
  /** Label utilisé dans le titre Notion et le message Slack */
  label: string;
  /** Borne de début (exclusive). null = depuis le tout premier commit */
  from: string | null;
  /** Borne de fin (inclusive) */
  to: string;
}

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function parseArgs(): Args {
  const tag = arg("--tag");
  const from = arg("--from") ?? null;
  const to = arg("--to");

  if (!tag && !from) {
    throw new Error(
      "Usage :\n" +
        "  --tag v1.2.3                        (mode production)\n" +
        "  --from <sha> [--to <sha|HEAD>]      (mode test)\n" +
        "  --tag v1.2.3 --from <sha> [--to …]  (combiné)",
    );
  }

  if (from) {
    // Mode range explicite : --from [--to] [--tag]
    const today = new Date().toISOString().split("T")[0];
    return {
      label: tag ?? `dev-${today}`,
      from,
      to: to ?? "HEAD",
    };
  }

  // Mode tag seul : range auto depuis le tag précédent
  return {
    label: tag!,
    from: findPreviousTag(tag!),
    to: tag!,
  };
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------
function findPreviousTag(currentTag: string): string | null {
  try {
    const tags = execSync("git tag --sort=-version:refname")
      .toString()
      .trim()
      .split("\n")
      .filter((t) => /^v\d/.test(t));

    const currentIdx = tags.indexOf(currentTag);
    if (currentIdx === -1) return tags[0] ?? null;
    return tags[currentIdx + 1] ?? null;
  } catch {
    return null;
  }
}

function getCommits(from: string | null, to: string): Commit[] {
  const range = from ? `${from}..${to}` : to;
  const output = execSync(`git log ${range} --no-merges --format="%H %s"`)
    .toString()
    .trim();

  if (!output) return [];
  return output.split("\n").map((line) => {
    const spaceIdx = line.indexOf(" ");
    const message = line.substring(spaceIdx + 1);
    const scopeMatch = message.match(/^\w+\(([^)]+)\):/);
    return {
      sha: line.substring(0, spaceIdx),
      message,
      scope: scopeMatch?.[1]?.toLowerCase() ?? null,
    };
  });
}

function getPeriod(from: string | null, to: string): { start: string; end: string } {
  const range = from ? `${from}..${to}` : to;
  try {
    const dates = execSync(`git log ${range} --no-merges --format="%as"`)
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return { start: "?", end: "?" };
    const fmt = (iso: string) => {
      const [, m, d] = iso.split("-");
      return `${d}/${m}`;
    };
    return { start: fmt(dates[0]), end: fmt(dates[dates.length - 1]) };
  } catch {
    return { start: "?", end: "?" };
  }
}

// ---------------------------------------------------------------------------
// GitHub API
// ---------------------------------------------------------------------------
async function getPRsForCommit(sha: string): Promise<PR[]> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits/${sha}/pulls`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!response.ok) return [];

  const data = (await response.json()) as Array<{
    number: number;
    title: string;
    body: string | null;
    html_url: string;
  }>;

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    body: pr.body ?? "",
    url: pr.html_url,
    notionLinks: extractNotionLinks(pr.body ?? ""),
  }));
}

// ---------------------------------------------------------------------------
// Notion helpers
// ---------------------------------------------------------------------------
function extractNotionLinks(text: string): string[] {
  const regex = /https:\/\/(?:www\.)?notion\.so\/[^\s)>\]"]+/g;
  return [...new Set(text.match(regex) ?? [])];
}

function extractNotionPageId(url: string): string | null {
  // UUID avec tirets
  const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:[?#]|$)/);
  if (uuidMatch) return uuidMatch[1].replace(/-/g, "");
  // 32 hex chars sans tirets
  const hexMatch = url.match(/([a-f0-9]{32})(?:[?#]|$)/);
  if (hexMatch) return hexMatch[1];
  return null;
}

function toNotionUUID(id: string): string {
  const c = id.replace(/-/g, "");
  return `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function richTextToString(richText: any[]): string {
  return (richText ?? []).map((r: { plain_text: string }) => r.plain_text).join("");
}

async function fetchNotionPageContent(url: string, notion: NotionClient): Promise<string | null> {
  try {
    const rawId = extractNotionPageId(url);
    if (!rawId) return null;
    const pageId = toNotionUUID(rawId);

    const page = await notion.pages.retrieve({ page_id: pageId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (page as any).properties as Record<string, any>;
    const titleProp = Object.values(props).find((p) => p.type === "title");
    const title = titleProp ? richTextToString(titleProp.title) : "(sans titre)";

    const blocksResponse = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 50,
    });

    const textTypes = [
      "paragraph",
      "heading_1",
      "heading_2",
      "heading_3",
      "bulleted_list_item",
      "numbered_list_item",
      "quote",
      "callout",
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (blocksResponse.results as any[])
      .map((block) => {
        if (textTypes.includes(block.type)) {
          return richTextToString(block[block.type]?.rich_text ?? []);
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

    return `# ${title}\n${content}`;
  } catch (err) {
    console.warn(`  ⚠️  Impossible de récupérer la page Notion ${url} : ${err}`);
    return null;
  }
}

async function getContextsForPRs(prs: PR[], notion: NotionClient): Promise<PRContext[]> {
  return Promise.all(
    prs.map(async (pr) => {
      if (pr.notionLinks.length > 0) {
        const notionContent = await fetchNotionPageContent(pr.notionLinks[0], notion);
        return { pr, notionContent };
      }
      return { pr, notionContent: null };
    }),
  );
}

// ---------------------------------------------------------------------------
// OpenAI LLM
// ---------------------------------------------------------------------------
async function synthesizeWithOpenAI(
  tag: string,
  commits: Commit[],
  contexts: PRContext[],
  openai: OpenAI,
): Promise<ChangelogSection[]> {
  const appLabels = APPS.map((a) => `"${a.label}" (scope: ${a.scope})`).join(", ");

  const commitList = commits
    .map((c) => `- [scope:${c.scope ?? "?"}] ${c.message}`)
    .join("\n");

  const prContext = contexts
    .map(({ pr, notionContent }) => {
      const source = notionContent ?? pr.body;
      return `### PR #${pr.number} : ${pr.title}\n${source || "(pas de description)"}`;
    })
    .join("\n\n");

  const prompt = `Tu rédiges le changelog de la version ${tag} d'"API Engagement" \
(plateforme de mise en relation bénévoles / associations).

Apps connues : ${appLabels}.
Chaque commit est préfixé par son scope entre crochets pour t'aider à le rattacher à la bonne app.

Commits de cette version :
${commitList}

Contexte (tickets et descriptions de PRs) :
${prContext || "(aucun contexte disponible)"}

Règles :
- Groupe les changements par app (uniquement les apps qui ont des changements visibles)
- Un bullet par changement fonctionnel visible par l'utilisateur
- Ignore les commits purement techniques (refacto, CI, tests, dépendances, typo) sauf impact concret
- Phrase courte, verbe d'action, pas de jargon technique
- Public cible : équipe non-tech (direction, partenaires)
- Langue : français
- Ordre des apps : Tableau de bord, API, Widget, Analytics

Réponds UNIQUEMENT avec un objet JSON de la forme :
{"sections": [{"app": "Tableau de bord", "bullets": ["..."]}, {"app": "API", "bullets": ["..."]}]}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Réponse OpenAI inattendue");

  const parsed = JSON.parse(text) as { sections: ChangelogSection[] };
  return parsed.sections ?? [];
}

// ---------------------------------------------------------------------------
// Notion DB entry
// ---------------------------------------------------------------------------
async function createNotionEntry(
  tag: string,
  sections: ChangelogSection[],
  contexts: PRContext[],
  notion: NotionClient,
): Promise<{ url: string }> {
  const ticketUrls = contexts.flatMap((c) => c.pr.notionLinks).slice(0, 10);
  const today = new Date().toISOString().split("T")[0];

  // Construire les vrais blocs Notion (heading_2 + bulleted_list_item)
  // pour éviter d'afficher du markdown brut (les # et * seraient visibles tels quels)
  type NotionBlock =
    | { object: "block"; type: "heading_2"; heading_2: { rich_text: [{ text: { content: string } }] } }
    | { object: "block"; type: "bulleted_list_item"; bulleted_list_item: { rich_text: [{ text: { content: string } }] } }
    | { object: "block"; type: "paragraph"; paragraph: { rich_text: [{ text: { content: string } }] } };

  const contentBlocks: NotionBlock[] = sections.flatMap((section) => [
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: { rich_text: [{ text: { content: section.app } }] },
    },
    ...section.bullets.map((bullet) => ({
      object: "block" as const,
      type: "bulleted_list_item" as const,
      bulleted_list_item: { rich_text: [{ text: { content: bullet } }] },
    })),
  ]);

  const ticketBlock: NotionBlock[] = ticketUrls.length > 0
    ? [{
        object: "block" as const,
        type: "paragraph" as const,
        paragraph: { rich_text: [{ text: { content: `Tickets liés : ${ticketUrls.join(", ")}` } }] },
      }]
    : [];

  const page = await notion.pages.create({
    parent: { database_id: NOTION_CHANGELOG_DATABASE_ID! },
    properties: {
      [NOTION_DB_FIELDS.version]: {
        title: [{ text: { content: tag } }],
      },
      [NOTION_DB_FIELDS.date]: {
        date: { start: today },
      },
    },
    children: [...contentBlocks, ...ticketBlock],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageId = (page as any).id as string;
  return { url: `https://notion.so/${pageId.replace(/-/g, "")}` };
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------
function buildSlackMessage(
  sections: ChangelogSection[],
  period: { start: string; end: string },
  prCount: number,
  notionUrl: string,
): string {
  const appDecoratorMap = Object.fromEntries(APPS.map((a) => [a.label, a.decorator]));

  const body = sections
    .map((section) => {
      const decorator = appDecoratorMap[section.app] ?? "—";
      const bullets = section.bullets.map((b) => `• ${b}`).join("\n");
      return `${decorator}   ${section.app}\n${bullets}`;
    })
    .join("\n\n");

  return [
    `*Résumé de MEP*`,
    `Période : ${period.start} → ${period.end}  |  ${prCount} PR mergées.`,
    "",
    body,
    "",
    `📋 Voir le changelog complet : ${notionUrl}`,
  ].join("\n");
}

async function postToSlack(
  tag: string,
  sections: ChangelogSection[],
  period: { start: string; end: string },
  prCount: number,
  notionUrl: string,
): Promise<void> {
  const text = buildSlackMessage(sections, period, prCount, notionUrl);

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: SLACK_RELEASE_CHANNEL_ID,
      text,
      unfurl_links: false,
    }),
  });

  const data = (await response.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack API error : ${data.error}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  validateEnv();

  const args = parseArgs();
  console.log(`\n📋 Génération du changelog pour "${args.label}"...`);
  console.log(`📌 Range : ${args.from ?? "(début du repo)"}..${args.to}`);

  const notion = new NotionClient({ auth: NOTION_API_KEY });
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // 1. Commits
  const commits = getCommits(args.from, args.to);
  console.log(`✅ ${commits.length} commit(s) trouvé(s)`);
  if (commits.length === 0) {
    console.log("Aucun commit à traiter, arrêt.");
    return;
  }

  // 3. PRs associées
  console.log("🔍 Récupération des PRs depuis GitHub...");
  const prsByCommit = await Promise.all(commits.map((c) => getPRsForCommit(c.sha)));
  const prMap = new Map<number, PR>();
  prsByCommit.flat().forEach((pr) => prMap.set(pr.number, pr));
  const prs = [...prMap.values()];
  console.log(`✅ ${prs.length} PR(s) associée(s)`);

  // 4. Contexte Notion / PR body
  console.log("📚 Récupération du contenu Notion...");
  const contexts = await getContextsForPRs(prs, notion);
  const notionCount = contexts.filter((c) => c.notionContent !== null).length;
  console.log(`✅ ${notionCount}/${prs.length} PR(s) avec ticket Notion`);

  // 5. Période
  const period = getPeriod(args.from, args.to);
  console.log(`📅 Période : ${period.start} → ${period.end}`);

  // 6. Synthèse OpenAI
  console.log("🤖 Synthèse avec OpenAI...");
  const sections = await synthesizeWithOpenAI(args.label, commits, contexts, openai);
  sections.forEach((s) => {
    console.log(`\n  ${s.app} (${s.bullets.length} point(s))`);
    s.bullets.forEach((b) => console.log(`    • ${b}`));
  });
  console.log();

  // 7. Entrée Notion
  console.log("📝 Création de l'entrée Notion...");
  const notionPage = await createNotionEntry(args.label, sections, contexts, notion);
  console.log(`✅ Page Notion créée : ${notionPage.url}`);

  // 8. Publication Slack
  console.log("💬 Publication sur Slack...");
  await postToSlack(args.label, sections, period, prs.length, notionPage.url);
  console.log("✅ Publié sur Slack");

  console.log(`\n🎉 Changelog "${args.label}" publié avec succès !`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
