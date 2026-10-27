import type { UserRecord } from "@/types/user";
import type { WarningRecord } from "@/types/warning";

export interface AlertNotifier {
  name: string;
  // Un notifier `required` pilote le verrou `notifiedAt` (échec = réessai au prochain webhook) ; les autres sont best-effort.
  required: boolean;
  // Renvoie true si au moins une notification est partie ; peut lever une erreur.
  notify(warning: WarningRecord, users: UserRecord[]): Promise<boolean>;
}
