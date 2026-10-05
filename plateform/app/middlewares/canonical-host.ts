import { redirect } from "react-router";
import { getCanonicalRedirectUrl } from "~/utils/canonical-host";
import type { Route } from "../+types/root";

export const canonicalHostMiddleware: Route.MiddlewareFunction = ({ request }) => {
  const redirectUrl = getCanonicalRedirectUrl(request.url, process.env.PLATEFORM_HOSTNAME);
  if (redirectUrl) throw redirect(redirectUrl, 308);
};
