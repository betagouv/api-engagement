import { useEffect, useState } from "react";
import { RiCloseFill, RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import validator from "validator";

import { Table } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";

const Create = () => {
  const [publishers, setPublishers] = useState([]);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState({ firstname: "", lastname: "", email: "", role: "user", publishers: [] });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/publisher");
        if (!res.ok) throw res;
        setPublishers(res.data);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des partenaires");
        navigate("/user");
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
    if (validator.isEmpty(values.firstname)) errors.firstname = "Le prénom est requis";
    if (!validator.isEmail(values.email)) errors.email = "Adresse email invalide";
    if (values.role !== "admin" && values.role !== "user") errors.role = "Le rôle renseigné est invalide";
    if (values.publishers.length === 0) errors.publishers = "Veuillez sélectionner au moins un partenaire";

    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.post("/user/invite", values);
      if (!res.ok) {
        if (res.code === "RESSOURCE_ALREADY_EXIST") return setErrors({ email: "Cet email est déjà utilisé" });
        throw res;
      }
      toast.success("Utilisateur créé avec succès");
      navigate(`/user/${res.data._id}`);
    } catch (error) {
      captureError(error, "Erreur lors de la création de l'utilisateur");
    }
  };

  const isChanged = () => values.firstname !== "" || values.email !== "";
  const isErrors = () => errors.firstname || errors.email || errors.role;

  return (
    <div className="flex flex-col">
      <div className="mb-10">
        <h1 className="text-4xl font-bold">Nouvel utilisateur</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col bg-white p-16 shadow-lg">
        <div className="mb-6 flex justify-between">
          <h2 className="text-3xl font-bold">Les informations</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="firstname">
              Prénom
            </label>
            <input
              id="firstname"
              className={`input mb-2 ${errors.firstname ? "border-b-red-main" : "border-b-black"}`}
              name="firstname"
              value={values.firstname}
              onChange={handleChange}
            />
            {errors.firstname && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.firstname}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="lastname">
              Nom de famille
            </label>
            <input
              id="lastname"
              className={`input mb-2 ${errors.lastname ? "border-b-red-main" : "border-b-black"}`}
              name="lastname"
              value={values.lastname}
              onChange={handleChange}
            />
            {errors.lastname && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.lastname}
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="email">
              E-mail
            </label>
            <input id="email" className={`input mb-2 ${errors.email ? "border-b-red-main" : "border-b-black"}`} name="email" value={values.email} onChange={handleChange} />
            {errors.email && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.email}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="role">
              Role
            </label>

            <select id="role" className={`input mb-2 ${errors.role ? "border-b-red-main" : "border-b-black"}`} value={values.role} onChange={handleChange} name="role">
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.role}
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="publishers">
              Partenaires
            </label>

            <input
              id="publishers"
              className="w-64 mb-4 input flex-1 bg-gray-light px-3 py-2 text-sm"
              placeholder="Rechercher"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {values.publishers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {values.publishers.map((p, i) => (
                  <div key={i} className="flex items-center rounded bg-blue-light p-2">
                    <span className="text-xs">{publishers.find((pub) => pub._id === p)?.name}</span>
                    <button
                      type="button"
                      className="ml-2"
                      onClick={() => {
                        setValues({ ...values, publishers: values.publishers.filter((pub) => pub !== p) });
                      }}
                    >
                      <RiCloseFill className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.publishers && (
              <div className="mb-2 flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.publishers}
              </div>
            )}
            <Table
              data={publishers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))}
              maxHeigth="max-h-96"
              renderHeader={() => (
                <>
                  <h4 className="w-24" />
                  <h4 className="flex-1">Nom</h4>
                  <h4 className="flex-1 text-center">Roles</h4>
                </>
              )}
              renderItem={(item) => (
                <>
                  <div className="w-24 pl-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) setValues({ ...values, publishers: [...values.publishers, item._id.toString()] });
                        else setValues({ ...values, publishers: values.publishers.filter((p) => p !== item._id.toString()) });
                      }}
                      checked={values.publishers.includes(item._id.toString())}
                    />
                  </div>
                  <div className="flex-1">{item.name}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-center gap-2">
                      {item.annonceur && <span className="rounded bg-red-light p-2">Annonceur</span>}
                      {item.api && <span className="rounded bg-green-light p-2">Diffuseur API</span>}
                      {item.widget && <span className="rounded bg-green-light p-2">Diffuseur Widget</span>}
                      {item.campaign && <span className="rounded bg-green-light p-2">Diffuseur Campagne</span>}
                    </div>
                  </div>
                </>
              )}
            />
          </div>

          <div className="col-span-2 flex justify-end gap-4">
            <Link to="/accounts?tab=users" className="button border border-black text-black hover:bg-gray-hover">
              Retour
            </Link>
            <button type="submit" className="button bg-blue-dark text-white hover:bg-blue-main" disabled={!isChanged() || isErrors()}>
              Inviter
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Create;
