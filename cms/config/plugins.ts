import type { Core } from "@strapi/strapi";

// Médias : disque local en dev ; en déploiement (Scaleway Serverless Containers, disque éphémère), bucket Object Storage
// public en lecture, renseigné par `CMS_MEDIA_BUCKET` (cf. terraform/cms.tf).
export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const bucket = env("CMS_MEDIA_BUCKET");
  if (!bucket) {
    return {};
  }

  const region = env("CMS_MEDIA_REGION", "fr-par");
  return {
    upload: {
      config: {
        provider: "aws-s3",
        providerOptions: {
          baseUrl: `https://${bucket}.s3.${region}.scw.cloud`,
          s3Options: {
            credentials: { accessKeyId: env("SCW_ACCESS_KEY"), secretAccessKey: env("SCW_SECRET_KEY") },
            region,
            endpoint: `https://s3.${region}.scw.cloud`,
            params: { Bucket: bucket, ACL: "public-read" },
          },
        },
        actionOptions: { upload: {}, uploadStream: {}, delete: {} },
      },
    },
  };
};
