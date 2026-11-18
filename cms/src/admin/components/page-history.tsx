import { Box, Button, Flex, Modal, SingleSelect, SingleSelectOption, Typography } from "@strapi/design-system";
import { ClockCounterClockwise } from "@strapi/icons";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_UID = "api::page.page";
const VERSION_UID = "api::page-version.page-version";

type Version = { documentId: string; action: string; author: string | null; createdAt: string; snapshot: Record<string, unknown> };
type Group = { key: string; versions: Version[] };

const LABELS: Record<string, string> = { create: "Création", update: "Enregistrement", publish: "Publication" };

const dayOf = (iso: string) => iso.slice(0, 10);
const monthLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const dateLabel = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
};
// Couleur stable par auteur.
const authorColor = (author: string | null) => {
  const hash = [...(author ?? "?")].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 360, 7);
  return `hsl(${hash} 55% 45%)`;
};

// Regroupe les versions consécutives d'un même auteur le même jour (la plus récente en tête).
const groupVersions = (versions: Version[]): Group[] =>
  versions.reduce<Group[]>((groups, version) => {
    const last = groups[groups.length - 1];
    const head = last?.versions[0];
    if (head && head.author === version.author && dayOf(head.createdAt) === dayOf(version.createdAt) && version.action !== "publish" && head.action !== "publish") {
      last.versions.push(version);
    } else {
      groups.push({ key: version.documentId, versions: [version] });
    }
    return groups;
  }, []);

const Row = ({ version, current, restoring, onRestore }: { version: Version; current: boolean; restoring: boolean; onRestore: (version: Version) => void }) => (
  <Flex justifyContent="space-between" alignItems="center" gap={3} paddingTop={2} paddingBottom={2}>
    <Box>
      <Typography fontWeight="bold" tag="p">
        {dateLabel(version.createdAt)}
      </Typography>
      <Typography variant="pi" textColor="neutral600" tag="p">
        {current ? "Version actuelle" : (LABELS[version.action] ?? version.action)}
      </Typography>
      <Flex gap={2} alignItems="center">
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: authorColor(version.author) }} />
        <Typography variant="pi" tag="span">
          {version.author ?? "Auteur inconnu"}
        </Typography>
      </Flex>
    </Box>
    {!current && (
      <Button variant="tertiary" size="S" loading={restoring} onClick={() => onRestore(version)}>
        Restaurer
      </Button>
    )}
  </Flex>
);

const History = ({ documentId }: { documentId: string }) => {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [onlyPublished, setOnlyPublished] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = `filters[pageDocumentId][$eq]=${documentId}&sort=createdAt:desc&page=1&pageSize=50`;
    const { data } = await get<{ results: Version[] }>(`/content-manager/collection-types/${VERSION_UID}?${query}`);
    setVersions(data.results);
  }, [get, documentId]);

  useEffect(() => {
    load().catch(() => setVersions([]));
  }, [load]);

  const currentId = versions?.[0]?.documentId;
  const groups = useMemo(() => groupVersions((versions ?? []).filter((version) => !onlyPublished || version.action === "publish")), [versions, onlyPublished]);

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

  if (versions === null) {
    return <Typography variant="pi">Chargement…</Typography>;
  }
  if (versions.length === 0) {
    return <Typography variant="pi">Aucune version enregistrée.</Typography>;
  }

  let month = "";
  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <SingleSelect aria-label="Filtrer les versions" value={onlyPublished ? "publish" : "all"} onChange={(value: string | number) => setOnlyPublished(value === "publish")}>
        <SingleSelectOption value="all">Toutes les versions</SingleSelectOption>
        <SingleSelectOption value="publish">Publications uniquement</SingleSelectOption>
      </SingleSelect>
      {groups.length === 0 && <Typography variant="pi">Aucune publication.</Typography>}
      {groups.map(({ key, versions: items }) => {
        const [head, ...older] = items;
        const label = monthLabel(head.createdAt);
        const showMonth = label !== month;
        month = label;
        const open = expanded.has(key);
        return (
          <Box key={key}>
            {showMonth && (
              <Typography variant="sigma" textColor="neutral600" tag="p" paddingTop={3}>
                {label}
              </Typography>
            )}
            <Row version={head} current={head.documentId === currentId} restoring={restoring === head.documentId} onRestore={restore} />
            {older.length > 0 && (
              <Box paddingLeft={4}>
                <Button variant="ghost" size="S" onClick={() => setExpanded((prev) => (open ? new Set([...prev].filter((k) => k !== key)) : new Set(prev).add(key)))}>
                  {open ? "Masquer" : `${older.length} enregistrement${older.length > 1 ? "s" : ""} plus ancien${older.length > 1 ? "s" : ""}`}
                </Button>
                {open &&
                  older.map((version) => <Row key={version.documentId} version={version} current={false} restoring={restoring === version.documentId} onRestore={restore} />)}
              </Box>
            )}
          </Box>
        );
      })}
    </Flex>
  );
};

// Panneau latéral de la page : un bouton « Historique » ouvre la liste des versions dans une modale (sans toucher au formulaire ni au block builder).
export const PageHistoryPanel = ({ model, documentId }: { model: string; documentId?: string }) => {
  if (model !== PAGE_UID || !documentId) {
    return null;
  }
  return {
    title: "Historique",
    content: (
      <Modal.Root>
        <Modal.Trigger>
          <Button variant="secondary" startIcon={<ClockCounterClockwise />} fullWidth>
            Voir les versions
          </Button>
        </Modal.Trigger>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Historique des versions</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <History documentId={documentId} />
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    ),
  };
};
