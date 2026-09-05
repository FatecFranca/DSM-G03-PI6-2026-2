import 'dart:convert';
import 'package:CDCP/config.dart';
import 'package:CDCP/screens/shared/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';
import '../../models/theme_model.dart';
import '../../models/user_model.dart';

class ProfileSettingsScreen extends StatefulWidget {
  final UserProfile user;

  const ProfileSettingsScreen({super.key, required this.user});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  // Máscara para (99) 99999-9999
  final maskFormatter = MaskTextInputFormatter(
    mask: '(##) #####-####',
    filter: {"#": RegExp(r'[0-9]')},
    type: MaskAutoCompletionType.lazy,
  );

  String _getRoleLabel() {
    final role = widget.user.role.toUpperCase();
    if (role == 'PESSOA' || role == 'CIDADAO') return 'Cidadão';
    if (role == 'TECNICO' || role == 'TECHNICIAN') return 'Técnico';
    return 'Usuário';
  }

  String _getEndpoint() {
    final role = widget.user.role.toUpperCase();
    if (role == 'PESSOA' || role == 'CIDADAO') {
      return 'pessoa';
    }
    if (role == 'TECNICO' || role == 'TECHNICIAN') {
      return 'tecnico';
    }
    return '';
  }

  Future<void> _editInfo(String label, String currentValue, String fieldName) async {
    final TextEditingController controller = TextEditingController(text: currentValue);
    final themeModel = Provider.of<ThemeModel>(context, listen: false);
    final token = themeModel.currentUser?.token;
    final bool isTelefone = fieldName == 'PessoaTelefone' || fieldName == 'TecnicoTelefone';
    final bool isEmail = fieldName == 'PessoaEmail' || fieldName == 'TecnicoEmail';
    
    // Determinar qual campo enviar baseado no tipo de usuário
    final String role = widget.user.role.toUpperCase();
    final String campoEnvio = (role == 'PESSOA' || role == 'CIDADAO') 
        ? (isEmail ? 'PessoaEmail' : 'PessoaTelefone')
        : (isEmail ? 'TecnicoEmail' : 'TecnicoTelefone');

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Editar $label', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: TextField(
          controller: controller,
          keyboardType: isTelefone ? TextInputType.phone : TextInputType.emailAddress,
          inputFormatters: [
            if (isTelefone) FilteringTextInputFormatter.digitsOnly,
            if (isTelefone) maskFormatter,
          ],
          decoration: InputDecoration(
            labelText: 'Novo $label',
            hintText: isTelefone ? '(00) 00000-0000' : 'email@exemplo.com',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
            ),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );

    if (confirmed == true && controller.text.trim().isNotEmpty) {
      try {
        final String newValue = controller.text.trim();
        final String endpoint = _getEndpoint();

        if (endpoint.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tipo de usuário inválido'),
              backgroundColor: Colors.red,
            ),
          );
          return;
        }

        // ✅ Montar o body com o campo correto baseado no tipo de usuário
        final Map<String, dynamic> requestBody = { campoEnvio: newValue };

        final url = Uri.parse('${AppConfig.baseUrl}/api/$endpoint/${widget.user.id}');

        debugPrint('📝 Editando $label');
        debugPrint('📦 Endpoint: $endpoint');
        debugPrint('📦 Campo: $campoEnvio');
        debugPrint('📦 Valor: $newValue');
        debugPrint('📦 URL: $url');

        final response = await http.put(
          url,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode(requestBody),
        );

        if (response.statusCode == 200 || response.statusCode == 204) {
          setState(() {
            if (isEmail) {
              widget.user.email = newValue;
            }
            if (isTelefone) {
              widget.user.phone = newValue;
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Atualizado com sucesso!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          // ✅ Extrair mensagem de erro da API
          String errorMessage = 'Erro ao atualizar';
          try {
            final errorData = jsonDecode(response.body);
            errorMessage = errorData['error'] ?? 
                          errorData['message'] ?? 
                          'Erro ${response.statusCode}';
          } catch (e) {
            errorMessage = 'Erro ${response.statusCode}';
          }
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: Colors.orange,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        debugPrint('Erro técnico: $e');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao conectar ao servidor: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeModel = Provider.of<ThemeModel>(context);
    final cs = Theme.of(context).colorScheme;
    final fontSize = themeModel.fontSizeScale;

    return Scaffold(
      backgroundColor: cs.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [cs.primary, cs.primaryContainer],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    CircleAvatar(
                      radius: 45,
                      backgroundColor: cs.onPrimary.withOpacity(0.2),
                      child: Text(
                        widget.user.name.isNotEmpty ? widget.user.name[0].toUpperCase() : '?',
                        style: GoogleFonts.inter(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: cs.onPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.user.name,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: cs.onPrimary,
                      ),
                    ),
                    Text(
                      _getRoleLabel(),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: cs.onPrimary.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout_rounded),
                color: cs.onPrimary,
                onPressed: () => Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                ),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle('Informações Pessoais', cs),
                  const SizedBox(height: 12),
                  _buildProfileCard(cs, fontSize),
                  const SizedBox(height: 28),
                  _buildSectionTitle('Preferências do App', cs),
                  const SizedBox(height: 12),
                  _buildSettingsCard(themeModel, cs, fontSize),
                  const SizedBox(height: 32),
                  Center(
                    child: Text(
                      'Versão 1.0.4 • Cláudio e CIA',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: cs.onSurface.withOpacity(0.4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, ColorScheme cs) {
    return Text(
      title.toUpperCase(),
      style: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        color: cs.primary,
        letterSpacing: 1.1,
      ),
    );
  }

  Widget _buildProfileCard(ColorScheme cs, double fontSize) {
    final bool isPessoa = widget.user.role.toUpperCase() == 'PESSOA' || 
                          widget.user.role.toUpperCase() == 'CIDADAO';

    return Container(
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          _buildDetailRow(
            Icons.email_outlined,
            'Email',
            widget.user.email,
            cs,
            fontSize,
            onTap: () => _editInfo('Email', widget.user.email, isPessoa ? 'PessoaEmail' : 'TecnicoEmail'),
          ),
          _buildDivider(cs),
          _buildDetailRow(
            Icons.phone_iphone_rounded,
            'Telefone',
            widget.user.phone,
            cs,
            fontSize,
            onTap: () => _editInfo('Telefone', widget.user.phone, isPessoa ? 'PessoaTelefone' : 'TecnicoTelefone'),
          ),
          _buildDivider(cs),
          _buildDetailRow(
            Icons.badge_outlined,
            isPessoa ? 'CPF' : 'CPF',
            widget.user.cpfOrId,
            cs,
            fontSize,
          ),
          _buildDivider(cs),
          _buildDetailRow(
            Icons.account_balance_rounded,
            'Unidade',
            widget.user.unitName,
            cs,
            fontSize,
          ),
          // ✅ Mostrar usuário (apenas para técnicos)
          if (!isPessoa) ...[
            _buildDivider(cs),
            _buildDetailRow(
              Icons.person_outline,
              'Usuário',
              widget.user.usuario.toString(), // Para técnico, cpfOrId contém o usuário
              cs,
              fontSize,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSettingsCard(ThemeModel themeModel, ColorScheme cs, double fontSize) {
    return Container(
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            leading: CircleAvatar(
              backgroundColor: cs.primary.withOpacity(0.1),
              child: Icon(
                themeModel.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                color: cs.primary,
                size: 20,
              ),
            ),
            title: Text('Modo Escuro', style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
            trailing: Switch.adaptive(
              value: themeModel.isDark,
              onChanged: (val) => themeModel.setThemeMode(
                val ? ThemeModeOption.dark : ThemeModeOption.light,
              ),
            ),
          ),
          _buildDivider(cs),
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            leading: CircleAvatar(
              backgroundColor: cs.secondary.withOpacity(0.1),
              child: Icon(Icons.format_size_rounded, color: cs.secondary, size: 20),
            ),
            title: Text('Tamanho do Texto', style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
            subtitle: Text(
              '${(themeModel.fontSizeScale * 100).toInt()}%',
              style: TextStyle(color: cs.primary),
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildRoundBtn(Icons.remove, () => themeModel.setFontSize(themeModel.fontSizeScale - 0.2), cs),
                const SizedBox(width: 12),
                _buildRoundBtn(Icons.add, () => themeModel.setFontSize(themeModel.fontSizeScale + 0.2), cs),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(
    IconData icon,
    String label,
    String value,
    ColorScheme cs,
    double fontSize, {
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Icon(icon, size: 22, color: cs.onSurfaceVariant),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 12 * fontSize,
                      color: cs.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    value.isNotEmpty ? value : 'Não informado',
                    style: GoogleFonts.inter(
                      fontSize: 15 * fontSize,
                      fontWeight: FontWeight.w600,
                      color: cs.onSurface,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              Icon(
                Icons.edit_outlined,
                size: 16,
                color: cs.primary.withOpacity(0.5),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoundBtn(IconData icon, VoidCallback? onTap, ColorScheme cs) {
    return Material(
      color: cs.surfaceContainerHighest,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Icon(icon, size: 18, color: cs.onSurface),
        ),
      ),
    );
  }

  Widget _buildDivider(ColorScheme cs) => Divider(
        height: 1,
        indent: 60,
        endIndent: 20,
        color: cs.outlineVariant.withOpacity(0.3),
      );
}