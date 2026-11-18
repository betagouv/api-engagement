import { errors } from "@strapi/utils";

import { RESERVED_SLUGS } from "../../reserved-slugs";

const assertSlugFree = ({ params }: { params: { data?: { slug?: string } } }) => {
  const root = params.data?.slug?.split("/")[0];
  if (root && RESERVED_SLUGS.includes(root)) throw new errors.ApplicationError(`« ${root} » est réservé par le site : choisir un autre slug.`);
};

export default { beforeCreate: assertSlugFree, beforeUpdate: assertSlugFree };
