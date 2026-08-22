/*
  Warnings:

  - A unique constraint covering the columns `[PessoaCPF]` on the table `Pessoa` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_PessoaCPF_key" ON "Pessoa"("PessoaCPF");
