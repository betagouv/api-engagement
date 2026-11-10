// Structure d'une offre Hellowork = contenu d'un élément <offre>, dans l'ordre de l'exemple du PDF
// (Flux RJ Spec). Envelope : <root> → n × <offre>.

export interface HelloworkAddress {
  Voie?: string;
  CodePostal: string;
  Ville: string;
  Departement?: string;
  Region?: string;
  Pays: string;
  Latitude?: number;
  Longitude?: number;
}

export interface HelloworkOffer {
  Nom_Ese: string;
  Agence?: string;
  Poste: string;
  Reference: string;
  ExternalId: string;
  DescriptionEntreprise?: string;
  DescriptionPoste: string;
  Profil: string;
  AdressesPostales: { AdressePostale: HelloworkAddress[] };
  Ville: string;
  NiveauSalaire?: { "@_Devise": string; "@_Periodicite": string; "@_Affichable": string; SalaireMin: number; SalaireMax?: number };
  Url_Reponse: string;
  Aveugle: number;
  DateAnnonce: string;
  DateModification: string;
  Criteres: { CritereSecteur: string; CritereContrat: string; Teletravail: string };
  Mission?: { StartDate?: string; EndDate?: string };
}
