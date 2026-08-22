/*
  Warnings:

  - Added the required column `ChamadoBloqueioVia` to the `Chamado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ChamadoDiasComProblema` to the `Chamado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ChamadoRiscoVidaAnimal` to the `Chamado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ChamadoRiscoVidaHumana` to the `Chamado` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chamado" ADD COLUMN     "ChamadoBloqueioVia" BOOLEAN NOT NULL,
ADD COLUMN     "ChamadoDiasComProblema" INTEGER NOT NULL,
ADD COLUMN     "ChamadoRiscoVidaAnimal" BOOLEAN NOT NULL,
ADD COLUMN     "ChamadoRiscoVidaHumana" BOOLEAN NOT NULL;
