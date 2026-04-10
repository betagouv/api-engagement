import dotenv from "dotenv";
dotenv.config();

import { TaxonomyType } from "@/db/core";
import { prisma } from "@/db/postgres";

type TaxonomyValueData = { key: string; label: string; icon?: string };

const TAXONOMY_DATA: Array<{
  key: string;
  label: string;
  type: TaxonomyType;
  values: TaxonomyValueData[];
}> = [
  {
    key: "domaine",
    label: "Domaine thématique",
    type: "multi_value",
    values: [
      { key: "sante_soins", label: "Santé et soins" },
      { key: "social_solidarite", label: "Social et solidarité" },
      { key: "environnement_nature", label: "Environnement et nature" },
      { key: "sport_animation", label: "Sport et animation sportive" },
      { key: "culture_arts", label: "Culture et arts" },
      { key: "education_transmission", label: "Éducation et transmission" },
      { key: "securite_defense", label: "Sécurité et défense" },
      { key: "international_humanitaire", label: "International et humanitaire" },
    ],
  },
  {
    key: "secteur_activite",
    label: "Secteur d'activité (référentiel ROME)",
    type: "multi_value",
    values: [
      { key: "accompagnement_social", label: "Aider ou accompagner des personnes" },
      { key: "sante_secours", label: "Santé et secours" },
      { key: "enseignement_formation", label: "Enseignement et formation" },
      { key: "securite_publique_defense", label: "Sécurité publique et défense" },
      { key: "environnement_agriculture", label: "Environnement et agriculture" },
      { key: "sport_animation_loisir", label: "Sport, animation et loisir" },
      { key: "culture_patrimoine_audiovisuel", label: "Culture, patrimoine et audiovisuel" },
      { key: "communication_marketing_numerique", label: "Communication, marketing et numérique" },
      { key: "btp_maintenance_industrie", label: "BTP, maintenance et industrie" },
      { key: "gestion_administrative_rh", label: "Gestion administrative et RH" },
      { key: "commerce_distribution_logistique", label: "Commerce, distribution et logistique" },
      { key: "humanitaire_international", label: "Humanitaire et projets solidaires à l'international" },
    ],
  },
  {
    key: "type_mission",
    label: "Type / durée de mission",
    type: "categorical",
    values: [
      { key: "ponctuelle", label: "Mission ponctuelle" },
      { key: "reguliere", label: "Mission régulière" },
      { key: "temps_plein", label: "Mission à temps plein" },
    ],
  },
  {
    key: "accessibilite",
    label: "Accessibilité handicap",
    type: "gate",
    values: [
      { key: "accessible_handicap", label: "Accessible aux personnes en situation de handicap" },
      { key: "non_specifie", label: "Non spécifié" },
    ],
  },
  {
    key: "format_activite",
    label: "Format d'activité",
    type: "multi_value",
    values: [
      { key: "organisation_evenements", label: "Organiser des événements ou actions collectives" },
      { key: "projets_collectifs", label: "Participer à des projets collectifs" },
      { key: "creation_liens_sociaux", label: "Rencontrer de nouvelles personnes et créer des liens" },
      { key: "aide_association", label: "Aider dans une association" },
      { key: "activites_sport_culture", label: "Faire des activités sportives ou culturelles" },
      { key: "secours_personnes", label: "Secourir des personnes en difficulté" },
      { key: "partage_competences", label: "Partager une expérience ou des compétences" },
      { key: "engagement_collectif_civique", label: "S'engager pour son pays dans un collectif" },
    ],
  },
  {
    key: "competence_rome",
    label: "Domaine de compétences (référentiel ROME)",
    type: "multi_value",
    values: [
      { key: "aide_accompagnement_soin", label: "Aider, accompagner ou prendre soin des autres" },
      { key: "communication_creation_numerique", label: "Communiquer, créer ou travailler avec le numérique" },
      { key: "fabrication_construction_outils", label: "Fabriquer, construire ou travailler avec des outils" },
      { key: "gestion_projet_ressources", label: "Gérer une activité, un projet ou des ressources" },
      { key: "developpement_commercial", label: "Développer une activité économique ou commerciale" },
      { key: "travail_equipe_soft_skills", label: "Travailler en équipe et développer ses compétences" },
      { key: "protection_societe_environnement", label: "Protéger les personnes, la société ou l'environnement" },
    ],
  },
  {
    key: "engagement_civique",
    label: "Type d'engagement civique",
    type: "categorical",
    values: [
      { key: "armee", label: "Armée (Terre, Marine, Air, Santé…)" },
      { key: "pompiers", label: "Pompiers et sécurité civile" },
      { key: "gendarmerie", label: "Gendarmerie" },
      { key: "police", label: "Police nationale ou municipale" },
    ],
  },
  {
    key: "niveau_engagement",
    label: "Niveau d'engagement",
    type: "ordered",
    values: [
      { key: "decouverte", label: "Première découverte" },
      { key: "engagement_structure", label: "Engagement régulier et structuré" },
    ],
  },
  {
    key: "region_internationale",
    label: "Région internationale",
    type: "categorical",
    values: [
      { key: "europe", label: "Europe" },
      { key: "afrique", label: "Afrique" },
      { key: "amerique", label: "Amérique" },
      { key: "asie", label: "Asie" },
      { key: "international_non_specifie", label: "International non spécifié" },
    ],
  },
];

const run = async () => {
  await prisma.$connect();
  console.log("[seed-taxonomy] Connected to PostgreSQL");

  let dimensionCount = 0;
  let valueCount = 0;

  for (const dim of TAXONOMY_DATA) {
    const taxonomy = await prisma.taxonomy.upsert({
      where: { key: dim.key },
      update: { label: dim.label, type: dim.type },
      create: { key: dim.key, label: dim.label, type: dim.type },
    });
    dimensionCount++;

    const activeKeys: string[] = [];

    for (let i = 0; i < dim.values.length; i++) {
      const val = dim.values[i];
      await prisma.taxonomyValue.upsert({
        where: { taxonomyId_key: { taxonomyId: taxonomy.id, key: val.key } },
        update: { label: val.label, icon: val.icon ?? null, order: i, active: true },
        create: { taxonomyId: taxonomy.id, key: val.key, label: val.label, icon: val.icon ?? null, order: i, active: true },
      });
      activeKeys.push(val.key);
      valueCount++;
    }

    // Deactivate values that are no longer in the reference
    const deactivated = await prisma.taxonomyValue.updateMany({
      where: { taxonomyId: taxonomy.id, key: { notIn: activeKeys }, active: true },
      data: { active: false },
    });
    if (deactivated.count > 0) {
      console.log(`[seed-taxonomy] ${dim.key}: ${deactivated.count} value(s) deactivated`);
    }
  }

  console.log(`[seed-taxonomy] Done: ${dimensionCount} dimensions, ${valueCount} values`);
  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[seed-taxonomy] Fatal error:", err);
  process.exit(1);
});
