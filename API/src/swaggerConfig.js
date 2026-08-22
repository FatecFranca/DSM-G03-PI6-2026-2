const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const urls = process.env.DOC_API_SERVERS_URLS?.split(',') || []
const descriptions = process.env.DOC_API_SERVERS_DESCRIPTIONS?.split(',') || []

const apiServers = urls.map((url, index) => ({
  url,
  description: descriptions[index] || ''
}))

//console.log('API Servers configurados para Swagger:', apiServers);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Chamados Públicos',
      version: '1.0.0',
      description: 'Documentação da API Chamados Público com Swagger',
    },
    components: {
      schemas: {
        Chamado: {
          type: 'object',
          properties: {
            ChamadoId: {
              type: 'string',
              description: 'ID do chamado'
            },
            ChamadoDescricaoInicial: {
              type: 'string',
              description: 'Descrição inicial do problema'
            },
            ChamadoDescricaoFormatada: {
              type: 'string',
              description: 'Descrição formatada pelo gestor/técnico'
            },
            ChamadoTitulo: {
              type: 'string',
              description: 'Título do chamado'
            },
            ChamadoStatus: {
              type: 'string',
              enum: ['PROCESSAMENTO', 'PENDENTE', 'ANALISADO', 'ATRIBUIDO', 'EMATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO', 'FALTAINFORMACAO'],
              description: 'Status do chamado'
            },
            ChamadoPrioridade: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: 'Prioridade do chamado'
            },
            ChamadoUrgencia: {
              type: 'string',
              enum: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'],
              description: 'Urgência do chamado'
            },
            ChamadoDiasComProblema: {
              type: 'integer',
              description: 'Quantidade de dias com o problema'
            },
            ChamadoRiscoVidaHumana: {
              type: 'boolean',
              description: 'Há risco de vida humana?'
            },
            ChamadoRiscoVidaAnimal: {
              type: 'boolean',
              description: 'Há risco de vida animal?'
            },
            ChamadoBloqueioVia: {
              type: 'boolean',
              description: 'Há bloqueio de via?'
            },
            ChamadoDtAbertura: {
              type: 'string',
              format: 'date-time',
              description: 'Data de abertura'
            },
            ChamadoDtEncerramento: {
              type: 'string',
              format: 'date-time',
              description: 'Data de encerramento'
            },
            ChamadoDtPlanejada: {
              type: 'string',
              format: 'date-time',
              description: 'Data planejada para resolução'
            },
            PessoaId: {
              type: 'string',
              description: 'ID da pessoa que abriu'
            },
            UnidadeId: {
              type: 'integer',
              description: 'ID da unidade'
            },
            EquipeId: {
              type: 'string',
              description: 'ID da equipe responsável'
            },
            TipSupId: {
              type: 'integer',
              description: 'ID do tipo de suporte'
            },
            Pessoa: {
              type: 'object',
              properties: {
                PessoaId: { type: 'string' },
                PessoaNome: { type: 'string' },
                PessoaEmail: { type: 'string' },
                PessoaTelefone: { type: 'string' }
              }
            },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            TipoSuporte: {
              type: 'object',
              properties: {
                TipSupId: { type: 'integer' },
                TipSupNom: { type: 'string' }
              }
            },
            Equipe: {
              type: 'object',
              properties: {
                EquipeId: { type: 'string' },
                EquipeNome: { type: 'string' }
              }
            }
          }
        },
        ChamadoDetalhado: {
          allOf: [
            { $ref: '#/components/schemas/Chamado' },
            {
              type: 'object',
              properties: {
                AtividadeChamado: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      AtividadeId: { type: 'string' },
                      AtividadeDescricao: { type: 'string' },
                      AtividadeDtRealizacao: { type: 'string', format: 'date-time' },
                      Tecnico: {
                        type: 'object',
                        properties: {
                          TecnicoId: { type: 'string' },
                          TecnicoNome: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        EstatisticasResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                periodo: {
                  type: 'object',
                  properties: {
                    dataInicio: { type: 'string', format: 'date-time' },
                    dataFim: { type: 'string', format: 'date-time' }
                  }
                },
                total: { type: 'integer' },
                porStatus: {
                  type: 'object',
                  additionalProperties: { type: 'integer' }
                },
                porUrgencia: {
                  type: 'object',
                  additionalProperties: { type: 'integer' }
                }
              }
            }
          }
        },
        AtividadeChamado: {
          type: 'object',
          properties: {
            AtividadeId: {
              type: 'string',
              description: 'ID da atividade'
            },
            AtividadeDescricao: {
              type: 'string',
              description: 'Descrição da atividade realizada'
            },
            AtividadeDtRealizacao: {
              type: 'string',
              format: 'date-time',
              description: 'Data e hora da realização'
            },
            ChamadoId: {
              type: 'string',
              description: 'ID do chamado relacionado'
            },
            TecnicoId: {
              type: 'string',
              description: 'ID do técnico que realizou'
            },
            Tecnico: {
              type: 'object',
              properties: {
                TecnicoId: { type: 'string' },
                TecnicoNome: { type: 'string' },
                TecnicoEmail: { type: 'string' }
              }
            },
            Chamado: {
              type: 'object',
              properties: {
                ChamadoId: { type: 'string' },
                ChamadoTitulo: { type: 'string' },
                ChamadoStatus: { type: 'string' }
              }
            }
          }
        },
        AtividadeChamadoDetalhada: {
          type: 'object',
          properties: {
            AtividadeId: { type: 'string' },
            AtividadeDescricao: { type: 'string' },
            AtividadeDtRealizacao: { type: 'string', format: 'date-time' },
            ChamadoId: { type: 'string' },
            TecnicoId: { type: 'string' },
            Tecnico: {
              type: 'object',
              properties: {
                TecnicoId: { type: 'string' },
                TecnicoNome: { type: 'string' },
                TecnicoEmail: { type: 'string' },
                Unidade: {
                  type: 'object',
                  properties: {
                    UnidadeNome: { type: 'string' }
                  }
                }
              }
            },
            Chamado: {
              type: 'object',
              properties: {
                ChamadoId: { type: 'string' },
                ChamadoTitulo: { type: 'string' },
                ChamadoStatus: { type: 'string' },
                Pessoa: {
                  type: 'object',
                  properties: {
                    PessoaId: { type: 'string' },
                    PessoaNome: { type: 'string' }
                  }
                },
                Equipe: {
                  type: 'object',
                  properties: {
                    EquipeId: { type: 'string' },
                    EquipeNome: { type: 'string' }
                  }
                },
                Unidade: {
                  type: 'object',
                  properties: {
                    UnidadeId: { type: 'integer' },
                    UnidadeNome: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        AtividadeComChamado: {
          type: 'object',
          properties: {
            AtividadeId: { type: 'string' },
            AtividadeDescricao: { type: 'string' },
            AtividadeDtRealizacao: { type: 'string', format: 'date-time' },
            ChamadoId: { type: 'string' },
            TecnicoId: { type: 'string' },
            Chamado: {
              type: 'object',
              properties: {
                ChamadoId: { type: 'string' },
                ChamadoTitulo: { type: 'string' },
                ChamadoStatus: { type: 'string' },
                Pessoa: {
                  type: 'object',
                  properties: {
                    PessoaNome: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        TecnicoResumo: {
          type: 'object',
          properties: {
            TecnicoId: { type: 'string' },
            TecnicoNome: { type: 'string' },
            TecnicoEmail: { type: 'string' },
            Departamento: {
              type: 'object',
              properties: {
                DepartamentoNome: { type: 'string' }
              }
            }
          }
        },
        Paginacao: {
          type: 'object',
          properties: {
            paginaAtual: { type: 'integer' },
            limitePorPagina: { type: 'integer' },
            totalRegistros: { type: 'integer' },
            totalPaginas: { type: 'integer' }
          }
        },
        PessoaSemSenha: {
          type: 'object',
          properties: {
            PessoaId: { type: 'string' },
            PessoaNome: { type: 'string' },
            PessoaEmail: { type: 'string' },
            PessoaTelefone: { type: 'string' },
            PessoaCPF: { type: 'string' },
            PessoaStatus: { type: 'string', enum: ['ATIVA', 'INATIVA', 'BLOQUEADA'] },
            PessoadtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        PessoaResumo: {
          type: 'object',
          properties: {
            PessoaId: { type: 'string' },
            PessoaNome: { type: 'string' },
            PessoaEmail: { type: 'string' },
            PessoaTelefone: { type: 'string' },
            PessoaStatus: { type: 'string' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                Chamado: { type: 'integer' }
              }
            }
          }
        },
        PessoaDetalhada: {
          type: 'object',
          properties: {
            PessoaId: { type: 'string' },
            PessoaNome: { type: 'string' },
            PessoaEmail: { type: 'string' },
            PessoaTelefone: { type: 'string' },
            PessoaCPF: { type: 'string' },
            PessoaStatus: { type: 'string' },
            PessoadtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            Chamado: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ChamadoId: { type: 'string' },
                  ChamadoTitulo: { type: 'string' },
                  ChamadoStatus: { type: 'string' },
                  ChamadoDtAbertura: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        PessoaUnidadeResumo: {
          type: 'object',
          properties: {
            PessoaId: { type: 'string' },
            PessoaNome: { type: 'string' },
            PessoaEmail: { type: 'string' },
            PessoaTelefone: { type: 'string' },
            PessoaStatus: { type: 'string' },
            _count: {
              type: 'object',
              properties: {
                Chamado: { type: 'integer' }
              }
            }
          }
        },
        TecnicoSemSenha: {
          type: 'object',
          properties: {
            TecnicoId: { type: 'string' },
            TecnicoNome: { type: 'string' },
            TecnicoEmail: { type: 'string' },
            TecnicoTelefone: { type: 'string' },
            TecnicoCPF: { type: 'string' },
            TecnicoUsuario: { type: 'string' },
            TecnicoStatus: { type: 'string', enum: ['ATIVO', 'INATIVO', 'BLOQUEADO'] },
            TecnicoDtCadastro: { type: 'string', format: 'date-time' },
            DepartamentoId: { type: 'string' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            Departamento: {
              type: 'object',
              properties: {
                DepartamentoId: { type: 'string' },
                DepartamentoNome: { type: 'string' },
                DepartamentoStatus: { type: 'string' }
              }
            }
          }
        },
        TecnicoDetalhado: {
          type: 'object',
          properties: {
            TecnicoId: { type: 'string' },
            TecnicoNome: { type: 'string' },
            TecnicoEmail: { type: 'string' },
            TecnicoTelefone: { type: 'string' },
            TecnicoCPF: { type: 'string' },
            TecnicoUsuario: { type: 'string' },
            TecnicoStatus: { type: 'string' },
            TecnicoDtCadastro: { type: 'string', format: 'date-time' },
            DepartamentoId: { type: 'string' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            Departamento: {
              type: 'object',
              properties: {
                DepartamentoId: { type: 'string' },
                DepartamentoNome: { type: 'string' },
                DepartamentoStatus: { type: 'string' }
              }
            },
            TecnicoEquipe: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  Equipe: {
                    type: 'object',
                    properties: {
                      EquipeId: { type: 'string' },
                      EquipeNome: { type: 'string' },
                      EquipeStatus: { type: 'string' }
                    }
                  }
                }
              }
            },
            AtividadeChamado: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  AtividadeId: { type: 'string' },
                  ChamadoId: { type: 'string' },
                  AtividadeDescricao: { type: 'string' },
                  AtividadeDtRealizacao: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        TecnicoUnidadeResumo: {
          type: 'object',
          properties: {
            TecnicoId: { type: 'string' },
            TecnicoNome: { type: 'string' },
            TecnicoEmail: { type: 'string' },
            TecnicoTelefone: { type: 'string' },
            TecnicoStatus: { type: 'string' },
            Departamento: {
              type: 'object',
              properties: {
                DepartamentoId: { type: 'string' },
                DepartamentoNome: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                AtividadeChamado: { type: 'integer' },
                TecnicoEquipe: { type: 'integer' }
              }
            }
          }
        },
        GestorSemSenha: {
          type: 'object',
          properties: {
            GestorId: { type: 'integer' },
            GestorNome: { type: 'string' },
            GestorEmail: { type: 'string' },
            GestorTelefone: { type: 'string' },
            GestorCPF: { type: 'string' },
            GestorUsuario: { type: 'string' },
            GestorNivel: { type: 'string', enum: ['COMUM', 'ADMINUNIDADE'] },
            GestorStatus: { type: 'string', enum: ['ATIVO', 'INATIVO', 'BLOQUEADO'] },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        GestorResumo: {
          type: 'object',
          properties: {
            GestorId: { type: 'integer' },
            GestorNome: { type: 'string' },
            GestorEmail: { type: 'string' },
            GestorTelefone: { type: 'string' },
            GestorUsuario: { type: 'string' },
            GestorNivel: { type: 'string' },
            GestorStatus: { type: 'string' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        GestorDetalhado: {
          type: 'object',
          properties: {
            GestorId: { type: 'integer' },
            GestorNome: { type: 'string' },
            GestorEmail: { type: 'string' },
            GestorTelefone: { type: 'string' },
            GestorCPF: { type: 'string' },
            GestorUsuario: { type: 'string' },
            GestorNivel: { type: 'string' },
            GestorStatus: { type: 'string' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        Departamento: {
          type: 'object',
          properties: {
            DepartamentoId: { type: 'string' },
            DepartamentoNome: { type: 'string' },
            DepartamentoStatus: { type: 'string', enum: ['ATIVO', 'INATIVO', 'BLOQUEADO'] },
            DepartamentoDtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        DepartamentoResumo: {
          type: 'object',
          properties: {
            DepartamentoId: { type: 'string' },
            DepartamentoNome: { type: 'string' },
            DepartamentoStatus: { type: 'string' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                Tecnico: { type: 'integer' }
              }
            }
          }
        },
        DepartamentoDetalhado: {
          type: 'object',
          properties: {
            DepartamentoId: { type: 'string' },
            DepartamentoNome: { type: 'string' },
            DepartamentoStatus: { type: 'string' },
            DepartamentoDtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            Tecnico: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  TecnicoId: { type: 'string' },
                  TecnicoNome: { type: 'string' },
                  TecnicoEmail: { type: 'string' },
                  TecnicoStatus: { type: 'string' }
                }
              }
            }
          }
        },
        TipoSuporte: {
          type: 'object',
          properties: {
            TipSupId: { type: 'integer' },
            TipSupNom: { type: 'string' },
            TipSupStatus: { type: 'string', enum: ['ATIVO', 'INATIVO'] },
            TipSupDtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        TipoSuporteResumo: {
          type: 'object',
          properties: {
            TipSupId: { type: 'integer' },
            TipSupNom: { type: 'string' },
            TipSupStatus: { type: 'string' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                Chamado: { type: 'integer' }
              }
            }
          }
        },
        TipoSuporteDetalhado: {
          type: 'object',
          properties: {
            TipSupId: { type: 'integer' },
            TipSupNom: { type: 'string' },
            TipSupStatus: { type: 'string' },
            TipSupDtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            Chamado: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ChamadoId: { type: 'string' },
                  ChamadoTitulo: { type: 'string' },
                  ChamadoStatus: { type: 'string' },
                  ChamadoDtAbertura: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        TipoSuporteUnidadeResumo: {
          type: 'object',
          properties: {
            TipSupId: { type: 'integer' },
            TipSupNom: { type: 'string' },
            TipSupStatus: { type: 'string' },
            _count: {
              type: 'object',
              properties: {
                Chamado: { type: 'integer' }
              }
            }
          }
        },
        Unidade: {
          type: 'object',
          properties: {
            UnidadeId: { type: 'integer' },
            UnidadeNome: { type: 'string' },
            UnidadeStatus: { type: 'string', enum: ['ATIVA', 'INATIVA', 'BLOQUEADA'] }
          }
        },
        UnidadeResumo: {
          type: 'object',
          properties: {
            UnidadeId: { type: 'integer' },
            UnidadeNome: { type: 'string' },
            UnidadeStatus: { type: 'string' },
            _count: {
              type: 'object',
              properties: {
                Departamento: { type: 'integer' },
                Pessoa: { type: 'integer' },
                TipoSuporte: { type: 'integer' },
                Gestor: { type: 'integer' },
                Tecnico: { type: 'integer' },
                Chamado: { type: 'integer' }
              }
            }
          }
        },
        UnidadeDetalhada: {
          type: 'object',
          properties: {
            UnidadeId: { type: 'integer' },
            UnidadeNome: { type: 'string' },
            UnidadeStatus: { type: 'string' },
            _count: {
              type: 'object',
              properties: {
                Departamento: { type: 'integer' },
                Pessoa: { type: 'integer' },
                TipoSuporte: { type: 'integer' }
              }
            },
            Departamento: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  DepartamentoId: { type: 'string' },
                  DepartamentoNome: { type: 'string' },
                  DepartamentoStatus: { type: 'string' }
                }
              }
            },
            TipoSuporte: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  TipSupId: { type: 'integer' },
                  TipSupNom: { type: 'string' },
                  TipSupStatus: { type: 'string' }
                }
              }
            }
          }
        },
        Equipe: {
          type: 'object',
          properties: {
            EquipeId: { type: 'string' },
            EquipeNome: { type: 'string' },
            EquipeDescricao: { type: 'string' },
            EquipeStatus: { type: 'string', enum: ['ATIVA', 'INATIVA'] },
            EquipeDtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            }
          }
        },
        EquipeResumo: {
          type: 'object',
          properties: {
            EquipeId: { type: 'string' },
            EquipeNome: { type: 'string' },
            EquipeDescricao: { type: 'string' },
            EquipeStatus: { type: 'string' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            _count: {
              type: 'object',
              properties: {
                TecnicoEquipe: {
                  type: 'object',
                  properties: {
                    where: {
                      type: 'object',
                      properties: {
                        TecEquStatus: { type: 'string', enum: ['ATIVO'] }
                      }
                    }
                  }
                },
                Chamado: {
                  type: 'object',
                  properties: {
                    where: {
                      type: 'object',
                      properties: {
                        ChamadoStatus: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        EquipeDetalhada: {
          type: 'object',
          properties: {
            EquipeId: { type: 'string' },
            EquipeNome: { type: 'string' },
            EquipeDescricao: { type: 'string' },
            EquipeStatus: { type: 'string' },
            EquipeDtCadastro: { type: 'string', format: 'date-time' },
            UnidadeId: { type: 'integer' },
            Unidade: {
              type: 'object',
              properties: {
                UnidadeId: { type: 'integer' },
                UnidadeNome: { type: 'string' },
                UnidadeStatus: { type: 'string' }
              }
            },
            TecnicoEquipe: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  TecEquId: { type: 'string' },
                  TecEquStatus: { type: 'string' },
                  Tecnico: {
                    type: 'object',
                    properties: {
                      TecnicoId: { type: 'string' },
                      TecnicoNome: { type: 'string' },
                      TecnicoEmail: { type: 'string' },
                      TecnicoStatus: { type: 'string' },
                      Departamento: {
                        type: 'object',
                        properties: {
                          DepartamentoId: { type: 'string' },
                          DepartamentoNome: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            Chamado: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ChamadoId: { type: 'string' },
                  ChamadoTitulo: { type: 'string' },
                  ChamadoStatus: { type: 'string' },
                  ChamadoDtAbertura: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        TecnicoEquipe: {
          type: 'object',
          properties: {
            TecEquId: { type: 'string' },
            TecEquStatus: { type: 'string', enum: ['ATIVO', 'INATIVO'] },
            EquipeId: { type: 'string' },
            TecnicoId: { type: 'string' },
            Equipe: {
              type: 'object',
              properties: {
                EquipeId: { type: 'string' },
                EquipeNome: { type: 'string' },
                EquipeStatus: { type: 'string' }
              }
            },
            Tecnico: {
              type: 'object',
              properties: {
                TecnicoId: { type: 'string' },
                TecnicoNome: { type: 'string' },
                TecnicoEmail: { type: 'string' },
                TecnicoStatus: { type: 'string' }
              }
            }
          }
        },
        EquipeVinculo: {
          type: 'object',
          properties: {
            TecEquId: { type: 'string' },
            TecEquStatus: { type: 'string' },
            EquipeId: { type: 'string' },
            TecnicoId: { type: 'string' },
            Equipe: {
              type: 'object',
              properties: {
                EquipeId: { type: 'string' },
                EquipeNome: { type: 'string' },
                EquipeDescricao: { type: 'string' },
                EquipeStatus: { type: 'string' }
              }
            }
          }
        },
        AdministradorResumo: {
          type: 'object',
          properties: {
            AdministradorId: { type: 'integer' },
            AdministradorUsuario: { type: 'string' }
          }
        },
        DashboardAdminResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                totalUnidadesAtivas: { type: 'integer' },
                totalUnidadesInativas: { type: 'integer' },
                totalPessoas: { type: 'integer' },
                totalTecnicos: { type: 'integer' },
                totalChamados: { type: 'integer' },
                totalAtividades: { type: 'integer' },
                totalTiposSuporte: { type: 'integer' },
                totalDepartamentos: { type: 'integer' },
                totalEquipes: { type: 'integer' },
                totalGestores: { type: 'integer' }
              }
            }
          }
        },
        AlterarAdminRequest: {
          type: 'object',
          required: ['AdministradorUsuario', 'AdministradorSenhaAtual'],
          properties: {
            AdministradorUsuario: {
              type: 'string',
              description: 'Novo nome de usuário'
            },
            AdministradorSenhaAtual: {
              type: 'string',
              description: 'Senha atual do administrador'
            },
            AdministradorSenha: {
              type: 'string',
              minLength: 6,
              description: 'Nova senha (opcional)'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: apiServers,
  },
  apis: ['./src/routes/*.js'], // Caminho para os arquivos onde você definirá as rotas
};

const specs = swaggerJsdoc(options);
module.exports = specs;