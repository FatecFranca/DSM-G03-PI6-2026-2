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
  bool _isUpdating = false;
  List<dynamic> _atividades = [];
  Map<String, dynamic>? _chamadoInfo;
  String? _tecnicoId;

  @override
  void initState() {
    super.initState();
    _carregarTecnicoId();
    _fetchAtividades();
  }

  Future<void> _carregarTecnicoId() async {
    final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
    setState(() {
      _tecnicoId = user?.id;
    });
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
          _atividades = decoded is List ? decoded : (decoded['data'] ?? []);
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

  // =============================================
  // EDITAR ATIVIDADE (COM VISIBILIDADE)
  // =============================================
  Future<void> _editarAtividade(Map<String, dynamic> atividade) async {
    final TextEditingController controller = TextEditingController(
      text: atividade['AtividadeDescricao'] ?? '',
    );
    
    // ✅ Carregar a visibilidade atual
    String visibilidadeAtual = atividade['AtividadeUsuarioVer'] ?? 'GESTEC';

    final Map<String, dynamic>? resultado = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _EditarAtividadeDialog(
        controller: controller,
        visibilidadeAtual: visibilidadeAtual,
      ),
    );

    if (resultado != null && resultado['confirmado'] == true) {
      final novaDescricao = resultado['descricao']?.trim();
      final novaVisibilidade = resultado['visibilidade'] ?? 'GESTEC';
      
      if (novaDescricao != null && novaDescricao.isNotEmpty) {
        await _atualizarAtividade(
          atividade['AtividadeId'],
          novaDescricao,
          novaVisibilidade,
        );
      }
    }
  }

  // =============================================
  // ATUALIZAR ATIVIDADE NA API (COM VISIBILIDADE)
  // =============================================
  Future<void> _atualizarAtividade(
    String atividadeId,
    String novaDescricao,
    String visibilidade,
  ) async {
    try {
      setState(() => _isUpdating = true);

      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      final url = Uri.parse(
        '${AppConfig.baseUrl}/api/atividadechamado/$atividadeId',
      );

      final response = await http.put(
        url,
        headers: {
          'Authorization': 'Bearer ${user?.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'AtividadeDescricao': novaDescricao,
          'AtividadeUsuarioVer': visibilidade, // ✅ Enviar visibilidade
        }),
      );

      if (response.statusCode == 200) {
        _showSnackBar('Atividade atualizada com sucesso!');
        await _fetchAtividades();
      } else {
        String errorMessage = 'Erro ao atualizar atividade';
        try {
          final errorData = jsonDecode(response.body);
          errorMessage = errorData['error'] ?? errorData['message'] ?? 'Erro ${response.statusCode}';
        } catch (e) {
          errorMessage = 'Erro ${response.statusCode}';
        }
        _showSnackBar(errorMessage, isError: true);
      }
    } catch (e) {
      _showSnackBar('Erro de conexão: $e', isError: true);
    } finally {
      setState(() => _isUpdating = false);
    }
  }

  // =============================================
  // VERIFICAR SE O TÉCNICO PODE EDITAR
  // =============================================
  bool _podeEditarAtividade(Map<String, dynamic> atividade) {
    final tecnicoIdAtividade = atividade['TecnicoId']?.toString();
    final isAuthor = tecnicoIdAtividade == _tecnicoId;
    final statusChamado = atividade['Chamado']?['ChamadoStatus']?.toString().toUpperCase() ?? '';
    final isEmAtendimento = statusChamado == 'EMATENDIMENTO' || statusChamado == 'ATRIBUIDO';
    return isAuthor && isEmAtendimento;
  }

  // =============================================
  // OBTER ÍCONE DE VISIBILIDADE
  // =============================================
  IconData _getVisibilidadeIcon(String? visibilidade) {
    if (visibilidade == 'TODOS') {
      return Icons.public;
    }
    return Icons.lock_outline;
  }

  String _getVisibilidadeLabel(String? visibilidade) {
    if (visibilidade == 'TODOS') {
      return 'Público';
    }
    return 'Restrito';
  }

  Color _getVisibilidadeColor(String? visibilidade, ColorScheme cs) {
    if (visibilidade == 'TODOS') {
      return Colors.green;
    }
    return cs.onSurfaceVariant;
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.redAccent : Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
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
              "Histórico de Atividades",
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
      floatingActionButton: _isUpdating
          ? const FloatingActionButton(
              onPressed: null,
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
            )
          : null,
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
    final podeEditar = _podeEditarAtividade(atividade);
    
    // ✅ Obter informações de visibilidade
    final visibilidade = atividade['AtividadeUsuarioVer'] ?? 'GESTEC';
    final visibilidadeIcon = _getVisibilidadeIcon(visibilidade);
    final visibilidadeLabel = _getVisibilidadeLabel(visibilidade);
    final visibilidadeColor = _getVisibilidadeColor(visibilidade, cs);

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
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                tecnicoNome,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: cs.primary,
                                ),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // ✅ Badge de Visibilidade
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: visibilidadeColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  visibilidadeIcon,
                                  size: 12,
                                  color: visibilidadeColor,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  visibilidadeLabel,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w500,
                                    color: visibilidadeColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            dataFormatada,
                            style: TextStyle(
                              fontSize: 11, 
                              color: cs.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    atividade['AtividadeDescricao'] ?? '',
                    style: const TextStyle(fontSize: 14, height: 1.4),
                  ),

                  // Botão Editar
                  if (podeEditar) ...[
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: OutlinedButton.icon(
                        onPressed: _isUpdating ? null : () => _editarAtividade(atividade),
                        icon: Icon(
                          Icons.edit_outlined,
                          size: 16,
                          color: cs.primary,
                        ),
                        label: Text(
                          'Editar',
                          style: TextStyle(fontSize: 12, color: cs.primary),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          side: BorderSide(color: cs.primary.withOpacity(0.3)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
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
          const Text("Nenhuma atividade registrada ainda."),
        ],
      ),
    );
  }
}

// =============================================
// DIALOG DE EDIÇÃO COM VISIBILIDADE
// =============================================
class _EditarAtividadeDialog extends StatefulWidget {
  final TextEditingController controller;
  final String visibilidadeAtual;

  const _EditarAtividadeDialog({
    required this.controller,
    required this.visibilidadeAtual,
  });

  @override
  State<_EditarAtividadeDialog> createState() => _EditarAtividadeDialogState();
}

class _EditarAtividadeDialogState extends State<_EditarAtividadeDialog> {
  late String _selectedVisibilidade;

  @override
  void initState() {
    super.initState();
    _selectedVisibilidade = widget.visibilidadeAtual;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    
    return AlertDialog(
      title: const Text(
        'Editar Atividade',
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: widget.controller,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Digite a nova descrição...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Quem pode ver esta atividade?',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: cs.onSurfaceVariant,
              ),
            ),
            RadioListTile<String>(
              title: const Text('Apenas Técnico/Gestor'),
              subtitle: const Text('O cidadão não visualizará'),
              value: 'GESTEC',
              groupValue: _selectedVisibilidade,
              onChanged: (value) {
                setState(() {
                  _selectedVisibilidade = value!;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
            RadioListTile<String>(
              title: const Text('Cidadão pode ver'),
              subtitle: const Text('O cidadão poderá visualizar'),
              value: 'TODOS',
              groupValue: _selectedVisibilidade,
              onChanged: (value) {
                setState(() {
                  _selectedVisibilidade = value!;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, null),
          child: const Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context, {
              'confirmado': true,
              'descricao': widget.controller.text,
              'visibilidade': _selectedVisibilidade,
            });
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
          child: const Text(
            'Salvar',
            style: TextStyle(color: Colors.white),
          ),
        ),
      ],
    );
  }
}