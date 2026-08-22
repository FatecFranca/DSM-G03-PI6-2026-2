-- CreateEnum
CREATE TYPE "UnidadeStatus" AS ENUM ('ATIVA', 'INATIVA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "DepartamentoStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "PessoaStatus" AS ENUM ('ATIVA', 'INATIVA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "GestorNivel" AS ENUM ('COMUM', 'ADMINUNIDADE');

-- CreateEnum
CREATE TYPE "GestorStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "TecnicoStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EquipeStatus" AS ENUM ('ATIVA', 'INATIVA');

-- CreateEnum
CREATE TYPE "TecEquStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipSupUniStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipSupStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADOIA');

-- CreateEnum
CREATE TYPE "ChamadoStatus" AS ENUM ('PENDENTE', 'ANALISADO', 'ATRIBUIDO', 'EMATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO', 'FALTAINFORMACAO', 'PROCESSAMENTO');

-- CreateEnum
CREATE TYPE "ChamadoUrgencia" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "Administrador" (
    "AdministradorId" SERIAL NOT NULL,
    "AdministradorUsuario" VARCHAR(20) NOT NULL,
    "AdministradorSenha" TEXT NOT NULL,

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("AdministradorId")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "UnidadeId" SERIAL NOT NULL,
    "UnidadeNome" VARCHAR(200) NOT NULL,
    "UnidadeStatus" "UnidadeStatus" NOT NULL,
    "UnidadeDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("UnidadeId")
);

-- CreateTable
CREATE TABLE "Gestor" (
    "GestorId" TEXT NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "GestorNome" VARCHAR(100) NOT NULL,
    "GestorEmail" VARCHAR(256),
    "GestorTelefone" VARCHAR(15),
    "GestorCPF" VARCHAR(15) NOT NULL,
    "GestorUsuario" VARCHAR(20) NOT NULL,
    "GestorSenha" TEXT NOT NULL,
    "GestorNivel" "GestorNivel" NOT NULL,
    "GestorStatus" "GestorStatus" NOT NULL,
    "GestorDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gestor_pkey" PRIMARY KEY ("GestorId")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "DepartamentoId" TEXT NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "DepartamentoNome" VARCHAR(100) NOT NULL,
    "DepartamentoDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "DepartamentoStatus" "DepartamentoStatus" NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("DepartamentoId")
);

-- CreateTable
CREATE TABLE "Pessoa" (
    "PessoaId" TEXT NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "PessoaNome" VARCHAR(100) NOT NULL,
    "PessoaEmail" VARCHAR(256),
    "PessoaTelefone" VARCHAR(15),
    "PessoaCPF" VARCHAR(15) NOT NULL,
    "PessoaSenha" TEXT NOT NULL,
    "PessoaStatus" "PessoaStatus" NOT NULL,
    "PessoadtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("PessoaId")
);

-- CreateTable
CREATE TABLE "Tecnico" (
    "TecnicoId" TEXT NOT NULL,
    "DepartamentoId" TEXT NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "TecnicoNome" VARCHAR(100) NOT NULL,
    "TecnicoEmail" VARCHAR(256),
    "TecnicoTelefone" VARCHAR(15),
    "TecnicoCPF" VARCHAR(15) NOT NULL,
    "TecnicoUsuario" VARCHAR(20) NOT NULL,
    "TecnicoSenha" TEXT NOT NULL,
    "TecnicoStatus" "TecnicoStatus" NOT NULL,
    "TecnicoDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tecnico_pkey" PRIMARY KEY ("TecnicoId")
);

-- CreateTable
CREATE TABLE "Equipe" (
    "EquipeId" TEXT NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "EquipeNome" VARCHAR(100) NOT NULL,
    "EquipeDescricao" TEXT NOT NULL,
    "EquipeDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "EquipeStatus" "EquipeStatus" NOT NULL,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("EquipeId")
);

-- CreateTable
CREATE TABLE "TecnicoEquipe" (
    "TecEquId" TEXT NOT NULL,
    "EquipeId" TEXT NOT NULL,
    "TecnicoId" TEXT NOT NULL,
    "TecEquStatus" "TecEquStatus" NOT NULL,

    CONSTRAINT "TecnicoEquipe_pkey" PRIMARY KEY ("TecEquId")
);

-- CreateTable
CREATE TABLE "TipoSuporte" (
    "TipSupId" SERIAL NOT NULL,
    "TipSupNom" VARCHAR(100) NOT NULL,
    "TipSupDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TipSupStatus" "TipSupStatus" NOT NULL DEFAULT 'BLOQUEADOIA',

    CONSTRAINT "TipoSuporte_pkey" PRIMARY KEY ("TipSupId")
);

-- CreateTable
CREATE TABLE "TipoSuporteUnidade" (
    "TipSupUniId" TEXT NOT NULL,
    "TipSupId" INTEGER NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "TipSupUniStatus" "TipSupUniStatus" NOT NULL,

    CONSTRAINT "TipoSuporteUnidade_pkey" PRIMARY KEY ("TipSupUniId")
);

-- CreateTable
CREATE TABLE "Chamado" (
    "ChamadoId" TEXT NOT NULL,
    "ChamadoN1" INTEGER NOT NULL,
    "ChamadoN2" INTEGER NOT NULL,
    "TipSupId" INTEGER,
    "PessoaId" TEXT NOT NULL,
    "EquipeId" TEXT,
    "UnidadeId" INTEGER NOT NULL,
    "ChamadoTitulo" VARCHAR(100),
    "ChamadoDescricaoInicial" TEXT NOT NULL,
    "ChamadoDescricaoFormatada" TEXT,
    "ChamadoDiasComProblema" INTEGER NOT NULL,
    "ChamadoRiscoVidaHumana" BOOLEAN NOT NULL,
    "ChamadoRiscoVidaAnimal" BOOLEAN NOT NULL,
    "ChamadoBloqueioVia" BOOLEAN NOT NULL,
    "ChamadoDtAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ChamadoDtPlanejada" TIMESTAMP(3),
    "ChamadoDtEncerramento" TIMESTAMP(3),
    "ChamadoPrioridade" INTEGER,
    "ChamadoUrgencia" "ChamadoUrgencia",
    "ChamadoStatus" "ChamadoStatus" DEFAULT 'PROCESSAMENTO',

    CONSTRAINT "Chamado_pkey" PRIMARY KEY ("ChamadoId")
);

-- CreateTable
CREATE TABLE "HistoricoChamado" (
    "HistChamadoId" TEXT NOT NULL,
    "ChamadoId" TEXT NOT NULL,
    "HistChamadoDescricao" TEXT NOT NULL,
    "HistChamadoDt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoChamado_pkey" PRIMARY KEY ("HistChamadoId")
);

-- CreateTable
CREATE TABLE "AtividadeChamado" (
    "AtividadeId" TEXT NOT NULL,
    "ChamadoId" TEXT NOT NULL,
    "TecnicoId" TEXT NOT NULL,
    "AtividadeDescricao" TEXT NOT NULL,
    "AtividadeDtRealizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtividadeChamado_pkey" PRIMARY KEY ("AtividadeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Administrador_AdministradorUsuario_key" ON "Administrador"("AdministradorUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "Gestor_GestorUsuario_key" ON "Gestor"("GestorUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_PessoaCPF_key" ON "Pessoa"("PessoaCPF");

-- CreateIndex
CREATE UNIQUE INDEX "Tecnico_TecnicoUsuario_key" ON "Tecnico"("TecnicoUsuario");

-- AddForeignKey
ALTER TABLE "Gestor" ADD CONSTRAINT "Gestor_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pessoa" ADD CONSTRAINT "Pessoa_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tecnico" ADD CONSTRAINT "Tecnico_DepartamentoId_fkey" FOREIGN KEY ("DepartamentoId") REFERENCES "Departamento"("DepartamentoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tecnico" ADD CONSTRAINT "Tecnico_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipe" ADD CONSTRAINT "Equipe_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TecnicoEquipe" ADD CONSTRAINT "TecnicoEquipe_EquipeId_fkey" FOREIGN KEY ("EquipeId") REFERENCES "Equipe"("EquipeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TecnicoEquipe" ADD CONSTRAINT "TecnicoEquipe_TecnicoId_fkey" FOREIGN KEY ("TecnicoId") REFERENCES "Tecnico"("TecnicoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoSuporteUnidade" ADD CONSTRAINT "TipoSuporteUnidade_TipSupId_fkey" FOREIGN KEY ("TipSupId") REFERENCES "TipoSuporte"("TipSupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoSuporteUnidade" ADD CONSTRAINT "TipoSuporteUnidade_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_TipSupId_fkey" FOREIGN KEY ("TipSupId") REFERENCES "TipoSuporte"("TipSupId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_PessoaId_fkey" FOREIGN KEY ("PessoaId") REFERENCES "Pessoa"("PessoaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_EquipeId_fkey" FOREIGN KEY ("EquipeId") REFERENCES "Equipe"("EquipeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoChamado" ADD CONSTRAINT "HistoricoChamado_ChamadoId_fkey" FOREIGN KEY ("ChamadoId") REFERENCES "Chamado"("ChamadoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeChamado" ADD CONSTRAINT "AtividadeChamado_ChamadoId_fkey" FOREIGN KEY ("ChamadoId") REFERENCES "Chamado"("ChamadoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeChamado" ADD CONSTRAINT "AtividadeChamado_TecnicoId_fkey" FOREIGN KEY ("TecnicoId") REFERENCES "Tecnico"("TecnicoId") ON DELETE RESTRICT ON UPDATE CASCADE;

