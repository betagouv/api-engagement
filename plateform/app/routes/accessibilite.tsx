import type { Route } from "./+types/accessibilite";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Accessibilité — API Engagement" }];
}

export default function Accessibilite() {
  return (
    <main>
      <div className="fr-container py-8 md:py-16">
        <h1>Accessibilité</h1>
      </div>
    </main>
  );
}
