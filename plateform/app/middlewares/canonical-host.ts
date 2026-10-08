import { redirect } from "react-router";
import { getCanonicalRedirectUrl, getLegacyHostRedirectUrl } from "~/utils/canonical-host";
import type { Route } from "../+types/root";

export const canonicalHostMiddleware: Route.MiddlewareFunction = ({ request }) => {
  const legacyUrl = getLegacyHostRedirectUrl(request.url, process.env.PLATEFORM_LEGACY_HOSTNAME, process.env.PLATEFORM_HOSTNAME);
  if (legacyUrl) throw redirect(legacyUrl, 301);

  const redirectUrl = getCanonicalRedirectUrl(request.url, process.env.PLATEFORM_HOSTNAME);
  if (redirectUrl) throw redirect(redirectUrl, 308);
};
