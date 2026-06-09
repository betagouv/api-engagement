export type MissionContent = {
  title: string;
  imageUrl: string;
  durationLabel: string;
  startAtLabel: string;
  compensationLabel: string;
  publisherLogo: string;
  publisherName: string;
  publisherOrganizationName: string;
  city: string;
  url: string;
};

const FONT_FAMILY = "'Marianne', Arial, Helvetica, sans-serif";
const BLUE_FRANCE = "#000091";

// Bannière mission : recadrage cover 1200x260 (= 2x de 600x130 pour la netteté retina).
const buildBannerImageUrl = (imageUrl: string) => `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=1200&h=260&fit=cover`;

// Logo éditeur : redimensionné à une hauteur fixe en conservant le ratio (largeur auto, pas d'étirement), 56px = 2x de 28px pour la netteté retina.
const buildLogoImageUrl = (imageUrl: string) => `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&h=56`;

// Icônes SVG inline (rendu fiable dans les clients mail qui les supportent ; sinon ignorées sans casser la mise en page).
const ICON_LOCATION = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_10039_45011)"><path d="M9.5 18.7853L4.46184 13.7471C3.4654 12.7506 2.78681 11.4811 2.5119 10.099C2.23699 8.71686 2.37809 7.28426 2.91737 5.98234C3.45665 4.68043 4.36988 3.56766 5.54157 2.78476C6.71327 2.00186 8.09081 1.58398 9.5 1.58398C10.9092 1.58398 12.2867 2.00186 13.4584 2.78476C14.6301 3.56766 15.5434 4.68043 16.0826 5.98234C16.6219 7.28426 16.763 8.71686 16.4881 10.099C16.2132 11.4811 15.5346 12.7506 14.5382 13.7471L9.5 18.7853ZM13.4188 12.6277C14.1937 11.8526 14.7214 10.8652 14.9352 9.79024C15.149 8.71528 15.0392 7.60106 14.6198 6.58849C14.2003 5.57591 13.49 4.71046 12.5787 4.10156C11.6674 3.49265 10.596 3.16766 9.5 3.16766C8.40399 3.16766 7.33259 3.49265 6.42128 4.10156C5.50997 4.71046 4.79968 5.57591 4.38022 6.58849C3.96077 7.60106 3.851 8.71528 4.06478 9.79024C4.27856 10.8652 4.80629 11.8526 5.58125 12.6277L9.5 16.5464L13.4188 12.6277ZM9.5 10.2923C9.08008 10.2923 8.67735 10.1254 8.38042 9.82851C8.08348 9.53157 7.91667 9.12885 7.91667 8.70892C7.91667 8.289 8.08348 7.88627 8.38042 7.58934C8.67735 7.2924 9.08008 7.12559 9.5 7.12559C9.91993 7.12559 10.3227 7.2924 10.6196 7.58934C10.9165 7.88627 11.0833 8.289 11.0833 8.70892C11.0833 9.12885 10.9165 9.53157 10.6196 9.82851C10.3227 10.1254 9.91993 10.2923 9.5 10.2923Z" fill="#929292"/></g><defs><clipPath id="clip0_10039_45011"><rect width="19" height="19" fill="white"/></clipPath></defs></svg>`;
const ICON_DURATION = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.50065 1.58398C13.873 1.58398 17.4173 5.12828 17.4173 9.50065C17.4173 13.873 13.873 17.4173 9.50065 17.4173C5.12828 17.4173 1.58398 13.873 1.58398 9.50065C1.58398 5.12828 5.12828 1.58398 9.50065 1.58398ZM9.50065 3.16732C6.00285 3.16732 3.16732 6.00285 3.16732 9.50065C3.16732 12.9985 6.00285 15.834 9.50065 15.834C12.9985 15.834 15.834 12.9985 15.834 9.50065C15.834 6.00285 12.9985 3.16732 9.50065 3.16732ZM10.2923 5.54232V9.50065H13.459V11.084H8.70898V5.54232H10.2923Z" fill="#929292"/></svg>`;
const ICON_COMPENSATION = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.50065 1.58398C13.873 1.58398 17.4173 5.12828 17.4173 9.50065C17.4173 13.873 13.873 17.4173 9.50065 17.4173C5.12828 17.4173 1.58398 13.873 1.58398 9.50065C1.58398 5.12828 5.12828 1.58398 9.50065 1.58398ZM9.50065 3.16732C6.00285 3.16732 3.16732 6.00285 3.16732 9.50065C3.16732 12.9985 6.00285 15.834 9.50065 15.834C12.9985 15.834 15.834 12.9985 15.834 9.50065C15.834 6.00285 12.9985 3.16732 9.50065 3.16732ZM12.5209 6.69578L11.1742 7.59273C10.6404 7.1413 9.90801 7.005 9.24752 7.23415C8.58702 7.46331 8.09643 8.02393 7.9569 8.70898H11.8757V10.2923H7.9569C8.09643 10.9774 8.58702 11.538 9.24752 11.7671C9.90801 11.9963 10.6404 11.86 11.1742 11.4086L12.5201 12.3055C11.5756 13.3337 10.1176 13.7154 8.79043 13.282C7.46329 12.8485 6.51166 11.6798 6.35615 10.2923H5.54232V8.70898H6.35536C6.51034 7.32082 7.46226 6.15129 8.79006 5.71773C10.1179 5.28416 11.5765 5.66656 12.5209 6.69578Z" fill="#929292"/></svg>`;

const buildCriteriaRow = (icon: string, label: string) => `
  <tr>
    <td style="padding: 4px 0;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="padding-right: 8px; vertical-align: middle;">${icon}</td>
          <td style="vertical-align: middle; font-family: ${FONT_FAMILY}; font-size: 14px; color: #1a1a1a; font-weight: bold;">${label}</td>
        </tr>
      </table>
    </td>
  </tr>`;

const buildCriteriaRows = (mission: MissionContent) => {
  const durationLabel = [mission.durationLabel, mission.startAtLabel].filter(Boolean).join(" ");
  return [
    mission.city ? buildCriteriaRow(ICON_LOCATION, mission.city) : "",
    durationLabel ? buildCriteriaRow(ICON_DURATION, durationLabel) : "",
    mission.compensationLabel ? buildCriteriaRow(ICON_COMPENSATION, mission.compensationLabel) : "",
  ].join("");
};

const buildBannerRow = (mission: MissionContent) => `
  <tr>
    <td style="padding-bottom: 16px;">
      <img src="${buildBannerImageUrl(mission.imageUrl)}" alt="" width="100%" style="display: block; width: 100%; height: auto; border: 0;" />
    </td>
  </tr>`;

const buildTitleRow = (mission: MissionContent, fontSize: number) => `
  <tr>
    <td style="padding-bottom: 12px; font-family: ${FONT_FAMILY}; font-size: ${fontSize}px; font-weight: 700; line-height: 1.3; color: #161616;">${mission.title}</td>
  </tr>`;

const buildPublisherRow = (mission: MissionContent) => `
  <tr>
    <td style="padding-bottom: 12px;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr>
          <td style="padding-right: 8px; vertical-align: middle;">
            <img src="${buildLogoImageUrl(mission.publisherLogo)}" alt="${mission.publisherName}" height="28" style="display: block; height: 28px; width: auto; max-width: 120px; object-fit: contain;" />
          </td>
          <td style="vertical-align: middle; font-family: ${FONT_FAMILY}; font-size: 14px; color: #6b7280;">${mission.publisherName} proposé par ${mission.publisherOrganizationName}</td>
        </tr>
      </table>
    </td>
  </tr>`;

// Bouton plein (design carte unique).
const buildSolidButtonRow = (mission: MissionContent) => `
  <tr>
    <td style="padding-top: 16px;">
      <a href="${mission.url}" style="display: inline-block; background: ${BLUE_FRANCE}; color: #ffffff; font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 500; text-decoration: none; padding: 12px 24px;">Découvrir la mission</a>
    </td>
  </tr>`;

// Bouton contour (design liste de missions).
const buildOutlinedButtonRow = (mission: MissionContent) => `
  <tr>
    <td style="padding-top: 16px;">
      <a href="${mission.url}" style="display: inline-block; background: #ffffff; color: ${BLUE_FRANCE}; border: 1px solid ${BLUE_FRANCE}; font-family: ${FONT_FAMILY}; font-size: 14px; font-weight: 500; text-decoration: none; padding: 8px 16px;">Voir les détails de la mission</a>
    </td>
  </tr>`;

// Carte unique (mise en avant) : grand titre + bouton plein.
const buildHeroCard = (mission: MissionContent) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-family: ${FONT_FAMILY};">
    ${buildBannerRow(mission)}
    ${buildTitleRow(mission, 22)}
    ${buildPublisherRow(mission)}
    ${buildCriteriaRows(mission)}
    ${buildSolidButtonRow(mission)}
  </table>`;

// Carte compacte dans une liste : titre plus petit + bouton contour.
const buildListCard = (mission: MissionContent) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-family: ${FONT_FAMILY};">
    ${buildBannerRow(mission)}
    ${buildTitleRow(mission, 18)}
    ${buildPublisherRow(mission)}
    ${buildCriteriaRows(mission)}
    ${buildOutlinedButtonRow(mission)}
  </table>`;

const CARD_SEPARATOR = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td style="padding: 24px 0;"><div style="border-top: 1px solid #e5e5e5; font-size: 0; line-height: 0;">&nbsp;</div></td>
    </tr>
  </table>`;

// Une mission -> carte mise en avant ; plusieurs -> liste de cartes compactes séparées par un trait.
export const buildMissionContentHtml = (missions: MissionContent[]) => {
  if (missions.length === 1) {
    return buildHeroCard(missions[0]);
  }
  return missions.map(buildListCard).join(CARD_SEPARATOR);
};
