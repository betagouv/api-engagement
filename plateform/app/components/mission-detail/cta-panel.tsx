import type { MissionDetailPayload } from "@engagement/dto";
import type { ReactNode } from "react";
import { formatCompensation, formatStartDate } from "~/utils/mission";

interface MissionCtaPanelProps {
  mission: MissionDetailPayload;
  className?: string;
}

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-4">
      <i className={`${icon} fr-icon--sm mt-0.5 flex-none text-mention-grey`} aria-hidden="true" />
      <p className="fr-mb-0 flex flex-col gap-0.5">{children}</p>
    </div>
  );
}

export default function MissionCtaPanel({ mission, className = "" }: MissionCtaPanelProps) {
  const durationLabel = formatStartDate(mission.startAt, mission.duration);
  const compensationLabel = mission.compensation ? formatCompensation(mission.compensation) : null;

  return (
    <aside className={`fr-card fr-card--no-arrow ${className}`}>
      <div className="fr-card__body">
        <div className="fr-card__content">
          {(durationLabel || mission.schedule) && (
            <InfoRow icon="fr-icon-time-line">
              {durationLabel && <span className="font-bold">{durationLabel}</span>}
              {mission.schedule && <span className="fr-text--sm text-mention-grey">{mission.schedule}</span>}
            </InfoRow>
          )}

          {compensationLabel && (
            <InfoRow icon="fr-icon-money-euro-circle-line">
              <span className="font-bold">{compensationLabel}</span>
            </InfoRow>
          )}

          <hr className="fr-hr fr-my-2w" />

          <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer" className="fr-btn w-full! justify-center!">
            Découvrir la mission
          </a>

          <button type="button" className="fr-btn fr-btn--secondary fr-mt-2w w-full! justify-center!">
            Recevoir cette mission par e-mail
          </button>
        </div>
      </div>
    </aside>
  );
}
