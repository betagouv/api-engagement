/**
 * Interface représentant les indicateurs de performance (KPI)
 */
export interface Kpi {
  _id?: string;
  date: Date;
  
  // Compteurs de missions disponibles
  availableBenevolatMissionCount?: number;
  availableVolontariatMissionCount?: number;
  
  // Compteurs de places données
  availableBenevolatGivenPlaceCount?: number;
  availableVolontariatGivenPlaceCount?: number;
  
  // Compteurs de places attribuées
  availableBenevolatAttributedPlaceCount?: number;
  availableVolontariatAttributedPlaceCount?: number;
  
  // Pourcentages de places données
  percentageBenevolatGivenPlaces?: number;
  percentageVolontariatGivenPlaces?: number;
  
  // Pourcentages de places attribuées
  percentageBenevolatAttributedPlaces?: number;
  percentageVolontariatAttributedPlaces?: number;
  
  // Compteurs d'impressions de missions
  benevolatPrintMissionCount?: number;
  volontariatPrintMissionCount?: number;
  
  // Compteurs de clics sur missions
  benevolatClickMissionCount?: number;
  volontariatClickMissionCount?: number;
  
  // Compteurs de candidatures sur missions
  benevolatApplyMissionCount?: number;
  volontariatApplyMissionCount?: number;
  
  // Compteurs de créations de compte pour missions
  benevolatAccountMissionCount?: number;
  volontariatAccountMissionCount?: number;
  
  // Compteurs d'impressions
  benevolatPrintCount?: number;
  volontariatPrintCount?: number;
  
  // Compteurs de clics
  benevolatClickCount?: number;
  volontariatClickCount?: number;
  
  // Compteurs de candidatures
  benevolatApplyCount?: number;
  volontariatApplyCount?: number;
  
  // Compteurs de créations de compte
  benevolatAccountCount?: number;
  volontariatAccountCount?: number;
  
  // Timestamps ajoutés par Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}
