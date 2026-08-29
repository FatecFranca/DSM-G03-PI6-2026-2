import 'dart:async';
import 'dart:convert';

import 'package:CDCP/config.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';

import '../../models/theme_model.dart';
import '../../models/user_model.dart';

class CreateSolicitacaoScreen extends StatefulWidget {
  const CreateSolicitacaoScreen({super.key});

  @override
  State<CreateSolicitacaoScreen> createState() =>
      _CreateSolicitacaoScreenState();
}

// Formatador de CPF
class CpfFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (text.length > 11) {
      return oldValue;
    }

    String formatted = text;
    if (text.length > 3) {
      formatted = '${text.substring(0, 3)}.${text.substring(3)}';
    }
    if (text.length > 6) {
      formatted = '${formatted.substring(0, 7)}.${text.substring(6)}';
    }
    if (text.length > 9) {
      formatted = '${formatted.substring(0, 11)}-${text.substring(9)}';
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

// Formatador de Telefone
class PhoneFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(RegExp(r'\D'), '');

    if (text.isEmpty) {
      return newValue.copyWith(text: '');
    }

    String formatted = '';
    if (text.length <= 2) {
      formatted = '($text';
    } else if (text.length <= 6) {
      formatted = '(${text.substring(0, 2)}) ${text.substring(2)}';
    } else if (text.length <= 10) {
      formatted =
          '(${text.substring(0, 2)}) ${text.substring(2, 6)}-${text.substring(6)}';
    } else {
      formatted =
          '(${text.substring(0, 2)}) ${text.substring(2, 7)}-${text.substring(7, 11)}';
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class _CreateSolicitacaoScreenState extends State<CreateSolicitacaoScreen> {
  final TextEditingController _nomeController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _telefoneController = TextEditingController();
  final TextEditingController _cpfController = TextEditingController();
  final TextEditingController _descricaoController = TextEditingController();

  String? _selectedTipo;
  int? _selectedUnidadeId;
  String? _selectedUnidadeNome;
  bool _isLoading = false;
  bool _isUserLoggedIn = false;
  UserProfile? _currentUser;

  List<Unidade> _unidades = [];
  bool _isLoadingUnidades = false;

  final List<String> _tiposSolicitacao = ['CADASTROPESSOAUNIDADE', 'DIVERSAS'];

  final Map<String, String> _tipoDisplayNames = {
    'CADASTROPESSOAUNIDADE': 'Cadastro em Unidade',
    'DIVERSAS': 'Solicitação Diversa',
  };

  @override
  void initState() {
    super.initState();
    _checkUser();
    _carregarUnidades();
  }

  @override
  void dispose() {
    _nomeController.dispose();
    _emailController.dispose();
    _telefoneController.dispose();
    _cpfController.dispose();
    _descricaoController.dispose();
    super.dispose();
  }

  void _checkUser() {
    final themeModel = Provider.of<ThemeModel>(context, listen: false);
    final user = themeModel.currentUser;
    setState(() {
      _isUserLoggedIn = user != null;
      _currentUser = user;
    });
  }

  Future<void> _carregarUnidades() async {
    setState(() => _isLoadingUnidades = true);
    try {
      final headers = {'Content-Type': 'application/json'};

      if (_isUserLoggedIn && _currentUser?.token != null) {
        headers['Authorization'] = 'Bearer ${_currentUser!.token}';
      }

      final response = await http
          .get(Uri.parse('${AppConfig.baseUrl}/api/unidade'), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        List<dynamic> unidadesJson;
        if (data is List) {
          unidadesJson = data;
        } else {
          unidadesJson = data['data'] ?? [];
        }

        setState(() {
          _unidades = unidadesJson
              .map((json) => Unidade.fromJson(json))
              .toList();
        });
      }
    } catch (e) {
      print('Erro ao carregar unidades: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao carregar unidades: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingUnidades = false);
    }
  }

  Future<void> _enviarSolicitacao() async {
    // Validações
    if (_selectedTipo == null) {
      _showError('Selecione o tipo de solicitação');
      return;
    }

    if (_selectedUnidadeId == null) {
      _showError('Selecione a unidade destino');
      return;
    }

    // Validar CPF se for cadastro em unidade
    if (_selectedTipo == 'CADASTROPESSOAUNIDADE') {
      final cpfLimpo = _cpfController.text.replaceAll(RegExp(r'\D'), '');
      if (cpfLimpo.length != 11) {
        _showError('CPF inválido. Digite um CPF válido com 11 dígitos.');
        return;
      }
    }

    if (_descricaoController.text.trim().isEmpty) {
      _showError('Descreva a solicitação');
      return;
    }

    // Se não estiver logado, validar dados do solicitante
    if (!_isUserLoggedIn) {
      if (_nomeController.text.trim().isEmpty) {
        _showError('Informe seu nome');
        return;
      }
      if (_emailController.text.trim().isEmpty) {
        _showError('Informe seu e-mail');
        return;
      }
      if (_telefoneController.text.trim().isEmpty) {
        _showError('Informe seu telefone');
        return;
      }
    }

    setState(() => _isLoading = true);

    try {
      // Montar a descrição com CPF se for cadastro em unidade
      String descricaoFinal = _descricaoController.text.trim();
      if (_selectedTipo == 'CADASTROPESSOAUNIDADE') {
        final cpfLimpo = _cpfController.text.replaceAll(RegExp(r'\D'), '');
        descricaoFinal =
            'CPF: $cpfLimpo - ${_descricaoController.text.trim()}';
      }

      final Map<String, dynamic> body = {
        'UnidadeId': _selectedUnidadeId,
        'SolicitacaoTipo': _selectedTipo,
        'SolicitacaoDescricao': descricaoFinal,
      };

      if (!_isUserLoggedIn) {
        body['SolicitacaoSolicitanteNome'] = _nomeController.text.trim();
        body['SolicitacaoSolicitanteEmail'] = _emailController.text.trim();
        body['SolicitacaoSolicitanteTelefone'] = _telefoneController.text.replaceAll(RegExp(r'\D'), '');
      }

      final url = Uri.parse('${AppConfig.baseUrl}/api/solicitacao');
      final headers = {'Content-Type': 'application/json'};

      if (_isUserLoggedIn && _currentUser?.token != null) {
        headers['Authorization'] = 'Bearer ${_currentUser!.token}';
      }

      final response = await http
          .post(url, headers: headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Solicitação enviada com sucesso!'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
          Navigator.pop(context, true);
        }
      } else {
        final errorData = jsonDecode(response.body);
        final errorMsg = errorData['error'] ?? 'Erro ao enviar solicitação';
        _showError(errorMsg);
      }
    } catch (e) {
      print('Erro ao enviar solicitação: $e');
      _showError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeModel = Provider.of<ThemeModel>(context);
    final fontSize = themeModel.fontSizeScale;
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    // Verificar se deve mostrar o campo CPF
    final bool mostrarCpf = _selectedTipo == 'CADASTROPESSOAUNIDADE';

    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        title: Text(
          'Nova Solicitação',
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w700,
            fontSize: 20 * fontSize,
          ),
        ),
        backgroundColor: cs.surface,
        elevation: 0,
        foregroundColor: cs.onSurface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (_isUserLoggedIn && _currentUser != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: cs.primary.withOpacity(0.1),
                child: Text(
                  _currentUser!.name.isNotEmpty
                      ? _currentUser!.name[0].toUpperCase()
                      : '?',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.bold,
                    color: cs.primary,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        cs.primary.withOpacity(0.1),
                        cs.primary.withOpacity(0.05),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.assignment_rounded,
                            color: cs.primary,
                            size: 28,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Abrir Solicitação',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 18 * fontSize,
                              fontWeight: FontWeight.w700,
                              color: cs.onSurface,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _isUserLoggedIn
                            ? 'Preencha os dados abaixo para abrir sua solicitação.'
                            : 'Preencha seus dados e descreva sua solicitação. Um responsável entrará em contato.',
                        style: GoogleFonts.inter(
                          fontSize: 14 * fontSize,
                          color: cs.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Tipo de Solicitação
                _buildDropdownField(
                  label: 'Tipo de Solicitação *',
                  value: _selectedTipo,
                  hint: 'Selecione o tipo',
                  items: _tiposSolicitacao,
                  onChanged: (value) => setState(() => _selectedTipo = value),
                  fontSize: fontSize,
                  cs: cs,
                ),

                const SizedBox(height: 16),

                // Unidade Destino
                _buildUnidadeDropdown(fontSize: fontSize, cs: cs),

                const SizedBox(height: 16),

                // Campo CPF (somente para cadastro em unidade)
                if (mostrarCpf) ...[
                  _buildTextField(
                    controller: _cpfController,
                    label: 'CPF *',
                    hint: '000.000.000-00',
                    icon: Icons.badge_rounded,
                    fontSize: fontSize,
                    cs: cs,
                    keyboard: TextInputType.number,
                    formatters: [CpfFormatter()],
                  ),
                  const SizedBox(height: 16),
                ],

                // Campos do Solicitante (apenas se não estiver logado)
                if (!_isUserLoggedIn) ...[
                  _buildTextField(
                    controller: _nomeController,
                    label: 'Nome Completo *',
                    hint: 'Digite seu nome completo',
                    icon: Icons.person_rounded,
                    fontSize: fontSize,
                    cs: cs,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _emailController,
                    label: 'E-mail *',
                    hint: 'seu@email.com',
                    icon: Icons.email_rounded,
                    fontSize: fontSize,
                    cs: cs,
                    keyboard: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _telefoneController,
                    label: 'Telefone *',
                    hint: '(00) 00000-0000',
                    icon: Icons.phone_rounded,
                    fontSize: fontSize,
                    cs: cs,
                    keyboard: TextInputType.phone,
                    formatters: [PhoneFormatter()],
                  ),
                  const SizedBox(height: 16),
                ],

                // Descrição
                _buildTextArea(
                  controller: _descricaoController,
                  label: mostrarCpf ? 'Descrição da Solicitação *' : 'Descrição da Solicitação *',
                  hint: mostrarCpf 
                      ? 'Descreva o motivo do cadastro...' 
                      : 'Descreva detalhadamente sua solicitação...',
                  fontSize: fontSize,
                  cs: cs,
                ),

                const SizedBox(height: 32),

                // Botão Enviar
                _buildSubmitButton(fontSize, cs),
              ],
            ),
          ),

          // Loading Overlay
          if (_isLoading) _buildLoadingOverlay(fontSize, cs),
        ],
      ),
    );
  }

  Widget _buildUnidadeDropdown({
    required double fontSize,
    required ColorScheme cs,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'Unidade Destino *',
            style: GoogleFonts.inter(
              fontSize: 13 * fontSize,
              fontWeight: FontWeight.w600,
              color: cs.primary,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: cs.outlineVariant.withOpacity(0.5),
              width: 1,
            ),
          ),
          child: _isLoadingUnidades
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              : DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    isExpanded: true,
                    value: _unidades.any((u) => u.id == _selectedUnidadeId)
                        ? _selectedUnidadeId
                        : null,
                    hint: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _isUserLoggedIn && _unidades.isEmpty
                              ? 'Nenhuma unidade disponível'
                              : 'Selecione a unidade',
                          style: GoogleFonts.inter(
                            fontSize: 16 * fontSize,
                            color: cs.onSurface.withOpacity(0.5),
                          ),
                        ),
                      ),
                    ),
                    items: _unidades.map((unidade) {
                      return DropdownMenuItem<int>(
                        value: unidade.id,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              unidade.nome,
                              style: GoogleFonts.inter(
                                fontSize: 16 * fontSize,
                                fontWeight: FontWeight.w500,
                                color: cs.onSurface,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: _isLoadingUnidades || _unidades.isEmpty
                        ? null
                        : (value) {
                            setState(() {
                              _selectedUnidadeId = value;
                              _selectedUnidadeNome = _unidades
                                  .firstWhere((u) => u.id == value)
                                  .nome;
                            });
                          },
                    selectedItemBuilder: (context) {
                      return _unidades.map((unidade) {
                        return Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              unidade.nome,
                              style: GoogleFonts.inter(
                                fontSize: 16 * fontSize,
                                fontWeight: FontWeight.w500,
                                color: cs.onSurface,
                              ),
                            ),
                          ),
                        );
                      }).toList();
                    },
                    icon: Icon(
                      Icons.arrow_drop_down_rounded,
                      color: cs.primary.withOpacity(0.6),
                      size: 28,
                    ),
                    iconSize: 28,
                    iconEnabledColor: cs.primary.withOpacity(0.6),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String? value,
    required String hint,
    required List<String> items,
    required void Function(String?) onChanged,
    required double fontSize,
    required ColorScheme cs,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13 * fontSize,
              fontWeight: FontWeight.w600,
              color: cs.primary,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: cs.outlineVariant.withOpacity(0.5),
              width: 1,
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: items.contains(value) ? value : null,
              hint: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    hint,
                    style: GoogleFonts.inter(
                      fontSize: 16 * fontSize,
                      color: cs.onSurface.withOpacity(0.5),
                    ),
                  ),
                ),
              ),
              items: items.map((item) {
                final displayName = _tipoDisplayNames[item] ?? item;
                return DropdownMenuItem<String>(
                  value: item,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        displayName,
                        style: GoogleFonts.inter(
                          fontSize: 16 * fontSize,
                          fontWeight: FontWeight.w500,
                          color: cs.onSurface,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
              onChanged: onChanged,
              selectedItemBuilder: (context) {
                return items.map((item) {
                  final displayName = _tipoDisplayNames[item] ?? item;
                  return Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        displayName,
                        style: GoogleFonts.inter(
                          fontSize: 16 * fontSize,
                          fontWeight: FontWeight.w500,
                          color: cs.onSurface,
                        ),
                      ),
                    ),
                  );
                }).toList();
              },
              icon: Icon(
                Icons.arrow_drop_down_rounded,
                color: cs.primary.withOpacity(0.6),
                size: 28,
              ),
              iconSize: 28,
              iconEnabledColor: cs.primary.withOpacity(0.6),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required double fontSize,
    required ColorScheme cs,
    TextInputType keyboard = TextInputType.text,
    bool isObscure = false,
    Widget? suffix,
    List<TextInputFormatter>? formatters,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13 * fontSize,
              fontWeight: FontWeight.w600,
              color: cs.primary,
            ),
          ),
        ),
        TextField(
          controller: controller,
          obscureText: isObscure,
          inputFormatters: formatters,
          keyboardType: keyboard,
          style: GoogleFonts.inter(
            fontSize: 16 * fontSize,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(
              icon,
              size: 20,
              color: cs.primary.withOpacity(0.6),
            ),
            suffixIcon: suffix,
            filled: true,
            fillColor: cs.surface,
            contentPadding: const EdgeInsets.symmetric(
              vertical: 18,
              horizontal: 20,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: cs.outlineVariant.withOpacity(0.5)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTextArea({
    required TextEditingController controller,
    required String label,
    required String hint,
    required double fontSize,
    required ColorScheme cs,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13 * fontSize,
              fontWeight: FontWeight.w600,
              color: cs.primary,
            ),
          ),
        ),
        TextField(
          controller: controller,
          maxLines: 5,
          style: GoogleFonts.inter(
            fontSize: 16 * fontSize,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(color: cs.onSurface.withOpacity(0.4)),
            filled: true,
            fillColor: cs.surface,
            contentPadding: const EdgeInsets.symmetric(
              vertical: 16,
              horizontal: 20,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: cs.outlineVariant.withOpacity(0.5)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: cs.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSubmitButton(double fontSize, ColorScheme cs) {
    return Container(
      height: 60,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(
          colors: [cs.primary, cs.primary.withBlue(200)],
        ),
        boxShadow: [
          BoxShadow(
            color: cs.primary.withOpacity(0.4),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _enviarSolicitacao,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        child: Text(
          _isUserLoggedIn ? 'ENVIAR SOLICITAÇÃO' : 'ENVIAR SOLICITAÇÃO',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 16 * fontSize,
            fontWeight: FontWeight.w800,
            color: cs.onPrimary,
            letterSpacing: 1.2,
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay(double fontSize, ColorScheme cs) {
    return Container(
      color: Colors.black.withOpacity(0.3),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(strokeWidth: 4),
            const SizedBox(height: 24),
            Text(
              'Enviando solicitação...',
              style: GoogleFonts.inter(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18 * fontSize,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Modelo de Unidade
class Unidade {
  final int id;
  final String nome;
  final String status;

  Unidade({required this.id, required this.nome, required this.status});

  factory Unidade.fromJson(Map<String, dynamic> json) {
    return Unidade(
      id: json['UnidadeId'] ?? json['id'] ?? 0,
      nome: json['UnidadeNome'] ?? json['nome'] ?? '',
      status: json['UnidadeStatus'] ?? json['status'] ?? '',
    );
  }
}
