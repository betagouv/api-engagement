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

// Image de la carte : recadrage cover au double de la taille affichée pour la netteté retina.
const buildCardImageUrl = (imageUrl: string, width: number, height: number) =>
  `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width * 2}&h=${height * 2}&fit=cover`;

// Logo éditeur : boîte fixe 48x32 (x2 pour la netteté retina), le logo y est contenu sans déformation et
// complété de blanc, pour ne dépendre ni de object-fit ni d'une largeur auto, mal gérés par les clients mail.
const PUBLISHER_LOGO_WIDTH = 48;
const PUBLISHER_LOGO_HEIGHT = 32;
const buildLogoImageUrl = (imageUrl: string) =>
  `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=${PUBLISHER_LOGO_WIDTH * 2}&h=${PUBLISHER_LOGO_HEIGHT * 2}&fit=contain&cbg=white`;

// Deux variantes de la carte mission de la plateforme (plateform/app/components/missions/mission-card.tsx) :
// - grid : carte compacte de la grille de résultats, corps à hauteur fixe (tag domaine, titre 2 lignes, tags
//   2 rangées) pour que les cartes d'une même ligne restent alignées, avec bordure et lien « Détails » ;
// - saved : grande carte de la mission sauvegardée, sans bordure ni hauteurs réservées, textes agrandis.
type CardStyle = {
  imageWidth: number;
  imageHeight: number;
  paddingX: number;
  fixedHeights: boolean;
  domainFontSize: number;
  titleFontSize: number;
  titleLineHeight: number;
  tagFontSize: number;
  publisherFontSize: number;
  withDetailsLink: boolean;
  maxWidth?: number;
};

const GRID_CARD_STYLE: CardStyle = {
  imageWidth: 284,
  imageHeight: 120,
  paddingX: 16,
  fixedHeights: true,
  domainFontSize: 12,
  titleFontSize: 16,
  titleLineHeight: 24,
  tagFontSize: 12,
  publisherFontSize: 14,
  withDetailsLink: true,
  maxWidth: 385,
};

const SAVED_CARD_STYLE: CardStyle = {
  imageWidth: 640,
  imageHeight: 256,
  paddingX: 0,
  fixedHeights: false,
  domainFontSize: 14,
  titleFontSize: 22,
  titleLineHeight: 30,
  tagFontSize: 14,
  publisherFontSize: 16,
  withDetailsLink: false,
};

const buildImageRow = (mission: MissionContent, style: CardStyle) => `
  <tr>
    <td style="height: ${style.imageHeight}px; background: #f6f6f6; font-size: 0; line-height: 0;">
      ${mission.imageUrl ? `<img src="${buildCardImageUrl(mission.imageUrl, style.imageWidth, style.imageHeight)}" alt="" width="${style.imageWidth}" height="${style.imageHeight}" style="display: block; width: 100%; height: ${style.imageHeight}px; object-fit: cover; border: 0;" />` : "&nbsp;"}
    </td>
  </tr>`;

const buildDomainRow = (mission: MissionContent, style: CardStyle) => {
  const domain = mission.domainLabel
    ? `<span style="display: inline-block; background: #e3e3fd; color: ${BLUE_FRANCE}; border-radius: 999px; padding: 0 10px; font-family: ${FONT_FAMILY}; font-size: ${style.domainFontSize}px; line-height: ${style.domainFontSize + 4}px; text-transform: uppercase;">${escapeBrevoHtml(mission.domainLabel)}</span>`
    : "";
  if (!domain && !style.fixedHeights) {
    return "";
  }
  return `
  <tr>
    <td style="padding: 12px ${style.paddingX}px 0;${style.fixedHeights ? " height: 16px; font-size: 0; line-height: 0;" : ""}">${domain || "&nbsp;"}</td>
  </tr>`;
};

// Titre limité à 2 lignes (line-clamp-2 sur la plateforme) : -webkit-line-clamp pour les clients qui le gèrent,
// hauteur fixe (grille) ou maximale (grande carte) de 2 lignes + overflow pour couper proprement les autres.
const buildTitleRow = (mission: MissionContent, style: CardStyle) => `
  <tr>
    <td style="padding: 8px ${style.paddingX}px 0;">
      <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; ${style.fixedHeights ? "height" : "max-height"}: ${style.titleLineHeight * 2}px; overflow: hidden; font-family: ${FONT_FAMILY}; font-size: ${style.titleFontSize}px; font-weight: 700; line-height: ${style.titleLineHeight}px; color: ${BLUE_FRANCE};">${escapeBrevoHtml(mission.title)}</div>
    </td>
  </tr>`;

// Tags limités à 2 rangées dans la grille (max-h-14 sur la plateforme) : hauteur fixe, le surplus est masqué.
// Un tag trop long est tronqué à la largeur de la carte plutôt que de l'élargir.
const buildTagsRow = (mission: MissionContent, style: CardStyle) => {
  const tags = mission.tags
    .map(
      (tag) =>
        `<span style="display: inline-block; box-sizing: border-box; max-width: 100%; overflow: hidden; text-overflow: ellipsis; vertical-align: top; background: #eeeeee; color: #161616; border-radius: 999px; padding: 2px 10px; margin: 0 4px 8px 0; font-family: ${FONT_FAMILY}; font-size: ${style.tagFontSize}px; line-height: ${style.tagFontSize + 4}px; white-space: nowrap;">${escapeBrevoHtml(tag)}</span>`
    )
    .join("");
  return `
  <tr>
    <td style="padding: 16px ${style.paddingX}px 0;">
      ${style.fixedHeights ? `<div style="height: 56px; overflow: hidden;">${tags}</div>` : tags}
    </td>
  </tr>`;
};

// RGAA 1.1 (comme sur la plateforme) : sans nom d'annonceur, on n'affiche pas son logo.
// Le lien « Détails » est omis quand le template porte déjà le CTA vers la mission.
const buildFooterRow = (mission: MissionContent, style: CardStyle) => {
  const publisher = mission.publisherName
    ? `<table cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            ${mission.publisherLogo ? `<td style="padding-right: 8px; vertical-align: middle;"><img src="${buildLogoImageUrl(mission.publisherLogo)}" alt="" width="${PUBLISHER_LOGO_WIDTH}" height="${PUBLISHER_LOGO_HEIGHT}" style="display: block; width: ${PUBLISHER_LOGO_WIDTH}px; height: ${PUBLISHER_LOGO_HEIGHT}px; object-fit: contain; border: 0;" /></td>` : ""}
            <td style="vertical-align: middle; font-family: ${FONT_FAMILY}; font-size: ${style.publisherFontSize}px; line-height: 24px; color: #666666;">${escapeBrevoHtml(mission.publisherName)}</td>
          </tr>
        </table>`
    : "";
  const detailsLink = style.withDetailsLink
    ? `<td align="right" style="padding-left: 8px; vertical-align: middle; white-space: nowrap;">
            <a href="${mission.url}" style="font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: ${BLUE_FRANCE}; text-decoration: underline;">Détails&nbsp;&rarr;</a>
          </td>`
    : "";
  return `
  <tr>
    <td style="padding: 8px ${style.paddingX}px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="vertical-align: middle;">${publisher}</td>
          ${detailsLink}
        </tr>
      </table>
    </td>
  </tr>`;
};

const buildMissionCard = (mission: MissionContent, style: CardStyle, border: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="${style.maxWidth ? `max-width: ${style.maxWidth}px; ` : ""}font-family: ${FONT_FAMILY}; background: #ffffff; border: ${border};">
    ${buildImageRow(mission, style)}
    ${buildDomainRow(mission, style)}
    ${buildTitleRow(mission, style)}
    ${buildTagsRow(mission, style)}
    ${buildFooterRow(mission, style)}
  </table>`;

// Grille de 2 cartes par ligne, comme la liste de résultats de la plateforme. `table-layout: fixed` garde les
// deux colonnes à 50 % quel que soit le contenu des cartes.
const buildMissionRow = (missions: MissionContent[]) => `
  <tr>
    <td width="50%" style="width: 50%; padding: 0 8px 16px 0; vertical-align: top;">${buildMissionCard(missions[0], GRID_CARD_STYLE, "1px solid #dddddd")}</td>
    <td width="50%" style="width: 50%; padding: 0 0 16px 8px; vertical-align: top;">${missions[1] ? buildMissionCard(missions[1], GRID_CARD_STYLE, "1px solid #dddddd") : "&nbsp;"}</td>
  </tr>`;

export const buildMissionContentHtml = (missions: MissionContent[]) => {
  const rows: string[] = [];
  for (let index = 0; index < missions.length; index += 2) {
    rows.push(buildMissionRow(missions.slice(index, index + 2)));
  }
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="table-layout: fixed; font-family: ${FONT_FAMILY};">
    ${rows.join("")}
  </table>`;
};

// Mission sauvegardée (cœur) : une seule carte pleine largeur (~640px), sans lien « Détails »
// car le CTA « Découvrir la mission » du template pointe déjà vers la mission.
export const buildSavedMissionContentHtml = (mission: MissionContent) => buildMissionCard(mission, SAVED_CARD_STYLE, "0");
