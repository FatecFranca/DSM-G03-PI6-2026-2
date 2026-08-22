import 'dart:async';
import 'dart:convert';
import 'dart:ui'; // Adicionado para efeitos de blur

import 'package:CDCP/config.dart';
import 'package:CDCP/screens/shared/components/bottom_nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';
import '../../models/theme_model.dart';
import '../../models/user_model.dart';

// [Manter UpperCaseTextFormatter e CpfFormatter idênticos ao original]
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return TextEditingValue(text: newValue.text.toUpperCase(), selection: newValue.selection);
  }
}

class CpfFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (text.length <= 11) {
      String formatted = text;
      if (text.length > 3) formatted = '${text.substring(0, 3)}.${text.substring(3)}';
      if (text.length > 6) formatted = '${formatted.substring(0, 7)}.${text.substring(6)}';
      if (text.length > 9) formatted = '${formatted.substring(0, 11)}-${text.substring(9)}';
      return TextEditingValue(text: formatted, selection: TextSelection.collapsed(offset: formatted.length));
    }
    return oldValue;
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  final TextEditingController _cpfController = TextEditingController();
  final TextEditingController _usuarioController = TextEditingController();
  final TextEditingController _senhaController = TextEditingController();

  bool _isCidadao = true;
  bool _isLoading = false;
  bool _isObscure = true;
  late AnimationController _toggleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _toggleController = AnimationController(duration: const Duration(milliseconds: 300), vsync: this);
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _toggleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _cpfController.dispose();
    _usuarioController.dispose();
    _senhaController.dispose();
    _toggleController.dispose();
    super.dispose();
  }

  // [Função _login mantida exatamente igual]
  Future<void> _login() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);
    try {
      final Map<String, dynamic> body;
      final Uri url;
      if (_isCidadao) {
        final cpf = _cpfController.text.replaceAll(RegExp(r'\D'), '');
        final senha = _senhaController.text.trim();
        if (cpf.isEmpty || senha.isEmpty) throw Exception('CPF e senha são obrigatórios!');
        body = {'PessoaUsuario': cpf, 'PessoaSenha': senha};
        url = Uri.parse('${AppConfig.baseUrl}/api/pessoa/login');
      } else {
        final usuario = _usuarioController.text.trim().toUpperCase();
        final senha = _senhaController.text.trim();
        if (usuario.isEmpty || senha.isEmpty) throw Exception('Usuário e senha são obrigatórios!');
        body = {'TecnicoUsuario': usuario, 'TecnicoSenha': senha};
        url = Uri.parse('${AppConfig.baseUrl}/api/tecnico/login');
      }
      final response = await http.post(url, headers: {'Content-Type': 'application/json'}, body: jsonEncode(body)).timeout(const Duration(seconds: 15));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        var user = UserProfile.fromJson(data);
        user = UserProfile(id: user.id, name: user.name, email: user.email, phone: user.phone, cpfOrId: user.cpfOrId, role: _isCidadao ? 'citizen' : 'technician', unitName: user.unitName, unidadeId: user.unidadeId, token: user.token);
        if (mounted) {
          final themeModel = Provider.of<ThemeModel>(context, listen: false);
          themeModel.setCurrentUser(user);
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const BottomNavBarScreen()));
        }
      } else {
        final errorMsg = jsonDecode(response.body)['error'] ?? 'Erro ao realizar Login';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg), backgroundColor: const Color.fromARGB(255, 211, 55, 55), behavior: SnackBarBehavior.floating));
        //throw Exception(errorMsg);
      }
    } catch (e) {
      print(e);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro ao realizar login'), backgroundColor: const Color.fromARGB(255, 211, 55, 55), behavior: SnackBarBehavior.floating));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _toggleMode() {
    _toggleController.forward(from: 0.0);
    Future.delayed(const Duration(milliseconds: 150), () {
      setState(() {
        _isCidadao = !_isCidadao;
        _cpfController.clear();
        _usuarioController.clear();
        _senhaController.clear();
      });
      _toggleController.reverse();
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeModel = Provider.of<ThemeModel>(context);
    final fontSize = themeModel.fontSizeScale;
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [cs.primary.withOpacity(0.05), cs.surface],
          ),
        ),
        child: Stack(
          children: [
            // Círculos Decorativos de Fundo (Estética Glassmorphism)
            Positioned(
              top: -100,
              right: -50,
              child: CircleAvatar(radius: 120, backgroundColor: cs.primary.withOpacity(0.03)),
            ),
            
            SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 60.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 40),
                  // Logo ou Ícone Decorativo
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cs.primary.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.lock_person_rounded, size: 48, color: cs.primary),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Título com animação de troca
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 400),
                    child: Text(
                      _isCidadao ? 'Seja bem-vindo, Cidadão' : 'Seja bem-vindo, Técnico(a)',
                      key: ValueKey<bool>(_isCidadao),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 32 * fontSize,
                        fontWeight: FontWeight.w800,
                        color: cs.onSurface,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  Text(
                    'Entre com suas credenciais abaixo',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14 * fontSize,
                      color: cs.onSurface.withOpacity(0.5),
                    ),
                  ),
                  
                  const SizedBox(height: 48),

                  // Campos de Input Refinados
                  _buildAnimatedInputSection(fontSize, cs),
                  
                  const SizedBox(height: 20),

                  _buildTextField(
                    controller: _senhaController,
                    label: 'Senha',
                    hint: 'Sua senha segura',
                    icon: Icons.key_rounded,
                    isObscure: _isObscure,
                    fontSize: fontSize,
                    cs: cs,
                    suffix: IconButton(
                      icon: Icon(_isObscure ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20),
                      onPressed: () => setState(() => _isObscure = !_isObscure),
                      color: cs.primary.withOpacity(0.7),
                    ),
                  ),
                  
                  const SizedBox(height: 40),

                  // Toggle Switch Moderno
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildModernToggle('Pessoa', _isCidadao, cs),
                          _buildModernToggle('Técnico', !_isCidadao, cs),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Botão de Login Premium
                  _buildSubmitButton(fontSize, cs),
                ],
              ),
            ),

            // Loading Overlay Refinado
            if (_isLoading) _buildLoadingOverlay(fontSize, cs),
          ],
        ),
      ),
    );
  }

  Widget _buildAnimatedInputSection(double fontSize, ColorScheme cs) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: SlideTransition(position: Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(anim), child: child)),
      child: _isCidadao
          ? _buildTextField(
              key: const ValueKey('cpf'),
              controller: _cpfController,
              label: 'CPF',
              hint: '000.000.000-00',
              icon: Icons.badge_rounded,
              fontSize: fontSize,
              cs: cs,
              formatters: [CpfFormatter()],
              keyboard: TextInputType.number,
            )
          : _buildTextField(
              key: const ValueKey('user'),
              controller: _usuarioController,
              label: 'Usuário',
              hint: 'IDENTIFICAÇÃO',
              icon: Icons.alternate_email_rounded,
              fontSize: fontSize,
              cs: cs,
              formatters: [UpperCaseTextFormatter()],
            ),
    );
  }

  Widget _buildTextField({
    Key? key,
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required double fontSize,
    required ColorScheme cs,
    bool isObscure = false,
    Widget? suffix,
    List<TextInputFormatter>? formatters,
    TextInputType? keyboard,
  }) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(label, style: GoogleFonts.inter(fontSize: 13 * fontSize, fontWeight: FontWeight.w600, color: cs.primary)),
        ),
        TextField(
          controller: controller,
          obscureText: isObscure,
          inputFormatters: formatters,
          keyboardType: keyboard,
          style: GoogleFonts.inter(fontSize: 16 * fontSize, fontWeight: FontWeight.w500),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, size: 20, color: cs.primary.withOpacity(0.6)),
            suffixIcon: suffix,
            filled: true,
            fillColor: cs.surface,
            contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: cs.outlineVariant.withOpacity(0.5))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: cs.primary, width: 1.5)),
          ),
        ),
      ],
    );
  }

  Widget _buildModernToggle(String label, bool active, ColorScheme cs) {
    return GestureDetector(
      onTap: active ? null : _toggleMode,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
        decoration: BoxDecoration(
          color: active ? cs.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(25),
          boxShadow: active ? [BoxShadow(color: cs.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))] : [],
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            color: active ? cs.onPrimary : cs.onSurface.withOpacity(0.5),
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildSubmitButton(double fontSize, ColorScheme cs) {
    return Container(
      height: 60,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(colors: [cs.primary, cs.primary.withBlue(200)]),
        boxShadow: [BoxShadow(color: cs.primary.withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 8))],
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _login,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
        child: Text(
          'ENTRAR',
          style: GoogleFonts.plusJakartaSans(fontSize: 16 * fontSize, fontWeight: FontWeight.w800, color: cs.onPrimary, letterSpacing: 1.2),
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay(double fontSize, ColorScheme cs) {
    return BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
      child: Container(
        color: Colors.black.withOpacity(0.2),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(strokeWidth: 5),
              const SizedBox(height: 24),
              Text(
                'Validando acesso...',
                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18 * fontSize),
              ),
            ],
          ),
        ),
      ),
    );
  }
}