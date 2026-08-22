import 'package:CDCP/screens/citizen/new_call_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../models/theme_model.dart';
import '../../config.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int pendentes = 0;
  int analisados = 0;
  int finalizados = 0;
  int emAtendimento = 0;
  int faltaInformacao = 0;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchDashboardData());
  }

  String _getSaudacao() {
    final hora = DateTime.now().hour;
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 18) return "Boa tarde";
    return "Boa noite";
  }

  Future<void> _fetchDashboardData() async {
    if (!mounted) return;
    setState(() => isLoading = true);

    try {
      final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
      if (user == null || user.token == null) {
        setState(() => isLoading = false);
        return;
      }

      final url = Uri.parse('${AppConfig.baseUrl}/api/chamado');

      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${user.token}',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> decodedData = jsonDecode(response.body);
        final List<dynamic> listaChamados = decodedData['data'] ?? [];

        int countP  = 0;
        int countAN = 0;
        int countF  = 0;
        int countA  = 0;
        int countFI = 0;

        for (var item in listaChamados) {
          String status = (item['ChamadoStatus'] ?? '').toString().toUpperCase().trim();
          final String donoId = item['PessoaId'] ?? '';

          if (donoId == user.id) {
            if (status == 'PENDENTE' || status == 'PROCESSAMENTO') {
              countP++;
            } else if (status == 'CONCLUIDO') {
              countF++;
            } else if (status == 'EMATENDIMENTO' || status == 'ATRIBUIDO') {
              countA++;
            } else if (status == 'ANALISADO') {
              countAN++;
            } else if (status == 'FALTAINFORMACAO') {
              countFI++;
            }
          }
        }

        if (mounted) {
          setState(() {
            pendentes = countP;
            analisados = countAN;
            finalizados = countF;
            emAtendimento = countA;
            faltaInformacao = countFI;
          });
        }
      }
    } catch (e) {
      debugPrint('💥 Erro ao processar: $e');
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Captura as cores do tema atual (Claro ou Escuro)
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    final user = Provider.of<ThemeModel>(context).currentUser;
    final String nomeUsuario = user?.name.split(' ').first ?? "Usuário";

    return Scaffold(
      // Usa a cor de fundo definida no tema
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          "Dashboard",
          style: TextStyle(
            color: colorScheme.onSurface, // Adapta cor do texto da AppBar
            fontWeight: FontWeight.bold
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchDashboardData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "${_getSaudacao()}, $nomeUsuario! 👋",
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface, // Adapta para branco no dark
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      "Aqui está o resumo dos seus chamados.",
                      style: TextStyle(fontSize: 14, color: colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 25),

                    Text(
                      "Resumo de Atividades",
                      style: TextStyle(
                        fontSize: 16, 
                        color: colorScheme.onSurfaceVariant, 
                        fontWeight: FontWeight.w500
                      ),
                    ),
                    const SizedBox(height: 15),

                    Row(
                      children: [
                        Expanded(
                          child: _buildSquareCard(
                            context,
                            "Pendentes",
                            pendentes,
                            Colors.orange,
                            Icons.timer_outlined,
                          ),
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                          child: _buildSquareCard(
                            context,
                            "Analisados",
                            analisados,
                            Colors.blue,
                            Icons.analytics,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    Row(
                      children: [
                        Expanded(
                          child: _buildSquareCard(
                            context,
                            "Fila para Atendimento",
                            emAtendimento,
                            Colors.indigoAccent,
                            Icons.edit_note,
                          ),
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                          child: _buildSquareCard(
                            context,
                            "Falta Informação",
                            faltaInformacao,
                            const Color.fromARGB(255, 226, 44, 44),
                            Icons.question_mark,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    Row(
                      children: [
                        const SizedBox(width: 15),
                        Expanded(
                          child: _buildSquareCard(
                            context,
                            "Concluídos",
                            finalizados,
                            Colors.green,
                            Icons.check_circle_outline,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 35),
                    Text(
                      "Ações Rápidas",
                      style: TextStyle(
                        fontSize: 18, 
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 15),
                    
                    _buildActionButton(
                      context,
                      "Abrir Novo Chamado", 
                      Icons.add_circle_outline,
                      () => Navigator.push(context, MaterialPageRoute(builder: (context) => const NewCallScreen()))
                    ),

                    const SizedBox(height: 90),
                  ],
                ),
              ),
            ),
    );
  }

  // --- WIDGETS ADAPTÁVEIS ---

  Widget _buildSquareCard(BuildContext context, String title, int value, Color color, IconData icon) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor, // Usa a cor de card do tema (cinza escuro no Dark)
        borderRadius: BorderRadius.circular(25),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(theme.brightness == Brightness.dark ? 0.3 : 0.02), 
            blurRadius: 10
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 15),
          Text(
            value.toString().padLeft(2, '0'),
            style: TextStyle(
              fontSize: 32, 
              fontWeight: FontWeight.bold, 
              color: color.withOpacity(0.9)
            ),
          ),
          Text(
            title, 
            style: TextStyle(
              fontWeight: FontWeight.w500, 
              color: theme.colorScheme.onSurfaceVariant
            )
          ),
        ],
      ),
    );
  }

  Widget _buildWideCard(BuildContext context, String title, int value, Color color, IconData icon) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(25),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(theme.brightness == Brightness.dark ? 0.3 : 0.02), 
            blurRadius: 10
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 10),
          Text(
            value.toString().padLeft(2, '0'),
            style: TextStyle(
              fontSize: 32, 
              fontWeight: FontWeight.bold, 
              color: color.withOpacity(0.9)
            ),
          ),
          Text(
            title, 
            style: TextStyle(
              fontWeight: FontWeight.w500, 
              color: theme.colorScheme.onSurfaceVariant
            )
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(BuildContext context, String label, IconData icon, VoidCallback onTap) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        decoration: BoxDecoration(
          // No Dark mode, o fundo do botão fica levemente mais claro que o fundo da tela
          color: theme.colorScheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Row(
          children: [
            Icon(icon, color: theme.colorScheme.primary),
            const SizedBox(width: 15),
            Expanded(
              child: Text(
                label, 
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurface
                )
              )
            ),
            Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}