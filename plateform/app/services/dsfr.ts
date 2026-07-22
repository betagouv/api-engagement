interface DsfrModalApi {
  modal: {
    disclose(): void;
  };
}

declare global {
  interface Window {
    dsfr?: (element: Element) => DsfrModalApi;
  }
}

let initialization: Promise<void> | null = null;

export function initializeDsfr(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  initialization ??= import("@gouvfr/dsfr/dist/dsfr.module.min.js").then(() => undefined);
  return initialization;
}

export async function openDsfrModal(id: string): Promise<void> {
  await initializeDsfr();
  const modal = document.getElementById(id);
  if (modal) window.dsfr?.(modal).modal.disclose();
}
