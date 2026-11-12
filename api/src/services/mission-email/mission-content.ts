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

// Cartes des templates Brevo (mission sauvegardée et liste de missions) : miroir de la carte mission de la plateforme
// (MissionCard) pour que le jeune retrouve la même carte sur le site et dans le mail. Image sans surimpression, tag
// domaine, titre bleu sur 3 lignes maximum, tags gris sur 2 lignes maximum et annonceur.
// Les tableaux sont en `table-layout: fixed` : sans ça, un texte insécable élargit la cellule et casse la grille.

// Tag DSFR petite taille : texte 12 px, 24 px de haut, coins arrondis. Un tag trop long est tronqué avec « … ».
const TAG_STYLE = `display: inline-block; max-width: 100%; box-sizing: border-box; height: 24px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; vertical-align: top; padding: 2px 8px; border-radius: 12px; font-family: ${FONT_FAMILY}; font-size: 12px; line-height: 20px;`;

const buildDomainTag = (label: string) =>
  `<span style="${TAG_STYLE} background: #e3e3fd; color: ${BLUE_FRANCE}; font-weight: 700; text-transform: uppercase;">${escapeBrevoHtml(label)}</span>`;

// Les tags passent à la ligne avec un espacement de 8 px. La hauteur maximale coupe au-delà de 2 lignes (24 + 8 + 24).
const TAGS_MAX_HEIGHT = 56;
const buildTags = (tags: string[]) =>
  `<div style="max-height: ${TAGS_MAX_HEIGHT}px; overflow: hidden;">${tags.map((tag) => `<span style="${TAG_STYLE} margin: 0 8px 8px 0; background: #eeeeee; color: #161616;">${escapeBrevoHtml(tag)}</span>`).join("")}</div>`;

// Titre limité à 3 lignes : hauteur maximale pour tous les clients, line-clamp en plus pour ceux qui le gèrent (« … »).
const buildTitle = (title: string, fontSize: number, lineHeight: number) =>
  `<div style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; max-height: ${3 * lineHeight}px; overflow: hidden; font-family: ${FONT_FAMILY}; font-size: ${fontSize}px; font-weight: 700; line-height: ${lineHeight}px; color: ${BLUE_FRANCE};">${escapeBrevoHtml(title)}</div>`;

const buildImageRow = (mission: MissionContent, width: number, height: number) => {
  const image = mission.imageUrl
    ? `<img src="${buildCardImageUrl(mission.imageUrl, width, height)}" alt="" width="${width}" height="${height}" style="display: block; width: 100%; height: ${height}px; object-fit: cover; border: 0;" />`
    : "&nbsp;";
  return `
    <tr>
      <td height="${height}" style="height: ${height}px; padding: 0; background-color: #f6f6f6; font-size: 0; line-height: 0;">${image}</td>
    </tr>`;
};

// Un nom d'annonceur qui ressemble à un domaine (« JeVeuxAider.gouv.fr ») est transformé en lien par Gmail et Apple Mail :
// un caractère invisible (ZWNJ) après chaque point empêche cette détection.
const preventAutoLink = (escapedText: string) => escapedText.replace(/\./g, ".&#8204;");

// Bas de carte : logo et nom de l'annonceur, puis le lien « Détails → » aligné à droite (carte de la liste uniquement).
// RGAA 1.1 (comme sur la plateforme) : sans nom d'annonceur, on n'affiche pas son logo.
const DETAILS_LINK_WIDTH = 80;
const buildFooter = (mission: MissionContent, withDetailsLink: boolean) => {
  const logo =
    mission.publisherName && mission.publisherLogo
      ? `<td width="${PUBLISHER_LOGO_WIDTH + 8}" style="width: ${PUBLISHER_LOGO_WIDTH + 8}px; vertical-align: middle;"><img src="${buildLogoImageUrl(mission.publisherLogo)}" alt="" width="${PUBLISHER_LOGO_WIDTH}" height="${PUBLISHER_LOGO_HEIGHT}" style="display: block; width: ${PUBLISHER_LOGO_WIDTH}px; height: ${PUBLISHER_LOGO_HEIGHT}px; border: 0;" /></td>`
      : "";
  const name = `<td style="vertical-align: middle;"><div style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-family: ${FONT_FAMILY}; font-size: 14px; line-height: 24px; color: #666666;">${preventAutoLink(escapeBrevoHtml(mission.publisherName))}</div></td>`;
  const detailsLink = withDetailsLink
    ? `<td width="${DETAILS_LINK_WIDTH}" align="right" style="width: ${DETAILS_LINK_WIDTH}px; vertical-align: middle; text-align: right; white-space: nowrap;"><a href="${mission.url}" style="font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 400; line-height: 24px; color: ${BLUE_FRANCE}; text-decoration: underline;">Détails&nbsp;&rarr;</a></td>`
    : "";
  return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="table-layout: fixed;">
          <tr>
            ${logo}${name}${detailsLink}
          </tr>
        </table>`;
};

const CARD_STYLE = `table-layout: fixed; border-collapse: separate; background: #ffffff; border: 1px solid #dddddd; font-family: ${FONT_FAMILY};`;

// Mission sauvegardée (cœur) : grande carte avec lieu, rythme et indemnité. Pas de lien « Détails » : le bouton
// du template, juste en dessous, pointe déjà vers la mission.
const SAVED_MISSION_IMAGE_WIDTH = 534;
const SAVED_MISSION_IMAGE_HEIGHT = 200;

// Chaque tag porte 8 px d'espacement en dessous : l'espace qui suit les tags est réduit d'autant.
export const buildSavedMissionContentHtml = (mission: MissionContent) => {
  const hasTags = mission.tags.length > 0;
  const spaceAfterContent = hasTags ? 8 : 16;
  const footer = mission.publisherName
    ? `
    <tr>
      <td style="padding: ${spaceAfterContent}px 24px 24px;">${buildFooter(mission, false)}
      </td>
    </tr>`
    : "";
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="${CARD_STYLE}">
    ${buildImageRow(mission, SAVED_MISSION_IMAGE_WIDTH, SAVED_MISSION_IMAGE_HEIGHT)}
    <tr>
      <td style="padding: 16px 24px ${mission.publisherName ? 0 : spaceAfterContent + 8}px; vertical-align: top;">
        ${mission.domainLabel ? `<div style="margin-bottom: 8px;">${buildDomainTag(mission.domainLabel)}</div>` : ""}
        ${buildTitle(mission.title, 20, 28)}
        ${hasTags ? `<div style="margin-top: 16px;">${buildTags(mission.tags)}</div>` : ""}
      </td>
    </tr>${footer}
  </table>`;
};

// Liste de missions : la grille (2 colonnes, une seule sur mobile) est construite dans le template Brevo, chaque case
// reçoit une carte (mission1 à mission6). Toutes les cartes ont la même hauteur (370 px, comme la maquette) pour que
// les rangées restent alignées : le bloc domaine + titre + tags a une hauteur fixe, quel que soit le contenu.
const LIST_MISSION_IMAGE_WIDTH = 252;
const LIST_MISSION_IMAGE_HEIGHT = 120;
// Tag domaine (24) + 8 + titre sur 3 lignes (72) + 16 + tags sur 2 lignes (56)
const LIST_MISSION_CONTENT_HEIGHT = 24 + 8 + 72 + 16 + TAGS_MAX_HEIGHT;

export const buildListMissionCardHtml = (mission: MissionContent) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="${CARD_STYLE}">
    ${buildImageRow(mission, LIST_MISSION_IMAGE_WIDTH, LIST_MISSION_IMAGE_HEIGHT)}
    <tr>
      <td height="${LIST_MISSION_CONTENT_HEIGHT}" style="height: ${LIST_MISSION_CONTENT_HEIGHT}px; padding: 12px 16px 0; vertical-align: top;">
        <div style="height: ${LIST_MISSION_CONTENT_HEIGHT}px; overflow: hidden;">
          <div style="height: 24px; margin-bottom: 8px; overflow: hidden;">${mission.domainLabel ? buildDomainTag(mission.domainLabel) : "&nbsp;"}</div>
          ${buildTitle(mission.title, 16, 24)}
          <div style="margin-top: 16px;">${buildTags(mission.tags)}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td height="${PUBLISHER_LOGO_HEIGHT}" style="height: ${PUBLISHER_LOGO_HEIGHT}px; padding: 16px 16px 12px;">${buildFooter(mission, true)}
      </td>
    </tr>
  </table>`;

// Params Brevo mission1 … missionN, un par case de la grille du template. Les cases sans mission ne reçoivent rien.
export const buildListMissionCardsParams = (missions: MissionContent[]) =>
  Object.fromEntries(missions.map((mission, index) => [`mission${index + 1}`, buildListMissionCardHtml(mission)]));

// Encadré « Tu nous as dit » de la liste de missions : rappel des réponses au quiz. Les puces sont des cellules de tableau
// (et non une <ul>) pour garder une puce bleue et un texte gris dans tous les clients mail. Sans réponse, rien n'est affiché.
const buildAnswerRow = (answer: string) => `
    <tr>
      <td width="17" style="width: 17px; padding-top: 8px; vertical-align: top; font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: ${BLUE_FRANCE};">&bull;</td>
      <td style="padding-top: 8px; vertical-align: top; font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: #3a3a3a;">${escapeBrevoHtml(answer)}</td>
    </tr>`;

export const buildAnswersContentHtml = (answers: string[]) => {
  if (answers.length === 0) {
    return "";
  }
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background: #f5f5fe; border-left: 4px solid ${BLUE_FRANCE};">
    <tr>
      <td style="padding: 16px 20px;">
        <div style="font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 700; line-height: 24px; color: #161616;">Tu nous as dit :</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${answers.map(buildAnswerRow).join("")}
        </table>
      </td>
    </tr>
  </table>`;
};
