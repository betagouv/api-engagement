export const isValidRNA = (rna: string): boolean => Boolean(rna && rna.length === 10 && rna.startsWith("W") && /^[W0-9]+$/.test(rna));
export const isValidSiret = (siret: string): boolean => Boolean(siret && siret.length === 14 && /^[0-9]+$/.test(siret));
export const isValidSiren = (siren: string): boolean => Boolean(siren && siren.length === 9 && /^[0-9]+$/.test(siren));
