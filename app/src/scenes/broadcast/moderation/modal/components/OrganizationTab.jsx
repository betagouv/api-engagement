import { toast } from "@/services/toast";
import { useEffect, useState } from "react";

import Combobox from "@/components/combobox";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { DOMAINS } from "../../components/Constants";

const OrganizationTab = ({ data, onChange }) => {
  const { publisher } = useStore();
  const [values, setValues] = useState({
    organizationVerifiedId: data.missionOrganizationVerifiedId,
    siren: data.missionOrganizationSirenVerified,
    rna: data.missionOrganizationRNAVerified,
  });
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    setValues({
      organizationVerifiedId: data.missionOrganizationVerifiedId,
      siren: data.missionOrganizationSirenVerified,
      rna: data.missionOrganizationRNAVerified,
    });
  }, [data]);

  const fetchOrganizations = async (search) => {
    try {
      const res = await api.post(`/organization/search`, { search });
      if (!res.ok) throw res;
      setOrganizations(
        res.data.map((org) => ({
          label: `${org.title}${org.rna ? ` - ${org.rna}` : ""}${org.siren ? ` - ${org.siren}` : ""}`,
          id: org.id,
          rna: org.rna,
          siren: org.siren,
        })),
      );
    } catch (error) {
      captureError(error, { extra: { search } });
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resU = await api.put(`/moderation/${data.id}`, {
        rna: values.rna ?? null,
        siren: values.siren ?? null,
        organizationVerifiedId: values.organizationVerifiedId ?? null,
        moderatorId: publisher.id,
      });
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

  console.log("data", {
    organizationVerifiedId: data.missionOrganizationVerifiedId,
    siren: data.missionOrganizationSirenVerified,
    rna: data.missionOrganizationRNAVerified,
  });
  console.log("values", values);

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
            <Combobox
              options={organizations}
              value={values.siren}
              onSearch={fetchOrganizations}
              onChange={(e) => setValues({ ...values, siren: e })}
              onSelect={(e) => setValues({ ...values, siren: e?.siren || null, rna: e?.rna || null, organizationVerifiedId: e?.id })}
              by="siren"
              getLabel={(o) => o?.siren || ""}
              placeholder="SIREN"
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
            <Combobox
              options={organizations}
              value={values.rna}
              onSearch={fetchOrganizations}
              onChange={(e) => setValues({ ...values, rna: e })}
              onSelect={(e) => setValues({ ...values, rna: e?.rna || null, siren: e?.siren || null, organizationVerifiedId: e?.id })}
              by="rna"
              getLabel={(o) => o?.rna || ""}
              placeholder="RNA"
            />
            <p className="text-text-mention text-xs">
              <span className="mr-1 font-semibold">RNA d'origine:</span>
              {data.missionOrganizationRNA ? data.missionOrganizationRNA : "/"}
            </p>
          </div>
          {(values.siren !== data.missionOrganizationSirenVerified || values.rna !== data.missionOrganizationRNAVerified) && (
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
