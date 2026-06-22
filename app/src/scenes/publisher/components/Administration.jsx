import api from "@/services/api";
import { captureError } from "@/services/error";
import { useEffect, useState } from "react";
import { RiArrowDownSLine } from "react-icons/ri";

const FIELD_LABELS = {
  "publisherOrganization.clientId": "Identifiant de l'organisation",
  "publisherOrganization.parentOrganizations": "Réseau parent de l'organisation",
};

const OPERATOR_LABELS = {
  is: "égal à",
  is_not: "différent de",
  contains: "contient",
  does_not_contain: "ne contient pas",
  is_greater_than: "plus grand que",
  is_less_than: "plus petit que",
  exists: "existe",
  does_not_exist: "n'existe pas",
  starts_with: "commence par",
};

const groupRulesByFieldAndOperator = (rules) => {
  const groups = new Map();
  rules.forEach((rule) => {
    const key = `${rule.field}|${rule.operator}`;
    groups.set(key, [...(groups.get(key) || []), rule]);
  });
  return [...groups.values()];
};

const Administration = ({ values, onChange }) => {
  const [ruleGroups, setRuleGroups] = useState([]);

  useEffect(() => {
    if (!values.id) return;
    const fetchDiffusionRules = async () => {
      try {
        const res = await api.get(`/publisher/${values.id}/diffusion-rules`);
        if (!res.ok) throw res;
        const roots = res.data.filter((rule) => rule.field === "publisherId" && rule.combinedRules?.length);
        if (!roots.length) {
          setRuleGroups([]);
          return;
        }
        const annonceursRes = await api.post("/publisher/search", { ids: roots.map((root) => root.value) });
        if (!annonceursRes.ok) throw annonceursRes;
        const pairs = roots.flatMap((root) =>
          root.combinedRules.filter((rule) => rule.field === "publisherOrganization.clientId").map((rule) => ({ publisherId: root.value, clientId: rule.value })),
        );
        let organizations = [];
        if (pairs.length) {
          const organizationsRes = await api.post("/publisher-organization/search", { pairs });
          if (!organizationsRes.ok) throw organizationsRes;
          organizations = organizationsRes.data;
        }
        setRuleGroups(
          roots.map((root) => ({
            id: root.id,
            annonceurName: annonceursRes.data.find((publisher) => publisher.id === root.value)?.name || root.value,
            rules: root.combinedRules.map((rule) => ({
              ...rule,
              organizationName: organizations.find((organization) => organization.publisherId === root.value && organization.clientId === rule.value)?.name,
            })),
          })),
        );
      } catch (error) {
        captureError(error, { extra: { publisherId: values.id } });
      }
    };
    fetchDiffusionRules();
  }, [values.id]);

  return (
    <div className="flex items-center gap-6">
      {/* <div className="flex flex-1 items-center gap-4">
        <label className="w-1/2 text-base" htmlFor="automated-report">
          Rapport automatisé
        </label>
        <div className="relative">
          <Toggle
            aria-label={values.sendReport ? "Désactiver le rapport automatisé" : "Activer le rapport automatisé"}
            value={values.sendReport}
            onChange={(e) => onChange({ ...values, sendReport: e })}
          />
          {values.sendReport ? <p className="text-blue-france absolute top-8 right-0 text-base">Oui</p> : <p className="absolute top-8 right-0 text-base text-gray-700">Non</p>}
        </div>
      </div> */}
      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-2">
          {ruleGroups.length === 0 && <p className="text-text-mention">Aucune règle spécifique</p>}
          {ruleGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <label className="text-base" htmlFor="diffusionRules">
                Règles <strong>spécifiques</strong> de diffusion pour <strong>{group.annonceurName}</strong>
              </label>

              <div>
                {groupRulesByFieldAndOperator(group.rules).map((rules) => (
                  <details key={`${rules[0].field}|${rules[0].operator}`} className="group border-grey-border border-t last:border-b">
                    <summary className="hover:bg-background-grey-hover flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base text-black">
                      <span>
                        <span className="font-medium">{FIELD_LABELS[rules[0].field] || rules[0].field}</span> {OPERATOR_LABELS[rules[0].operator] || rules[0].operator}{" "}
                        <span className="text-gray-425">({rules.length})</span>
                      </span>
                      <RiArrowDownSLine aria-hidden="true" className="text-blue-france shrink-0 text-xl transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="flex flex-wrap items-center gap-2 px-4 pt-1 pb-6">
                      {rules.map((rule) => (
                        <div key={rule.id} className="rounded-md bg-gray-100 px-2 py-1 text-sm">
                          {rule.organizationName ? `${rule.organizationName} (${rule.value})` : rule.value}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Administration;
