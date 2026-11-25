import { Button, Flex, Modal, SingleSelect, SingleSelectOption, Typography } from "@strapi/design-system";
import { Book } from "@strapi/icons";
import { useFetchClient, useForm } from "@strapi/strapi/admin";
import { useEffect, useState } from "react";

const PAGE_UID = "api::page.page";

const BlockDocs = () => {
  const { get } = useFetchClient();
  // Blocs présents dans la page en cours d'édition (zone dynamique `blocks`), sans doublon.
  const blocks = useForm("BlockDocs", (state) => (state.values as { blocks?: unknown }).blocks as { __component: string }[] | undefined);
  const uids = [...new Set((blocks ?? []).map((block) => block.__component))];
  const [names, setNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>();

  useEffect(() => {
    get<{ data: { uid: string; info: { displayName: string } }[] }>("/content-manager/components")
      .then(({ data }) => setNames(Object.fromEntries(data.data.map((component) => [component.uid, component.info.displayName]))))
      .catch(() => {});
  }, [get]);

  if (uids.length === 0) {
    return <Typography variant="pi">Ajoutez un bloc à la page pour consulter sa documentation.</Typography>;
  }
  const current = selected && uids.includes(selected) ? selected : uids[0];
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <SingleSelect aria-label="Bloc" value={current} onChange={(value: string | number) => setSelected(String(value))}>
        {uids.map((uid) => (
          <SingleSelectOption key={uid} value={uid}>
            {names[uid] ?? uid}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Modal.Root>
        <Modal.Trigger>
          <Button variant="secondary" startIcon={<Book />} fullWidth>
            Voir la documentation
          </Button>
        </Modal.Trigger>
        <Modal.Content style={{ width: "min(1200px, 95vw)", maxWidth: "none" }}>
          <Modal.Header>
            <Modal.Title>Documentation : {names[current] ?? current}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <iframe
              title={`Documentation du bloc ${names[current] ?? current}`}
              src={`/api/cms-components?bloc=${current}`}
              style={{ display: "block", width: "100%", height: "70vh", border: 0 }}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </Flex>
  );
};

// Panneau latéral de l'édition d'une page : documentation (champs + exemple rendu) d'un bloc de la page, affichée dans une modale.
export const BlockDocsPanel = ({ model }: { model: string }) => {
  if (model !== PAGE_UID) {
    return null;
  }
  return { title: "Documentation des blocs", content: <BlockDocs /> };
};
