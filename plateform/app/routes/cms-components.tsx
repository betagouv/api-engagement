import { Fragment } from "react";
import { data, Link, useLoaderData } from "react-router";

import { type CmsBlocksContext } from "~/components/cms";
import ComponentPreview from "~/components/cms/component-preview";
import { CMS_COMPONENT_EXAMPLES, CMS_COMPONENT_MISSION_DETAIL, CMS_COMPONENT_MISSIONS } from "~/config/cms-components";
import type { CmsBlock } from "~/types/cms";
import { type CmsComponentField, getBlockSchema } from "~/services/cms-components.server";
import { CMS_PUBLIC_URL } from "~/services/cms.server";

import type { Route } from "./+types/cms-components";

// Page interne des composants du CMS : rendu de chaque bloc avec des données d'exemple et liste de ses champs,
// lue dans les schémas Strapi (cms/src/components). Non indexée, affichée dans l'admin Strapi (menu « Composants du CMS »).
export function meta(): Route.MetaDescriptors {
  return [{ title: "Composants du CMS" }, { name: "robots", content: "noindex, nofollow" }];
}

const BLOCK_UIDS = [...new Set(CMS_COMPONENT_EXAMPLES.map(({ block }) => block.__component))];

const CONTEXT: CmsBlocksContext = {
  landing: "landing_cms_components",
  path: "/_cms/components",
  missionsByBlock: { 0: CMS_COMPONENT_MISSIONS },
  missionDetailsByBlock: { 0: CMS_COMPONENT_MISSION_DETAIL },
  onStartQuiz: () => {},
  missionsCta: () => ({ to: "/quiz/age", label: "Trouver ma mission", onClick: () => {} }),
};

// Seule l'admin Strapi peut afficher la page en iframe.
export function headers() {
  return { "Content-Security-Policy": `frame-ancestors 'self' ${CMS_PUBLIC_URL}` };
}

export async function loader({ request }: Route.LoaderArgs) {
  // Ouverte directement dans un onglet (hors iframe de l'admin Strapi) : 404. Les navigations internes (`?bloc=`) sont des
  // requêtes `fetch` (`Sec-Fetch-Dest: empty`), elles restent autorisées.
  if (request.headers.get("Sec-Fetch-Dest") === "document") throw data("Page introuvable", { status: 404 });
  // Bloc affiché : `?bloc=blocks.hero` (lien partageable), le premier par défaut.
  const requested = new URL(request.url).searchParams.get("bloc");
  const selected = requested && BLOCK_UIDS.includes(requested as CmsBlock["__component"]) ? requested : BLOCK_UIDS[0];
  const displayNames: Record<string, string> = {};
  for (const uid of BLOCK_UIDS) displayNames[uid] = getBlockSchema(uid)?.displayName ?? uid;
  return { displayNames, selected, schema: getBlockSchema(selected) };
}

export default function CmsComponents() {
  const { displayNames, selected, schema } = useLoaderData<typeof loader>();
  const examples = CMS_COMPONENT_EXAMPLES.filter(({ block }) => block.__component === selected);

  return (
    <main id="contenu" tabIndex={-1} className="pb-16">
      {/* Menu horizontal collant, défilable latéralement : le contenu garde toute la largeur de l'écran. */}
      <nav aria-label="Blocs du CMS" className="sticky top-0 z-20 border-b border-gray-300 bg-(--background-default-grey)">
        <ul className="fr-container flex list-none! gap-2 overflow-x-auto py-3!">
          {BLOCK_UIDS.map((uid) => (
            <li key={uid} className="shrink-0 p-0!">
              <Link
                to={`?bloc=${uid}`}
                aria-current={uid === selected ? "page" : undefined}
                className={`fr-tag whitespace-nowrap ${uid === selected ? "bg-(--background-active-blue-france)! text-(--text-inverted-blue-france)!" : ""}`}
              >
                {displayNames[uid]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <div className="fr-container pt-8 md:pt-12">
          <p className="fr-text--sm text-mention-grey! mb-1!">Composants du CMS</p>
          <h1 className="mb-1!">{displayNames[selected]}</h1>
          <p className="fr-text--sm text-mention-grey! mb-4!">
            <code>{selected}</code>
          </p>
          {schema?.description && <p>{schema.description}</p>}
        </div>

        {schema && <ComponentPreview key={selected} uid={selected} fields={schema.fields} examples={examples} context={CONTEXT} />}

        {schema && (
          <div className="fr-container">
            <h2 className="fr-h4">Référence des champs</h2>
            <p className="fr-text--sm text-mention-grey!">* champ obligatoire</p>
            <div className="fr-table fr-table--sm">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table>
                      <caption className="fr-sr-only">Champs du bloc {schema.displayName}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Champ</th>
                          <th scope="col">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <FieldRows fields={schema.fields} depth={0} />
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function FieldRows({ fields, depth }: { fields: CmsComponentField[]; depth: number }) {
  return fields.map((field) => (
    <Fragment key={field.name}>
      <tr>
        <td style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}>
          {depth > 0 && "↳ "}
          <code>{field.name}</code>
          {field.required && " *"}
        </td>
        <td>
          {field.description && <p className="fr-text--sm mb-1!">{field.description}</p>}
          <p className="fr-text--xs text-mention-grey! mb-1!">{field.typeLabel}</p>
          {field.options.length > 0 && (
            <ul className="fr-tags-group">
              {field.options.map((option) => (
                <li key={option}>
                  <p className="fr-tag fr-tag--sm">
                    {option}
                    {option === field.defaultValue && " (défaut)"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {field.options.length === 0 && field.defaultValue && (
            <ul className="fr-tags-group">
              <li>
                <p className="fr-tag fr-tag--sm">défaut : {field.defaultValue}</p>
              </li>
            </ul>
          )}
        </td>
      </tr>
      <FieldRows fields={field.children} depth={depth + 1} />
    </Fragment>
  ));
}
