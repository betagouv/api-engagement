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
    missionOrganizationId: data.missionOrganizationId,
    missionOrganizationSirenVerified: data.missionOrganizationSirenVerified,
    missionOrganizationRNAVerified: data.missionOrganizationRNAVerified,
  });
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [manyUpdateWhere, setManyUpdateWhere] = useState({});
  const [manyUpdateTotal, setManyUpdateTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOrganizationUpdateOpen, setIsOrganizationUpdateOpen] = useState(false);

  useEffect(() => {
    setValues({
      missionOrganizationId: data.missionOrganizationId,
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
      if (values.missionOrganizationId !== data.missionOrganizationId) obj.missionOrganizationId = values.missionOrganizationId;
      if (values.missionOrganizationSirenVerified !== data.missionOrganizationSirenVerified) obj.missionOrganizationSirenVerified = values.missionOrganizationSirenVerified;
      if (values.missionOrganizationRNAVerified !== data.missionOrganizationRNAVerified) obj.missionOrganizationRNAVerified = values.missionOrganizationRNAVerified;

      const resU = await api.put(`/moderation/${data.id}`, { ...obj, moderatorId: publisher.id });
      if (!resU.ok) throw resU;
      toast.success("Les données de l'organisation ont été modifiées avec succès", {
        position: "bottom-right",
      });

      // Remove name from previous organization
      if (data.missionOrganizationId) {
        const resO = await api.put(`/organization/${data.missionOrganizationId}`, {
          unnamed: data.missionOrganizationName,
        });
        if (!resO.ok) throw resO;
      }

      if (values.missionOrganizationId) {
        // Update new organization
        const resO = await api.put(`/organization/${values.missionOrganizationId}`, {
          name: data.missionOrganizationName,
          rna: values.missionOrganizationRNAVerified || "",
          siren: values.missionOrganizationSirenVerified || "",
        });
        if (!resO.ok) throw resO;

        const where = { moderatorId: publisher.id, missionOrganizationClientId: data.missionOrganizationClientId, size: 0 };
        if (values.missionOrganizationRNAVerified) where.missionOrganizationRNAVerified = { $ne: values.missionOrganizationRNAVerified };
        if (values.missionOrganizationSirenVerified) where.missionOrganizationSirenVerified = { $ne: values.missionOrganizationSirenVerified };
        const resM = await api.post("/moderation/search", where);
        if (!resM.ok) throw resM;

        if (resM.total > 0) {
          setManyUpdateWhere({ ...where, missionOrganizationName: data.missionOrganizationName });
          setManyUpdateTotal(resM.total);
          setIsOrganizationUpdateOpen(true);
        }
      } else {
        // Clear organization
        const where = { moderatorId: publisher._id, missionOrganizationClientId: data.missionOrganizationClientId, size: 0 };
        if (data.missionOrganizationRNAVerified) where.missionOrganizationRNAVerified = data.missionOrganizationRNAVerified;
        if (data.missionOrganizationSirenVerified) where.missionOrganizationSirenVerified = data.missionOrganizationSirenVerified;
        const resM = await api.post("/moderation/search", where);
        if (!resM.ok) throw resM;

        if (resM.total > 0) {
          setManyUpdateWhere({ ...where, missionOrganizationName: data.missionOrganizationName });
          setManyUpdateTotal(resM.total);
          setIsOrganizationUpdateOpen(true);
        }
      }

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
            <p className="text-gray-425 text-xs">
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
                  ...values,
                  missionOrganizationRNAVerified: e.rna || null,
                  missionOrganizationId: e.id,
                  missionOrganizationSirenVerified: e.siren || null,
                })
              }
              onClear={() =>
                setValues({ ...values, missionOrganizationRNAVerified: null, missionOrganizationId: null, missionOrganizationSirenVerified: null, missionOrganizationName: null })
              }
              placeholder="RNA"
              className="w-full"
            />
            <p className="text-gray-425 text-xs">
              <span className="mr-1 font-semibold">RNA d'origine:</span>
              {data.missionOrganizationRNA ? data.missionOrganizationRNA : "/"}
            </p>
          </div>
          {(values.missionOrganizationSirenVerified !== data.missionOrganizationSirenVerified || values.missionOrganizationRNAVerified !== data.missionOrganizationRNAVerified) && (
            <button className="primary-btn mt-4 w-[25%]" type="submit">
              Enregistrer
            </button>
          )}

          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Adresse
            </label>
            <p className="text-gray-425 text-sm">{data.missionOrganizationFullAddress ? data.missionOrganizationFullAddress : "/"}</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Domaine d'action
            </label>
            <p className="text-gray-425 text-sm">{DOMAINS[data.missionDomain]}</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
            <label className="text-sm" htmlFor="title">
              Organisation déjà inscrite sur
            </label>
            <p className="text-gray-425 text-sm">{/* TODO: review systeme of association */}</p>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
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
        moderatorId: publisher.id,
      });
      if (!res.ok) throw res;
      toast.success("Les missions ont été modérées avec succès", {
        position: "bottom-right",
      });
      onChange(res.data);
      onClose();
    } catch (error) {
      captureError(
        error,
        { extra: { where, update, publisherId: publisher.id } },
        {
          position: "bottom-right",
        },
      );
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
