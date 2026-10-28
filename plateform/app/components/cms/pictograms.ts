import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import SearchSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/search.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import EnvironmentSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/environment.svg?url";
import HumanCooperationSvg from "@gouvfr/dsfr/dist/artwork/pictograms/environment/human-cooperation.svg?url";
import CommunitySvg from "@gouvfr/dsfr/dist/artwork/pictograms/leisure/community.svg?url";
import BackpackSvg from "@gouvfr/dsfr/dist/artwork/pictograms/map/backpack.svg?url";

import type { PagePictogram } from "~/types/page";

// Pictogrammes DSFR proposés dans le CMS (enum `icon`). Pour en ajouter un : l'importer ici et l'ajouter à l'enum Strapi.
export const PICTOGRAMS: Record<PagePictogram, string> = {
  search: SearchSvg,
  self_training: SelfTrainingSvg,
  mail_send: MailSendSvg,
  backpack: BackpackSvg,
  environment: EnvironmentSvg,
  human_cooperation: HumanCooperationSvg,
  community: CommunitySvg,
};
