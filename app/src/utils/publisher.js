const sanitizeNullableString = (value) => {
  if (value === undefined || value === null) return undefined;
  return value;
};

const formatPublishersForApi = (publishers = []) =>
  (publishers || [])
    .map((publisher) => {
      const publisherId = publisher.publisherId ?? publisher.id;
      if (!publisherId) return null;

      return {
        publisherId,
      };
    })
    .filter(Boolean);

export const buildPublisherPayload = (values) => ({
  name: values.name?.trim?.() ?? values.name,
  sendReport: Boolean(values.sendReport),
  sendReportTo: values.sendReportTo ?? [],
  isAnnonceur: Boolean(values.isAnnonceur),
  selfHostedScript: values.isAnnonceur ? Boolean(values.selfHostedScript) : false,
  missionType: values.isAnnonceur ? values.missionType : null,
  expectedApplications: values.isAnnonceur ? (values.expectedApplications ?? null) : null,
  deploymentUserId: values.deploymentUserId || null,
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
  demarcheSimplifiees: values.isDemarcheSimplifiee
    ? (values.demarcheSimplifiees || [])
        .filter((demarche) => demarche.number)
        .map((demarche) => ({
          number: Number(demarche.number),
          name: demarche.name ?? null,
          url: demarche.url ?? null,
          annotationKey: demarche.annotationKey ?? null,
          birthDateField: demarche.birthDateField ?? null,
          countryField: demarche.countryField ?? null,
          postalCodeField: demarche.postalCodeField ?? null,
        }))
    : [],
});

export const withLegacyPublisher = (publisher = {}) => {
  if (!publisher) return publisher;
  const relations = Array.isArray(publisher.publishers)
    ? publisher.publishers.map((relation) => ({
        ...relation,
        publisherId: relation.publisherId ?? relation.id,
      }))
    : publisher.publishers;

  return { ...publisher, _id: publisher._id ?? publisher.id, publishers: relations || [] };
};

export const withLegacyPublishers = (items = []) => items.map((publisher) => withLegacyPublisher(publisher));

export const validatePublisher = (values) => {
  const errors = {};
  if (!values.name?.trim()) {
    errors.name = "Veuillez renseigner le nom du partenaire.";
  }
  if (!values.isAnnonceur && !values.isDiffuseur) {
    errors.settings = "Veuillez activer le mode annonceur, diffuseur, ou les deux.";
  }
  if (values.isAnnonceur && !values.missionType) {
    errors.missionType = "Veuillez sélectionner un type de mission.";
  }
  if (values.isAnnonceur && (values.expectedApplications === null || values.expectedApplications === undefined)) {
    errors.expectedApplications = "Veuillez indiquer si des candidatures sont attendues.";
  }
  if (values.isDiffuseur && !values.category) {
    errors.category = "Veuillez sélectionner une catégorie de diffuseur.";
  }
  if (values.isDiffuseur && !values.hasApiRights && !values.hasWidgetRights && !values.hasCampaignRights) {
    errors.mode = "Veuillez sélectionner au moins un moyen de diffusion.";
  }
  return errors;
};

export { formatPublishersForApi, sanitizeNullableString };
