-- DropForeignKey
ALTER TABLE "publisher_diffusion" DROP CONSTRAINT "publisher_diffusion_diffuseur_publisher_id_fkey";

-- DropForeignKey
ALTER TABLE "publisher_diffusion" DROP CONSTRAINT "publisher_diffusion_annonceur_publisher_id_fkey";

-- DropForeignKey
ALTER TABLE "publisher_diffusion_exclusion" DROP CONSTRAINT "pde_excluded_by_annonceur_id_fkey";

-- DropForeignKey
ALTER TABLE "publisher_diffusion_exclusion" DROP CONSTRAINT "pde_excluded_for_diffuseur_id_fkey";

-- DropForeignKey
ALTER TABLE "publisher_diffusion_exclusion" DROP CONSTRAINT "publisher_diffusion_exclusion_publisher_organization_id_fkey";

-- DropTable
DROP TABLE "publisher_diffusion";

-- DropTable
DROP TABLE "publisher_diffusion_exclusion";

