import type { MissionDetailResponse } from "@engagement/dto";
import type { ReactNode } from "react";
import EmailMissionModal from "~/components/mission-detail/email-mission-details-modal";
import { formatCompensation, formatStartDate } from "~/utils/mission";

interface MissionCtaPanelProps {
  mission: MissionDetailResponse;
  userScoringId?: string;
  className?: string;
  deadlineLabel?: string;
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <i className={`${icon} fr-icon--sm text-mention-grey mt-0.5 flex-none`} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}

export default function MissionCtaPanel({ mission, userScoringId, deadlineLabel = "", className = "" }: MissionCtaPanelProps) {
  const durationLabel = formatStartDate(mission.startAt, mission.duration);
  const compensationLabel = mission.compensation ? formatCompensation(mission.compensation, { withType: true }) : null;

  return (
    <aside className={`md:shadow-card flex flex-col gap-6 bg-background px-5! py-5! md:p-6! ${className}`}>
      <hr className="h-px! pb-0! bg-border-default-grey -mx-5! md:hidden!" />

      {(durationLabel || mission.schedule) && (
        <InfoRow icon="fr-icon-time-line">
          {durationLabel && <span className="text-title-grey font-bold">{durationLabel}</span>}
          {mission.schedule && <span className="text-title-grey">{mission.schedule}</span>}
        </InfoRow>
      )}

      {compensationLabel && (
        <>
          <hr className="h-px! pb-0! bg-border-default-grey -mx-5! md:hidden!" />
          <InfoRow icon="fr-icon-money-euro-circle-line">
            <span className="text-title-grey font-bold">{compensationLabel}</span>
          </InfoRow>
        </>
      )}

      {deadlineLabel && (
        <>
          <hr className="h-px! pb-0! bg-border-default-grey -mx-5! md:hidden!" />
          <InfoRow icon="fr-icon-calendar-line">
            <span className="text-title-grey text-sm font-bold">{deadlineLabel}</span>
            <span className="text-mention-grey text-xs">Les candidatures peuvent fermer plus tôt si la mission est pourvue</span>
          </InfoRow>
        </>
      )}

      <hr className="h-px! pb-0! bg-border-default-grey -mx-5! md:mx-0!" />

      <div className="flex flex-col gap-3">
        <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
          Découvrir la mission
        </a>

        <EmailMissionModal missionId={mission.id} publisherId={mission.publisherId} userScoringId={userScoringId} />

        {deadlineLabel && <p className="text-mention-grey text-sm! md:hidden text-center!">{deadlineLabel}</p>}
      </div>
    </aside>
  );
}
