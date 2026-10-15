import { API_URL, PUBLISHER_ID } from "~/services/config";

// Compte une impression par carte affichée dans les statistiques de l'API Engagement (événement `print`),
// attribuée à l'annonceur de la mission avec TrouveTaMission comme diffuseur. Envoi best-effort : un échec
// ne doit jamais gêner l'affichage.
export function sendMissionImpressions(missionIds: string[]): void {
  if (!PUBLISHER_ID) return;
  for (const missionId of missionIds) {
    fetch(`${API_URL}/r/impression/${encodeURIComponent(missionId)}/${encodeURIComponent(PUBLISHER_ID)}`, { keepalive: true }).catch(() => {});
  }
}
