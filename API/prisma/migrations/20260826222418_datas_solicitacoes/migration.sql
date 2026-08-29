-- AlterTable
ALTER TABLE "Solicitacao" ADD COLUMN     "SolicitacaoDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "SolicitacaoDtFinalizacao" TIMESTAMP(3);
