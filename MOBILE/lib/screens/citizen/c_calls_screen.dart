import 'dart:convert';
import 'package:CDCP/config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
//import 'package:intl/intl.dart';
import '../../models/call_model.dart';
import '../../models/theme_model.dart';
import '../../models/user_model.dart';
import './call_activities_screen.dart';

class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => CallsScreenState();
}

class CallsScreenState extends State<CallsScreen> {
  List<CallModel> _filteredCalls = [];
  String _searchQuery = "";
  String _selectedStatus = "TODOS";

  final Map<String, String> _statusDisplayNames = {
    "TODOS": "TODOS",
    "PROCESSAMENTO": "PROCESSAMENTO",
    "PENDENTE": "PENDENTE",
    "ANALISADO": "ANALISADO",
    "ATRIBUIDO": "ATRIBUÍDO",
    "EMATENDIMENTO": "EM ATENDIMENTO",
    "CONCLUIDO": "CONCLUÍDO",
    "FALTAINFORMACAO": "FALTA INFORMAÇÃO",
    "CANCELADO": "CANCELADO",
    "RECUSADO": "RECUSADO",
  };

  final List<String> _statusOptions = [
    "TODOS",
    "PROCESSAMENTO",
    "PENDENTE",
    "ANALISADO",
    "ATRIBUIDO",
    "EMATENDIMENTO",
    "CONCLUIDO",
    "FALTAINFORMACAO",
    "CANCELADO",
    "RECUSADO",
  ];

  UserProfile? _currentUser;
  List<CallModel> _calls = [];
  bool _isLoading = true;

  // =============================================
  // ✅ CORES PADRONIZADAS POR STATUS
  // =============================================
  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PROCESSAMENTO':
        return Colors.deepPurple;
      case 'PENDENTE':
        return Colors.orange;
      case 'ANALISADO':
        return Colors.blue;
      case 'ATRIBUIDO':
        return Colors.indigo;
      case 'EMATENDIMENTO':
        return Colors.cyan;
      case 'CONCLUIDO':
        return Colors.green;
      case 'CANCELADO':
        return Colors.red;
      case 'RECUSADO':
        return Colors.deepOrange;
      case 'FALTAINFORMACAO':
        return Colors.pink;
      default:
        return Colors.grey;
    }
  }

  Color _getStatusLightColor(String status) {
    switch (status.toUpperCase()) {
      case 'PROCESSAMENTO':
        return Colors.deepPurple.shade50;
      case 'PENDENTE':
        return Colors.orange.shade50;
      case 'ANALISADO':
        return Colors.blue.shade50;
      case 'ATRIBUIDO':
        return Colors.indigo.shade50;
      case 'EMATENDIMENTO':
        return Colors.cyan.shade50;
      case 'CONCLUIDO':
        return Colors.green.shade50;
      case 'CANCELADO':
        return Colors.red.shade50;
      case 'RECUSADO':
        return Colors.deepOrange.shade50;
      case 'FALTAINFORMACAO':
        return Colors.pink.shade50;
      default:
        return Colors.grey.shade50;
    }
  }

  Color _getStatusBorderColor(String status) {
    switch (status.toUpperCase()) {
      case 'PROCESSAMENTO':
        return Colors.deepPurple.shade200;
      case 'PENDENTE':
        return Colors.orange.shade200;
      case 'ANALISADO':
        return Colors.blue.shade200;
      case 'ATRIBUIDO':
        return Colors.indigo.shade200;
      case 'EMATENDIMENTO':
        return Colors.cyan.shade200;
      case 'CONCLUIDO':
        return Colors.green.shade200;
      case 'CANCELADO':
        return Colors.red.shade200;
      case 'RECUSADO':
        return Colors.deepOrange.shade200;
      case 'FALTAINFORMACAO':
        return Colors.pink.shade200;
      default:
        return Colors.grey.shade200;
    }
  }

  @override
  void initState() {
    super.initState();
    loadCalls();
  }

  void _applyFilters() {
    setState(() {
      _filteredCalls = _calls.where((call) {
        final selected = _selectedStatus.replaceAll(" ", "").toUpperCase();
        final currentCallStatus = (call.status ?? "")
            .toString()
            .replaceAll(" ", "")
            .toUpperCase();

        final matchesStatus =
            _selectedStatus == "TODOS" || currentCallStatus == selected;

        final query = _searchQuery.toLowerCase().trim();

        if (query.isEmpty) {
          return matchesStatus;
        }

        final titulo = (call.titulo ?? "").toString().toLowerCase();
        final matchesTitulo = titulo.contains(query);

        final desc = (call.descricaoInicial ?? "").toString().toLowerCase();
        final matchesDesc = desc.contains(query);

        final idConcatenado = "${call.n1}-${call.n2}".toLowerCase();
        final matchesId = idConcatenado.contains(query);

        final matchesN1 = call.n1.toString().contains(query);
        final matchesN2 = call.n2.toString().contains(query);

        final matchesSearch = matchesTitulo || 
                              matchesDesc || 
                              matchesId || 
                              matchesN1 || 
                              matchesN2;

        return matchesStatus && matchesSearch;
      }).toList();
    });
  }

  Future<void> loadCalls() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final themeModel = Provider.of<ThemeModel>(context, listen: false);
      _currentUser = themeModel.currentUser;

      if (_currentUser == null) return;

      final uri = Uri.parse('${AppConfig.baseUrl}/api/chamado');

      final response = await http.get(
        uri,
        headers: {'Authorization': 'Bearer ${_currentUser!.token!}'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map && data.containsKey('data')) {
          final List<dynamic> chamadosJson = data['data'] as List<dynamic>;

          setState(() {
            _calls = chamadosJson.map((json) {
              try {
                return CallModel.fromJson(json);
              } catch (e) {
                final chamadoId = json['ChamadoId'];
                final idString = chamadoId ?? 'desconhecido';
                debugPrint("Erro ao mapear o chamado ID $idString: $e");
                debugPrint("JSON problemático: $json");
                rethrow;
              }
            }).toList();

            _applyFilters();
          });
        }
      }
    } catch (e) {
      debugPrint('Erro ao carregar chamados: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _navegarParaAtividades(CallModel call) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CallActivitiesScreen(
          chamadoId: call.id ?? '',
          chamadoN1: call.n1 ?? 0,
          chamadoN2: call.n2 ?? 0,
        ),
      ),
    );
  }

  Future<void> _cancelCall(String? callId, int? callN1, int? callN2) async {
    if (callId == null || _currentUser == null || _currentUser!.token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sessão inválida ou ID ausente'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar'),
        content: Text('Deseja cancelar o chamado #$callN1-$callN2?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Voltar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Sim, Cancelar',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);

    try {
      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado/$callId/status');

      final response = await http
          .patch(
            url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${_currentUser!.token}',
            },
            body: jsonEncode({'ChamadoStatus': 'CANCELADO'}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 204) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Chamado #$callN1-$callN2 cancelado com sucesso!'),
            backgroundColor: Colors.green[700],
            behavior: SnackBarBehavior.floating,
          ),
        );
        await loadCalls();
      } else {
        final data = jsonDecode(response.body);
        final msg = data['error'] ?? data['message'] ?? 'Erro ${response.statusCode}';
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$msg'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('💥 Falha de rede: $e'),
          backgroundColor: Colors.orange[900],
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _editCall(CallModel call) async {
    final status = call.status.toUpperCase();
    if (status != 'PENDENTE' && status != 'FALTAINFORMACAO') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            '⚠️ Só é possível editar chamados Pendentes ou com Falta de Informação',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final TextEditingController editController = TextEditingController(
      text: call.descricaoInicial,
    );

    final TextEditingController diasController = TextEditingController(
      text: call.diasproblema?.toString() ?? '0',
    );

    final dynamic result = await showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text(
                'Editar Chamado',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: editController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: 'Digite a nova descrição...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        labelText: 'Descrição',
                        labelStyle: GoogleFonts.inter(fontSize: 14),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: diasController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Digite a quantidade de dias...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        labelText: 'Dias com Problema',
                        labelStyle: GoogleFonts.inter(fontSize: 14),
                        prefixIcon: const Icon(Icons.calendar_today, size: 20),
                        suffixText: 'dias',
                        suffixStyle: GoogleFonts.inter(
                          color: Colors.grey,
                          fontSize: 14,
                        ),
                      ),
                      onChanged: (value) {
                        if (value.isNotEmpty) {
                          final int? days = int.tryParse(value);
                          if (days != null && days < 0) {
                            diasController.text = '0';
                            diasController.selection = TextSelection.fromPosition(
                              TextPosition(offset: diasController.text.length),
                            );
                          }
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Quantos dias este problema está ocorrendo?',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context, false);
                    }
                  },
                  child: const Text('Cancelar'),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (editController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('A descrição não pode estar vazia'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    final int? dias = int.tryParse(diasController.text.trim());
                    if (dias == null || dias < 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Digite um número válido de dias (mínimo 0)',
                          ),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    if (Navigator.canPop(context)) {
                      Navigator.pop(context, {
                        'descricao': editController.text.trim(),
                        'dias': dias,
                        'confirmado': true,
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    minimumSize: const Size(120, 40),
                  ),
                  child: const Text(
                    'Salvar Alterações',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ],
            );
          },
        );
      },
    );

    if (result is Map<String, dynamic> && result['confirmado'] == true) {
      final String novaDescricao = result['descricao'];
      final int novosDias = result['dias'];
      await _atualizarChamado(call, novaDescricao, novosDias);
    }
  }

  Future<void> _atualizarChamado(
    CallModel call,
    String descricao,
    int dias,
  ) async {
    setState(() => _isLoading = true);

    try {
      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado/${call.id}');

      final response = await http
          .put(
            url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${_currentUser!.token}',
            },
            body: jsonEncode({
              'ChamadoDescricaoInicial': descricao,
              'ChamadoDiasComProblema': dias,
              'PessoaId': _currentUser!.id,
              'UnidadeId': _currentUser!.unidadeId,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 204) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Chamado atualizado com sucesso!'),
            backgroundColor: Colors.green,
          ),
        );
        await loadCalls();
      } else {
        final data = jsonDecode(response.body);
        throw data['error'] ?? data['message'] ?? 'Erro ${response.statusCode}';
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.redAccent),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
        backgroundColor: isError ? Colors.redAccent : Colors.green[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surfaceContainerHighest.withOpacity(0.2),
      appBar: AppBar(
        title: Text(
          'Meus Chamados',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: Column(
        children: [
          _buildFilterBar(cs),
          Expanded(
            child: RefreshIndicator(
              onRefresh: loadCalls,
              color: cs.primary,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredCalls.isEmpty
                  ? _buildEmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
                      itemCount: _filteredCalls.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) => _buildCallCard(
                        context,
                        _filteredCalls[index],
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.25),
        Icon(Icons.assignment_outlined, size: 70, color: Colors.grey[400]),
        const SizedBox(height: 16),
        Center(
          child: Text(
            'Nenhum chamado ativo',
            style: GoogleFonts.inter(
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCallCard(BuildContext context, CallModel call) {
    final cs = Theme.of(context).colorScheme;
    final statusColor = _getStatusColor(call.status);
    final statusLightColor = _getStatusLightColor(call.status);
    final statusBorderColor = _getStatusBorderColor(call.status);
    final statusUpper = call.status.toUpperCase();
    final isEditable = statusUpper == 'PENDENTE' || statusUpper == 'FALTAINFORMACAO';

    return GestureDetector(
      onTap: () => _navegarParaAtividades(call),
      child: Container(
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          // ✅ Borda com a cor do status
          border: Border.all(
            color: statusBorderColor.withOpacity(0.5),
            width: 1.5,
          ),
        ),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // ✅ Barra lateral colorida com a cor do status
              Container(
                width: 6,
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(18),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Text(
                                'ID #${call.n1}-${call.n2}',
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 11,
                                  color: statusColor.withOpacity(0.7),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                Icons.visibility_outlined,
                                size: 14,
                                color: Colors.grey[400],
                              ),
                            ],
                          ),
                          // ✅ Status Chip com a cor do status
                          _buildStatusChip(call.status, statusColor, statusLightColor),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // ✅ Título
                      if (call.titulo != null && call.titulo!.isNotEmpty)
                        Text(
                          call.titulo!,
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurface,
                          ),
                        ),
                      // ✅ Descrição
                      Text(
                        call.descricaoInicial ?? '',
                        style: GoogleFonts.inter(
                          fontSize: call.titulo != null && call.titulo!.isNotEmpty ? 12 : 15,
                          fontWeight: call.titulo != null && call.titulo!.isNotEmpty ? FontWeight.w400 : FontWeight.w600,
                          color: call.titulo != null && call.titulo!.isNotEmpty ? Colors.grey[600] : cs.onSurface,
                        ),
                        maxLines: call.titulo != null && call.titulo!.isNotEmpty ? 2 : 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      // ✅ Mensagem de Falta Informação
                      if (call.status == 'FALTAINFORMACAO' && 
                          call.descricaoFormatada != null && 
                          call.descricaoFormatada!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _getStatusLightColor('FALTAINFORMACAO'),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: _getStatusColor('FALTAINFORMACAO').withOpacity(0.3)),
                          ),
                          child: Text(
                            'Falta informação no chamado: ${call.descricaoFormatada}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: _getStatusColor('FALTAINFORMACAO'),
                            ),
                          ),
                        ),
                      ],
                      // ✅ Mensagem de Recusa
                      if (call.status == 'RECUSADO' && 
                          call.descricaoFormatada != null && 
                          call.descricaoFormatada!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: _getStatusLightColor('RECUSADO'),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: _getStatusColor('RECUSADO').withOpacity(0.3)),
                          ),
                          child: Text(
                            'Chamado recusado: ${call.descricaoFormatada}',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: _getStatusColor('RECUSADO'),
                            ),
                          ),
                        ),
                      ],
                      // ✅ Botões de Ação
                      if (isEditable) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () => _editCall(call),
                                child: _buildBtn(
                                  'Editar',
                                  Icons.edit_outlined,
                                  cs.primary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: GestureDetector(
                                onTap: () => _cancelCall(call.id, call.n1, call.n2),
                                child: _buildBtn(
                                  'Cancelar',
                                  Icons.close,
                                  Colors.red[700]!,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      // ✅ Indicador para ver atividades
                      if (!isEditable) ...[
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            'Toque para ver atividades',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: Colors.grey[500],
                              fontStyle: FontStyle.italic,
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
        ),
      ),
    );
  }

  Widget _buildFilterBar(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: cs.surface,
      child: Column(
        children: [
          TextField(
            onChanged: (value) {
              _searchQuery = value;
              _applyFilters();
            },
            decoration: InputDecoration(
              hintText: 'Buscar por título, descrição ou ID...',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: cs.surfaceContainerHighest.withOpacity(0.3),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _statusOptions.map((status) {
                final isSelected = _selectedStatus == status;
                final displayName = _statusDisplayNames[status] ?? status;
                final statusColor = _getStatusColor(status);

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isSelected ? Colors.white : statusColor,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: statusColor,
                    backgroundColor: statusColor.withOpacity(0.1),
                    onSelected: (selected) {
                      setState(() {
                        _selectedStatus = status;
                        _applyFilters();
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status, Color color, Color lightColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: lightColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        _statusDisplayNames[status] ?? status,
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  Widget _buildBtn(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}