/**
 * Normalise les scores issus de PostgreSQL pour garantir le contrat public [0, 1].
 * PostgreSQL peut renvoyer des nombres hors bornes à cause d'overrides de debug ou d'arrondis.
 */
export const clampScore = (value: number | null): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(Math.max(0, Math.min(1, value as number)).toFixed(6));
};

export const nullableNumber = (value: number | null | undefined): number | null => (value == null ? null : Number(value));
