import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import passport from "passport";

import { AssociationModel, RequestModel } from "@shared/models";
import { Association } from "@shared/types";

import { ASSOS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_PARAMS, NOT_FOUND, SERVER_ERROR, captureException } from "../error";
import { PublisherRequest } from "../types/passport";

const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) return;
    const request = new RequestModel({
      method: req.method,
      key: req.headers["x-api-key"] || req.headers["apikey"],
      header: req.headers,
      route: `/v1/association${req.route.path}`,
      query: req.query,
      params: req.params,
      body: req.body,
      status: res.statusCode,
      code: res.locals.code,
      message: res.locals.message,
      total: res.locals.total || 0,
    });
    await request.save();
  });
  next();
});

router.get("/:rnaId/etablissement/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      rnaId: Joi.string().required(),
      id: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });

    const association = await AssociationModel.findOne({ id_rna: params.rnaId, _id: params.id });
    if (!association) return res.status(404).send({ ok: false, code: NOT_FOUND });

    return res.status(200).send({ ok: true, data: toPublic(association) });
  } catch (error) {
    next(error);
  }
});

router.put("/:rnaId/etablissement/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      rnaId: Joi.string().required(),
      id: Joi.string().required(),
    }).validate(req.params);

    const { error: bodyError, value: body } = Joi.object({
      rnaId: Joi.string().required(),
      logo: Joi.string().uri(),
      url: Joi.string().uri(),
      linkedin: Joi.string().uri(),
      facebook: Joi.string().uri(),
      twitter: Joi.string().uri(),
      description: Joi.string(),
      donation: Joi.string().uri(),
      statut_juridique: Joi.string(),
      domaines: Joi.array().items(Joi.string()),
      publics_beneficiaires: Joi.array().items(Joi.string()),
      tags: Joi.array().items(Joi.string()),
      coordonnees: Joi.object({
        adresse: Joi.object({
          location: Joi.object({
            lat: Joi.number(),
            lon: Joi.number(),
          }),
          nom_complet: Joi.string(),
          nom: Joi.string(),
          code_postal: Joi.string(),
          code_insee: Joi.string(),
          rue: Joi.string(),
          numero: Joi.string(),
          commune: Joi.string(),
          commune_ancienne: Joi.string(),
          contexte: Joi.string(),
          departement_numero: Joi.string(),
          departement: Joi.string(),
          region: Joi.string(),
          type: Joi.string(),
        }),
        telephone: Joi.array().items(Joi.string()),
        courriel: Joi.array().items(Joi.string().email()),
      }),
    })
      .unknown()
      .validate(req.body);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });
    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: bodyError.details });

    const association = await AssociationModel.findOne({ id_rna: params.rnaId, _id: params.id });
    if (!association) return res.status(404).send({ ok: false, code: NOT_FOUND });

    // Required for history update (see below).
    const publicDataBeforeModification = toPublic(association);

    if (body.logo) association.logo = body.logo;
    if (body.url) association.url = body.url;
    if (body.linkedin) association.linkedin = body.linkedin;
    if (body.facebook) association.facebook = body.facebook;
    if (body.twitter) association.twitter = body.twitter;

    if (body.description) association.description = body.description;
    if (body.donation) association.donation = body.donation;
    if (body.statut_juridique) association.statut_juridique = body.statut_juridique;
    if (body.domaines) association.domaines = body.domaines;
    if (body.publics_beneficiaires) association.publics_beneficiaires = body.publics_beneficiaires;

    if (body.tags) {
      if (Array.isArray(body.tags)) association.tags = body.tags;
      else association.tags = [...new Set([...(association.tags || []), body.tags])];
    }

    if (body.coordonnees?.courriel) {
      if (Array.isArray(body.coordonnees.courriel)) association.coordonnees_courriel = body.coordonnees.courriel;
      else association.coordonnees_courriel = [...new Set([...(association.coordonnees_courriel || []), body.coordonnees.courriel])];
    }
    if (body.coordonnees?.telephone) {
      if (Array.isArray(body.coordonnees.telephone)) association.coordonnees_telephone = body.coordonnees.telephone;
      else association.coordonnees_telephone = [...new Set([...(association.coordonnees_telephone || []), body.coordonnees.telephone])];
    }

    if (body.coordonnees?.adresse) {
      const adresse = body.coordonnees.adresse;
      if (adresse.location) association.coordonnees_adresse_location = adresse.location;
      if (adresse.nom_complet) association.coordonnees_adresse_nom_complet = adresse.nom_complet;
      if (adresse.nom) association.coordonnees_adresse_nom = adresse.nom;
      if (adresse.code_postal) association.coordonnees_adresse_code_postal = adresse.code_postal;
      if (adresse.code_insee) association.coordonnees_adresse_code_insee = adresse.code_insee;
      if (adresse.rue) association.coordonnees_adresse_rue = adresse.rue;
      if (adresse.numero) association.coordonnees_adresse_numero = adresse.numero;
      if (adresse.commune) association.coordonnees_adresse_commune = adresse.commune;
      if (adresse.commune_ancienne) association.coordonnees_adresse_commune_ancienne = adresse.commune_ancienne;
      if (adresse.contexte) association.coordonnees_adresse_contexte = adresse.contexte;
      if (adresse.departement_numero) association.coordonnees_adresse_departement_numero = adresse.departement_numero;
      if (adresse.departement) association.coordonnees_adresse_departement = adresse.departement;
      if (adresse.region) association.coordonnees_adresse_region = adresse.region;
      if (adresse.type) association.coordonnees_adresse_type = adresse.type;
    }

    // Update history. This way of storing history is not that smart.
    // I guess we should change it (and migrate legacy history), that's why I added a version format (V1).
    const publicDataAfterModification = toPublic(association);

    if (!association.history) association.history = [];
    association.history.push(
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        historyFormat: "v1",
        publisherId: req.user._id,
        publisherName: req.user.name,
        publicDataBeforeModification,
        publicDataAfterModification,
      }),
    );

    association.updated_at = new Date();
    await association.save();

    return res.status(200).send({ ok: true, data: publicDataAfterModification });
  } catch (error) {
    next(error);
  }
});

router.get("/:rnaId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      rnaId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });

    const associations = await AssociationModel.find({ id_rna: params.rnaId });
    if (!associations) return res.status(404).send({ ok: false, code: NOT_FOUND });

    return res.status(200).send({ ok: true, data: associations.map((e) => toPublic(e)) });
  } catch (error) {
    next(error);
  }
});

router.post("/search", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const { error: bodyError, value: body } = Joi.object({
      name: Joi.string().required(),
      city: Joi.string(),
      minScore: Joi.number(),
      size: Joi.number(),
      onlyPrimary: Joi.boolean().default(false),
    })
      .unknown()
      .validate(req.body);

    if (bodyError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: bodyError.details });

    const where = {
      query: {
        bool: {
          must: [
            customQuery(body.name, [
              "identite_nom^10",
              "identite_sigle^5",
              "coordonnees_adresse_commune^4",
              "description^4",
              "coordonnees_adresse_region^3",
              "activites_objet^2",
              "activites_lib_famille1^2",
              "coordonnees_adresse_departement^1",
            ]),
            { bool: { should: [{ term: { "identite_active.keyword": "true" } }] } },
          ],
        },
      },
    } as { [key: string]: any };

    if (body.onlyPrimary) {
      where.query.bool.filter = [{ term: { est_etablissement_secondaire: "false" } }];
    }

    if (body.city) {
      where.query.bool.must.push({
        bool: {
          should: [{ match: { coordonnees_adresse_commune: { query: body.city, boost: 7 } } }, { match: { coordonnees_adresse_siege_commune: { query: body.city, boost: 3 } } }],
        },
      });
    }

    if (body.minScore) where.min_score = body.minScore;
    if (body.size) where.size = body.size;

    const result = await esClient.search({ index: ASSOS_INDEX, body: where });
    const data = result.body.hits.hits.map((e: { _id: string; _score: number; _source: Association }) => toPublic({ _id: e._id, score: e._score, ...e._source }));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    captureException(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

const toPublic = (data: Association) => {
  return {
    _id: data._id || data._id,
    rna: data.id_rna,
    name: data.identite_nom,
    regime: data.identite_regime,
    theme: data.activites_lib_theme1,
    famille: data.activites_lib_famille1,
    domaines: data.domaines?.length ? data.domaines : undefined,
    statut_juridique: data.statut_juridique,
    publics_beneficiaires: data.publics_beneficiaires?.length ? data.publics_beneficiaires : undefined,
    est_etablissement_secondaire: data.est_etablissement_secondaire === "true" ? true : false,
    coordonnees: {
      adresse: {
        location: data.coordonnees_adresse_location,
        nom_complet: data.coordonnees_adresse_nom_complet,
        nom: data.coordonnees_adresse_nom,
        code_postal: data.coordonnees_adresse_code_postal,
        code_insee: data.coordonnees_adresse_code_insee,
        rue: data.coordonnees_adresse_rue,
        numero: data.coordonnees_adresse_numero,
        commune: data.coordonnees_adresse_commune,
        commune_ancienne: data.coordonnees_adresse_commune_ancienne,
        contexte: data.coordonnees_adresse_contexte,
        departement_numero: data.coordonnees_adresse_departement_numero,
        departement: data.coordonnees_adresse_departement,
        region: data.coordonnees_adresse_region,
        type: data.coordonnees_adresse_type,
      },
      telephone: data.coordonnees_telephone,
      courriel: data.coordonnees_courriel,
    },
    objet: data.activites_objet,
    description: data.description,
    // All logo are uploaded to S3. When it fails, we try to get it from original URL.
    logo: data.logo,
    url: data.url,
    linkedin: data.linkedin,
    facebook: data.facebook,
    twitter: data.twitter,
    donation: data.donation,
    active: data.identite_active !== "false",
    siren: data.identite_id_siren,
    tags: data.tags,
  };
};

const customQuery = (query: string, fields: string[]) => {
  // No value, return all documents (
  if (!query) {
    return {
      bool: {
        must: [{ exists: { field: "identite_nom" } }],
        must_not: [{ term: { identite_nom: "" } }],
      },
    };
  }

  // Exact ID RNA
  const exactRef = { term: { "id_rna.keyword": { value: query, boost: 10 } } };

  // If it "seems" to be a query_string (contains `"foo"`, ` +bar` or ` -baz`)
  if (query.match(/"[^"]*"| -| \+/)) {
    return { simple_query_string: { query, default_operator: "and", fields } };
  }

  // Otherwise build a complex query with these rules (by boost order):
  // 1 - strict term in fields (boost 5)
  const strict = {
    multi_match: {
      query,
      operator: "and",
      fields: fields.map((f) => f.replace("^", ".strict^")),
      boost: 4,
    },
  };

  // 2 - strict term in fields, cross_fields
  const strictCross = {
    multi_match: {
      query,
      operator: "and",
      fields: fields.map((f) => f.replace("^", ".strict^")),
      type: "cross_fields",
      boost: 2,
    },
  };

  // 3 - fuzzy (all terms must be present)
  const fuzzy = {
    multi_match: { query, operator: "and", fields, type: "cross_fields" },
  };

  // Return the whole query with all rules
  return { bool: { should: [exactRef, strict, strictCross, fuzzy] } };
};

export default router;
