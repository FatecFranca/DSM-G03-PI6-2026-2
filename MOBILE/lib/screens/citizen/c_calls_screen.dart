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

class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => CallsScreenState();
}

class CallsScreenState extends State<CallsScreen> {
  List<CallModel> _filteredCalls = []; // Lista que será exibida
  String _searchQuery = "";
  String _selectedStatus = "TODOS";

  // Mapeamento para exibição em português
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

  @override
  void initState() {
    super.initState();
    loadCalls();
  }

  void _applyFilters() {
    setState(() {
      _filteredCalls = _calls.where((call) {
        // Garante que o status seja String antes de tratar
        final selected = _selectedStatus.replaceAll(" ", "").toUpperCase();
        final currentCallStatus = (call.status ?? "")
            .toString()
            .replaceAll(" ", "")
            .toUpperCase();

        final matchesStatus =
            _selectedStatus == "TODOS" || currentCallStatus == selected;

        // Garante que a descrição seja String para o contains
        final desc = (call.descricaoInicial ?? "").toString().toLowerCase();
        final query = _searchQuery.toLowerCase();

        final matchesSearch =
            desc.contains(query) || call.id.toString().contains(query);

        return matchesStatus && matchesSearch;
      }).toList();
    });
  }

  // Método público para permitir refresh externo
  Future<void> loadCalls() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    // O BLOCO QUE ESTAVA AQUI FOI REMOVIDO POIS ESTAVA FORA DE ORDEM

    try {
      final themeModel = Provider.of<ThemeModel>(context, listen: false);
      _currentUser = themeModel.currentUser;

      if (_currentUser == null) return;

      final uri = Uri.parse('${AppConfig.baseUrl}/api/chamado');
      /*.replace(
        queryParameters: {
          'pagina': '1',
          'limite': '50',
          'pessoaId': _currentUser!.id.toString(),
          'unidadeId': _currentUser!.unidadeId?.toString() ?? '',
        },
      );*/

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

  Future<void> _cancelCall(String? callId, int? callN1, int? callN2) async {
    // 1. Verificações de segurança
    if (callId == null || _currentUser == null || _currentUser!.token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sessão inválida ou ID ausente'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    // 2. Diálogo de Confirmação
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
      // 3. Rota PATCH: http://localhost:3001/api/chamado/{id}/status
      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado/$callId/status');

      debugPrint('🚀 Enviando PATCH para: $url');

      final response = await http
          .patch(
            url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${_currentUser!.token}',
            },
            body: jsonEncode({
              'ChamadoStatus':
                  'CANCELADO', // O campo que a sua API validou como obrigatório
            }),
          )
          .timeout(const Duration(seconds: 10));

      debugPrint('📡 Status Code: ${response.statusCode}');
      debugPrint('📄 Resposta: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 204) {
        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Chamado #$callN1-$callN2 cancelado com sucesso!'),
            backgroundColor: Colors.green[700],
            behavior: SnackBarBehavior.floating,
          ),
        );

        await loadCalls(); // Recarrega a lista para atualizar os status na tela
      } else {
        // Trata o erro 403 ou 400 que a API enviar
        final data = jsonDecode(response.body);
        final msg =
            data['error'] ?? data['message'] ?? 'Erro ${response.statusCode}';

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
    // 1. Validação de Regra de Negócio Local
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

    // 2. Abre Modal de Edição
    final dynamic result = await showDialog(
      context: context,
      builder: (context) {
        // Usar os controllers já definidos fora
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
                            diasController
                                .selection = TextSelection.fromPosition(
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
                    // Validar se os campos estão preenchidos
                    if (editController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('A descrição não pode estar vazia'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    // Validar dias
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
                      // Retorna um Map com os dados
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

    // Processar o resultado corretamente
    if (result is Map<String, dynamic> && result['confirmado'] == true) {
      final String novaDescricao = result['descricao'];
      final int novosDias = result['dias'];

      // Chamar a função para atualizar
      await _atualizarChamado(call, novaDescricao, novosDias);
    }
  }

  // Função separada para atualizar o chamado
  Future<void> _atualizarChamado(
    CallModel call,
    String descricao,
    int dias,
  ) async {
    setState(() => _isLoading = true);

    try {
      // 3. Rota PUT: http://localhost:3001/api/chamado/{id}
      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado/${call.id}');

      debugPrint('📝 Editando chamado #${call.id}');
      debugPrint(
        '📦 Dados enviados: ${jsonEncode({'ChamadoDescricaoInicial': descricao, 'ChamadoDiasComProblema': dias})}',
      );

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
        await loadCalls(); // Atualiza a lista
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

  // Métodos auxiliares de SnackBar simplificados para evitar erros de referência
  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$msg'),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$msg'),
        backgroundColor: Colors.green[700],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Função auxiliar para exibir as notificações (SnackBars)
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
        // Adicionado Column para separar a barra da lista
        children: [
          _buildFilterBar(cs), // Adicionada a barra de filtros no topo
          Expanded(
            child: RefreshIndicator(
              onRefresh: loadCalls,
              color: cs.primary,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredCalls
                        .isEmpty // Usar a lista filtrada aqui
                  ? _buildEmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
                      itemCount: _filteredCalls.length, // Usar filtered
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) => _buildCallCard(
                        context,
                        _filteredCalls[index],
                      ), // Usar filtered
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
    final statusUpper = call.status.toUpperCase();
    final isEditable =
        statusUpper == 'PENDENTE' || statusUpper == 'FALTAINFORMACAO';

    return Container(
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
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Container(
              width: 5,
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
                        Text(
                          'ID #${call.n1}-${call.n2}',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            color: Colors.grey,
                          ),
                        ),
                        _buildStatusChip(call.status, statusColor),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      call.titulo != null && call.titulo!.isNotEmpty
                          ? call.titulo!
                          : call.descricaoInicial,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (call.titulo != null && call.titulo!.isNotEmpty) ...[
                      Text(
                        call.descricaoInicial,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    if (isEditable) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => _editCall(
                                call,
                              ), // Passamos o objeto 'call' inteiro para facilitar
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
                              onTap: () {
                                // ESTE É O DEBUG QUE PRECISAMOS VER:
                                debugPrint('--- DADOS PARA CONFERÊNCIA ---');
                                debugPrint(
                                  'ID do Chamado Selecionado: ${call.id}',
                                );
                                debugPrint(
                                  'Status Atual do Chamado: ${call.status}',
                                );
                                debugPrint(
                                  'ID do Dono do Chamado: ${call.pessoaId}',
                                );
                                debugPrint(
                                  'ID do Usuário Logado: ${_currentUser?.id}',
                                );
                                debugPrint('-----------------------------');

                                _cancelCall(call.id, call.n1, call.n2);
                              },
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
                  ],
                ),
              ),
            ),
          ],
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
          // Barra de Pesquisa
          TextField(
            onChanged: (value) {
              _searchQuery = value;
              _applyFilters();
            },
            decoration: InputDecoration(
              hintText: 'Buscar por título ou ID...',
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
          // Filtro de Status (Chips Horizontais)
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _statusOptions.map((status) {
                final isSelected = _selectedStatus == status;
                // Pega o nome de exibição ou usa o próprio status se não tiver mapeamento
                final displayName = _statusDisplayNames[status] ?? status;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(
                      displayName,
                      style: TextStyle(
                        fontSize: 12,
                        color: isSelected ? Colors.white : cs.onSurface,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: cs.primary,
                    onSelected: (selected) {
                      setState(() {
                        _selectedStatus =
                            status; // Mantém o valor original para o filtro
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

  Widget _buildStatusChip(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
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

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDENTE':
        return Colors.orange[800]!;
      case 'CONCLUIDO':
        return Colors.green[700]!;
      case 'CANCELADO':
        return Colors.red[700]!;
      default:
        return Colors.blue[700]!;
    }
  }
}
