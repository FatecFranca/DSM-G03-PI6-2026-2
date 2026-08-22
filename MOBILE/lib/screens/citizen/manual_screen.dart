import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ManualScreen extends StatelessWidget {
  const ManualScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Central de Ajuda', 
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: cs.onSurface)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- HEADER ---
            _buildHeader(cs),
            const SizedBox(height: 30),

            // --- SEÇÃO: GUIA PASSO A PASSO ---
            _sectionTitle(cs, "Guia do Usuário"),
            _buildManualItem(
              context,
              title: "Como abrir um chamado?",
              content: "1. Na menu que fica na parte inferior do app, clique no botão ' + '.\n\n"
                       "2. Descreva o problema público que você percebeu com detalhes.\n\n"
                       "3. Clique em 'Enviar'. O atendimento sera criado e encaminhado para análise.\n\n",
              icon: Icons.add_task_rounded,
              color: Colors.blue,
            ),
            _buildManualItem(
              context,
              title: "Entendendo os Status",
              content: "• PROCESSAMENTO: Seu chamado está na fila para processamento e registro no sistema.\n\n"
                       "• PENDENTE: Seu chamado foi processado pelo sistema, registrando as informações básicas. Estando pendente paraavalisação de um responsável.\n\n"
                       "• ANALISADO: Seu chamado foi analisado por um responsável.\n\n"
                       "• ATRIBUIDO: Seu chamado foi atribuído a uma equipe que irá atender a necessidade.\n\n"
                       "• EM ATENDIMENTO: A equipe responsável já iniciaou o atendimento ao seu chamado e está trabalhando na solução.\n\n"
                       "• CONCLUIDO: O serviço foi concluído. Verifique se a necessidade foi atendida.\n\n"
                       "• CANCELADO: Você fez o cancelamento do chamado.\n\n"
                       "• RECUSADO: Um responsável recusou o seu chamado, verifique o motivo nos detalhes dele, caso necessário entre em contato, ou abra outro chamado.\n\n",
              icon: Icons.assignment_turned_in_rounded,
              color: Colors.orange,
            ),
            _buildManualItem(
              context,
              title: "Acompanhando o Histórico",
              content: "No menu 'Chamados' (segundo item da barra inferior), você pode ver todos os seus chamados, "
                       "número do protocolo, status atual e descrição do atendimento. Lá também é possível cancelar chamados que ainda não foram atendidos.",
              icon: Icons.manage_search_rounded,
              color: Colors.green,
            ),

            const SizedBox(height: 30),

            // --- SEÇÃO: FAQ ---
            _sectionTitle(cs, "Perguntas Frequentes"),
            _buildFaqItem(cs, "Meu chamado está demorando, o que fazer?", 
              "Os chamados são atendidos por ordem de prioridade técnica. Caso seja urgente, entre em contato com a prefeitura de sua cidade."),
            _buildFaqItem(cs, "Posso cancelar um chamado?", 
              "Sim, abrindo os detalhes do chamado no histórico, você encontrará a opção de cancelamento caso o técnico ainda não tenha iniciado o atendimento."),
            
            const SizedBox(height: 40),

            // --- FOOTER SUPORTE ---
            _buildFooter(cs, isDark),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(ColorScheme cs, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15, left: 5),
      child: Text(title, 
        style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: cs.primary)),
    );
  }

  Widget _buildHeader(ColorScheme cs) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [cs.primary, cs.primary.withOpacity(0.7)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          const Icon(Icons.auto_stories_rounded, color: Colors.white, size: 40),
          const SizedBox(height: 10),
          Text("Como podemos ajudar?", 
            style: GoogleFonts.inter(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          Text("Tudo o que você precisa saber sobre o App", 
            style: GoogleFonts.inter(color: Colors.white70, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildManualItem(BuildContext context, {required String title, required String content, required IconData icon, required Color color}) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: cs.outlineVariant.withOpacity(0.3)),
      ),
      child: ExpansionTile(
        leading: Icon(icon, color: color),
        title: Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15)),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Text(content, style: GoogleFonts.inter(color: cs.onSurfaceVariant, height: 1.4)),
          )
        ],
      ),
    );
  }

  Widget _buildFaqItem(ColorScheme cs, String question, String answer) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(question, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 5),
          Text(answer, style: GoogleFonts.inter(color: cs.onSurfaceVariant, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildFooter(ColorScheme cs, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(15),
      ),
      child: Row(
        children: [
          Icon(Icons.headset_mic_rounded, color: cs.primary),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Ainda precisa de ajuda?", style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                Text("Fale com o suporte técnico.", style: GoogleFonts.inter(fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}