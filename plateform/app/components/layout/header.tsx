import { Header as DsfrHeader } from "@codegouvfr/react-dsfr/Header";

export default function Header() {
  return (
    <DsfrHeader
      brandTop={
        <>
          République
          <br />
          Française
        </>
      }
      serviceTitle="API Engagement"
      serviceTagline="Trouvez votre mission de bénévolat"
      homeLinkProps={{ href: "/", title: "Accueil — API Engagement" }}
    />
  );
}
