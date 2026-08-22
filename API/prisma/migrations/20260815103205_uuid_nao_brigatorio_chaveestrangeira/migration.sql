-- DropForeignKey
ALTER TABLE "public"."Chamado" DROP CONSTRAINT "Chamado_EquipeId_fkey";

-- AlterTable
ALTER TABLE "Chamado" ALTER COLUMN "EquipeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_EquipeId_fkey" FOREIGN KEY ("EquipeId") REFERENCES "Equipe"("EquipeId") ON DELETE SET NULL ON UPDATE CASCADE;
