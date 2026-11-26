import ascLogo from "~/assets/images/logo/asc-logo.png";
import gendarmerieLogo from "~/assets/images/logo/gendarmerie-logo.png";
import jvaLogo from "~/assets/images/logo/jva-logo.png";
import policeLogo from "~/assets/images/logo/police-nationale-logo.png";
import rocLogo from "~/assets/images/logo/roc-logo.png";
import spvLogo from "~/assets/images/logo/spv-logo.png";

// Partenaires du bloc « Partenaires » du CMS. La clé est la valeur du champ `partner` (cms/src/components/items/partner.json) :
// un partenaire ajouté ici doit l'être aussi dans l'enum du schéma. Le texte peut être remplacé page par page dans le CMS.
export const CMS_PARTNERS = {
  reserve_armees: { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: rocLogo },
  jeveuxaider: { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: jvaLogo },
  service_civique: { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.", logo: ascLogo },
  sapeurs_pompiers: { name: "Sapeurs-pompiers de France", description: "Deviens sapeur-pompier volontaire près de chez toi.", logo: spvLogo },
  gendarmerie: { name: "Gendarmerie nationale", description: "Deviens gendarme près de chez toi.", logo: gendarmerieLogo },
  police_nationale: { name: "Police nationale", description: "Deviens policier près de chez toi.", logo: policeLogo },
} as const;

export type CmsPartnerKey = keyof typeof CMS_PARTNERS;
