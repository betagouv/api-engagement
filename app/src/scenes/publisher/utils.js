const sanitizeNullableString = (value) => {
  if (value === undefined || value === null) return undefined;
  return value;
};

const formatPublishersForApi = (publishers = []) =>
  (publishers || [])
    .map((publisher) => {
      const publisherId = publisher.publisherId ?? publisher.annonceurPublisherId ?? publisher.diffuseurPublisherId ?? publisher.id;
      if (!publisherId) return null;

      return {
        publisherId,
        publisherName: publisher.publisherName ?? publisher.diffuseurPublisherName ?? publisher.name,
        publisherLogo: publisher.publisherLogo ?? publisher.logo,
        missionType: publisher.missionType ?? null,
        moderator: Boolean(publisher.moderator),
      };
    })
    .filter(Boolean);

export const buildPublisherPayload = (values) => ({
  name: values.name?.trim?.() ?? values.name,
  sendReport: Boolean(values.sendReport),
  sendReportTo: values.sendReportTo ?? [],
  isAnnonceur: Boolean(values.isAnnonceur),
  missionType: values.isAnnonceur ? values.missionType : null,
  hasApiRights: Boolean(values.hasApiRights),
  hasWidgetRights: Boolean(values.hasWidgetRights),
  hasCampaignRights: Boolean(values.hasCampaignRights),
  category: values.isDiffuseur ? values.category : null,
  publishers: values.isDiffuseur ? formatPublishersForApi(values.publishers) : [],
  documentation: sanitizeNullableString(values.documentation),
  description: values.description ?? "",
  lead: sanitizeNullableString(values.lead),
  url: sanitizeNullableString(values.url),
  email: sanitizeNullableString(values.email),
  feed: sanitizeNullableString(values.feed),
});

export { sanitizeNullableString, formatPublishersForApi };
