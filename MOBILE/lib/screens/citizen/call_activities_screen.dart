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
  List<dynamic> _atividades = [];
  Map<String, dynamic>? _chamadoInfo;

  @override
  void initState() {
    super.initState();
    _fetchAtividades();
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
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      print("ERRO TÉCNICO: $e");
      setState(() => _isLoading = false);
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
              "Atividades do Chamado",
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
          : _atividades.isEmpty
              ? _buildEmptyState(cs)
              : RefreshIndicator(
                  onRefresh: _fetchAtividades,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _atividades.length,
                    itemBuilder: (context, index) {
                      return _buildActivityItem(
                        _atividades[index],
                        index == 0,
                        index == _atividades.length - 1,
                        cs,
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildActivityItem(
    Map<String, dynamic> atividade,
    bool isFirst,
    bool isLast,
    ColorScheme cs,
  ) {
    final DateTime data = DateTime.parse(atividade['AtividadeDtRealizacao']);
    final String dataFormatada = DateFormat('dd/MM/yyyy - HH:mm').format(data);
    final String tecnicoNome = atividade['Tecnico']?['TecnicoNome'] ?? 'Técnico';

    return IntrinsicHeight(
      child: Row(
        children: [
          // Linha de tempo
          Column(
            children: [
              Container(
                width: 2,
                height: 20,
                color: isFirst ? Colors.transparent : cs.primary.withOpacity(0.3),
              ),
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: cs.primary,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: cs.primary.withOpacity(0.2),
                    width: 4,
                  ),
                ),
              ),
              Expanded(
                child: Container(
                  width: 2,
                  color: isLast ? Colors.transparent : cs.primary.withOpacity(0.3),
                ),
              ),
            ],
          ),
          const SizedBox(width: 20),

          // Card da atividade
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 24),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cs.surfaceVariant.withOpacity(0.3),
                borderRadius: BorderRadius.circular(15),
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
                      // Nome do técnico (cidadão não deve ver o nome do técnico)
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                'Técnico',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: cs.primary,
                                ),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                        ),
                      ),
                      // Data
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
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme cs) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.history_toggle_off,
            size: 64,
            color: cs.primary.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          const Text(
            "Nenhuma atividade pública registrada",
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}