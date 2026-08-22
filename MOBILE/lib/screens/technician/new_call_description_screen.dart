  import 'dart:convert';
  import 'package:flutter/material.dart';
  import 'package:google_fonts/google_fonts.dart';
  import 'package:http/http.dart' as http;
  import 'package:provider/provider.dart';
  import '../../config.dart';
  import '../../models/theme_model.dart';

  class NewCallDescriptionScreen extends StatefulWidget {
    final String chamadoId;
    final int chamadoN1;
    final int chamadoN2;

    const NewCallDescriptionScreen({super.key, required this.chamadoId, required this.chamadoN1, required this.chamadoN2});

    @override
    State<NewCallDescriptionScreen> createState() => _NewCallDescriptionScreenState();
  }

  class _NewCallDescriptionScreenState extends State<NewCallDescriptionScreen> {
    final TextEditingController _controller = TextEditingController();
    bool _isSending = false;

  Future<void> _submitAtividade() async {
  debugPrint('🔘 Botão Salvar clicado!'); // Se esse print não aparecer, o erro é no botão!
  
  final desc = _controller.text.trim();
  if (desc.isEmpty) {
    _showError('Descreva a atividade primeiro.');
    return;
  }

  setState(() => _isSending = true);

  try {
    final user = Provider.of<ThemeModel>(context, listen: false).currentUser;
    
    // Removendo possíveis barras duplicadas na URL
    String baseUrl = AppConfig.baseUrl;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }

    // A URL que você confirmou na documentação (/api/atividadechamado/chamado/{id})
    final url = Uri.parse('$baseUrl/api/atividadechamado/chamado/${widget.chamadoId}');

    debugPrint('🚀 Enviando para: $url');
    debugPrint('📝 Descrição: $desc');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${user?.token}',
      },
      body: jsonEncode({"AtividadeDescricao": desc}),
    ).timeout(const Duration(seconds: 10));

    debugPrint('📡 Resposta da API (${response.statusCode}): ${response.body}');

    if (response.statusCode == 201 || response.statusCode == 200) {
      if (mounted) {
        Navigator.pop(context, true);
      }
    } else {
      _showError('Erro ${response.statusCode} ao salvar atividade.');
    }
  } catch (e) {
    debugPrint('💥 Erro técnico: $e');
    _showError('Não foi possível conectar ao servidor.');
  } finally {
    if (mounted) setState(() => _isSending = false);
  }
}
    void _showError(String m) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(m), backgroundColor: Colors.redAccent, behavior: SnackBarBehavior.floating),
      );
    }

    @override
    Widget build(BuildContext context) {
      final cs = Theme.of(context).colorScheme;
      return Scaffold(
        appBar: AppBar(
          title: Text('Relatar Atividade #${widget.chamadoN1}-${widget.chamadoN2}', 
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        body: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              TextField(
                controller: _controller,
                maxLines: 6,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'Ex: Realizada verificação do problema relatado...',
                  alignLabelWithHint: true,
                  labelText: 'Descrição da Atividade',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                  filled: true,
                  fillColor: cs.surfaceVariant.withOpacity(0.3),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 55,
                child: ElevatedButton.icon(
                  onPressed: _isSending ? null : _submitAtividade,
                  icon: _isSending 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_rounded),
                  label: Text(_isSending ? 'SALVANDO...' : 'SALVAR ATIVIDADE', 
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.1)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: cs.primary,
                    foregroundColor: cs.onPrimary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                    elevation: 2,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }