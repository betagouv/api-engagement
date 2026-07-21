import type { Route } from "./+types/accessibilite";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Accessibilité — Trouve ta mission" }];
}

export default function Accessibilite() {
  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container py-8 md:py-16">
        <h1>Accessibilité</h1>
      </div>
    </main>
  );
}
