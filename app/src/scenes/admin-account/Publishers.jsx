import { useEffect, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import { RiFileDownloadLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "@/components/Loader";
import Table from "@/components/Table";
import { MISSION_TYPES } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import exportCSV from "@/services/utils";
import { withLegacyPublishers } from "@/utils/publisher";

const TABLE_HEADER = [
  { title: "Nom", key: "name" },
  { title: "Rôles", key: "roles", position: "center" },
  { title: "Annonceurs", key: "publishers", position: "center" },
  { title: "Diffuseurs", key: "diffuseurs", position: "center" },
  { title: "Membres", key: "members", position: "center" },
  { title: "Rapport d'impact", key: "sendReport", position: "center" },
];

const PAGE_SIZE = 25;

const Publishers = () => {
  const [filters, setFilters] = useState({ name: "", role: "", sendReport: "", missionType: "" });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [diffuseurs, setDiffuseurs] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.post("/user/search");
        if (!res.ok) throw res;
        setUsers(res.data);
      } catch (error) {
        captureError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const query = {};
        if (filters.name) query.name = filters.name;
        if (filters.role) query.role = filters.role;
        if (filters.sendReport === "true") query.sendReport = true;
        if (filters.sendReport === "false") query.sendReport = false;
        if (filters.missionType) query.missionType = filters.missionType;

        const res = await api.post("/publisher/search", query);
        if (!res.ok) throw res;
        const normalized = withLegacyPublishers(res.data);
        setPublishers(normalized);
        if (!Object.keys(query).length) {
          setDiffuseurs(normalized);
        }
      } catch (error) {
        captureError(error, { extra: { filters } });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  const handleExport = () => {
    if (!publishers) return;
    setExporting(true);
    const data = [];
    publishers.forEach((publisher) => {
      const val = {};
      val["Id"] = publisher.id;
      val["Nom"] = publisher.name;
      val["Email"] = publisher.email;
      val["URL"] = publisher.url;
      val["Role annonceur"] = publisher.isAnnonceur;
      val["Role diffuseur API"] = publisher.hasApiRights;
      val["Role diffuseur widget"] = publisher.hasWidgetRights;
      val["Role diffuseur campagne"] = publisher.hasCampaignRights;
      const annonceurs = publisher.publishers.map((p) => p.publisherName);
      val["Nombre d'annonceurs"] = annonceurs.length;
      val["Annonceurs"] = annonceurs;
      const broadcasters = publishers.filter((p) => p.publishers.find((e) => e.publisher === publisher.id.toString())).map((p) => p.name);
      val["Nombre de diffuseurs"] = broadcasters.length;
      val["Diffuseurs"] = broadcasters;
      const members = users.filter((e) => e.publishers.find((j) => j === publisher.id.toString())).map((e) => `${e.name} - ${e.email}`);
      val["Nombre de membres"] = members.length;
      val["Membres"] = members;
      val["Rapport automatique"] = publisher.sendReport;
      val["Nombre de destinataires"] = publisher.sendReportTo.length;
      const recipients = publisher.sendReportTo
        .map((e) => users.find((j) => j.id === e))
        .filter((user) => !!user)
        .map((user) => user.email);
      val["Destinataires"] = recipients;

      data.push(val);
    });
    exportCSV("partenaires", data);
    setExporting(false);
  };

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Partenaires - Administration</title>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Liste des partenaires</h2>
          <p className="mt-2">Liste de comptes annonceurs et diffuseurs de l'API</p>
        </div>

        <div className="flex">
          <button className="tertiary-bis-btn flex items-center" onClick={handleExport}>
            {exporting ? <Loader /> : <RiFileDownloadLine className="mr-2" />}
            Exporter
          </button>
          <Link to="/publisher/new" className="tertiary-btn flex items-center">
            Nouveau partenaire <HiOutlinePlus className="ml-2" />
          </Link>
        </div>
      </div>

      <div className="border-grey-border border p-6">
        <div role="search" className="mb-6 flex items-center gap-4">
          <p className="font-semibold">{`${publishers.length} partenaire${publishers.length > 1 ? "s" : ""}`}</p>
          <label htmlFor="publisher-name" className="sr-only">
            Rechercher par nom
          </label>
          <input
            id="publisher-name"
            name="publisher-name"
            className="input flex-1"
            placeholder="Chercher par nom"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />

          <label htmlFor="publisher-role" className="sr-only">
            Filtrer par rôle
          </label>
          <select id="publisher-role" name="publisher-role" className="input w-[20%]" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">Tous les rôles</option>
            <option value="annonceur">Tous les annonceurs</option>
            <option value="diffuseur">Tous les diffuseurs</option>
            <option value="api">Tous les diffuseurs api</option>
            <option value="widget">Tous les diffuseurs widget</option>
            <option value="campaign">Tous les diffuseurs campagne</option>
          </select>
          <label htmlFor="publisher-send-report" className="sr-only">
            Filtrer par rapport d'impact
          </label>
          <select
            className="input w-[20%] truncate"
            id="publisher-send-report"
            value={filters.sendReport.toString()}
            onChange={(e) => setFilters({ ...filters, sendReport: e.target.value })}
          >
            <option value="">Avec et sans rapport d'impact</option>
            <option value="true">Avec rapport d'impact</option>
            <option value="false">Sans rapport d'impact</option>
          </select>
          <label htmlFor="publisher-mission-type" className="sr-only">
            Filtrer par type de mission
          </label>
          <select
            className="input w-[20%] truncate"
            id="publisher-mission-type"
            value={filters.missionType}
            onChange={(e) => setFilters({ ...filters, missionType: e.target.value })}
          >
            <option value="">Type de mission</option>
            {Object.values(MISSION_TYPES).map((mission) => (
              <option key={mission.slug} value={mission.slug}>
                {mission.label}
              </option>
            ))}
          </select>
        </div>
        <Table header={TABLE_HEADER} total={publishers.length} loading={loading} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} auto>
          {publishers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item, i) => (
            <tr key={item.id} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
              <td className="table-cell">
                <Link to={`/publisher/${item.id}`} className="text-blue-france">
                  {item.name}
                </Link>
              </td>
              <td className="table-cell">
                <div className="flex flex-wrap justify-center gap-2">
                  {item.isAnnonceur && <span className="bg-red-marianne-950 rounded px-1 text-[10px]">Annonceur</span>}
                  {item.hasApiRights && <span className="bg-success-950 rounded px-1 text-[10px]">Diffuseur API</span>}
                  {item.hasWidgetRights && <span className="bg-success-950 rounded px-1 text-[10px]">Diffuseur Widget</span>}
                  {item.hasCampaignRights && <span className="bg-success-950 rounded px-1 text-[10px]">Diffuseur Campagne</span>}
                </div>
              </td>
              <td className="table-cell text-center">{item.publishers.length}</td>
              <td className="table-cell text-center">{diffuseurs.filter((e) => e.publishers.some((j) => j.publisherId === item.id)).length}</td>
              <td className="table-cell text-center">{users.filter((e) => e.publishers.find((j) => j === item.id)).length}</td>
              <td className="table-cell text-center">
                {item.sendReport ? (
                  <span className="bg-blue-france-975 rounded px-1">{`Oui (${item.sendReportTo.length} receveur${item.sendReportTo.length > 1 ? "s" : ""})`}</span>
                ) : (
                  <span className="bg-red-marianne-950 rounded px-1">Non</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default Publishers;
