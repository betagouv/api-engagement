import { toast } from "@/services/toast";
import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiCloseCircleFill } from "react-icons/ri";

import Loader from "@/components/Loader";
import Modal from "@/components/Modal";

import Table from "@/components/Table";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const TABLE_HEADER = [
  { title: "Date", key: "endedAt", position: "left" },
  { title: "Durée (en secondes)", key: "duration", position: "center" },
  { title: "Mise à jour", key: "updatedCount", position: "center" },
  { title: "Création", key: "createdCount", position: "center" },
  { title: "Suppressions", key: "deletedCount", position: "center" },
  { title: "Total des missions", key: "missionCount", position: "center" },
];

const IMPORT_ERROR_EXPLANATIONS = {
  empty_xml: "Votre flux est accessible mais ne contient aucune mission : vérifiez que votre export génère bien vos missions.",
  fetch_failed: "Notre plateforme n’arrive pas à joindre votre serveur : vérifiez que l’adresse du flux est correcte et que votre serveur est en ligne.",
  http_auth:
    "Votre serveur refuse l’accès à notre plateforme : vérifiez l’identifiant et le mot de passe de votre flux. Si vous avez changé vos identifiants, pensez à nous les envoyer pour rétablir l’accès.",
  http_client_error: "Votre serveur refuse notre demande : vérifiez l’adresse du flux et qu’aucune règle de votre serveur n’en bloque l’accès.",
  http_not_found: "L’adresse de votre flux n’existe plus : communiquez-nous sa nouvelle adresse.",
  http_server_error: "Votre serveur renvoie une erreur : vérifiez qu’il fonctionne et que l’adresse du flux s’ouvre dans un navigateur.",
  parse_error:
    "Votre adresse répond, mais ne renvoie pas un fichier XML valide (souvent une page d’erreur ou de connexion) : vérifiez que l’adresse ouvre bien votre fichier XML et que son format est correct.",
  no_feed: "Aucune adresse de flux n’est renseignée : communiquez-nous l’adresse de votre flux XML.",
  unsafe_feed_url: "L’adresse de votre flux n’est pas autorisée : vérifiez qu’elle pointe vers un fichier XML accessible publiquement.",
  internal_error: "L’erreur vient de notre côté : aucune action de votre part n’est nécessaire à ce stade.",
};

// L’API renvoie le message brut ; reprendre les catégories du modèle analytics des imports.
const getImportErrorType = (message = "") => {
  if (/No feed$/i.test(message)) return "no_feed";
  if (/Unsafe feed URL$/i.test(message)) return "unsafe_feed_url";
  if (/Failed to fetch XML$/i.test(message)) return "fetch_failed";
  if (/^(401|403) -/.test(message)) return "http_auth";
  if (/^404 -/.test(message)) return "http_not_found";
  if (/^4\d{2} -/.test(message)) return "http_client_error";
  if (/^5\d{2} -/.test(message)) return "http_server_error";
  if (message === "Empty xml") return "empty_xml";
  if (message === "Error parsing xml" || message === "Not an XML") return "parse_error";
  return "internal_error";
};

const Flux = () => {
  const { user, publisher } = useStore();
  const [filters, setFilters] = useState({
    page: 1,
    size: 5,
  });
  const [imports, setImports] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastImport, setLastImport] = useState(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        const query = {
          publisherId: publisher.id,
          size: filters.size,
          skip: (filters.page - 1) * filters.size,
        };

        const res = await api.post(`/import/search`, query, { signal: controller.signal });

        if (controller.signal.aborted) return;
        if (!res.ok) {
          throw res;
        }
        setImports(res.data);
        setTotal(res.total);
        if (filters.page === 1) {
          setLastImport(res.data[0] ?? null);
        }
      } catch (error) {
        if (!controller.signal.aborted) captureError(error, { extra: { publisherId: publisher.id, filters } });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [publisher, filters]);

  const lastSync = lastImport && new Date(lastImport.finishedAt ?? lastImport.startedAt);
  const errorMessage = lastImport?.error?.trim();
  const errorType = lastImport?.status === "FAILED" ? getImportErrorType(errorMessage) : null;
  const hasFeed = Boolean(publisher.feed?.trim());
  const isLate = lastSync && lastSync.getTime() < Date.now() - 24 * 60 * 60 * 1000;

  const buildDuration = (d1, d2) => {
    const diff = Math.abs(d1 - d2);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor(((diff % 360000) % 60000) / 1000);
    if (hours === 0 && minutes === 0) {
      return `${seconds}s`;
    }
    if (hours === 0) {
      return `${minutes}min ${seconds}s`;
    }
    return `${hours}h ${minutes}min ${seconds}s`;
  };

  return (
    <div className="space-y-12 p-4 sm:p-12">
      <title>API Engagement - Flux de missions - Paramètres</title>
      <div className="border-grey-border space-y-8 border p-4 sm:p-8">
        <h2 className="text-3xl font-bold">Configurer votre flux de missions</h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <label htmlFor="publisher-feed" className="font-semibold sm:w-[35%] sm:flex-none">
            Lien du fichier XML à synchroniser
          </label>
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              id="publisher-feed"
              className="input border-blue-france-925 bg-blue-france-975 min-w-0 flex-1 border read-only:opacity-80"
              value={publisher.feed ?? ""}
              readOnly
            />
            {user.role === "admin" && <ModifyModal />}
          </div>
        </div>

        <div className="h-px w-full bg-gray-900" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <p className="font-semibold sm:w-[35%] sm:flex-none">Dernière synchronisation</p>
          <div className="min-w-0 flex-1 space-y-1" aria-live="polite">
            {lastImport === null && <p>Aucune synchronisation enregistrée.</p>}
            {lastSync && (
              <>
                <div className="flex items-center gap-2">
                  <p>{lastSync.toLocaleString("fr").replace(" ", " à ")}</p>
                  {errorType || isLate ? (
                    <RiCloseCircleFill aria-label={errorType ? "Échec de la synchronisation" : "Synchronisation en retard"} role="img" className="text-error h-5 w-5 shrink-0" />
                  ) : hasFeed ? (
                    <RiCheckboxCircleFill aria-label="Synchronisation à jour" role="img" className="text-success h-5 w-5 shrink-0" />
                  ) : null}
                </div>
                {errorType ? (
                  <div className="text-error space-y-1 text-sm wrap-break-word">
                    <p className="font-semibold">La dernière synchronisation a échoué.</p>
                    {errorMessage && errorType !== "internal_error" && <p>Message technique : {lastImport.error}</p>}
                    <p>{IMPORT_ERROR_EXPLANATIONS[errorType]}</p>
                  </div>
                ) : (
                  isLate && <p className="text-xs">Dernière synchronisation il y a plus de 24h.</p>
                )}
              </>
            )}
            {!hasFeed && errorType !== "no_feed" && (
              <div className="text-error flex items-start gap-2 text-sm">
                <RiCloseCircleFill aria-hidden="true" className="h-5 w-5 shrink-0" />
                <p>{IMPORT_ERROR_EXPLANATIONS.no_feed}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-grey-border space-y-6 overflow-x-auto border p-4 sm:p-6">
        <h2 className="text-3xl font-bold">Historique des synchronisations</h2>

        <Table
          caption="Historique des synchronisations"
          header={TABLE_HEADER}
          pagination
          page={filters.page}
          pageSize={filters.size}
          onPageChange={(page) => setFilters({ ...filters, page })}
          total={total}
          loading={loading}
          auto
        >
          {imports.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
              <td className="px-2">{new Date(item.finishedAt).toLocaleString("fr").replace(" ", " • ")}</td>
              <td className="px-4 text-center">{buildDuration(new Date(item.startedAt), new Date(item.finishedAt))}</td>
              <td className="px-4 text-center">{item.updatedCount?.toLocaleString("fr") || "-"}</td>
              <td className="px-4 text-center">{item.createdCount?.toLocaleString("fr") || "-"}</td>
              <td className="px-4 text-center">{item.deletedCount?.toLocaleString("fr") || "-"}</td>
              <td className="px-4 text-center">{item.missionCount?.toLocaleString("fr") || "-"}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

const ModifyModal = () => {
  const { publisher, setPublisher } = useStore();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState(publisher.feed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFeed(publisher.feed);
  }, [publisher.feed]);

  const handleFeedSubmit = async () => {
    try {
      setLoading(true);
      const res = await api.put(`/publisher/${publisher.id}`, { feed });

      if (!res.ok) {
        throw res;
      }

      toast.success("Flux mis à jour");
      setPublisher(res.data);
      setOpen(false);
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id, feed } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="primary-btn" onClick={() => setOpen(!open)}>
        Modifier
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Modifier votre flux de missions" className="w-[90vw] max-w-3xl">
        <div className="flex flex-col items-start justify-between gap-4">
          <label htmlFor="feed-url">Lien du fichier XML à synchroniser</label>
          <input id="feed-url" className="input focus w-full" value={feed ?? ""} onChange={(e) => setFeed(e.target.value)} />
        </div>
        <div className="flex justify-end gap-6">
          <button type="button" className="tertiary-btn" onClick={() => setOpen(false)}>
            Annuler
          </button>
          <button type="button" className="primary-btn" onClick={handleFeedSubmit} disabled={loading}>
            {loading ? <Loader className="mr-2" /> : "Enregister"}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default Flux;
