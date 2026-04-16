import { Footer as DsfrFooter } from "@codegouvfr/react-dsfr/Footer";

export default function Footer() {
  return (
    <DsfrFooter
      brandTop={
        <>
          République
          <br />
          Française
        </>
      }
      homeLinkProps={{ href: "/", title: "Accueil — API Engagement" }}
      accessibility="fully compliant"
    />
  );
}
