-- migrate:up
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_client_id" TO "client_id";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_name" TO "name";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_url" TO "url";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_type" TO "type";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_logo" TO "logo";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_description" TO "description";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_full_address" TO "full_address";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_rna" TO "rna";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_siren" TO "siren";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_siret" TO "siret";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_post_code" TO "postal_code";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_city" TO "city";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_status_juridique" TO "legal_status";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_beneficiaries" TO "beneficiaries";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_actions" TO "actions";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_reseaux" TO "parent_organizations";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "organization_verification_status" TO "verification_status";


-- migrate:down
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "client_id" TO "organization_client_id";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "name" TO "organization_name";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "url" TO "organization_url";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "type" TO "organization_type";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "logo" TO "organization_logo";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "description" TO "organization_description";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "full_address" TO "organization_full_address";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "rna" TO "organization_rna";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "siren" TO "organization_siren";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "siret" TO "organization_siret";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "postal_code" TO "organization_post_code";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "city" TO "organization_city";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "legal_status" TO "organization_status_juridique";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "beneficiaries" TO "organization_beneficiaries";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "actions" TO "organization_actions";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "parent_organizations" TO "organization_reseaux";
ALTER TABLE "analytics_raw"."publisher_organization"
RENAME COLUMN "verification_status" TO "organization_verification_status";
