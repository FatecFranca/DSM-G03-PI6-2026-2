// importar-chamados.js
const fs = require('fs');
const path = require('path');

const prisma = require('../src/prisma.js');

// ─────────────────────────────────────────────────────────────
// 1. DE-PARA: Tipo de Suporte (código → nome)
// ─────────────────────────────────────────────────────────────
const DE_PARA_TIPO_CHAMADO = {
    1: 'Outros Problemas com Postes',
    2: 'Luz Queimada Poste',
    3: 'Problema com Animal Doméstico',
    4: 'Problema com Animal Selvagem',
    5: 'Animal Perdido',
    6: 'Remoção de Árvore ou Tocos',
    7: 'Poste caido',
    8: 'Divisor de Pista',
    9: 'Árvore ou Galhos Caídos',
    10: 'Solicitação de Poda',
    11: 'Solicitação de Plantio',
    12: 'Lixo e Detritos',
    13: 'Manutenção da Área Verde',
    14: 'Sugestões para o Parque/Praça',
    15: 'Equipamento Quebrado no Parque/Praça',
    16: 'Solicitações Gerais para o Parque/Praça',
    17: 'Animal Morto no Parque/Praça',
    18: 'Grafite em lugares públicos',
    19: 'Luz Queimada',
    20: 'Portões Trancados',
    21: 'Manutenção do Cemitério',
    22: 'Outros',
};

// Inverso: nome → código (o CSV traz o NOME do tipo, não o código)
const DE_PARA_TIPO_CHAMADO_INVERSO = Object.fromEntries(
    Object.entries(DE_PARA_TIPO_CHAMADO).map(([cod, nome]) => [nome.trim(), Number(cod)])
);

// ─────────────────────────────────────────────────────────────
// 2. DE-PARA: Nome do tipo → EquipeId (UUID)
// ─────────────────────────────────────────────────────────────
const DE_PARA_EQUIPE = {
    'Outros Problemas com Postes': '850616e6-e241-424f-ae22-1481a9f50491',
    'Luz Queimada Poste': '302ab512-1735-4472-93a5-1c44efaa5657',
    'Problema com Animal Doméstico': '81e36263-1d1c-44e3-aa78-874573019bde',
    'Problema com Animal Selvagem': '81e36263-1d1c-44e3-aa78-874573019bde',
    'Animal Perdido': '81e36263-1d1c-44e3-aa78-874573019bde',
    'Remoção de Árvore ou Tocos': '7884c933-c94e-47d2-a6ab-8dd6ca17f6f6',
    'Poste caido': '850616e6-e241-424f-ae22-1481a9f50491',
    'Divisor de Pista': '6197e464-dd93-49ec-bb1a-fb06603d497e',
    'Árvore ou Galhos Caídos': '388567d8-6917-40f1-a8a9-700db00a9b31',
    'Solicitação de Poda': '7884c933-c94e-47d2-a6ab-8dd6ca17f6f6',
    'Solicitação de Plantio': '7884c933-c94e-47d2-a6ab-8dd6ca17f6f6',
    'Lixo e Detritos': '388567d8-6917-40f1-a8a9-700db00a9b31',
    'Manutenção da Área Verde': '7884c933-c94e-47d2-a6ab-8dd6ca17f6f6',
    'Sugestões para o Parque/Praça': 'ac0b1a59-2266-413c-ac36-c292a404135f',
    'Equipamento Quebrado no Parque/Praça': '9eaabb41-902a-4dba-9e7b-846a4b010bfe',
    'Solicitações Gerais para o Parque/Praça': 'ac0b1a59-2266-413c-ac36-c292a404135f',
    'Animal Morto no Parque/Praça': '81e36263-1d1c-44e3-aa78-874573019bde',
    'Grafite em lugares públicos': '738402d0-a8ef-44b0-9c03-2d32ce0bcf2e',
    'Luz Queimada': 'd4e6dac2-b1cd-4e29-9f2a-db640fff1c3c',
    'Portões Trancados': 'ac0b1a59-2266-413c-ac36-c292a404135f',
    'Manutenção do Cemitério': '738402d0-a8ef-44b0-9c03-2d32ce0bcf2e',
    'Outros': 'ac0b1a59-2266-413c-ac36-c292a404135f',
};

const UNIDADE_FIXA = 2;

// ─────────────────────────────────────────────────────────────
// 3. Utilitários
// ─────────────────────────────────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[randInt(0, arr.length - 1)];

const parseBool = (v) => {
    const s = String(v).trim().toLowerCase();
    return ['sim', 's', 'true', '1', 'yes', 'y'].includes(s);
};

/**
 * Converte string de data em Date de forma robusta.
 * Aceita:
 *   - "2026-02-22 10:34:58.338000+00:00"  (Postgres/CSV com espaço)
 *   - "2026-02-22T10:34:58.338000+00:00"  (ISO 8601)
 *   - "2026-02-22"                        (só data)
 */
function parseDataSegura(valor) {
    if (!valor) return new Date();

    // 1) Normaliza: substitui o PRIMEIRO espaço por 'T' (ISO 8601)
    let s = String(valor).trim().replace(' ', 'T');

    // 2) Trunca microssegundos (6 dígitos) para milissegundos (3 dígitos)
    //    Ex.: "2026-02-22T10:34:58.338000+00:00" → "2026-02-22T10:34:58.338+00:00"
    s = s.replace(/(\.\d{3})\d+/, '$1');

    // 3) Se não houver timezone, o JS assume UTC quando tem 'T'
    const d = new Date(s);

    if (isNaN(d.getTime())) {
        throw new Error(`Data inválida: "${valor}"`);
    }
    return d;
}

// ─────────────────────────────────────────────────────────────
// 4. Leitura do CSV
// ─────────────────────────────────────────────────────────────
async function lerCSV(caminho) {
    const conteudo = fs.readFileSync(caminho, 'utf8');

    // Parser CSV que respeita aspas duplas e usa vírgula como separador
    function parseLinha(linha) {
        const campos = [];
        let atual = '';
        let dentroAspas = false;

        for (let i = 0; i < linha.length; i++) {
            const c = linha[i];

            if (c === '"') {
                if (dentroAspas && linha[i + 1] === '"') {
                    atual += '"';
                    i++;
                } else {
                    dentroAspas = !dentroAspas;
                }
            } else if (c === ',' && !dentroAspas) {
                campos.push(atual);
                atual = '';
            } else {
                atual += c;
            }
        }
        campos.push(atual);
        return campos.map((c) => c.trim());
    }

    const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim());
    const cabecalho = parseLinha(linhas[0]).map((c) => c.trim());
    const registros = [];

    for (let i = 1; i < linhas.length; i++) {
        const cols = parseLinha(linhas[i]);
        const obj = {};
        cabecalho.forEach((c, j) => (obj[c] = cols[j]));
        registros.push(obj);
    }
    return registros;
}

// ─────────────────────────────────────────────────────────────
// 5. Cálculo de ChamadoN1 / ChamadoN2
// ─────────────────────────────────────────────────────────────
const LIMITE_N2 = 999999999;

async function calcularProximoNumero(tx, unidadeId) {
    const ultimo = await tx.chamado.findFirst({
        where: { UnidadeId: unidadeId },
        orderBy: [{ ChamadoN1: 'desc' }, { ChamadoN2: 'desc' }],
        select: { ChamadoN1: true, ChamadoN2: true },
    });

    if (!ultimo) return { proximoN1: 1, proximoN2: 1 };

    if (ultimo.ChamadoN2 >= LIMITE_N2) {
        return { proximoN1: ultimo.ChamadoN1 + 1, proximoN2: 1 };
    }
    return { proximoN1: ultimo.ChamadoN1, proximoN2: ultimo.ChamadoN2 + 1 };
}

// ─────────────────────────────────────────────────────────────
// 6. Importação
// ─────────────────────────────────────────────────────────────
async function importar() {
    console.log('🚀 Iniciando importação de chamados...\n');

    // 6.1 — Pessoas da Unidade 2 (para distribuir os chamados)
    const pessoasUnidade2 = await prisma.pessoa.findMany({
        where: { UnidadeId: UNIDADE_FIXA, PessoaStatus: 'ATIVA' },
        select: { PessoaId: true },
    });

    if (pessoasUnidade2.length === 0) {
        throw new Error('Nenhuma pessoa ATIVA encontrada na Unidade 2.');
    }
    console.log(`👥 ${pessoasUnidade2.length} pessoas disponíveis na Unidade 2.`);

    // 6.2 — Mapa EquipeId → [TecnicoId...]
    const equipes = await prisma.equipe.findMany({
        select: {
            EquipeId: true,
            TecnicoEquipe: { select: { TecnicoId: true } },
        },
    });

    const tecnicosPorEquipe = {};
    for (const eq of equipes) {
        tecnicosPorEquipe[eq.EquipeId] = eq.TecnicoEquipe.map((t) => t.TecnicoId);
    }

    // 6.3 — Ler CSV
    const csvPath = path.resolve('chamados.csv');
    const registros = await lerCSV(csvPath);
    console.log(`📄 ${registros.length} registros lidos do CSV.\n`);

    // 6.4 — Importar (uma transação por chamado para simplicidade)
    let ok = 0;
    let falhas = 0;

    for (let i = 0; i < registros.length; i++) {
        const r = registros[i];

        try {
            const nomeTipo = String(r.tipo_chamado || '').trim();
            const codTipo = DE_PARA_TIPO_CHAMADO_INVERSO[nomeTipo];
            if (!codTipo) {
                throw new Error(`Tipo de chamado inválido: "${nomeTipo}" | Colunas: ${Object.keys(r).join(',')}`);
            }

            const equipeId = DE_PARA_EQUIPE[nomeTipo] ?? null;

            // Sorteia técnico da equipe (se houver)
            let tecnicoId = null;
            if (equipeId && tecnicosPorEquipe[equipeId]?.length) {
                tecnicoId = pickRandom(tecnicosPorEquipe[equipeId]);
            }

            // Sorteia pessoa da Unidade 2
            const pessoaId = pickRandom(pessoasUnidade2).PessoaId;

            // Datas
            const dtAbertura = r.data_criacao ? parseDataSegura(r.data_criacao) : new Date();
            const dias = randInt(1, 30);
            const dtPlanejada = new Date(dtAbertura);
            dtPlanejada.setDate(dtPlanejada.getDate() + 15);

            const dtEncerramento = new Date(dtAbertura);
            dtEncerramento.setDate(dtEncerramento.getDate() + 15 + dias);

            const prioridade = randInt(1, 10);

            await prisma.$transaction(async (tx) => {
                // N1 / N2
                const { proximoN1, proximoN2 } = await calcularProximoNumero(tx, UNIDADE_FIXA);

                const chamado = await tx.chamado.create({
                    data: {
                        ChamadoN1: proximoN1,
                        ChamadoN2: proximoN2,
                        TipSupId: codTipo,
                        PessoaId: pessoaId,
                        EquipeId: equipeId,
                        UnidadeId: UNIDADE_FIXA,
                        ChamadoTitulo: nomeTipo,
                        ChamadoDescricaoInicial: r.descricao_problema || 'Sem descrição',
                        ChamadoDiasComProblema: parseInt(r.dias_problema, 10) || 1,
                        ChamadoRiscoVidaHumana: parseBool(r.risco_vida_humana),
                        ChamadoRiscoVidaAnimal: parseBool(r.risco_vida_animal),
                        ChamadoBloqueioVia: parseBool(r.bloqueio_via),
                        ChamadoDtAbertura: dtAbertura,
                        ChamadoDtPlanejada: dtPlanejada,
                        ChamadoDtEncerramento: dtEncerramento,
                        ChamadoPrioridade: prioridade,
                        ChamadoUrgencia: (() => {
                            const u = String(r.urgencia || '').trim().toUpperCase();
                            const mapa = {
                                URGENTE: 'URGENTE',
                                ALTA: 'ALTA',
                                MEDIA: 'MEDIA',
                                'MÉDIA': 'MEDIA',
                                BAIXA: 'BAIXA',
                            };
                            return mapa[u] ?? 'MEDIA';
                        })(),
                        ChamadoStatus: 'CONCLUIDO',
                    },
                });

                // Histórico — abertura
                await tx.historicoChamado.create({
                    data: {
                        ChamadoId: chamado.ChamadoId,
                        HistChamadoDescricao: 'Chamado criado via importação (TESTES DEV)',
                        HistChamadoDt: dtAbertura,
                        HistChamadoUsuarioVer: 'TODOS',
                    },
                });

                // Histórico — finalização
                await tx.historicoChamado.create({
                    data: {
                        ChamadoId: chamado.ChamadoId,
                        HistChamadoDescricao: 'Chamado finalizado (TESTES DEV)',
                        HistChamadoDt: dtEncerramento,
                        HistChamadoUsuarioVer: 'TODOS',
                    },
                });

                // Atividade — se houver técnico
                if (tecnicoId) {
                    await tx.atividadeChamado.create({
                        data: {
                            ChamadoId: chamado.ChamadoId,
                            TecnicoId: tecnicoId,
                            AtividadeDescricao: 'Chamado atendido e finalizado (TESTES DEV)',
                            AtividadeUsuarioVer: 'GESTEC',
                            AtividadeDtRealizacao: dtEncerramento,
                        },
                    });
                }
            });

            ok++;
            if ((i + 1) % 50 === 0 || i === registros.length - 1) {
                console.log(`   ✅ ${i + 1}/${registros.length} chamados importados...`);
            }
        } catch (err) {
            falhas++;
            console.error(`   ❌ Erro na linha ${i + 2}: ${err.message}`);
        }
    }

    console.log(`\n🏁 Importação concluída. Sucesso: ${ok} | Falhas: ${falhas}`);
}

// ─────────────────────────────────────────────────────────────
// 7. Execução
// ─────────────────────────────────────────────────────────────
importar()
    .catch((e) => {
        console.error('💥 Erro fatal:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });