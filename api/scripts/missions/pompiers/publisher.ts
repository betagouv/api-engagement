// Overrides pour les publishers dont le nom ne contient pas de numéro de département standard
const DEPT_OVERRIDES: Record<string, string[]> = {
  "69": ["sdmis", "métropole de lyon"],
  "67": ["bas-rhin", "sis 67", "sis67"],
  "68": ["haut-rhin", "sis 68", "sis68"],
  "2A": ["corse du sud", "corse-du-sud", "sis2a", "sis 2a", "sdis 2a"],
  "2B": ["haute-corse", "haute corse", "sis2b", "sis 2b", "sdis 2b"],
  "972": ["martinique", "sis972", "sis 972"],
};

function normalizeDept(dept: string): string {
  return dept.replace(/^0+/, "");
}

export function findPublisherForDept(publishers: { id: string; name: string; apikey: string | null }[], dept: string): { id: string; name: string; apikey: string | null } | null {
  const normalized = normalizeDept(dept);
  const paddedDept = dept.length === 1 ? `0${dept}` : dept;
  const overrideKeywords = DEPT_OVERRIDES[dept] ?? [];

  return (
    publishers.find((p) => {
      const nameLower = p.name.toLowerCase();
      if (overrideKeywords.some((kw) => nameLower.includes(kw))) return true;
      if (nameLower.includes(` ${paddedDept} `) || nameLower.includes(` ${paddedDept}`) || nameLower.endsWith(paddedDept)) return true;
      if (normalized !== paddedDept && normalized.length > 1 && (nameLower.includes(` ${normalized} `) || nameLower.includes(` ${normalized}`) || nameLower.endsWith(normalized)))
        return true;
      return false;
    }) ?? null
  );
}
