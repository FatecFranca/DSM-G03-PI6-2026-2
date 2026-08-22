import 'dart:async';
import 'package:CDCP/config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../../models/user_model.dart';
import '../../models/theme_model.dart';

class NewCallScreen extends StatefulWidget {
  const NewCallScreen({super.key});

  @override
  State<NewCallScreen> createState() => _NewCallScreenState();
}

class _NewCallScreenState extends State<NewCallScreen> {
  final TextEditingController _descricaoController = TextEditingController();
  final TextEditingController _diasController = TextEditingController(
    text: '0',
  );

  // Estados dos Riscos e Bloqueios
  bool _riskoVidaHumana = false;
  bool _riskoVidaAnimal = false;
  bool _bloqueioVia = false;
  bool _isSubmitting = false;

  // Estados para Tipo de Suporte
  int? _selectedTipSupId;
  List<dynamic> _tiposSuporte = [];
  bool _isLoadingTipos = true;

  late ThemeModel _themeModel;
  UserProfile? _currentUser;

  @override
  void initState() {
    super.initState();
    _themeModel = Provider.of<ThemeModel>(context, listen: false);
    _currentUser = _themeModel.currentUser;
    _fetchTiposSuporte();
  }

  /// Busca os tipos de suporte baseados na unidade do usuário
  Future<void> _fetchTiposSuporte() async {
    if (_currentUser == null) return;

    try {
      final url = Uri.parse(
        '${AppConfig.baseUrl}/api/tiposuporte/unidade/${_currentUser?.unidadeId}',
      );

      final response = await http
          .get(
            url,
            headers: {
              'Authorization': 'Bearer ${_currentUser?.token}',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        setState(() {
          _tiposSuporte = decoded['data'] ?? [];
          _isLoadingTipos = false;
        });
      } else {
        debugPrint('Erro API Tipos: ${response.statusCode}');
        setState(() => _isLoadingTipos = false);
      }
    } catch (e) {
      debugPrint('Falha ao carregar tipos de suporte: $e');
      setState(() => _isLoadingTipos = false);
    }
  }

  /// Envia o chamado para a API com a nova estrutura
  Future<void> _submitCall() async {
    if (_selectedTipSupId == null) {
      _showCustomSnackBar(
        '⚠️ Selecione a categoria do problema',
        isError: true,
      );
      return;
    }
    if (_descricaoController.text.trim().isEmpty) {
      _showCustomSnackBar(
        '⚠️ Descreva o problema detalhadamente',
        isError: true,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final body = {
      'PessoaId': _currentUser!.id,
      'TipSupId': _selectedTipSupId,
      'ChamadoDescricaoInicial': _descricaoController.text.trim(),
      'ChamadoDiasComProblema': int.tryParse(_diasController.text) ?? 0,
      'ChamadoRiscoVidaHumana': _riskoVidaHumana,
      'ChamadoRiscoVidaAnimal': _riskoVidaAnimal,
      'ChamadoBloqueioVia': _bloqueioVia,
    };

    try {
      final response = await http.post(
        Uri.parse('${AppConfig.baseUrl}/api/chamado'),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer ${_currentUser?.token}',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        _showCustomSnackBar('Chamado registrado com sucesso!');
        if (mounted) Navigator.pop(context);
      } else {
        debugPrint("Erro na criação do chamado: ${response.body}");
        _showCustomSnackBar(
          'Erro na criação do chamado',
          isError: true,
        );
      }
    } catch (e) {
      _showCustomSnackBar('Erro na criação do chamado', isError: true);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showCustomSnackBar(String message, {bool isError = false}) {
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
    final textScale = _themeModel.fontSizeScale;

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: Text(
          'Novo Chamado',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: _isLoadingTipos
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildLabel('O QUE PRECISA DE REPARO?', cs),
                  const SizedBox(height: 12),

                  // Dropdown com o campo TipSupNom
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(15),
                      border: Border.all(color: cs.primary.withOpacity(0.1)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        isExpanded: true,
                        hint: const Text("Selecione uma categoria"),
                        value: _selectedTipSupId,
                        dropdownColor: cs.surface,
                        items: _tiposSuporte.map((tipo) {
                          return DropdownMenuItem<int>(
                            value: tipo['TipSupId'],
                            child: Text(
                              tipo['TipSupNom']?.toString() ?? 'Sem Nome',
                              style: TextStyle(
                                color: cs.onSurface,
                                fontSize: 16 * textScale,
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (value) =>
                            setState(() => _selectedTipSupId = value),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                  _buildLabel('DESCRIÇÃO DO PROBLEMA', cs),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _descricaoController,
                    maxLines: 4,
                    style: TextStyle(fontSize: 16 * textScale),
                    decoration: _inputStyle(
                      cs,
                      'Descreva o que está acontecendo...',
                    ),
                  ),

                  const SizedBox(height: 24),
                  _buildLabel('HÁ QUANTOS DIAS?', cs),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _diasController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(fontSize: 16 * textScale),
                    decoration: _inputStyle(cs, '0'),
                  ),

                  const SizedBox(height: 32),
                  _buildLabel('AVALIAÇÃO DE RISCO', cs),
                  const SizedBox(height: 8),
                  _buildSwitchTile(
                    'Risco à vida humana',
                    _riskoVidaHumana,
                    Icons.person_off_rounded,
                    (v) => setState(() => _riskoVidaHumana = v),
                    cs,
                  ),
                  _buildSwitchTile(
                    'Risco à vida animal',
                    _riskoVidaAnimal,
                    Icons.pets_rounded,
                    (v) => setState(() => _riskoVidaAnimal = v),
                    cs,
                  ),
                  _buildSwitchTile(
                    'Bloqueio total da via',
                    _bloqueioVia,
                    Icons.block_flipped,
                    (v) => setState(() => _bloqueioVia = v),
                    cs,
                  ),

                  const SizedBox(height: 40),
                  _buildSubmitButton(cs, textScale),
                ],
              ),
            ),
    );
  }

  // --- COMPONENTES AUXILIARES ---

  Widget _buildLabel(String text, ColorScheme cs) => Text(
    text,
    style: GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w800,
      color: cs.primary,
      letterSpacing: 1.2,
    ),
  );

  Widget _buildSwitchTile(
    String title,
    bool value,
    IconData icon,
    Function(bool) onChanged,
    ColorScheme cs,
  ) {
    return SwitchListTile(
      secondary: Icon(icon, color: value ? Colors.redAccent : cs.primary),
      title: Text(title, style: GoogleFonts.inter(fontSize: 14)),
      value: value,
      activeColor: Colors.redAccent,
      onChanged: onChanged,
      contentPadding: EdgeInsets.zero,
    );
  }

  InputDecoration _inputStyle(ColorScheme cs, String hint) => InputDecoration(
    hintText: hint,
    filled: true,
    fillColor: cs.surfaceContainerHighest.withOpacity(0.3),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(15),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(15),
      borderSide: BorderSide(color: cs.primary, width: 1.5),
    ),
  );

  Widget _buildSubmitButton(ColorScheme cs, double scale) => SizedBox(
    width: double.infinity,
    height: 58,
    child: ElevatedButton(
      onPressed: _isSubmitting ? null : _submitCall,
      style: ElevatedButton.styleFrom(
        backgroundColor: cs.primary,
        foregroundColor: cs.onPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        elevation: 0,
      ),
      child: _isSubmitting
          ? const CircularProgressIndicator(color: Colors.white)
          : Text(
              'ENVIAR SOLICITAÇÃO',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                fontSize: 15 * scale,
              ),
            ),
    ),
  );
}
