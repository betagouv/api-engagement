// Structure d'une offre leboncoin = contenu d'un élément <job>, à plat, dans l'ordre du
// fichier d'exemple fourni (Exemple anonymisé Flux.xml).
// Envelope : <source> → <publisher>/<publisherurl> → n × <job>.

export interface LeboncoinOffer {
  user_id: string;
  partner_unique_reference: string;
  title: string;
  description: string;
  contract_type: string;
  application: { mode: string; contact: string };
  location: { city: string; zip_code: string; country: string };
  time: { type: string };
  company?: string;
  logo?: string;
  client_reference?: string;
  business_sector?: number;
  occupation?: number;
}
