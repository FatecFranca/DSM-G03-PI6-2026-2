import 'dart:async';
import 'package:CDCP/screens/technician/call_activities_screen.dart';
import 'package:CDCP/screens/technician/new_call_description_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_fonts/google_fonts.dart';
import '../../models/theme_model.dart';
import '../../config.dart';

class TCallsScreen extends StatefulWidget {
  const TCallsScreen({super.key});

  @override
  State<TCallsScreen> createState() => _TCallsScreenState();
}

class _TCallsScreenState extends State<TCallsScreen> {
  bool isLoading = true;
  List<dynamic> chamados = [];
  List<dynamic> filteredChamados = [];
  Timer? _refreshTimer;

  // Filtros
  String _searchQuery = "";
  String _selectedStatus = "TODOS";
  String? _selectedEquipeId;
  List<dynamic> equipes = [];
  bool _isLoadingEquipes = false;

  // Controle de expansão por equipe
  Map<String, bool> _expandedEquipes = {};

  final List<String> _statusOptions = [
    "TODOS",
    "ATRIBUIDO",
    "EMATENDIMENTO",
    "CONCLUIDO",
  ];

  final Map<String, String> _statusDisplayNames = {
    "TODOS": "TODOS",
    "ATRIBUIDO": "ATRIBUÍDO",
    "EMATENDIMENTO": "EM ATENDIMENTO",
    "CONCLUIDO": "CONCLUÍDO",
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint("🏁 Interface pronta. Iniciando processos...");
      _fetchChamadosTecnico();
      _carregarEquipes();
      _startAutoRefresh();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _fetchChamadosTecnico(isAutoRefresh: true);
    });
  }

  Future<void> _carregarEquipes() async {
    try {
      setState(() => _isLoadingEquipes = true);
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;

      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/equipe'),
        headers: {
          'Authorization': 'Bearer ${user?.token}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List<dynamic> data = decoded['data'] ?? [];

        setState(() {
          equipes = data;
          // Inicializar expansão para todas as equipes como false
          for (var equipe in data) {
            _expandedEquipes[equipe['EquipeId']] = false;
          }
        });
      }
    } catch (e) {
      debugPrint('💥 Erro ao carregar equipes: $e');
    } finally {
      setState(() => _isLoadingEquipes = false);
    }
  }

  Future<void> _fetchChamadosTecnico({bool isAutoRefresh = false}) async {
    if (!mounted) return;
    try {
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado');

      if (!isAutoRefresh) setState(() => isLoading = true);

      final response = await http
          .get(
            url,
            headers: {
              'Authorization': 'Bearer ${user?.token}',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List<dynamic> todos = (decoded is List)
            ? decoded
            : (decoded['data'] ?? []);

        if (mounted) {
          // ✅ Buscar a equipe do técnico logado
          final equipeDoTecnico = await _getEquipeDoTecnico(user?.id);

          setState(() {
            chamados = todos.where((c) {
              final status = c['ChamadoStatus']?.toString().toUpperCase();
              final equipeId = c['EquipeId']?.toString();

              // ✅ Filtrar apenas chamados da equipe do técnico
              final isDaEquipe =
                  equipeDoTecnico == null || equipeId == equipeDoTecnico;

              return (status == 'ATRIBUIDO' ||
                      status == 'EMATENDIMENTO' ||
                      status == 'CONCLUIDO') &&
                  isDaEquipe;
            }).toList();
            _applyFilters();
            isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('💥 Erro no filtro técnico: $e');
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<String?> _getEquipeDoTecnico(String? tecnicoId) async {
    if (tecnicoId == null) return null;
    try {
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/api/tecnico/$tecnicoId/equipe'),
        headers: {
          'Authorization': 'Bearer ${user?.token}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        return decoded['data']?['EquipeId']?.toString();
      }
      return null;
    } catch (e) {
      debugPrint('💥 Erro ao buscar equipe do técnico: $e');
      return null;
    }
  }

  void _applyFilters() {
    setState(() {
      filteredChamados = chamados.where((chamado) {
        // Filtro por Status
        final status = chamado['ChamadoStatus']?.toString().toUpperCase() ?? '';
        final matchesStatus =
            _selectedStatus == "TODOS" || status == _selectedStatus;

        // Filtro por busca (ID N1-N2, Título, Descrição)
        final n1 = chamado['ChamadoN1']?.toString() ?? '';
        final n2 = chamado['ChamadoN2']?.toString() ?? '';
        final idCompleto = "$n1-$n2";
        final titulo = chamado['ChamadoTitulo']?.toString().toLowerCase() ?? '';
        final descricao =
            (chamado['ChamadoDescricaoFormatada'] ??
                    chamado['ChamadoDescricaoInicial'] ??
                    '')
                .toString()
                .toLowerCase();
        final query = _searchQuery.toLowerCase().trim();

        final matchesSearch =
            query.isEmpty ||
            idCompleto.contains(query) ||
            titulo.contains(query) ||
            descricao.contains(query);

        // ✅ Remover o filtro de equipe daqui - apenas agrupar depois
        return matchesStatus && matchesSearch;
      }).toList();
    });
  }

  // Função para obter chamados por equipe
  List<dynamic> _getChamadosPorEquipe(String equipeId) {
    return filteredChamados.where((c) {
      final id = c['EquipeId']?.toString();
      return id == equipeId;
    }).toList();
  }

  // Função para obter chamados sem equipe
  List<dynamic> _getChamadosSemEquipe() {
    return filteredChamados.where((c) {
      return c['EquipeId'] == null || c['EquipeId']?.toString().isEmpty == true;
    }).toList();
  }

  Future<void> _patchStatusConcluido(String id) async {
    try {
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado/$id/status');

      final response = await http.patch(
        url,
        headers: {
          'Authorization': 'Bearer ${user?.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({"ChamadoStatus": "CONCLUIDO"}),
      );

      if (response.statusCode == 200) {
        _showSnackBar('Chamado concluído com sucesso!');
        _fetchChamadosTecnico();
      } else {
        _showSnackBar('Erro ao concluir chamado', isError: true);
      }
    } catch (e) {
      _showSnackBar('Erro de conexão', isError: true);
    }
  }

  void _confirmarConclusao(String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Finalizar Chamado"),
        content: const Text(
          "Deseja realmente marcar este chamado como CONCLUÍDO?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("CANCELAR"),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _patchStatusConcluido(id);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text("SIM, CONCLUIR"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          "Chamados da Equipe",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => _fetchChamadosTecnico(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _fetchChamadosTecnico(),
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  // Barra de Filtros
                  _buildFilterBar(cs),
                  // Lista de Chamados por Equipe
                  Expanded(
                    child: filteredChamados.isEmpty
                        ? _buildEmptyState(cs)
                        : _buildChamadosPorEquipeList(cs),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildFilterBar(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: cs.surfaceVariant.withOpacity(0.1),
      child: Column(
        children: [
          // Busca
          TextField(
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
                _applyFilters();
              });
            },
            decoration: InputDecoration(
              hintText: 'Buscar por ID (N1-N2), título ou descrição...',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: cs.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Filtros de Status
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _statusOptions.map((status) {
                final isSelected = _selectedStatus == status;
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
                        _selectedStatus = status;
                        _applyFilters();
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          // Filtro de Equipe (Dropdown)
          if (equipes.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: cs.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cs.outlineVariant.withOpacity(0.3)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedEquipeId,
                  hint: const Text('Todas as equipes'),
                  items: [
                    const DropdownMenuItem<String>(
                      value: null,
                      child: Text('Todas as equipes'),
                    ),
                    ...equipes.map((equipe) {
                      return DropdownMenuItem<String>(
                        value: equipe['EquipeId']?.toString(),
                        child: Text(equipe['EquipeNome'] ?? 'Equipe'),
                      );
                    }).toList(),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _selectedEquipeId = value;
                      _applyFilters();
                    });
                  },
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChamadosPorEquipeList(ColorScheme cs) {
    final List<Widget> widgets = [];

    // Agrupar chamados por equipe
    if (equipes.isNotEmpty) {
      for (var equipe in equipes) {
        String equipeId = equipe['EquipeId'];
        final chamadosDaEquipe = _getChamadosPorEquipe(equipeId);

        if (chamadosDaEquipe.isNotEmpty) {
          widgets.add(_buildEquipeSection(equipe, chamadosDaEquipe, cs));
        }
      }
    }

    // Chamados sem equipe
    final chamadosSemEquipe = _getChamadosSemEquipe();
    if (chamadosSemEquipe.isNotEmpty) {
      widgets.add(
        _buildEquipeSection(
          {'EquipeId': 'SEM_EQUIPE', 'EquipeNome': 'Sem Equipe'},
          chamadosSemEquipe,
          cs,
        ),
      );
    }

    if (widgets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 60,
              color: cs.primary.withOpacity(0.3),
            ),
            const SizedBox(height: 16),
            const Text("Nenhum chamado encontrado com os filtros atuais."),
          ],
        ),
      );
    }

    // Espaçamento para não sobrepor a barra de navegação 
    widgets.add(const SizedBox(height: 90));

    return ListView(padding: const EdgeInsets.all(16), children: widgets);
  }

  Widget _buildEquipeSection(
    Map<String, dynamic> equipe,
    List<dynamic> chamadosEquipe,
    ColorScheme cs,
  ) {
    final equipeId = equipe['EquipeId']?.toString() ?? 'SEM_EQUIPE';
    final nomeEquipe = equipe['EquipeNome'] ?? 'Sem Equipe';
    final isExpanded = _expandedEquipes[equipeId] ?? false;

    // Contar chamados por status
    final atribuidos = chamadosEquipe
        .where(
          (c) => c['ChamadoStatus']?.toString().toUpperCase() == 'ATRIBUIDO',
        )
        .length;
    final emAtendimento = chamadosEquipe
        .where(
          (c) =>
              c['ChamadoStatus']?.toString().toUpperCase() == 'EMATENDIMENTO',
        )
        .length;
    final concluidos = chamadosEquipe
        .where(
          (c) => c['ChamadoStatus']?.toString().toUpperCase() == 'CONCLUIDO',
        )
        .length;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Cabeçalho da Equipe (Expansível)
          InkWell(
            onTap: () {
              setState(() {
                _expandedEquipes[equipeId] = !isExpanded;
              });
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: cs.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          nomeEquipe,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: cs.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            _buildStatusCounter(
                              'ATRIBUIDO',
                              atribuidos,
                              Colors.orange,
                            ),
                            const SizedBox(width: 12),
                            _buildStatusCounter(
                              'EMATENDIMENTO',
                              emAtendimento,
                              Colors.blue,
                            ),
                            const SizedBox(width: 12),
                            _buildStatusCounter(
                              'CONCLUIDO',
                              concluidos,
                              Colors.green,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${chamadosEquipe.length}',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: cs.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Lista de Chamados (Expandida)
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                children: chamadosEquipe.map((chamado) {
                  return _buildTicketCard(chamado, cs);
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusCounter(String status, int count, Color color) {
    if (count == 0) return const SizedBox.shrink();
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          '$count',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> chamado, ColorScheme cs) {
    final status =
        chamado['ChamadoStatus']?.toString().toUpperCase() ?? 'PENDENTE';
    final id = chamado['ChamadoId']?.toString() ?? '';
    final n1 = chamado['ChamadoN1']?.toString() ?? '0';
    final n2 = chamado['ChamadoN2']?.toString() ?? '0';
    final titulo = chamado['ChamadoTitulo'] ?? "Chamado #$n1-$n2";
    final descricao =
        chamado['ChamadoDescricaoFormatada'] ??
        chamado['ChamadoDescricaoInicial'] ??
        "Sem descrição disponível";

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: cs.outline.withOpacity(0.1)),
      ),
      color: cs.surfaceVariant.withOpacity(0.2),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "#$n1-$n2",
                  style: GoogleFonts.firaCode(
                    color: cs.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                _buildStatusBadge(status, cs),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              titulo,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              descricao,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13),
            ),
            const Divider(height: 24),
            // Botões por status
            if (status == 'EMATENDIMENTO') ...[
              _buildActionButton(
                onPressed: () async {
                  final res = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => NewCallDescriptionScreen(
                        chamadoId: id,
                        chamadoN1: int.tryParse(n1) ?? 0,
                        chamadoN2: int.tryParse(n2) ?? 0,
                      ),
                    ),
                  );
                  if (res == true) _fetchChamadosTecnico();
                },
                label: "ADICIONAR ATIVIDADE",
                icon: Icons.add,
                color: Colors.blue.shade600,
              ),
              const SizedBox(height: 8),
              _buildActionButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => CallActivitiesScreen(
                        chamadoId: id,
                        chamadoN1: int.tryParse(n1) ?? 0,
                        chamadoN2: int.tryParse(n2) ?? 0,
                      ),
                    ),
                  );
                },
                label: "ATIVIDADES ANTERIORES",
                icon: Icons.history,
                color: cs.primary,
                outlined: true,
              ),
              const SizedBox(height: 8),
              _buildActionButton(
                onPressed: () => _confirmarConclusao(id),
                label: "CONCLUIR CHAMADO",
                icon: Icons.check_circle_outline,
                color: Colors.green.shade700,
              ),
            ] else if (status == 'ATRIBUIDO')
              _buildActionButton(
                onPressed: () async {
                  final res = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => NewCallDescriptionScreen(
                        chamadoId: id,
                        chamadoN1: int.tryParse(n1) ?? 0,
                        chamadoN2: int.tryParse(n2) ?? 0,
                      ),
                    ),
                  );
                  if (res == true) _fetchChamadosTecnico();
                },
                label: "INICIAR ATENDIMENTO",
                icon: Icons.play_arrow,
                color: cs.primary,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required VoidCallback onPressed,
    required String label,
    required IconData icon,
    required Color color,
    bool outlined = false,
  }) {
    if (outlined) {
      return SizedBox(
        width: double.infinity,
        height: 40,
        child: OutlinedButton.icon(
          onPressed: onPressed,
          icon: Icon(icon, size: 18),
          label: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: color,
            side: BorderSide(color: color),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
      );
    }
    return SizedBox(
      width: double.infinity,
      height: 40,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status, ColorScheme cs) {
    Color color = Colors.grey;
    if (status == 'ATRIBUIDO') color = Colors.orange;
    if (status == 'EMATENDIMENTO') color = Colors.blue;
    if (status == 'CONCLUIDO') color = Colors.green;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        _statusDisplayNames[status] ?? status,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme cs) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 60,
            color: cs.primary.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          const Text("Nenhum chamado encontrado com os filtros atuais."),
        ],
      ),
    );
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.redAccent : Colors.green,
      ),
    );
  }
}
