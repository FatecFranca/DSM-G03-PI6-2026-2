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
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint("🏁 Interface pronta. Iniciando processos...");
      _fetchChamadosTecnico();
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
          setState(() {
            chamados = todos.where((c) {
              final status = c['ChamadoStatus']?.toString().toUpperCase();
              return status == 'ATRIBUIDO' || status == 'EMATENDIMENTO';
            }).toList();
            isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('💥 Erro no filtro técnico: $e');
      if (mounted) setState(() => isLoading = false);
    }
  }

  // NOVA FUNÇÃO PARA CONCLUIR CHAMADO
  Future<void> _patchStatusConcluido(int id) async {
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

  void _confirmarConclusao(int id) {
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
            : chamados.isEmpty
            ? _buildEmptyState(cs)
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: chamados.length + 1, // +1 para o espaço extra
                itemBuilder: (context, index) {
                  // Se for o último item, retorna um SizedBox com espaço
                  if (index == chamados.length) {
                    return const SizedBox(height: 80); // Espaço extra no final
                  }
                  return _buildTicketCard(chamados[index], cs);
                },
              ),
      ),
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> chamado, ColorScheme cs) {
    final status =
        chamado['ChamadoStatus']?.toString().toUpperCase() ?? 'PENDENTE';
    final id = chamado['ChamadoId'];
    final n1 = chamado['ChamadoN1'];
    final n2 = chamado['ChamadoN2'];
    final titulo = chamado['ChamadoTitulo'] ?? "Chamado #$n1-$n2";
    final descricao =
        chamado['ChamadoDescricaoFormatada'] ??
        chamado['ChamadoDescricaoInicial'] ??
        "Sem descrição disponível";

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: cs.outline.withOpacity(0.1)),
      ),
      color: cs.surfaceVariant.withOpacity(0.2),
      child: Padding(
        padding: const EdgeInsets.all(20),
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
            const SizedBox(height: 16),
            Text(
              titulo,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              descricao,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: cs.onSurfaceVariant, fontSize: 14),
            ),
            const Divider(height: 32),

            // LÓGICA DE BOTÕES POR STATUS
            if (status == 'EMATENDIMENTO')
              Column(
                children: [
                  // 1. Botão Adicionar Atividade (+)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final res = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => NewCallDescriptionScreen(
                              chamadoId: id,
                              chamadoN1: n1,
                              chamadoN2: n2,
                            ),
                          ),
                        );
                        if (res == true) _fetchChamadosTecnico();
                      },
                      icon: const Icon(Icons.add, size: 20),
                      label: const Text(
                        "ADICIONAR ATIVIDADE",
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade600,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // 2. Botão Ver Atividades Anteriores
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => CallActivitiesScreen(
                              chamadoId: id,
                              chamadoN1: n1,
                              chamadoN2: n2,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.history, size: 18),
                      label: const Text(
                        "ATIVIDADES ANTERIORES",
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // 3. Botão Concluir
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _confirmarConclusao(id),
                      icon: const Icon(Icons.check_circle_outline, size: 20),
                      label: const Text(
                        "CONCLUIR CHAMADO",
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade700,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              )
            else if (status == 'ATRIBUIDO')
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final res = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => NewCallDescriptionScreen(
                          chamadoId: id,
                          chamadoN1: n1,
                          chamadoN2: n2,
                        ),
                      ),
                    );
                    if (res == true) _fetchChamadosTecnico();
                  },
                  icon: const Icon(Icons.edit_note),
                  label: const Text("ATUALIZAR CHAMADO"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cs.primary,
                    foregroundColor: cs.onPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
          ],
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
        status,
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
          const Text("Nenhum chamado pendente para sua equipe."),
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
