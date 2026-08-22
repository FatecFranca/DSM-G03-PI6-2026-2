import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../models/theme_model.dart';
import '../../config.dart';

class THomeScreen extends StatefulWidget {
  const THomeScreen({super.key});

  @override
  State<THomeScreen> createState() => _THomeScreenState();
}

class _THomeScreenState extends State<THomeScreen> {
  bool isLoading = true;
  Map<String, dynamic>? stats;
  String selectedPeriod = '30d'; // Default: 30 dias

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchStats());
  }

  Future<void> _fetchStats() async {
    if (!mounted) return;
    setState(() => isLoading = true);

    try {
      final themeModel = Provider.of<ThemeModel>(context, listen: false);
      final user = themeModel.currentUser;

      if (user == null || user.token == null) return;

      // Monta a URL com o filtro de período
      final url = Uri.parse(
        '${AppConfig.baseUrl}/api/chamado/estatisticas?periodo=$selectedPeriod',
      );

      final response = await http
          .get(
            url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${user.token}',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          stats = decoded['data'];
        });
      }
    } catch (e) {
      debugPrint('💥 Erro Stats: $e');
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final user = Provider.of<ThemeModel>(context).currentUser;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          "Painel Técnico",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          // Botão de Atualizar
          IconButton(
            onPressed: isLoading ? null : _fetchStats,
            icon: isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.blue,
                    ),
                  )
                : const Icon(Icons.refresh),
            tooltip: 'Atualizar estatísticas',
          ),
          _buildPeriodMenu(),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchStats,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Olá, Técnico ${user?.name.split(' ').first}! 🛠️",
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: cs.onSurface,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      "Estatísticas da unidade no período de $selectedPeriod.",
                      style: TextStyle(color: cs.onSurfaceVariant),
                    ),
                    const SizedBox(height: 25),

                    // Cards de Resumo Rápido
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            "Total",
                            stats?['total']?.toString() ?? "0",
                            const Color.fromARGB(255, 17, 77, 126),
                            Icons.analytics_outlined,
                          ),
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                          child: _buildStatCard(
                            "Atribuídos",
                            stats?['porStatus']?['ATRIBUIDO']?.toString() ??
                                "0",
                            cs.primary,
                            Icons.check_circle_rounded,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            "Em Atendimento",
                            stats?['porStatus']?['EMATENDIMENTO']?.toString() ??
                                "0",
                            Colors.blue,
                            Icons.engineering,
                          ),
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                          child: _buildStatCard(
                            "Concluídos",
                            stats?['porStatus']?['CONCLUIDO']?.toString() ??
                                "0",
                            Colors.green,
                            Icons.check_circle_rounded,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 35),
                    Text(
                      "Distribuição por Status",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: cs.onSurface,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Gráfico de Barras Simples
                    if (stats != null)
                      _buildStatusBarChart(stats!['porStatus']),

                    const SizedBox(height: 100), // Respiro para o NavBar
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildPeriodMenu() {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.filter_list),
      onSelected: (value) {
        setState(() => selectedPeriod = value);
        _fetchStats();
      },
      itemBuilder: (context) => [
        const PopupMenuItem(value: '7d', child: Text("Últimos 7 dias")),
        const PopupMenuItem(value: '30d', child: Text("Últimos 30 dias")),
        const PopupMenuItem(value: '90d', child: Text("Últimos 90 dias")),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    Color color,
    IconData icon,
  ) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        // ignore: deprecated_member_use
        border: Border.all(color: color.withOpacity(0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 12),
          Text(
            value.padLeft(2, '0'),
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBarChart(Map<String, dynamic> data) {
    int maxVal = 1;
    data.forEach((k, v) {
      if (v > maxVal) maxVal = v;
    });

    return Column(
      children: data.entries.map((e) {
        double percentage = (e.value / maxVal);
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    e.key,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    e.value.toString(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: percentage,
                backgroundColor: Theme.of(
                  context,
                ).colorScheme.surfaceContainerHighest,
                color: _getStatusColor(e.key),
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PROCESSAMENTO':
        return const Color.fromARGB(255, 0, 14, 88);
      case 'PENDENTE':
        return Colors.orange;
      case 'CONCLUIDO':
        return Colors.green;
      case 'EMATENDIMENTO':
        return Colors.blue;
      case 'CANCELADO':
        return Colors.red;
      case 'RECUSADO':
        return const Color.fromARGB(255, 247, 48, 34);
      case 'FALTAINFORMACAO':
        return const Color.fromARGB(255, 255, 10, 10);
      case 'ANALISADO':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}
