/*
  Warnings:

  - Added the required column `ChamadoN1` to the `Chamado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ChamadoN2` to the `Chamado` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chamado" ADD COLUMN     "ChamadoN1" INTEGER NOT NULL,
ADD COLUMN     "ChamadoN2" INTEGER NOT NULL;
