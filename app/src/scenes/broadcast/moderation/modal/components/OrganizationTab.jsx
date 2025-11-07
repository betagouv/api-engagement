import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import Autocomplete from "@/components/Autocomplete";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { DOMAINS } from "../../components/Constants";

const OrganizationTab = ({ data, onChange }) => {
  const { publisher } = useStore();
  const [values, setValues] = useState({
    organizationId: data.organizationId,
    organizationSirenVerified: data.organizationSirenVerified,
    organizationRNAVerified: data.organizationRNAVerified,
  });
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [manyUpdateWhere, setManyUpdateWhere] = useState({});
  const [manyUpdateTotal, setManyUpdateTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOrganizationUpdateOpen, setIsOrganizationUpdateOpen] = useState(false);

  useEffect(() => {
    setValues({
      organizationId: data.organizationId,
      organizationSirenVerified: data.organizationSirenVerified,
      organizationRNAVerified: data.organizationRNAVerified,
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
              id: org._id,
              rna: org.rna,
              siren: org.siren,
            })),
          );
          setLoading(false);
        } catch (error) {
          if (error.name === "AbortError") return;
          captureError(error, "Erreur lors de la récupération des organisations");
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
      if (values.organizationId !== data.organizationId) obj.organizationId = values.organizationId;
      if (values.organizationSirenVerified !== data.organizationSirenVerified) obj.organizationSirenVerified = values.organizationSirenVerified;
      if (values.organizationRNAVerified !== data.organizationRNAVerified) obj.organizationRNAVerified = values.organizationRNAVerified;

      const resU = await api.put(`/moderation/${data._id}`, { ...obj, moderatorId: publisher._id });
      if (!resU.ok) throw resU;
      toast.success("Les données de l'organisation ont été modifiées avec succès", {
        position: "bottom-right",
      });

      // Remove name from previous organization
      if (data.organizationId) {
        const resO = await api.put(`/organization/${data.organizationId}`, {
          unnamed: data.organizationName,
        });
        if (!resO.ok) throw resO;
      }

      if (values.organizationId) {
        // Update new organization
        const resO = await api.put(`/organization/${values.organizationId}`, {
          name: data.organizationName,
          rna: values.organizationRNAVerified || "",
          siren: values.organizationSirenVerified || "",
        });
        if (!resO.ok) throw resO;

        const where = { moderatorId: publisher._id, organizationClientId: data.organizationClientId, size: 0 };
        if (values.organizationRNAVerified) where.organizationRNAVerified = { $ne: values.organizationRNAVerified };
        if (values.organizationSirenVerified) where.organizationSirenVerified = { $ne: values.organizationSirenVerified };
        const resM = await api.post("/moderation/search", where);
        if (!resM.ok) throw resM;

        if (resM.total > 0) {
          setManyUpdateWhere({ ...where, organizationName: data.organizationName });
          setManyUpdateTotal(resM.total);
          setIsOrganizationUpdateOpen(true);
        }
      } else {
        // Clear organization
        const where = { moderatorId: publisher._id, organizationClientId: data.organizationClientId, size: 0 };
        if (data.organizationRNAVerified) where.organizationRNAVerified = data.organizationRNAVerified;
        if (data.organizationSirenVerified) where.organizationSirenVerified = data.organizationSirenVerified;
        const resM = await api.post("/moderation/search", where);
        if (!resM.ok) throw resM;

        if (resM.total > 0) {
          setManyUpdateWhere({ ...where, organizationName: data.organizationName });
          setManyUpdateTotal(resM.total);
          setIsOrganizationUpdateOpen(true);
        }
      }

      onChange(resU.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de la mission", {
        position: "bottom-right",
      });
    }
  };

  return (
    <>
      <OrganizationUpdateModal
        isOpen={isOrganizationUpdateOpen}
        total={manyUpdateTotal}
        where={manyUpdateWhere}
        onClose={() => setIsOrganizationUpdateOpen(false)}
        update={values}
        onChange={onChange}
      />
      <form className="flex h-full divide-x" onSubmit={handleSubmit}>
        <div className="flex flex-1 flex-col gap-2 p-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm" htmlFor="organization-name">
              Nom de l'organisation
            </label>
            <input id="organization-name" className="input mb-2" disabled name="organization-name" defaultValue={data.organizationName} />
          </div>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-sm" htmlFor="organization-siren">
              SIREN
            </label>
            <Autocomplete
              options={organizations}
              loading={loading}
              value={values.organizationSirenVerified}
              onChange={(e) => setValues({ ...values, organizationSirenVerified: e })}
              onSelect={(e) => setValues({ ...values, organizationSirenVerified: e.siren || null, organizationId: e.id, organizationRNAVerified: e.rna || null })}
              onClear={() => setValues({ ...values, organizationSirenVerified: null, organizationId: null, organizationRNAVerified: null })}
              placeholder="SIREN"
              className="w-full"
            />
            <p className="text-gray-425 text-xs">
              <span className="mr-1 font-semibold">SIREN d'origine:</span>
              {data.organizationSiren ? data.organizationSiren : "/"}
            </p>
          </div>
          <div className="flex flex-col space-y-2 py-2">
            <label className="text-sm" htmlFor="organization-rna">
              RNA
            </label>
            <Autocomplete
              options={organizations}
              loading={loading}
              value={values.organizationRNAVerified}
              onChange={(e) => {
                setValues({ ...values, organizationRNAVerified: e });
                setSearch(e);
              }}
              onSelect={(e) => setValues({ ...values, organizationRNAVerified: e.rna || null, organizationId: e.id, organizationSirenVerified: e.siren || null })}
              onClear={() => setValues({ ...values, organizationRNAVerified: null, organizationId: null, organizationSirenVerified: null })}
              placeholder="RNA"
              className="w-full"
            />
            <p className="text-gray-425 text-xs">
              <span className="mr-1 font-semibold">RNA d'origine:</span>
              {data.organizationRNA ? data.organizationRNA : "/"}
            </p>
          </div>
          {(values.organizationSirenVerified !== data.organizationSirenVerified || values.organizationRNAVerified !== data.organizationRNAVerified) && (
            <button className="primary-btn mt-4 w-[25%]" type="submit">
              Enregistrer
            </button>
          )}

          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Adresse
            </label>
            <p className="text-gray-425 text-sm">{data.organizationFullAddress ? data.organizationFullAddress : "/"}</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Domaine d'action
            </label>
            <p className="text-gray-425 text-sm">{DOMAINS[data.domain]}</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Organisation déjà inscrite sur
            </label>
            <p className="text-gray-425 text-sm">
              {data.associationSources?.length ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : "/"}
            </p>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Site internet
            </label>
            <a href={data.organizationUrl} className="text-blue-france text-sm underline" target="_blank">
              {data.organizationUrl}
            </a>
          </div>
        </div>
      </form>
    </>
  );
};

const OrganizationUpdateModal = ({ isOpen, onClose, total, where, update, onChange }) => {
  const { publisher } = useStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.put(`/moderation/many`, {
        where,
        update: {
          organizationRNAVerified: update.organizationRNAVerified || null,
          organizationSirenVerified: update.organizationSirenVerified || null,
          organizationId: update.organizationId || null,
        },
        moderatorId: publisher._id,
      });
      if (!res.ok) throw res;
      toast.success("Les missions ont été modérées avec succès", {
        position: "bottom-right",
      });
      onChange(res.data);
      onClose();
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des missions", {
        position: "bottom-right",
      });
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-2/3">
      <div className="space-y-8 p-6">
        <h1 className="text-xl font-semibold">
          L'organisation {where.organizationName} a {total > 1 ? `${total} missions` : "une mission"}
        </h1>
        <p className="text-sm text-black">
          Vous venez de mettre à jour {update.organizationSirenVerified ? `le Siren pour ${update.organizationSirenVerified}` : ""}{" "}
          {update.organizationRNAVerified && update.organizationSirenVerified ? "et" : ""} {update.organizationRNAVerified ? `le RNA pour ${update.organizationRNAVerified}` : ""}{" "}
          les données de l’organisation <b>{where.organizationName}</b>.
        </p>
        <p className="text-sm text-black">
          Cette organisation a {total > 1 ? `${total} autres missions` : "une autre mission"} à mettre à jour, voulez-vous modifier les données de l'organisation de{" "}
          {total > 1 ? "ces missions" : "cette mission"} ?
        </p>
        <div className="flex justify-end gap-4">
          <button className="secondary-btn" onClick={onClose}>
            Non, je vais vérifier
          </button>
          <button className="primary-btn flex justify-center" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader className="h-6 w-6" /> : "Oui, mettre à jour"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default OrganizationTab;
