// src/services/chamadoClassificacaoService.js
const prisma = require('../prisma.js');
const { getBrasilDateTime } = require('../utils/dataBrasilObter.js');
const { gravarLog } = require('../utils/logGrava.js');

async function atualizarChamadoComClassificacao(chamadoId, classificacao) {
  const chamadoAntes = await prisma.chamado.findUnique({
    where: { ChamadoId: chamadoId },
    select: { ChamadoStatus: true }
  });

  if (!chamadoAntes) {
    console.log(`⚠️ Chamado ${chamadoId} não encontrado para atualização`);
    const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
    const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), não encontrado';
    await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
    return { ok: false, motivo: 'nao_encontrado' };
  }

  const statusPermitidos = ['PROCESSAMENTO', 'FALTAINFORMACAO', 'PENDENTE'];
  if (!statusPermitidos.includes(chamadoAntes.ChamadoStatus)) {
    console.log(`⚠️ Chamado ${chamadoId} está com status ${chamadoAntes.ChamadoStatus}, não será atualizado`);
    const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
    const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), status atual não permite atualização (' + chamadoAntes.ChamadoStatus + ')';
    await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
    return { ok: false, motivo: 'status_invalido' };
  }

  if (classificacao.urgencia) {
    const urgenciasPermitidas = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
    if (!urgenciasPermitidas.includes(classificacao.urgencia)) {
      console.log(`⚠️ Chamado ${chamadoId} retornou urgência inválida (${classificacao.urgencia})`);
      const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
      const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), urgência inválida (' + classificacao.urgencia + ')';
      await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
      return { ok: false, motivo: 'urgencia_invalida' };
    }
  } else {
    console.log(`⚠️ Chamado ${chamadoId} não retornou urgência`);
    const LogAcao = 'FALHAATUALIZARURGENCIACHAMADOAUTOMATICA';
    const LogDetalhe = 'Falha ao atualizar chamado de ID (' + chamadoId + '), urgencia indefinida';
    await gravarLog(chamadoId, LogAcao, 'SISTEMA', LogDetalhe, chamadoId);
    return { ok: false, motivo: 'urgencia_ausente' };
  }

  let risco_vida_humana = false;
  let risco_vida_animal = false;
  let bloqueio_via = false;
  let tipo_chamanado = 22;

  if (!isNaN(parseInt(classificacao.risco_vida_humana))) {
    if (parseInt(classificacao.risco_vida_humana) === 1) risco_vida_humana = true;
  }
  if (!isNaN(parseInt(classificacao.risco_vida_animal))) {
    if (parseInt(classificacao.risco_vida_animal) === 1) risco_vida_animal = true;
  }
  if (!isNaN(parseInt(classificacao.bloqueio_via))) {
    if (parseInt(classificacao.bloqueio_via) === 1) bloqueio_via = true;
  }
  if (!isNaN(parseInt(classificacao.tipo_chamanado))) {
    tipo_chamanado = parseInt(classificacao.tipo_chamanado);
  }

  await prisma.chamado.update({
    where: { ChamadoId: chamadoId },
    data: {
      ChamadoUrgencia: classificacao.urgencia,
      ChamadoBloqueioVia: bloqueio_via,
      ChamadoRiscoVidaAnimal: risco_vida_animal,
      ChamadoRiscoVidaHumana: risco_vida_humana,
      TipSupId: tipo_chamanado,
      ChamadoStatus: 'PENDENTE'
    }
  });

  await prisma.historicoChamado.create({
    data: {
      ChamadoId: chamadoId,
      HistChamadoDescricao: `Classificação automática: Urgência ${classificacao.urgencia}`,
      HistChamadoDt: getBrasilDateTime(),
      HistChamadoUsuarioVer: 'GESTEC'
    }
  });

  console.log(`✅ Chamado ${chamadoId} atualizado. Urgência: ${classificacao.urgencia}`);
  return { ok: true };
}

module.exports = { atualizarChamadoComClassificacao };