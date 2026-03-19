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
 *   npx ts-node generate-changelog.ts --tag v1.2.3 [--dry-run]
 *
 * Variables d'environnement requises :
 *   GITHUB_TOKEN, NOTION_API_KEY, NOTION_CHANGELOG_DATABASE_ID,
 *   OPENAI_API_KEY, SLACK_TOKEN, SLACK_RELEASE_CHANNEL_ID
 */

import * as dotenv from "dotenv";
dotenv.config(); // Charge scripts/.env si présent (ignoré en CI où les vars sont injectées)

import { Client as NotionClient } from "@notionhq/client";
import { execSync } from "child_process";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// ⚙️  Configuration Notion DB — adapter aux noms réels de vos propriétés
// ---------------------------------------------------------------------------
const NOTION_DB_FIELDS = {
  tag:      "Tag",          // Propriété de type Title
  codeName: "Nom de code",  // Propriété de type rich_text
  date:     "Date",         // Propriété de type Date
} as const;

// Champs des tickets sources (liés aux PRs)
const NOTION_TICKET_FIELDS = {
  deliveredVersion: "Version livrée", // Relation vers la DB changelog
} as const;

// ---------------------------------------------------------------------------
// ⚙️  Thème des noms de code — modifier uniquement ici pour changer de thème
// ---------------------------------------------------------------------------
const CODE_NAME_THEME = {
  description: "prénoms traditionnels Francs (mérovingiens et carolingiens)",
  examples: "Clovis, Pépin, Dagobert, Childebert, Caribert, Mérovée, Sigebert, Gontran, Thierry, Chilpéric",
} as const;

const GITHUB_REPO = "betagouv/api-engagement";

// ---------------------------------------------------------------------------
// ⚙️  Apps connues — ordre d'affichage et décorateurs Slack
// ---------------------------------------------------------------------------
const APPS = [
  { scope: "app", label: "Tableau de bord", decorator: "——" },
  { scope: "api", label: "API", decorator: "—" },
  { scope: "widget", label: "Widget", decorator: "—" },
  { scope: "analytics", label: "Analytics", decorator: "·" },
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

interface ChangelogResult {
  /** Résumé global de la release (bullets courts, non-tech) */
  impact: string[];
  /** Détail par app */
  sections: ChangelogSection[];
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
const { GITHUB_TOKEN, NOTION_API_KEY, NOTION_CHANGELOG_DATABASE_ID, OPENAI_API_KEY, SLACK_TOKEN, SLACK_RELEASE_CHANNEL_ID } = process.env;

function validateEnv(): void {
  const missing = ["GITHUB_TOKEN", "NOTION_API_KEY", "NOTION_CHANGELOG_DATABASE_ID", "OPENAI_API_KEY", "SLACK_TOKEN", "SLACK_RELEASE_CHANNEL_ID"].filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes : ${missing.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Parsing des arguments
// ---------------------------------------------------------------------------
interface Args {
  tag: string;
  /** Si true, n'écrit pas dans Notion ni Slack — affiche le contenu dans le terminal */
  dryRun: boolean;
}

function parseArgs(): Args {
  const idx = process.argv.indexOf("--tag");
  const tag = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!tag) throw new Error("Usage : npx ts-node generate-changelog.ts --tag v1.2.3 [--dry-run]");
  return { tag, dryRun: process.argv.includes("--dry-run") };
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------
function tagExists(tag: string): boolean {
  try {
    execSync(`git rev-parse --verify ${tag}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

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
  const output = execSync(`git log ${range} --no-merges --format="%H %s"`).toString().trim();

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
    const dates = execSync(`git log ${range} --no-merges --format="%as"`).toString().trim().split("\n").filter(Boolean).sort();
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
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/${sha}/pulls`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
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

    const textTypes = ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "quote", "callout"];

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
    })
  );
}

// ---------------------------------------------------------------------------
// OpenAI LLM
// ---------------------------------------------------------------------------
async function synthesizeWithOpenAI(tag: string, commits: Commit[], contexts: PRContext[], openai: OpenAI): Promise<ChangelogResult> {
  const appLabels = APPS.map((a) => `"${a.label}" (scope: ${a.scope})`).join(", ");

  const commitList = commits.map((c) => `- [scope:${c.scope ?? "?"}] ${c.message}`).join("\n");

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

Règles communes :
- Ignore les commits purement techniques (refacto, CI, tests, dépendances, typo) sauf impact concret
- Phrase courte, verbe d'action, sans jargon technique
- Public cible : équipe globalement non-tech (direction, partenaires)
- Langue : français

Section "impact" :
- 2 à 4 bullets résumant les grandes orientations de la release (cross-app, vue d'ensemble)
- Mettre en avant la valeur pour les utilisateurs finaux et partenaires

Section "sections" :
- Un bullet par changement fonctionnel visible par l'utilisateur, groupé par app
- N'inclure que les apps qui ont des changements visibles
- Ordre des apps : Tableau de bord, API, Widget, Analytics

Réponds UNIQUEMENT avec un objet JSON de la forme :
{
  "impact": ["bullet résumé 1", "bullet résumé 2"],
  "sections": [{"app": "Tableau de bord", "bullets": ["..."]}, {"app": "API", "bullets": ["..."]}]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Réponse OpenAI inattendue");

  const parsed = JSON.parse(text) as { impact?: string[]; sections?: ChangelogSection[] };
  return { impact: parsed.impact ?? [], sections: parsed.sections ?? [] };
}

// ---------------------------------------------------------------------------
// Code name generator
// ---------------------------------------------------------------------------
async function generateCodeName(tag: string, openai: OpenAI): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 20,
    messages: [
      {
        role: "user",
        content:
          `Génère un ${CODE_NAME_THEME.description} aléatoire pour nommer la version ${tag} d'un logiciel. ` +
          `Exemples : ${CODE_NAME_THEME.examples}. ` +
          `Réponds uniquement avec le prénom, sans ponctuation ni explication.`,
      },
    ],
  });
  const name = response.choices[0]?.message?.content?.trim();
  if (!name) throw new Error("Réponse OpenAI inattendue pour le nom de code");
  return name;
}

// ---------------------------------------------------------------------------
// Notion DB entry
// ---------------------------------------------------------------------------
async function createNotionEntry(
  tag: string,
  codeName: string,
  result: ChangelogResult,
  contexts: PRContext[],
  notion: NotionClient,
): Promise<{ url: string; pageId: string }> {
  const today = new Date().toISOString().split("T")[0];

  // rich_text avec lien optionnel
  type RichTextItem = { type?: "text"; text: { content: string; link?: { url: string } } };
  type NotionBlock =
    | { object: "block"; type: "heading_1"; heading_1: { rich_text: RichTextItem[] } }
    | { object: "block"; type: "heading_2"; heading_2: { rich_text: RichTextItem[] } }
    | { object: "block"; type: "bulleted_list_item"; bulleted_list_item: { rich_text: RichTextItem[] } }
    | { object: "block"; type: "divider"; divider: Record<string, never> };

  // Section Impact
  const impactBlocks: NotionBlock[] = [
    { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "🥊 Impact" } }] } },
    ...result.impact.map((bullet) => ({
      object: "block" as const,
      type: "bulleted_list_item" as const,
      bulleted_list_item: { rich_text: [{ text: { content: bullet } }] },
    })),
    { object: "block", type: "divider", divider: {} },
  ];

  // Section Changelog (par app)
  const changelogBlocks: NotionBlock[] = [
    { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "📋 Changelog" } }] } },
    ...result.sections.flatMap((section) => [
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
    ]),
  ];

  // Section Tickets liés — un bullet par PR avec lien Notion (dédupliqués par URL)
  const ticketEntries = [
    ...new Map(
      contexts
        .filter((c) => c.pr.notionLinks.length > 0)
        .map((c) => [c.pr.notionLinks[0], { title: c.pr.title, url: c.pr.notionLinks[0] }]),
    ).values(),
  ];
  const ticketSectionBlocks: NotionBlock[] =
    ticketEntries.length > 0
      ? [
          { object: "block", type: "divider", divider: {} },
          { object: "block", type: "heading_1", heading_1: { rich_text: [{ text: { content: "🎟️ Tickets" } }] } },
          ...ticketEntries.map(({ title, url }) => ({
            object: "block" as const,
            type: "bulleted_list_item" as const,
            bulleted_list_item: { rich_text: [{ text: { content: title, link: { url } } }] },
          })),
        ]
      : [];

  const page = await notion.pages.create({
    parent: { database_id: NOTION_CHANGELOG_DATABASE_ID! },
    properties: {
      [NOTION_DB_FIELDS.tag]: {
        title: [{ text: { content: tag } }],
      },
      [NOTION_DB_FIELDS.codeName]: {
        rich_text: [{ text: { content: codeName } }],
      },
      [NOTION_DB_FIELDS.date]: {
        date: { start: today },
      },
    },
    children: [...impactBlocks, ...changelogBlocks, ...ticketSectionBlocks],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageId = (page as any).id as string;
  return { url: `https://notion.so/${pageId.replace(/-/g, "")}`, pageId };
}

// ---------------------------------------------------------------------------
// Relier les tickets Notion à l'entrée de release
// ---------------------------------------------------------------------------
async function linkTicketsToRelease(
  ticketUrls: string[],
  changelogPageId: string,
  notion: NotionClient,
): Promise<void> {
  const pageIds = [...new Set(ticketUrls)]
    .map((url) => {
      const raw = extractNotionPageId(url);
      return raw ? toNotionUUID(raw) : null;
    })
    .filter((id): id is string => id !== null);

  if (pageIds.length === 0) return;

  console.log(`🔗 Mise à jour de ${pageIds.length} ticket(s) Notion (champ "${NOTION_TICKET_FIELDS.deliveredVersion}")...`);

  await Promise.all(
    pageIds.map(async (pageId) => {
      try {
        // Lire les relations existantes pour ne pas les écraser
        const page = await notion.pages.retrieve({ page_id: pageId });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = (page as any).properties as Record<string, any>;
        const existingRelations: Array<{ id: string }> =
          props[NOTION_TICKET_FIELDS.deliveredVersion]?.relation ?? [];

        // Ajouter la release seulement si elle n'est pas déjà liée
        if (existingRelations.some((r) => r.id === changelogPageId)) return;

        await notion.pages.update({
          page_id: pageId,
          properties: {
            [NOTION_TICKET_FIELDS.deliveredVersion]: {
              relation: [...existingRelations, { id: changelogPageId }],
            },
          },
        });
      } catch (err) {
        console.warn(`  ⚠️  Impossible de mettre à jour le ticket ${pageId} : ${err}`);
      }
    }),
  );

  console.log(`✅ ${pageIds.length} ticket(s) mis à jour`);
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------
function buildSlackMessage(
  tag: string,
  codeName: string,
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
    `*Résumé de MEP — ${codeName} (${tag})*`,
    `Période : ${period.start} → ${period.end}  |  ${prCount} PR mergées.`,
    "",
    body,
    "",
    `📋 Voir le changelog complet : ${notionUrl}`,
  ].join("\n");
}

async function postToSlack(
  tag: string,
  codeName: string,
  sections: ChangelogSection[],
  period: { start: string; end: string },
  prCount: number,
  notionUrl: string,
): Promise<void> {
  const text = buildSlackMessage(tag, codeName, sections, period, prCount, notionUrl);

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
  const tagIsReal = tagExists(args.tag);

  if (!tagIsReal && !args.dryRun) {
    throw new Error(`Le tag "${args.tag}" n'existe pas en tant que ref git. Utilisez --dry-run pour prévisualiser.`);
  }

  // Si le tag n'existe pas encore, on cible HEAD (mode preview avant release)
  const toRef = tagIsReal ? args.tag : "HEAD";
  const prevTag = findPreviousTag(args.tag);

  console.log(`\n📋 Génération du changelog pour ${args.tag}${!tagIsReal ? " (aperçu — tag non encore créé)" : ""}...`);
  console.log(`📌 Range : ${prevTag ?? "(début du repo)"}..${toRef}`);

  const notion = new NotionClient({ auth: NOTION_API_KEY });
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  // 1. Commits
  const commits = getCommits(prevTag, toRef);
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
  const period = getPeriod(prevTag, toRef);
  console.log(`📅 Période : ${period.start} → ${period.end}`);

  // 6. Synthèse OpenAI
  console.log("🤖 Synthèse avec OpenAI...");
  const result = await synthesizeWithOpenAI(args.tag, commits, contexts, openai);
  console.log(`\n  🥊 Impact (${result.impact.length} point(s))`);
  result.impact.forEach((b) => console.log(`    • ${b}`));
  result.sections.forEach((s) => {
    console.log(`\n  ${s.app} (${s.bullets.length} point(s))`);
    s.bullets.forEach((b) => console.log(`    • ${b}`));
  });
  console.log();

  // 7. Nom de code
  console.log("🎲 Génération du nom de code...");
  const codeName = await generateCodeName(args.tag, openai);
  console.log(`✅ Nom de code : ${codeName}`);

  if (args.dryRun) {
    console.log("\n[DRY RUN] Message Slack qui aurait été envoyé :\n");
    console.log(buildSlackMessage(args.tag, codeName, result.sections, period, prs.length, "https://notion.so/<page-id>"));
    console.log("\n[DRY RUN] Contenu Notion :\n");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n[DRY RUN] Aucune écriture effectuée.");
    return;
  }

  // 8. Entrée Notion
  console.log("📝 Création de l'entrée Notion...");
  const notionPage = await createNotionEntry(args.tag, codeName, result, contexts, notion);
  console.log(`✅ Page Notion créée : ${notionPage.url}`);

  // 9. Relier les tickets à la release
  const ticketUrls = contexts.flatMap((c) => c.pr.notionLinks);
  await linkTicketsToRelease(ticketUrls, notionPage.pageId, notion);

  // 10. Publication Slack
  console.log("💬 Publication sur Slack...");
  await postToSlack(args.tag, codeName, result.sections, period, prs.length, notionPage.url);
  console.log("✅ Publié sur Slack");

  console.log(`\n🎉 Changelog ${args.tag} publié avec succès !`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
