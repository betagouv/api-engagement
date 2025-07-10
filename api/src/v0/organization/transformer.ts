import { Publisher } from "../../types";

export const buildPublisherData = (publisher: Publisher, clicks: number, isExcluded: boolean) => {
  return {
    _id: publisher._id,
    name: publisher.name,
    category: publisher.category,
    url: publisher.url,
    logo: publisher.logo,
    description: publisher.description,
    widget: publisher.hasWidgetRights,
    api: publisher.hasApiRights,
    campaign: publisher.hasCampaignRights,
    annonceur: publisher.isAnnonceur,
    excluded: isExcluded,
    clicks,
  };
};
