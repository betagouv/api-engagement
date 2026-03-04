import { toast } from "@/services/toast";
import { useEffect, useState } from "react";
import { RiCloseFill, RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";

import LabelledInput from "@/components/form/LabelledInput";
import LabelledSelect from "@/components/form/LabelledSelect";
import Table from "@/components/Table";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { isValidEmail } from "@/services/utils";
import { withLegacyPublishers } from "@/utils/publisher";

const TABLE_HEADER = [{ title: "" }, { title: "Nom" }, { title: "Roles", position: "center" }];

const Create = () => {
  const [publishers, setPublishers] = useState([]);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState({ firstname: "", lastname: "", email: "", role: "user", publishers: [] });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const filteredPublishers = publishers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resP = await api.post("/publisher/search", {});
        if (!resP.ok) {
          throw resP;
        }
        setPublishers(withLegacyPublishers(resP.data).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        captureError(error, { extra: { search } });
        navigate("/admin-account");
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrors({ ...errors, [name]: "" });
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!values.firstname) {
      errors.firstname = "Le prénom est requis";
    }
    if (!isValidEmail(values.email)) {
      errors.email = "Adresse email invalide";
    }
    if (values.role !== "admin" && values.role !== "user") {
      errors.role = "Le rôle renseigné est invalide";
    }
    if (values.publishers.length === 0) {
      errors.publishers = "Veuillez sélectionner au moins un partenaire";
    }

    setErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const res = await api.post("/user/invite", values);
      if (!res.ok) {
        if (res.code === "RESSOURCE_ALREADY_EXIST") {
          return setErrors({ email: "Cet email est déjà utilisé" });
        }
        throw res;
      }
      toast.success("Utilisateur créé avec succès");
      navigate(`/user/${res.data.id}`);
    } catch (error) {
      captureError(error, { extra: { values } });
    }
  };

  const isChanged = () => values.firstname !== "" || values.email !== "";
  const isErrors = () => errors.firstname || errors.email || errors.role;

  return (
    <div className="flex flex-col">
      <div className="mb-10">
        <title>API Engagement - Nouvel utilisateur</title>
        <h1 className="text-4xl font-bold">Nouvel utilisateur</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white p-16 shadow-lg">
        <h2 className="text-3xl font-bold">Les informations</h2>

        <div className="grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
          <LabelledInput id="firstname" label="Prénom" error={errors.firstname} value={values.firstname} onChange={(e) => setValues({ ...values, firstname: e.target.value })} />
          <LabelledInput
            id="lastname"
            label="Nom de famille"
            error={errors.lastname}
            value={values.lastname}
            onChange={(e) => setValues({ ...values, lastname: e.target.value })}
          />
          <LabelledInput id="email" label="E-mail" error={errors.email} value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          <LabelledSelect
            id="role"
            label="Rôle"
            options={[
              { value: "user", label: "Utilisateur" },
              { value: "admin", label: "Admin" },
            ]}
            error={errors.role}
            value={values.role}
            onChange={(e) => setValues({ ...values, role: e.target.value })}
            placeholder="Sélectionner un rôle"
          />
        </div>
        <div role="search" className="flex flex-col gap-4">
          <label className="text-sm" htmlFor="publishers">
            Partenaires
          </label>

          <input
            id="publishers"
            className="input mb-4 w-64 flex-1 bg-gray-950 px-3 py-2 text-sm"
            placeholder="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {values.publishers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {values.publishers.map((p, i) => (
                <div key={i} className="bg-blue-france-975 flex items-center rounded p-2">
                  <span className="text-xs">{publishers.find((pub) => pub.id === p || pub._id === p)?.name}</span>
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => {
                      setValues({ ...values, publishers: values.publishers.filter((pub) => pub !== p) });
                    }}
                  >
                    <RiCloseFill className="text-xs" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {errors.publishers && (
            <div className="text-error mb-2 flex items-center text-sm">
              <RiErrorWarningFill className="mr-2" aria-hidden="true" />
              {errors.publishers}
            </div>
          )}
          <Table caption="Partenaires de l'utilisateur" header={TABLE_HEADER} total={filteredPublishers.length} pagination={false} auto className="max-h-96 overflow-y-auto">
            {filteredPublishers.map((item, i) => (
              <tr key={item.id || item._id} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
                <td className="table-cell">
                  <input
                    type="checkbox"
                    className="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValues({ ...values, publishers: [...values.publishers, (item.id || item._id).toString()] });
                      } else {
                        setValues({ ...values, publishers: values.publishers.filter((p) => p !== (item.id || item._id).toString()) });
                      }
                    }}
                    checked={values.publishers.includes((item.id || item._id).toString())}
                  />
                </td>
                <td className="table-cell">{item.name}</td>
                <td className="table-cell">
                  <div className="flex flex-wrap justify-center gap-2">
                    {item.isAnnonceur && <span className="bg-red-marianne-950 rounded p-2">Annonceur</span>}
                    {item.hasApiRights && <span className="bg-success-950 rounded p-2">Diffuseur API</span>}
                    {item.hasWidgetRights && <span className="bg-success-950 rounded p-2">Diffuseur Widget</span>}
                    {item.hasCampaignRights && <span className="bg-success-950 rounded p-2">Diffuseur Campagne</span>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>

        <div className="flex justify-end gap-4">
          <Link to="/accounts?tab=users" className="tertiary-btn">
            Retour
          </Link>
          <button type="submit" className="primary-btn" disabled={!isChanged() || isErrors()}>
            Inviter
          </button>
        </div>
      </form>
    </div>
  );
};

export default Create;
