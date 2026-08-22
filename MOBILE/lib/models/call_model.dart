class CallModel {
  final String? id;
  final int? n1;
  final int? n2;
  final String pessoaId;
  final int unidadeId;
  final String descricaoInicial;
  final String? titulo;
  final String status;
  final String urgencia;
  final String prioridade;
  final DateTime? dataInicio;
  final DateTime? dataFim;
  final int? diasproblema;

  CallModel({
    this.id,
    this.n1,
    this.n2,
    this.titulo,
    required this.pessoaId,
    required this.unidadeId,
    required this.descricaoInicial,
    this.status = 'PENDENTE',
    this.urgencia = 'MEDIA',
    this.prioridade = 'MIN',
    this.dataInicio,
    this.dataFim,
    this.diasproblema
  });

  Map<String, dynamic> toJson() {
    return {
      'PessoaId': pessoaId,
      'UnidadeId': unidadeId,
      'ChamadoDescricaoInicial': descricaoInicial,
      'Urgencia': urgencia,
      'Prioridade': prioridade,
    };
  }

  factory CallModel.fromJson(Map<String, dynamic> json) {
    return CallModel(
      id: json['ChamadoId'],
      n1: json['ChamadoN1'] ?? 0,
      n2: json['ChamadoN2'] ?? 0,
      titulo: json['ChamadoTitulo'] ?? '',
      pessoaId: json['PessoaId'] ?? '',
      unidadeId: json['UnidadeId'] ?? 0,
      diasproblema: json['ChamadoDiasComProblema'] ?? 0,
      descricaoInicial: json['ChamadoDescricaoInicial'] ?? '',
      status: json['ChamadoStatus'] ?? 'PENDENTE',
      urgencia: json['ChamadoUrgencia'] ?? 'MEDIA', // ← campo correto no JSON
      prioridade: _parsePrioridade(
        json['ChamadoPrioridade'],
      ), // ← converte int para String
      dataInicio: json['ChamadoDtAbertura'] != null
          ? DateTime.parse(json['ChamadoDtAbertura'])
          : null,
      dataFim: json['ChamadoDtEncerramento'] != null
          ? DateTime.parse(json['ChamadoDtEncerramento'])
          : null,
    );
  }

  // Função auxiliar para converter prioridade de int para String
  static String _parsePrioridade(dynamic prioridade) {
    if (prioridade == null) return 'MIN';

    // Se já for String, retorna
    if (prioridade is String) return prioridade;

    // Se for int, converte para String
    if (prioridade is int) {
      // Mapeamento dos valores possíveis
      switch (prioridade) {
        case 10:
          return 'ALTA';
        case 5:
          return 'MEDIA';
        case 0:
          return 'MIN';
        default:
          return prioridade.toString();
      }
    }

    return 'MIN';
  }
}
