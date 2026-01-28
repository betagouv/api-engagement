import { useEffect, useState } from "react";
import { toast } from "@/services/toast";

import Autocomplete from "@/components/Autocomplete";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { DOMAINS } from "../../components/Constants";

const OrganizationTab = ({ data, onChange }) => {
  const { publisher } = useStore();
  const [values, setValues] = useState({
    missionOrganizationSirenVerified: data.missionOrganizationSirenVerified,
    missionOrganizationRNAVerified: data.missionOrganizationRNAVerified,
  });
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValues({
      missionOrganizationSirenVerified: data.missionOrganizationSirenVerified,
      missionOrganizationRNAVerified: data.missionOrganizationRNAVerified,
    });
  }, [data]);

  useEffect(() => {
    if (search.length < 3) return;
    const abortController = new AbortController();
    const delay = setTimeout(() => {
      const fetchOrganizations = async () => {
        try {
          setLoading(true);
          const res = await api.post(`/organization/search`, { search }, { signal: abortController.signal });
          if (!res.ok) throw res;
          setOrganizations(
            res.data.map((org) => ({
              label: `${org.title}${org.rna ? ` - ${org.rna}` : ""}${org.siren ? ` - ${org.siren}` : ""}`,
              id: org.id,
              rna: org.rna,
              siren: org.siren,
            })),
          );
          setLoading(false);
        } catch (error) {
          captureError(error, { extra: { search } });
        }
      };
      fetchOrganizations();
    }, 400);

    return () => {
      clearTimeout(delay);
      abortController.abort();
    };
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const obj = {};
      if (values.missionOrganizationSirenVerified !== data.missionOrganizationSirenVerified) obj.missionOrganizationSirenVerified = values.missionOrganizationSirenVerified;
      if (values.missionOrganizationRNAVerified !== data.missionOrganizationRNAVerified) obj.missionOrganizationRNAVerified = values.missionOrganizationRNAVerified;

      const resU = await api.put(`/moderation/${data.id}`, { ...obj, moderatorId: publisher.id });
      if (!resU.ok) throw resU;
      toast.success("Les données de l'organisation ont été modifiées avec succès", {
        position: "bottom-right",
      });

      onChange(resU.data);
    } catch (error) {
      captureError(
        error,
        { extra: { data, values } },
        {
          position: "bottom-right",
        },
      );
    }
  };

  return (
    <>
      <form className="flex h-full divide-x" onSubmit={handleSubmit}>
        <div className="flex flex-1 flex-col gap-2 p-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm" htmlFor="organization-name">
              Nom de l'organisation
            </label>
            <input id="organization-name" className="input mb-2" readOnly name="organization-name" defaultValue={data.missionOrganizationName} />
          </div>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-sm" htmlFor="organization-siren">
              SIREN
            </label>
            <Autocomplete
              options={organizations}
              loading={loading}
              value={values.missionOrganizationSirenVerified}
              onChange={(e) => setValues({ ...values, missionOrganizationSirenVerified: e })}
              onSelect={(e) =>
                setValues({ ...values, missionOrganizationSirenVerified: e.siren || null, missionOrganizationId: e.id, missionOrganizationRNAVerified: e.rna || null })
              }
              onClear={() => setValues({ ...values, missionOrganizationSirenVerified: null, missionOrganizationId: null, missionOrganizationRNAVerified: null })}
              placeholder="SIREN"
              className="w-full"
            />
            <p className="text-text-mention text-xs">
              <span className="mr-1 font-semibold">SIREN d'origine:</span>
              {data.missionOrganizationSiren ? data.missionOrganizationSiren : "/"}
            </p>
          </div>
          <div className="flex flex-col space-y-2 py-2">
            <label className="text-sm" htmlFor="organization-rna">
              RNA
            </label>
            <Autocomplete
              options={organizations}
              loading={loading}
              value={values.missionOrganizationRNAVerified}
              onChange={(e) => {
                setValues({ ...values, missionOrganizationRNAVerified: e });
                setSearch(e);
              }}
              onSelect={(e) =>
                setValues({
                  missionOrganizationRNAVerified: e.rna || null,
                  missionOrganizationSirenVerified: e.siren || null,
                })
              }
              onClear={() => setValues({ missionOrganizationRNAVerified: null, missionOrganizationSirenVerified: null })}
              placeholder="RNA"
              className="w-full"
            />
            <p className="text-text-mention text-xs">
              <span className="mr-1 font-semibold">RNA d'origine:</span>
              {data.missionOrganizationRNA ? data.missionOrganizationRNA : "/"}
            </p>
          </div>
          {(values.missionOrganizationSirenVerified !== data.missionOrganizationSirenVerified || values.missionOrganizationRNAVerified !== data.missionOrganizationRNAVerified) && (
            <button className="primary-btn mt-4 w-[25%]" type="submit">
              Enregistrer
            </button>
          )}

          <div className="border-grey-border flex flex-col gap-2 border-t py-4">
            <label className="text-sm" htmlFor="title">
              Adresse
            </label>
            <p className="text-text-mention text-sm">{data.missionOrganizationFullAddress ? data.missionOrganizationFullAddress : "/"}</p>
          </div>
          <div className="border-grey-border flex flex-col gap-2 border-t py-4">
            <label className="text-sm" htmlFor="title">
              Domaine d'action
            </label>
            <p className="text-text-mention text-sm">{DOMAINS[data.missionDomain]}</p>
          </div>
          <div className="border-grey-border flex flex-col gap-2 border-t py-4">
            <label className="text-sm" htmlFor="title">
              Organisation déjà inscrite sur
            </label>
            <p className="text-text-mention text-sm">
              {/* {data.associationSources?.length ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : "/"} */}
            </p>
          </div>
          <div className="border-grey-border flex flex-col gap-2 border-t py-4">
            <label className="text-sm" htmlFor="title">
              Site internet
            </label>
            <a href={data.missionOrganizationUrl} className="text-blue-france text-sm underline" target="_blank">
              {data.missionOrganizationUrl}
            </a>
          </div>
        </div>
      </form>
    </>
  );
};

export default OrganizationTab;
