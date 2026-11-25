import { Flex, Typography } from "@strapi/design-system";
import { useFetchClient, useForm } from "@strapi/strapi/admin";
import { useEffect, useState } from "react";

const PAGE_UID = "api::page.page";

type Block = { __component: string };
type Problem = { path: string[]; message: string };

// Aplatit l'arbre d'erreurs du formulaire (imbriqué ou à clés pointées) en liste « chemin → message ».
const flatten = (value: unknown, path: string[] = []): Problem[] => {
  if (typeof value === "string") {
    return [{ path, message: value }];
  }
  if (value && typeof value === "object") {
    const message = (value as { defaultMessage?: unknown }).defaultMessage;
    if (typeof message === "string") {
      return [{ path, message }];
    }
    return Object.entries(value).flatMap(([key, child]) => flatten(child, [...path, ...key.split(".")]));
  }
  return [];
};

const ErrorList = () => {
  const { get } = useFetchClient();
  const errors = useForm("PageErrors", (state) => state.errors);
  const blocks = useForm("PageErrors", (state) => (state.values as { blocks?: Block[] }).blocks);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    get<{ data: { uid: string; info: { displayName: string } }[] }>("/content-manager/components")
      .then(({ data }) => setNames(Object.fromEntries(data.data.map((component) => [component.uid, component.info.displayName]))))
      .catch(() => {});
  }, [get]);

  const problems = flatten(errors);
  // Un chemin `blocks.2.title.…` devient « Bloc n°3 · Nom du bloc › title ».
  const where = ({ path }: Problem) => {
    if (path[0] !== "blocks" || !/^\d+$/.test(path[1] ?? "")) {
      return path.join(" › ") || "Page";
    }
    const index = Number(path[1]);
    const uid = blocks?.[index]?.__component;
    return `Bloc n°${index + 1} · ${(uid && names[uid]) || uid || "?"}${path.length > 2 ? ` › ${path.slice(2).join(" › ")}` : ""}`;
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      {problems.map((problem) => (
        <div key={`${problem.path.join(".")}-${problem.message}`}>
          <Typography variant="pi" fontWeight="bold" tag="p">
            {where(problem)}
          </Typography>
          <Typography variant="pi" textColor="danger600" tag="p">
            {problem.message}
          </Typography>
        </div>
      ))}
    </Flex>
  );
};

// Panneau latéral de l'édition d'une page : champs manquants ou invalides, avec le bloc concerné. Absent tant qu'il n'y a pas d'erreur.
export const PageErrorsPanel = ({ model }: { model: string }) => {
  const hasErrors = useForm("PageErrorsPanel", (state) => flatten(state.errors).length > 0);
  if (model !== PAGE_UID || !hasErrors) {
    return null;
  }
  return { title: "Erreurs de validation", content: <ErrorList /> };
};
