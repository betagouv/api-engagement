import _ from "lodash";
import { useEffect, useState } from "react";
import { RiCloseFill } from "react-icons/ri";
import { TiDeleteOutline } from "react-icons/ti";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import Autocomplete from "../../components/Autocomplete";
import { Table } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Edit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, publisher: sessionPublisher, setPublisher: setSessionPublisher } = useStore();
  const [publishers, setPublishers] = useState();
  const [publisher, setPublisher] = useState();
  const [values, setValues] = useState({
    publishers: [],
    excludeOrganisations: [],
    send_report_to: [],
    automated_report: false,
    role_promoteur: false,
    role_annonceur_api: false,
    role_annonceur_widget: false,
    role_annonceur_campagne: false,
    mission_type: "benevolat",
  });
  const [users, setUsers] = useState();
  const [searchOrga, setSearchOrga] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addPublisher, setAddPublisher] = useState(false);
  const broadcasters = publishers && publishers.filter((p) => p.publishers.find((e) => e.publisher === id));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/publisher/${id}`);
        if (!res.ok) throw res;
        setPublisher(res.publisher);
        setValues({ ...values, ...res.publisher });

        const resPublishers = await api.post("/publisher/search");
        if (!resPublishers.ok) throw resPublishers;
        setPublishers(resPublishers.data);

        const resUsers = await api.get(`/user?publisherId=${id}`);
        if (!resUsers.ok) throw resUsers;
        setUsers(resUsers.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération du partenaire");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/mission/autocomplete?field=organizationName&search=${searchOrga}&${values.publishers.map((p) => `publishers[]=${p.publisher}`).join("&")}`);
        if (!res.ok) throw res;
        setOrganizations(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des missions");
      }
      setSearching(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchOrga]);

  const handleFileChange = async (e) => {
    try {
      const formData = new FormData();
      formData.append("files", e.target.files[0]);
      const res = await api.postFormData(`/publisher/${id}/image`, formData);
      if (!res.ok) throw res;
      toast.success("Image mise à jour");
      setValues(res.data);
      setPublisher(res.data);
      if (sessionPublisher._id === values._id) setSessionPublisher(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de l'image");
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Etes vous sur ?");
    if (!confirm) return;

    try {
      const res = await api.delete(`/publisher/${values._id}`);
      if (!res.ok) throw res;
      toast.success("Partenaire supprimé");

      if (sessionPublisher._id === values._id) {
        const res = await api.get(`/publisher/${user.publishers[0]}`);
        if (!res.ok) throw res;
        setSessionPublisher(publisher);
      }
      navigate("/accounts?tab=publishers");
    } catch (error) {
      captureError(error, "Erreur lors de la suppression du partenaire");
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await api.put(`/publisher/${id}`, values);
      if (!res.ok) throw res;
      toast.success("Partenaire mis à jour");
      setValues(res.data);
      setPublisher(res.data);
      if (sessionPublisher._id === values._id) setSessionPublisher(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du partenaire");
    }
  };

  const isChanged = (v) => !_.isEqual(v, publisher);

  if (!values || !publishers || !users) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="flex flex-col">
      <div className="mb-10 flex items-center">
        <label
          htmlFor="logo"
          className="h-24 w-32 flex cursor-pointer flex-col items-center justify-center hover:bg-gray-900/10 bg-white transition-all duration-500 p-2 shadow-lg"
        >
          <img src={`${[publisher.logo]}?${Date.now()}`} className="object-scale-down" />
        </label>
        <input id="logo" accept=".gif,.jpg,.jpeg,.png" type="file" hidden onChange={handleFileChange} />

        <div className="ml-8 pt-2">
          <h1 className="text-4xl font-bold">Compte partenaire de {values.name}</h1>
        </div>
      </div>
      <div className="flex flex-col bg-white p-16 shadow-lg">
        <div className="mb-6 flex justify-between">
          <h2 className="text-3xl font-bold">Les informations</h2>

          <button className="flex cursor-pointer items-center text-sm text-red-main" onClick={handleDelete}>
            <TiDeleteOutline className="mr-2" />
            <span>Supprimer</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="name">
              Nom
            </label>
            <input id="name" className="input mb-2" name="name" disabled={true} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="email">
              Email de contact
            </label>
            <input id="email" className="input mb-2" name="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          </div>
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="url">
              URL
            </label>
            <input id="url" className="input mb-2" name="url" value={values.url} onChange={(e) => setValues({ ...values, url: e.target.value })} />
          </div>
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="documentation">
              Documentation
            </label>
            <input
              id="documentation"
              className="input mb-2"
              name="documentation"
              value={values.documentation}
              onChange={(e) => setValues({ ...values, documentation: e.target.value })}
            />
          </div>

          <div className="row-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="documentation">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              className="input mb-2"
              name="description"
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="role-promoteur">
              Annonceur
            </label>
            <div className="mb-2 flex items-center gap-12">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  id="role-promoteur"
                  name="role-promoteur"
                  onChange={(e) => setValues({ ...values, role_promoteur: e.target.checked })}
                  checked={values.role_promoteur}
                />
                <span>Annonceur</span>
              </div>
              {values.role_promoteur === true && (
                <>
                  <div className="flex items-center gap-3">
                    <label htmlFor="mission-type-benevolat" className="sr-only">
                      Bénévolat
                    </label>
                    <input
                      id="mission-type-benevolat"
                      type="radio"
                      className="checkbox"
                      name="mission-type-benevolat"
                      value="benevolat"
                      onChange={(e) => setValues({ ...values, mission_type: e.target.value })}
                      checked={values.mission_type === "benevolat"}
                    />
                    <span>Bénévolat</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="mission-type-volontariat" className="sr-only">
                      Volontariat
                    </label>
                    <input
                      type="radio"
                      className="checkbox"
                      id="mission-type-volontariat"
                      name="mission-type-volontariat"
                      value="volontariat"
                      onChange={(e) => setValues({ ...values, mission_type: e.target.value })}
                      checked={values.mission_type === "volontariat"}
                    />
                    <span>Volontariat</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm">Diffuseur</label>
            <div className="mb-2 flex items-center gap-12">
              <div className="flex items-center gap-3">
                <label htmlFor="role-annonceur-api" className="sr-only">
                  API
                </label>
                <input
                  type="checkbox"
                  className="checkbox"
                  id="role-annonceur-api"
                  name="role-annonceur-api"
                  onChange={(e) => setValues({ ...values, role_annonceur_api: e.target.checked })}
                  checked={values.role_annonceur_api}
                />
                <span>API</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="role-annonceur-widget" className="sr-only">
                  Widget
                </label>
                <input
                  type="checkbox"
                  className="checkbox"
                  id="role-annonceur-widget"
                  name="role-annonceur-widget"
                  onChange={(e) => setValues({ ...values, role_annonceur_widget: e.target.checked })}
                  checked={values.role_annonceur_widget}
                />
                <span>Widget</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="role-annonceur-campagne" className="sr-only">
                  Campagne
                </label>
                <input
                  type="checkbox"
                  className="checkbox"
                  id="role-annonceur-campagne"
                  name="role-annonceur-campagne"
                  onChange={(e) => setValues({ ...values, role_annonceur_campagne: e.target.checked })}
                  checked={values.role_annonceur_campagne}
                />
                <span>Campagne</span>
              </div>
            </div>
          </div>

          {(values.role_annonceur_api || values.role_annonceur_widget || values.role_annonceur_campagne) && (
            <div className={`flex flex-col ${!values.role_promoteur ? "col-span-2" : ""}`}>
              <label className="mb-2 text-sm" htmlFor="publishers">
                Je diffuse des missions de
              </label>
              <Table
                data={publishers.filter((p) => p.role_promoteur)}
                maxHeigth="max-h-96"
                renderHeader={() => (
                  <>
                    <div className="flex flex-1 items-center justify-between">
                      <h4>Nom</h4>

                      <button type="button" className="button bg-blue-dark font-normal text-white" onClick={() => setAddPublisher(!addPublisher)}>
                        {addPublisher ? "Fini" : "Modifier"}
                      </button>
                    </div>
                  </>
                )}
                itemHeight="h-12"
                renderItem={(item) => {
                  const checked = values.publishers.find((p) => p.publisher === item._id) !== undefined;
                  if (addPublisher) {
                    return (
                      <>
                        <div className="w-24 pl-3">
                          <label htmlFor="publishers" className="sr-only">
                            Diffuser des missions de {item.name}
                          </label>
                          <input
                            id="publishers"
                            name="publishers"
                            type="checkbox"
                            className="checkbox"
                            onChange={(e) => {
                              if (e.target.checked)
                                setValues({
                                  ...values,
                                  publishers: [...values.publishers, { publisher: item._id, publisherName: item.name, mission_type: item.mission_type, moderator: item.moderator }],
                                });
                              else setValues({ ...values, publishers: values.publishers.filter((p) => p.publisher !== item._id.toString()) });
                            }}
                            checked={checked}
                          />
                        </div>
                        <div className="flex-1">{item.name}</div>
                      </>
                    );
                  } else if (checked) return <div className="flex-1">{item.name}</div>;
                }}
              />
              {values.publishers.length === 0 && (
                <div className="flex h-12 items-center border-b border-gray-border bg-gray-light px-4 text-left text-xs text-black">Aucun partenaire</div>
              )}
            </div>
          )}

          {values.role_promoteur && (
            <div className={`flex flex-col ${!(values.role_annonceur_api || values.role_annonceur_widget || values.role_annonceur_campagne) ? "col-span-2" : ""}`}>
              <label className="mb-2 text-sm" htmlFor="publishers">
                Mes missions sont diffusées par
              </label>
              {broadcasters.length > 0 ? (
                <Table
                  data={publishers.filter((p) => p.publishers.find((p) => p.publisher === values._id.toString()))}
                  maxHeigth="max-h-96"
                  renderHeader={() => <h4>Nom</h4>}
                  itemHeight="h-12"
                  renderItem={(item) => <div className="flex-1">{item.name}</div>}
                />
              ) : (
                <div className="flex h-12 items-center border-y border-gray-border bg-gray-light px-4 text-left text-xs text-black">Aucun partenaire</div>
              )}
            </div>
          )}

          {(values.role_annonceur_api || values.role_annonceur_widget || values.role_annonceur_campagne) && (
            <div className="space-y-2">
              <label className="text-sm" htmlFor="excludeOrganisations">
                Liste des organisations à exclure de la diffusion
              </label>
              <Autocomplete
                placeholder="Organisation"
                options={organizations.filter((o) => !values.excludeOrganisations.includes(o.key)).map((o) => ({ label: o.key, value: o.key, doc_count: o.doc_count }))}
                value={searchOrga}
                onChange={setSearchOrga}
                onSelect={(e) => setValues({ ...values, excludeOrganisations: [...values.excludeOrganisations, e.value] })}
                loading={searching}
                className="w-80 right-0"
              />
              {values.excludeOrganisations.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {values.excludeOrganisations.map((o, i) => (
                    <div key={i} className="flex items-center rounded bg-blue-light p-2">
                      <span className="text-xs">{o}</span>
                      <button type="button" className="ml-2" onClick={() => setValues({ ...values, excludeOrganisations: values.excludeOrganisations.filter((e) => e !== o) })}>
                        <RiCloseFill className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="publishers">
              Mes membres
            </label>
            {users.length > 0 ? (
              <Table
                data={users}
                maxHeigth="max-h-56"
                renderHeader={() => (
                  <>
                    <h4 className="flex-1">Nom</h4>
                    <h4 className="flex-1">Email</h4>
                    {values.automated_report && <h4 className="flex-1 text-center">Envoyer le rapport</h4>}
                    <h4 className="w-32 text-center">Role</h4>
                  </>
                )}
                itemHeight="h-12"
                renderItem={(item) => (
                  <>
                    <Link to={`/users/${item._id}`} className="link flex-1">
                      {`${item.firstname} ${item.lastname}`}
                    </Link>
                    <span className="flex-1 truncate">{item.email}</span>
                    {values.automated_report && (
                      <div className="flex-1 text-center">
                        <label htmlFor="send-report-to" className="sr-only">
                          Envoyer le rapport
                        </label>
                        <input
                          id="send-report-to"
                          className="checkbox "
                          type="checkbox"
                          name="send-report-to"
                          checked={values.send_report_to.find((u) => u === item._id.toString()) !== undefined}
                          onChange={(e) => {
                            if (e.target.checked) setValues({ ...values, send_report_to: [...values.send_report_to, item._id.toString()] });
                            else setValues({ ...values, send_report_to: values.send_report_to.filter((u) => u !== item._id.toString()) });
                          }}
                        />
                      </div>
                    )}
                    <span className="w-32 text-center">
                      {item.role === "admin" ? <span className="rounded bg-red-light p-2">Admin</span> : <span className="rounded bg-green-light p-2">Utilisateur</span>}
                    </span>
                  </>
                )}
              />
            ) : (
              <div className="flex h-12 items-center border-y border-gray-border bg-gray-light px-4 text-left text-xs text-black">Aucun membre</div>
            )}
          </div>

          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="role-promoteur">
              Administration
            </label>
            <div className="border border-gray-border px-6">
              <div className="flex h-12 w-full items-center border-b border-gray-border px-4 py-2">
                <label className="w-1/4" htmlFor="automated-report">
                  Rapport automatisé
                </label>
                <div className="flex w-3/4 justify-between">
                  <input
                    id="automated-report"
                    className="checkbox"
                    type="checkbox"
                    name="automated-report"
                    checked={values.automated_report}
                    onChange={(e) => setValues({ ...values, automated_report: e.target.checked })}
                  />
                </div>
              </div>
              <div className="flex h-12 w-full items-center px-4 py-2">
                <label className="w-1/4" htmlFor="lead">
                  Créateur
                </label>
                <div className="flex w-3/4 justify-between">
                  <input id="lead" className="border-none px-0" type="text" name="lead" value={values.lead} onChange={(e) => setValues({ ...values, lead: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-6">
            <button
              type="button"
              className="button border border-blue-dark bg-white text-blue-dark hover:bg-gray-hover"
              disabled={!isChanged(values)}
              onClick={() => setValues(values)}
            >
              Annuler
            </button>
            <button className="button bg-blue-dark text-white hover:bg-blue-main" disabled={!isChanged(values)} onClick={handleSubmit}>
              Mettre a jour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Edit;
