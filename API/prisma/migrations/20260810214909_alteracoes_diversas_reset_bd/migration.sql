/*
  Warnings:

  - The primary key for the `AtividadeChamado` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Chamado` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Departamento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Equipe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Gestor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `HistoricoChamado` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Pessoa` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Tecnico` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TecnicoEquipe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `UnidadeId` on the `TipoSuporte` table. All the data in the column will be lost.
  - Made the column `EquipeId` on table `Chamado` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TipSupUniStatus" AS ENUM ('ATIVO', 'INATIVO');

-- DropForeignKey
ALTER TABLE "public"."AtividadeChamado" DROP CONSTRAINT "AtividadeChamado_ChamadoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AtividadeChamado" DROP CONSTRAINT "AtividadeChamado_TecnicoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Chamado" DROP CONSTRAINT "Chamado_EquipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Chamado" DROP CONSTRAINT "Chamado_PessoaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HistoricoChamado" DROP CONSTRAINT "HistoricoChamado_ChamadoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Tecnico" DROP CONSTRAINT "Tecnico_DepartamentoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TecnicoEquipe" DROP CONSTRAINT "TecnicoEquipe_EquipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TecnicoEquipe" DROP CONSTRAINT "TecnicoEquipe_TecnicoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TipoSuporte" DROP CONSTRAINT "TipoSuporte_UnidadeId_fkey";

-- DropIndex
DROP INDEX "public"."Gestor_GestorCPF_key";

-- DropIndex
DROP INDEX "public"."Pessoa_PessoaCPF_key";

-- DropIndex
DROP INDEX "public"."Tecnico_TecnicoCPF_key";

-- AlterTable
ALTER TABLE "AtividadeChamado" DROP CONSTRAINT "AtividadeChamado_pkey",
ALTER COLUMN "AtividadeId" DROP DEFAULT,
ALTER COLUMN "AtividadeId" SET DATA TYPE TEXT,
ALTER COLUMN "ChamadoId" SET DATA TYPE TEXT,
ALTER COLUMN "TecnicoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AtividadeChamado_pkey" PRIMARY KEY ("AtividadeId");
DROP SEQUENCE "AtividadeChamado_AtividadeId_seq";

-- AlterTable
ALTER TABLE "Chamado" DROP CONSTRAINT "Chamado_pkey",
ALTER COLUMN "ChamadoId" DROP DEFAULT,
ALTER COLUMN "ChamadoId" SET DATA TYPE TEXT,
ALTER COLUMN "PessoaId" SET DATA TYPE TEXT,
ALTER COLUMN "EquipeId" SET NOT NULL,
ALTER COLUMN "EquipeId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Chamado_pkey" PRIMARY KEY ("ChamadoId");
DROP SEQUENCE "Chamado_ChamadoId_seq";

-- AlterTable
ALTER TABLE "Departamento" DROP CONSTRAINT "Departamento_pkey",
ALTER COLUMN "DepartamentoId" DROP DEFAULT,
ALTER COLUMN "DepartamentoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Departamento_pkey" PRIMARY KEY ("DepartamentoId");
DROP SEQUENCE "Departamento_DepartamentoId_seq";

-- AlterTable
ALTER TABLE "Equipe" DROP CONSTRAINT "Equipe_pkey",
ALTER COLUMN "EquipeId" DROP DEFAULT,
ALTER COLUMN "EquipeId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Equipe_pkey" PRIMARY KEY ("EquipeId");
DROP SEQUENCE "Equipe_EquipeId_seq";

-- AlterTable
ALTER TABLE "Gestor" DROP CONSTRAINT "Gestor_pkey",
ALTER COLUMN "GestorId" DROP DEFAULT,
ALTER COLUMN "GestorId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Gestor_pkey" PRIMARY KEY ("GestorId");
DROP SEQUENCE "Gestor_GestorId_seq";

-- AlterTable
ALTER TABLE "HistoricoChamado" DROP CONSTRAINT "HistoricoChamado_pkey",
ALTER COLUMN "HistChamadoId" DROP DEFAULT,
ALTER COLUMN "HistChamadoId" SET DATA TYPE TEXT,
ALTER COLUMN "ChamadoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "HistoricoChamado_pkey" PRIMARY KEY ("HistChamadoId");
DROP SEQUENCE "HistoricoChamado_HistChamadoId_seq";

-- AlterTable
ALTER TABLE "Pessoa" DROP CONSTRAINT "Pessoa_pkey",
ALTER COLUMN "PessoaId" DROP DEFAULT,
ALTER COLUMN "PessoaId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("PessoaId");
DROP SEQUENCE "Pessoa_PessoaId_seq";

-- AlterTable
ALTER TABLE "Tecnico" DROP CONSTRAINT "Tecnico_pkey",
ALTER COLUMN "TecnicoId" DROP DEFAULT,
ALTER COLUMN "TecnicoId" SET DATA TYPE TEXT,
ALTER COLUMN "DepartamentoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Tecnico_pkey" PRIMARY KEY ("TecnicoId");
DROP SEQUENCE "Tecnico_TecnicoId_seq";

-- AlterTable
ALTER TABLE "TecnicoEquipe" DROP CONSTRAINT "TecnicoEquipe_pkey",
ALTER COLUMN "TecEquId" DROP DEFAULT,
ALTER COLUMN "TecEquId" SET DATA TYPE TEXT,
ALTER COLUMN "EquipeId" SET DATA TYPE TEXT,
ALTER COLUMN "TecnicoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TecnicoEquipe_pkey" PRIMARY KEY ("TecEquId");
DROP SEQUENCE "TecnicoEquipe_TecEquId_seq";

-- AlterTable
ALTER TABLE "TipoSuporte" DROP COLUMN "UnidadeId";

-- CreateTable
CREATE TABLE "TipoSuporteUnidade" (
    "TipSupUniId" TEXT NOT NULL,
    "TipSupId" INTEGER NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "TipSupUniStatus" "TipSupUniStatus" NOT NULL,

    CONSTRAINT "TipoSuporteUnidade_pkey" PRIMARY KEY ("TipSupUniId")
);

-- AddForeignKey
ALTER TABLE "Tecnico" ADD CONSTRAINT "Tecnico_DepartamentoId_fkey" FOREIGN KEY ("DepartamentoId") REFERENCES "Departamento"("DepartamentoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TecnicoEquipe" ADD CONSTRAINT "TecnicoEquipe_EquipeId_fkey" FOREIGN KEY ("EquipeId") REFERENCES "Equipe"("EquipeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TecnicoEquipe" ADD CONSTRAINT "TecnicoEquipe_TecnicoId_fkey" FOREIGN KEY ("TecnicoId") REFERENCES "Tecnico"("TecnicoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoSuporteUnidade" ADD CONSTRAINT "TipoSuporteUnidade_TipSupId_fkey" FOREIGN KEY ("TipSupId") REFERENCES "TipoSuporte"("TipSupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoSuporteUnidade" ADD CONSTRAINT "TipoSuporteUnidade_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_PessoaId_fkey" FOREIGN KEY ("PessoaId") REFERENCES "Pessoa"("PessoaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_EquipeId_fkey" FOREIGN KEY ("EquipeId") REFERENCES "Equipe"("EquipeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoChamado" ADD CONSTRAINT "HistoricoChamado_ChamadoId_fkey" FOREIGN KEY ("ChamadoId") REFERENCES "Chamado"("ChamadoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeChamado" ADD CONSTRAINT "AtividadeChamado_ChamadoId_fkey" FOREIGN KEY ("ChamadoId") REFERENCES "Chamado"("ChamadoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeChamado" ADD CONSTRAINT "AtividadeChamado_TecnicoId_fkey" FOREIGN KEY ("TecnicoId") REFERENCES "Tecnico"("TecnicoId") ON DELETE RESTRICT ON UPDATE CASCADE;
