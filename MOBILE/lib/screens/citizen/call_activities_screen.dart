import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/theme_model.dart';
import '../../config.dart';

class CallActivitiesScreen extends StatefulWidget {
  final String chamadoId;
  final int chamadoN1;
  final int chamadoN2;

  const CallActivitiesScreen({
    super.key,
    required this.chamadoId,
    required this.chamadoN1,
    required this.chamadoN2,
  });

  @override
  State<CallActivitiesScreen> createState() => _CallActivitiesScreenState();
}

class _CallActivitiesScreenState extends State<CallActivitiesScreen> {
  bool _isLoading = true;
  bool _isLoadingHistorico = false;
  List<dynamic> _atividades = [];
  List<dynamic> _historico = [];
  Map<String, dynamic>? _chamadoInfo;

  @override
  void initState() {
    super.initState();
    _carregarDados();
  }

  Future<void> _carregarDados() async {
    await Future.wait([
      _fetchAtividades(),
      _fetchHistorico(),
    ]);
  }

  Future<void> _fetchAtividades() async {
    try {
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      final url = Uri.parse(
        '${AppConfig.baseUrl}/api/atividadechamado/chamado/${widget.chamadoId}',
      );

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer ${user?.token}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          // ✅ Filtrar apenas atividades com visibilidade TODOS (públicas)
          final todasAtividades = decoded is List ? decoded : (decoded['data'] ?? []);
          _atividades = todasAtividades.where((atividade) {
            final visibilidade = atividade['AtividadeUsuarioVer'] ?? 'GESTEC';
            return visibilidade == 'TODOS';
          }).toList();
        });
      }
    } catch (e) {
      print("ERRO AO CARREGAR ATIVIDADES: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // =============================================
  // CARREGAR HISTÓRICO
  // =============================================
  Future<void> _fetchHistorico() async {
    try {
      setState(() => _isLoadingHistorico = true);
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      final url = Uri.parse(
        '${AppConfig.baseUrl}/api/historicochamado/chamado/${widget.chamadoId}?ordem=asc',
      );

      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer ${user?.token}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          // ✅ Filtrar apenas históricos com visibilidade PESSOA ou TODOS
          final todosHistoricos = decoded['data'] ?? [];
          _historico = todosHistoricos.where((item) {
            final visibilidade = item['HistChamadoUsuarioVer'] ?? 'GESTEC';
            return visibilidade == 'PESSOA' || visibilidade == 'TODOS';
          }).toList();
        });
      }
    } catch (e) {
      print("ERRO AO CARREGAR HISTÓRICO: $e");
    } finally {
      setState(() => _isLoadingHistorico = false);
    }
  }

  // =============================================
  // OBTER ÍCONE PARA AÇÃO DO HISTÓRICO
  // =============================================
  IconData _getHistoricoIcon(String acao) {
    switch (acao) {
      case 'CRIACAO':
        return Icons.add_circle_outline;
      case 'ATUALIZACAO':
        return Icons.edit_outlined;
      case 'MUDANCA_STATUS':
        return Icons.sync;
      case 'ATRIBUICAO':
        return Icons.people_outline;
      case 'RECUSA':
        return Icons.block;
      case 'CONCLUSAO':
        return Icons.check_circle_outline;
      case 'CANCELAMENTO':
        return Icons.cancel_outlined;
      case 'FALTA_INFORMACAO':
        return Icons.warning_outlined;
      default:
        return Icons.history;
    }
  }

  Color _getHistoricoColor(String acao, ColorScheme cs) {
    switch (acao) {
      case 'CRIACAO':
        return Colors.green;
      case 'ATUALIZACAO':
        return Colors.blue;
      case 'MUDANCA_STATUS':
        return Colors.purple;
      case 'ATRIBUICAO':
        return Colors.indigo;
      case 'RECUSA':
        return Colors.red;
      case 'CONCLUSAO':
        return Colors.green;
      case 'CANCELAMENTO':
        return Colors.red;
      case 'FALTA_INFORMACAO':
        return Colors.pink;
      default:
        return cs.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Histórico do Chamado",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              "Chamado #${widget.chamadoN1}-${widget.chamadoN2}",
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _carregarDados,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // =============================================
                    // SEÇÃO: HISTÓRICO DE AÇÕES
                    // =============================================
                    _buildHistoricoSection(cs),
                    
                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 16),
                    
                    // =============================================
                    // SEÇÃO: ATIVIDADES
                    // =============================================
                    _buildAtividadesSection(cs),
                  ],
                ),
              ),
            ),
    );
  }

  // =============================================
  // SEÇÃO DE HISTÓRICO
  // =============================================
  Widget _buildHistoricoSection(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.history, size: 20, color: cs.primary),
            const SizedBox(width: 8),
            Text(
              'Histórico de Ações',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: cs.onSurface,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: cs.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${_historico.length}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: cs.primary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_isLoadingHistorico)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_historico.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cs.surfaceVariant.withOpacity(0.3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                'Nenhuma alteração registrada ainda.',
                style: TextStyle(
                  color: cs.onSurfaceVariant,
                ),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _historico.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              return _buildHistoricoItem(_historico[index], cs);
            },
          ),
      ],
    );
  }

  Widget _buildHistoricoItem(Map<String, dynamic> item, ColorScheme cs) {
    final DateTime data = DateTime.parse(item['HistChamadoDt']);
    final String dataFormatada = DateFormat('dd/MM/yyyy - HH:mm').format(data);
    final String usuario = item['HistChamadoUsuario'] ?? 'Sistema';
    final String acao = item['HistChamadoAcao'] ?? 'ATUALIZACAO';
    final String descricao = item['HistChamadoDescricao'] ?? '';

    final icon = _getHistoricoIcon(acao);
    final color = _getHistoricoColor(acao, cs);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.surfaceVariant.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        _formatarUsuario(usuario),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: cs.onSurface,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      dataFormatada,
                      style: TextStyle(
                        fontSize: 10,
                        color: cs.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  descricao,
                  style: TextStyle(
                    fontSize: 13,
                    color: cs.onSurfaceVariant,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =============================================
  // SEÇÃO DE ATIVIDADES
  // =============================================
  Widget _buildAtividadesSection(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.chat_bubble_outline, size: 20, color: cs.primary),
            const SizedBox(width: 8),
            Text(
              'Atividades',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: cs.onSurface,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: cs.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${_atividades.length}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: cs.primary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_atividades.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cs.surfaceVariant.withOpacity(0.3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                'Nenhuma atividade pública registrada.',
                style: TextStyle(
                  color: cs.onSurfaceVariant,
                ),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _atividades.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              return _buildActivityItem(_atividades[index], cs);
            },
          ),
      ],
    );
  }

  // =============================================
  // ITEM DE ATIVIDADE (SIMPLIFICADO PARA CIDADÃO)
  // =============================================
  Widget _buildActivityItem(Map<String, dynamic> atividade, ColorScheme cs) {
    final DateTime data = DateTime.parse(atividade['AtividadeDtRealizacao']);
    final String dataFormatada = DateFormat('dd/MM/yyyy - HH:mm').format(data);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.surfaceVariant.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: cs.outline.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Público',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
              Text(
                dataFormatada,
                style: TextStyle(
                  fontSize: 11,
                  color: cs.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            atividade['AtividadeDescricao'] ?? '',
            style: const TextStyle(fontSize: 14, height: 1.4),
          ),
        ],
      ),
    );
  }

  // =============================================
  // FUNÇÃO AUXILIAR PARA FORMATAR USUÁRIO
  // =============================================
  String _formatarUsuario(String usuario) {
    // Se for "Sistema", manter
    if (usuario == 'Sistema') return usuario;
    
    // Se tiver "cidadão" ou "Cidadão", manter
    if (usuario.toLowerCase().contains('cidadao')) return usuario;
    
    // Para gestores/técnicos, mostrar como "Equipe"
    return 'Equipe';
  }
}