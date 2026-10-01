export type MissionContent = {
  id: string;
  title: string;
  imageUrl: string;
  domainLabel: string;
  tags: string[];
  publisherLogo: string;
  publisherName: string;
  url: string;
};

const FONT_FAMILY = "'Marianne', Arial, Helvetica, sans-serif";
const BLUE_FRANCE = "#000091";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "{": "&#123;",
  "}": "&#125;",
};

// Les accolades sont aussi encodées pour que Brevo ne puisse pas interpréter
// une valeur métier comme une expression de son langage de template.
const escapeBrevoHtml = (value: string) => value.replace(/[&<>"'{}]/g, (character) => HTML_ENTITIES[character]);

// Image de la carte : recadrage cover 568x240 (= 2x de 284x120 pour la netteté retina).
const buildCardImageUrl = (imageUrl: string) => `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=568&h=240&fit=cover`;

// Logo éditeur : redimensionné à une hauteur fixe en conservant le ratio, 64px = 2x de 32px pour la netteté retina.
const buildLogoImageUrl = (imageUrl: string) => `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&h=64`;

// Reprend la carte mission de la plateforme (plateform/app/components/missions/mission-card.tsx) :
// image, tag domaine, titre, tags, annonceur et lien « Détails ».
const buildImageRow = (mission: MissionContent) => `
  <tr>
    <td style="height: 120px; background: #f6f6f6; font-size: 0; line-height: 0;">
      ${mission.imageUrl ? `<img src="${buildCardImageUrl(mission.imageUrl)}" alt="" width="284" height="120" style="display: block; width: 100%; height: 120px; object-fit: cover; border: 0;" />` : "&nbsp;"}
    </td>
  </tr>`;

// Le corps de la carte a une hauteur fixe comme sur la plateforme (h-83.75) : chaque bloc réserve sa hauteur
// (tag domaine 16px, titre 2 lignes, tags 2 rangées) pour que les cartes d'une même ligne restent alignées.
const buildDomainRow = (mission: MissionContent) => `
  <tr>
    <td height="16" style="height: 16px; padding: 12px 16px 0; font-size: 0; line-height: 0;">
      ${mission.domainLabel ? `<span style="display: inline-block; background: #e3e3fd; color: ${BLUE_FRANCE}; border-radius: 999px; padding: 0 10px; font-family: ${FONT_FAMILY}; font-size: 12px; line-height: 16px; text-transform: uppercase;">${escapeBrevoHtml(mission.domainLabel)}</span>` : "&nbsp;"}
    </td>
  </tr>`;

// Titre limité à 2 lignes (line-clamp-2 sur la plateforme) : -webkit-line-clamp pour les clients qui le gèrent,
// hauteur fixe (2 x 24px) + overflow pour couper proprement les autres.
const buildTitleRow = (mission: MissionContent) => `
  <tr>
    <td style="padding: 8px 16px 0;">
      <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; height: 48px; overflow: hidden; font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 700; line-height: 24px; color: ${BLUE_FRANCE};">${escapeBrevoHtml(mission.title)}</div>
    </td>
  </tr>`;

// Tags limités à 2 rangées (max-h-14 sur la plateforme) : hauteur fixe de 56px, le surplus est masqué.
const buildTagsRow = (mission: MissionContent) => {
  const tags = mission.tags
    .map(
      (tag) =>
        `<span style="display: inline-block; background: #eeeeee; color: #161616; border-radius: 999px; padding: 2px 10px; margin: 0 4px 8px 0; font-family: ${FONT_FAMILY}; font-size: 12px; line-height: 16px; white-space: nowrap;">${escapeBrevoHtml(tag)}</span>`
    )
    .join("");
  return `
  <tr>
    <td style="padding: 16px 16px 0;">
      <div style="height: 56px; overflow: hidden;">${tags}</div>
    </td>
  </tr>`;
};

// RGAA 1.1 (comme sur la plateforme) : sans nom d'annonceur, on n'affiche pas son logo.
const buildFooterRow = (mission: MissionContent) => {
  const publisher = mission.publisherName
    ? `<table cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            ${mission.publisherLogo ? `<td style="padding-right: 8px; vertical-align: middle;"><img src="${buildLogoImageUrl(mission.publisherLogo)}" alt="" height="32" style="display: block; height: 32px; width: auto; max-width: 48px; background: #ffffff;" /></td>` : ""}
            <td style="vertical-align: middle; font-family: ${FONT_FAMILY}; font-size: 14px; line-height: 24px; color: #666666;">${escapeBrevoHtml(mission.publisherName)}</td>
          </tr>
        </table>`
    : "";
  return `
  <tr>
    <td style="padding: 8px 16px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="vertical-align: middle;">${publisher}</td>
          <td align="right" style="vertical-align: middle; white-space: nowrap;">
            <a href="${mission.url}" style="font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: ${BLUE_FRANCE}; text-decoration: underline;">Détails&nbsp;&rarr;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
};

const buildMissionCard = (mission: MissionContent) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background: #ffffff; border: 1px solid #dddddd;">
    ${buildImageRow(mission)}
    ${buildDomainRow(mission)}
    ${buildTitleRow(mission)}
    ${buildTagsRow(mission)}
    ${buildFooterRow(mission)}
  </table>`;

// Grille de 2 cartes par ligne, comme la liste de résultats de la plateforme.
const buildMissionRow = (missions: MissionContent[]) => `
  <tr>
    <td width="50%" style="width: 50%; padding: 0 8px 16px 0; vertical-align: top;">${buildMissionCard(missions[0])}</td>
    <td width="50%" style="width: 50%; padding: 0 0 16px 8px; vertical-align: top;">${missions[1] ? buildMissionCard(missions[1]) : "&nbsp;"}</td>
  </tr>`;

export const buildMissionContentHtml = (missions: MissionContent[]) => {
  const rows: string[] = [];
  for (let index = 0; index < missions.length; index += 2) {
    rows.push(buildMissionRow(missions.slice(index, index + 2)));
  }
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-family: ${FONT_FAMILY};">
    ${rows.join("")}
  </table>`;
};
