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

-- CreateEnum
CREATE TYPE "TipoRelacao" AS ENUM ('PESSOA', 'TECNICO', 'GESTOR', 'ADMINISTRADOR', 'SISTEMA', 'OUTRO');

-- CreateEnum
CREATE TYPE "NotificacaoStatus" AS ENUM ('ENVIADO', 'EXIBIDO', 'LIDO', 'EXCLUIDO');

-- CreateEnum
CREATE TYPE "NotificacaoNivel" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "UsuarioVer" AS ENUM ('TODOS', 'GESTOR', 'ADMUNIDADE', 'ADMSISTEMA', 'TECNICO', 'PESSOA', 'GESTEC');

-- CreateEnum
CREATE TYPE "SolicitacaoStatus" AS ENUM ('PENDENTE', 'EMATENDIMENTO', 'CONCLUIDO', 'RECUSADO', 'FALTAINFORMACAO');

-- CreateEnum
CREATE TYPE "AdministradorStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateTable
CREATE TABLE "Administrador" (
    "AdministradorId" SERIAL NOT NULL,
    "AdministradorUsuario" VARCHAR(20) NOT NULL,
    "AdministradorSenha" TEXT NOT NULL,
    "AdministradorStatus" "AdministradorStatus" DEFAULT 'ATIVO',
    "AdministradorNome" VARCHAR(100),

    CONSTRAINT "Administrador_pkey" PRIMARY KEY ("AdministradorId")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "UnidadeId" SERIAL NOT NULL,
    "UnidadeNome" VARCHAR(200) NOT NULL,
    "UnidadeStatus" "UnidadeStatus" NOT NULL,
    "UnidadeDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UnidadeEmail" VARCHAR(256),
    "UnidadeTelefone" VARCHAR(15),

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
    "TecEquDtVin" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "TecEquDtIna" TIMESTAMP(3),

    CONSTRAINT "TecnicoEquipe_pkey" PRIMARY KEY ("TecEquId")
);

-- CreateTable
CREATE TABLE "TipoSuporte" (
    "TipSupId" SERIAL NOT NULL,
    "TipSupNom" VARCHAR(100) NOT NULL,
    "TipSupDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TipSupStatus" "TipSupStatus" NOT NULL DEFAULT 'BLOQUEADOIA',
    "TipSupDescricao" TEXT,

    CONSTRAINT "TipoSuporte_pkey" PRIMARY KEY ("TipSupId")
);

-- CreateTable
CREATE TABLE "TipoSuporteUnidade" (
    "TipSupUniId" TEXT NOT NULL,
    "TipSupId" INTEGER NOT NULL,
    "UnidadeId" INTEGER NOT NULL,
    "TipSupUniStatus" "TipSupUniStatus" NOT NULL,
    "TipSupUniDtVin" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "TipSupUniDtIna" TIMESTAMP(3),

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
    "HistChamadoUsuarioVer" "UsuarioVer" NOT NULL DEFAULT 'TODOS',

    CONSTRAINT "HistoricoChamado_pkey" PRIMARY KEY ("HistChamadoId")
);

-- CreateTable
CREATE TABLE "AtividadeChamado" (
    "AtividadeId" TEXT NOT NULL,
    "ChamadoId" TEXT NOT NULL,
    "TecnicoId" TEXT NOT NULL,
    "AtividadeDescricao" TEXT NOT NULL,
    "AtividadeUsuarioVer" "UsuarioVer" NOT NULL DEFAULT 'TODOS',
    "AtividadeDtRealizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtividadeChamado_pkey" PRIMARY KEY ("AtividadeId")
);

-- CreateTable
CREATE TABLE "Log" (
    "LogId" TEXT NOT NULL,
    "LogChave" TEXT,
    "LogUsuId" TEXT,
    "LogTipoRelacao" "TipoRelacao" NOT NULL DEFAULT 'OUTRO',
    "LogAcao" VARCHAR(50) NOT NULL,
    "LogDetalhe" TEXT NOT NULL,
    "LogData" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("LogId")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "NotificacaoId" TEXT NOT NULL,
    "NotificacaoUsuId" TEXT,
    "NotificacaoAdicionalId" TEXT,
    "NotificacaoTipoRelacao" "TipoRelacao" NOT NULL DEFAULT 'OUTRO',
    "NotificacaoData" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "NotificacaoTipo" VARCHAR(50) NOT NULL,
    "NotificacaoTitulo" VARCHAR(100) NOT NULL,
    "NotificacaoMensagem" TEXT NOT NULL,
    "NotificacaoStatus" "NotificacaoStatus" NOT NULL DEFAULT 'ENVIADO',
    "NotificacaoNivel" "NotificacaoNivel" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("NotificacaoId")
);

-- CreateTable
CREATE TABLE "Solicitacao" (
    "SolicitacaoId" TEXT NOT NULL,
    "UnidadeId" INTEGER,
    "SolicitacaoTipo" VARCHAR(50) NOT NULL,
    "SolicitacaoDescricao" TEXT NOT NULL,
    "SolicitacaoIdRelacional" TEXT,
    "SolicitacaoSolicitanteNome" VARCHAR(100),
    "SolicitacaoSolicitanteEmail" VARCHAR(256),
    "SolicitacaoSolicitanteTelefone" VARCHAR(256),
    "SolicitacaoUsuarioFinalizou" VARCHAR(20),
    "SolicitacaoStatus" "SolicitacaoStatus" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "Solicitacao_pkey" PRIMARY KEY ("SolicitacaoId")
);

-- CreateTable
CREATE TABLE "AtividadeSolicitacao" (
    "AtividadeSolicitacaoId" TEXT NOT NULL,
    "SolicitacaoId" TEXT NOT NULL,
    "AtividadeSolicitacaoDescricao" TEXT NOT NULL,
    "AtividadeSolicitacaoDtRealizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "AtividadeSolicitacaoUsuario" VARCHAR(20) NOT NULL,

    CONSTRAINT "AtividadeSolicitacao_pkey" PRIMARY KEY ("AtividadeSolicitacaoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Administrador_AdministradorUsuario_key" ON "Administrador"("AdministradorUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "Gestor_GestorUsuario_key" ON "Gestor"("GestorUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_PessoaCPF_key" ON "Pessoa"("PessoaCPF");

-- CreateIndex
CREATE UNIQUE INDEX "Tecnico_TecnicoUsuario_key" ON "Tecnico"("TecnicoUsuario");

-- CreateIndex
CREATE INDEX "Log_LogData_idx" ON "Log"("LogData");

-- CreateIndex
CREATE INDEX "Log_LogAcao_idx" ON "Log"("LogAcao");

-- CreateIndex
CREATE INDEX "Log_LogTipoRelacao_LogData_idx" ON "Log"("LogTipoRelacao", "LogData");

-- CreateIndex
CREATE INDEX "Log_LogUsuId_LogData_idx" ON "Log"("LogUsuId", "LogData");

-- CreateIndex
CREATE INDEX "Log_LogAcao_LogData_idx" ON "Log"("LogAcao", "LogData");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoUsuId_NotificacaoStatus_idx" ON "Notificacao"("NotificacaoUsuId", "NotificacaoStatus");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoAdicionalId_NotificacaoTipo_idx" ON "Notificacao"("NotificacaoAdicionalId", "NotificacaoTipo");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoStatus_NotificacaoData_idx" ON "Notificacao"("NotificacaoStatus", "NotificacaoData");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoData_idx" ON "Notificacao"("NotificacaoData");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoTipo_idx" ON "Notificacao"("NotificacaoTipo");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoTipoRelacao_NotificacaoStatus_idx" ON "Notificacao"("NotificacaoTipoRelacao", "NotificacaoStatus");

-- CreateIndex
CREATE INDEX "Notificacao_NotificacaoUsuId_NotificacaoData_idx" ON "Notificacao"("NotificacaoUsuId", "NotificacaoData");

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

-- AddForeignKey
ALTER TABLE "Solicitacao" ADD CONSTRAINT "Solicitacao_UnidadeId_fkey" FOREIGN KEY ("UnidadeId") REFERENCES "Unidade"("UnidadeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeSolicitacao" ADD CONSTRAINT "AtividadeSolicitacao_SolicitacaoId_fkey" FOREIGN KEY ("SolicitacaoId") REFERENCES "Solicitacao"("SolicitacaoId") ON DELETE RESTRICT ON UPDATE CASCADE;
