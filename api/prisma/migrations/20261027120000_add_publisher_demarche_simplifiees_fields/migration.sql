-- Démarches Simplifiées : libellés des champs du formulaire à lire pour enrichir les candidatures.
ALTER TABLE "publisher_demarche_simplifiees" ADD COLUMN "birth_date_field" TEXT,
ADD COLUMN "country_field" TEXT,
ADD COLUMN "postal_code_field" TEXT;
