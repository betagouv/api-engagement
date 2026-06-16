import type { MissionDetailResponse } from "@engagement/dto";
import type { ReactNode } from "react";
import EmailMissionModal from "~/components/mission-detail/email-mission-details-modal";
import { formatCompensation, formatDeadline, formatStartDate } from "~/utils/mission";

interface MissionCtaPanelProps {
  mission: MissionDetailResponse;
  userScoringId?: string;
  className?: string;
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <i className={`${icon} fr-icon--sm text-mention-grey mt-0.5 flex-none`} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}

export default function MissionCtaPanel({ mission, userScoringId, className = "" }: MissionCtaPanelProps) {
  const durationLabel = formatStartDate(mission.startAt, mission.duration);
  const compensationLabel = mission.compensation ? formatCompensation(mission.compensation, { withType: true }) : null;
  const deadlineLabel = formatDeadline(mission.endAt);

  return (
    <aside className={`shadow-card flex flex-col gap-6 bg-white p-6! ${className}`}>
      {(durationLabel || mission.schedule) && (
        <InfoRow icon="fr-icon-time-line">
          {durationLabel && <span className="text-title-grey font-bold">{durationLabel}</span>}
          {mission.schedule && <span className="text-title-grey">{mission.schedule}</span>}
        </InfoRow>
      )}

      {compensationLabel && (
        <InfoRow icon="fr-icon-money-euro-circle-line">
          <span className="text-title-grey font-bold">{compensationLabel}</span>
        </InfoRow>
      )}

      {deadlineLabel && (
        <InfoRow icon="fr-icon-calendar-line">
          <span className="text-title-grey text-sm font-bold">{deadlineLabel}</span>
          <span className="text-mention-grey text-xs">Les candidatures peuvent fermer plus tôt si la mission est pourvue</span>
        </InfoRow>
      )}

      <hr className="fr-hr fr-mb-0! pb-0.5!" />

      <div className="flex flex-col gap-3">
        <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
          Découvrir la mission
        </a>

        <EmailMissionModal missionId={mission.id} userScoringId={userScoringId} />
      </div>
    </aside>
  );
}
