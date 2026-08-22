class UserProfile {
  final String id;
  final String name;
  String email;
  String phone;
  final String cpfOrId;
  final String role;
  final String unitName;
  final int? unidadeId;
  final String? token;
  final String? equipeId;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.cpfOrId,
    required this.role,
    required this.unitName,
    this.unidadeId,
    this.token,
    this.equipeId,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    final usuario = data['usuario'] as Map<String, dynamic>? ?? {};

    return UserProfile(
      id: usuario['PessoaId'] ?? usuario['TecnicoId'] ?? '',
      name: usuario['PessoaNome'] ?? usuario['TecnicoNome'] ?? 'Usuário',
      email: usuario['PessoaEmail'] ?? usuario['TecnicoEmail'] ?? '',
      phone: usuario['PessoaTelefone'] ?? usuario['TecnicoTelefone'] ?? '',
      cpfOrId:
          usuario['PessoaCPF'] ??
          usuario['TecnicoMatricula'] ??
          'Não informado',
      role: data['tipo'] ?? 'desconhecido',
      unitName: usuario['Unidade']?['UnidadeNome'] ?? 'Sem unidade',
      unidadeId: usuario['Unidade']?['UnidadeId'],
      equipeId: json['EquipeId'] ?? json['equipeId'],
      token: data['token'],
    );
  }
}
