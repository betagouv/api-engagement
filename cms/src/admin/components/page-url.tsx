import { Box, Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useForm } from "@strapi/strapi/admin";
import { useEffect, useState } from "react";

const PAGE_UID = "api::page.page";
const REDIRECT_UID = "api::page-redirect.page-redirect";
// Domaine public du site, inliné au build de l'admin (cf. Dockerfile.production) ; vide en dev : on affiche le chemin seul.
const BASE_URL = (process.env.STRAPI_ADMIN_PLATEFORM_URL ?? "").replace(/\/$/, "");

const UrlPreview = ({ documentId }: { documentId: string }) => {
  const { get } = useFetchClient();
  const slug = useForm("PageUrl", (state) => state.values.slug) as string | undefined;
  const [published, setPublished] = useState<string | null | undefined>(undefined);
  const [previous, setPrevious] = useState<string[]>([]);

  useEffect(() => {
    get<{ data?: { slug?: string } }>(`/content-manager/collection-types/${PAGE_UID}/${documentId}?status=published`)
      .then(({ data }) => setPublished(data.data?.slug ?? null))
      .catch(() => setPublished(null));
    get<{ results: { fromSlug: string }[] }>(`/content-manager/collection-types/${REDIRECT_UID}?filters[pageDocumentId][$eq]=${documentId}&pageSize=100`)
      .then(({ data }) => setPrevious(data.results.map((r) => r.fromSlug)))
      .catch(() => setPrevious([]));
  }, [get, documentId]);

  const url = (path: string) => `${BASE_URL}/${path}`;
  const renamed = Boolean(slug && published && slug !== published);
  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="pi">URL de la page publiée</Typography>
      <Typography fontWeight="bold" style={{ wordBreak: "break-all" }}>
        {slug ? url(slug) : "—"}
      </Typography>
      {renamed && (
        <Typography variant="pi" textColor="warning600">
          À la publication, {url(published!)} redirigera (301) vers cette URL.
        </Typography>
      )}
      {previous.length > 0 && (
        <Box>
          <Typography variant="pi">Anciennes URL redirigées ici :</Typography>
          {previous.map((from) => (
            <Typography key={from} variant="pi" tag="p" style={{ wordBreak: "break-all" }}>
              {url(from)}
            </Typography>
          ))}
        </Box>
      )}
    </Flex>
  );
};

// Panneau latéral : URL finale de la page (live avec le champ slug) et redirections liées. Voir src/slug-redirects.ts.
export const PageUrlPanel = ({ model, documentId }: { model: string; documentId?: string }) => {
  if (model !== PAGE_UID || !documentId) {
    return null;
  }
  return { title: "URL de la page", content: <UrlPreview documentId={documentId} /> };
};
