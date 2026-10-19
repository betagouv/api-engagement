// Seed de dev : recrée la landing « Chacun pour tous » dans le CMS (contenu repris de plateform) et le jeton
// de lecture de plateform. Idempotent : relancer remplace la landing. Usage : `npm run seed` dans le conteneur cms.
import fs from "node:fs";
import path from "node:path";

import { compileStrapi, createStrapi, type Core } from "@strapi/strapi";
import mime from "mime-types";

const ASSETS = process.env.SEED_ASSETS_DIR ?? "/seed-assets";
const IMAGES = path.join(ASSETS, "images");
const SLUG = "chacun-pour-tous";
const UID = "api::landing-page.landing-page";
const TOKEN_NAME = "plateform (lecture seule)";

const uploadImage = async (strapi: Core.Strapi, relativePath: string, alternativeText = ""): Promise<number> => {
  const filepath = path.join(IMAGES, relativePath);
  const name = path.basename(filepath);
  const existing = await strapi.db.query("plugin::upload.file").findOne({ where: { name } });
  if (existing) {
    return existing.id;
  }

  const [file] = await strapi
    .plugin("upload")
    .service("upload")
    .upload({
      data: { fileInfo: { name, alternativeText } },
      files: { filepath, originalFilename: name, mimetype: mime.lookup(filepath) || "application/octet-stream", size: fs.statSync(filepath).size },
    });
  return file.id;
};

// Jeton lecture seule à valeur fixe (CMS_API_TOKEN), pour ne pas avoir à le recopier dans plateform à chaque seed.
// Le hash est calculé par le service Strapi lui-même (`admin::api-token`) ; dev local uniquement.
const ensureReadToken = async (strapi: Core.Strapi) => {
  const accessKey = process.env.CMS_API_TOKEN;
  if (!accessKey) {
    return console.warn("CMS_API_TOKEN absent : jeton non créé.");
  }

  const { hash } = strapi.service("admin::api-token") as unknown as { hash: (accessKey: string) => string };
  const query = strapi.db.query("admin::api-token");
  await query.deleteMany({ where: { name: TOKEN_NAME } });
  await query.create({
    data: {
      name: TOKEN_NAME,
      description: "Lecture du contenu publié et des brouillons (preview).",
      type: "read-only",
      kind: "content-api",
      accessKey: hash(accessKey),
      lifespan: null,
      expiresAt: null,
    },
  });
};

const buildBlocks = async (strapi: Core.Strapi) => {
  const histoire = (n: number) => uploadImage(strapi, `landings/chacun-pour-tous/histoire-${n}.webp`);
  const logo = (file: string) => uploadImage(strapi, `logo/${file}`);

  return [
    {
      __component: "blocks.hero",
      title: "S'engager ça fait du bien, à soi, aux autres, au pays.",
      description: "On croit que s'engager, c'est rare. En fait, 3 Français sur 4 l'ont déjà fait cette année.\nOn fait le tour des bonnes idées ?",
      hint: "En quelques questions, trouve une mission qui te correspond.",
      visual: "chacun_pour_tous",
      backgroundColor: "#FBF6ED",
    },
    {
      __component: "blocks.missions",
      title: "Chaque ==geste compte==",
      description:
        "Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre les missions qui te correspondent !",
      slots: [
        { dispositif: "benevolat", domaineEngagement: "solidarite_inclusion" },
        { dispositif: "service_civique", domaineEngagement: "sport" },
        { dispositif: "sapeurs_pompiers" },
        { dispositif: "benevolat", domaineEngagement: "education" },
      ],
      fillWithRandom: true,
      examples: true,
      background: "creme",
    },
    {
      __component: "blocks.etapes",
      items: [
        { icon: "self_training", title: "Réponds en trois minutes", description: "Le formulaire du gouv le plus court de ta vie" },
        { icon: "search", title: "Découvre les missions", description: "On te montre celles qui vont te plaire" },
        { icon: "mail_send", title: "Ton engagement commence ici", description: "On te met en relation avec le service public qui a besoin d'aide" },
      ],
    },
    {
      __component: "blocks.benefits",
      title: "Bon pour toi,\nutile pour tous",
      benefits: [
        { emoji: "🎓", label: "De l'expérience pour ton CV" },
        { emoji: "💼", label: "Des compétences" },
        { emoji: "🤝", label: "Des rencontres" },
        { emoji: "💸", label: "Avec ou sans indemnité" },
        { emoji: "❤️", label: "La fierté d'être utile" },
      ],
      newsletterTitle: "Pas le bon moment ?\nOn te prévient",
      newsletterText: "On t'envoie des idées de missions une fois par mois près de chez toi.",
    },
    {
      __component: "blocks.cards",
      title: "Une mission pour ==chaque étape de== la vie",
      cards: [
        { icon: "backpack", title: "Tu fais des études ?", points: "Des missions dès 16 ans\nPendant les week-ends et les vacances" },
        { icon: "search", title: "Tu cherches un emploi ?", points: "Une expérience pour rebondir\nService Civique indemnisé" },
        { icon: "self_training", title: "Tu travailles déjà ?", points: "Quelques heures par mois\nLe soir ou les week-ends" },
      ],
    },
    {
      __component: "blocks.stories",
      title: "Des histoires vraies qui donnent\n==envie d'agir==",
      intro:
        "À ceux qui votent, qui laissent passer les piétons, qui sourient aux bébés, à celles qui donnent du temps à une cause, qui portent les cartons du voisin… À tous ceux qui prennent part sans le savoir : MERCI",
      stories: [
        {
          image: await histoire(1),
          domain: "Prévention et protection",
          story: "Quentin participe à des missions de sécurité et de secours aux côtés de l'armée, depuis 8 mois",
          publisher: "Les réserves des armées",
          logo: await logo("roc-logo.png"),
        },
        {
          image: await histoire(2),
          domain: "Solidarité",
          story: "Seb améliore la qualité de vie des personnes en situation de handicap depuis 6 mois",
          publisher: "Service Civique",
          logo: await logo("asc-logo.png"),
        },
        {
          image: await histoire(3),
          domain: "Prévention et protection",
          story: "Marie, pompier 2 fois par semaine depuis 7 mois",
          publisher: "Sapeurs-pompiers volontaires",
          logo: await logo("spv-logo.png"),
        },
        {
          image: await histoire(4),
          domain: "Éducation pour tous",
          story: "Adrien accompagne des mineurs étrangers vers la réussite de leur apprentissage depuis 9 mois",
          publisher: "JeVeuxAider.gouv.fr",
          logo: await logo("jva-logo.png"),
        },
      ],
    },
    {
      __component: "blocks.faq",
      title: "Tu te poses les mêmes ==questions ?==",
      intro:
        "[TrouveTaMission.gouv.fr](/) est le service public numérique de l'engagement, accessible à tous, dès 16 ans. Cette plateforme oriente les envies d'agir des citoyens et des citoyennes vers les missions d'intérêt général.",
      questions: [
        {
          icon: "environment",
          question: "Comment avoir vraiment de l'impact, et pas juste en parler ?",
          answer: "Parce qu'agir, même à petite échelle, change tout, pour toi et pour les autres.",
        },
        { icon: "community", question: "Comment rejoindre une communauté qui a du sens ?", answer: "Rencontre des personnes qui, comme toi, veulent agir concrètement." },
        {
          icon: "backpack",
          question: "Et ça compte pour mon parcours ?",
          answer: "Oui ! Chaque mission t'apporte des compétences, des connaissances, une idée plus claire de ce que tu veux faire.",
        },
        {
          icon: "human_cooperation",
          question: "Chacun pour tous",
          answer: "Qu'on se le dise : nous sommes plus engagés que nous ne le croyons. 74 % des Français ont fait au moins un acte civique dans l'année.",
        },
      ],
    },
    {
      __component: "blocks.partners",
      title: "Toutes les missions d’engagement vérifiées par l'État",
      partners: [
        { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: await logo("roc-logo.png") },
        { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: await logo("jva-logo.png") },
        { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.", logo: await logo("asc-logo.png") },
        { name: "Sapeurs-pompiers de France", description: "Deviens sapeur-pompier volontaire près de chez toi.", logo: await logo("spv-logo.png") },
        { name: "Gendarmerie nationale", description: "Deviens gendarme près de chez toi.", logo: await logo("gendarmerie-logo.png") },
      ],
    },
  ];
};

const main = async () => {
  const app = await createStrapi(await compileStrapi()).load();
  app.log.level = "error";

  const documents = app.documents(UID);
  for (const old of await documents.findMany({ filters: { slug: SLUG } })) {
    await documents.delete({ documentId: old.documentId });
  }

  await documents.create({
    status: "published",
    data: {
      title: "Chacun pour tous",
      slug: SLUG,
      seoTitle: "Chacun pour tous | Trouve ta mission",
      seoDescription:
        "S'engager ça fait du bien, à soi, aux autres, au pays. Bénévolat, Service Civique, pompiers ou réservistes : trouve la mission d'engagement qui te ressemble.",
      ogTitle: "Chacun pour tous",
      ogDescription: "3 Français sur 4 se sont déjà engagés cette année. Et toi ?",
      noindex: true,
      // Le typage généré des zones dynamiques est trop strict pour ce seed : Strapi valide le contenu à l'exécution.
      blocks: (await buildBlocks(app)) as never,
    },
  });
  await ensureReadToken(app);

  console.log(`Landing « ${SLUG} » créée.`);
  await app.destroy();
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
