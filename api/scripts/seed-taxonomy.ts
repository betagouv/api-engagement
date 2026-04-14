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
      { key: "gestion_projet", label: "Gestion de projet" },
      { key: "je_ne_sais_pas", label: "Je ne sais pas encore" },
    ],
  },
  {
    key: "secteur_activite",
    label: "Secteur d'activité (référentiel ROME)",
    type: "multi_value",
    values: [
      { key: "sante_social_aide_personne", label: "Santé, social et aide à la personne" },
      { key: "education_formation_animation", label: "Éducation, formation et animation" },
      { key: "securite_service_public", label: "Sécurité et service public" },
      { key: "environnement_agriculture", label: "Environnement et agriculture" },
      { key: "culture_creation_medias", label: "Culture, création et médias" },
      { key: "numerique_communication", label: "Numérique et communication" },
      { key: "batiment_industrie_logistique", label: "Bâtiment, industrie et logistique" },
      { key: "gestion_commerce_organisation", label: "Gestion, commerce et organisation" },
      { key: "je_ne_sais_pas", label: "Je ne sais pas encore" },
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
      { key: "je_ne_sais_pas", label: "Je ne sais pas encore" },
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
    key: "competence_rome",
    label: "Domaine de compétences (référentiel ROME)",
    type: "multi_value",
    values: [
      { key: "aide_accompagnement_soin", label: "Aider, accompagner ou prendre soin des autres", icon: "🤲" },
      { key: "communication_creation_numerique", label: "Communiquer, créer ou travailler avec le numérique", icon: "💻" },
      { key: "fabrication_construction_outils", label: "Fabriquer, construire ou travailler avec des outils et des machines", icon: "🛠️" },
      { key: "gestion_projet_ressources", label: "Gérer une activité, un projet ou des ressources", icon: "💼" },
      { key: "developpement_commercial", label: "Développer une activité économique ou commerciale", icon: "📈" },
      { key: "travail_equipe_soft_skills", label: "Travailler en équipe et développer ses compétences personnelles", icon: "🤝" },
      { key: "protection_societe_environnement", label: "Protéger les personnes, la société ou l'environnement", icon: "🛡️" },
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
      { key: "je_ne_sais_pas", label: "Je ne sais pas" },
      { key: "aucun", label: "Aucun de ces choix" },
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
      { key: "je_ne_sais_pas", label: "Je ne sais pas encore" },
    ],
  },
  {
    key: "engagement_intent",
    label: "Intention d'engagement",
    type: "categorical",
    values: [
      { key: "aide_directe", label: "Aide directe aux personnes", icon: "🤝" },
      { key: "transmission", label: "Transmission / pédagogie / accompagnement de public", icon: "🎓" },
      { key: "animation", label: "Animation d'actions ou de collectif", icon: "🎉" },
      { key: "action_terrain", label: "Action terrain concrète (collecte, distribution, fabrication…)", icon: "🌱" },
      { key: "secours", label: "Secours / intervention", icon: "🚒" },
      { key: "cadre_engage", label: "Engagement en cadre structuré", icon: "🪖" },
      { key: "support_organisation", label: "Organisation / gestion de projet / communication", icon: "🧠" },
      { key: "exploration", label: "Je ne sais pas encore", icon: "🤷" },
    ],
  },
  {
    key: "orientation_onisep",
    label: "Orientation professionnelle (référentiel ONISEP)",
    type: "categorical",
    values: [
      { key: "environnement_nature_sciences", label: "Environnement, nature et sciences", icon: "🌱" },
      { key: "numerique_communication", label: "Numérique et communication", icon: "💻" },
      { key: "commerce_gestion_finance", label: "Commerce, gestion, finance et services", icon: "💼" },
      { key: "societe_droit_politique", label: "Société, droit et politique", icon: "⚖️" },
      { key: "education_culture_creation", label: "Éducation, culture et création", icon: "🧑‍🏫" },
      { key: "social_sante_sport", label: "Social, santé et sport", icon: "🌍" },
      { key: "technique_industrie_construction", label: "Technique, industrie et construction", icon: "🛠️" },
      { key: "securite_defense_logistique", label: "Sécurité, défense et logistique", icon: "🚓" },
      { key: "je_ne_sais_pas", label: "Je ne sais pas encore", icon: "🤷" },
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
