import { Box, Button, Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { useCallback, useEffect, useState } from "react";

const PAGE_UID = "api::page.page";
const VERSION_UID = "api::page-version.page-version";

type Version = { documentId: string; action: string; author: string | null; createdAt: string; snapshot: Record<string, unknown> };

const LABELS: Record<string, string> = { create: "Création", update: "Enregistrement", publish: "Publication" };

const History = ({ documentId }: { documentId: string }) => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [versions, setVersions] = useState<Version[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = `filters[pageDocumentId][$eq]=${documentId}&sort=createdAt:desc&page=1&pageSize=50`;
    const { data } = await get<{ results: Version[] }>(`/content-manager/collection-types/${VERSION_UID}?${query}`);
    setVersions(data.results);
  }, [get, documentId]);

  useEffect(() => {
    load().catch(() => setVersions([]));
  }, [load]);

  const restore = async (version: Version) => {
    if (!window.confirm("Restaurer cette version ? Le brouillon actuel sera remplacé (il reste dans l'historique).")) {
      return;
    }
    setRestoring(version.documentId);
    try {
      await put(`/content-manager/collection-types/${PAGE_UID}/${documentId}`, version.snapshot);
      window.location.reload();
    } catch {
      toggleNotification({ type: "danger", message: "La restauration a échoué." });
      setRestoring(null);
    }
  };

  if (versions.length === 0) {
    return <Typography variant="pi">Aucune version enregistrée.</Typography>;
  }
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      {versions.map((version) => (
        <Box key={version.documentId}>
          <Typography variant="pi" fontWeight="bold" tag="p">
            {LABELS[version.action] ?? version.action}
            {version.author ? ` · ${version.author}` : ""}
          </Typography>
          <Typography variant="pi" textColor="neutral600" tag="p">
            {new Date(version.createdAt).toLocaleString("fr-FR")}
          </Typography>
          <Button variant="tertiary" size="S" loading={restoring === version.documentId} onClick={() => restore(version)}>
            Restaurer
          </Button>
        </Box>
      ))}
    </Flex>
  );
};

// Panneau latéral de l'édition d'une page : historique et restauration (sans toucher au formulaire ni au block builder).
export const PageHistoryPanel = ({ model, documentId }: { model: string; documentId?: string }) => {
  if (model !== PAGE_UID || !documentId) {
    return null;
  }
  return { title: "Historique", content: <History documentId={documentId} /> };
};
