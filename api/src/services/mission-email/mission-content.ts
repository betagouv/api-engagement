export type MissionContent = {
  id: string;
  title: string;
  imageUrl: string;
  domainLabel: string;
  location: string;
  schedule: string;
  compensation: string;
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

// Cartes des templates Brevo (mission sauvegardée et liste de missions) : tag domaine posé sur l'image, une icône par
// info (lieu, rythme, indemnité) et l'annonceur.

// Icônes PNG hébergées dans la médiathèque Brevo : les clients mail n'affichent pas les SVG.
const LOCATION_ICON_URL = "https://img.mailinblue.com/5230579/images/content_library/original/6ae31b3ccaab17e85055c549.png";
const SCHEDULE_ICON_URL = "https://img.mailinblue.com/5230579/images/content_library/original/6ae31b3c0d354ca252b4d23d.png";
const COMPENSATION_ICON_URL = "https://img.mailinblue.com/5230579/images/content_library/original/6ae31b3c8942b0003aa0c286.png";

// Le tag domaine est posé sur l'image : elle est en fond de cellule (attribut `background` + CSS). Outlook Windows
// ne gère pas les images de fond et affichera le fond gris.
const buildMissionImageRow = (mission: MissionContent, width: number, height: number) => {
  const imageUrl = mission.imageUrl ? buildCardImageUrl(mission.imageUrl, width, height) : "";
  const domain = mission.domainLabel
    ? `<span style="display: inline-block; background: #e3e3fd; color: ${BLUE_FRANCE}; border-radius: 4px; padding: 2px 8px; font-family: ${FONT_FAMILY}; font-size: 14px; font-weight: 700; line-height: 20px; text-transform: uppercase;">${escapeBrevoHtml(mission.domainLabel)}</span>`
    : "&nbsp;";
  return `
  <tr>
    <td height="${height}" valign="top"${imageUrl ? ` background="${imageUrl}"` : ""} style="height: ${height}px; padding: 12px; vertical-align: top; background-color: #f6f6f6;${imageUrl ? ` background-image: url('${imageUrl}'); background-size: cover; background-position: center;` : ""}">${domain}</td>
  </tr>`;
};

// Un nom d'annonceur qui ressemble à un domaine (« JeVeuxAider.gouv.fr ») est transformé en lien par Gmail et Apple Mail :
// un caractère invisible (ZWNJ) après chaque point empêche cette détection.
const preventAutoLink = (escapedText: string) => escapedText.replace(/\./g, ".&#8204;");

// RGAA 1.1 (comme sur la plateforme) : sans nom d'annonceur, on n'affiche pas son logo.
const buildMissionPublisherRow = (mission: MissionContent, padding: string) => {
  if (!mission.publisherName) {
    return "";
  }
  return `
  <tr>
    <td style="padding: ${padding};">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          ${mission.publisherLogo ? `<td style="padding-right: 8px; vertical-align: middle;"><img src="${buildLogoImageUrl(mission.publisherLogo)}" alt="" width="${PUBLISHER_LOGO_WIDTH}" height="${PUBLISHER_LOGO_HEIGHT}" style="display: block; width: ${PUBLISHER_LOGO_WIDTH}px; height: ${PUBLISHER_LOGO_HEIGHT}px; border: 0;" /></td>` : ""}
          <td style="vertical-align: middle; font-family: ${FONT_FAMILY}; font-size: 14px; line-height: 20px; color: #666666;">${preventAutoLink(escapeBrevoHtml(mission.publisherName))}</td>
        </tr>
      </table>
    </td>
  </tr>`;
};

// Mission sauvegardée (cœur) : une grande carte, infos sur une ligne. Pas de lien « Détails » : le CTA
// « Découvrir la mission » du template pointe déjà vers la mission.
const SAVED_MISSION_IMAGE_WIDTH = 600;
const SAVED_MISSION_IMAGE_HEIGHT = 224;

// Infos en inline-block pour qu'elles passent à la ligne sur mobile au lieu d'élargir la carte.
const buildSavedMissionInfo = (iconUrl: string, label: string) =>
  label
    ? `<span style="display: inline-block; margin: 0 20px 8px 0; white-space: nowrap; font-family: ${FONT_FAMILY}; font-size: 14px; line-height: 20px; color: #3a3a3a;"><img src="${iconUrl}" alt="" width="16" height="16" style="width: 16px; height: 16px; border: 0; vertical-align: middle; margin-right: 6px;" /><span style="vertical-align: middle;">${escapeBrevoHtml(label)}</span></span>`
    : "";

export const buildSavedMissionContentHtml = (mission: MissionContent) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: separate; background: #ffffff; border: 1px solid #dddddd; font-family: ${FONT_FAMILY};">
    ${buildMissionImageRow(mission, SAVED_MISSION_IMAGE_WIDTH, SAVED_MISSION_IMAGE_HEIGHT)}
    <tr>
      <td style="padding: 24px 24px 0; font-family: ${FONT_FAMILY}; font-size: 20px; font-weight: 700; line-height: 28px; color: #161616;">${escapeBrevoHtml(mission.title)}</td>
    </tr>
    <tr>
      <td style="padding: 16px 24px ${mission.publisherName ? 0 : 16}px;">${buildSavedMissionInfo(LOCATION_ICON_URL, mission.location)}${buildSavedMissionInfo(SCHEDULE_ICON_URL, mission.schedule)}${buildSavedMissionInfo(COMPENSATION_ICON_URL, mission.compensation)}</td>
    </tr>
    ${buildMissionPublisherRow(mission, "8px 24px 24px")}
  </table>`;

// Liste de missions : la grille est construite dans le template Brevo, chaque case reçoit une carte (mission1 à mission6).
// Carte étroite (une colonne de la grille), une info par ligne et un lien « Voir la mission ». Le titre est limité à
// 2 lignes (hauteur fixe + line-clamp pour les clients qui le gèrent) pour que les cartes d'une même ligne restent alignées.
const LIST_MISSION_IMAGE_WIDTH = 280;
const LIST_MISSION_IMAGE_HEIGHT = 132;

const buildListMissionInfo = (iconUrl: string, label: string) =>
  label
    ? `<div style="padding-bottom: 8px; font-family: ${FONT_FAMILY}; font-size: 14px; line-height: 20px; color: #3a3a3a;"><img src="${iconUrl}" alt="" width="16" height="16" style="width: 16px; height: 16px; border: 0; vertical-align: middle; margin-right: 8px;" /><span style="vertical-align: middle;">${escapeBrevoHtml(label)}</span></div>`
    : "";

export const buildListMissionCardHtml = (mission: MissionContent) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse: separate; background: #ffffff; border: 1px solid #dddddd; font-family: ${FONT_FAMILY};">
    ${buildMissionImageRow(mission, LIST_MISSION_IMAGE_WIDTH, LIST_MISSION_IMAGE_HEIGHT)}
    <tr>
      <td style="padding: 16px 16px 0;">
        <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; height: 48px; overflow: hidden; font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 700; line-height: 24px; color: #161616;">${escapeBrevoHtml(mission.title)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 16px 0;">${buildListMissionInfo(LOCATION_ICON_URL, mission.location)}${buildListMissionInfo(SCHEDULE_ICON_URL, mission.schedule)}${buildListMissionInfo(COMPENSATION_ICON_URL, mission.compensation)}</td>
    </tr>
    ${buildMissionPublisherRow(mission, "0 16px")}
    <tr>
      <td style="padding: 12px 16px 16px;">
        <a href="${mission.url}" style="font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: ${BLUE_FRANCE}; text-decoration: none;">Voir la mission&nbsp;&rarr;</a>
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
      <td width="16" style="width: 16px; padding-top: 8px; vertical-align: top; font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: ${BLUE_FRANCE};">&bull;</td>
      <td style="padding-top: 8px; vertical-align: top; font-family: ${FONT_FAMILY}; font-size: 16px; line-height: 24px; color: #3a3a3a;">${escapeBrevoHtml(answer)}</td>
    </tr>`;

export const buildAnswersContentHtml = (answers: string[]) => {
  if (answers.length === 0) {
    return "";
  }
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background: #f5f5fe; border-left: 4px solid ${BLUE_FRANCE};">
    <tr>
      <td style="padding: 20px 24px 24px;">
        <div style="font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 700; line-height: 24px; color: #161616;">Tu nous as dit :</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${answers.map(buildAnswerRow).join("")}
        </table>
      </td>
    </tr>
  </table>`;
};
